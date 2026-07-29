"""Convert uploaded chord-chart images or PDFs into editor-compatible song JSON."""

import base64
import json
import mimetypes
import os
import re
import urllib.error
import urllib.request
from pathlib import Path


OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
NVIDIA_CHAT_URL = "{base_url}/chat/completions"
GEMINI_GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
DEFAULT_VISION_MODEL = "gemini-2.5-flash"
DEFAULT_NVIDIA_MODEL = "meta/llama-3.2-11b-vision-instruct"
DEFAULT_OPENAI_VISION_MODEL = "gpt-4.1-mini"
MAX_IMPORT_BYTES = 20 * 1024 * 1024
ALLOWED_IMPORT_TYPES = {"image/png", "image/jpeg", "image/webp", "application/pdf"}
TEXT_CHART_EXTENSIONS = {".txt", ".cho", ".crd", ".pro", ".chordpro"}


IMPORT_CRITERIA = {
    "version": "2026-07-19",
    "accepted_sources": [
        {
            "kind": "editor-json",
            "label": "Karen Music chart code",
            "extensions": [".json"],
            "details": "A Karen Music export or compatible editor JSON object containing chart_json or chartjson.",
        },
        {
            "kind": "text-chart",
            "label": "Text or ChordPro chart code",
            "extensions": sorted(TEXT_CHART_EXTENSIONS),
            "details": "Use section labels, bar lines, and chord tokens; metadata headers and ChordPro directives are recognized.",
        },
        {
            "kind": "vision",
            "label": "Photo, scan, or PDF",
            "extensions": [".png", ".jpg", ".jpeg", ".webp", ".pdf"],
            "details": "Handwritten or printed charts are transcribed by the first configured vision provider that succeeds.",
        },
    ],
    "metadata_fields": [
        "English title",
        "S'gaw Karen title",
        "category",
        "current key",
        "original key",
        "style",
        "tempo / BPM",
        "time signature (3/4, 4/4, or 6/8)",
        "instruments",
        "group",
        "notes",
    ],
    "chart_fields": [
        "section order and labels",
        "measure order and bar lines",
        "beat positions",
        "two chords without visible beat underlines default to beats 1 and 3 in 4/4, or beats 1 and 4 in 6/8",
        "chord roots, accidentals, qualities, sevenths, and slash bass notes",
        "circle marks",
        "dot marks",
        "x marks",
    ],
    "text_syntax": [
        "Separate measures with | and beat positions with spaces.",
        "Use section labels such as [Verse], Chorus:, or {start_of_chorus}.",
        "Use chords such as G, Bbm7, Cmaj7, or D/F#; use - or _ for an empty beat.",
        "Use (G) for a circled chord, G. for a dotted chord, and x through xxxx for x marks.",
        "Use headers such as Title:, Karen Title:, Key:, Original Key:, Tempo:, Time:, Style:, Category:, Instruments:, Group:, and Notes:.",
    ],
    "image_quality": [
        "Include the whole page with no cropped measures or metadata.",
        "Use even lighting, readable contrast, and the highest available resolution.",
        "Keep the camera parallel to the page and avoid fingers, shadows, blur, and glare.",
        "For multi-page PDFs, keep pages in performance order.",
    ],
    "review_policy": "Every import is a draft. Inspect warnings and missing fields, apply it to the editor, then review the chart before pressing Save.",
    "privacy": "JSON and text chart code are parsed locally. Image and PDF files are sent only to the configured Gemini, NVIDIA, or OpenAI vision provider for transcription.",
    "max_bytes": MAX_IMPORT_BYTES,
}


VISION_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "title", "title_karen", "category", "current_key", "original_key", "style", "tempo",
        "time_signature", "instruments", "song_group", "notes", "confidence", "warnings", "sections",
    ],
    "properties": {
        "title": {"type": "string"},
        "title_karen": {"type": "string"},
        "category": {"type": "string"},
        "current_key": {"type": "string"},
        "original_key": {"type": "string"},
        "style": {"type": "string"},
        "tempo": {"type": "string"},
        "time_signature": {"type": "string"},
        "instruments": {"type": "array", "items": {"type": "string"}},
        "song_group": {"type": "string"},
        "notes": {"type": "string"},
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
                            "required": ["beats", "beat_underlines_visible"],
                            "properties": {
                                "beat_underlines_visible": {"type": "boolean"},
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
Inspect every page from top-left to bottom-right and preserve page order, visible section order, measure order, bar lines, beat positions, chord spellings, slash bass notes, circle marks, dot marks, and x marks.
Actively inspect headers, margins, footers, and handwritten annotations for S'gaw Karen title, English title, category, current key, original key, style, tempo/BPM, time signature, instruments, group, and notes. Populate every schema field visibly supported by the source; use an empty string or empty list when a field is not present.
Treat the visible vertical grid columns as fixed beat slots. For each measure, return exactly the time-signature numerator's number of beat objects when that grid is visible: 3 for 3/4, 4 for 4/4, and 6 for 6/8. Read left-to-right by column center; do not compact populated beats left or right and do not create an extra beat for an annotation. Use an empty chord for every visible column with no new chord.
Set beat_underlines_visible=true only when drawn beat underlines, beat marks, or a visible grid establish exact chord positions in that measure. When a measure has exactly two chords and beat_underlines_visible=false, split the measure evenly by placing the first chord on beat 1 and the second chord at the start of the latter half: beat 3 in 4/4 or beat 4 in 6/8.
An x or group of x strokes belongs to the grid column where it is drawn and does not consume or insert another beat. A hand-drawn ellipse around a chord sets circle=true on that same beat. A filled dot beside a chord sets dot=true on that same beat. Keep those marks attached to their chord even when the mark crosses a grid line.
Preserve 3/4, 4/4, or 6/8 exactly when shown.
Never invent unreadable content. Add a concise, location-specific warning for cropped, faint, ambiguous, or missing content and lower confidence accordingly.
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


def _coerce_beats_per_measure(value, raw_sections=None):
    text = str(value or "").strip()
    match = re.search(r"\b(3|4|6)\s*(?:/\s*(?:4|8))?\b", text)
    if match:
        return int(match.group(1))
    for raw_section in raw_sections or []:
        for raw_measure in raw_section.get("measures", []):
            count = len(raw_measure.get("beats", []))
            if count in {3, 4, 6}:
                return count
    return 4


def _empty_editor_beat():
    return {
        "bass": "",
        "chordState": _parse_chord(""),
        "circle": False,
        "dot": False,
        "editStack": [],
        "lead": [],
        "manualUnderline": False,
        "roll": False,
        "xMarks": 0,
    }


def _vision_beat_to_editor(raw_beat):
    chord_symbol = str(raw_beat.get("chord") or "").strip()
    bass = str(raw_beat.get("bass") or "").strip()
    if "/" in chord_symbol and not bass:
        chord_symbol, bass = chord_symbol.split("/", 1)
    chord_state = _parse_chord(chord_symbol)
    return {
        "bass": bass,
        "chordState": chord_state,
        "circle": bool(raw_beat.get("circle")),
        "dot": bool(raw_beat.get("dot")),
        "editStack": ["root"] if chord_state.get("root") else [],
        "lead": [],
        "manualUnderline": False,
        "roll": False,
        "xMarks": max(0, min(4, int(raw_beat.get("x_marks") or 0))),
    }


def _raw_vision_beat_is_blank(raw_beat):
    return (
        not str(raw_beat.get("chord") or "").strip()
        and not str(raw_beat.get("bass") or "").strip()
        and not bool(raw_beat.get("circle"))
        and not bool(raw_beat.get("dot"))
        and int(raw_beat.get("x_marks") or 0) == 0
    )


def _empty_raw_vision_beat():
    return {"chord": "", "bass": "", "circle": False, "dot": False, "x_marks": 0}


def _spread_unlined_two_chord_measure(raw_measure, beats_per_measure):
    """Split two floating chord events evenly when no beat underlines establish positions."""
    raw_beats = list(raw_measure.get("beats", []) or [])
    underlines_visible = raw_measure.get("beat_underlines_visible")
    positions_are_implicit = underlines_visible is False or (
        underlines_visible is None and len(raw_beats) == 2
    )
    if not positions_are_implicit:
        return raw_beats, False

    chord_events = [
        beat for beat in raw_beats
        if str(beat.get("chord") or "").strip() or str(beat.get("bass") or "").strip()
    ]
    non_chord_events = [
        beat for beat in raw_beats
        if not _raw_vision_beat_is_blank(beat)
        and not (str(beat.get("chord") or "").strip() or str(beat.get("bass") or "").strip())
    ]
    if len(chord_events) != 2 or non_chord_events:
        return raw_beats, False

    spread = [_empty_raw_vision_beat() for _ in range(beats_per_measure)]
    spread[0] = chord_events[0]
    spread[beats_per_measure // 2] = chord_events[1]
    return spread, True


def _fit_vision_measure_beats(raw_beats, beats_per_measure):
    """Fit only unambiguous surplus blanks; preserve every non-empty annotation."""
    fitted = list(raw_beats or [])
    removed_blank_count = 0
    while len(fitted) > beats_per_measure:
        blank_index = next((index for index, beat in enumerate(fitted) if _raw_vision_beat_is_blank(beat)), None)
        if blank_index is None:
            break
        fitted.pop(blank_index)
        removed_blank_count += 1
    return fitted, removed_blank_count


def _string_list(value):
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in re.split(r"[,;\n]+", value) if item.strip()]
    return []


def _chart_counts(song):
    chart = song.get("chart_json") or song.get("chartjson") or {}
    sections = chart.get("sections", []) if isinstance(chart, dict) else []
    measures = sum(len(section.get("measures", [])) for section in sections if isinstance(section, dict))
    beats = sum(
        len(measure.get("beats", []))
        for section in sections if isinstance(section, dict)
        for measure in section.get("measures", []) if isinstance(measure, dict)
    )
    return len(sections), measures, beats


def attach_import_review(song, source_kind, provider="local"):
    result = dict(song)
    sections, measures, beats = _chart_counts(result)
    checks = [
        ("English title", result.get("title") and result.get("title") != "Imported Chord Chart"),
        ("S'gaw Karen title", result.get("title_karen")),
        ("category", result.get("category")),
        ("current key", result.get("current_key") or result.get("key")),
        ("original key", result.get("original_key")),
        ("style", result.get("style")),
        ("tempo / BPM", result.get("tempo")),
        ("instruments", result.get("instruments")),
        ("group", (result.get("chart_json") or {}).get("songGroup") if isinstance(result.get("chart_json"), dict) else ""),
        ("chart sections", sections > 0),
    ]
    result["import_review"] = {
        "criteria_version": IMPORT_CRITERIA["version"],
        "source_kind": source_kind,
        "provider": provider,
        "recognized_fields": [label for label, present in checks if present],
        "missing_fields": [label for label, present in checks if not present],
        "section_count": sections,
        "measure_count": measures,
        "beat_count": beats,
        "requires_review": True,
    }
    return result


def normalize_vision_song(extracted, provider="vision"):
    raw_sections = extracted.get("sections", []) if isinstance(extracted, dict) else []
    beats_per_measure = _coerce_beats_per_measure(extracted.get("time_signature"), raw_sections)
    sections = []
    normalization_warnings = []
    for section_index, raw_section in enumerate(raw_sections):
        measures = []
        for measure_index, raw_measure in enumerate(raw_section.get("measures", [])):
            raw_beats, used_unlined_two_chord_default = _spread_unlined_two_chord_measure(
                raw_measure, beats_per_measure
            )
            fitted_raw_beats, removed_blank_count = _fit_vision_measure_beats(raw_beats, beats_per_measure)
            beats = [_vision_beat_to_editor(raw_beat) for raw_beat in fitted_raw_beats]
            while len(beats) < beats_per_measure:
                beats.append(_empty_editor_beat())
            if used_unlined_two_chord_default:
                normalization_warnings.append(
                    f"Section {section_index + 1}, measure {measure_index + 1}: placed two chords "
                    f"without visible beat underlines on beats 1 and {beats_per_measure // 2 + 1}; "
                    "review the default placement."
                )
            if removed_blank_count:
                normalization_warnings.append(
                    f"Section {section_index + 1}, measure {measure_index + 1}: removed "
                    f"{removed_blank_count} surplus blank OCR beat slot to match {beats_per_measure} beats; "
                    "review beat placement."
                )
            elif len(beats) > beats_per_measure:
                normalization_warnings.append(
                    f"Section {section_index + 1}, measure {measure_index + 1}: OCR returned "
                    f"{len(beats)} non-empty beat slots for a {beats_per_measure}-beat measure; "
                    "all notation was preserved for review."
                )
            measures.append({"beats": beats, "forceUnderline": False, "isEndingBar": False, "roll": False})
        if measures:
            sections.append({"type": str(raw_section.get("type") or "Verse"), "measures": measures})

    current_key = str(extracted.get("current_key") or extracted.get("key") or "")
    original_key = str(extracted.get("original_key") or current_key)
    warnings = [str(value) for value in extracted.get("warnings", [])] + normalization_warnings
    if not sections:
        warnings.append("No chart measures were confidently detected; add or correct sections before saving.")
    notes = str(extracted.get("notes") or "").strip()
    raw_tempo = str(extracted.get("tempo") or "").strip()
    tempo_match = re.search(r"\b(\d{2,3})\b", raw_tempo)
    tempo = tempo_match.group(1) if tempo_match and 20 <= int(tempo_match.group(1)) <= 300 else ""
    if raw_tempo and not tempo:
        warnings.append(f"The source tempo marking '{raw_tempo}' is descriptive; choose a numeric BPM before saving.")
        notes = f"{notes}\nSource tempo marking: {raw_tempo}".strip()
    import_note = "Imported from image/PDF. Review every measure before saving."
    notes = f"{notes}\n{import_note}".strip() if notes else import_note
    instruments = ", ".join(_string_list(extracted.get("instruments")))
    result = {
        "title": str(extracted.get("title") or "Imported Chord Chart"),
        "title_karen": str(extracted.get("title_karen") or ""),
        "category": str(extracted.get("category") or ""),
        "key": current_key,
        "current_key": current_key,
        "original_key": original_key,
        "style": str(extracted.get("style") or ""),
        "tempo": tempo,
        "instruments": instruments,
        "notes": notes,
        "chart_json": {
            "sections": sections,
            "onlySpans": [],
            "slurs": [],
            "lyricsSections": [],
            "beatsPerMeasure": beats_per_measure,
            "defaultMeasuresPerRow": 4,
            "rowDefaultExplicit": False,
            "songGroup": str(extracted.get("song_group") or ""),
        },
        "row_lead_json": {},
        "performed_dates": [],
        "reference_media": {"videos": [], "images": [], "info": ""},
        "file_metadata": [],
        "confidence": max(0.0, min(1.0, float(extracted.get("confidence") or 0))),
        "warnings": warnings,
    }
    return attach_import_review(result, "vision", provider)


def normalize_editor_chart_code(payload):
    if not isinstance(payload, dict):
        raise ValueError("Chart code must be a JSON object.")
    chart = payload.get("chart_json") or payload.get("chartjson") or {}
    if isinstance(chart, list):
        chart = {"sections": chart}
    if not isinstance(chart, dict):
        raise ValueError("Chart code must contain chart_json or chartjson as an object.")
    chart = dict(chart)
    chart.setdefault("sections", [])
    chart.setdefault("onlySpans", [])
    chart.setdefault("slurs", [])
    chart.setdefault("lyricsSections", chart.get("lyrics", []))
    chart["beatsPerMeasure"] = _coerce_beats_per_measure(chart.get("beatsPerMeasure"), chart.get("sections"))
    chart.setdefault("defaultMeasuresPerRow", 4)
    chart.setdefault("rowDefaultExplicit", False)
    chart.setdefault("songGroup", str(payload.get("song_group") or ""))
    row_lead = payload.get("row_lead_json")
    if row_lead is None:
        row_lead = payload.get("rowleadjson") or payload.get("rowLead") or {}
    result = {
        "title": str(payload.get("title") or "Imported Chord Chart"),
        "title_karen": str(payload.get("title_karen") or ""),
        "category": str(payload.get("category") or ""),
        "key": str(payload.get("current_key") or payload.get("key") or ""),
        "current_key": str(payload.get("current_key") or payload.get("key") or ""),
        "original_key": str(payload.get("original_key") or payload.get("key") or payload.get("current_key") or ""),
        "style": str(payload.get("style") or ""),
        "tempo": str(payload.get("tempo") or ""),
        "instruments": ", ".join(_string_list(payload.get("instruments"))),
        "notes": str(payload.get("notes") or payload.get("raw_editor_text") or payload.get("raweditortext") or ""),
        "created_date": str(payload.get("created_date") or ""),
        "next_performance_date": str(payload.get("next_performance_date") or ""),
        "performed_dates": payload.get("performed_dates") if isinstance(payload.get("performed_dates"), list) else [],
        "reference_media": payload.get("reference_media") if isinstance(payload.get("reference_media"), dict) else {"videos": [], "images": [], "info": ""},
        "file_metadata": payload.get("file_metadata") if isinstance(payload.get("file_metadata"), list) else [],
        "chart_json": chart,
        "row_lead_json": row_lead if isinstance(row_lead, dict) else {},
        "confidence": 1.0,
        "warnings": ["Imported chart code is a draft; review the editor before saving."],
    }
    return attach_import_review(result, "editor-json")


_CHORD_TOKEN = re.compile(
    r"^[A-G](?:b|#)?(?:(?:m|maj|min|dim|aug|sus|add|M)?(?:2|4|5|6|7|9|11|13)?(?:[#b]\d+)?)?(?:/[A-G](?:b|#)?)?$",
    re.I,
)
_SECTION_HEADER = re.compile(r"^(intro|verse(?:\s+\d+)?|pre[- ]?chorus|chorus(?:\s+\d+)?|bridge|solo|ending|outro)\b\s*:?(.*)$", re.I)


def _section_name(value):
    name = re.sub(r"[_-]+", " ", str(value or "")).strip().title()
    name = re.sub(r"\s+\d+$", "", name)
    return name.replace("Pre Chorus", "Pre-Chorus") or "Verse"


def _text_beat(token):
    value = str(token or "").strip().strip(",;")
    if value in {"", "-", "_", ".", "%"}:
        return {"chord": "", "bass": "", "circle": False, "x_marks": 0, "dot": False}
    if re.fullmatch(r"x{1,4}", value, re.I):
        return {"chord": "", "bass": "", "circle": False, "x_marks": len(value), "dot": False}
    circle = False
    if (value.startswith("(") and value.endswith(")")) or (value.lower().startswith("o(") and value.endswith(")")):
        circle = True
        value = value[value.index("(") + 1:-1].strip()
    dot = value.endswith(".") or value.endswith("•")
    if dot:
        value = value[:-1].strip()
    if not _CHORD_TOKEN.fullmatch(value):
        return None
    chord, bass = (value.split("/", 1) + [""])[:2] if "/" in value else (value, "")
    return {"chord": chord, "bass": bass, "circle": circle, "x_marks": 0, "dot": dot}


def _measures_from_tokens(tokens, beats_per_measure, one_bar=False):
    parsed = [_text_beat(token) for token in tokens]
    parsed = [beat for beat in parsed if beat is not None]
    if not parsed:
        return []
    chunks = [parsed] if one_bar else [parsed[index:index + beats_per_measure] for index in range(0, len(parsed), beats_per_measure)]
    measures = []
    for chunk in chunks:
        while len(chunk) < beats_per_measure:
            chunk.append({"chord": "", "bass": "", "circle": False, "x_marks": 0, "dot": False})
        measures.append({"beats": chunk})
    return measures


def _metadata_key(value):
    key = re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()
    aliases = {
        "t": "title", "title": "title", "english title": "title",
        "karen title": "title_karen", "sgaw karen title": "title_karen", "s gaw karen title": "title_karen",
        "category": "category", "key": "current_key", "current key": "current_key", "original key": "original_key",
        "style": "style", "tempo": "tempo", "bpm": "tempo", "time": "time_signature", "time signature": "time_signature",
        "instrument": "instruments", "instruments": "instruments", "group": "song_group", "notes": "notes", "comment": "notes",
    }
    return aliases.get(key, "")


def parse_chart_text(text):
    source = str(text or "").lstrip("\ufeff").strip()
    if not source:
        raise ValueError("The selected chart-code file is empty.")
    metadata = {
        "title": "", "title_karen": "", "category": "", "current_key": "", "original_key": "",
        "style": "", "tempo": "", "time_signature": "", "instruments": [], "song_group": "", "notes": "",
    }
    lines = [line.strip() for line in re.split(r"[\r\n]+", source) if line.strip()]
    for line in lines:
        directive = re.fullmatch(r"\{([^}:]+)\s*:?\s*([^}]*)\}", line)
        if directive:
            key = _metadata_key(directive.group(1))
            value = directive.group(2).strip()
        else:
            match = re.match(r"^(English Title|S'?gaw Karen Title|Karen Title|Title|Category|Current Key|Original Key|Key|Style|Tempo|BPM|Time Signature|Time|Instruments?|Group|Notes)\s*[:=]\s*(.+)$", line, re.I)
            key = _metadata_key(match.group(1)) if match else ""
            value = match.group(2).strip() if match else ""
        if not key:
            continue
        if key == "instruments":
            metadata[key] = _string_list(value)
        elif key == "notes" and metadata[key]:
            metadata[key] = f"{metadata[key]}\n{value}"
        else:
            metadata[key] = value

    beats_per_measure = _coerce_beats_per_measure(metadata.get("time_signature"))
    sections = []
    current = None

    def start_section(name):
        nonlocal current
        if current and current["measures"]:
            sections.append(current)
        current = {"type": _section_name(name), "measures": []}

    def add_measures(measures):
        nonlocal current
        if not measures:
            return
        if current is None:
            current = {"type": "Verse", "measures": []}
        current["measures"].extend(measures)

    for line in lines:
        if re.match(r"^(English Title|S'?gaw Karen Title|Karen Title|Title|Category|Current Key|Original Key|Key|Style|Tempo|BPM|Time Signature|Time|Instruments?|Group|Notes)\s*[:=]", line, re.I):
            continue
        directive = re.fullmatch(r"\{([^}:]+)\s*:?\s*([^}]*)\}", line)
        if directive:
            directive_name = re.sub(r"[_-]+", " ", directive.group(1)).strip().lower()
            if directive_name.startswith("start of "):
                start_section(directive_name.removeprefix("start of "))
            elif directive_name.startswith("end of ") and current and current["measures"]:
                sections.append(current)
                current = None
            continue
        bracket_header = re.fullmatch(r"\[([^]]+)\]", line)
        if bracket_header and not _CHORD_TOKEN.fullmatch(bracket_header.group(1).strip()):
            start_section(bracket_header.group(1))
            continue
        header = _SECTION_HEADER.match(line)
        if header:
            start_section(header.group(1))
            line = header.group(2).strip()
            if not line:
                continue
        inline_chords = [token for token in re.findall(r"\[([^]]+)\]", line) if _text_beat(token) is not None]
        if inline_chords:
            add_measures(_measures_from_tokens(inline_chords, beats_per_measure))
            continue
        if "|" in line:
            for segment in [part.strip() for part in line.split("|") if part.strip()]:
                add_measures(_measures_from_tokens(segment.split(), beats_per_measure, one_bar=True))
            continue
        tokens = line.split()
        recognized = [token for token in tokens if _text_beat(token) is not None]
        if recognized and len(recognized) >= max(1, len(tokens) - 1):
            add_measures(_measures_from_tokens(recognized, beats_per_measure))

    if current and current["measures"]:
        sections.append(current)
    if not sections:
        raise ValueError("No chord measures were recognized. Use the chart-code syntax shown in Import criteria.")
    extracted = {
        **metadata,
        "confidence": 0.92,
        "warnings": ["Text chart code was parsed locally; review beat spacing and section boundaries before saving."],
        "sections": sections,
    }
    result = normalize_vision_song(extracted, provider="local chart-code parser")
    result["import_review"]["source_kind"] = "text-chart"
    result["notes"] = metadata.get("notes") or "Imported from text chart code. Review every measure before saving."
    return result


def interpret_chart_code(filename, file_bytes):
    if not file_bytes:
        raise ValueError("The selected chart-code file is empty.")
    if len(file_bytes) > MAX_IMPORT_BYTES:
        raise ValueError("The selected file is larger than 20 MB.")
    try:
        text = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("Chart code must be UTF-8 JSON, text, or ChordPro.") from exc
    extension = Path(filename or "").suffix.lower()
    if extension == ".json" or text.lstrip().startswith("{"):
        try:
            return normalize_editor_chart_code(json.loads(text))
        except json.JSONDecodeError as exc:
            raise ValueError(f"Chart JSON is invalid near line {exc.lineno}, column {exc.colno}.") from exc
    if extension and extension not in TEXT_CHART_EXTENSIONS:
        raise ValueError("Import chart code as .json, .txt, .cho, .crd, .pro, or .chordpro.")
    return parse_chart_text(text)


def parse_ocr_text(text):
    try:
        return parse_chart_text(text)
    except ValueError:
        lines = [line.strip() for line in re.split(r"[\r\n]+", text or "") if line.strip()]
        title = lines[0] if lines else "Imported Chord Chart"
        current_key = ""
        original_key = ""
        tempo = ""
        sections = []
        for line in lines[1:]:
            header = _SECTION_HEADER.match(line)
            if header:
                sections.append({"type": _section_name(header.group(1)), "measures": []})
            if key_match := re.search(r"\b(?:key|current key|original key)\s*[:=]\s*([A-G][b#]?)", line, re.I):
                if "original" in line.lower():
                    original_key = key_match.group(1)
                else:
                    current_key = key_match.group(1)
            if tempo_match := re.search(r"\b(?:tempo|bpm)\s*[:=]\s*(\d{2,3})", line, re.I):
                tempo = tempo_match.group(1)
        karen_title = next((line for line in lines[1:] if "karen" in line.lower()), "")
        return {
            "title": title,
            "title_karen": karen_title,
            "category": "",
            "key": current_key or original_key,
            "current_key": current_key or original_key,
            "original_key": original_key or current_key,
            "style": "",
            "tempo": tempo,
            "confidence": 0.45,
            "warnings": ["Text imported from OCR should be reviewed."],
            "sections": sections or [{"type": "Verse", "measures": []}],
        }


def _json_object(text):
    value = str(text or "").strip()
    if value.startswith("```"):
        value = re.sub(r"^```(?:json)?\s*", "", value, flags=re.I)
        value = re.sub(r"\s*```$", "", value)
    start = value.find("{")
    end = value.rfind("}")
    if start < 0 or end < start:
        raise ValueError("The OCR provider did not return a JSON object.")
    parsed = json.loads(value[start:end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("The OCR provider returned an invalid chart object.")
    return parsed


def _gemini_response_schema(value):
    if isinstance(value, dict):
        return {
            key: _gemini_response_schema(item)
            for key, item in value.items()
            if key != "additionalProperties"
        }
    if isinstance(value, list):
        return [_gemini_response_schema(item) for item in value]
    return value


def _gemini_extract(filename, media_type, file_bytes, api_key):
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
            "responseSchema": _gemini_response_schema(VISION_SCHEMA),
        },
    }
    request = urllib.request.Request(
        GEMINI_GENERATE_URL.format(model=os.environ.get("GEMINI_VISION_MODEL", DEFAULT_VISION_MODEL), key=api_key),
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
    for candidate in result.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            if isinstance(part.get("text"), str):
                return _json_object(part["text"])
    raise ValueError("Gemini did not return chart text.")


def _nvidia_extract(filename, media_type, file_bytes, api_key):
    payload = {
        "model": os.environ.get("NVIDIA_VISION_MODEL", DEFAULT_NVIDIA_MODEL),
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": SYSTEM_PROMPT + "\nReturn only JSON."},
                _input_part(filename, media_type, file_bytes),
            ],
        }],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }
    nvidia_base_url = os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1").rstrip("/")
    request = urllib.request.Request(
        NVIDIA_CHAT_URL.format(base_url=nvidia_base_url),
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
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
    return _json_object(_extract_chat_text(result))


def _openai_extract(filename, media_type, file_bytes, api_key):
    payload = {
        "model": os.environ.get("OPENAI_VISION_MODEL", DEFAULT_OPENAI_VISION_MODEL),
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
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        if exc.code == 429 and "insufficient_quota" in detail:
            raise RuntimeError("OpenAI OCR is configured, but this API project has no available credits or quota.") from exc
        raise RuntimeError(f"OpenAI image import failed ({exc.code}): {detail[:500]}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"OpenAI image import could not connect: {exc.reason}") from exc
    return _json_object(_extract_output_text(result))


def interpret_chart_upload(filename, supplied_type, file_bytes, api_key=None):
    if not file_bytes:
        raise ValueError("The selected import file is empty.")
    if len(file_bytes) > MAX_IMPORT_BYTES:
        raise ValueError("The selected file is larger than 20 MB.")
    media_type = _media_type(filename, supplied_type)
    if media_type not in ALLOWED_IMPORT_TYPES:
        raise ValueError("Import a PNG, JPG, WEBP, or PDF chord chart.")
    providers = [
        ("Gemini", os.environ.get("GEMINI_API_KEY", ""), _gemini_extract),
        ("NVIDIA", os.environ.get("NVIDIA_API_KEY", ""), _nvidia_extract),
        ("OpenAI", os.environ.get("OPENAI_API_KEY", "") or api_key or "", _openai_extract),
    ]
    configured = [(name, key, handler) for name, key, handler in providers if key]
    if not configured:
        raise RuntimeError("Configure GEMINI_API_KEY, NVIDIA_API_KEY, or OPENAI_API_KEY for image and PDF import.")
    failures = []
    for name, key, handler in configured:
        try:
            extracted = handler(filename, media_type, file_bytes, key)
            result = normalize_vision_song(extracted, provider=name)
            if failures:
                result["warnings"].append(f"{name} completed the import after earlier provider attempts failed.")
            return result
        except Exception as exc:
            failures.append((name, str(exc)))
    detail = "; ".join(f"{name}: {message}" for name, message in failures)
    raise RuntimeError(f"All configured OCR providers failed. {detail}")
