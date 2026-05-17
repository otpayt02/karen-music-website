import os
import sqlite3
import json
import base64
from datetime import datetime
from uuid import uuid4
from flask import Flask, request, jsonify, send_file, send_from_directory, render_template_string
from werkzeug.utils import secure_filename

print("CWD AT STARTUP:", os.getcwd())

app = Flask(__name__)
BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
DB_PATH         = os.path.join(BASE_DIR, 'songs.db')
LOCAL_IMAGE_DIR = 'chart_images'
FILE_UPLOAD_DIR = 'song_files'
SETTINGS_PATH   = 'app_settings.json'
INDEX_PATH      = os.path.join(BASE_DIR, "index.html")

# ── keep your local Windows path for image storage ──────────────
WINDOWS_BASE_PATH = r'C:\Users\olive\Projects\music_director_database\karen_music_website'


# ============================================================
# DATABASE
# ============================================================

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS songs (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            title_karen      TEXT,
            title            TEXT,
            category         TEXT,
            key              TEXT,
            current_key      TEXT,
            original_key     TEXT,
            style            TEXT,
            tempo            TEXT,
            created_date     TEXT,
            next_performance_date TEXT,
            date_performed   TEXT,
            performed_dates_json TEXT,
            reference_media_json TEXT,
            file_metadata_json TEXT,
            instruments      TEXT,
            chart_json       TEXT,
            row_lead_json    TEXT,
            raw_editor_text  TEXT,
            chart_image_path TEXT,
            notes            TEXT,
            created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # add columns if upgrading an existing db
    migrations = (
        ('title_karen', 'TEXT'),
        ('notes', 'TEXT'),
        ('row_lead_json', 'TEXT'),
        ('current_key', 'TEXT'),
        ('original_key', 'TEXT'),
        ('created_date', 'TEXT'),
        ('next_performance_date', 'TEXT'),
        ('performed_dates_json', 'TEXT'),
        ('reference_media_json', 'TEXT'),
        ('file_metadata_json', 'TEXT'),
    )
    for col_name, col_type in migrations:
        try:
            conn.execute(f'ALTER TABLE songs ADD COLUMN {col_name} {col_type}')
        except Exception:
            pass

    # backfill key metadata for older rows
    conn.execute('''
        UPDATE songs
        SET current_key = COALESCE(NULLIF(current_key, ''), key),
            original_key = COALESCE(NULLIF(original_key, ''), COALESCE(NULLIF(current_key, ''), key)),
            title_karen = COALESCE(NULLIF(title_karen, ''), title),
            created_date = COALESCE(NULLIF(created_date, ''), substr(created_at, 1, 10)),
            performed_dates_json = CASE
                WHEN (performed_dates_json IS NULL OR performed_dates_json = '')
                     AND COALESCE(NULLIF(date_performed, ''), '') <> ''
                THEN '["' || REPLACE(date_performed, '"', '\"') || '"]'
                ELSE COALESCE(performed_dates_json, '[]')
            END,
            reference_media_json = COALESCE(NULLIF(reference_media_json, ''), '{}'),
            file_metadata_json = COALESCE(NULLIF(file_metadata_json, ''), '[]')
    ''')
    conn.commit()
    conn.close()


init_db()


# ============================================================
# UTILITY
# ============================================================

def save_image(data_url, song_id=None):
    if not data_url or not data_url.startswith('data:image/png;base64,'):
        return None
    try:
        _, encoded       = data_url.split(',', 1)
        data             = base64.b64decode(encoded)
        timestamp        = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename         = f"song_{song_id or 'new'}_{timestamp}.png"
        local_path       = os.path.join(LOCAL_IMAGE_DIR, filename)
        os.makedirs(LOCAL_IMAGE_DIR, exist_ok=True)
        with open(local_path, 'wb') as f:
            f.write(data)
        return os.path.join(WINDOWS_BASE_PATH, filename).replace('/', '\\')
    except Exception as e:
        print(f"Error saving image: {e}")
        return None


def load_app_settings():
    defaults = {
        "default_song_dir": WINDOWS_BASE_PATH,
        "alt_song_dir": ""
    }
    if not os.path.exists(SETTINGS_PATH):
        return defaults
    try:
        with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return defaults
        defaults.update({
            "default_song_dir": data.get("default_song_dir") or WINDOWS_BASE_PATH,
            "alt_song_dir": data.get("alt_song_dir") or ""
        })
        return defaults
    except Exception:
        return defaults


def save_app_settings(data):
    payload = {
        "default_song_dir": WINDOWS_BASE_PATH,
        "alt_song_dir": data.get("alt_song_dir", "")
    }
    with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return payload


def normalize_file_metadata_value(value):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except Exception:
            value = []
    if not isinstance(value, list):
        value = []

    files = []
    for item in value:
        if isinstance(item, str):
            item = {"path": item}
        if not isinstance(item, dict):
            continue

        name = str(item.get("name") or item.get("title") or item.get("original_filename") or "").strip()
        path = str(item.get("path") or "").strip()
        url = str(item.get("url") or "").strip()
        notes = str(item.get("notes") or item.get("description") or "").strip()
        kind = str(item.get("kind") or item.get("type") or "Reference").strip() or "Reference"
        stored_filename = str(item.get("stored_filename") or "").strip()
        original_filename = str(item.get("original_filename") or "").strip()
        file_id = str(item.get("id") or uuid4().hex).strip()

        if not (name or path or url or notes or stored_filename or original_filename):
            continue

        files.append({
            "id": file_id,
            "name": name or original_filename or os.path.basename(path) or url or "File",
            "kind": kind,
            "path": path,
            "url": url,
            "notes": notes,
            "stored_filename": stored_filename,
            "original_filename": original_filename,
            "uploaded": bool(item.get("uploaded") or stored_filename),
            "size": item.get("size") or None,
            "added_at": str(item.get("added_at") or datetime.now().isoformat(timespec="seconds"))
        })
    return files


def normalize_song_payload(data):
    if not isinstance(data, dict):
        data = {}

    def _normalize_date(val):
        txt = str(val or "").strip()
        if not txt:
            return ""
        if len(txt) >= 10 and txt[4:5] == "-" and txt[7:8] == "-":
            return txt[:10]
        return txt

    def _normalize_list(value):
        if isinstance(value, list):
            items = [str(v).strip() for v in value]
        elif isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    items = [str(v).strip() for v in parsed]
                else:
                    items = [v.strip() for v in value.split(",")]
            except Exception:
                items = [v.strip() for v in value.split(",")]
        else:
            items = []
        return [v for v in items if v]

    def _normalize_ref_media(value):
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except Exception:
                value = {}
        if not isinstance(value, dict):
            value = {}
        return {
            "videos": _normalize_list(value.get("videos")),
            "images": _normalize_list(value.get("images")),
            "info": str(value.get("info") or "").strip()
        }

    def _normalize_file_metadata(value):
        return normalize_file_metadata_value(value)

    current_key = (data.get("current_key") or data.get("key") or "").strip()
    original_key = (data.get("original_key") or current_key).strip()
    performed_dates = _normalize_list(data.get("performed_dates", data.get("performed_dates_json")))
    date_performed = _normalize_date(data.get("date_performed", data.get("dateperformed")))
    if date_performed and date_performed not in performed_dates:
        performed_dates.append(date_performed)
    if not date_performed and performed_dates:
        date_performed = performed_dates[-1]

    reference_media = _normalize_ref_media(
        data.get("reference_media", data.get("reference_media_json"))
    )
    file_metadata = _normalize_file_metadata(
        data.get("file_metadata", data.get("file_metadata_json"))
    )

    return {
        "title_karen": data.get("title_karen"),
        "title": data.get("title"),
        "category": data.get("category"),
        "key": current_key,
        "current_key": current_key,
        "original_key": original_key,
        "style": data.get("style"),
        "tempo": data.get("tempo"),
        "created_date": _normalize_date(data.get("created_date")),
        "next_performance_date": _normalize_date(data.get("next_performance_date")),
        "date_performed": date_performed,
        "performed_dates": performed_dates,
        "reference_media": reference_media,
        "file_metadata": file_metadata,
        "instruments": data.get("instruments"),
        "chart_json": data.get("chart_json", data.get("chartjson")),
        "row_lead_json": data.get("row_lead_json", data.get("rowleadjson")),
        "raw_editor_text": data.get("raw_editor_text", data.get("raweditortext")),
        "notes": data.get("notes"),
        "chart_png_data_url": data.get("chart_png_data_url", data.get("chartpngdataurl")),
    }


def mirror_song_to_alt_dir(song_id):
    settings = load_app_settings()
    alt_dir = (settings.get("alt_song_dir") or "").strip()
    if not alt_dir:
        return
    if not os.path.isabs(alt_dir):
        return
    try:
        os.makedirs(alt_dir, exist_ok=True)
    except Exception as e:
        print(f"[mirror] could not create dir '{alt_dir}': {e}")
        return

    conn = get_db()
    row = conn.execute("SELECT * FROM songs WHERE id = ?", (song_id,)).fetchone()
    conn.close()
    if not row:
        return
    data = song_row_to_dict(row, full=True)
    out_path = os.path.join(alt_dir, f"song_{song_id}.json")
    try:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[mirror] failed writing {out_path}: {e}")


def song_row_to_dict(row, full=False):
    d = dict(row)
    d["current_key"] = d.get("current_key") or d.get("key") or ""
    d["original_key"] = d.get("original_key") or d["current_key"]
    d["title_karen"] = d.get("title_karen") or ""
    d["created_date"] = d.get("created_date") or (str(d.get("created_at") or "")[:10] if d.get("created_at") else "")
    d["next_performance_date"] = d.get("next_performance_date") or ""

    performed_raw = d.get("performed_dates_json")
    performed_dates = []
    if isinstance(performed_raw, str) and performed_raw.strip():
        try:
            parsed = json.loads(performed_raw)
            if isinstance(parsed, list):
                performed_dates = [str(v).strip() for v in parsed if str(v).strip()]
        except Exception:
            performed_dates = [v.strip() for v in performed_raw.split(",") if v.strip()]
    if d.get("date_performed"):
        date_performed = str(d.get("date_performed")).strip()
        if date_performed and date_performed not in performed_dates:
            performed_dates.append(date_performed)
    d["performed_dates"] = performed_dates

    ref_raw = d.get("reference_media_json")
    ref_media = {}
    if isinstance(ref_raw, str) and ref_raw.strip():
        try:
            ref_media = json.loads(ref_raw)
        except Exception:
            ref_media = {}
    if not isinstance(ref_media, dict):
        ref_media = {}
    d["reference_media"] = {
        "videos": [str(v).strip() for v in (ref_media.get("videos") or []) if str(v).strip()],
        "images": [str(v).strip() for v in (ref_media.get("images") or []) if str(v).strip()],
        "info": str(ref_media.get("info") or "").strip()
    }
    d["file_metadata"] = normalize_file_metadata_value(d.get("file_metadata_json"))

    if full:
        if d.get("chart_json"):
            try:
                d["chart_json"] = json.loads(d["chart_json"])
            except Exception:
                pass
        if d.get("row_lead_json"):
            try:
                d["row_lead_json"] = json.loads(d["row_lead_json"])
            except Exception:
                pass
    return d


# ============================================================
# ROUTES — pages
# ============================================================

@app.route('/')
def index():
    try:
        with open(INDEX_PATH, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return f"index.html not found at {INDEX_PATH}", 404


@app.route('/admin')
def admin():
    return render_template_string(ADMIN_HTML)


# ============================================================
# ROUTES — songs API
# ============================================================


@app.route('/api/settings', methods=['GET'])
def get_settings():
    return jsonify(load_app_settings())


@app.route('/api/settings', methods=['PUT'])
def update_settings():
    payload = request.json or {}
    alt_raw = str(payload.get("alt_song_dir", "")).strip()
    if alt_raw:
        if not os.path.isabs(alt_raw):
            return jsonify({"error": "Alternate folder must be a full absolute path."}), 400
        try:
            os.makedirs(alt_raw, exist_ok=True)
        except Exception as e:
            return jsonify({"error": f"Could not create folder: {e}"}), 400

    saved = save_app_settings({"alt_song_dir": alt_raw})
    return jsonify(saved)


@app.route('/api/settings/pick-folder', methods=['POST'])
def pick_folder():
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        root.lift()
        root.update()
        selected = filedialog.askdirectory(
            parent=root,
            initialdir=WINDOWS_BASE_PATH,
            title="Select Alternate Song Folder",
            mustexist=False
        )
        root.destroy()
        return jsonify({"path": selected or ""})
    except Exception as e:
        return jsonify({"error": f"Folder picker unavailable: {e}"}), 500


@app.route('/api/songs', methods=['GET'])
def get_songs():
    """
    Optional query params:
      ?category=Choir
      ?key=G
      ?q=amazing+grace      (searches title, lyrics/notes, dates, files, and metadata)
    """
    category = request.args.get('category', '').strip()
    key      = request.args.get('key', '').strip()
    q        = request.args.get('q', '').strip()

    sql    = '''SELECT id, title_karen, title, category, key, current_key, original_key, style, tempo,
                       created_date, next_performance_date, date_performed, performed_dates_json,
                       reference_media_json, file_metadata_json, instruments, notes, created_at, updated_at
                FROM songs WHERE 1=1'''
    params = []

    if category:
        sql    += ' AND category = ?'
        params.append(category)
    if key:
        sql    += ' AND COALESCE(NULLIF(current_key, ""), key) = ?'
        params.append(key)
    if q:
        like = f'%{q}%'
        sql += ''' AND (
            COALESCE(title, '') LIKE ?
            OR COALESCE(title_karen, '') LIKE ?
            OR COALESCE(category, '') LIKE ?
            OR COALESCE(key, '') LIKE ?
            OR COALESCE(current_key, '') LIKE ?
            OR COALESCE(original_key, '') LIKE ?
            OR COALESCE(style, '') LIKE ?
            OR COALESCE(tempo, '') LIKE ?
            OR COALESCE(created_date, '') LIKE ?
            OR COALESCE(next_performance_date, '') LIKE ?
            OR COALESCE(date_performed, '') LIKE ?
            OR COALESCE(performed_dates_json, '') LIKE ?
            OR COALESCE(reference_media_json, '') LIKE ?
            OR COALESCE(file_metadata_json, '') LIKE ?
            OR COALESCE(instruments, '') LIKE ?
            OR COALESCE(notes, '') LIKE ?
        )'''
        params.extend([like] * 16)

    sql += ' ORDER BY updated_at DESC'

    conn  = get_db()
    songs = conn.execute(sql, params).fetchall()
    conn.close()
    return jsonify([song_row_to_dict(s) for s in songs])


@app.route('/api/songs/<int:song_id>', methods=['GET'])
def get_song(song_id):
    conn = get_db()
    row  = conn.execute('SELECT * FROM songs WHERE id = ?', (song_id,)).fetchone()
    conn.close()
    if row:
        return jsonify(song_row_to_dict(row, full=True))
    return jsonify({'error': 'Song not found'}), 404


@app.route('/api/songs', methods=['POST'])
def create_song():
    data             = normalize_song_payload(request.json or {})
    chart_image_path = save_image(data.get('chart_png_data_url'))
    conn             = get_db()
    cur              = conn.cursor()
    cur.execute('''
        INSERT INTO songs
            (title_karen, title, category, key, current_key, original_key, style, tempo,
             created_date, next_performance_date, date_performed, performed_dates_json,
             reference_media_json, file_metadata_json, instruments, chart_json, row_lead_json, raw_editor_text,
             chart_image_path, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('title_karen'),
        data.get('title'),
        data.get('category'),
        data.get('key'),
        data.get('current_key'),
        data.get('original_key'),
        data.get('style'),
        data.get('tempo'),
        data.get('created_date') or datetime.now().strftime('%Y-%m-%d'),
        data.get('next_performance_date'),
        data.get('date_performed'),
        json.dumps(data.get('performed_dates', []), ensure_ascii=False),
        json.dumps(data.get('reference_media', {}), ensure_ascii=False),
        json.dumps(data.get('file_metadata', []), ensure_ascii=False),
        data.get('instruments'),
        json.dumps(data.get('chart_json')),
        json.dumps(data.get('row_lead_json')),
        data.get('raw_editor_text'),
        chart_image_path,
        data.get('notes'),
    ))
    song_id = cur.lastrowid
    conn.commit()
    conn.close()
    mirror_song_to_alt_dir(song_id)
    return jsonify({'id': song_id})


@app.route('/api/songs/<int:song_id>', methods=['PUT'])
def update_song(song_id):
    data             = normalize_song_payload(request.json or {})
    chart_image_path = save_image(data.get('chart_png_data_url'), song_id)
    conn             = get_db()
    current_image = conn.execute('SELECT chart_image_path FROM songs WHERE id = ?', (song_id,)).fetchone()
    final_image = chart_image_path if chart_image_path else (current_image['chart_image_path'] if current_image else None)
    conn.execute('''
        UPDATE songs
        SET title_karen=?, title=?, category=?, key=?, current_key=?, original_key=?, style=?, tempo=?,
            created_date=?, next_performance_date=?, date_performed=?, performed_dates_json=?, reference_media_json=?,
            file_metadata_json=?, instruments=?, chart_json=?, row_lead_json=?, raw_editor_text=?,
            chart_image_path=?, notes=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
    ''', (
        data.get('title_karen'),
        data.get('title'),
        data.get('category'),
        data.get('key'),
        data.get('current_key'),
        data.get('original_key'),
        data.get('style'),
        data.get('tempo'),
        data.get('created_date') or datetime.now().strftime('%Y-%m-%d'),
        data.get('next_performance_date'),
        data.get('date_performed'),
        json.dumps(data.get('performed_dates', []), ensure_ascii=False),
        json.dumps(data.get('reference_media', {}), ensure_ascii=False),
        json.dumps(data.get('file_metadata', []), ensure_ascii=False),
        data.get('instruments'),
        json.dumps(data.get('chart_json')),
        json.dumps(data.get('row_lead_json')),
        data.get('raw_editor_text'),
        final_image,
        data.get('notes'),
        song_id,
    ))
    conn.commit()
    conn.close()
    mirror_song_to_alt_dir(song_id)
    return jsonify({'success': True})


@app.route('/api/songs/<int:song_id>', methods=['DELETE'])
def delete_song(song_id):
    conn = get_db()
    conn.execute('DELETE FROM songs WHERE id = ?', (song_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/songs/<int:song_id>/files', methods=['POST'])
def upload_song_file(song_id):
    upload = request.files.get('file')
    if not upload or not upload.filename:
        return jsonify({'error': 'No file selected'}), 400

    conn = get_db()
    row = conn.execute('SELECT file_metadata_json FROM songs WHERE id = ?', (song_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Song not found'}), 404

    safe_original = secure_filename(upload.filename) or 'attachment'
    stored_filename = f"{uuid4().hex}_{safe_original}"
    song_dir = os.path.join(BASE_DIR, FILE_UPLOAD_DIR, f"song_{song_id}")
    os.makedirs(song_dir, exist_ok=True)
    stored_path = os.path.join(song_dir, stored_filename)
    upload.save(stored_path)

    files = normalize_file_metadata_value(row['file_metadata_json'])
    display_name = str(request.form.get('name') or upload.filename).strip()
    item = {
        "id": uuid4().hex,
        "name": display_name or upload.filename,
        "kind": str(request.form.get('kind') or "Reference").strip() or "Reference",
        "path": os.path.join(FILE_UPLOAD_DIR, f"song_{song_id}", stored_filename).replace("\\", "/"),
        "url": f"/api/songs/{song_id}/files/{stored_filename}/download",
        "notes": str(request.form.get('notes') or "").strip(),
        "stored_filename": stored_filename,
        "original_filename": upload.filename,
        "uploaded": True,
        "size": os.path.getsize(stored_path),
        "added_at": datetime.now().isoformat(timespec="seconds")
    }
    files.append(item)

    conn.execute(
        'UPDATE songs SET file_metadata_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        (json.dumps(files, ensure_ascii=False), song_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'file': item, 'files': files})


@app.route('/api/songs/<int:song_id>/files/<file_id>', methods=['DELETE'])
def delete_song_file(song_id, file_id):
    conn = get_db()
    row = conn.execute('SELECT file_metadata_json FROM songs WHERE id = ?', (song_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Song not found'}), 404

    files = normalize_file_metadata_value(row['file_metadata_json'])
    removed = None
    kept = []
    for item in files:
        if str(item.get("id")) == str(file_id):
            removed = item
        else:
            kept.append(item)

    if removed and removed.get("stored_filename"):
        stored_path = os.path.join(BASE_DIR, FILE_UPLOAD_DIR, f"song_{song_id}", removed["stored_filename"])
        try:
            if os.path.isfile(stored_path):
                os.remove(stored_path)
        except Exception as e:
            print(f"[files] failed deleting {stored_path}: {e}")

    conn.execute(
        'UPDATE songs SET file_metadata_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        (json.dumps(kept, ensure_ascii=False), song_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'files': kept})


@app.route('/api/songs/<int:song_id>/files/<path:filename>/download', methods=['GET'])
def download_song_file(song_id, filename):
    song_dir = os.path.join(BASE_DIR, FILE_UPLOAD_DIR, f"song_{song_id}")
    return send_from_directory(song_dir, filename, as_attachment=False)


# ============================================================
# ROUTES — export / print
# ============================================================

@app.route('/api/export-db')
def export_db():
    return send_file(DB_PATH, as_attachment=True)


@app.route('/api/export-json')
def export_json():
    """Export all songs as a single JSON file."""
    conn  = get_db()
    rows  = conn.execute('SELECT * FROM songs ORDER BY updated_at DESC').fetchall()
    conn.close()
    songs = []
    for row in rows:
        d = song_row_to_dict(row, full=True)
        songs.append(d)
    response = app.response_class(
        response=json.dumps(songs, indent=2),
        mimetype='application/json'
    )
    response.headers['Content-Disposition'] = 'attachment; filename=karen_music_songs.json'
    return response


@app.route('/print/<int:song_id>')
def print_song(song_id):
    """Opens editor with ?song_id=X&auto_print=1 so it prints immediately."""
    return f'''<!doctype html>
<html><head><meta http-equiv="refresh"
  content="0; url=/?song_id={song_id}&auto_print=1"></head>
<body>Redirecting to print...</body></html>'''


# ============================================================
# ADMIN PAGE
# ============================================================

ADMIN_HTML = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Karen Music — Song Library</title>
<style>
  :root {
    --bg: #0f0f0f;
    --surface: #1a1a1a;
    --border: #2e2e2e;
    --accent: #bb86fc;
    --text: #e0e0e0;
    --text-muted: #777;
    --danger: #cf6679;
  }
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: Segoe UI, sans-serif;
    background: var(--bg);
    color: var(--text);
    margin: 0;
    padding: 0;
  }
  header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 14px 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  header h1 {
    font-size: 1.1em;
    font-weight: 900;
    letter-spacing: 0.12em;
    color: var(--accent);
    margin: 0;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .filter-bar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    flex: 1;
  }
  .filter-bar input,
  .filter-bar select {
    background: #2a2a2a;
    border: 1px solid var(--border);
    color: var(--text);
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.85em;
    outline: none;
  }
  .filter-bar input:focus,
  .filter-bar select:focus {
    border-color: var(--accent);
  }
  .filter-bar input { width: 180px; }
  #btn-new-song {
    background: var(--accent);
    color: #000;
    border: none;
    border-radius: 6px;
    padding: 7px 14px;
    font-weight: 700;
    font-size: 0.85em;
    cursor: pointer;
    margin-left: auto;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
  #btn-new-song:hover { opacity: 0.85; }
  #song-count {
    font-size: 0.78em;
    color: var(--text-muted);
    white-space: nowrap;
    padding: 0 8px;
  }
  main { padding: 20px 24px; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88em;
  }
  thead tr {
    border-bottom: 2px solid var(--border);
  }
  th {
    text-align: left;
    padding: 8px 10px;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }
  td {
    padding: 10px 10px;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }
  tr:hover td { background: rgba(255,255,255,0.025); }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75em;
    font-weight: 600;
    background: rgba(187,134,252,0.15);
    color: var(--accent);
    white-space: nowrap;
  }
  .action-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    border-radius: 5px;
    padding: 4px 10px;
    font-size: 0.8em;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    margin-right: 4px;
    transition: all 0.15s;
  }
  .action-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .action-btn.danger:hover {
    border-color: var(--danger);
    color: var(--danger);
  }
  #empty-msg {
    text-align: center;
    padding: 60px 0;
    color: var(--text-muted);
    font-size: 0.9em;
    display: none;
  }
  #empty-msg p { margin: 6px 0; }
  .title-cell { font-weight: 600; max-width: 200px; }
  .muted { color: var(--text-muted); }
</style>
</head>
<body>

<header>
  <h1>🎵 Karen Music</h1>
  <div class="filter-bar">
    <input id="search-input" type="text" placeholder="Search title…" oninput="filterSongs()">
    <select id="filter-category" onchange="filterSongs()">
      <option value="">All Categories</option>
      <option value="Praise/Worship">Praise / Worship</option>
      <option value="Choir">Choir</option>
      <option value="Youth">Youth</option>
      <option value="Solo">Solo</option>
      <option value="Kids">Kids</option>
    </select>
    <select id="filter-key" onchange="filterSongs()">
      <option value="">All Keys</option>
    </select>
    <span id="song-count"></span>
  </div>
  <a id="btn-new-song" href="/">+ New Song</a>
</header>

<main>
  <table id="song-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Title</th>
        <th>Category</th>
        <th>Key</th>
        <th>Style</th>
        <th>Tempo</th>
        <th>Instruments</th>
        <th>Last Edited</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="song-tbody"></tbody>
  </table>
  <div id="empty-msg">
    <p>No songs match your filters.</p>
    <p>Try clearing filters or <a href="/" style="color:var(--accent)">creating a new song</a>.</p>
  </div>
</main>

<script>
let allSongs = [];

async function loadSongs() {
  const res   = await fetch('/api/songs');
  allSongs    = await res.json();
  populateKeyFilter();
  renderTable(allSongs);
}

function populateKeyFilter() {
  const keys = [...new Set(allSongs.map(s => s.key).filter(Boolean))].sort();
  const sel  = document.getElementById('filter-key');
  keys.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k;
    sel.appendChild(opt);
  });
}

function filterSongs() {
  const q    = document.getElementById('search-input').value.trim().toLowerCase();
  const cat  = document.getElementById('filter-category').value;
  const key  = document.getElementById('filter-key').value;
  const filtered = allSongs.filter(s => {
    const matchQ   = !q   || (s.title || '').toLowerCase().includes(q);
    const matchCat = !cat || s.category === cat;
    const matchKey = !key || s.key === key;
    return matchQ && matchCat && matchKey;
  });
  renderTable(filtered);
}

function renderTable(songs) {
  const tbody = document.getElementById('song-tbody');
  const empty = document.getElementById('empty-msg');
  const count = document.getElementById('song-count');

  tbody.innerHTML = '';
  count.textContent = songs.length + ' song' + (songs.length !== 1 ? 's' : '');

  if (songs.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  songs.forEach((song, i) => {
    const updated = song.updated_at
      ? new Date(song.updated_at).toLocaleDateString()
      : '—';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="muted">${i + 1}</td>
      <td class="title-cell">${esc(song.title || '—')}</td>
      <td>${song.category ? `<span class="badge">${esc(song.category)}</span>` : '<span class="muted">—</span>'}</td>
      <td>${esc(song.key || '—')}</td>
      <td class="muted">${esc(song.style || '—')}</td>
      <td class="muted">${esc(song.tempo || '—')}</td>
      <td class="muted" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
          title="${esc(song.instruments || '')}">${esc(song.instruments || '—')}</td>
      <td class="muted">${updated}</td>
      <td>
        <a class="action-btn" href="/?song_id=${song.id}" title="Edit">Edit</a>
        <a class="action-btn" href="/print/${song.id}" target="_blank" title="Print">Print</a>
        <button class="action-btn danger" onclick="deleteSong(${song.id}, this)" title="Delete">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function deleteSong(id, btn) {
  if (!confirm('Delete this song? This cannot be undone.')) return;
  btn.disabled    = true;
  btn.textContent = '…';
  const res = await fetch(`/api/songs/${id}`, { method: 'DELETE' });
  if (res.ok) {
    allSongs = allSongs.filter(s => s.id !== id);
    filterSongs();
  } else {
    alert('Delete failed.');
    btn.disabled    = false;
    btn.textContent = 'Delete';
  }
}

loadSongs();
</script>
</body>
</html>"""


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

