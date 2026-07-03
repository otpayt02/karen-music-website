from __future__ import annotations

import base64
import io
import json
import os
import re
import shutil
import sqlite3
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from import_service import interpret_chart_upload, normalize_vision_song

IS_FROZEN = getattr(sys, "frozen", False)
BASE_DIR = Path(__file__).resolve().parent
RESOURCE_DIR = Path(getattr(sys, "_MEIPASS", BASE_DIR))


def get_data_dir() -> Path:
    override = os.environ.get("KAREN_MUSIC_DATA_DIR")
    if override:
        return Path(os.path.expandvars(os.path.expanduser(override))).resolve()
    if IS_FROZEN:
        return Path(os.environ.get("LOCALAPPDATA") or Path.home()).resolve() / "Karen Music Director"
    return BASE_DIR


DATA_DIR = get_data_dir()
DB_PATH = DATA_DIR / "songs.db"
CHART_CODE_DIR = DATA_DIR / "chart_code"
EXPORT_DIR = DATA_DIR / "exports"
ATTACHMENT_DIR = DATA_DIR / "attachments"
IMPORT_DIR = DATA_DIR / "imports"
LOCAL_IMAGE_DIR = DATA_DIR / "chart_images"
SETTINGS_PATH = DATA_DIR / "app_settings.json"
INDEX_PATH = BASE_DIR / "index.html"

app = FastAPI(title="Karen Music Director")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_dirs() -> None:
    for path in (DATA_DIR, CHART_CODE_DIR, EXPORT_DIR, ATTACHMENT_DIR, IMPORT_DIR):
        Path(path).mkdir(parents=True, exist_ok=True)
    if IS_FROZEN:
        bundled_db = RESOURCE_DIR / "songs.db"
        if bundled_db.exists() and not DB_PATH.exists():
            shutil.copy2(bundled_db, DB_PATH)


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    cols = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(col["name"] == column for col in cols)


def init_db() -> None:
    ensure_dirs()
    conn = db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL DEFAULT '',
            title_karen TEXT NOT NULL DEFAULT '',
            category TEXT NOT NULL DEFAULT '',
            key TEXT NOT NULL DEFAULT '',
            current_key TEXT NOT NULL DEFAULT '',
            original_key TEXT NOT NULL DEFAULT '',
            style TEXT NOT NULL DEFAULT '',
            tempo TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            chart_json TEXT NOT NULL DEFAULT '{}',
            lyrics_json TEXT NOT NULL DEFAULT '[]',
            metadata_json TEXT NOT NULL DEFAULT '{}',
            tags_json TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL DEFAULT '',
            version INTEGER NOT NULL DEFAULT 1
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS song_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id INTEGER NOT NULL,
            version INTEGER NOT NULL,
            snapshot_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT '',
            FOREIGN KEY(song_id) REFERENCES songs(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id INTEGER,
            import_id INTEGER,
            kind TEXT NOT NULL DEFAULT '',
            filename TEXT NOT NULL DEFAULT '',
            stored_path TEXT NOT NULL DEFAULT '',
            mime_type TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT '',
            FOREIGN KEY(song_id) REFERENCES songs(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS imports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_filename TEXT NOT NULL DEFAULT '',
            source_path TEXT NOT NULL DEFAULT '',
            ocr_confidence REAL NOT NULL DEFAULT 0,
            uncertain_fields_json TEXT NOT NULL DEFAULT '[]',
            review_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL DEFAULT ''
        )
        """
    )
    conn.execute("CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts USING fts5(title, title_karen, notes, content='songs', content_rowid='id')")

    legacy_migrations = [
        ("songs", "metadata_json", "TEXT NOT NULL DEFAULT '{}'"),
        ("songs", "lyrics_json", "TEXT NOT NULL DEFAULT '[]'"),
        ("songs", "tags_json", "TEXT NOT NULL DEFAULT '[]'"),
        ("songs", "version", "INTEGER NOT NULL DEFAULT 1"),
    ]
    for table, column, ddl in legacy_migrations:
        if not column_exists(conn, table, column):
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")

    conn.execute(
        """
        UPDATE songs
        SET current_key = COALESCE(NULLIF(current_key, ''), key, ''),
            original_key = COALESCE(NULLIF(original_key, ''), key, current_key, ''),
            updated_at = COALESCE(NULLIF(updated_at, ''), created_at, ?),
            created_at = COALESCE(NULLIF(created_at, ''), ?),
            chart_json = CASE WHEN chart_json IS NULL OR chart_json = '' THEN '{}' ELSE chart_json END,
            lyrics_json = CASE WHEN lyrics_json IS NULL OR lyrics_json = '' THEN '[]' ELSE lyrics_json END,
            metadata_json = CASE WHEN metadata_json IS NULL OR metadata_json = '' THEN '{}' ELSE metadata_json END,
            tags_json = CASE WHEN tags_json IS NULL OR tags_json = '' THEN '[]' ELSE tags_json END
        """,
        (utc_now(), utc_now()),
    )
    conn.commit()
    conn.close()


def fetch_song_rows(where: str = "", args: Iterable[Any] = ()) -> list[dict[str, Any]]:
    conn = db()
    rows = conn.execute(f"SELECT * FROM songs {where} ORDER BY updated_at DESC, id DESC", tuple(args)).fetchall()
    conn.close()
    return [row_to_song(row) for row in rows]


def parse_json(value: str, default: Any) -> Any:
    try:
        return json.loads(value) if value else default
    except Exception:
        return default


def row_to_song(row: sqlite3.Row) -> dict[str, Any]:
    song = {
        "id": row["id"],
        "title": row["title"],
        "title_karen": row["title_karen"],
        "category": row["category"],
        "key": row["key"],
        "current_key": row["current_key"],
        "original_key": row["original_key"],
        "style": row["style"],
        "tempo": row["tempo"],
        "notes": row["notes"],
        "chart_json": parse_json(row["chart_json"], {}),
        "lyrics_json": parse_json(row["lyrics_json"], []),
        "metadata_json": parse_json(row["metadata_json"], {}),
        "tags_json": parse_json(row["tags_json"], []),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "version": row["version"],
    }
    song["performed_dates"] = []
    song["reference_media"] = {}
    song["file_metadata"] = []
    song["created_date"] = song["created_at"][:10] if song["created_at"] else ""
    song["next_performance_date"] = ""
    song["date_performed"] = ""
    song["chart_bundle"] = {
        "sections": song["chart_json"].get("sections", []) if isinstance(song["chart_json"], dict) else [],
        "onlySpans": song["chart_json"].get("onlySpans", []) if isinstance(song["chart_json"], dict) else [],
        "slurs": song["chart_json"].get("slurs", []) if isinstance(song["chart_json"], dict) else [],
        "lyricsSections": song["lyrics_json"],
        "beatsPerMeasure": song["chart_json"].get("beatsPerMeasure", 4) if isinstance(song["chart_json"], dict) else 4,
        "defaultMeasuresPerRow": song["chart_json"].get("defaultMeasuresPerRow", 4) if isinstance(song["chart_json"], dict) else 4,
        "rowDefaultExplicit": song["chart_json"].get("rowDefaultExplicit", False) if isinstance(song["chart_json"], dict) else False,
    }
    song["rowleadjson"] = song["metadata_json"].get("rowLead", {}) if isinstance(song["metadata_json"], dict) else {}
    return song


def legacy_song_from_row(row: sqlite3.Row) -> dict[str, Any]:
    song = row_to_song(row)
    chart = song.get("chart_bundle", {})
    return {
        "id": song["id"],
        "title": song["title"],
        "title_karen": song["title_karen"],
        "category": song["category"],
        "key": song["key"],
        "current_key": song["current_key"],
        "original_key": song["original_key"],
        "style": song["style"],
        "tempo": song["tempo"],
        "created_date": song["created_date"],
        "next_performance_date": song["next_performance_date"],
        "date_performed": song["date_performed"],
        "performed_dates": song["performed_dates"],
        "reference_media": song["reference_media"],
        "file_metadata": song["file_metadata"],
        "notes": song["notes"],
        "chart_json": chart,
        "rowleadjson": song["rowleadjson"],
    }


def normalize_legacy_payload(payload: dict[str, Any]) -> dict[str, Any]:
    chart = payload.get("chart_json") or {}
    if not isinstance(chart, dict):
        chart = {}
    row_lead = payload.get("rowleadjson")
    if row_lead is None:
        row_lead = payload.get("row_lead_json") or payload.get("rowLead") or {}
    return {
        "title": payload.get("title", ""),
        "title_karen": payload.get("title_karen", ""),
        "category": payload.get("category", ""),
        "key": payload.get("key", payload.get("current_key", "")),
        "current_key": payload.get("current_key", payload.get("key", "")),
        "original_key": payload.get("original_key", payload.get("key", "")),
        "style": payload.get("style", ""),
        "tempo": payload.get("tempo", ""),
        "notes": payload.get("notes", ""),
        "chart_json": chart,
        "lyrics_json": payload.get("lyrics_json") or chart.get("lyricsSections") or [],
        "metadata_json": {
            "created_date": payload.get("created_date", ""),
            "next_performance_date": payload.get("next_performance_date", ""),
            "performed_dates": payload.get("performed_dates", []),
            "reference_media": payload.get("reference_media", {}),
            "file_metadata": payload.get("file_metadata", []),
            "rowLead": row_lead,
        },
        "tags_json": payload.get("tags_json") or [],
    }


def snapshot_song(song: dict[str, Any]) -> str:
    return json.dumps(song, ensure_ascii=False, indent=2)


def upsert_search_index(conn: sqlite3.Connection, song: dict[str, Any]) -> None:
    conn.execute("DELETE FROM songs_fts WHERE rowid = ?", (song["id"],))
    conn.execute(
        "INSERT INTO songs_fts(rowid, title, title_karen, notes) VALUES (?, ?, ?, ?)",
        (song["id"], song["title"], song["title_karen"], song["notes"]),
    )


def save_song(song_id: int | None, payload: dict[str, Any]) -> dict[str, Any]:
    payload = normalize_legacy_payload(payload)
    conn = db()
    now = utc_now()
    chart_json = json.dumps(payload.get("chart_json") or {}, ensure_ascii=False)
    lyrics_json = json.dumps(payload.get("lyrics_json") or [], ensure_ascii=False)
    metadata_json = json.dumps(payload.get("metadata_json") or {}, ensure_ascii=False)
    tags_json = json.dumps(payload.get("tags_json") or [], ensure_ascii=False)
    base = {
        "title": payload.get("title", ""),
        "title_karen": payload.get("title_karen", ""),
        "category": payload.get("category", ""),
        "key": payload.get("key", ""),
        "current_key": payload.get("current_key", payload.get("key", "")),
        "original_key": payload.get("original_key", payload.get("key", "")),
        "style": payload.get("style", ""),
        "tempo": payload.get("tempo", ""),
        "notes": payload.get("notes", ""),
        "chart_json": chart_json,
        "lyrics_json": lyrics_json,
        "metadata_json": metadata_json,
        "tags_json": tags_json,
        "updated_at": now,
    }
    if song_id is None:
        base["created_at"] = now
        columns = ",".join(base.keys())
        placeholders = ",".join(["?"] * len(base))
        cur = conn.execute(f"INSERT INTO songs ({columns}) VALUES ({placeholders})", tuple(base.values()))
        song_id = int(cur.lastrowid)
        song = conn.execute("SELECT * FROM songs WHERE id = ?", (song_id,)).fetchone()
    else:
        conn.execute(
            """
            UPDATE songs
            SET title=:title, title_karen=:title_karen, category=:category, key=:key,
                current_key=:current_key, original_key=:original_key, style=:style,
                tempo=:tempo, notes=:notes, chart_json=:chart_json, lyrics_json=:lyrics_json,
                metadata_json=:metadata_json, tags_json=:tags_json, updated_at=:updated_at
            WHERE id=:id
            """,
            {**base, "id": song_id},
        )
        song = conn.execute("SELECT * FROM songs WHERE id = ?", (song_id,)).fetchone()
    song_dict = legacy_song_from_row(song)
    conn.execute(
        "INSERT INTO song_versions(song_id, version, snapshot_json, created_at) VALUES (?, ?, ?, ?)",
        (song_id, song_dict["version"], snapshot_song(song_dict), now),
    )
    upsert_search_index(conn, song_dict)
    conn.commit()
    conn.close()
    return song_dict


def recover_song_json_library() -> dict[str, Any]:
    recovered = []
    for folder in (LOCAL_IMAGE_DIR, DATA_DIR / "chart_code", BASE_DIR / "chart_code"):
        folder = Path(folder)
        if not folder.exists():
            continue
        for path in folder.glob("song_*.json"):
            target = CHART_CODE_DIR / path.name
            if not target.exists():
                shutil.copy2(path, target)
                recovered.append(int(re.search(r"(\d+)", path.stem).group(1)))
    return {"recovered_ids": recovered}


@app.on_event("startup")
def startup() -> None:
    init_db()
    recover_song_json_library()


@app.get("/api/settings")
def get_settings() -> dict[str, Any]:
    if SETTINGS_PATH.exists():
        return json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
    return {"default_song_dir": str(DATA_DIR), "alt_song_dir": ""}


@app.put("/api/settings")
def put_settings(payload: dict[str, Any]) -> dict[str, Any]:
    SETTINGS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


@app.get("/api/songs")
def api_songs(q: str | None = None, tag: str | None = None) -> list[dict[str, Any]]:
    if q:
        conn = db()
        rows = conn.execute(
            """
            SELECT songs.*
            FROM songs_fts
            JOIN songs ON songs_fts.rowid = songs.id
            WHERE songs_fts MATCH ?
            ORDER BY songs.updated_at DESC
            """,
            (q,),
        ).fetchall()
        conn.close()
        songs = [legacy_song_from_row(row) for row in rows]
    else:
        songs = fetch_song_rows()
    if tag:
        songs = [song for song in songs if tag in (song.get("tags_json") or [])]
    return songs


@app.get("/api/songs/{song_id}")
def api_song(song_id: int) -> dict[str, Any]:
    conn = db()
    row = conn.execute("SELECT * FROM songs WHERE id = ?", (song_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Song not found")
    return legacy_song_from_row(row)


@app.post("/api/songs")
def create_song(payload: dict[str, Any]) -> dict[str, Any]:
    return save_song(None, payload)


@app.put("/api/songs/{song_id}")
def update_song(song_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    conn = db()
    exists = conn.execute("SELECT id FROM songs WHERE id = ?", (song_id,)).fetchone()
    conn.close()
    if not exists:
        raise HTTPException(404, "Song not found")
    return save_song(song_id, payload)


@app.delete("/api/songs/{song_id}")
def delete_song(song_id: int) -> dict[str, Any]:
    conn = db()
    conn.execute("DELETE FROM songs WHERE id = ?", (song_id,))
    conn.execute("DELETE FROM song_versions WHERE song_id = ?", (song_id,))
    conn.execute("DELETE FROM attachments WHERE song_id = ?", (song_id,))
    conn.execute("DELETE FROM songs_fts WHERE rowid = ?", (song_id,))
    conn.commit()
    conn.close()
    return {"success": True}


@app.post("/api/songs/{song_id}/files")
async def add_song_file(song_id: int, file: UploadFile = File(...)) -> dict[str, Any]:
    song_dir = ATTACHMENT_DIR / f"song_{song_id}"
    song_dir.mkdir(parents=True, exist_ok=True)
    stored_name = Path(file.filename).name
    target = song_dir / stored_name
    target.write_bytes(await file.read())
    attachment = {
        "id": f"file-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "filename": file.filename,
        "stored_filename": stored_name,
        "url": f"/api/songs/{song_id}/files/{stored_name}/download",
        "mime_type": file.content_type or "",
        "uploaded": True,
    }
    conn = db()
    row = conn.execute("SELECT metadata_json FROM songs WHERE id = ?", (song_id,)).fetchone()
    if row:
        metadata = parse_json(row["metadata_json"], {})
        metadata["fileMetadata"] = metadata.get("fileMetadata", []) + [attachment]
        conn.execute("UPDATE songs SET metadata_json = ?, updated_at = ? WHERE id = ?", (json.dumps(metadata, ensure_ascii=False), utc_now(), song_id))
        conn.commit()
    conn.close()
    return {"success": True, "files": [attachment]}


@app.delete("/api/songs/{song_id}/files/{file_id}")
def delete_song_file(song_id: int, file_id: str) -> dict[str, Any]:
    conn = db()
    row = conn.execute("SELECT metadata_json FROM songs WHERE id = ?", (song_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Song not found")
    metadata = parse_json(row["metadata_json"], {})
    files = metadata.get("fileMetadata", [])
    kept = [item for item in files if str(item.get("id")) != str(file_id)]
    metadata["fileMetadata"] = kept
    conn.execute("UPDATE songs SET metadata_json = ?, updated_at = ? WHERE id = ?", (json.dumps(metadata, ensure_ascii=False), utc_now(), song_id))
    conn.commit()
    conn.close()
    return {"success": True, "files": kept}


@app.get("/api/songs/{song_id}/files/{filename}/download")
def download_song_file(song_id: int, filename: str) -> FileResponse:
    path = ATTACHMENT_DIR / f"song_{song_id}" / Path(filename).name
    if not path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(path)


@app.post("/api/import/png")
async def import_png(file: UploadFile = File(...)) -> dict[str, Any]:
    content = await file.read()
    review = interpret_chart_upload(file.filename, file.content_type, content, api_key=os.environ.get("OPENAI_API_KEY"))
    source_path = IMPORT_DIR / f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{Path(file.filename).name}"
    source_path.write_bytes(content)
    import_conn = db()
    import_row = {
        "source_filename": file.filename,
        "source_path": str(source_path),
        "ocr_confidence": review.get("confidence", 0),
        "uncertain_fields_json": json.dumps(review.get("warnings", []), ensure_ascii=False),
        "review_json": json.dumps(review, ensure_ascii=False),
        "created_at": utc_now(),
    }
    cur = import_conn.execute(
        """
        INSERT INTO imports(source_filename, source_path, ocr_confidence, uncertain_fields_json, review_json, created_at)
        VALUES (:source_filename, :source_path, :ocr_confidence, :uncertain_fields_json, :review_json, :created_at)
        """,
        import_row,
    )
    import_id = int(cur.lastrowid)
    import_conn.commit()
    import_conn.close()
    review["import_id"] = import_id
    review["source_filename"] = file.filename
    review["source_path"] = str(source_path)
    review["kind"] = "png-import"
    return review


@app.post("/api/import/vision")
async def import_vision(file: UploadFile = File(...)) -> dict[str, Any]:
    return await import_png(file)


@app.post("/api/import/json")
async def import_json(file: UploadFile = File(...)) -> dict[str, Any]:
    payload = json.loads((await file.read()).decode("utf-8"))
    return payload


@app.post("/api/recover-library")
def recover_library() -> dict[str, Any]:
    return recover_song_json_library()


@app.get("/api/translations/latest")
def translations_latest() -> dict[str, Any]:
    return {"language": "en", "items": {}}


@app.get("/api/translations/catalog")
def translations_catalog() -> dict[str, Any]:
    return {"files": []}


@app.get("/api/translations/catalog.txt")
def translations_catalog_txt() -> str:
    return ""


@app.post("/api/translations/sync")
def translations_sync() -> dict[str, Any]:
    return {"success": True}


@app.post("/api/settings/pick-folder")
def pick_folder() -> dict[str, Any]:
    return {"selected_folder": ""}


@app.get("/api/export-db")
def export_db() -> FileResponse:
    return FileResponse(DB_PATH, filename="songs.db")


@app.get("/api/export-json")
def export_json_legacy() -> JSONResponse:
    return JSONResponse(fetch_song_rows())


@app.get("/api/export-song/{song_id}")
def export_song_legacy(song_id: int) -> JSONResponse:
    return JSONResponse(api_song(song_id))


@app.get("/api/export/json")
def export_json() -> JSONResponse:
    return JSONResponse(fetch_song_rows())


@app.get("/api/export/song/{song_id}")
def export_song(song_id: int) -> JSONResponse:
    return JSONResponse(api_song(song_id))


@app.get("/api/backup")
def backup_db() -> FileResponse:
    return FileResponse(DB_PATH, filename="songs.db")


@app.get("/")
def index() -> HTMLResponse:
    if INDEX_PATH.exists():
        return HTMLResponse(INDEX_PATH.read_text(encoding="utf-8"))
    return HTMLResponse("<!doctype html><html><body><div id='root'></div></body></html>")


@app.get("/print/{song_id}")
def print_song(song_id: int) -> HTMLResponse:
    return HTMLResponse(f"<meta http-equiv='refresh' content='0; url=/?songId={song_id}&mode=print'>")


if (BASE_DIR / "static").exists():
    app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


def main() -> None:
    import uvicorn

    port = int(os.environ.get("UVICORN_PORT", "5000"))
    uvicorn.run("app:app", host="127.0.0.1", port=port, reload=False)


if __name__ == "__main__":
    main()
