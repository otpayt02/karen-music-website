import json

from PIL import Image
from pypdf import PdfReader

from import_service import SYSTEM_PROMPT, normalize_vision_song
from tools.generate_import_accuracy_corpus import generate_corpus
from tools.score_import_accuracy import DIMENSIONS, score_result


def _provider_payload(expected):
    metadata = expected["metadata"]
    sections = [
        {
            "type": section["type"],
            "measures": [{"beats": measure} for measure in section["measures"]],
        }
        for section in expected["sections"]
    ]
    return {
        "title": metadata["title"],
        "title_karen": metadata["title_karen"],
        "category": metadata["category"],
        "current_key": metadata["current_key"],
        "original_key": metadata["original_key"],
        "style": metadata["style"],
        "tempo": metadata["tempo"],
        "time_signature": metadata["time_signature"],
        "instruments": metadata["instruments"],
        "song_group": metadata["song_group"],
        "notes": metadata["notes"],
        "confidence": 1,
        "warnings": [],
        "sections": sections,
    }


def test_generator_creates_three_handwriting_styles_and_real_multipage_pdf(tmp_path):
    manifest_path = generate_corpus(tmp_path / "corpus")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    assert manifest["private"] is True
    assert manifest["raw_provider_payloads_retained"] is False
    assert len(manifest["samples"]) == 4
    images = [sample for sample in manifest["samples"] if sample["source_kind"] == "handwritten-image"]
    pdfs = [sample for sample in manifest["samples"] if sample["source_kind"] == "multipage-pdf"]
    assert len(images) == 3
    assert len({sample["handwriting_style"] for sample in images}) == 3
    assert len(pdfs) == 1

    for sample in images:
        path = manifest_path.parent / sample["source"]
        with Image.open(path) as image:
            assert image.size == (1800, 2400)
        expected = json.loads((manifest_path.parent / sample["expected"]).read_text(encoding="utf-8"))
        assert expected["permission"]["status"] == "permission-cleared"
        assert expected["metadata"]["time_signature"] in {"3/4", "4/4", "6/8"}

    pdf_path = manifest_path.parent / pdfs[0]["source"]
    assert pdf_path.read_bytes().startswith(b"%PDF")
    assert len(PdfReader(str(pdf_path)).pages) == 2


def test_accuracy_scorer_measures_every_requested_dimension(tmp_path):
    manifest_path = generate_corpus(tmp_path / "corpus")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    sample = manifest["samples"][0]
    expected = json.loads((manifest_path.parent / sample["expected"]).read_text(encoding="utf-8"))
    actual = normalize_vision_song(_provider_payload(expected), provider="fixture")

    result = score_result(expected, actual)

    assert set(result["metrics"]) == set(DIMENSIONS)
    assert result["overall_score"] == 1
    assert all(metric["score"] == 1 for metric in result["metrics"].values())


def test_accuracy_scorer_detects_bass_and_mark_regressions(tmp_path):
    manifest_path = generate_corpus(tmp_path / "corpus")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    sample = manifest["samples"][0]
    expected = json.loads((manifest_path.parent / sample["expected"]).read_text(encoding="utf-8"))
    actual = normalize_vision_song(_provider_payload(expected), provider="fixture")
    beats = actual["chart_json"]["sections"][0]["measures"][0]["beats"]
    beats[0]["circle"] = False
    beats[2]["dot"] = False
    actual["chart_json"]["sections"][0]["measures"][1]["beats"][0]["bass"] = ""
    actual["chart_json"]["sections"][0]["measures"][1]["beats"][3]["xMarks"] = 0

    result = score_result(expected, actual)

    assert result["metrics"]["slash_bass"]["score"] < 1
    assert result["metrics"]["circles"]["score"] < 1
    assert result["metrics"]["dots"]["score"] < 1
    assert result["metrics"]["x_marks"]["score"] < 1
    assert {item["dimension"] for item in result["mismatches"]}.issuperset(
        {"slash_bass", "circles", "dots", "x_marks"}
    )


def test_vision_prompt_locks_annotations_to_visible_grid_columns():
    assert "exactly the time-signature numerator's number of beat objects" in SYSTEM_PROMPT
    assert "beat 3 in 4/4 or beat 4 in 6/8" in SYSTEM_PROMPT
    assert "does not consume or insert another beat" in SYSTEM_PROMPT
    assert "sets circle=true on that same beat" in SYSTEM_PROMPT
    assert "sets dot=true on that same beat" in SYSTEM_PROMPT


def test_normalizer_removes_only_surplus_blank_slots_and_warns():
    payload = {
        "title": "Grid Alignment Fixture",
        "time_signature": "4/4",
        "warnings": [],
        "sections": [
            {
                "type": "Chorus",
                "measures": [
                    {
                        "beats": [
                            {"chord": "", "bass": "", "circle": False, "dot": False, "x_marks": 2},
                            {"chord": "", "bass": "", "circle": False, "dot": False, "x_marks": 0},
                            {"chord": "G", "bass": "", "circle": False, "dot": False, "x_marks": 0},
                            {"chord": "D7", "bass": "", "circle": False, "dot": False, "x_marks": 0},
                            {"chord": "G", "bass": "", "circle": False, "dot": True, "x_marks": 0},
                        ]
                    }
                ],
            }
        ],
    }

    normalized = normalize_vision_song(payload, provider="fixture")
    beats = normalized["chart_json"]["sections"][0]["measures"][0]["beats"]

    assert len(beats) == 4
    assert [beat["xMarks"] for beat in beats] == [2, 0, 0, 0]
    assert [beat["chordState"]["root"] for beat in beats] == ["", "G", "D", "G"]
    assert beats[3]["dot"] is True
    assert any("surplus blank OCR beat slot" in warning for warning in normalized["warnings"])


def test_normalizer_preserves_surplus_nonempty_notation_for_review():
    payload = {
        "title": "Lossless Review Fixture",
        "time_signature": "4/4",
        "warnings": [],
        "sections": [
            {
                "type": "Verse",
                "measures": [
                    {
                        "beats": [
                            {"chord": chord, "bass": "", "circle": False, "dot": False, "x_marks": 0}
                            for chord in ["C", "D", "E", "F", "G"]
                        ]
                    }
                ],
            }
        ],
    }

    normalized = normalize_vision_song(payload, provider="fixture")
    beats = normalized["chart_json"]["sections"][0]["measures"][0]["beats"]

    assert len(beats) == 5
    assert [beat["chordState"]["root"] for beat in beats] == ["C", "D", "E", "F", "G"]
    assert any("all notation was preserved for review" in warning for warning in normalized["warnings"])


def _two_chord_vision_payload(time_signature, measure):
    return {
        "title": "Two Chord Handwriting Fixture",
        "time_signature": time_signature,
        "warnings": [],
        "sections": [{"type": "Verse", "measures": [measure]}],
    }


def test_unlined_two_chord_handwriting_defaults_to_beats_one_and_three_in_four_four():
    payload = _two_chord_vision_payload(
        "4/4",
        {
            "beat_underlines_visible": False,
            "beats": [
                {"chord": "C", "bass": "", "circle": True, "dot": False, "x_marks": 0},
                {"chord": "G/B", "bass": "", "circle": False, "dot": True, "x_marks": 1},
            ],
        },
    )

    normalized = normalize_vision_song(payload, provider="fixture")
    beats = normalized["chart_json"]["sections"][0]["measures"][0]["beats"]

    assert [beat["chordState"]["root"] for beat in beats] == ["C", "", "G", ""]
    assert beats[0]["circle"] is True
    assert beats[2]["bass"] == "B"
    assert beats[2]["dot"] is True
    assert beats[2]["xMarks"] == 1
    assert any("beats 1 and 3" in warning for warning in normalized["warnings"])


def test_unlined_two_chord_handwriting_defaults_to_beats_one_and_four_in_six_eight():
    payload = _two_chord_vision_payload(
        "6/8",
        {
            "beat_underlines_visible": False,
            "beats": [
                {"chord": "Am", "bass": "", "circle": False, "dot": False, "x_marks": 0},
                {"chord": "F", "bass": "", "circle": False, "dot": False, "x_marks": 0},
            ],
        },
    )

    normalized = normalize_vision_song(payload, provider="fixture")
    beats = normalized["chart_json"]["sections"][0]["measures"][0]["beats"]

    assert [beat["chordState"]["root"] for beat in beats] == ["A", "", "", "F", "", ""]
    assert beats[0]["chordState"]["minor"] is True
    assert any("beats 1 and 4" in warning for warning in normalized["warnings"])


def test_visible_beat_underlines_preserve_explicit_adjacent_chord_positions():
    payload = _two_chord_vision_payload(
        "4/4",
        {
            "beat_underlines_visible": True,
            "beats": [
                {"chord": "C", "bass": "", "circle": False, "dot": False, "x_marks": 0},
                {"chord": "G", "bass": "", "circle": False, "dot": False, "x_marks": 0},
                {"chord": "", "bass": "", "circle": False, "dot": False, "x_marks": 0},
                {"chord": "", "bass": "", "circle": False, "dot": False, "x_marks": 0},
            ],
        },
    )

    normalized = normalize_vision_song(payload, provider="fixture")
    beats = normalized["chart_json"]["sections"][0]["measures"][0]["beats"]

    assert [beat["chordState"]["root"] for beat in beats] == ["C", "G", "", ""]
    assert not any("without visible beat underlines" in warning for warning in normalized["warnings"])
