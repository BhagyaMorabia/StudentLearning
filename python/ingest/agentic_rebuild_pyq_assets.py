"""Agentic, source-faithful recovery of PYQ question images.

The model never redraws educational content. It locates and critiques crops from
the original PDF; PyMuPDF renders the pixels. A complete question asset set is
promoted atomically only after machine checks and a separate visual review accept
the exact digest-bound evidence for every slot.
"""

from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import time

import fitz
from google import genai
from google.genai import types
from PIL import Image
import psycopg2
from psycopg2.extras import Json

from locate_pyq_assets_with_vision import (
    PDF_BY_SUBJECT,
    locate_assets,
    normalize_text,
    render_page_png,
    valid_asset,
)
from rebuild_pyq_assets_v2 import (
    candidate_pages,
    expected_keys,
    legacy_asset_map,
    load_questions,
    ranked_pages,
)


ROOT = Path(__file__).parent.parent.parent
PDF_DIR = ROOT / "python" / "data" / "PYQ Questions"
PUBLIC_DIR = ROOT / "public" / "diagrams"
WORK_DIR = ROOT / "python" / "data" / "asset_agent_v3"
CHECKPOINT_PATH = WORK_DIR / "checkpoint.json"

DATABASE_URL = os.getenv("PYTHON_DATABASE_URL") or os.getenv("DATABASE_URL")
VERTEX_PROJECT = os.getenv("VERTEX_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT") or "student-501106"
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION") or os.getenv("GOOGLE_CLOUD_LOCATION") or "global"
MODEL = os.getenv("GEMINI_ASSET_VERIFIER_MODEL") or "gemini-3.1-flash-lite"
CROP_VERSION = "pyq_asset_agent_v3"
MIN_PUBLISH_CONFIDENCE = 0.97

OPTION_LABEL_RE = re.compile(r"^\(?([a-d])(?:[.)])?$", re.IGNORECASE)
VISUAL_REFERENCE_RE = re.compile(
    r"\b(?:figure|diagram|graph|sketch|circuit|structure|shown)\b",
    re.IGNORECASE,
)
UNSAFE_ATTESTATION_RE = re.compile(
    r"\b(?:clip(?:ped|ping)?|cut(?:ting)?|missing|obscur(?:ed|ing)?|partial(?:ly)?|"
    r"wrong question|different question)\b",
    re.IGNORECASE,
)


CRITIC_INSTRUCTION = """
You are the visual QA and crop-repair agent for IIT-JEE source material.
You see the exact question, its options, the full original PDF page, and the
current source crops. You never solve, redraw, reinterpret, or generate a diagram.

For every required slot, inspect the source page and current crop. Return PASS only
when the crop contains the complete target asset and nothing from another option,
question, solution, answer key, or surrounding prose. Every axis, arrow, label,
dimension, circuit component, bond, curve, and option label must be complete with
visible whitespace around it.

Slot contracts are strict:
- QUESTION_DIAGRAM contains only the source diagram needed by the stem. It must not
  contain stem prose, exam year, question number, printed answer choices, or solution.
- OPTION_IMAGE contains exactly one genuinely visual answer option and its label. A
  text/LaTeX answer is not an image asset, and content from another question is fatal.
- Describe the visible crop in observedContent before deciding. Set
  assetMatchesQuestion false if its subject or quantities do not match the exact stem.
- Set containsProhibitedContent true for any neighboring option, prose, year, answer
  row, question number, answer key, solution text, or unrelated fragment.

The crop state may report sourceEdgeInkSides. For every slot return edgeStatus:
- CLEAR: no target content touches a crop boundary.
- SAFE_COMPLETE: content touches a boundary, but the entire symbol/line/glyph is
  visibly present and nothing is clipped. Use this only with very high confidence.
- CLIPPED: any target content is cut off or a neighboring fragment enters an edge.
For CLIPPED, return REVISE and expand the affected sides. If no rectangular crop
can include the complete target without a neighboring fragment, return REJECT.

If it is wrong, return REVISE with a corrected page-relative bbox. Pixel erasure is
not permitted: eraseRectsNorm must always be empty. If a rectangular source crop
cannot isolate the target without altering educational content, return REJECT.
Coordinates are [ymin, xmin, ymax, xmax] normalized 0..1000 against the full page.
Return one decision for every required slot. Use strict JSON and do not solve.
"""


def load_checkpoint() -> dict:
    if not CHECKPOINT_PATH.exists():
        return {"version": 4, "questions": {}}
    try:
        payload = json.loads(CHECKPOINT_PATH.read_text(encoding="utf-8"))
        if payload.get("version") in {3, 4}:
            payload["version"] = 4
            for entry in payload.get("questions", {}).values():
                if entry.get("status") == "VERIFIED":
                    entry["status"] = (
                        "LEGACY_COMMITTED" if entry.get("committed") else "MACHINE_VERIFIED"
                    )
            return payload
    except (OSError, json.JSONDecodeError):
        pass
    return {"version": 4, "questions": {}}


def save_checkpoint(payload: dict) -> None:
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    temporary = CHECKPOINT_PATH.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    temporary.replace(CHECKPOINT_PATH)


def question_fingerprint(question: dict) -> str:
    payload = {
        "id": str(question.get("id")),
        "questionText": question.get("question_text"),
        "options": question.get("options"),
        "subject": question.get("subject_name"),
        "chapter": question.get("chapter_name"),
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def manifest_digest(items: object, fingerprint: str) -> str | None:
    if not isinstance(items, list) or not items:
        return None
    evidence = []
    for item in items:
        if not isinstance(item, dict) or not isinstance(item.get("metadata"), dict):
            return None
        evidence.append({
            "key": item.get("key"),
            "asset": item.get("asset"),
            "tempPath": item.get("tempPath"),
            "sha256": item["metadata"].get("sha256"),
            "bboxNorm": item["metadata"].get("bboxNorm"),
            "width": item["metadata"].get("width"),
            "height": item["metadata"].get("height"),
            "eraseCount": item["metadata"].get("eraseCount"),
            "finalEdgeInkSides": item["metadata"].get("finalEdgeInkSides"),
            "pageIndex": item.get("pageIndex"),
            "sourcePdf": item.get("sourcePdf"),
            "finalConfidence": item.get("finalConfidence"),
        })
    encoded = json.dumps(
        {"questionFingerprint": fingerprint, "assets": sorted(evidence, key=lambda item: str(item["key"]))},
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    )
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def has_current_approval(entry: dict, fingerprint: str) -> bool:
    review = entry.get("review")
    digest = manifest_digest(entry.get("manifest"), fingerprint)
    return (
        entry.get("status") == "AGENT_APPROVED"
        and entry.get("questionFingerprint") == fingerprint
        and isinstance(review, dict)
        and review.get("decision") == "APPROVED"
        and review.get("manifestDigest") == digest
    )


def asset_key(asset_type: str, option_id: object = None) -> str:
    return (
        f"OPTION_IMAGE:{str(option_id).lower()}"
        if asset_type == "OPTION_IMAGE"
        else "QUESTION_DIAGRAM:__none__"
    )


def key_parts(key: str) -> tuple[str, str | None]:
    if key.startswith("OPTION_IMAGE:"):
        return "OPTION_IMAGE", key.rsplit(":", 1)[1]
    return "QUESTION_DIAGRAM", None


def has_displayable_option_text(option: object) -> bool:
    if not isinstance(option, dict):
        return False
    text = str(option.get("text") or "").strip()
    text = re.sub(r"!\[[^\]]*]\([^)]+\)", "", text).strip()
    return bool(text and text.lower() not in {"image", "figure", "diagram", "see figure"})


def authoritative_expected_keys(question: dict) -> set[str]:
    """Treat legacy image records as discovery hints, never as display truth."""
    hinted = expected_keys(question)
    keys = {key for key in hinted if key == "QUESTION_DIAGRAM:__none__"}
    options = question.get("options") if isinstance(question.get("options"), list) else []
    visual_option_ids = {
        str(option.get("id")).lower()
        for option in options
        if (
            isinstance(option, dict)
            and str(option.get("id", "")).lower() in {"a", "b", "c", "d"}
            and not has_displayable_option_text(option)
            and (
                option.get("imageUrl")
                or f"OPTION_IMAGE:{str(option.get('id')).lower()}" in hinted
            )
        )
    }
    if len(visual_option_ids) >= 2:
        visual_option_ids = {
            str(option.get("id")).lower()
            for option in options
            if isinstance(option, dict)
            and str(option.get("id", "")).lower() in {"a", "b", "c", "d"}
        }
    keys.update(f"OPTION_IMAGE:{option_id}" for option_id in visual_option_ids)

    question_text = str(question.get("question_text") or "")
    if "![" in question_text or (
        not visual_option_ids and VISUAL_REFERENCE_RE.search(question_text)
    ):
        keys.add("QUESTION_DIAGRAM:__none__")
    return keys


def valid_bbox(value: object) -> bool:
    if not isinstance(value, list) or len(value) != 4:
        return False
    try:
        ymin, xmin, ymax, xmax = [float(item) for item in value]
    except (TypeError, ValueError):
        return False
    return 0 <= ymin < ymax <= 1000 and 0 <= xmin < xmax <= 1000


def expand_bbox_edges(bbox: list[float], sides: list[str], amount: float = 24) -> list[float]:
    ymin, xmin, ymax, xmax = [float(item) for item in bbox]
    if "top" in sides:
        ymin = max(0, ymin - amount)
    if "left" in sides:
        xmin = max(0, xmin - amount)
    if "bottom" in sides:
        ymax = min(1000, ymax + amount)
    if "right" in sides:
        xmax = min(1000, xmax + amount)
    return [ymin, xmin, ymax, xmax]


def crop_rect(page: fitz.Page, bbox: list[float]) -> fitz.Rect:
    ymin, xmin, ymax, xmax = [float(item) for item in bbox]
    return fitz.Rect(
        xmin / 1000 * page.rect.width,
        ymin / 1000 * page.rect.height,
        xmax / 1000 * page.rect.width,
        ymax / 1000 * page.rect.height,
    )


def trim_answer_row_from_question_diagram(
    page: fitz.Page,
    bbox: list[float],
    question: dict,
) -> list[float]:
    """Remove a printed MCQ answer row accidentally included below a stem diagram."""
    options = question.get("options") if isinstance(question.get("options"), list) else []
    if len(options) < 2 or not all(has_displayable_option_text(option) for option in options):
        return bbox

    rect = crop_rect(page, bbox)
    labels: list[fitz.Rect] = []
    ids: set[str] = set()
    for word in page.get_text("words"):
        match = OPTION_LABEL_RE.fullmatch(str(word[4]).strip())
        word_rect = fitz.Rect(word[0], word[1], word[2], word[3])
        if match and rect.intersects(word_rect):
            ids.add(match.group(1).lower())
            labels.append(word_rect)
    if len(ids) < 2 or not labels:
        return bbox

    first_label_y = min(label.y0 for label in labels)
    if first_label_y <= rect.y0 + rect.height * 0.45:
        return bbox
    cutoff = max(rect.y0 + 8, first_label_y - 1)
    trimmed = list(map(float, bbox))
    trimmed[2] = cutoff / page.rect.height * 1000
    return trimmed if valid_bbox(trimmed) else bbox


def trim_stem_prose_from_question_diagram(
    page: fitz.Page,
    bbox: list[float],
    question: dict,
) -> list[float]:
    """Use the PDF text layer to keep source prose and year labels out of a diagram."""
    rect = crop_rect(page, bbox)
    question_tokens = set(normalize_text(str(question.get("question_text") or "")))
    prose_above: list[fitz.Rect] = []
    prose_below: list[fitz.Rect] = []
    vertical_midpoint = (rect.y0 + rect.y1) / 2
    for block in page.get_text("blocks"):
        block_rect = fitz.Rect(block[0], block[1], block[2], block[3])
        if not rect.intersects(block_rect):
            continue
        block_tokens = set(normalize_text(str(block[4])))
        if len(question_tokens.intersection(block_tokens)) >= 3:
            if block_rect.y1 <= vertical_midpoint:
                prose_above.append(block_rect)
            elif block_rect.y0 >= vertical_midpoint:
                prose_below.append(block_rect)

    trimmed = list(map(float, bbox))
    if prose_above:
        cutoff = max(block.y1 for block in prose_above) + 1
        if cutoff < rect.y1 - 12:
            trimmed[0] = cutoff / page.rect.height * 1000
    if prose_below:
        cutoff = min(block.y0 for block in prose_below) - 1
        if cutoff > rect.y0 + 12:
            trimmed[2] = cutoff / page.rect.height * 1000
    return trimmed if valid_bbox(trimmed) else bbox


def render_repaired_crop(
    page: fitz.Page,
    bbox: list[float],
    erase_rects: list[list[float]],
    destination: Path,
) -> dict | None:
    if erase_rects:
        return None
    rect = crop_rect(page, bbox)
    if rect.width < 8 or rect.height < 8:
        return None
    pix = page.get_pixmap(clip=rect, dpi=300, alpha=False)
    image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

    mask = image.convert("L").point(lambda value: 255 if value < 245 else 0)
    content = mask.getbbox()
    edge_sides: list[str] = []
    if content:
        left, top, right, bottom = content
        if left <= 1:
            edge_sides.append("left")
        if top <= 1:
            edge_sides.append("top")
        if right >= image.width - 1:
            edge_sides.append("right")
        if bottom >= image.height - 1:
            edge_sides.append("bottom")
    final_bbox = [float(item) for item in bbox]
    if content:
        left, top, right, bottom = content
        margin = 16
        left, top = max(0, left - margin), max(0, top - margin)
        right, bottom = min(image.width, right + margin), min(image.height, bottom + margin)
        ymin, xmin, ymax, xmax = final_bbox
        final_bbox = [
            ymin + top / image.height * (ymax - ymin),
            xmin + left / image.width * (xmax - xmin),
            ymin + bottom / image.height * (ymax - ymin),
            xmin + right / image.width * (xmax - xmin),
        ]
        image = image.crop((left, top, right, bottom))

    if image.width < 80 or image.height < 80:
        return None
    final_mask = image.convert("L").point(lambda value: 255 if value < 245 else 0)
    final_content = final_mask.getbbox()
    final_edge_sides: list[str] = []
    if final_content:
        left, top, right, bottom = final_content
        if left <= 1:
            final_edge_sides.append("left")
        if top <= 1:
            final_edge_sides.append("top")
        if right >= image.width - 1:
            final_edge_sides.append("right")
        if bottom >= image.height - 1:
            final_edge_sides.append("bottom")
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, format="PNG", optimize=True)
    data = destination.read_bytes()
    return {
        "width": image.width,
        "height": image.height,
        "sha256": hashlib.sha256(data).hexdigest(),
        "bboxNorm": final_bbox,
        "eraseCount": len(erase_rects),
        "sourceEdgeInkSides": edge_sides,
        "finalEdgeInkSides": final_edge_sides,
    }


def call_json_with_retry(callable_fn, retries: int = 3) -> dict:
    for attempt in range(retries):
        try:
            response = callable_fn()
            return json.loads(response.text or "{}")
        except Exception as error:
            if attempt + 1 >= retries:
                raise
            error_text = str(error)
            if "429" in error_text or "RESOURCE_EXHAUSTED" in error_text:
                if attempt >= 1:
                    raise
                time.sleep(20)
            else:
                time.sleep(2 ** attempt)
    raise RuntimeError("unreachable")


def critique(
    client: genai.Client,
    question: dict,
    page_png: bytes,
    page_index: int,
    required: set[str],
    states: dict[str, dict],
    rendered: dict[str, dict],
) -> dict:
    state_json = {
        key: {
            "bboxNorm": state.get("bboxNorm"),
            "eraseRectsNorm": state.get("eraseRectsNorm", []),
            "sourceEdgeInkSides": rendered.get(key, {}).get("metadata", {}).get("sourceEdgeInkSides", []),
            "finalEdgeInkSides": rendered.get(key, {}).get("metadata", {}).get("finalEdgeInkSides", []),
        }
        for key, state in states.items()
    }
    prompt = f"""
Question id: {question['id']}
PDF page index: {page_index}
Question text: {question['question_text']}
Options JSON: {json.dumps(question.get('options'))}
Required slots: {json.dumps(sorted(required))}
Current crop state: {json.dumps(state_json)}

The first image is the full original PDF page. Remaining images are current crops,
each preceded by its exact slot key. Return a decision for every required slot.
"""
    contents: list[object] = [prompt, types.Part.from_bytes(data=page_png, mime_type="image/png")]
    for key in sorted(rendered):
        contents.append(f"Current crop for {key}")
        contents.append(types.Part.from_bytes(data=rendered[key]["path"].read_bytes(), mime_type="image/png"))

    schema = {
        "type": "OBJECT",
        "properties": {
            "pageMatchesQuestion": {"type": "BOOLEAN"},
            "completeSet": {"type": "BOOLEAN"},
            "decisions": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "key": {"type": "STRING"},
                        "verdict": {"type": "STRING", "enum": ["PASS", "REVISE", "REJECT"]},
                        "bboxNorm": {"type": "ARRAY", "items": {"type": "NUMBER"}},
                        "eraseRectsNorm": {
                            "type": "ARRAY",
                            "items": {"type": "ARRAY", "items": {"type": "NUMBER"}},
                        },
                        "confidence": {"type": "NUMBER"},
                        "edgeStatus": {"type": "STRING", "enum": ["CLEAR", "SAFE_COMPLETE", "CLIPPED"]},
                        "assetMatchesQuestion": {"type": "BOOLEAN"},
                        "containsProhibitedContent": {"type": "BOOLEAN"},
                        "observedContent": {"type": "STRING"},
                        "reason": {"type": "STRING"},
                    },
                    "required": [
                        "key", "verdict", "bboxNorm", "eraseRectsNorm",
                        "confidence", "edgeStatus", "assetMatchesQuestion",
                        "containsProhibitedContent", "observedContent", "reason"
                    ],
                },
            },
        },
        "required": ["pageMatchesQuestion", "completeSet", "decisions"],
    }
    return call_json_with_retry(lambda: client.models.generate_content(
        model=MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=CRITIC_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=schema,
            temperature=0,
        ),
    ))


def run_page_agent(
    client: genai.Client,
    question: dict,
    page: fitz.Page,
    page_index: int,
    match_score: float,
    required: set[str],
    max_turns: int,
    threshold: float,
) -> tuple[list[dict] | None, list[dict]]:
    page_png = render_page_png(page)
    located = locate_assets(client, question, page_png, page_index, match_score, required)
    if located.get("pageIsCorrectQuestion") is not True:
        return None, [{"turn": "locate", "result": located}]

    states: dict[str, dict] = {}
    for asset in located.get("assets", []):
        if valid_asset(asset, 0.85):
            key = asset_key(asset["assetType"], asset.get("optionId"))
            if required and key not in required:
                continue
            states[key] = {
                "bboxNorm": asset["bboxNorm"],
                "eraseRectsNorm": [],
                "confidence": float(asset.get("confidence", 0)),
            }
    slots = set(required) or set(states)
    if not slots:
        return None, [{"turn": "locate", "result": located}]
    for key in slots:
        states.setdefault(key, {"bboxNorm": None, "eraseRectsNorm": [], "confidence": 0})

    trace: list[dict] = [{"turn": "locate", "result": located}]
    for turn in range(1, max_turns + 1):
        rendered: dict[str, dict] = {}
        for key, state in states.items():
            if not valid_bbox(state.get("bboxNorm")):
                continue
            if key == "QUESTION_DIAGRAM:__none__" and turn == 1:
                state["bboxNorm"] = trim_stem_prose_from_question_diagram(
                    page,
                    trim_answer_row_from_question_diagram(
                        page, state["bboxNorm"], question
                    ),
                    question,
                )
            path = (
                WORK_DIR
                / str(question["id"])
                / f"page_{page_index}"
                / f"{key.replace(':', '_')}.png"
            )
            metadata = render_repaired_crop(
                page,
                state["bboxNorm"],
                state.get("eraseRectsNorm", []),
                path,
            )
            if metadata:
                rendered[key] = {"path": path, "metadata": metadata}

        verdict = critique(client, question, page_png, page_index, slots, states, rendered)
        trace.append({"turn": turn, "result": verdict})
        decisions = {item.get("key"): item for item in verdict.get("decisions", [])}

        all_pass = verdict.get("pageMatchesQuestion") is True and verdict.get("completeSet") is True
        for key in slots:
            decision = decisions.get(key, {})
            edge_sides = rendered.get(key, {}).get("metadata", {}).get("finalEdgeInkSides", [])
            attestation = f"{decision.get('observedContent', '')} {decision.get('reason', '')}"
            all_pass = all_pass and (
                decision.get("verdict") == "PASS"
                and float(decision.get("confidence", 0)) >= threshold
                and decision.get("assetMatchesQuestion") is True
                and decision.get("containsProhibitedContent") is False
                and not UNSAFE_ATTESTATION_RE.search(attestation)
                and key in rendered
                and not edge_sides
                and rendered[key]["metadata"].get("eraseCount", 0) == 0
            )
        if all_pass:
            pending: list[dict] = []
            for key in sorted(slots):
                asset_type, option_id = key_parts(key)
                decision = decisions[key]
                pending.append({
                    "key": key,
                    "asset": {
                        "assetType": asset_type,
                        "optionId": option_id,
                        "bboxNorm": rendered[key]["metadata"]["bboxNorm"],
                        "confidence": float(decision["confidence"]),
                    },
                    "temp_path": rendered[key]["path"],
                    "metadata": rendered[key]["metadata"],
                    "page_index": page_index,
                    "source_pdf": PDF_BY_SUBJECT[question["subject_name"]],
                    "final_confidence": float(decision["confidence"]),
                })
            return pending, trace

        changed = False
        controller_actions: list[dict] = []
        for key in slots:
            decision = decisions.get(key, {})
            if decision.get("verdict") == "REVISE" and valid_bbox(decision.get("bboxNorm")):
                next_state = {
                    "bboxNorm": decision["bboxNorm"],
                    "eraseRectsNorm": [],
                    "confidence": float(decision.get("confidence", 0)),
                }
            else:
                edge_sides = rendered.get(key, {}).get("metadata", {}).get("finalEdgeInkSides", [])
                if not edge_sides or not valid_bbox(states[key].get("bboxNorm")):
                    continue
                expanded = expand_bbox_edges(states[key]["bboxNorm"], edge_sides)
                if expanded == states[key]["bboxNorm"]:
                    continue
                next_state = {
                    **states[key],
                    "bboxNorm": expanded,
                }
                controller_actions.append({
                    "key": key,
                    "action": "expand_source_edge",
                    "sides": edge_sides,
                    "bboxNorm": expanded,
                })
            changed = changed or next_state != states[key]
            states[key] = next_state
        if controller_actions:
            trace[-1]["controllerActions"] = controller_actions
        if not changed:
            break
    return None, trace


def destination_name(question_id: str, key: str, digest: str) -> str:
    suffix = "" if key.startswith("QUESTION_DIAGRAM") else f"_opt{key.rsplit(':', 1)[1]}"
    return f"pyq_{question_id}{suffix}_v3_{digest[:10]}.png"


def serialize_manifest(pending: list[dict]) -> list[dict]:
    return [
        {
            "key": item["key"],
            "asset": item["asset"],
            "tempPath": str(item["temp_path"].relative_to(ROOT)),
            "metadata": item["metadata"],
            "pageIndex": item["page_index"],
            "sourcePdf": item["source_pdf"],
            "finalConfidence": item["final_confidence"],
        }
        for item in pending
    ]


def load_manifest(items: object) -> list[dict] | None:
    if not isinstance(items, list) or not items:
        return None
    pending: list[dict] = []
    seen_keys: set[str] = set()
    root = ROOT.resolve()
    for item in items:
        if not isinstance(item, dict):
            return None
        key = item.get("key")
        asset = item.get("asset")
        if not isinstance(key, str) or key in seen_keys or not isinstance(asset, dict):
            return None
        asset_type = asset.get("assetType")
        option_id = asset.get("optionId")
        if asset_type not in {"QUESTION_DIAGRAM", "OPTION_IMAGE"}:
            return None
        if asset_type == "OPTION_IMAGE" and str(option_id).lower() not in {"a", "b", "c", "d"}:
            return None
        if key != asset_key(str(asset_type), option_id):
            return None
        seen_keys.add(key)
        path = (ROOT / str(item.get("tempPath", ""))).resolve()
        if not path.is_relative_to(root) or path.suffix.lower() != ".png":
            return None
        metadata = item.get("metadata")
        if not path.is_file() or not isinstance(metadata, dict):
            return None
        digest = metadata.get("sha256")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            return None
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            return None
        if metadata.get("eraseCount", 0) != 0:
            return None
        if metadata.get("finalEdgeInkSides"):
            return None
        if not valid_bbox(metadata.get("bboxNorm")):
            return None
        if not all(isinstance(metadata.get(field), int) and metadata[field] >= 80 for field in ("width", "height")):
            return None
        if not isinstance(item.get("pageIndex"), int) or item["pageIndex"] < 0:
            return None
        if item.get("sourcePdf") not in set(PDF_BY_SUBJECT.values()):
            return None
        confidence = item.get("finalConfidence")
        if not isinstance(confidence, (int, float)) or confidence < MIN_PUBLISH_CONFIDENCE:
            return None
        pending.append({
            "key": key,
            "asset": asset,
            "temp_path": path,
            "metadata": metadata,
            "page_index": item["pageIndex"],
            "source_pdf": item["sourcePdf"],
            "final_confidence": item["finalConfidence"],
        })
    return pending


def commit_assets(connection, question: dict, pending: list[dict], review: dict) -> None:
    copied: list[Path] = []
    temporary_files: list[Path] = []
    try:
        with connection.cursor() as cursor:
            # The verified manifest is the complete display contract for this question.
            # Replacing rows in one transaction prevents stale legacy options surviving.
            cursor.execute(
                """
                DELETE FROM question_assets
                WHERE question_id = %s
                  AND asset_type IN ('QUESTION_DIAGRAM', 'OPTION_IMAGE')
                """,
                (question["id"],),
            )
            for item in pending:
                metadata = item["metadata"]
                file_name = destination_name(str(question["id"]), item["key"], metadata["sha256"])
                destination = PUBLIC_DIR / file_name
                PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
                if destination.exists():
                    existing_hash = hashlib.sha256(destination.read_bytes()).hexdigest()
                    if existing_hash != metadata["sha256"]:
                        raise RuntimeError(f"Content-addressed destination is corrupt: {destination}")
                else:
                    temporary = destination.with_name(f".{destination.name}.{os.getpid()}.tmp")
                    shutil.copyfile(item["temp_path"], temporary)
                    temporary_files.append(temporary)
                    copied_hash = hashlib.sha256(temporary.read_bytes()).hexdigest()
                    if copied_hash != metadata["sha256"]:
                        raise RuntimeError(f"Published asset hash mismatch: {destination}")
                    temporary.replace(destination)
                    temporary_files.remove(temporary)
                    copied.append(destination)
                asset = item["asset"]
                flags = [
                    "agent_located",
                    "source_pdf_crop",
                    "agent_critic_verified",
                    "semantic_attestation",
                    "deterministic_edge_clear",
                    "text_layer_boundary_clean",
                    "agent_visual_reviewed",
                    f"reviewer:{review.get('reviewer', 'unknown')}",
                    f"review_digest:{str(review.get('manifestDigest', ''))[:16]}",
                ]
                if metadata.get("eraseCount", 0):
                    flags.append("neighbor_fragment_masked")
                cursor.execute(
                    """
                    INSERT INTO question_assets (
                      question_id, asset_type, option_id, image_url, storage_provider,
                      source_pdf, source_page, bbox_norm, width, height, sha256,
                      crop_method, crop_version, quality_score, quality_flags,
                      status, reviewed_at
                    ) VALUES (
                      %s, %s, %s, %s, 'local', %s, %s, %s, %s, %s, %s,
                      'agent_bbox_pymupdf_source_crop', %s, %s, %s, 'VERIFIED', now()
                    )
                    ON CONFLICT (question_id, asset_type, COALESCE(option_id, '__none__'))
                    DO UPDATE SET
                      image_url = EXCLUDED.image_url, source_pdf = EXCLUDED.source_pdf,
                      source_page = EXCLUDED.source_page, bbox_norm = EXCLUDED.bbox_norm,
                      width = EXCLUDED.width, height = EXCLUDED.height,
                      sha256 = EXCLUDED.sha256, crop_method = EXCLUDED.crop_method,
                      crop_version = EXCLUDED.crop_version, quality_score = EXCLUDED.quality_score,
                      quality_flags = EXCLUDED.quality_flags, status = 'VERIFIED', reviewed_at = now()
                    """,
                    (
                        question["id"], asset["assetType"], asset.get("optionId"),
                        f"/diagrams/{file_name}", item["source_pdf"], item["page_index"],
                        Json(asset["bboxNorm"]), metadata["width"], metadata["height"],
                        metadata["sha256"], CROP_VERSION, item["final_confidence"], Json(flags),
                    ),
                )
        connection.commit()
    except Exception:
        connection.rollback()
        for path in temporary_files:
            path.unlink(missing_ok=True)
        for path in copied:
            path.unlink(missing_ok=True)
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Agentically rebuild exact PYQ image assets from source PDFs.")
    parser.add_argument("--subject")
    parser.add_argument("--chapter")
    parser.add_argument("--question-id", action="append", default=[])
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--max-pages", type=int, default=3)
    parser.add_argument("--max-agent-turns", type=int, default=10)
    parser.add_argument("--verify-threshold", type=float, default=0.97)
    parser.add_argument("--commit", action="store_true", help="Publish only separately AGENT_APPROVED manifests; never calls Vertex AI.")
    parser.add_argument("--plan-only", action="store_true")
    parser.add_argument("--no-resume", action="store_true")
    parser.add_argument("--retry-needs-review", action="store_true")
    parser.add_argument("--force", action="store_true", help="Reprocess targeted questions even when checkpointed.")
    args = parser.parse_args()
    if args.commit and (args.force or args.no_resume or args.retry_needs_review):
        parser.error("--commit cannot be combined with verification/reset flags")

    checkpoint = {"version": 4, "questions": {}} if args.no_resume else load_checkpoint()
    legacy = legacy_asset_map()
    all_questions = load_questions(legacy, args.subject, args.chapter, args.question_id, 0)
    questions = all_questions
    if not args.force and not args.commit:
        terminal_statuses = {"MACHINE_VERIFIED", "AGENT_APPROVED", "LEGACY_COMMITTED"}
        deferred_statuses = {"NEEDS_REVIEW", "REJECTED"}
        questions = [
            question
            for question in questions
            if checkpoint["questions"].get(str(question["id"]), {}).get("status") not in terminal_statuses
            and (
                args.retry_needs_review
                or checkpoint["questions"].get(str(question["id"]), {}).get("status") not in deferred_statuses
            )
        ]
    if args.limit > 0:
        questions = questions[:args.limit]
    print(json.dumps({
        "model": MODEL,
        "questionsTargeted": len(questions),
        "questionsMatched": len(all_questions),
        "bySubject": dict(Counter(question["subject_name"] for question in questions)),
        "mode": "commit" if args.commit else "verification-only",
        "agentTurns": args.max_agent_turns,
    }, indent=2))
    if args.plan_only:
        return

    client = None if args.commit else genai.Client(vertexai=True, project=VERTEX_PROJECT, location=VERTEX_LOCATION)
    connection = psycopg2.connect(DATABASE_URL, connect_timeout=15) if args.commit else None
    documents: dict[str, fitz.Document] = {}
    page_words: dict[str, list[list[str]]] = {}
    summary = {
        "seen": 0,
        "machineVerified": 0,
        "committed": 0,
        "reviewRequired": 0,
        "needsReview": 0,
        "retryPending": 0,
        "errors": 0,
        "resumed": 0,
    }

    try:
        for question in questions:
            question_id = str(question["id"])
            summary["seen"] += 1
            previous = checkpoint["questions"].get(question_id, {})
            fingerprint = question_fingerprint(question)

            if args.commit:
                if not has_current_approval(previous, fingerprint):
                    summary["reviewRequired"] += 1
                    print(json.dumps({"questionId": question_id, "status": "REVIEW_REQUIRED"}), flush=True)
                    continue
                cached_pending = load_manifest(previous.get("manifest"))
                if not cached_pending:
                    summary["errors"] += 1
                    print(json.dumps({"questionId": question_id, "status": "INVALID_APPROVED_MANIFEST"}), flush=True)
                    continue
                try:
                    commit_assets(connection, question, cached_pending, previous["review"])
                    previous["committed"] = True
                    previous["committedAt"] = time.time()
                    previous["updatedAt"] = time.time()
                    checkpoint["questions"][question_id] = previous
                    save_checkpoint(checkpoint)
                    summary["committed"] += 1
                    print(json.dumps({"questionId": question_id, "status": "COMMITTED"}), flush=True)
                except Exception as error:
                    previous.setdefault("trace", []).append({"commitError": str(error)})
                    summary["errors"] += 1
                    save_checkpoint(checkpoint)
                    print(json.dumps({"questionId": question_id, "status": "COMMIT_ERROR"}), flush=True)
                continue

            if not args.force and previous.get("status") in {
                "MACHINE_VERIFIED", "AGENT_APPROVED", "LEGACY_COMMITTED"
            }:
                summary["resumed"] += 1
                continue
            if not args.force and previous.get("status") in {"NEEDS_REVIEW", "REJECTED"} and not args.retry_needs_review:
                summary["resumed"] += 1
                continue

            trace: list[dict] = []
            manifest: list[dict] | None = None
            try:
                source_pdf = PDF_BY_SUBJECT[question["subject_name"]]
                if source_pdf not in documents:
                    documents[source_pdf] = fitz.open(PDF_DIR / source_pdf)
                    page_words[source_pdf] = [normalize_text(page.get_text("text")) for page in documents[source_pdf]]
                document = documents[source_pdf]
                ranking = ranked_pages(question["question_text"], page_words[source_pdf])
                pages = candidate_pages(question, ranking, document.page_count, args.max_pages)
                required = authoritative_expected_keys(question)
                pending = None
                for page_index, match_score in pages:
                    pending, page_trace = run_page_agent(
                        client, question, document[page_index], page_index, match_score,
                        required, args.max_agent_turns, args.verify_threshold,
                    )
                    trace.extend({"pageIndex": page_index, **entry} for entry in page_trace)
                    if pending:
                        break
                status = "MACHINE_VERIFIED" if pending else "NEEDS_REVIEW"
                if pending:
                    summary["machineVerified"] += 1
                    manifest = serialize_manifest(pending)
                else:
                    summary["needsReview"] += 1
            except Exception as error:
                error_text = str(error)
                quota_exhausted = "429" in error_text or "RESOURCE_EXHAUSTED" in error_text
                status = "RETRY_PENDING" if quota_exhausted else "ERROR"
                trace.append({"error": str(error)})
                if quota_exhausted:
                    summary["retryPending"] += 1
                else:
                    summary["errors"] += 1

            checkpoint["questions"][question_id] = {
                "status": status,
                "committed": False,
                "subject": question["subject_name"],
                "chapter": question["chapter_name"],
                "questionFingerprint": fingerprint,
                "updatedAt": time.time(),
                "trace": trace,
                "manifest": manifest,
                "review": None,
            }
            save_checkpoint(checkpoint)
            print(json.dumps({"questionId": question_id, "status": status}), flush=True)
            if status == "RETRY_PENDING":
                print(json.dumps({"batchStatus": "HALTED_ON_QUOTA", "resumeSafe": True}), flush=True)
                break
    finally:
        if connection:
            connection.close()
        for document in documents.values():
            document.close()

    print(json.dumps(summary, indent=2))
    print(f"Checkpoint: {CHECKPOINT_PATH}")


if __name__ == "__main__":
    main()
