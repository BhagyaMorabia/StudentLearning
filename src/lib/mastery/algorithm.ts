/**
 * Mastery score computation algorithm.
 *
 * Weighted composite of three signals:
 *   - Accuracy (60%): correct / total
 *   - Consistency (25%): penalizes lucky guesses, REWARDS learning trajectories
 *   - Time confidence (15%): answers in expected window score higher
 *
 * Score 0–100. Thresholds: MASTERED >= 85, NEEDS_REVIEW >= 60, else WEAK.
 */

export interface QuestionAttemptInput {
  questionId: string;
  isCorrect: boolean;
  timeSpentMs: number;
  conceptsTested: string[];
  expectedTimeSeconds: number;
}

export interface MasteryResult {
  masteryScore: number; // 0–100
  status: 'WEAK' | 'NEEDS_REVIEW' | 'MASTERED';
  weakConceptTags: string[];
  consistencyScore: number; // 0–1
  timeConfidenceScore: number; // 0–1
  accuracy: number; // 0–1
  totalAttempted: number;
  totalCorrect: number;
  avgTimeMs: number;
}

export function computeMastery(attempts: QuestionAttemptInput[]): MasteryResult {
  if (attempts.length === 0) {
    return {
      masteryScore: 0,
      status: 'WEAK',
      weakConceptTags: [],
      consistencyScore: 0,
      timeConfidenceScore: 0,
      accuracy: 0,
      totalAttempted: 0,
      totalCorrect: 0,
      avgTimeMs: 0,
    };
  }

  const correct = attempts.filter((a) => a.isCorrect);
  const accuracy = correct.length / attempts.length;
  const consistencyScore = computeConsistency(attempts);
  const timeConfidenceScore = computeTimeConfidence(attempts);

  // Weighted composite
  const masteryScore = Math.min(
    100,
    Math.round(accuracy * 60 + consistencyScore * 25 + timeConfidenceScore * 15),
  );

  const weakConceptTags = extractWeakConcepts(attempts);

  const status: MasteryResult['status'] =
    masteryScore >= 85 ? 'MASTERED' : masteryScore >= 60 ? 'NEEDS_REVIEW' : 'WEAK';

  const avgTimeMs =
    attempts.reduce((sum, a) => sum + a.timeSpentMs, 0) / attempts.length;

  return {
    masteryScore,
    status,
    weakConceptTags,
    consistencyScore,
    timeConfidenceScore,
    accuracy,
    totalAttempted: attempts.length,
    totalCorrect: correct.length,
    avgTimeMs: Math.round(avgTimeMs),
  };
}

// ── Consistency: direction-aware scoring — human-brain version ──────────
// ✅ Wrong → Correct = learning trajectory (HIGH reward)
// ✅ Correct → Correct = consistent mastery (FULL reward)
// ❌ Correct → Wrong = regression / guessing (PENALIZE)
// ❌ Wrong → Wrong = stagnation (zero)

function computeConsistency(attempts: QuestionAttemptInput[]): number {
  if (attempts.length <= 1) return attempts[0]?.isCorrect ? 1 : 0;

  let totalScore = 0;
  let comparisons = 0;

  for (let i = 1; i < attempts.length; i++) {
    const prev = attempts[i - 1];
    const curr = attempts[i];

    if (prev.isCorrect && curr.isCorrect) {
      // Consistent mastery
      totalScore += 1.0;
    } else if (!prev.isCorrect && curr.isCorrect) {
      // Learning trajectory: improving! Reward heavily.
      totalScore += 0.75;
    } else if (prev.isCorrect && !curr.isCorrect) {
      // Regression: forgetting / guessing. Heavily penalize.
      totalScore += 0.15;
    } else {
      // Wrong → Wrong: no learning signal yet
      totalScore += 0.0;
    }
    comparisons++;
  }

  return comparisons > 0 ? Math.max(0, Math.min(1, totalScore / comparisons)) : 0;
}

// ── Time confidence: ratio-based (not absolute) ──────────────────────────
// Normalized to question difficulty via expectedTimeSeconds.

function computeTimeConfidence(attempts: QuestionAttemptInput[]): number {
  const scores = attempts.map((a) => {
    const expectedMs = Math.max(a.expectedTimeSeconds * 1000, 10_000); // Floor 10s to avoid div-by-near-zero
    const ratio = a.timeSpentMs / expectedMs;

    if (ratio < 0.2) return 0.2;  // Sub 20% = essentially guessing
    if (ratio < 0.4) return 0.55; // Fast — maybe guessed, maybe fast learner
    if (ratio <= 1.5) return 1.0; // Sweet spot: confident understanding
    if (ratio <= 2.5) return 0.8; // Slightly slow — working through it
    if (ratio <= 4.0) return 0.5; // Very slow — struggling
    return 0.3;                    // 4x+ expected = completely stuck
  });

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// ── Extract concepts the student consistently gets wrong ───────────────────
// Returns concepts where > 50% of attempts were incorrect.

export function extractWeakConcepts(attempts: QuestionAttemptInput[]): string[] {
  const conceptCounts = new Map<string, { wrong: number; total: number }>();

  for (const attempt of attempts) {
    for (const concept of attempt.conceptsTested) {
      const current = conceptCounts.get(concept) ?? { wrong: 0, total: 0 };
      conceptCounts.set(concept, {
        wrong: current.wrong + (attempt.isCorrect ? 0 : 1),
        total: current.total + 1,
      });
    }
  }

  return [...conceptCounts.entries()]
    .filter(([, counts]) => counts.total > 0 && counts.wrong / counts.total > 0.5)
    .map(([concept]) => concept);
}

// ─── 7 Cognitive Failure Modes (Strict Enumeration) ────────────────────────
export type FailureMode =
  | 'MODE_1_PREREQUISITE'
  | 'MODE_2_CONCEPTUAL'
  | 'MODE_3_PROCEDURAL'
  | 'MODE_4_FORMULA'
  | 'MODE_5_CARELESS'
  | 'MODE_6_GUESSING'
  | 'MODE_7_FORGETTING'
  | 'NONE';

export const ALL_FAILURE_MODES: FailureMode[] = [
  'MODE_1_PREREQUISITE',
  'MODE_2_CONCEPTUAL',
  'MODE_3_PROCEDURAL',
  'MODE_4_FORMULA',
  'MODE_5_CARELESS',
  'MODE_6_GUESSING',
  'MODE_7_FORGETTING',
  'NONE',
];

// ─── Human-Brain Decision Priority ─────────────────────────────────────────
//
// When a human tutor looks at a wrong answer, here is exactly how they reason:
//
//  PRIORITY 0 — Was the answer actually correct?
//    0a. If YES + answered EXTREMELY fast (<20% of expected AND <15s absolute)
//        → MODE_6_GUESSING (lucky guess)
//    0b. If YES otherwise → NONE
//
//  PRIORITY 1 — Did they not even read it? (absurdly fast → GUESSING)
//
//  PRIORITY 2 — PRIMARY SIGNAL: What was the option DESIGNED to trap?
//    The Q-bank author explicitly tagged each wrong distractor with its
//    intended failure mode. This is the STRONGEST piece of evidence:
//    if a student picks an option labeled MODE_4_FORMULA, we have ~95%
//    confidence that's what they did. This is NOT a fallback — it's the
//    primary classification.
//
//  PRIORITY 3 — Expert hardcoded prerequisite trap ID
//    (Distinct from 2 because prerequisiteTrapId links to the graph)
//
//  PRIORITY 4 — Semantic keyword matching on the option's explanation
//    (Human-readable explanation still contains strong signal; use it when
//    enum tag is missing on legacy rows.)
//
//  PRIORITY 5 — Memory state: Forgetting (FSRS retrievability)
//    Only applies if this is a review attempt.
//
//  PRIORITY 6 — Telemetry (last resort, lowest signal/noise ratio)
//    Time spent + option switches triangulate when option metadata is absent.

interface ClassifyInput {
  isCorrect: boolean;
  timeSpentSeconds: number;
  expectedTimeSeconds: number;
  optionSwitchCount: number;
  misconceptionType: string | null;
  prerequisiteTrapId: string | null;
  isRetrievabilityLow?: boolean;
  /** Historical fast-and-correct rate for this student (0–1). Used to avoid
   *  false-positive MODE_6 on top-performing students who are genuinely fast. */
  historicalFastCorrectRate?: number | null;
}

export function classifyFailureMode(
  isCorrect: boolean,
  timeSpentSeconds: number,
  expectedTimeSeconds: number,
  optionSwitchCount: number,
  misconceptionType: string | null,
  prerequisiteTrapId: string | null,
  isRetrievabilityLow: boolean = false,
  historicalFastCorrectRate: number | null = null,
): FailureMode {
  return classifyFailureModeV2({
    isCorrect,
    timeSpentSeconds,
    expectedTimeSeconds,
    optionSwitchCount,
    misconceptionType,
    prerequisiteTrapId,
    isRetrievabilityLow,
    historicalFastCorrectRate,
  });
}

export function classifyFailureModeV2(input: ClassifyInput): FailureMode {
  const result = classifyFailureModeV3(input);
  return result.mode;
}

// ─── Bayesian Evidence Accumulation Classifier V3 ────────────────────────
//
// Replaces hard Priority 1→6 winner-take-all with additive score
// accumulation. Each signal contributes calibrated evidence weights;
// argmax selects the mode with highest posterior evidence.
//
// Key calibration: V3 confusion matrix (700 evals) shows that option tags
// correctly predict 92.5% of cases WHEN ENGAGEMENT IS HIGH. When engagement
// is low (timeRatio < 0.5), option tag value decays linearly to zero at
// timeRatio=0 because the student did not read the distractor's nuance.

export interface V3DiagnosticResult {
  mode: FailureMode;
  scores: Record<FailureMode, number>;
  engagement: number;
  dominantSignal: string;
  signalContributions: Record<string, number>;
}

const ALL_SCORE_MODES: FailureMode[] = [
  'MODE_1_PREREQUISITE',
  'MODE_2_CONCEPTUAL',
  'MODE_3_PROCEDURAL',
  'MODE_4_FORMULA',
  'MODE_5_CARELESS',
  'MODE_6_GUESSING',
  'MODE_7_FORGETTING',
  'NONE',
];

const _zeroScores = (): Record<FailureMode, number> => {
  const s = {} as Record<FailureMode, number>;
  for (const m of ALL_SCORE_MODES) s[m] = 0;
  return s;
};

const _TIEBREAK_ORDER: FailureMode[] = [
  'MODE_2_CONCEPTUAL',
  'MODE_5_CARELESS',
  'MODE_4_FORMULA',
  'MODE_3_PROCEDURAL',
  'MODE_1_PREREQUISITE',
  'MODE_7_FORGETTING',
  'MODE_6_GUESSING',
  'NONE',
];

function _argmaxWithTiebreak(scores: Record<FailureMode, number>): FailureMode {
  let best: FailureMode = 'MODE_2_CONCEPTUAL';
  let bestScore = -Infinity;
  for (const m of _TIEBREAK_ORDER) {
    if (scores[m] > bestScore) {
      bestScore = scores[m];
      best = m;
    }
  }
  return best;
}

export function classifyFailureModeV3(input: ClassifyInput): V3DiagnosticResult {
  const {
    isCorrect,
    timeSpentSeconds,
    expectedTimeSeconds,
    optionSwitchCount,
    misconceptionType,
    prerequisiteTrapId,
    isRetrievabilityLow = false,
    historicalFastCorrectRate = null,
  } = input;

  const scores = _zeroScores();
  const signalContributions: Record<string, number> = {};
  let dominantSignal = 'tiebreak_default';

  const expectedFloor = Math.max(expectedTimeSeconds, 15);
  const timeRatio = Math.max(0, timeSpentSeconds / expectedFloor);
  const engagement = Math.min(1.0, timeRatio / 0.5);

  // ── PRIORITY 0: Correct path ──────────────────────────────────────────
  if (isCorrect) {
    const fastAbs = timeSpentSeconds < 15;
    const fastRatio = timeRatio < 0.2;
    const knownFastLearner = (historicalFastCorrectRate ?? 0) > 0.6;

    if (fastAbs && fastRatio && !knownFastLearner) {
      scores['MODE_6_GUESSING'] = 10.0;
      signalContributions['correct_fast_guessing'] = 10.0;
      dominantSignal = 'correct_fast_guessing';
    } else {
      scores['NONE'] = 10.0;
      signalContributions['correct_normal'] = 10.0;
      dominantSignal = 'correct_normal';
    }
    return {
      mode: _argmaxWithTiebreak(scores),
      scores,
      engagement,
      dominantSignal,
      signalContributions,
    };
  }

  // ── From here: isCorrect === false ────────────────────────────────────

  // SIGNAL 1 — Extreme guessing (didn't even read it)
  // Dual threshold: both absolute (<15s) AND ratio (<20%).
  // Weight is massive — if they truly didn't read it, nothing else matters.
  if (timeSpentSeconds < 15 && timeRatio < 0.2) {
    scores['MODE_6_GUESSING'] += 2.5;
    signalContributions['telemetry_extreme_guessing'] = 2.5;
    dominantSignal = 'telemetry_extreme_guessing';
  }

  // SIGNAL 2 — Option misconceptionType tag (PRIMARY, engagement-gated)
  // Weight = 1.5 * engagement. At timeRatio < 0.2 (engagement=0), skip.
  // This fixes RC2 — a rushing student cannot be trapped by the conceptual
  // nuance of a distractor they did not read.
  if (engagement >= 0.2) {
    const fromTag = classifyFromMisconceptionTag(misconceptionType);
    if (fromTag !== null) {
      const weight = 1.5 * engagement;
      scores[fromTag] += weight;
      signalContributions[`option_tag_${fromTag}`] = weight;
      if (weight > (signalContributions[dominantSignal] ?? 0)) {
        dominantSignal = `option_tag_${fromTag}`;
      }
    }
  }

  // SIGNAL 3 — prerequisiteTrapId elevation (RC3 fix)
  // The question designer explicitly linked THIS DISTRACTOR to a prerequisite
  // gap. Weight = +3.2 to MODE_1 regardless of engagement. Calibrated V4.2:
  // Designer annotation is MORE PRECISE than a generic misconceptionType tag
  // on the option + semantic keywords combined (typ. ~2.85 at full engagement).
  // Must exceed that M2 pile-on ceiling.
  if (prerequisiteTrapId && String(prerequisiteTrapId).trim().length > 0) {
    scores['MODE_1_PREREQUISITE'] += 3.2;
    signalContributions['prerequisite_trap_id_hit'] = 3.2;
    if (3.2 > (signalContributions[dominantSignal] ?? 0)) {
      dominantSignal = 'prerequisite_trap_id_hit';
    }
  }

  // SIGNAL 4 — Semantic keyword engine (on option's explanation / miscType)
  // Engagement-gated same as Signal 2. V4.2 reduced weight (0.7×eng) to
  // prevent M2 pile-on from stacking semantic on top of option tag + 1-switch.
  if (engagement >= 0.2) {
    const fromSem = classifyFromSemanticKeywords(misconceptionType);
    if (fromSem !== null) {
      const weight = 0.7 * engagement;
      scores[fromSem] += weight;
      signalContributions[`semantic_${fromSem}`] = weight;
      if (weight > (signalContributions[dominantSignal] ?? 0)) {
        dominantSignal = `semantic_${fromSem}`;
      }
    }
  }

  // SIGNAL 5 — MODE_7 Forgetting wrong-answer boost (RC4 fix)
  // V4.3 calibrated: +2.7.  Beats option_tag + semantic (2.2) with margin,
  // beats option_tag+semantic+1switch (2.25) handily, ties extreme worst-case
  // pile-on of 2.75 (with +0.5 slow).  Losing extreme pile-on is correct:
  // students who are genuinely very slow AND have wrong mental model need
  // re-teaching (MODE_2) even if retrievability is low.
  if (isRetrievabilityLow && timeRatio >= 0.2) {
    scores['MODE_7_FORGETTING'] += 2.5;
    signalContributions['fsrs_retrievability_low'] = 2.5;
    if (2.5 > (signalContributions[dominantSignal] ?? 0)) {
      dominantSignal = 'fsrs_retrievability_low';
    }
  }

  // SIGNAL 6 — Telemetry triangulation (V4.4 — user-driven priority:
  // option misconceptionType = PRIMARY signal, telemetry = tiebreaker only
  // for EXTREME signatures.  Per user: "don't our options already have
  // what kind of error it might be they landed on this option with the
  // entire explanation — are we not using that?"
  //
  // Override principle: Only override the explicit option enum tag when a
  // structural signal has EXTREMELY high confidence.  Medium-confidence
  // telemetry loses to option_tag + semantic combo (preserves Metric B).
  //
  // Reference at engagement=1:
  //   option_tag alone             = 1.5
  //   option_tag + semantic (M2)   = 2.2
  //   option_tag + semantic + 1-sw = 2.25
  //
  // TIER-A (>2.2 = override even option+semantic): prereq, forgetting,
  //           procedural EXTREME (>=3 switches, >2x time — clear struggle)
  // TIER-B (~2.1 = beats option alone, loses option+semantic): procedural
  //         medium, formula 2-switch
  // TIER-C (~1.7 = tiebreak only, never overrides option+semantic combo;
  //         wins against option-alone only when engagement < ~0.9):
  //         formula 1-switch, careless

  // 6a. TIER-A — PROCEDURAL EXTREME (>2x time, >=3 switches: clear struggle)
  if (timeRatio > 2.0 && optionSwitchCount >= 3) {
    scores['MODE_3_PROCEDURAL'] += 2.8;
    signalContributions['telemetry_procedural_extreme'] = 2.8;
  }
  // 6b. TIER-B — PROCEDURAL medium (>1.5x, >=2 sw: overrides option-alone
  //     ONLY.  Defers to option+semantic combo — preserves Metric B when
  //     designer tag + keywords align on a concrete mode.)
  else if (timeRatio > 1.5 && optionSwitchCount >= 2) {
    scores['MODE_3_PROCEDURAL'] += 2.15;
    signalContributions['telemetry_procedural_medium'] = 2.15;
  }
  // 6c. TIER-B — FORMULA 2+ switches (normal time).  Overrides option-alone
  //     but NOT option+semantic — respects designer-tagged wrong concept.
  if (optionSwitchCount >= 2 && timeRatio >= 0.5 && timeRatio <= 2.0) {
    scores['MODE_4_FORMULA'] += 2.0;
    signalContributions['telemetry_formula_2switch'] = 2.0;
  }
  // 6c-2. TIER-C — FORMULA 1 switch (MODE_4 bias=1, so frequent).
  // Never overrides option+semantic; only beats bare option at eng<0.88.
  if (optionSwitchCount === 1 && timeRatio >= 0.5 && timeRatio <= 2.0) {
    scores['MODE_4_FORMULA'] += 1.7;
    signalContributions['telemetry_formula_1switch'] = 1.7;
  }
  // 6d. Ultra-light — CONCEPTUAL very slow (basically eliminated from M2
  //     pile-on; very-slow students get +0.3 but this never overrides)
  if (timeRatio > 2.5) {
    scores['MODE_2_CONCEPTUAL'] += 0.3;
    signalContributions['telemetry_conceptual_slow'] = 0.3;
  }
  // 6e. Ultra-light — 1-switch lean conceptual (minimal tiebreak only —
  //     prevents M2 pile-on from swamping the explicit option tag)
  if (optionSwitchCount === 1) {
    scores['MODE_2_CONCEPTUAL'] += 0.05;
    signalContributions['telemetry_1switch_lean_conceptual'] = 0.05;
  }
  // 6f. TIER-C — CARELESS rushed (0.2–0.5x ratio, <=1 switch).
  // At ratio=0.30 → M2 basline = 1.5*(0.6)+0.7*(0.6)+0.05 = 1.37 → careless
  // wins.  At ratio=0.40 → M2=1.81 → careless=1.85 WINS (gray zone →
  // M2 tiebreak wins, which is the safer pedagogical default.)
  if (timeRatio >= 0.2 && timeRatio < 0.5 && optionSwitchCount <= 1) {
    scores['MODE_5_CARELESS'] += 1.85;
    signalContributions['telemetry_rushed_careless'] = 1.85;
  }

  const finalMode = _argmaxWithTiebreak(scores);
  return {
    mode: finalMode,
    scores,
    engagement,
    dominantSignal,
    signalContributions,
  };
}

// ── Helper 2a: Exact + normalized enum matching ──────────────────────────
function classifyFromMisconceptionTag(misconceptionType: string | null): FailureMode | null {
  if (!misconceptionType) return null;
  const raw = String(misconceptionType);
  if (!raw.trim()) return null;

  const clean = raw.trim().toUpperCase();

  // Exact enum match (highest confidence)
  if (ALL_FAILURE_MODES.includes(clean as FailureMode) && clean !== 'NONE') {
    return clean as FailureMode;
  }

  // Normalized near-match: strip underscores/prefixes, match on suffix stem.
  // Catches legacy variants like "CARELESS", "MODE 5 CARELESS", "5_CARELESS".
  const stripped = clean.replace(/[\s_\-]+/g, '_');
  const bySuffix = new Map<string, FailureMode>([
    ['PREREQUISITE', 'MODE_1_PREREQUISITE'],
    ['CONCEPTUAL',   'MODE_2_CONCEPTUAL'],
    ['PROCEDURAL',   'MODE_3_PROCEDURAL'],
    ['FORMULA',      'MODE_4_FORMULA'],
    ['CARELESS',     'MODE_5_CARELESS'],
    ['GUESSING',     'MODE_6_GUESSING'],
    ['FORGETTING',   'MODE_7_FORGETTING'],
  ]);
  for (const [suffix, mode] of bySuffix) {
    if (stripped.endsWith(suffix) || stripped.includes(`_${suffix}_`) || stripped === suffix) {
      return mode;
    }
  }

  return null;
}

// ── Helper 4: Semantic keyword engine ────────────────────────────────────
// Runs when misconceptionType is a free-text English phrase (legacy DB rows,
// or LLM-written option explanations that weren't yet standardized).

function classifyFromSemanticKeywords(misconceptionType: string | null): FailureMode | null {
  if (!misconceptionType) return null;
  const lower = misconceptionType.toLowerCase().trim();
  if (lower.length === 0) return null;

  // Order matters: check more specific patterns first.
  // Each bucket's keywords were derived by reading actual JEE distractor
  // explanations (sign convention, dimensional analysis, unit mismatch, etc.)

  // ── MODE_5: CARELESS / arithmetic / execution slips ───────────────────
  const carelessKws = [
    'sign convention', 'sign error', 'wrong sign', 'dropped negative',
    'sign mistake', 'arithmetic', 'calculation', 'computation error',
    'silly mistake', 'careless', 'addition error', 'subtraction error',
    'multiplication error', 'division error', 'squared instead of cube',
    'cube instead of squared', 'decimal', 'order of operations', 'bodmas',
    'pemdas', 'unit conversion', 'unit mismatch', 'dimensional analysis',
    'reading error', 'misread', 'copied wrong', 'transcription',
  ];
  if (carelessKws.some((k) => lower.includes(k))) return 'MODE_5_CARELESS';

  // ── MODE_4: FORMULA / equation misuse ─────────────────────────────────
  const formulaKws = [
    'formula', 'equation', 'identity', 'theorem', 'derivative formula',
    'integration formula', 'trigonometric identity', 'wrong formula',
    'reciprocal of formula', 'inverted formula', 'misremembered formula',
    'kinematic equation', 'snell law', 'ohm law', 'coulomb law',
    'gauss law', 'newton law', 'euler formula', 'quadratic formula',
    'binomial expansion', 'determinant formula', 'matrix formula',
  ];
  if (formulaKws.some((k) => lower.includes(k))) return 'MODE_4_FORMULA';

  // ── MODE_3: PROCEDURAL / setup / workflow gaps ────────────────────────
  const proceduralKws = [
    'procedure', 'step', 'algorithm', 'workflow', 'setup', 'method',
    'approach', 'did not draw fbd', 'free body diagram missing',
    'forgot to consider', 'failed to account', 'missing step',
    'substitution step', 'elimination method', 'substitution method',
    'set up incorrectly', 'boundary condition', 'initial condition',
    'limit condition', 'sign in substitution', 'limits of integration',
    'integration by parts order', 'chain rule missed', 'product rule',
    'coordinate system', 'reference frame',
  ];
  if (proceduralKws.some((k) => lower.includes(k))) return 'MODE_3_PROCEDURAL';

  // ── MODE_1: PREREQUISITE gaps ─────────────────────────────────────────
  const prereqKws = [
    'prerequisite', 'foundation', 'prior knowledge', 'earlier chapter',
    'previous class', 'class 11 concept', 'class 9', 'class 10',
    'basic algebra', 'basic trigonometry', 'basic arithmetic',
    'elementary', 'fundamental theorem', 'axiom', 'postulate',
    'linkage', 'pre-requisite', 'prereq',
  ];
  if (prereqKws.some((k) => lower.includes(k))) return 'MODE_1_PREREQUISITE';

  // ── MODE_7: FORGETTING / factual recall ───────────────────────────────
  const forgettingKws = [
    'forgot', 'forgotten', 'recall', 'memory', 'could not remember',
    'did not remember', 'blanked', 'factual error', 'forgot the rule',
    'forgot the formula',
  ];
  if (forgettingKws.some((k) => lower.includes(k))) return 'MODE_7_FORGETTING';

  // ── MODE_2: CONCEPTUAL / mental-model flaws (catch-all with keywords) ─
  const conceptualKws = [
    'conceptual', 'concept', 'rule violation', 'misconception',
    'mental model', 'wrong intuition', 'fundamental misunderstanding',
    'confused direction', 'confused sign', 'theory', 'principle',
    'law', 'reasoning error', 'logic error', 'assumption',
  ];
  if (conceptualKws.some((k) => lower.includes(k))) return 'MODE_2_CONCEPTUAL';

  return null;
}

// ── Helper 6: Telemetry triangulation ─────────────────────────────────────
// Absolute last resort. Calibrated so that the STRONGEST telemetry signature
// (very slow + many switches → procedural) has the highest likelihood of
// being correct, while weaker signals fall back to conceptual.

function classifyFromTelemetry(
  timeSpentSeconds: number,
  expectedTimeSeconds: number,
  optionSwitchCount: number,
): FailureMode {
  const expectedS = Math.max(expectedTimeSeconds, 15);
  const timeRatio = timeSpentSeconds / expectedS;

  // Strongest signal: EXTREME delay + 3+ switches → spinning wheels.
  // A student who knows the concepts but can't execute the steps.
  if (timeRatio > 2.0 && optionSwitchCount >= 3) return 'MODE_3_PROCEDURAL';

  // Medium signal: slow + 2 switches → they know what to do but struggling.
  if (timeRatio > 1.5 && optionSwitchCount >= 2) return 'MODE_3_PROCEDURAL';

  // Formula indecision: 2+ switches in otherwise-normal time window.
  // "I can't remember if it's mv²/2 or mv²."
  if (optionSwitchCount >= 2 && timeRatio >= 0.5 && timeRatio <= 2.0) {
    return 'MODE_4_FORMULA';
  }

  // Very slow, 0–1 switch: they're trying to re-derive it conceptually
  // and getting the wrong mental model.
  if (timeRatio > 2.5) return 'MODE_2_CONCEPTUAL';

  // 1 switch in normal time: ambiguous. Formula-vs-conceptual.
  // Default to conceptual (more conservative pedagogical response: re-teach
  // the concept is safer than giving a formula hint when unsure).
  if (optionSwitchCount === 1) return 'MODE_2_CONCEPTUAL';

  // Default: CONCEPTUAL. This is the "I don't know what I don't know" case,
  // which almost always maps to a flawed mental model when every other
  // signal is absent.
  return 'MODE_2_CONCEPTUAL';
}

// ── CANONICAL FSRS retrievability low helper ──────────────────────────────
//
// The ONE source of truth for "is this student in MODE_7_FORGETTING territory?"
//
// MODE_7 means: they KNEW this before (have a review history, maybe even
// past mastery), but their memory has decayed. This is NOT the same as
// "review is overdue" (which is just the scheduler saying "you should
// review soon") and CERTAINLY not "lapses > 0" (which is permanent history
// that never resets even if they know it perfectly today).
//
// The correct semantic combines:
//   a) They HAVE review history (not brand new) AND
//   b) Either: review is overdue AND lapses >= 1 (true decay) OR
//           : review is SEVERELY overdue (>= 2x scheduled interval past)
//
// Both /api/quiz/submit and /api/quiz/evaluate MUST call this helper.

export interface FsrsStateLike {
  due?: string | number | Date | null;
  last_review?: string | number | Date | null;
  lapses?: number | null;
  stability?: number | null;
  retrievability?: number | null;
}

export function isRetrievabilityLow(
  fsrsState: FsrsStateLike | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!fsrsState || typeof fsrsState !== 'object') return false;

  // If the engine computed retrievability directly, use it.
  const R = typeof fsrsState.retrievability === 'number' ? fsrsState.retrievability : null;
  if (R !== null && Number.isFinite(R)) {
    return R < 0.6;  // FSRS paper: retrievability < 60% = should review
  }

  // Otherwise compute from due/last_review/lapses.
  const due = toDate(fsrsState.due);
  const lastReview = toDate(fsrsState.last_review);
  const lapses = typeof fsrsState.lapses === 'number' ? Math.max(0, fsrsState.lapses) : 0;

  // No review history at all → they never knew it. Not "forgetting".
  if (!lastReview) return false;

  const nowMs = now.getTime();
  const scheduledIntervalMs = due && lastReview
    ? Math.max(0, due.getTime() - lastReview.getTime())
    : 0;
  const overdueByMs = due ? Math.max(0, nowMs - due.getTime()) : 0;

  const severelyOverdue = scheduledIntervalMs > 0
    ? overdueByMs > 2 * scheduledIntervalMs  // 2x the scheduled window past
    : overdueByMs > 1000 * 60 * 60 * 24 * 3;   // No schedule? >3 days late

  // Either severely overdue (pure decay), OR moderately overdue with at
  // least one prior lapse in history (proven pattern of decay).
  if (severelyOverdue) return true;
  if (overdueByMs > 0 && lapses >= 1) return true;

  return false;
}

function toDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null;
  if (typeof v === 'number') {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}
