import json
import sqlite3
from pathlib import Path

from tools.sync_chart_images_to_db import reconcile


def create_database(path: Path) -> None:
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            title_karen TEXT,
            category TEXT,
            key TEXT,
            current_key TEXT,
            original_key TEXT,
            style TEXT,
            tempo TEXT,
            notes TEXT,
            chart_json TEXT,
            lyrics_json TEXT,
            metadata_json TEXT NOT NULL DEFAULT '{}',
            tags_json TEXT NOT NULL DEFAULT '[]',
            created_at TEXT,
            updated_at TEXT,
            version INTEGER NOT NULL DEFAULT 1,
            chart_image_path TEXT,
            file_metadata_json TEXT,
            instruments TEXT,
            raw_editor_text TEXT,
            row_lead_json TEXT,
            created_date TEXT,
            next_performance_date TEXT,
            performed_dates_json TEXT,
            reference_media_json TEXT
        );
        CREATE VIRTUAL TABLE songs_fts USING fts5(
            title, title_karen, notes, content='songs', content_rowid='id'
        );
        """
    )
    conn.execute(
        """
        INSERT INTO songs(
            id, title, chart_json, metadata_json, tags_json, created_at, updated_at,
            file_metadata_json
        ) VALUES (1, 'Old title', '{}', '{}', '[]', 'old', 'old', '[]')
        """
    )
    conn.execute(
        """
        INSERT INTO songs(
            id, title, chart_json, metadata_json, tags_json, created_at, updated_at,
            file_metadata_json
        ) VALUES (2, 'Historical only', '{}', '{}', '[]', 'old', 'old', '[]')
        """
    )
    conn.commit()
    conn.close()


def write_sources(folder: Path) -> None:
    folder.mkdir()
    payload = {
        "id": 1,
        "title": "Folder Song",
        "title_karen": "ကညီ",
        "category": "Youth",
        "key": "G",
        "style": "Go Go",
        "tempo": 100,
        "chart_json": {"sections": [{"type": "Verse", "measures": []}]},
        "performed_dates": [],
        "reference_media": {},
        "file_metadata": [],
    }
    (folder / "song_1.json").write_text(json.dumps(payload), encoding="utf-8")
    (folder / "folder_song.pdf").write_bytes(b"%PDF-test")


def test_dry_run_reports_without_mutating(tmp_path):
    database = tmp_path / "songs.db"
    folder = tmp_path / "chart_images"
    create_database(database)
    write_sources(folder)

    report = reconcile(database, folder, False, tmp_path / "backups")

    assert report["songs_before"] == 2
    assert report["songs_after"] == 3
    assert report["covered_files"] == 2
    conn = sqlite3.connect(database)
    assert conn.execute("SELECT title FROM songs WHERE id=1").fetchone()[0] == "Old title"
    conn.close()


def test_apply_updates_json_adds_missing_file_and_preserves_history(tmp_path):
    database = tmp_path / "songs.db"
    folder = tmp_path / "chart_images"
    backup_dir = tmp_path / "backups"
    create_database(database)
    write_sources(folder)

    report = reconcile(database, folder, True, backup_dir)

    assert report["songs_before"] == 2
    assert report["songs_after"] == 3
    assert report["covered_files"] == 2
    assert Path(report["backup"]).exists()
    conn = sqlite3.connect(database)
    conn.row_factory = sqlite3.Row
    updated = conn.execute("SELECT * FROM songs WHERE id=1").fetchone()
    historical = conn.execute("SELECT * FROM songs WHERE id=2").fetchone()
    reference = conn.execute("SELECT * FROM songs WHERE id=3").fetchone()
    assert updated["title"] == "Folder Song"
    assert json.loads(updated["chart_json"])["sections"][0]["type"] == "Verse"
    assert historical["title"] == "Historical only"
    assert reference["title"] == "Folder Song"
    assert reference["chart_image_path"].endswith("folder_song.pdf")
    assert conn.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    conn.close()


def test_apply_is_idempotent(tmp_path):
    database = tmp_path / "songs.db"
    folder = tmp_path / "chart_images"
    create_database(database)
    write_sources(folder)

    reconcile(database, folder, True, tmp_path / "backups")
    second = reconcile(database, folder, True, tmp_path / "backups")

    assert second["songs_before"] == 3
    assert second["songs_after"] == 3
    assert second["reference_songs_created"] == []
