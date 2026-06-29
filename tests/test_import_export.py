import io
import json

import app as app_module
from import_service import normalize_vision_song


def configure_temp_storage(monkeypatch, tmp_path):
    database_path = tmp_path / "songs.db"
    chart_code_path = tmp_path / "chart_code"
    export_path = tmp_path / "exports"
    chart_images_path = tmp_path / "chart_images"
    monkeypatch.setattr(app_module, "DB_PATH", str(database_path))
    monkeypatch.setattr(app_module, "CHART_CODE_DIR", str(chart_code_path))
    monkeypatch.setattr(app_module, "EXPORT_DIR", str(export_path))
    monkeypatch.setattr(app_module, "LOCAL_IMAGE_DIR", str(chart_images_path))
    app_module.init_db()
    return database_path, chart_code_path, export_path, chart_images_path


def sample_song(title="Imported Song"):
    return {
        "title": title,
        "title_karen": "Karen Title",
        "key": "G",
        "tempo": "96",
        "chart_json": {
            "sections": [{
                "type": "Verse",
                "measures": [{
                    "beats": [{
                        "bass": "",
                        "chordState": {"root": "G", "flat": False, "minor": False, "triangle": False, "seven": False},
                        "circle": False,
                        "dot": False,
                        "editStack": ["root"],
                        "lead": [],
                        "manualUnderline": False,
                        "roll": False,
                        "xMarks": 0,
                    }],
                }],
            }],
            "beatsPerMeasure": 4,
        },
        "row_lead_json": {},
    }


def test_normalizes_vision_output_into_editor_beats():
    result = normalize_vision_song({
        "title": "Photo Song",
        "title_karen": "",
        "category": "Choir",
        "key": "Bb",
        "style": "Ballad",
        "tempo": "80",
        "confidence": 0.82,
        "warnings": ["Measure 2 is faint"],
        "sections": [{
            "type": "Chorus",
            "measures": [{"beats": [
                {"chord": "Bbm7", "bass": "F", "circle": True, "x_marks": 1, "dot": False},
                {"chord": "", "bass": "", "circle": False, "x_marks": 0, "dot": False},
                {"chord": "Eb7", "bass": "", "circle": False, "x_marks": 0, "dot": True},
                {"chord": "", "bass": "", "circle": False, "x_marks": 0, "dot": False},
            ]}],
        }],
    })

    first_beat = result["chart_json"]["sections"][0]["measures"][0]["beats"][0]
    assert first_beat["chordState"]["root"] == "B"
    assert first_beat["chordState"]["flat"] is True
    assert first_beat["chordState"]["minor"] is True
    assert first_beat["chordState"]["seven"] is True
    assert first_beat["circle"] is True
    assert result["confidence"] == 0.82


def test_json_import_recovery_mirroring_and_export(monkeypatch, tmp_path):
    _, chart_code_path, export_path, chart_images_path = configure_temp_storage(monkeypatch, tmp_path)
    payload = sample_song()
    chart_images_path.mkdir(parents=True)
    (chart_images_path / "song_20.json").write_text(json.dumps({"id": 20, **payload}), encoding="utf-8")

    first_recovery = app_module.recover_song_json_library()
    second_recovery = app_module.recover_song_json_library()
    assert first_recovery["recovered_ids"] == [20]
    assert second_recovery["recovered_ids"] == []
    assert (chart_code_path / "song_20.json").exists()

    client = app_module.app.test_client()
    import_response = client.post(
        "/api/import/json",
        data={"file": (io.BytesIO(json.dumps(payload).encode("utf-8")), "song.json")},
        content_type="multipart/form-data",
    )
    assert import_response.status_code == 200
    assert import_response.get_json()["chart_json"]["sections"][0]["type"] == "Verse"

    export_response = client.get("/api/export-song/20")
    assert export_response.status_code == 200
    assert export_response.headers["Content-Disposition"].startswith("attachment;")
    assert any(export_path.glob("*.json"))


def test_vision_import_route_returns_reviewable_draft(monkeypatch, tmp_path):
    configure_temp_storage(monkeypatch, tmp_path)
    expected = {**sample_song("OCR Song"), "confidence": 0.75, "warnings": ["Review the bridge"]}
    monkeypatch.setattr(app_module, "interpret_chart_upload", lambda *_args, **_kwargs: expected)
    client = app_module.app.test_client()

    response = client.post(
        "/api/import/vision",
        data={"file": (io.BytesIO(b"fake image"), "chart.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    assert response.get_json()["title"] == "OCR Song"
    assert response.get_json()["confidence"] == 0.75
