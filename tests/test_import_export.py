import json

import app as app_module
import import_service
from fastapi.testclient import TestClient
from import_service import normalize_vision_song


def configure_temp_storage(monkeypatch, tmp_path):
    database_path = tmp_path / "songs.db"
    chart_code_path = tmp_path / "chart_code"
    export_path = tmp_path / "exports"
    chart_images_path = tmp_path / "chart_images"
    monkeypatch.setattr(app_module, "BASE_DIR", tmp_path)
    monkeypatch.setattr(app_module, "DATA_DIR", tmp_path)
    monkeypatch.setattr(app_module, "DB_PATH", database_path)
    monkeypatch.setattr(app_module, "CHART_CODE_DIR", chart_code_path)
    monkeypatch.setattr(app_module, "EXPORT_DIR", export_path)
    monkeypatch.setattr(app_module, "LOCAL_IMAGE_DIR", chart_images_path)
    monkeypatch.setattr(app_module, "ATTACHMENT_DIR", tmp_path / "attachments")
    monkeypatch.setattr(app_module, "IMPORT_DIR", tmp_path / "imports")
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


def test_json_import_recovery_mirroring(monkeypatch, tmp_path):
    _, chart_code_path, _, chart_images_path = configure_temp_storage(monkeypatch, tmp_path)
    payload = sample_song()
    chart_images_path.mkdir(parents=True)
    (chart_images_path / "song_20.json").write_text(json.dumps({"id": 20, **payload}), encoding="utf-8")

    first_recovery = app_module.recover_song_json_library()
    second_recovery = app_module.recover_song_json_library()
    assert first_recovery["recovered_ids"] == [20]
    assert second_recovery["recovered_ids"] == []
    assert (chart_code_path / "song_20.json").exists()

    client = TestClient(app_module.app)
    import_response = client.post(
        "/api/import/json",
        files={"file": ("song.json", json.dumps(payload).encode("utf-8"), "application/json")},
    )
    assert import_response.status_code == 200
    assert import_response.json()["chart_json"]["sections"][0]["type"] == "Verse"


def test_vision_import_route_returns_reviewable_draft(monkeypatch, tmp_path):
    configure_temp_storage(monkeypatch, tmp_path)
    expected = {**sample_song("OCR Song"), "confidence": 0.75, "warnings": ["Review the bridge"]}
    monkeypatch.setattr(app_module, "interpret_chart_upload", lambda *_args, **_kwargs: expected)
    client = TestClient(app_module.app)

    response = client.post(
        "/api/import/vision",
        files={"file": ("chart.png", b"fake image", "image/png")},
    )

    assert response.status_code == 200
    assert response.json()["title"] == "OCR Song"
    assert response.json()["confidence"] == 0.75


def test_nvidia_vision_import_uses_openai_compatible_chat_endpoint(monkeypatch, tmp_path):
    configure_temp_storage(monkeypatch, tmp_path)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("NVIDIA_API_KEY", "nvapi-test-key")
    monkeypatch.setenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    monkeypatch.setenv("NVIDIA_VISION_MODEL", "meta/llama-3.2-11b-vision-instruct")

    class DummyResponse:
        def read(self):
            return json.dumps({
                "choices": [{
                    "message": {
                        "content": json.dumps(sample_song("NVIDIA OCR Song"))
                    }
                }]
            }).encode("utf-8")

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    def fake_urlopen(request, timeout=120):
        body = json.loads(request.data.decode("utf-8"))
        assert request.full_url == "https://integrate.api.nvidia.com/v1/chat/completions"
        assert request.headers["Authorization"] == "Bearer nvapi-test-key"
        assert body["model"] == "meta/llama-3.2-11b-vision-instruct"
        return DummyResponse()

    monkeypatch.setattr(import_service.urllib.request, "urlopen", fake_urlopen)

    result = app_module.interpret_chart_upload("chart.png", "image/png", b"fake image")
    assert result["title"] == "NVIDIA OCR Song"
