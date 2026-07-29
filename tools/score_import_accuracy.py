"""Run the private OCR corpus and record sanitized, dimension-level accuracy."""

from __future__ import annotations

import argparse
import json
import mimetypes
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from import_service import interpret_chart_upload


METADATA_FIELDS = (
    "title",
    "title_karen",
    "category",
    "current_key",
    "original_key",
    "style",
    "tempo",
    "time_signature",
    "instruments",
    "song_group",
    "notes",
)
DIMENSIONS = ("metadata", "sections", "measures", "chords", "slash_bass", "circles", "dots", "x_marks")


def _normalize_text(value):
    return re.sub(r"\s+", " ", str(value or "").strip()).casefold()


def _normalize_key(value):
    return str(value or "").strip().replace("♭", "b").replace("♯", "#").casefold()


def _normalize_instruments(value):
    if isinstance(value, str):
        value = re.split(r"[,;\n]+", value)
    return sorted(_normalize_text(item) for item in (value or []) if _normalize_text(item))


def _editor_chord(beat):
    state = beat.get("chordState") or {}
    root = str(state.get("root") or "")
    if not root:
        return ""
    if state.get("flat") and not root.endswith("b"):
        root += "b"
    quality = str(state.get("quality") or "")
    if state.get("triangle"):
        suffix = "maj7" if state.get("seven") else "maj"
    elif state.get("minor"):
        suffix = "m7" if state.get("seven") else "m"
    elif state.get("seven"):
        suffix = "7"
    else:
        suffix = ""
    return _normalize_key(root + suffix + quality)


def _expected_positions(expected):
    positions = {}
    for section_index, section in enumerate(expected.get("sections", [])):
        for measure_index, measure in enumerate(section.get("measures", [])):
            for beat_index, value in enumerate(measure):
                positions[(section_index, measure_index, beat_index)] = value
    return positions


def _actual_positions(actual):
    positions = {}
    sections = (actual.get("chart_json") or {}).get("sections", [])
    for section_index, section in enumerate(sections):
        for measure_index, measure in enumerate(section.get("measures", [])):
            for beat_index, value in enumerate(measure.get("beats", [])):
                positions[(section_index, measure_index, beat_index)] = value
    return positions


def _metric():
    return {"matched": 0, "total": 0, "score": 0.0}


def _record(metrics, mismatches, dimension, location, expected, actual):
    metric = metrics[dimension]
    metric["total"] += 1
    if expected == actual:
        metric["matched"] += 1
        return
    mismatches.append({
        "dimension": dimension,
        "location": location,
        "expected": expected,
        "actual": actual,
    })


def _finalize(metrics):
    matched = 0
    total = 0
    for metric in metrics.values():
        metric["score"] = round(metric["matched"] / metric["total"], 4) if metric["total"] else 1.0
        matched += metric["matched"]
        total += metric["total"]
    return round(matched / total, 4) if total else 1.0


def score_result(expected, actual):
    metrics = {dimension: _metric() for dimension in DIMENSIONS}
    mismatches = []
    expected_metadata = expected["metadata"]
    chart = actual.get("chart_json") or {}
    beats_per_measure = int(chart.get("beatsPerMeasure") or 4)
    actual_metadata = {
        "title": actual.get("title"),
        "title_karen": actual.get("title_karen"),
        "category": actual.get("category"),
        "current_key": actual.get("current_key") or actual.get("key"),
        "original_key": actual.get("original_key"),
        "style": actual.get("style"),
        "tempo": actual.get("tempo"),
        "time_signature": "6/8" if beats_per_measure == 6 else f"{beats_per_measure}/4",
        "instruments": actual.get("instruments"),
        "song_group": chart.get("songGroup"),
        "notes": actual.get("notes"),
    }
    for field in METADATA_FIELDS:
        expected_value = expected_metadata.get(field)
        actual_value = actual_metadata.get(field)
        if field == "instruments":
            expected_value = _normalize_instruments(expected_value)
            actual_value = _normalize_instruments(actual_value)
        elif field in {"current_key", "original_key"}:
            expected_value = _normalize_key(expected_value)
            actual_value = _normalize_key(actual_value)
        elif field == "notes":
            expected_value = _normalize_text(expected_value)
            actual_value = expected_value if expected_value and expected_value in _normalize_text(actual_value) else _normalize_text(actual_value)
        else:
            expected_value = _normalize_text(expected_value)
            actual_value = _normalize_text(actual_value)
        _record(metrics, mismatches, "metadata", field, expected_value, actual_value)

    expected_sections = expected.get("sections", [])
    actual_sections = chart.get("sections", [])
    section_total = max(len(expected_sections), len(actual_sections))
    for index in range(section_total):
        expected_type = _normalize_text(expected_sections[index]["type"]) if index < len(expected_sections) else "<none>"
        actual_type = _normalize_text(actual_sections[index].get("type")) if index < len(actual_sections) else "<none>"
        _record(metrics, mismatches, "sections", f"section[{index}]", expected_type, actual_type)
        expected_count = len(expected_sections[index]["measures"]) if index < len(expected_sections) else 0
        actual_count = len(actual_sections[index].get("measures", [])) if index < len(actual_sections) else 0
        _record(metrics, mismatches, "measures", f"section[{index}].measure_count", expected_count, actual_count)

    expected_positions = _expected_positions(expected)
    actual_positions = _actual_positions(actual)
    for position in sorted(set(expected_positions) | set(actual_positions)):
        expected_beat = expected_positions.get(position, beat_default())
        actual_beat = actual_positions.get(position, {})
        location = f"section[{position[0]}].measure[{position[1]}].beat[{position[2]}]"
        _record(
            metrics,
            mismatches,
            "chords",
            location,
            _normalize_key(expected_beat.get("chord")),
            _editor_chord(actual_beat),
        )
        _record(
            metrics,
            mismatches,
            "slash_bass",
            location,
            _normalize_key(expected_beat.get("bass")),
            _normalize_key(actual_beat.get("bass")),
        )
        _record(metrics, mismatches, "circles", location, bool(expected_beat.get("circle")), bool(actual_beat.get("circle")))
        _record(metrics, mismatches, "dots", location, bool(expected_beat.get("dot")), bool(actual_beat.get("dot")))
        _record(
            metrics,
            mismatches,
            "x_marks",
            location,
            int(expected_beat.get("x_marks") or 0),
            int(actual_beat.get("xMarks") or 0),
        )

    return {
        "overall_score": _finalize(metrics),
        "metrics": metrics,
        "mismatches": mismatches,
    }


def beat_default():
    return {"chord": "", "bass": "", "circle": False, "dot": False, "x_marks": 0}


def _safe_failure(exc):
    message = str(exc).splitlines()[0]
    if "All configured OCR providers failed" in message:
        return "All configured OCR providers failed; raw provider error text was not retained."
    return re.sub(r"(?i)(key|token|authorization)\s*[:=]\s*\S+", r"\1=[redacted]", message)[:240]


def run_corpus(corpus_dir, selected_ids=None):
    corpus_dir = Path(corpus_dir).resolve()
    manifest = json.loads((corpus_dir / "corpus-manifest.json").read_text(encoding="utf-8"))
    results = []
    selected = set(selected_ids or [])
    samples = [sample for sample in manifest["samples"] if not selected or sample["id"] in selected]
    for index, sample in enumerate(samples, start=1):
        source_path = corpus_dir / sample["source"]
        expected_path = corpus_dir / sample["expected"]
        expected = json.loads(expected_path.read_text(encoding="utf-8"))
        print(f"[{index}/{len(samples)}] OCR {sample['id']}...", flush=True)
        try:
            content_type = mimetypes.guess_type(source_path.name)[0] or "application/octet-stream"
            actual = interpret_chart_upload(source_path.name, content_type, source_path.read_bytes())
            scored = score_result(expected, actual)
            review = actual.get("import_review") or {}
            result = {
                "id": sample["id"],
                "status": "scored",
                "provider": review.get("provider") or "unknown",
                "provider_confidence": round(float(actual.get("confidence") or 0), 4),
                "warning_count": len(actual.get("warnings") or []),
                "section_count": review.get("section_count"),
                "measure_count": review.get("measure_count"),
                "saved": False,
                **scored,
            }
            print(
                f"    provider={result['provider']} confidence={result['provider_confidence']:.2f} "
                f"overall={result['overall_score']:.1%} mismatches={len(result['mismatches'])}",
                flush=True,
            )
        except Exception as exc:
            result = {
                "id": sample["id"],
                "status": "failed",
                "error": _safe_failure(exc),
                "saved": False,
            }
            print(f"    failed safely: {result['error']}", flush=True)
        results.append(result)
    scored_results = [result for result in results if result["status"] == "scored"]
    aggregate = {
        dimension: round(
            sum(result["metrics"][dimension]["matched"] for result in scored_results)
            / max(1, sum(result["metrics"][dimension]["total"] for result in scored_results)),
            4,
        )
        for dimension in DIMENSIONS
    }
    total_matched = sum(
        result["metrics"][dimension]["matched"]
        for result in scored_results
        for dimension in DIMENSIONS
    )
    total_fields = sum(
        result["metrics"][dimension]["total"]
        for result in scored_results
        for dimension in DIMENSIONS
    )
    return {
        "corpus_version": manifest["version"],
        "run_at_utc": datetime.now(timezone.utc).isoformat(),
        "private": True,
        "synthetic_only": True,
        "raw_provider_payloads_retained": False,
        "songs_saved": False,
        "sample_count": len(samples),
        "scored_count": len(scored_results),
        "failed_count": len(results) - len(scored_results),
        "overall_score": round(total_matched / total_fields, 4) if total_fields else 0.0,
        "aggregate_metrics": aggregate,
        "results": results,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("corpus", nargs="?", default="private/import_accuracy_corpus")
    parser.add_argument("--output", default="")
    parser.add_argument("--id", action="append", dest="ids", help="Run one sample id; repeat to select multiple.")
    args = parser.parse_args()
    report = run_corpus(args.corpus, args.ids)
    output = Path(args.output) if args.output else Path(args.corpus) / "results" / "latest-accuracy.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Sanitized report: {output.resolve()}")
    print(f"Overall accuracy: {report['overall_score']:.1%}")
    if report["failed_count"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
