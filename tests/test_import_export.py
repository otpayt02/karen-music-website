import json

import app as app_module
import import_service
from fastapi.testclient import TestClient
from import_service import IMPORT_CRITERIA, normalize_vision_song, parse_chart_text


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
        "time_signature": "6/8",
        "instruments": ["Piano 1", "Drums"],
        "song_group": "Youth",
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
    assert result["chart_json"]["beatsPerMeasure"] == 6
    assert len(result["chart_json"]["sections"][0]["measures"][0]["beats"]) == 6
    assert result["instruments"] == "Piano 1, Drums"
    assert result["chart_json"]["songGroup"] == "Youth"


def test_import_criteria_exposes_every_supported_source(monkeypatch, tmp_path):
    configure_temp_storage(monkeypatch, tmp_path)
    client = TestClient(app_module.app)

    response = client.get("/api/import/criteria")

    assert response.status_code == 200
    extensions = {extension for source in response.json()["accepted_sources"] for extension in source["extensions"]}
    assert {".json", ".txt", ".chordpro", ".png", ".jpg", ".pdf"}.issubset(extensions)
    assert "beat positions" in response.json()["chart_fields"]
    assert response.json()["version"] == IMPORT_CRITERIA["version"]


def test_text_chart_code_fills_metadata_structure_and_marks(monkeypatch, tmp_path):
    configure_temp_storage(monkeypatch, tmp_path)
    client = TestClient(app_module.app)
    chart_code = """Title: Text Import Song
Karen Title: တၢ်သးဝံၣ်
Category: Youth
Current Key: G
Original Key: Bb
Style: Worship
Tempo: 84
Time: 6/8
Instruments: Piano 1, Drums
Group: Youth Team
[Verse]
| (G) - C. - x - | D/F# - Em - G - |
"""

    response = client.post(
        "/api/import/code",
        files={"file": ("song.chordpro", chart_code.encode("utf-8"), "text/plain")},
    )

    assert response.status_code == 200, response.text
    result = response.json()
    first_measure = result["chart_json"]["sections"][0]["measures"][0]
    assert result["title"] == "Text Import Song"
    assert result["current_key"] == "G"
    assert result["original_key"] == "Bb"
    assert result["instruments"] == "Piano 1, Drums"
    assert result["chart_json"]["beatsPerMeasure"] == 6
    assert result["chart_json"]["songGroup"] == "Youth Team"
    assert first_measure["beats"][0]["circle"] is True
    assert first_measure["beats"][2]["dot"] is True
    assert first_measure["beats"][4]["xMarks"] == 1
    assert result["import_review"]["source_kind"] == "text-chart"


def test_parse_chart_text_supports_inline_chordpro_chords():
    result = parse_chart_text("{title: Inline Song}\n{key: C}\n{start_of_chorus}\n[C]Praise [G/B]the [Am]Lord [F]today")

    beats = result["chart_json"]["sections"][0]["measures"][0]["beats"]
    assert [beat["chordState"]["root"] for beat in beats] == ["C", "G", "A", "F"]
    assert beats[1]["bass"] == "B"


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
    assert import_response.json()["import_review"]["source_kind"] == "editor-json"


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


def test_pdf_vision_import_uses_the_same_reviewable_route(monkeypatch, tmp_path):
    configure_temp_storage(monkeypatch, tmp_path)
    expected = {**sample_song("PDF OCR Song"), "confidence": 0.81, "warnings": ["Page 2 ending is faint"]}
    monkeypatch.setattr(app_module, "interpret_chart_upload", lambda *_args, **_kwargs: expected)
    client = TestClient(app_module.app)

    response = client.post(
        "/api/import/vision",
        files={"file": ("chart.pdf", b"%PDF-fake", "application/pdf")},
    )

    assert response.status_code == 200
    assert response.json()["title"] == "PDF OCR Song"
    assert response.json()["source_filename"] == "chart.pdf"


def test_imported_metadata_persists_after_save_and_reload(monkeypatch, tmp_path):
    configure_temp_storage(monkeypatch, tmp_path)
    client = TestClient(app_module.app)
    payload = sample_song("Persistent Import")
    payload.update({
        "instruments": "Piano 1, Drums",
        "created_date": "2026-07-16",
        "next_performance_date": "2026-08-02",
        "performed_dates": ["2026-07-10"],
    })
    payload["chart_json"]["songGroup"] = "Youth Team"

    created = client.post("/api/songs", json=payload)
    assert created.status_code == 200, created.text
    loaded = client.get(f"/api/songs/{created.json()['id']}")

    assert loaded.status_code == 200
    assert loaded.json()["instruments"] == "Piano 1, Drums"
    assert loaded.json()["created_date"] == "2026-07-16"
    assert loaded.json()["next_performance_date"] == "2026-08-02"
    assert loaded.json()["performed_dates"] == ["2026-07-10"]
    assert loaded.json()["chart_json"]["songGroup"] == "Youth Team"


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
