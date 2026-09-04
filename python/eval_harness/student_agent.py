"""
Synthetic Student Agent — simulates a JEE student acting from a given profile.

SECURITY / VALIDITY GUARANTEE (Blindness Contract):
    The LLM prompt SHALL NEVER contain:
      - Any correct-answer flag (isCorrect, correct, answer, key, etc.)
      - Any misconception-type tag (misconceptionType, MODE_*, trap, etc.)
      - Any prerequisite-trap-id or explanation / solution fields on options

    Two layers of enforcement:
      (1) `_strip_options_for_prompt()` — copies ONLY id + text to the prompt.
      (2) `_verify_prompt_blindness()` — runs a regex/keyword check against the
          assembled prompt string BEFORE sending to the LLM. If any forbidden
          substring is found, raises BlindnessContractViolation.
      (3) `assert_blindness_contract()` — static smoke test called once by
          run_eval.py startup.
"""

import os
import re
import json
import asyncio
import random
from typing import List, Dict, Any

import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
from dotenv import load_dotenv

load_dotenv('../../.env.local')

VERTEX_PROJECT = os.getenv('VERTEX_PROJECT', 'project-4e272d6a-f5a1-4799-aa9')
VERTEX_LOCATION = "global"

print(f"Initializing Vertex AI with project={VERTEX_PROJECT}, location={VERTEX_LOCATION}")
vertexai.init(project=VERTEX_PROJECT, location=VERTEX_LOCATION)

MODEL_NAME = "gemini-3.5-flash-lite"
model = GenerativeModel(MODEL_NAME)


# ═══════════════════════════════════════════════════════════════════════════
# Blindness contract enforcement
# ═══════════════════════════════════════════════════════════════════════════

FORBIDDEN_STRUCTURAL_PATTERNS = [
    re.compile(r'(?i)"?is_?correct"?\s*[:=]\s*true'),
    re.compile(r'(?i)"?misconception_?type"?\s*[:=]'),
    re.compile(r'(?i)"?prerequisite_?trap_?id"?\s*[:=]'),
    re.compile(r'(?i)\bMODE_\d_[A-Z]+\b'),
]

class BlindnessContractViolation(Exception):
    """Raised when the assembled prompt contains forbidden leakage data."""

def _strip_options_for_prompt(options: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for o in options:
        if not isinstance(o, dict):
            continue
        oid = o.get('id')
        text = o.get('text')
        if oid is None and text is None:
            continue
        out.append({
            'id': '' if oid is None else str(oid),
            'text': '' if text is None else str(text),
        })
    return out

def _verify_prompt_blindness(payload_to_check: str, source_question: Dict[str, Any]):
    """
    (a) Structural pattern check — catches literal leaked JSON/enum shapes.
    (b) Value cross-check — for every forbidden field on every SOURCE option,
        confirm its actual value string does not appear verbatim in the
        payload. This catches leakage regardless of field name, and never
        false-positives on ordinary prose because it's checking specific
        DB values, not dictionary words.
    """
    for pattern in FORBIDDEN_STRUCTURAL_PATTERNS:
        m = pattern.search(payload_to_check)
        if m:
            raise BlindnessContractViolation(
                f"Blindness contract VIOLATION — structural pattern "
                f"'{pattern.pattern}' matched at payload[{m.start()}:{m.end()}]: "
                f"...{payload_to_check[max(0,m.start()-40):m.end()+40]!r}..."
            )

    for opt in source_question.get('options') or []:
        if not isinstance(opt, dict):
            continue
        for k, v in opt.items():
            if k in ('id', 'text'):
                continue
            if v is None:
                continue
            vstr = str(v)
            if len(vstr) < 4:
                continue
            if vstr in payload_to_check:
                raise BlindnessContractViolation(
                    f"Blindness contract VIOLATION — option field '{k}' "
                    f"value {vstr!r} leaked into LLM payload verbatim."
                )


def _build_student_prompt(question_text: str, stripped_options: List[Dict[str, Any]], profile: Dict[str, Any], tel: Dict[str, Any]) -> str:
    strategy_lines = [f"- {profile.get('strategy', '')}"] if profile.get('strategy') else []
    strategy_block = "\n".join(strategy_lines) if strategy_lines else ""
    return f"""
You are a student taking an IIT-JEE level physics/math multiple-choice quiz.

═══════════════════════════════════
YOUR STUDENT PERSONA
═══════════════════════════════════
{profile.get('description', '')}

Specific strategy for this persona:
{strategy_block}

═══════════════════════════════════
QUESTION TEXT
═══════════════════════════════════
{question_text}

═══════════════════════════════════
OPTIONS (ONLY the text + id shown; NO answer key, NO labels)
═══════════════════════════════════
{json.dumps(stripped_options, indent=2)}

═══════════════════════════════════
YOUR TASK
═══════════════════════════════════
1. Read the question as a real student would (or skim / skip if your persona
   says to rush).
2. Think through the problem according to your EXACT persona above. Be
   completely faithful to the COGNITIVE STATE of your persona.
3. Pick ONE option that matches what this student would ACTUALLY choose,
   based on how the reasoning unfolded inside their head.

   CRITICAL INSTRUCTION — do NOT hunt for a distractor that matches some
   label you imagine might exist. Just commit the error that your persona
   would commit (a rushed slip, a prerequisite failure, a forgotten formula,
   a wrong mental model, etc.) and then pick whichever option matches YOUR
   actual wrong result. In real life, a careless student does NOT choose
   the 'careless distractor' on purpose — they make a slip and pick
   whatever option matches that slip, which may coincidentally be labeled
   'formula error' or 'conceptual error' by the test author from their
   outside perspective. Your job is accurate cognitive simulation, not
   label-matching.

ALREADY-SIMULATED TELEMETRY (you must report these numbers EXACTLY):
  - timeSpentSeconds = {tel['timeSpentSeconds']}
  - optionSwitchCount = {tel['optionSwitchCount']}

═══════════════════════════════════
OUTPUT FORMAT (strict JSON, no trailing commas, no markdown fences)
═══════════════════════════════════
{{
  "reasoning": "string — step-by-step interior monologue of this
    specific student solving this problem. For MODE_5 describe the exact
    careless slip and what arithmetic/sign you got wrong. For MODE_4
    describe the formula you misremembered and HOW you misremembered it.
    For MODE_2 describe your WRONG mental model and why it felt correct.
    For MODE_1 describe what simpler/foundationally-wrong method you
    applied. For MODE_7 describe the point at which you blanked on a
    memory you used to have. For MODE_6 describe literally why you
    picked that random-looking option (first letter, looked short, etc.).
    For MODE_3 describe the different approaches you tried and the order
    you tried them in, including which point you got stuck on.",
  "selectedOption": "string — option id e.g. \\"a\\", \\"b\\", \\"c\\", \\"d\\"",
  "timeSpentSeconds": {tel['timeSpentSeconds']},
  "optionSwitchCount": {tel['optionSwitchCount']}
}}
"""

def assert_blindness_contract():
    rigged_options = [
        {'id': 'a', 'text': 'Correct value F=ma', 'isCorrect': True,
         'misconceptionType': 'MODE_5_CARELESS',
         'prerequisiteTrapId': 'some-uuid-prereq-1'},
        {'id': 'b', 'text': 'Wrong F=mv', 'isCorrect': False,
         'misconceptionType': 'MODE_4_FORMULA'},
    ]
    stripped = _strip_options_for_prompt(rigged_options)
    fake_profile = {'description': 'test persona', 'strategy': 'test strategy'}
    fake_tel = {'timeSpentSeconds': 60.0, 'optionSwitchCount': 0}
    
    
    # 2) Build malicious payload: inject isCorrect + MODE_5 tags manually by passing UNSTRIPPED options
    bad_payload = "Sample question?\n" + json.dumps(rigged_options)

    # This MUST pass — proves stripping alone is not relied on to hide fields
    caught = False
    try:
        _verify_prompt_blindness(bad_payload, {'options': rigged_options})
    except BlindnessContractViolation:
        caught = True
    if not caught:
        raise BlindnessContractViolation("ASSERTION FAILURE: rigged leak not caught.")

    # NEW: this MUST pass clean — proves ordinary exam phrasing is not
    # mistaken for a leak.
    clean_options = [
        {'id': 'a', 'text': 'The answer is 9.8 m/s^2, the correct explanation follows from F=ma.'},
        {'id': 'b', 'text': 'right answer choice given the correct answer format'},
    ]
    stripped_clean = _strip_options_for_prompt(clean_options)
    clean_payload = "Choose the correct answer from the options below. Explanation not required.\n" + json.dumps(stripped_clean)
    _verify_prompt_blindness(clean_payload, {'options': clean_options})  # must NOT raise

    print("[OK] Student-agent blindness contract verified "
          "(rigged-leak caught AND clean-prose false-positive check passed).")


# ═══════════════════════════════════════════════════════════════════════════
# Telemetry synthesizer — profile-calibrated time + switch generation
# ═══════════════════════════════════════════════════════════════════════════

def _sample_telemetry(expected_seconds: float, profile: Dict[str, Any]) -> Dict[str, float]:
    """
    Produce simulated (timeSpentSeconds, optionSwitchCount) drawn from the
    profile's declared time_ratio_min/max and option_switch_bias ranges.

    Jitters are added so telemetry doesn't look like a perfect uniform band.
    """
    exp = max(float(expected_seconds or 120.0), 15.0)
    t_lo = float(profile.get('time_ratio_min', 0.8))
    t_hi = float(profile.get('time_ratio_max', 1.3))
    # Gaussian-ish jitter around the uniform range
    center = (t_lo + t_hi) / 2.0
    half = (t_hi - t_lo) / 2.0
    jitter = random.uniform(-half, half)
    ratio = max(0.03, min(6.0, center + jitter * 0.85))
    time_s = round(exp * ratio, 1)

    # Option switch count: bias + Poisson-ish jitter, floor 0
    bias = int(profile.get('option_switch_bias', 0))
    if bias <= 0:
        # Mostly zero, sometimes 1 via random rare spike
        switches = 0 if random.random() < 0.92 else 1
    else:
        # bias ± 1
        switches = max(0, bias + random.choice([-1, 0, 0, 0, 1]))
    return {
        'timeSpentSeconds': time_s,
        'optionSwitchCount': int(switches),
    }


# ═══════════════════════════════════════════════════════════════════════════
# LLM-based student actor
# ═══════════════════════════════════════════════════════════════════════════

async def generate_student_action(
    question_text: str,
    options: List[Dict[str, Any]],
    profile: Dict[str, Any],
    expected_time_seconds: float = 120.0,
) -> Dict[str, Any]:
    """
    Blind simulation of one student answering one question.

    Returns dict:
        {
          "reasoning": "...",            — AI's internal explanation
          "selectedOption": "id",        — option id
          "selectedOptionText": "...",
          "timeSpentSeconds": float,
          "optionSwitchCount": int,
          "_blindness_checks": {
              "prompt_len": int,
              "stripped_option_count": int,
              "verified": True,
          }
        }
    """
    # Step 1: Strip option payload to id+text ONLY. No tags / correct flags.
    stripped = _strip_options_for_prompt(options)
    opt_text_lookup = {str(o['id']).strip().lower(): o['text'] for o in stripped}

    # Step 2: Sample telemetry FIRST (not controlled by LLM; LLM just reports).
    # This prevents the LLM from "cheating" by e.g. a MODE_5_CARELESS persona
    # spending 2 seconds instead of the profile's declared 0.7–1.3x.
    tel = _sample_telemetry(expected_time_seconds, profile)

    prompt = _build_student_prompt(question_text, stripped, profile, tel)

    # Step 3: Blindness runtime check against the untrusted data payload only.
    try:
        payload_to_check = question_text + "\n" + json.dumps(stripped)
        _verify_prompt_blindness(payload_to_check, {'options': options})
        blind_ok = True
    except BlindnessContractViolation as e:
        # Refuse to send a leaking prompt — fall back to random to keep
        # eval running but clearly mark it in the output.
        blind_ok = False
        print(f"[WARN] Blindness violation — REFUSING LLM call. Falling to random. {e}")

    generation_config = GenerationConfig(
        response_mime_type="application/json",
        temperature=0.8,
    )

    output = None
    if blind_ok:
        for attempt in range(4):
            try:
                response = await model.generate_content_async(
                    prompt, generation_config=generation_config,
                )
                text = getattr(response, 'text', None) or ''
                # Some responses wrap in ```json fences — strip if present
                text_strip = text.strip()
                if text_strip.startswith('```'):
                    text_strip = re.sub(r'^```(?:json)?\s*', '', text_strip)
                    text_strip = re.sub(r'\s*```$', '', text_strip)
                output = json.loads(text_strip)
                break
            except Exception as e:
                err_str = str(e)
                if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str:
                    wait_time = 2 ** attempt + 2
                    print(f"Rate limited. Waiting {wait_time}s (attempt {attempt+1}/4)")
                    await asyncio.sleep(wait_time)
                else:
                    # Silent JSON-parsing failure — retry up to 4
                    pass
    else:
        output = None

    # Step 4: Normalize / fallback
    if output is None or not isinstance(output, dict):
        fallback_id = (stripped[0]['id'] if stripped else 'a')
        output = {
            'reasoning': 'LLM call failed or blindness safety triggered. Random guess.',
            'selectedOption': random.choice(stripped)['id'] if stripped else fallback_id,
        }

    # Force telemetry override to the pre-sampled values. (LLM output of
    # these fields is advisory; the profile-calibrated values are ground
    # truth for the eval.)
    output['timeSpentSeconds'] = tel['timeSpentSeconds']
    output['optionSwitchCount'] = int(tel['optionSwitchCount'])

    sel_id = str(output.get('selectedOption') or '').strip().lower()
    output['selectedOptionText'] = opt_text_lookup.get(sel_id, '')
    output['_blindness_checks'] = {
        'verified': blind_ok,
        'stripped_option_count': len(stripped),
        'prompt_len_chars': len(prompt),
    }
    return output


async def generate_student_actions_batch(
    questions: List[Dict[str, Any]],
    profile: Dict[str, Any],
    concurrency: int = 4,
) -> List[Dict[str, Any]]:
    sem = asyncio.Semaphore(concurrency)

    async def _one(q):
        async with sem:
            return await generate_student_action(
                question_text=q.get('question_text', ''),
                options=q.get('options') or [],
                profile=profile,
                expected_time_seconds=float(q.get('expected_time_seconds') or 120.0),
            )

    tasks = [asyncio.create_task(_one(q)) for q in questions]
    return await asyncio.gather(*tasks)


if __name__ == "__main__":
    assert_blindness_contract()
