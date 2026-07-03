"""Convert uploaded chord-chart images or PDFs into editor-compatible song JSON."""

import base64
import json
import mimetypes
import os
import re
import urllib.error
import urllib.request


OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
NVIDIA_CHAT_URL = "{base_url}/chat/completions"
GEMINI_GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
DEFAULT_VISION_MODEL = "gemini-2.0-flash"
DEFAULT_NVIDIA_MODEL = "meta/llama-3.2-11b-vision-instruct"
MAX_IMPORT_BYTES = 20 * 1024 * 1024
ALLOWED_IMPORT_TYPES = {"image/png", "image/jpeg", "image/webp", "application/pdf"}


VISION_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title", "title_karen", "category", "key", "style", "tempo", "confidence", "warnings", "sections"],
    "properties": {
        "title": {"type": "string"},
        "title_karen": {"type": "string"},
        "category": {"type": "string"},
        "key": {"type": "string"},
        "style": {"type": "string"},
        "tempo": {"type": "string"},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "warnings": {"type": "array", "items": {"type": "string"}},
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["type", "measures"],
                "properties": {
                    "type": {"type": "string"},
                    "measures": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["beats"],
                            "properties": {
                                "beats": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["chord", "bass", "circle", "x_marks", "dot"],
                                        "properties": {
                                            "chord": {"type": "string"},
                                            "bass": {"type": "string"},
                                            "circle": {"type": "boolean"},
                                            "x_marks": {"type": "integer", "minimum": 0, "maximum": 4},
                                            "dot": {"type": "boolean"},
                                        },
                                    },
                                }
                            },
                        },
                    },
                },
            },
        },
    },
}


SYSTEM_PROMPT = """You transcribe a photographed or PDF chord chart into structured data for a music director.
Preserve the visible section order, measure order, beat positions, chord spellings, circle marks, bass notes, dots, and x marks.
Use one beat object per visible beat position. Use an empty chord when the chart shows no new chord on that beat.
Never invent unreadable content. Add a concise warning for uncertainty and lower confidence.
Section names should be concise, such as Intro, Verse, Pre-Chorus, Chorus, Bridge, Solo, or Ending.
Return only the requested structured output."""


def _media_type(filename, supplied_type):
    guessed = mimetypes.guess_type(filename or "")[0]
    return (supplied_type or guessed or "").lower().split(";", 1)[0]


def _input_part(filename, media_type, file_bytes):
    encoded = base64.b64encode(file_bytes).decode("ascii")
    if media_type == "application/pdf":
        return {
            "type": "input_file",
            "filename": filename or "chord-chart.pdf",
            "file_data": f"data:application/pdf;base64,{encoded}",
        }
    return {
        "type": "input_image",
        "image_url": f"data:{media_type};base64,{encoded}",
        "detail": "high",
    }


def _extract_output_text(response):
    if isinstance(response.get("output_text"), str):
        return response["output_text"]
    for item in response.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text" and isinstance(content.get("text"), str):
                return content["text"]
    raise ValueError("The vision response did not contain structured text.")


def _extract_chat_text(response):
    choices = response.get("choices", [])
    if not choices:
        raise ValueError("The vision response did not contain chat choices.")
    message = choices[0].get("message", {})
    content = message.get("content", "")
    if isinstance(content, str) and content.strip():
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict) and isinstance(part.get("text"), str):
                parts.append(part["text"])
        if parts:
            return "".join(parts)
    raise ValueError("The vision response did not contain structured text.")


def _parse_chord(symbol):
    text = str(symbol or "").strip().replace("♭", "b").replace("♯", "#")
    if not text:
        return {"root": "", "flat": False, "minor": False, "triangle": False, "seven": False}
    match = re.match(r"^([A-Ga-g])([b#]?)(.*)$", text)
    if not match:
        return {"root": "", "flat": False, "minor": False, "triangle": False, "seven": False, "quality": text}
    root, accidental, quality = match.groups()
    quality_lower = quality.lower()
    return {
        "root": root.upper() + ("#" if accidental == "#" else ""),
        "flat": accidental == "b",
        "minor": quality_lower.startswith("m") and not quality_lower.startswith("maj"),
        "triangle": "maj" in quality_lower or "Δ" in quality,
        "seven": "7" in quality,
        "quality": re.sub(r"^(m|maj|Δ)?7?", "", quality, flags=re.IGNORECASE),
    }


def normalize_vision_song(extracted):
    sections = []
    inferred_beats = 4
    for raw_section in extracted.get("sections", []):
        measures = []
        for raw_measure in raw_section.get("measures", []):
            raw_beats = raw_measure.get("beats", [])
            if raw_beats:
                inferred_beats = 3 if len(raw_beats) == 3 else 4
            beats = []
            for raw_beat in raw_beats:
                chord_state = _parse_chord(raw_beat.get("chord"))
                beats.append({
                    "bass": str(raw_beat.get("bass") or ""),
                    "chordState": chord_state,
                    "circle": bool(raw_beat.get("circle")),
                    "dot": bool(raw_beat.get("dot")),
                    "editStack": ["root"] if chord_state.get("root") else [],
                    "lead": [],
                    "manualUnderline": False,
                    "roll": False,
                    "xMarks": max(0, min(4, int(raw_beat.get("x_marks") or 0))),
                })
            while len(beats) < inferred_beats:
                beats.append({
                    "bass": "", "chordState": _parse_chord(""), "circle": False,
                    "dot": False, "editStack": [], "lead": [], "manualUnderline": False,
                    "roll": False, "xMarks": 0,
                })
            measures.append({"beats": beats, "forceUnderline": False, "isEndingBar": False, "roll": False})
        if measures:
            sections.append({"type": str(raw_section.get("type") or "Verse"), "measures": measures})

    key = str(extracted.get("key") or "")
    return {
        "title": str(extracted.get("title") or "Imported Chord Chart"),
        "title_karen": str(extracted.get("title_karen") or ""),
        "category": str(extracted.get("category") or ""),
        "key": key,
        "current_key": key,
        "original_key": key,
        "style": str(extracted.get("style") or ""),
        "tempo": str(extracted.get("tempo") or ""),
        "notes": "Imported from image/PDF. Review all measures before saving.",
        "chart_json": {
            "sections": sections,
            "onlySpans": [],
            "slurs": [],
            "lyricsSections": [],
            "beatsPerMeasure": inferred_beats,
            "defaultMeasuresPerRow": 4,
            "rowDefaultExplicit": False,
        },
        "row_lead_json": {},
        "performed_dates": [],
        "reference_media": {"videos": [], "images": [], "info": ""},
        "file_metadata": [],
        "confidence": float(extracted.get("confidence") or 0),
        "warnings": [str(value) for value in extracted.get("warnings", [])],
    }


def parse_ocr_text(text):
    lines = [line.strip() for line in re.split(r"[\r\n]+", text or "") if line.strip()]
    title = lines[0] if lines else "Imported Chord Chart"
    karen_title = ""
    current_key = ""
    original_key = ""
    tempo = ""
    category = ""
    style = ""
    warnings = []
    sections = []
    section = None
    for line in lines[1:]:
        header = re.match(r"^(intro|verse|pre[- ]?chorus|chorus|bridge|solo|ending)\b[:\-\s]*(.*)$", line, re.I)
        if header:
            if section:
                sections.append(section)
            section = {"type": header.group(1).title().replace("Pre Chorus", "Pre-Chorus"), "measures": [{"beats": [{"chord": "", "bass": "", "circle": False, "x_marks": 0, "dot": False} for _ in range(4)]}]}
            continue
        if "karen" in line.lower() and not karen_title:
            karen_title = line
        if key_match := re.search(r"\b(?:key|current key|original key)\s*[:=]\s*([A-G][b#]?)", line, re.I):
            if "original" in line.lower():
                original_key = key_match.group(1)
            else:
                current_key = key_match.group(1)
        if tempo_match := re.search(r"\b(?:tempo|bpm)\s*[:=]\s*(\d{2,3})", line, re.I):
            tempo = tempo_match.group(1)
    if section:
        sections.append(section)
    return {
        "title": title,
        "title_karen": karen_title,
        "category": category,
        "key": current_key or original_key,
        "current_key": current_key or original_key,
        "original_key": original_key or current_key,
        "style": style,
        "tempo": tempo,
        "confidence": 0.45,
        "warnings": warnings or ["Text imported from OCR should be reviewed."],
        "sections": sections or [{"type": "Verse", "measures": []}],
    }


def interpret_chart_upload(filename, supplied_type, file_bytes, api_key=None):
    if not file_bytes:
        raise ValueError("The selected import file is empty.")
    if len(file_bytes) > MAX_IMPORT_BYTES:
        raise ValueError("The selected file is larger than 20 MB.")
    media_type = _media_type(filename, supplied_type)
    if media_type not in ALLOWED_IMPORT_TYPES:
        raise ValueError("Import a PNG, JPG, WEBP, or PDF chord chart.")
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    nvidia_key = os.environ.get("NVIDIA_API_KEY", "")
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if api_key and not gemini_key and not nvidia_key and not openai_key:
        openai_key = api_key
    if not gemini_key and not nvidia_key and not openai_key:
        raise RuntimeError("Configure GEMINI_API_KEY, NVIDIA_API_KEY, or OPENAI_API_KEY for image import.")

    if gemini_key:
        payload = {
            "contents": [{
                "role": "user",
                "parts": [
                    {"text": SYSTEM_PROMPT + "\nReturn only JSON."},
                    {"inlineData": {"mimeType": media_type, "data": base64.b64encode(file_bytes).decode("ascii")}},
                ],
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "object",
                    "required": ["title", "title_karen", "category", "key", "style", "tempo", "confidence", "warnings", "sections"],
                    "properties": {
                        "title": {"type": "string"},
                        "title_karen": {"type": "string"},
                        "category": {"type": "string"},
                        "key": {"type": "string"},
                        "style": {"type": "string"},
                        "tempo": {"type": "string"},
                        "confidence": {"type": "number"},
                        "warnings": {"type": "array", "items": {"type": "string"}},
                        "sections": {"type": "array"},
                    },
                },
            },
        }
        request = urllib.request.Request(
            GEMINI_GENERATE_URL.format(model=os.environ.get("GEMINI_VISION_MODEL", DEFAULT_VISION_MODEL), key=gemini_key),
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                result = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Gemini image import failed ({exc.code}): {detail[:500]}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Gemini image import could not connect: {exc.reason}") from exc
        candidates = result.get("candidates", [])
        text = ""
        for candidate in candidates:
            for part in candidate.get("content", {}).get("parts", []):
                if isinstance(part.get("text"), str):
                    text = part["text"]
                    break
            if text:
                break
        extracted = json.loads(text or "{}")
    elif nvidia_key:
        payload = {
            "model": os.environ.get("NVIDIA_VISION_MODEL", DEFAULT_NVIDIA_MODEL),
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": SYSTEM_PROMPT + "\nReturn only JSON."},
                    _input_part(filename, media_type, file_bytes),
                ],
            }],
            "temperature": 0.2,
        }
        nvidia_base_url = os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1").rstrip("/")
        request = urllib.request.Request(
            NVIDIA_CHAT_URL.format(base_url=nvidia_base_url),
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization": f"Bearer {nvidia_key}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                result = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"NVIDIA image import failed ({exc.code}): {detail[:500]}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"NVIDIA image import could not connect: {exc.reason}") from exc
        extracted = json.loads(_extract_chat_text(result))
    else:
        payload = {
            "model": os.environ.get("OPENAI_VISION_MODEL", DEFAULT_VISION_MODEL),
            "input": [{
                "role": "user",
                "content": [
                    {"type": "input_text", "text": SYSTEM_PROMPT},
                    _input_part(filename, media_type, file_bytes),
                ],
            }],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "chord_chart_import",
                    "strict": True,
                    "schema": VISION_SCHEMA,
                }
            },
        }
        request = urllib.request.Request(
            OPENAI_RESPONSES_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                result = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            if exc.code == 429 and "insufficient_quota" in detail:
                raise RuntimeError(
                    "OCR is configured, but this OpenAI API project has no available credits or quota. "
                    "Add API billing or raise the project usage limit, then try Import again."
                ) from exc
            raise RuntimeError(f"OpenAI image import failed ({exc.code}): {detail[:500]}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"OpenAI image import could not connect: {exc.reason}") from exc
        extracted = json.loads(_extract_output_text(result))
    return normalize_vision_song(extracted)
