"""Reconcile the local Karen Music song database with chart_images.

The folder is treated as a local source library:

* ``song_<id>.json`` files update the matching song without deleting rows.
* PDFs and images are attached to an existing matching record or get a small
  reference-only song record when no record references that file.
* Every run is idempotent and ``--apply`` creates a timestamped backup first.

This tool never uploads files, calls an OCR provider, or deletes song history.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SUPPORTED_BINARY_SUFFIXES = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}
JSON_SONG_PATTERN = re.compile(r"^song_(\d+)\.json$", re.IGNORECASE)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_json(value: Any, default: Any) -> Any:
    if isinstance(value, type(default)):
        return value
    if not value:
        return default
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return default
    return parsed if isinstance(parsed, type(default)) else default


def title_from_filename(path: Path) -> str:
    title = re.sub(r"[_-]+", " ", path.stem).strip()
    return " ".join(word.capitalize() for word in title.split()) or "Untitled chart"


def source_file_entry(path: Path, kind: str) -> dict[str, Any]:
    resolved = path.resolve()
    digest = hashlib.sha256(str(resolved).lower().encode("utf-8")).hexdigest()[:20]
    return {
        "id": f"chart-images-{digest}",
        "name": path.name,
        "kind": kind,
        "path": str(resolved),
        "url": "",
        "notes": "Linked from the local chart_images library.",
        "stored_filename": "",
        "original_filename": path.name,
        "uploaded": False,
        "size": path.stat().st_size,
        "added_at": utc_now(),
    }


def merge_file_entry(items: list[dict[str, Any]], entry: dict[str, Any]) -> list[dict[str, Any]]:
    target_name = Path(str(entry["path"])).name.lower()
    kept = [
        item
        for item in items
        if not (
            isinstance(item, dict)
            and (
                str(item.get("id", "")) == entry["id"]
                or Path(str(item.get("path") or item.get("original_filename") or "")).name.lower() == target_name
            )
        )
    ]
    return [*kept, entry]


def column_names(conn: sqlite3.Connection) -> set[str]:
    return {str(row[1]) for row in conn.execute("PRAGMA table_info(songs)")}


def row_file_names(row: sqlite3.Row) -> set[str]:
    names: set[str] = set()
    chart_path = row["chart_image_path"] if "chart_image_path" in row.keys() else ""
    if chart_path:
        names.add(Path(str(chart_path)).name.lower())
    metadata = parse_json(row["metadata_json"] if "metadata_json" in row.keys() else "{}", {})
    file_items = metadata.get("fileMetadata", metadata.get("file_metadata", []))
    legacy_items = parse_json(row["file_metadata_json"] if "file_metadata_json" in row.keys() else "[]", [])
    for item in [*(file_items or []), *legacy_items]:
        if isinstance(item, dict):
            value = item.get("path") or item.get("original_filename") or item.get("name")
            if value:
                names.add(Path(str(value)).name.lower())
    return names


def normalized_song_values(payload: dict[str, Any], existing: sqlite3.Row, source: Path) -> dict[str, Any]:
    current_metadata = parse_json(existing["metadata_json"] if "metadata_json" in existing.keys() else "{}", {})
    source_entry = source_file_entry(source, "Editor JSON")
    current_files = current_metadata.get("fileMetadata", current_metadata.get("file_metadata", []))
    current_files = current_files if isinstance(current_files, list) else []

    payload_files = payload.get("file_metadata")
    if not isinstance(payload_files, list):
        payload_files = parse_json(payload.get("file_metadata_json"), [])
    merged_files = list(current_files)
    for item in payload_files:
        if isinstance(item, dict):
            merged_files = merge_file_entry(merged_files, item)
    merged_files = merge_file_entry(merged_files, source_entry)

    performed_dates = payload.get("performed_dates")
    if not isinstance(performed_dates, list):
        performed_dates = parse_json(payload.get("performed_dates_json"), [])
    reference_media = payload.get("reference_media")
    if not isinstance(reference_media, dict):
        reference_media = parse_json(payload.get("reference_media_json"), {})
    row_lead = payload.get("rowleadjson", payload.get("row_lead_json", {}))
    if not isinstance(row_lead, dict):
        row_lead = parse_json(row_lead, {})

    metadata = {
        **current_metadata,
        "created_date": payload.get("created_date", ""),
        "next_performance_date": payload.get("next_performance_date", ""),
        "performed_dates": performed_dates,
        "reference_media": reference_media,
        "fileMetadata": merged_files,
        "instruments": payload.get("instruments", ""),
        "rowLead": row_lead,
        "chartImagesSource": source.name,
    }
    chart = payload.get("chart_json")
    if not isinstance(chart, dict):
        chart = parse_json(chart, {})
    lyrics = payload.get("lyrics_json")
    if not isinstance(lyrics, list):
        lyrics = chart.get("lyricsSections", []) if isinstance(chart.get("lyricsSections"), list) else []
    tags = payload.get("tags_json")
    if not isinstance(tags, list):
        tags = parse_json(tags, [])

    values = {
        "title": str(payload.get("title") or ""),
        "title_karen": str(payload.get("title_karen") or ""),
        "category": str(payload.get("category") or ""),
        "key": str(payload.get("key") or payload.get("current_key") or ""),
        "current_key": str(payload.get("current_key") or payload.get("key") or ""),
        "original_key": str(payload.get("original_key") or payload.get("key") or ""),
        "style": str(payload.get("style") or ""),
        "tempo": payload.get("tempo") if payload.get("tempo") is not None else "",
        "notes": str(payload.get("notes") or ""),
        "chart_json": json.dumps(chart, ensure_ascii=False),
        "lyrics_json": json.dumps(lyrics, ensure_ascii=False),
        "metadata_json": json.dumps(metadata, ensure_ascii=False),
        "tags_json": json.dumps(tags, ensure_ascii=False),
        "updated_at": utc_now(),
        "instruments": str(payload.get("instruments") or ""),
        "raw_editor_text": str(payload.get("raw_editor_text") or ""),
        "row_lead_json": json.dumps(row_lead, ensure_ascii=False),
        "created_date": str(payload.get("created_date") or ""),
        "next_performance_date": str(payload.get("next_performance_date") or ""),
        "performed_dates_json": json.dumps(performed_dates, ensure_ascii=False),
        "reference_media_json": json.dumps(reference_media, ensure_ascii=False),
        "file_metadata_json": json.dumps(merged_files, ensure_ascii=False),
    }
    return values


def apply_values(conn: sqlite3.Connection, song_id: int, values: dict[str, Any], columns: set[str]) -> None:
    applicable = {key: value for key, value in values.items() if key in columns}
    assignments = ", ".join(f"{key} = ?" for key in applicable)
    conn.execute(
        f"UPDATE songs SET {assignments} WHERE id = ?",
        (*applicable.values(), song_id),
    )


def attach_binary(
    conn: sqlite3.Connection,
    song_id: int,
    path: Path,
    columns: set[str],
) -> None:
    row = conn.execute("SELECT * FROM songs WHERE id = ?", (song_id,)).fetchone()
    if row is None:
        raise RuntimeError(f"Song {song_id} disappeared during reconciliation")
    metadata = parse_json(row["metadata_json"] if "metadata_json" in columns else "{}", {})
    files = metadata.get("fileMetadata", metadata.get("file_metadata", []))
    files = files if isinstance(files, list) else []
    entry = source_file_entry(path, "PDF" if path.suffix.lower() == ".pdf" else "Chart Image")
    files = merge_file_entry(files, entry)
    metadata["fileMetadata"] = files
    values: dict[str, Any] = {
        "metadata_json": json.dumps(metadata, ensure_ascii=False),
        "file_metadata_json": json.dumps(files, ensure_ascii=False),
        "updated_at": utc_now(),
    }
    if "chart_image_path" in columns:
        current_path = row["chart_image_path"]
        if not current_path or not Path(str(current_path)).exists():
            values["chart_image_path"] = str(path.resolve())
    apply_values(conn, song_id, values, columns)


def create_reference_song(conn: sqlite3.Connection, path: Path, columns: set[str]) -> int:
    now = utc_now()
    entry = source_file_entry(path, "PDF" if path.suffix.lower() == ".pdf" else "Chart Image")
    metadata = {
        "fileMetadata": [entry],
        "instruments": "",
        "performed_dates": [],
        "reference_media": {},
        "rowLead": {},
        "chartImagesSource": path.name,
        "referenceOnly": True,
    }
    values: dict[str, Any] = {
        "title": title_from_filename(path),
        "title_karen": "",
        "category": "",
        "key": "",
        "current_key": "",
        "original_key": "",
        "style": "",
        "tempo": "",
        "notes": "Reference-only record created from chart_images; chart content was not OCR-transcribed.",
        "chart_json": "{}",
        "lyrics_json": "[]",
        "metadata_json": json.dumps(metadata, ensure_ascii=False),
        "tags_json": json.dumps(["chart-images-reference"], ensure_ascii=False),
        "created_at": now,
        "updated_at": now,
        "version": 1,
        "chart_image_path": str(path.resolve()),
        "file_metadata_json": json.dumps([entry], ensure_ascii=False),
        "instruments": "",
        "raw_editor_text": "",
        "row_lead_json": "{}",
        "performed_dates_json": "[]",
        "reference_media_json": "{}",
    }
    applicable = {key: value for key, value in values.items() if key in columns}
    names = ", ".join(applicable)
    placeholders = ", ".join("?" for _ in applicable)
    cursor = conn.execute(
        f"INSERT INTO songs ({names}) VALUES ({placeholders})",
        tuple(applicable.values()),
    )
    return int(cursor.lastrowid)


def reconcile(database: Path, folder: Path, apply: bool, backup_dir: Path) -> dict[str, Any]:
    if not database.exists():
        raise FileNotFoundError(f"Database not found: {database}")
    if not folder.is_dir():
        raise FileNotFoundError(f"Chart-image folder not found: {folder}")

    json_sources: list[tuple[int, Path, dict[str, Any]]] = []
    binary_sources: list[Path] = []
    for path in sorted(folder.iterdir(), key=lambda item: item.name.lower()):
        if not path.is_file():
            continue
        match = JSON_SONG_PATTERN.match(path.name)
        if match:
            payload = json.loads(path.read_text(encoding="utf-8-sig"))
            if not isinstance(payload, dict):
                raise ValueError(f"Expected a JSON object in {path}")
            json_sources.append((int(payload.get("id") or match.group(1)), path, payload))
        elif path.suffix.lower() in SUPPORTED_BINARY_SUFFIXES:
            binary_sources.append(path)

    conn = sqlite3.connect(database)
    conn.row_factory = sqlite3.Row
    columns = column_names(conn)
    rows = conn.execute("SELECT * FROM songs ORDER BY id").fetchall()
    existing_ids = {int(row["id"]) for row in rows}
    file_owners: dict[str, int] = {}
    for row in rows:
        for name in row_file_names(row):
            file_owners.setdefault(name, int(row["id"]))

    report: dict[str, Any] = {
        "mode": "apply" if apply else "dry-run",
        "database": str(database.resolve()),
        "folder": str(folder.resolve()),
        "songs_before": len(rows),
        "json_sources": len(json_sources),
        "binary_sources": len(binary_sources),
        "json_updated": [],
        "binary_attached": [],
        "reference_songs_created": [],
        "historical_rows_preserved": len(rows),
        "backup": None,
    }

    for song_id, path, payload in json_sources:
        if song_id not in existing_ids:
            raise ValueError(
                f"{path.name} targets missing song id {song_id}; refusing to invent an ID-mapped history row"
            )
        report["json_updated"].append({"id": song_id, "file": path.name, "title": payload.get("title", "")})

    for path in binary_sources:
        owner = file_owners.get(path.name.lower())
        if owner is None:
            report["reference_songs_created"].append({"file": path.name, "title": title_from_filename(path)})
        else:
            report["binary_attached"].append({"id": owner, "file": path.name})

    if not apply:
        conn.close()
        report["songs_after"] = len(rows) + len(report["reference_songs_created"])
        report["covered_files"] = len(json_sources) + len(binary_sources)
        return report

    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = backup_dir / f"{database.stem}-before-chart-images-sync-{stamp}{database.suffix}"
    shutil.copy2(database, backup)
    report["backup"] = str(backup.resolve())

    try:
        conn.execute("BEGIN IMMEDIATE")
        for song_id, source, payload in json_sources:
            row = conn.execute("SELECT * FROM songs WHERE id = ?", (song_id,)).fetchone()
            values = normalized_song_values(payload, row, source)
            apply_values(conn, song_id, values, columns)

        for path in binary_sources:
            owner = file_owners.get(path.name.lower())
            if owner is None:
                owner = create_reference_song(conn, path, columns)
            attach_binary(conn, owner, path, columns)

        if conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='songs_fts'").fetchone():
            conn.execute("INSERT INTO songs_fts(songs_fts) VALUES ('rebuild')")
        integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise RuntimeError(f"SQLite integrity check failed: {integrity}")
        conn.commit()
    except Exception:
        conn.rollback()
        conn.close()
        shutil.copy2(backup, database)
        raise

    songs_after = conn.execute("SELECT COUNT(*) FROM songs").fetchone()[0]
    rows_after = conn.execute("SELECT * FROM songs ORDER BY id").fetchall()
    covered_names: set[str] = set()
    for row in rows_after:
        covered_names.update(row_file_names(row))
    conn.close()

    expected_names = {path.name.lower() for _, path, _ in json_sources}
    expected_names.update(path.name.lower() for path in binary_sources)
    missing = sorted(expected_names - covered_names)
    if missing:
        shutil.copy2(backup, database)
        raise RuntimeError(f"Coverage check failed; restored backup. Missing: {missing}")

    report["songs_after"] = songs_after
    report["covered_files"] = len(expected_names)
    report["missing_files"] = []
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=Path("songs.db"))
    parser.add_argument("--folder", type=Path, default=Path("chart_images"))
    parser.add_argument("--backup-dir", type=Path, default=Path("private/backups"))
    parser.add_argument("--apply", action="store_true", help="Apply the plan after creating a database backup.")
    parser.add_argument("--report", type=Path, help="Optional path for the JSON reconciliation report.")
    args = parser.parse_args()

    report = reconcile(args.database, args.folder, args.apply, args.backup_dir)
    rendered = json.dumps(report, ensure_ascii=False, indent=2)
    print(rendered)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
