import tempfile
from pathlib import Path
import json
import base64

import app as app_module
from import_service import normalize_vision_song, parse_ocr_text


def test_migration_creates_schema(monkeypatch):
    tmp_path = Path(tempfile.mkdtemp(dir=str(Path.cwd()), prefix="pytest-local-"))
    monkeypatch.setattr(app_module, "DATA_DIR", tmp_path)
    monkeypatch.setattr(app_module, "DB_PATH", tmp_path / "songs.db")
    monkeypatch.setattr(app_module, "CHART_CODE_DIR", tmp_path / "chart_code")
    monkeypatch.setattr(app_module, "EXPORT_DIR", tmp_path / "exports")
    monkeypatch.setattr(app_module, "ATTACHMENT_DIR", tmp_path / "attachments")
    monkeypatch.setattr(app_module, "IMPORT_DIR", tmp_path / "imports")
    app_module.init_db()
    conn = app_module.db()
    tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    conn.close()
    assert {"songs", "song_versions", "attachments", "imports"}.issubset(tables)


def test_normalize_vision_song_builds_chart_payload():
    result = normalize_vision_song({
        "title": "Song",
        "title_karen": "Karen",
        "category": "Choir",
        "key": "G",
        "style": "Ballad",
        "tempo": "92",
        "confidence": 0.8,
        "warnings": ["unclear ending"],
        "sections": [{"type": "Verse", "measures": [{"beats": [{"chord": "G", "bass": "", "circle": True, "x_marks": 0, "dot": False}]}]}],
    })
    assert result["chart_json"]["sections"][0]["measures"][0]["beats"][0]["chordState"]["root"] == "G"
    assert result["confidence"] == 0.8


def test_parse_ocr_text_detects_basic_metadata():
    parsed = parse_ocr_text("My Song\nKaren title\nKey: Bb\nTempo: 84\nVerse 1")
    assert parsed["title"] == "My Song"
    assert parsed["title_karen"] == "Karen title"
    assert parsed["key"] == "Bb"
    assert parsed["tempo"] == "84"
    assert parsed["sections"][0]["type"] == "Verse"


def test_save_song_accepts_editor_payload_and_overwrites_chart_images(monkeypatch):
    tmp_path = Path(tempfile.mkdtemp(dir=str(Path.cwd()), prefix="pytest-local-"))
    monkeypatch.setattr(app_module, "DATA_DIR", tmp_path)
    monkeypatch.setattr(app_module, "DB_PATH", tmp_path / "songs.db")
    monkeypatch.setattr(app_module, "CHART_CODE_DIR", tmp_path / "chart_code")
    monkeypatch.setattr(app_module, "EXPORT_DIR", tmp_path / "exports")
    monkeypatch.setattr(app_module, "ATTACHMENT_DIR", tmp_path / "attachments")
    monkeypatch.setattr(app_module, "IMPORT_DIR", tmp_path / "imports")
    monkeypatch.setattr(app_module, "LOCAL_IMAGE_DIR", tmp_path / "chart_images")
    app_module.init_db()

    png = b"\x89PNG\r\n\x1a\n" + b"first"
    payload = {
        "title": "Autosave Test",
        "chartjson": {"sections": [{"type": "Intro", "measures": []}], "beatsPerMeasure": 4},
        "chartpngdataurl": "data:image/png;base64," + base64.b64encode(png).decode("ascii"),
    }
    created = app_module.save_song(None, payload)
    song_id = created["id"]

    image_path = app_module.LOCAL_IMAGE_DIR / f"song_{song_id}.png"
    json_path = app_module.LOCAL_IMAGE_DIR / f"song_{song_id}.json"
    assert image_path.read_bytes() == png
    assert json.loads(json_path.read_text(encoding="utf-8"))["chart_json"]["sections"][0]["type"] == "Intro"

    updated_png = b"\x89PNG\r\n\x1a\n" + b"updated"
    payload["chartpngdataurl"] = "data:image/png;base64," + base64.b64encode(updated_png).decode("ascii")
    app_module.save_song(song_id, payload)
    assert image_path.read_bytes() == updated_png
