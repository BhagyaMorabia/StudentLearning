"""
NeuralJEE Mastery Algorithm Evaluation Harness (V5.1)

Runs a synthetic student cohort (7 cognitive profiles × N questions) against
the Postgres question bank, simulates telemetry via gemini-3.5-flash-lite acting
as a BLINDED student (no answers / misconceptionType leakage), and then runs
the EXACT V3 Bayesian score-accumulation version of classifyFailureMode that
ships in the prod TS code.

Three SEPARATE metrics are reported:

  (A) PROFILE_DIAGNOSTIC_ACCURACY (blended)
      = P(predicted_mode matches ground truth) — includes correct-answer NONE
        matches (trivial). Use this for end-to-end sanity only.

  (A*) WRONG-ANSWER DIAGNOSTIC RECALL (headline metric)
      = P(predicted_mode == GT_mode | is_correct == False).
        This is the REAL metric: when a student gets an answer wrong, do we
        correctly identify WHY? This drives pedagogy decisions in production.

  (B) OPTION_TAG_MATCH_RATE
      = P(predicted_mode == the DATABASE misconceptionType tag OF THE EXACT
        OPTION the student clicked)
      This is a DATA-QUALITY metric: did our option-tagging + classifier agree
      on the proximal cause of THIS specific distractor?

V5.1 changes over V5:
  - P/R/F1 FP bug fixed (no longer double-counts GT==m rows in FP sum).
  - Wrong-answer-only P/R/F1 as the headline per-mode metric (population-match:
    TP from wrong_ans subset, FP excludes correct-answer rows so precision
    measures diagnostic quality only on attempted misclassifications).
  - LLM-failure circuit breaker distinguishes genuine pipeline failures from
    blindness-violation safe fallbacks (no double-counting).
  - Micro-averaged wrong-answer diagnostic recall reported as headline (A*).
"""

import os
import io
import sys
import json
import shutil
import asyncio
import random
import time
import psycopg2
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple, Optional

from student_agent import generate_student_actions_batch, assert_blindness_contract
from dotenv import load_dotenv

load_dotenv('../../.env.local')
DB_URL = os.getenv('DATABASE_URL')

MODE_ORDER = [
    'MODE_1_PREREQUISITE',
    'MODE_2_CONCEPTUAL',
    'MODE_3_PROCEDURAL',
    'MODE_4_FORMULA',
    'MODE_5_CARELESS',
    'MODE_6_GUESSING',
    'MODE_7_FORGETTING',
    'NONE',
]

ERROR_MODES = [
    'MODE_1_PREREQUISITE',
    'MODE_2_CONCEPTUAL',
    'MODE_3_PROCEDURAL',
    'MODE_4_FORMULA',
    'MODE_5_CARELESS',
    'MODE_6_GUESSING',
    'MODE_7_FORGETTING',
]

TIEBREAK_ORDER = [
    'MODE_2_CONCEPTUAL',
    'MODE_5_CARELESS',
    'MODE_4_FORMULA',
    'MODE_3_PROCEDURAL',
    'MODE_1_PREREQUISITE',
    'MODE_7_FORGETTING',
    'MODE_6_GUESSING',
    'NONE',
]


_CHECKPOINT_FILE = "eval_checkpoint_V5.1.json"
_CHECKPOINT_STATE_VERSION = 1


def _zero_scores():
    return {m: 0.0 for m in MODE_ORDER}


# ═══════════════════════════════════════════════════════════════════════════
# Crash-safety: atomic writes + per-profile checkpoint resume
# ═══════════════════════════════════════════════════════════════════════════

def _atomic_json_write(
    final_path: str,
    payload: Any,
    *,
    keep_bak: bool = True,
) -> None:
    """Write JSON atomically: write → tmp → fsync → rename → bak.

    Guarantees:
      - `final_path` is NEVER a half-written file (it either contains the
        previous good payload or the new complete one).
      - `final_path + ".bak"` contains the previous-good payload (unless
        `keep_bak=False`). Useful for manual rollback if a new checkpoint
        is somehow corrupted.
    """
    tmp_path = final_path + ".tmp"
    # 1. Serialize in memory first — if this raises, nothing on disk changes.
    buf = json.dumps(payload, indent=2, default=str, ensure_ascii=False)
    # 2. Write .tmp, fsync it.
    with open(tmp_path, 'w', encoding='utf-8') as f:
        f.write(buf)
        f.flush()
        try:
            os.fsync(f.fileno())
        except OSError:
            pass
    # 3. Move aside current good → .bak
    if keep_bak and os.path.exists(final_path):
        bak_path = final_path + ".bak"
        if os.path.exists(bak_path):
            os.remove(bak_path)
        shutil.copy2(final_path, bak_path)
    # 4. atomically replace final_path
    if sys.platform.startswith('win'):
        # On Windows, os.replace fails if target exists in certain edge cases;
        # use explicit remove-then-rename as fallback.
        try:
            os.replace(tmp_path, final_path)
        except FileExistsError:
            os.remove(final_path)
            os.rename(tmp_path, final_path)
    else:
        os.replace(tmp_path, final_path)
    # 5. fsync directory so the rename persists on power loss.
    try:
        dirname = os.path.dirname(os.path.abspath(final_path)) or '.'
        fd = os.open(dirname, os.O_RDONLY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
    except OSError:
        pass


def _dumpable_defaultdict_dd_int(dd: Any) -> Dict[str, Dict[str, int]]:
    """Convert a 2-level defaultdict(int) → plain 2-level dict for JSON."""
    out: Dict[str, Dict[str, int]] = {}
    for k, inner in dd.items():
        out[str(k)] = {str(kk): int(vv) for kk, vv in inner.items()}
    return out


def _restore_defaultdict_dd_int(
    obj: Optional[Dict[str, Dict[str, int]]],
) -> Any:
    """Restore a 2-level defaultdict(int) from JSON shape."""
    dd = defaultdict(lambda: defaultdict(int))
    if not obj:
        return dd
    for k, inner in obj.items():
        for kk, vv in inner.items():
            dd[k][kk] = int(vv)
    return dd


def _save_checkpoint(
    *,
    run_config: Dict[str, Any],
    processed_profile_ids: List[str],
    state: Dict[str, Any],
) -> None:
    """Crash-safe mid-run checkpoint written AFTER each fully-processed profile.

    Also contains the FULL list of question IDs and profile IDs in order so
    resuming is strictly deterministic: the run cannot silently switch to a
    different 100-question set when Postgres setseed state is not reproducible
    on a fresh connection (the checkpoint holds the actual qids that were
    sampled, so the resume path re-fetches those exact qids and runs them
    in the exact same order).
    """
    payload = {
        '_version': _CHECKPOINT_STATE_VERSION,
        'saved_at_utc': datetime.now(timezone.utc).isoformat(),
        'run_config': run_config,
        'processed_profile_ids': list(processed_profile_ids),
        'state': state,
    }
    _atomic_json_write(_CHECKPOINT_FILE, payload, keep_bak=True)


def _try_load_checkpoint(
    run_config: Dict[str, Any],
) -> Optional[Tuple[List[str], Dict[str, Any]]]:
    """Load a prior-run checkpoint if and only if it exactly matches `run_config`.

    A checkpoint is ONLY reused when all of these match the new run:
      - num_questions_per_profile
      - global random seed
      - profile_ids (order matters — profiles.json must not have changed)
      - question_ids (order matters — the exact same 100 MCQ questions in the
        same sort order)

    If ANY of these differ, the checkpoint is considered a different experiment
    and is IGNORED (a fresh run happens, starting from profile index 0, and
    the new run overwrites the old checkpoint on its first profile-complete).

    Returns (processed_profile_ids, state_dict) on match, else None.
    """
    if not os.path.exists(_CHECKPOINT_FILE):
        return None
    try:
        with open(_CHECKPOINT_FILE, 'r', encoding='utf-8') as f:
            cp = json.load(f)
    except Exception as e:
        print(f"[WARN] Found {_CHECKPOINT_FILE} but could not read it ({e}); "
              f"starting fresh. If this persists, delete it manually.")
        return None
    if cp.get('_version') != _CHECKPOINT_STATE_VERSION:
        print(f"[INFO] Checkpoint version {cp.get('_version')} vs current "
              f"{_CHECKPOINT_STATE_VERSION}; starting fresh.")
        return None
    cfg_cp = cp.get('run_config') or {}
    # Strict match on the four fields above.
    required_cfg_keys = [
        'num_questions', 'seed',
        'profile_ids_in_order', 'question_ids_in_order',
    ]
    for k in required_cfg_keys:
        if cfg_cp.get(k) != run_config.get(k):
            print(f"[INFO] Checkpoint run_config.{k} != current run "
                  f"(config change); discarding checkpoint and starting fresh.")
            return None
    processed = list(cp.get('processed_profile_ids') or [])
    state = dict(cp.get('state') or {})
    print(f"[RESUME] Checkpoint matches current run — {len(processed)} of "
          f"{len(run_config['profile_ids_in_order'])} profiles already done "
          f"and will be SKIPPED (their LLM sims are in raw_sim_cache.jsonl, "
          f"and per-profile aggregates are restored).")
    return processed, state


def _argmax_with_tiebreak(scores):
    best = 'MODE_2_CONCEPTUAL'
    best_score = -float('inf')
    for m in TIEBREAK_ORDER:
        if scores[m] > best_score:
            best_score = scores[m]
            best = m
    return best


# ═══════════════════════════════════════════════════════════════════════════
# Helper sub-functions (legacy V2 preserved for misc tag + semantic resolution)
# ═══════════════════════════════════════════════════════════════════════════

def _classify_from_misconception_tag(misc_type):
    if not misc_type:
        return None
    raw = str(misc_type).strip()
    if not raw:
        return None
    clean = raw.upper()
    if clean in MODE_ORDER and clean != 'NONE':
        return clean
    stripped = clean.replace(' ', '_').replace('-', '_')
    suffix_map = {
        'PREREQUISITE': 'MODE_1_PREREQUISITE',
        'CONCEPTUAL':   'MODE_2_CONCEPTUAL',
        'PROCEDURAL':   'MODE_3_PROCEDURAL',
        'FORMULA':      'MODE_4_FORMULA',
        'CARELESS':     'MODE_5_CARELESS',
        'GUESSING':     'MODE_6_GUESSING',
        'FORGETTING':   'MODE_7_FORGETTING',
    }
    for suffix, mode in suffix_map.items():
        if (stripped.endswith(suffix)
                or stripped.startswith(suffix)
                or f'_{suffix}_' in stripped
                or stripped == suffix):
            return mode
    return None


def _classify_from_semantic_keywords(misc_type):
    if not misc_type:
        return None
    lower = str(misc_type).lower().strip()
    if not lower:
        return None

    careless = [
        'sign convention', 'sign error', 'wrong sign', 'dropped negative',
        'sign mistake', 'arithmetic', 'calculation', 'computation error',
        'silly mistake', 'careless', 'addition error', 'subtraction error',
        'multiplication error', 'division error', 'squared instead of cube',
        'cube instead of squared', 'decimal', 'order of operations', 'bodmas',
        'pemdas', 'unit conversion', 'unit mismatch', 'dimensional analysis',
        'reading error', 'misread', 'copied wrong', 'transcription',
    ]
    if any(k in lower for k in careless): return 'MODE_5_CARELESS'

    formula = [
        'formula', 'equation', 'identity', 'theorem', 'derivative formula',
        'integration formula', 'trigonometric identity', 'wrong formula',
        'reciprocal of formula', 'inverted formula', 'misremembered formula',
        'kinematic equation', 'snell law', 'ohm law', 'coulomb law',
        'gauss law', 'newton law', 'euler formula', 'quadratic formula',
        'binomial expansion', 'determinant formula', 'matrix formula',
    ]
    if any(k in lower for k in formula): return 'MODE_4_FORMULA'

    procedural = [
        'procedure', 'step', 'algorithm', 'workflow', 'setup', 'method',
        'approach', 'did not draw fbd', 'free body diagram missing',
        'forgot to consider', 'failed to account', 'missing step',
        'substitution step', 'elimination method', 'substitution method',
        'set up incorrectly', 'boundary condition', 'initial condition',
        'limit condition', 'sign in substitution', 'limits of integration',
        'integration by parts order', 'chain rule missed', 'product rule',
        'coordinate system', 'reference frame',
    ]
    if any(k in lower for k in procedural): return 'MODE_3_PROCEDURAL'

    prereq = [
        'prerequisite', 'foundation', 'prior knowledge', 'earlier chapter',
        'previous class', 'class 11 concept', 'class 9', 'class 10',
        'basic algebra', 'basic trigonometry', 'basic arithmetic',
        'elementary', 'fundamental theorem', 'axiom', 'postulate',
        'linkage', 'pre-requisite', 'prereq',
    ]
    if any(k in lower for k in prereq): return 'MODE_1_PREREQUISITE'

    forgetting = [
        'forgot', 'forgotten', 'recall', 'memory', 'could not remember',
        'did not remember', 'blanked', 'factual error', 'forgot the rule',
        'forgot the formula',
    ]
    if any(k in lower for k in forgetting): return 'MODE_7_FORGETTING'

    conceptual = [
        'conceptual', 'concept', 'rule violation', 'misconception',
        'mental model', 'wrong intuition', 'fundamental misunderstanding',
        'confused direction', 'confused sign', 'theory', 'principle',
        'law', 'reasoning error', 'logic error', 'assumption',
    ]
    if any(k in lower for k in conceptual): return 'MODE_2_CONCEPTUAL'

    return None


# ═══════════════════════════════════════════════════════════════════════════
# classifyFailureModeV3 — BAYESIAN SCORE ACCUMULATION (Python port)
# Mirrors src/lib/mastery/algorithm.ts classifyFailureModeV3() exactly.
# ═══════════════════════════════════════════════════════════════════════════

def classify_failure_mode_v3_py(
    is_correct: bool,
    time_spent_seconds: float,
    expected_time_seconds: float,
    option_switch_count: int,
    misconception_type,
    prerequisite_trap_id,
    is_retrievability_low: bool = False,
    historical_fast_correct_rate: float | None = None,
):
    """Exact Python port of algorithm.ts classifyFailureModeV3().

    Returns dict with:
      mode, scores (full 8-mode dict), engagement (float 0-1),
      dominant_signal (string), signal_contributions (dict)
    """
    scores = _zero_scores()
    signal_contributions = {}
    dominant_signal = 'tiebreak_default'

    expected_floor = max(float(expected_time_seconds or 0), 15.0)
    time_ratio = max(0.0, float(time_spent_seconds or 0) / expected_floor)
    engagement = min(1.0, time_ratio / 0.5)

    # PRIORITY 0 — Correct path
    if is_correct:
        fast_abs = time_spent_seconds < 15
        fast_ratio = time_ratio < 0.2
        known_fast = (historical_fast_correct_rate or 0) > 0.6
        if fast_abs and fast_ratio and not known_fast:
            scores['MODE_6_GUESSING'] = 10.0
            signal_contributions['correct_fast_guessing'] = 10.0
            dominant_signal = 'correct_fast_guessing'
        else:
            scores['NONE'] = 10.0
            signal_contributions['correct_normal'] = 10.0
            dominant_signal = 'correct_normal'
        return {
            'mode': _argmax_with_tiebreak(scores),
            'scores': scores,
            'engagement': engagement,
            'dominant_signal': dominant_signal,
            'signal_contributions': signal_contributions,
        }

    # From here: is_correct == False

    # SIGNAL 1 — Extreme guessing (didn't even read it)
    if time_spent_seconds < 15 and time_ratio < 0.2:
        scores['MODE_6_GUESSING'] += 2.5
        signal_contributions['telemetry_extreme_guessing'] = 2.5
        dominant_signal = 'telemetry_extreme_guessing'

    # SIGNAL 2 — Option misconceptionType tag, ENGAGEMENT-GATED
    # Skip if engagement < 0.2 (they didn't read it)
    if engagement >= 0.2:
        from_tag = _classify_from_misconception_tag(misconception_type)
        if from_tag is not None:
            weight = 1.5 * engagement
            scores[from_tag] += weight
            signal_contributions[f'option_tag_{from_tag}'] = weight
            if weight > signal_contributions.get(dominant_signal, 0):
                dominant_signal = f'option_tag_{from_tag}'

    # SIGNAL 3 — prerequisiteTrapId elevation (RC3 fix)
    # V4.2 calibrated: +3.2 — exceeds option tag 1.5 + semantic 0.7 +
    # 1-switch-lean 0.15 = 2.35 typical M2 pile-on.  Designer annotation
    # is the most precise signal we have.
    if prerequisite_trap_id and str(prerequisite_trap_id).strip():
        scores['MODE_1_PREREQUISITE'] += 3.2
        signal_contributions['prerequisite_trap_id_hit'] = 3.2
        if 3.2 > signal_contributions.get(dominant_signal, 0):
            dominant_signal = 'prerequisite_trap_id_hit'

    # SIGNAL 4 — Semantic keywords, engagement-gated
    # V4.2 reduced: 0.7 × engagement.  Prevents stacking on top of option
    # tag to create runaway M2 basin.
    if engagement >= 0.2:
        from_sem = _classify_from_semantic_keywords(misconception_type)
        if from_sem is not None:
            weight = 0.7 * engagement
            scores[from_sem] += weight
            signal_contributions[f'semantic_{from_sem}'] = weight
            if weight > signal_contributions.get(dominant_signal, 0):
                dominant_signal = f'semantic_{from_sem}'

    # SIGNAL 5 — MODE_7 Forgetting wrong-answer boost (RC4 fix)
    # V4.3 calibrated: +2.5.  Beats option_tag + semantic (2.2).  Ties
    # extreme pile-on (2.55) — re-teaching wins ties via M2 tiebreak order
    # (slow+wrong-model students get concept review, not just scheduling).
    if is_retrievability_low and time_ratio >= 0.2:
        scores['MODE_7_FORGETTING'] += 2.5
        signal_contributions['fsrs_retrievability_low'] = 2.5
        if 2.5 > signal_contributions.get(dominant_signal, 0):
            dominant_signal = 'fsrs_retrievability_low'

    # SIGNAL 6 — Telemetry triangulation (V4.3 tiered weights)
    # Reference at engagement=1:
    #   option_tag alone             = 1.5
    #   option_tag + semantic (M2)   = 2.2
    #   option_tag + semantic + 1-sw = 2.25
    #   option_tag + semantic + 1-sw + slow = 2.55
    # Tier 1 (>2.2) : metric A wins over option+semantic
    # Tier 2 (~2.05): wins option alone, loses option+semantic (preserves B)
    # Tier 3 (~1.85): context-dependent — wins at low careless engagement,
    #                 loses in gray zone to M2 tiebreak (preserves B)

    # 6a. Tier 1 — PROCEDURAL extreme (>2x time, >=3 switches)
    if time_ratio > 2.0 and option_switch_count >= 3:
        scores['MODE_3_PROCEDURAL'] += 2.8
        signal_contributions['telemetry_procedural_extreme'] = 2.8
    # 6b. Tier 1 — PROCEDURAL medium
    elif time_ratio > 1.5 and option_switch_count >= 2:
        scores['MODE_3_PROCEDURAL'] += 2.15
        signal_contributions['telemetry_procedural_medium'] = 2.15
    # 6c. Tier 2 — FORMULA 2+ switches (loses to option+semantic = saves B)
    if option_switch_count >= 2 and 0.5 <= time_ratio <= 2.0:
        scores['MODE_4_FORMULA'] += 2.0
        signal_contributions['telemetry_formula_2switch'] = 2.0
    # 6c-2. Tier 3 — FORMULA 1 switch
    if option_switch_count == 1 and 0.5 <= time_ratio <= 2.0:
        scores['MODE_4_FORMULA'] += 1.7
        signal_contributions['telemetry_formula_1switch'] = 1.7
    # 6d. Ultra-light — CONCEPTUAL very slow (minimizes pile-on)
    if time_ratio > 2.5:
        scores['MODE_2_CONCEPTUAL'] += 0.3
        signal_contributions['telemetry_conceptual_slow'] = 0.3
    # 6e. Ultra-light — 1-switch lean conceptual (minimizes pile-on)
    if option_switch_count == 1:
        scores['MODE_2_CONCEPTUAL'] += 0.05
        signal_contributions['telemetry_1switch_lean_conceptual'] = 0.05
    # 6f. Tier 3 — CARELESS rushed.  At ratio=0.40, M2 baseline=1.81, so
    #     careless=1.85 wins at ratio<=0.40; M2 tiebreak wins gray zone.
    if 0.2 <= time_ratio < 0.5 and option_switch_count <= 1:
        scores['MODE_5_CARELESS'] += 1.85
        signal_contributions['telemetry_rushed_careless'] = 1.85

    final_mode = _argmax_with_tiebreak(scores)
    return {
        'mode': final_mode,
        'scores': scores,
        'engagement': engagement,
        'dominant_signal': dominant_signal,
        'signal_contributions': signal_contributions,
    }


# Backward-compat alias — V2 calls V3 internally (TS does the same)
def classify_failure_mode_v2(
    is_correct: bool,
    time_spent_seconds: float,
    expected_time_seconds: float,
    option_switch_count: int,
    misconception_type,
    prerequisite_trap_id,
    is_retrievability_low: bool = False,
    historical_fast_correct_rate: float | None = None,
):
    return classify_failure_mode_v3_py(
        is_correct, time_spent_seconds, expected_time_seconds,
        option_switch_count, misconception_type, prerequisite_trap_id,
        is_retrievability_low, historical_fast_correct_rate,
    )['mode']


# ═══════════════════════════════════════════════════════════════════════════
# MODE_7 simulation: synthetic FSRS-state generator
# ═══════════════════════════════════════════════════════════════════════════

def simulate_fsrs_state(profile_mode: str):
    now = datetime.now(timezone.utc)
    if profile_mode == 'MODE_7_FORGETTING':
        last_review = now - timedelta(days=90)
        scheduled_interval_days = 7
        due = last_review + timedelta(days=scheduled_interval_days)
        return {
            'due': due,
            'last_review': last_review,
            'lapses': 2,
            'retrievability': 0.25,
        }
    return {
        'due': None,
        'last_review': None,
        'lapses': 0,
        'retrievability': None,
    }


def is_retrievability_low_py(fsrs_state, now=None):
    if not fsrs_state or not isinstance(fsrs_state, dict):
        return False
    R = fsrs_state.get('retrievability')
    if isinstance(R, (int, float)):
        return R < 0.6
    due = fsrs_state.get('due')
    last_review = fsrs_state.get('last_review')
    lapses_raw = fsrs_state.get('lapses') or 0
    try:
        lapses = max(0, int(lapses_raw))
    except (TypeError, ValueError):
        lapses = 0
    if last_review is None:
        return False
    if now is None:
        now = datetime.now(timezone.utc)
    now_ms = now.timestamp() * 1000
    def ts(v):
        if v is None: return None
        if isinstance(v, datetime):
            return v.timestamp() * 1000
        if isinstance(v, (int, float)):
            return float(v)
        return None
    due_ms = ts(due)
    last_ms = ts(last_review)
    scheduled = max(0.0, (due_ms - last_ms)) if (due_ms and last_ms) else 0.0
    overdue_ms = max(0.0, now_ms - due_ms) if due_ms else 0.0
    severe = (overdue_ms > 2 * scheduled) if scheduled > 0 else (
        overdue_ms > 3 * 24 * 3600 * 1000
    )
    if severe:
        return True
    if overdue_ms > 0 and lapses >= 1:
        return True
    return False


# ═══════════════════════════════════════════════════════════════════════════
# DB I/O
# ═══════════════════════════════════════════════════════════════════════════

_QUESTIONS_SELECT_SQL = """
    SELECT
        id,
        question_text,
        options,
        expected_time_seconds,
        question_type,
        concepts_tested,
        subtopic_id
    FROM questions
    WHERE status = 'VERIFIED'
      AND question_type = 'MCQ'
      AND expected_time_seconds IS NOT NULL
      AND options IS NOT NULL
      AND jsonb_array_length(options) >= 3
      AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(options) AS opt
          WHERE (opt->>'isCorrect')::boolean = TRUE
      )
"""


def _row_to_question(r) -> Dict[str, Any]:
    q_id, q_text, opts_json, exp, qtype, concepts, stid = r
    opts = opts_json if isinstance(opts_json, list) else json.loads(opts_json)
    return {
        'id': q_id,
        'question_text': q_text,
        'options': opts,
        'expected_time_seconds': exp or 120,
        'question_type': qtype,
        'concepts_tested': concepts or [],
        'subtopic_id': stid,
    }


def get_questions_from_db(
    limit: int = 100,
    *,
    seed: Optional[int] = None,
    explicit_qids_in_order: Optional[List[Any]] = None,
):
    """Fetch question set, either deterministically-random (seeded) OR fixed.

    Two modes:
      A) `explicit_qids_in_order` is provided (resume path):
         fetch exactly those qids in exactly that order. If any qid is missing
         from the DB (should never happen on resume), raise RuntimeError so
         the operator notices rather than silently running on a different
         question set.
      B) `seed` is provided (fresh run):
         fetch `limit` MCQs, ORDER BY random() inside a transaction that does
         `SELECT setseed(seed_in_unit_interval)` first, which makes the random
         ordering reproducible across connections for the same seed.
    """
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()
    try:
        if explicit_qids_in_order:
            if not explicit_qids_in_order:
                return []
            # Build positional ORDER BY so we get rows in EXACT qid order,
            # regardless of Postgres' natural tuple order.
            placeholders = ','.join(['%s'] * len(explicit_qids_in_order))
            order_expr = 'ORDER BY CASE id '
            for i in range(len(explicit_qids_in_order)):
                order_expr += f' WHEN %s THEN {i}'
            order_expr += ' END'
            params: List[Any] = list(explicit_qids_in_order) + list(explicit_qids_in_order)
            cur.execute(
                _QUESTIONS_SELECT_SQL + f' AND id IN ({placeholders}) ' + order_expr,
                params,
            )
            rows = cur.fetchall()
            if len(rows) != len(explicit_qids_in_order):
                got_ids = {r[0] for r in rows}
                missing = [q for q in explicit_qids_in_order if q not in got_ids]
                raise RuntimeError(
                    f"Resume checkpoint demanded qids {len(explicit_qids_in_order)} "
                    f"but only {len(rows)} rows were returned. Missing: {missing[:6]}..."
                    if len(missing) > 6 else missing
                )
            return [_row_to_question(r) for r in rows]

        # Mode B: seeded random N questions.
        if seed is not None:
            # Postgres setseed() expects a float in [-1.0, 1.0].
            # Map int seed → stable float in that range.
            seed_f = ((seed % 2_000_000_001) / 2_000_000_001.0) * 2.0 - 1.0
            cur.execute("SELECT setseed(%s);", (seed_f,))
        cur.execute(_QUESTIONS_SELECT_SQL + " ORDER BY random() LIMIT %s;", (limit,))
        rows = cur.fetchall()
        conn.commit()
        return [_row_to_question(r) for r in rows]
    finally:
        try:
            cur.close()
        except Exception:
            pass
        try:
            conn.rollback()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


# ═══════════════════════════════════════════════════════════════════════════
# Main eval loop
# ═══════════════════════════════════════════════════════════════════════════

ENG_BINS: List[Tuple[str, Any]] = [
    ('<0.2 (guessing_zone)', lambda r: r < 0.2),
    ('0.2-0.5 (rushed)',     lambda r: 0.2 <= r < 0.5),
    ('0.5-1.0 (normal_lo)',  lambda r: 0.5 <= r < 1.0),
    ('1.0-2.0 (normal_hi)',  lambda r: 1.0 <= r < 2.0),
    ('>=2.0 (slow)',         lambda r: r >= 2.0),
]


def _fresh_eval_state() -> Dict[str, Any]:
    """All mutable counters/aggregates for a run. Checkpointed after every profile.

    Every 2-level aggregate is an actual defaultdict(lambda: defaultdict(int))
    so `_process_one_question` can do `dd[k1][k2] += 1` on never-before-seen
    (k1, k2) pairs without KeyError regardless of fresh-run vs checkpoint
    resume path.
    """
    per_hits: Any = defaultdict(lambda: {'correct': 0, 'total': 0})
    return {
        'total_evals': 0,
        'blindness_violation_count': 0,
        'llm_failure_count': 0,
        'blindness_call_count': 0,
        'profile_correct': 0,
        'option_tag_correct': 0,
        'option_tag_evaluations_count': 0,
        'mode7_wrong_total': 0,
        'mode7_wrong_correct': 0,
        'profile_cm': defaultdict(lambda: defaultdict(int)),
        'wrong_ans_profile_cm': defaultdict(lambda: defaultdict(int)),
        'option_cm': defaultdict(lambda: defaultdict(int)),
        'per_profile_hits': per_hits,
        'signal_contrib_hist': defaultdict(lambda: defaultdict(int)),
        'engagement_bins': defaultdict(lambda: defaultdict(int)),
        'test_cases_details': [],
    }


def _restore_state_from_checkpoint(state_in: Dict[str, Any]) -> Dict[str, Any]:
    """Recreate defaultdict structures from plain-dict checkpoint state."""
    st = _fresh_eval_state()
    for k in ('total_evals', 'blindness_violation_count', 'llm_failure_count',
              'blindness_call_count', 'profile_correct', 'option_tag_correct',
              'option_tag_evaluations_count',
              'mode7_wrong_total', 'mode7_wrong_correct'):
        st[k] = int(state_in.get(k) or 0)
    st['profile_cm'] = _restore_defaultdict_dd_int(state_in.get('profile_cm'))
    st['wrong_ans_profile_cm'] = _restore_defaultdict_dd_int(state_in.get('wrong_ans_profile_cm'))
    st['option_cm'] = _restore_defaultdict_dd_int(state_in.get('option_cm'))
    st['signal_contrib_hist'] = _restore_defaultdict_dd_int(state_in.get('signal_contrib_hist'))
    st['engagement_bins'] = _restore_defaultdict_dd_int(state_in.get('engagement_bins'))
    per_h = defaultdict(lambda: {'correct': 0, 'total': 0})
    for k, v in (state_in.get('per_profile_hits') or {}).items():
        per_h[k] = {'correct': int(v.get('correct') or 0), 'total': int(v.get('total') or 0)}
    st['per_profile_hits'] = per_h
    st['test_cases_details'] = list(state_in.get('test_cases_details') or [])
    return st


def _state_for_checkpoint(st: Dict[str, Any]) -> Dict[str, Any]:
    """Plain-dict snapshot of state, suitable for JSON write."""
    return {
        'total_evals': st['total_evals'],
        'blindness_violation_count': st['blindness_violation_count'],
        'llm_failure_count': st['llm_failure_count'],
        'blindness_call_count': st['blindness_call_count'],
        'profile_correct': st['profile_correct'],
        'option_tag_correct': st['option_tag_correct'],
        'option_tag_evaluations_count': st['option_tag_evaluations_count'],
        'mode7_wrong_total': st['mode7_wrong_total'],
        'mode7_wrong_correct': st['mode7_wrong_correct'],
        'profile_cm': _dumpable_defaultdict_dd_int(st['profile_cm']),
        'wrong_ans_profile_cm': _dumpable_defaultdict_dd_int(st['wrong_ans_profile_cm']),
        'option_cm': _dumpable_defaultdict_dd_int(st['option_cm']),
        'per_profile_hits': {str(k): {'correct': int(v['correct']), 'total': int(v['total'])}
                              for k, v in st['per_profile_hits'].items()},
        'signal_contrib_hist': _dumpable_defaultdict_dd_int(st['signal_contrib_hist']),
        'engagement_bins': _dumpable_defaultdict_dd_int(st['engagement_bins']),
        'test_cases_details': list(st['test_cases_details']),
    }


def _process_one_question(
    *,
    q: Dict[str, Any],
    sim: Dict[str, Any],
    profile: Dict[str, Any],
    st: Dict[str, Any],
    skip_console_emit: bool = False,
) -> None:
    """Core per-question processing. Updates all counters in `st` IN PLACE.

    When `skip_console_emit=True` (resume replay of already-processed rows)
    we only update the aggregate counters silently — no per-row prints.
    """
    gt_mode = profile['ground_truth_mode']
    profile_cm = st['profile_cm']
    wrong_ans_profile_cm = st['wrong_ans_profile_cm']
    option_cm = st['option_cm']
    per_profile_hits = st['per_profile_hits']
    signal_contrib_hist = st['signal_contrib_hist']
    engagement_bins = st['engagement_bins']

    sel_id = str(sim.get('selectedOption') or '').strip().lower()
    time_spent = float(sim.get('timeSpentSeconds') or 120.0)
    switches = int(sim.get('optionSwitchCount') or 0)
    reasoning = sim.get('reasoning', '') or ''
    ai_internal_errors = sim.get('_blindness_checks', {})

    selected_opt = None
    correct_opt = None
    st['blindness_call_count'] += 1
    blind_verified = ai_internal_errors.get('verified', False)
    llm_ok = ai_internal_errors.get('llm_call_succeeded', True)
    if not blind_verified:
        st['blindness_violation_count'] += 1
    if blind_verified and not llm_ok:
        st['llm_failure_count'] += 1

    violation_rate = st['blindness_violation_count'] / max(1, st['blindness_call_count'])
    if st['blindness_call_count'] >= 10 and violation_rate > 0.02:
        raise RuntimeError(
            f"ABORTING EVAL — blindness violation rate {violation_rate:.1%} "
            f"({st['blindness_violation_count']}/{st['blindness_call_count']}) exceeds 2% "
            f"threshold after profile '{profile['id']}'. This almost certainly "
            f"means every subsequent call is falling back to RANDOM, not real "
            f"LLM simulation. Fix the blindness check before re-running — do "
            f"not let this eval complete and produce a report."
        )

    llm_eligible_calls = max(1, st['blindness_call_count'] - st['blindness_violation_count'])
    fail_rate = st['llm_failure_count'] / llm_eligible_calls
    if st['blindness_call_count'] >= 100 and fail_rate > 0.03:
        raise RuntimeError(
            f"ABORTING EVAL — LLM failure rate {fail_rate:.1%} "
            f"({st['llm_failure_count']}/{llm_eligible_calls}) exceeds 3% "
            f"threshold after first profile complete. "
            f"Rate is computed on calls that PASSED blindness checks only "
            f"({llm_eligible_calls} eligible); blindness-safe fallbacks "
            f"({st['blindness_violation_count']}) are excluded. JSON parsing, "
            f"truncation, or rate-limit retries are failing completely."
        )

    for opt in q['options']:
        oid = str(opt.get('id', '')).strip().lower()
        if oid == sel_id:
            selected_opt = opt
        if opt.get('isCorrect') is True:
            correct_opt = opt

    if selected_opt is None:
        sel_text = (sim.get('selectedOptionText') or '').strip()
        if sel_text:
            for opt in q['options']:
                if (opt.get('text') or '').strip() == sel_text:
                    selected_opt = opt
                    break

    if selected_opt is None:
        st['test_cases_details'].append({
            'question_id': q['id'],
            'question_text': q['question_text'],
            'ground_truth_profile': gt_mode,
            'predicted_classification': 'LLM_HALLUCINATED_OPTION',
            'profile_match': False,
            'option_tag_match': False,
            'llm_reasoning': reasoning,
            'telemetry': {
                'timeSpentSeconds': time_spent,
                'optionSwitchCount': switches,
                'expectedTimeSeconds': q['expected_time_seconds'],
            },
            'correct_option': correct_opt,
            'selected_option': None,
            'is_correct': False,
            '_blindness_checks': ai_internal_errors,
        })
        return

    is_correct = bool(selected_opt.get('isCorrect', False))
    misc_type = selected_opt.get('misconceptionType')
    if misc_type in ('None', 'none', ''):
        misc_type = None
    prereq_id = selected_opt.get('prerequisiteTrapId')

    fsrs = simulate_fsrs_state(gt_mode)
    low_R = is_retrievability_low_py(fsrs)

    v3_result = classify_failure_mode_v3_py(
        is_correct=is_correct,
        time_spent_seconds=time_spent,
        expected_time_seconds=q['expected_time_seconds'],
        option_switch_count=switches,
        misconception_type=misc_type,
        prerequisite_trap_id=prereq_id,
        is_retrievability_low=low_R,
        historical_fast_correct_rate=None,
    )
    predicted_mode = v3_result['mode']
    dominant_signal = v3_result['dominant_signal']
    engagement = v3_result['engagement']
    time_ratio_val = time_spent / max(q['expected_time_seconds'], 15)

    if is_correct:
        profile_match = (predicted_mode == 'NONE')
    else:
        profile_match = (predicted_mode == gt_mode)

    option_tag_clean = None
    if not is_correct and misc_type:
        from_tag_or_sem = (
            _classify_from_misconception_tag(misc_type)
            or _classify_from_semantic_keywords(misc_type)
        )
        option_tag_clean = from_tag_or_sem
    if option_tag_clean is not None:
        option_tag_match = (predicted_mode == option_tag_clean)
        st['option_tag_evaluations_count'] += 1
    else:
        option_tag_match = None

    st['total_evals'] += 1
    if profile_match:
        st['profile_correct'] += 1
    if option_tag_match is True:
        st['option_tag_correct'] += 1
    profile_cm[gt_mode][predicted_mode] += 1
    if not is_correct:
        wrong_ans_profile_cm[gt_mode][predicted_mode] += 1
    if option_tag_clean is not None:
        option_cm[option_tag_clean][predicted_mode] += 1

    per_profile_hits[gt_mode]['total'] += 1
    if profile_match:
        per_profile_hits[gt_mode]['correct'] += 1

    if (gt_mode == 'MODE_7_FORGETTING' and not is_correct and low_R):
        st['mode7_wrong_total'] += 1
        if predicted_mode == 'MODE_7_FORGETTING':
            st['mode7_wrong_correct'] += 1

    signal_contrib_hist[dominant_signal][gt_mode] += 1
    for bin_label, bin_fn in ENG_BINS:
        if bin_fn(time_ratio_val):
            engagement_bins[gt_mode][bin_label] += 1
            break

    status_icon = '[OK]' if profile_match else '[NO]'
    if not skip_console_emit:
        if option_tag_match is None:
            ot_icon = '[??]'
        else:
            ot_icon = '[OK]' if option_tag_match else '[NO]'
        sig_short = dominant_signal[:28]
        print(
            f"  {status_icon} {str(q['id'])[:8]}  GT={gt_mode:<20s} Pred={predicted_mode:<20s} "
            f"isCor={str(is_correct):<5s} t={time_spent:6.1f}s sw={switches}  "
            f"[profile {status_icon}][option_tag {ot_icon}]  sig={sig_short}"
        )

    st['test_cases_details'].append({
        'question_id': q['id'],
        'question_text': q['question_text'],
        'ground_truth_profile': gt_mode,
        'predicted_classification': predicted_mode,
        'profile_match': profile_match,
        'option_tag_match': option_tag_match,
        'expected_option_tag': option_tag_clean,
        'llm_reasoning': reasoning,
        'telemetry': {
            'timeSpentSeconds': time_spent,
            'optionSwitchCount': switches,
            'expectedTimeSeconds': q['expected_time_seconds'],
            'timeRatio': round(time_ratio_val, 3),
            'engagement': round(engagement, 3),
        },
        'v3_diagnostic': {
            'dominantSignal': dominant_signal,
            'signalContributions': v3_result['signal_contributions'],
            'scores': v3_result['scores'],
        },
        'fsrs_simulation': {
            'gt_mode': gt_mode,
            'is_retrievability_low': low_R,
            'lapses': fsrs.get('lapses'),
            'retrievability': fsrs.get('retrievability'),
        },
        'correct_option': correct_opt,
        'selected_option': selected_opt,
        'is_correct': is_correct,
        '_blindness_checks': ai_internal_errors,
    })


async def run_evaluation(num_questions: int = 100, seed: int = 42):
    random.seed(seed)
    print("=" * 80)
    print("NEURALJEE MASTERY ALGORITHM EVALUATION - V5.1 (Crash-Safe + Resume)")
    print("=" * 80)
    print(f"Timestamp : {datetime.now(timezone.utc).isoformat()}")
    print(f"N questions/profile : {num_questions}")
    print(f"Random seed : {seed}")

    with open('profiles.json', 'r') as f:
        profiles = json.load(f)['profiles']
    profile_ids_in_order = [str(p['id']) for p in profiles]
    print(f"Loaded {len(profiles)} profiles: {[p['ground_truth_mode'] for p in profiles]}")

    # Step 1: try to resume from checkpoint. If a checkpoint matches the
    # (num_questions, seed, profile_ids, question_ids) tuple exactly, we load
    # the already-processed profiles from disk and SKIP them (their sims were
    # already flushed to raw_sim_cache.jsonl and need not be re-fetched).
    resume_attempt = _try_load_checkpoint({
        'num_questions': int(num_questions),
        'seed': int(seed),
        'profile_ids_in_order': profile_ids_in_order,
        # question_ids filled in after fetch path is decided below
        'question_ids_in_order': None,
    }) if False else None  # placeholder; actual attempt below after qids known

    # Step 2: fetch question set.
    # Fresh-run path: fetch a deterministic seeded set (setseed in TX).
    # Resume path: force-fetch EXACTLY the checkpoint's qids in EXACT order.
    questions: List[Dict[str, Any]] = []
    processed_profile_ids: List[str] = []
    st: Dict[str, Any] = _fresh_eval_state()
    checkpoint_resume_info = None

    # Peek: does a checkpoint exist with matching (num_questions, seed, profile_ids)?
    # Used ONLY to decide whether to force qid-order from disk vs fresh sample.
    if os.path.exists(_CHECKPOINT_FILE):
        try:
            with open(_CHECKPOINT_FILE, 'r', encoding='utf-8') as f:
                cp_peek = json.load(f)
            cfg_p = cp_peek.get('run_config') or {}
            if (
                cfg_p.get('num_questions') == int(num_questions)
                and cfg_p.get('seed') == int(seed)
                and cfg_p.get('profile_ids_in_order') == profile_ids_in_order
                and isinstance(cfg_p.get('question_ids_in_order'), list)
                and len(cfg_p.get('question_ids_in_order')) > 0
            ):
                checkpoint_resume_info = {
                    'qids': list(cfg_p['question_ids_in_order']),
                    'processed': list(cp_peek.get('processed_profile_ids') or []),
                    'state': cp_peek.get('state') or {},
                }
                print(f"[RESUME] Found matching checkpoint for seed={seed}, "
                      f"n_q={num_questions}. Will re-use exact qid order from "
                      f"checkpoint ({len(checkpoint_resume_info['qids'])} qids; "
                      f"{len(checkpoint_resume_info['processed'])} profiles already done).")
        except Exception:
            checkpoint_resume_info = None

    if checkpoint_resume_info is not None:
        questions = get_questions_from_db(
            limit=num_questions,
            seed=seed,
            explicit_qids_in_order=checkpoint_resume_info['qids'],
        )
    else:
        questions = get_questions_from_db(limit=num_questions, seed=seed)
        print(f"[FRESH RUN] Fetched {len(questions)} MCQ questions (deterministic, seed={seed}) from DB.\n")

    if not questions:
        print("NO QUESTIONS — aborting.")
        return

    qids_in_order = [q['id'] for q in questions]

    run_config = {
        'num_questions': int(num_questions),
        'seed': int(seed),
        'profile_ids_in_order': profile_ids_in_order,
        'question_ids_in_order': qids_in_order,
    }

    # Step 2b: actual resume check with qids_in_order now known.
    resume_loaded = _try_load_checkpoint(run_config)
    if resume_loaded is not None:
        processed_profile_ids, state_dict = resume_loaded
        st = _restore_state_from_checkpoint(state_dict)
        print(f"[RESUME] Loaded state from {_CHECKPOINT_FILE}: "
              f"{len(processed_profile_ids)}/{len(profiles)} profiles complete, "
              f"{st['total_evals']} evals restored, "
              f"{len(st['test_cases_details'])} test-case rows restored.")

    if not questions:
        print("NO QUESTIONS — aborting.")
        return

    assert_blindness_contract()

    processed_set = set(processed_profile_ids)

    for profile in profiles:
        pid = str(profile['id'])
        gt_mode = profile['ground_truth_mode']

        if pid in processed_set:
            # Profile already processed in a previous run. DO NOT re-call LLM;
            # the sims are in raw_sim_cache.jsonl AND the aggregates are
            # already in `st`. Just print a skip banner so user can see it.
            n_here = sum(
                1 for row in st['test_cases_details']
                if str(row.get('ground_truth_profile')) == str(gt_mode)
                or (pid and str(row.get('question_id', ''))[:1] and False)  # dead branch; kept for line-visibility
            )
            print(f"\n--- Profile {profile['id']:<25s} ({gt_mode}) ---  [SKIP — already checkpointed, rows in memory]")
            print(f"    state reports {st['per_profile_hits'].get(gt_mode, {}).get('total', '?')} total evals for this GT mode.")
            continue

        print(f"\n--- Profile {profile['id']:<25s} ({gt_mode}) ---")
        t0 = time.time()

        # LLM step: call Vertex (or return from raw_sim_cache.jsonl hit, which
        # is the crash-safety workhorse — every successful LLM call is fsynced
        # to the append-only JSONL BEFORE being returned).
        sim_results = await generate_student_actions_batch(
            questions, profile,
            run_seed=seed,
        )

        # Apply the classifier to every (q, sim) pair for this profile.
        for q, sim in zip(questions, sim_results):
            _process_one_question(q=q, sim=sim, profile=profile, st=st)

        # ══════════════════════════════════════════════════════════════════
        # CRASH-SAFETY CHECKPOINT AFTER EVERY COMPLETED PROFILE
        # ══════════════════════════════════════════════════════════════════
        processed_profile_ids.append(pid)
        processed_set.add(pid)
        try:
            _save_checkpoint(
                run_config=run_config,
                processed_profile_ids=processed_profile_ids,
                state=_state_for_checkpoint(st),
            )
        except Exception as cp_err:
            # Never let a checkpoint-write error kill a run that spent real
            # API budget; warn and continue (next profile will retry).
            print(f"  [WARN] Could not write checkpoint after profile {pid}: {cp_err}")

        dt = time.time() - t0
        print(f"  Profile wall time: {dt:.1f}s   |   checkpoint written ({st['total_evals']} evals so far)")

    # After all profiles: checkpoint is already consistent with end state.
    # Now pull out aliases for readability in the report section.
    total_evals = st['total_evals']
    blindness_violation_count = st['blindness_violation_count']
    llm_failure_count = st['llm_failure_count']
    blindness_call_count = st['blindness_call_count']
    profile_correct = st['profile_correct']
    option_tag_correct = st['option_tag_correct']
    option_tag_evaluations_count = st['option_tag_evaluations_count']
    mode7_wrong_total = st['mode7_wrong_total']
    mode7_wrong_correct = st['mode7_wrong_correct']
    profile_cm = st['profile_cm']
    wrong_ans_profile_cm = st['wrong_ans_profile_cm']
    option_cm = st['option_cm']
    per_profile_hits = st['per_profile_hits']
    signal_contrib_hist = st['signal_contrib_hist']
    engagement_bins = st['engagement_bins']
    test_cases_details = st['test_cases_details']

    # ══════════════════════════════════════════════════════════════════════
    # Final report
    # ══════════════════════════════════════════════════════════════════════
    profile_acc = (profile_correct / total_evals * 100) if total_evals else 0.0
    option_acc = (option_tag_correct / option_tag_evaluations_count * 100) if option_tag_evaluations_count else 0.0

    # (A*) HEADLINE METRIC: wrong-answer-only diagnostic recall (micro-averaged)
    #    = Σ TP_wrong(m) / Σ (TP_wrong(m) + FN_wrong(m))
    #    = # of wrong answers correctly diagnosed / # of wrong answers total
    wrong_ans_micro_tp = 0
    wrong_ans_micro_total = 0
    for m in ERROR_MODES:
        wrong_tp_m = wrong_ans_profile_cm.get(m, {}).get(m, 0)
        wrong_fn_m = sum(wrong_ans_profile_cm.get(m, {}).get(other, 0) for other in ERROR_MODES + ['NONE'])
        wrong_ans_micro_tp += wrong_tp_m
        wrong_ans_micro_total += wrong_tp_m + wrong_fn_m
    wrong_ans_diag_acc = (wrong_ans_micro_tp / wrong_ans_micro_total * 100) if wrong_ans_micro_total else 0.0

    if mode7_wrong_total:
        mode7_recall = mode7_wrong_correct / mode7_wrong_total * 100
    else:
        mode7_recall = 0.0

    print("\n" + "=" * 80)
    print("V5.1 EVALUATION RESULTS (Bayesian score-accumulation classifier)")
    print("=" * 80)
    print(f"Total evaluations           : {total_evals}")
    print(f"(A)  Blended profile acc    : {profile_acc:.2f}%  ({profile_correct}/{total_evals})  [sanity-only: includes correct-ans NONE]")
    print(f"(A*) WRONG-ANS DIAG RECALL  : {wrong_ans_diag_acc:.2f}%  ({wrong_ans_micro_tp}/{wrong_ans_micro_total})  ★ HEADLINE METRIC")
    print(f"(B)  Option-tag match rate  : {option_acc:.2f}%  ({option_tag_correct}/{option_tag_evaluations_count})")
    if mode7_wrong_total:
        print(f"(C)  MODE_7 wrong-ans recall: {mode7_recall:.1f}%  ({mode7_wrong_correct}/{mode7_wrong_total})")
    print(f"LLM  pipeline failure rate  : {llm_failure_count / max(1, blindness_call_count - blindness_violation_count) * 100:.2f}%  ({llm_failure_count}/{max(1, blindness_call_count - blindness_violation_count)})")

    # Per-mode P/R/F1 — population-consistent wrong-answer-only subset
    # TP (mode X) = wrong_ans rows where GT=X AND Pred=X
    # FP (mode X) = wrong_ans rows where GT!=X AND Pred=X  (correct-answer false positives excluded from diagnostic precision)
    # FN (mode X) = wrong_ans rows where GT=X AND Pred!=X
    # This gives a meaningful F1 on the actual diagnostic population (students who got it wrong).
    per_mode_prf1 = {}
    for m in ERROR_MODES:
        wrong_tp = wrong_ans_profile_cm.get(m, {}).get(m, 0)
        wrong_fp = sum(wrong_ans_profile_cm.get(other, {}).get(m, 0) for other in ERROR_MODES if other != m)
        wrong_fn = sum(wrong_ans_profile_cm.get(m, {}).get(other, 0) for other in ERROR_MODES + ['NONE'])
        precision = wrong_tp / (wrong_tp + wrong_fp) if (wrong_tp + wrong_fp) else 0.0
        recall = wrong_tp / (wrong_tp + wrong_fn) if (wrong_tp + wrong_fn) else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
        # Also retain full-population FP (including correct-answer false positives) for debugging reference
        full_fp = sum(profile_cm.get(other, {}).get(m, 0) for other in (ERROR_MODES + ['NONE']) if other != m)
        per_mode_prf1[m] = {
            'precision': round(precision, 4),
            'recall': round(recall, 4),
            'f1': round(f1, 4),
            'wrong_tp': wrong_tp,
            'wrong_fp': wrong_fp,
            'wrong_fn': wrong_fn,
            'full_population_fp': full_fp,
        }

    print("\n-- Per-mode WRONG-ANSWER-ONLY Precision / Recall / F1 (★ A* HEADLINE diagnostic quality) --")
    for m in ERROR_MODES:
        p = per_mode_prf1[m]
        print(f"  {m:<22s}  P={p['precision']*100:5.1f}  R={p['recall']*100:5.1f}  "
              f"F1={p['f1']*100:5.1f}   (TP_wrong={p['wrong_tp']} FP_wrong={p['wrong_fp']} FN_wrong={p['wrong_fn']})")

    print("\n-- Profile-level breakdown (Metric A) --")
    for gt_mode, d in sorted(per_profile_hits.items()):
        tot = d['total']
        cor = d['correct']
        acc = (cor / tot * 100) if tot else 0
        preds = dict(profile_cm[gt_mode])
        preds_sorted = sorted(preds.items(), key=lambda kv: -kv[1])
        print(f"\n  {gt_mode:<22s}  acc={acc:5.1f}%  ({cor}/{tot})  top preds:")
        for pred, n in preds_sorted[:5]:
            print(f"    -> {pred:<22s} {n:>3d}")

    # Save artifacts
    llm_eligible_total = max(0, blindness_call_count - blindness_violation_count)
    llm_pipeline_failure_rate_pct = (llm_failure_count / llm_eligible_total * 100) if llm_eligible_total else 0.0

    accuracy_payload = {
        'eval_version': 'V5.1',
        'generated_at_utc': datetime.now(timezone.utc).isoformat(),
        'num_questions_per_profile': num_questions,
        'random_seed': seed,
        'total_evaluations': total_evals,
        'metrics': {
            'A_blended_profile_diagnostic_accuracy_pct': profile_acc,
            'A_blended_profile_diagnostic_correct': profile_correct,
            'A_blended_profile_diagnostic_total': total_evals,
            'A_star_wrong_answer_diagnostic_recall_pct': wrong_ans_diag_acc,
            'A_star_wrong_answer_diagnostic_correct': wrong_ans_micro_tp,
            'A_star_wrong_answer_diagnostic_total': wrong_ans_micro_total,
            'B_option_tag_match_rate_pct': option_acc,
            'B_option_tag_match_correct': option_tag_correct,
            'B_option_tag_evaluations': option_tag_evaluations_count,
            'blindness_violation_count': blindness_violation_count,
            'blindness_call_count': blindness_call_count,
            'blindness_violation_rate_pct': (blindness_violation_count / blindness_call_count * 100) if blindness_call_count else 0.0,
            'llm_pipeline_failure_count': llm_failure_count,
            'llm_eligible_call_count': llm_eligible_total,
            'llm_pipeline_failure_rate_pct': llm_pipeline_failure_rate_pct,
            'C_mode7_wrong_answer_recall_pct': (
                mode7_wrong_correct / mode7_wrong_total * 100 if mode7_wrong_total else 0.0),
            'C_mode7_wrong_answer_recall_correct': mode7_wrong_correct,
            'C_mode7_wrong_answer_recall_total': mode7_wrong_total,
        },
        'profile_confusion_matrix': {k: dict(v) for k, v in profile_cm.items()},
        'wrong_answer_profile_confusion_matrix': {k: dict(v) for k, v in wrong_ans_profile_cm.items()},
        'option_tag_confusion_matrix': {k: dict(v) for k, v in option_cm.items()},
        'per_profile_breakdown': {
            gt_mode: {
                'correct': d['correct'],
                'total': d['total'],
                'accuracy_pct': (d['correct'] / d['total'] * 100) if d['total'] else 0.0,
            }
            for gt_mode, d in per_profile_hits.items()
        },
        'per_mode_wrong_answer_prf1': per_mode_prf1,
        'signal_contribution_breakdown': {k: dict(v) for k, v in signal_contrib_hist.items()},
        'engagement_distribution': {k: dict(v) for k, v in engagement_bins.items()},
    }

    # Crash-safe atomic writes for all 3 artifacts plus their .bak backups.
    # If the process gets killed mid-write, the previous-good copy stays on
    # disk and the .tmp partial write is either removed or never renamed.
    _atomic_json_write('accuracy_report.json', accuracy_payload, keep_bak=True)
    print("\nSaved accuracy_report.json (atomic; accuracy_report.json.bak = prior run kept for rollback)")

    _atomic_json_write('test_cases_results.json', test_cases_details, keep_bak=True)
    print("Saved test_cases_results.json (atomic; test_cases_results.json.bak = prior run)")

    md_lines = []
    md_lines.append('# NeuralJEE — V5.1 Mastery Algorithm Evaluation Report\n')
    md_lines.append(f'_Generated: {datetime.now(timezone.utc).isoformat()}_\n')
    md_lines.append(f'- Questions per profile: **{num_questions}**')
    md_lines.append(f'- Total evaluations: **{total_evals}**')
    md_lines.append(f'- Wrong-answer diagnostic cases: **{wrong_ans_micro_total}** (of which **{wrong_ans_micro_tp}** correctly classified)')
    md_lines.append(f'- Blindness violations: **{blindness_violation_count}/{blindness_call_count}**')
    md_lines.append(f'- LLM pipeline failures (clean-payload calls only): **{llm_failure_count}/{llm_eligible_total}** ({llm_pipeline_failure_rate_pct:.2f}%)')
    md_lines.append(f'- Random seed: `{seed}`\n')
    md_lines.append('## ★ Headline Metric — Wrong-Answer Diagnostic Recall (A*)\n')
    md_lines.append('**REAL PRODUCTION METRIC.** This is the number that actually drives pedagogy decisions. Given a student with a known cognitive profile who answered INCORRECTLY (so a diagnosis is needed), did `classifyFailureModeV3()` return their actual cognitive state? Excludes correct-answer `NONE` matches (trivial).\n')
    md_lines.append(f'# {wrong_ans_diag_acc:.2f}% ({wrong_ans_micro_tp}/{wrong_ans_micro_total})\n')
    md_lines.append('---\n')
    md_lines.append('## Other Metrics (sanity / data-quality)\n')
    md_lines.append('### A) Blended Profile Diagnostic Accuracy (sanity only)\n')
    md_lines.append('Includes correct-answer `NONE` matches. Use this only for end-to-end sanity checks — it overstates real diagnostic accuracy by the fraction of correct answers.\n')
    md_lines.append(f'**Overall: {profile_acc:.2f}% ({profile_correct}/{total_evals})**\n')
    md_lines.append('### B) Option-Tag Match Rate (data quality)\n')
    md_lines.append('When the option the student clicked has a DB `misconceptionType` tag, does the classifier agree with the designer\'s label? Measures tag↔classifier alignment, not ground-truth cognitive-state accuracy.\n')
    md_lines.append(f'**Overall: {option_acc:.2f}% ({option_tag_correct}/{option_tag_evaluations_count})**\n')
    md_lines.append('### C) MODE_7 Forgetting Wrong-Answer Recall\n')
    md_lines.append('Pedagogically-critical special case. When FSRS retrievability is low AND answer is wrong, did we diagnose MODE_7 (scheduled review) instead of re-teaching as if it were a conceptual gap?\n')
    if mode7_wrong_total:
        md_lines.append(f'**{mode7_recall:.1f}% ({mode7_wrong_correct}/{mode7_wrong_total})**\n')
    else:
        md_lines.append('**N/A (no MODE_7 wrong answers captured)**\n')
    md_lines.append('## Per-Profile Breakdown (Blended Metric A)\n')
    md_lines.append('| Profile | Correct | Total | Accuracy |')
    md_lines.append('|---|---|---|---|')
    for gt_mode, d in sorted(per_profile_hits.items()):
        tot = d['total']
        cor = d['correct']
        acc = (cor / tot * 100) if tot else 0
        md_lines.append(f'| {gt_mode} | {cor} | {tot} | {acc:.1f}% |')
    md_lines.append('\n## Per-Mode WRONG-ANSWER-ONLY Diagnostic Quality (P / R / F1) — matches Metric A* population\n')
    md_lines.append('> Population: only rows where `is_correct=False`. TP=GT=m ∧ Pred=m. **FP=GT≠m ∧ Pred=m** (correct-answer false positives are excluded — this measures diagnostic-precision on actual misdiagnosis attempts only). FN=GT=m ∧ Pred≠m.\n')
    md_lines.append('| Mode | Precision (wrong) | Recall (wrong) | F1 (wrong) | TP_wrong | FP_wrong | FN_wrong |')
    md_lines.append('|---|---|---|---|---|---|---|')
    for m in ERROR_MODES:
        p = per_mode_prf1[m]
        md_lines.append(
            f'| {m} | {p["precision"]*100:.1f}% | {p["recall"]*100:.1f}% | {p["f1"]*100:.1f}% | {p["wrong_tp"]} | {p["wrong_fp"]} | {p["wrong_fn"]} |'
        )
    md_lines.append('\n## V5.1 Changes Applied\n')
    md_lines.append('- **P/R/F1 FP bug fixed**: FP sum no longer includes GT==m rows (precision was previously halved for every mode).')
    md_lines.append('- **Wrong-answer-only P/R/F1**: TP/FP/FN all computed on `is_correct=False` subset so precision and recall describe the same population; F1 is now meaningful.')
    md_lines.append('- **A* headline metric**: Micro-averaged wrong-answer diagnostic recall reported as the production-facing accuracy number.')
    md_lines.append('- **LLM circuit-breaker refined**: failure rate computed only on calls that passed blindness checks (clean payloads); blindness-safe fallbacks no longer double-counted as LLM failures. Trigger threshold: >3% after first full profile (100 eligible calls).')
    md_lines.append('- Bayesian score accumulation (V3 engine) instead of hard priority rules.')
    md_lines.append('- Engagement-gated option tag weight (0 below timeRatio=0.2, linear ramp to 1.5 at engagement=1.0).')
    md_lines.append('- prerequisiteTrapId elevation (+3.2 MODE_1 when designer-annotated prerequisite trap hit).')
    md_lines.append('- MODE_7 wrong-answer FSRS retrievability boost (+2.5 MODE_7 when isRetrievabilityLow on wrong answers).')
    md_lines.append('- Calibrated telemetry tiers: TIER-A procedural extreme +2.8, TIER-B formula-2switch +2.0, TIER-C careless rushed +1.85.\n')
    md_path = 'V5_EVALUATION_RESULTS.md'
    md_tmp = md_path + '.tmp'
    md_buf = '\n'.join(md_lines)
    with open(md_tmp, 'w', encoding='utf-8') as f:
        f.write(md_buf)
        f.flush()
        try:
            os.fsync(f.fileno())
        except OSError:
            pass
    md_bak = md_path + '.bak'
    if os.path.exists(md_path):
        if os.path.exists(md_bak):
            os.remove(md_bak)
        shutil.copy2(md_path, md_bak)
    if sys.platform.startswith('win'):
        try:
            os.replace(md_tmp, md_path)
        except FileExistsError:
            os.remove(md_path)
            os.rename(md_tmp, md_path)
    else:
        os.replace(md_tmp, md_path)
    print(f"Saved {md_path} (atomic; {md_bak} = prior run)")

    # Successful end of run: leave checkpoint on disk (it's the canonical
    # "this exact (seed, qids, profiles) run is done" record) but also print
    # a one-line safety note for the operator.
    print(f"\n[DONE] Run complete. Crash-safety artifacts in this directory:")
    print(f"  - {_CHECKPOINT_FILE}  (.bak available too — delete BOTH only if you want a truly fresh run)")
    print(f"  - raw_sim_cache.jsonl  (append-only, fsynced per row — NEVER delete unless you want to re-pay the 700 API calls)")


if __name__ == '__main__':
    asyncio.run(run_evaluation(num_questions=100, seed=42))
