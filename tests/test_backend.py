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


def test_save_song_preserves_reference_media_and_legacy_fields(monkeypatch):
    tmp_path = Path(tempfile.mkdtemp(dir=str(Path.cwd()), prefix="pytest-local-"))
    monkeypatch.setattr(app_module, "DATA_DIR", tmp_path)
    monkeypatch.setattr(app_module, "DB_PATH", tmp_path / "songs.db")
    monkeypatch.setattr(app_module, "CHART_CODE_DIR", tmp_path / "chart_code")
    monkeypatch.setattr(app_module, "EXPORT_DIR", tmp_path / "exports")
    monkeypatch.setattr(app_module, "ATTACHMENT_DIR", tmp_path / "attachments")
    monkeypatch.setattr(app_module, "IMPORT_DIR", tmp_path / "imports")
    monkeypatch.setattr(app_module, "LOCAL_IMAGE_DIR", tmp_path / "chart_images")
    app_module.init_db()

    row_lead = {"0:0": {"baseOctave": 5, "cells": {"base:0": "3"}, "enabled": True}}
    file_metadata = [{"id": "file-1", "name": "song.json", "kind": "Editor JSON"}]
    reference_media = {
        "videos": [
            {"url": "https://www.youtube.com/watch?v=new-video", "kind": "youtube"},
            {
                "url": "https://www.facebook.com/watch/?v=old-facebook",
                "kind": "facebook",
                "label": "Original Facebook reference",
            },
            {"url": "https://example.org/rehearsal.mp4", "kind": "rehearsal"},
        ],
        "images": [{"id": "image-1", "url": "https://example.org/reference.jpg"}],
        "info": "Reference notes survive",
        "customMediaNote": "Keep arbitrary reference_media keys",
    }
    payload = {
        "title": "Fully Populated",
        "title_karen": "Karen Title",
        "category": "Choir",
        "key": "G",
        "current_key": "G",
        "original_key": "G",
        "style": "Praise",
        "tempo": "96",
        "notes": "Director notes",
        "chart_json": {"sections": [], "raw": "G | C | D"},
        "lyrics_json": [{"title": "Verse", "karenText": "Lyrics"}],
        "tags_json": ["legacy", "choir"],
        "reference_media": reference_media,
        "youtubeUrl": "https://www.youtube.com/watch?v=new-video",
        "facebookUrl": "https://www.facebook.com/watch/?v=old-facebook",
        "performanceUrl": "",
        "rowleadjson": row_lead,
        "file_metadata": file_metadata,
        "instruments": "Piano, Guitar",
        "created_date": "2024-01-02",
        "performed_dates": ["2026-10-04", "2026-10-11"],
        "next_performance_date": "2026-11-08",
        "date_performed": "2026-10-11",
    }

    created = app_module.save_song(None, payload)

    assert created["reference_media"] == reference_media
    assert created["rowleadjson"] == row_lead
    assert created["file_metadata"] == file_metadata
    assert created["instruments"] == "Piano, Guitar"
    assert created["created_date"] == "2024-01-02"
    assert created["performed_dates"] == ["2026-10-04", "2026-10-11"]
    assert created["next_performance_date"] == "2026-11-08"
    assert created["date_performed"] == "2026-10-11"

    loaded = app_module.fetch_song_rows("WHERE id = ?", (created["id"],))[0]
    assert loaded["metadata_json"]["reference_media"] == reference_media
    assert loaded["metadata_json"]["rowLead"] == row_lead
    assert loaded["metadata_json"]["fileMetadata"] == file_metadata
    assert loaded["metadata_json"]["instruments"] == "Piano, Guitar"
