import os
import sqlite3
import json
import base64
import shutil
import sys
import re
from collections import OrderedDict
from datetime import datetime
from uuid import uuid4
from flask import Flask, request, jsonify, send_file, send_from_directory, render_template_string, make_response
from werkzeug.utils import secure_filename

print("CWD AT STARTUP:", os.getcwd())

app = Flask(__name__)

IS_FROZEN    = getattr(sys, "frozen", False)
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
RESOURCE_DIR = getattr(sys, "_MEIPASS", BASE_DIR)


def get_data_dir():
    override = os.environ.get("KAREN_MUSIC_DATA_DIR")
    if override:
        return os.path.abspath(os.path.expandvars(os.path.expanduser(override)))
    if IS_FROZEN:
        local_appdata = os.environ.get("LOCALAPPDATA") or os.path.expanduser("~")
        return os.path.join(local_appdata, "Karen Music Director")
    return BASE_DIR


DATA_DIR           = get_data_dir()
DB_PATH            = os.path.join(DATA_DIR, 'songs.db')
LOCAL_IMAGE_NAME   = 'chart_images'
FILE_UPLOAD_NAME   = 'song_files'
LOCAL_IMAGE_DIR    = os.path.join(DATA_DIR, LOCAL_IMAGE_NAME) if IS_FROZEN else LOCAL_IMAGE_NAME
FILE_UPLOAD_DIR    = os.path.join(DATA_DIR, FILE_UPLOAD_NAME) if IS_FROZEN else FILE_UPLOAD_NAME
SETTINGS_PATH      = os.path.join(DATA_DIR, 'app_settings.json') if IS_FROZEN else 'app_settings.json'
INDEX_PATH         = os.path.join(RESOURCE_DIR, "index.html")
TRANSLATION_FILE_CANDIDATES = (
    "translations_updated.txt",
    "translations_website_updated.txt",
    "translations_website.txt",
    "translations.txt",
)
DEFAULT_TRANSLATION_FILE = "translations_updated.txt"
TRANSLATION_POLICY_BOTH = {"y", "yes", "both", "always", "all"}
TRANSLATION_POLICY_TOGGLE = {"n", "no", "toggle", "selected", "current"}
TRANSLATION_KEY_ALIASES = {
    "song_title_karen_label": "songTitleKarenLabel",
    "song_title_english_label": "songTitleEnglishLabel",
    "karen_title_placeholder": "karenTitlePlaceholder",
    "english_title_placeholder": "englishTitlePlaceholder",
    "date_created_label": "dateCreatedLabel",
    "date_performed_label": "datePerformedLabel",
    "next_performance_label": "nextPerformanceLabel",
    "reference_media_label": "referenceMediaLabel",
    "reference_notes_label": "referenceNotesLabel",
    "reference_copy_label": "referenceCopyLabel",
    "no_performed_dates_yet": "noPerformedDatesYet",
    "song_database": "songDatabase",
    "new_song_button": "newSong",
    "save_song_button": "save",
    "print_song_button": "print",
    "export_song_button": "exportDb",
    "praise_worship_category_selection": "categoryPraiseWorship",
    "choir_category_selection": "categoryChoir",
    "youth_category_selection": "categoryYouth",
    "solo_category_selection": "categorySolo",
    "kids_category_selection": "categoryKids",
    "intro_section_selection": "sectionIntro",
    "verse_section_selection": "sectionVerse",
    "prechorus_section_selection": "sectionPreChorus",
    "pre_chorus_section_selection": "sectionPreChorus",
    "chorus_section_selection": "sectionChorus",
    "bridge_section_selection": "sectionBridge",
    "solo_section_selection": "sectionSolo",
    "ending_section_selection": "sectionEnding",
    "piano_1": "instrumentPiano1",
    "piano_2": "instrumentPiano2",
    "piano_1_sidebar": "instrumentPiano1Sidebar",
    "piano_2_sidebar": "instrumentPiano2Sidebar",
    "electric_guitar": "instrumentElectricGuitar",
    "electric_guitar_sidebar": "instrumentElectricGuitarSidebar",
    "acoustic_guitar": "instrumentAcousticGuitar",
    "acoustic_guitar_sidebar": "instrumentAcousticGuitarSidebar",
    "electric_bass": "instrumentElectricBass",
    "electric_bass_sidebar": "instrumentElectricBassSidebar",
    "drums": "instrumentDrums",
    "drums_sidebar": "instrumentDrumsSidebar",
    "keytar": "instrumentKeytar",
    "keytar_sidebar": "instrumentKeytarSidebar",
    "go_go": "styleGoGo",
    "gogo": "styleGoGo",
    "reggae": "styleReggae",
    "ballad": "styleBallad",
    "alternative": "styleAlternative",
    "rock_genre": "styleRock",
    "rock": "styleRock",
    "slow": "styleSlow",
    "country": "styleCountry",
    "only": "onlyLabel",
    "only_label": "onlyLabel",
    "all_in": "allInLabel",
    "roll": "rollLabel",
    "roll_label": "rollLabel",
    "export_started": "exportStarted",
    "export_download_started": "exportDownloadStarted",
    "bpm": "bpmLabel",
    "bpm_label": "bpmLabel",
    "beats_per_minute": "bpmLabel",
}

# ── keep your local Windows path for image storage ──────────────
WINDOWS_BASE_PATH = (
    LOCAL_IMAGE_DIR if IS_FROZEN
    else r'C:\Users\olive\Projects\music_director_database\karen_music_website'
)


def prepare_runtime_storage():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(LOCAL_IMAGE_DIR, exist_ok=True)
    os.makedirs(FILE_UPLOAD_DIR, exist_ok=True)

    if not IS_FROZEN:
        return

    bundled_db = os.path.join(RESOURCE_DIR, 'songs.db')
    if not os.path.exists(DB_PATH) and os.path.exists(bundled_db):
        shutil.copy2(bundled_db, DB_PATH)

    for name in TRANSLATION_FILE_CANDIDATES:
        bundled_translation = os.path.join(RESOURCE_DIR, name)
        editable_translation = os.path.join(DATA_DIR, name)
        if os.path.exists(bundled_translation) and not os.path.exists(editable_translation):
            shutil.copy2(bundled_translation, editable_translation)

    bundled_images = os.path.join(RESOURCE_DIR, LOCAL_IMAGE_NAME)
    if os.path.isdir(bundled_images):
        for filename in os.listdir(bundled_images):
            src = os.path.join(bundled_images, filename)
            dst = os.path.join(LOCAL_IMAGE_DIR, filename)
            if os.path.isfile(src) and not os.path.exists(dst):
                shutil.copy2(src, dst)


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

prepare_runtime_storage()
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


def normalize_translation_policy(value):
    clean = str(value or "").strip().lower()
    if clean in TRANSLATION_POLICY_BOTH:
        return "both"
    if clean in TRANSLATION_POLICY_TOGGLE:
        return "toggle"
    return ""


def translation_policy_answer(policy):
    if policy == "both":
        return "y"
    if policy == "toggle":
        return "n"
    return ""


def camel_to_snake(value):
    text = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", str(value or ""))
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", text)
    return text.replace("-", "_").lower()


def to_camel_translation_key(raw):
    clean = str(raw or "").lstrip("\ufeff").strip().lower()
    clean = clean.replace("'", "").replace('"', "")
    clean = re.sub(r"[^a-z0-9]+", " ", clean).strip()
    if not clean:
        return ""
    alias_key = re.sub(r"\s+", "_", clean)
    if alias_key in TRANSLATION_KEY_ALIASES:
        return TRANSLATION_KEY_ALIASES[alias_key]
    if clean in TRANSLATION_KEY_ALIASES:
        return TRANSLATION_KEY_ALIASES[clean]
    parts = clean.split()
    return parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def humanize_translation_key(key):
    text = camel_to_snake(key).replace("_", " ").strip()
    return text[:1].upper() + text[1:] if text else str(key or "")


def decode_js_string(value):
    try:
        return json.loads(f'"{value}"')
    except Exception:
        return value


def parse_translation_payload(payload):
    raw_payload = str(payload or "").strip()
    comment = ""
    if "#" in raw_payload:
        raw_payload, comment = raw_payload.split("#", 1)
        raw_payload = raw_payload.strip()
        comment = comment.strip()

    value = raw_payload
    policy = ""
    description = ""
    refs = []

    if "|" in raw_payload:
        parts = [part.strip() for part in raw_payload.split("|")]
        value = parts[0].strip()
        if len(parts) > 1:
            policy = normalize_translation_policy(parts[1])
            if not policy:
                description = parts[1]
        if len(parts) > 2:
            description = parts[2]
        if len(parts) > 3:
            refs = [ref.strip() for ref in re.split(r"[,;]", parts[3]) if ref.strip()]
    else:
        pieces = raw_payload.rsplit(None, 1)
        if len(pieces) == 2:
            detected = normalize_translation_policy(pieces[1])
            if detected:
                value = pieces[0].strip()
                policy = detected

    if comment and not description:
        description = comment

    if not policy:
        description = ""
        refs = []

    return {
        "value": value.strip(),
        "policy": policy,
        "policyAnswer": translation_policy_answer(policy),
        "description": description.strip(),
        "refs": refs,
    }


def parse_translation_file_entries(path):
    entries = OrderedDict()
    with open(path, "r", encoding="utf-8") as f:
        for line_no, raw_line in enumerate(f, 1):
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, payload = line.split("=", 1)
            key = key.strip().lstrip("\ufeff")
            if not key:
                continue
            parsed = parse_translation_payload(payload)
            parsed["sourceLine"] = line_no
            parsed["sourceKey"] = key
            entries[key] = parsed
    return entries


def parse_translation_file(path):
    entries = parse_translation_file_entries(path)
    return {
        key: data["value"]
        for key, data in entries.items()
        if data.get("value")
    }


def extract_source_translation_catalog():
    catalog = OrderedDict()
    try:
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            source = f.read()
    except Exception:
        return catalog

    match = re.search(r"english\s*:\s*\{(?P<body>.*?)\n\s*\},\s*karen\s*:", source, re.S)
    if not match:
        return catalog

    body = match.group("body")
    body_start = match.start("body")
    item_pattern = re.compile(r"^\s*([A-Za-z0-9_$]+)\s*:\s*(['\"])(.*?)\2\s*,?\s*$", re.M)
    for item in item_pattern.finditer(body):
        key = item.group(1)
        english = decode_js_string(item.group(3))
        line_no = source[:body_start + item.start()].count("\n") + 1
        catalog[key] = {
            "key": key,
            "fileKey": camel_to_snake(key),
            "english": english,
            "description": humanize_translation_key(key),
            "refs": [f"index.html:{line_no}"],
        }
    ref_patterns = (
        r'data-i18n(?:-[a-z-]+)?="([^"]+)"',
        r'uiText\(\s*["\']([^"\']+)["\']',
        r'\bt\(\s*["\']([^"\']+)["\']',
    )
    refs_by_key = {}
    for pattern in ref_patterns:
        for ref_match in re.finditer(pattern, source):
            key = ref_match.group(1)
            line_no = source[:ref_match.start()].count("\n") + 1
            refs_by_key.setdefault(key, set()).add(f"index.html:{line_no}")
    for key, refs in refs_by_key.items():
        if key not in catalog:
            catalog[key] = {
                "key": key,
                "fileKey": camel_to_snake(key),
                "english": humanize_translation_key(key),
                "description": humanize_translation_key(key),
                "refs": [],
            }
        merged_refs = list(OrderedDict.fromkeys([*catalog[key].get("refs", []), *sorted(refs)]))
        catalog[key]["refs"] = merged_refs
    return catalog


def build_translation_catalog(path=None):
    path = path or latest_translation_file()
    source_catalog = extract_source_translation_catalog()
    entries = parse_translation_file_entries(path) if path else OrderedDict()
    entries_by_canonical = {}
    for raw_key, entry in entries.items():
        canonical = to_camel_translation_key(raw_key)
        if canonical:
            entries_by_canonical[canonical] = entry

    catalog = []
    used = set()
    for key, source in source_catalog.items():
        entry = entries_by_canonical.get(key)
        if entry:
            used.add(entry["sourceKey"])
        value = entry.get("value", "") if entry else ""
        policy = entry.get("policy", "") if entry else ""
        catalog.append({
            **source,
            "karen": value,
            "policy": policy,
            "policyAnswer": translation_policy_answer(policy),
            "status": "translated" if value else "untranslated",
            "sourceKey": entry.get("sourceKey", "") if entry else "",
            "sourceLine": entry.get("sourceLine") if entry else None,
            "fileDescription": entry.get("description", "") if entry else "",
            "fileRefs": entry.get("refs", []) if entry else [],
        })

    for raw_key, entry in entries.items():
        if raw_key in used:
            continue
        canonical = to_camel_translation_key(raw_key)
        if canonical in source_catalog:
            continue
        value = entry.get("value", "")
        policy = entry.get("policy", "")
        catalog.append({
            "key": canonical or raw_key,
            "fileKey": camel_to_snake(canonical or raw_key),
            "english": raw_key,
            "description": entry.get("description", "") or humanize_translation_key(raw_key),
            "refs": [],
            "karen": value,
            "policy": policy,
            "policyAnswer": translation_policy_answer(policy),
            "status": "translated" if value else "untranslated",
            "sourceKey": raw_key,
            "sourceLine": entry.get("sourceLine"),
            "fileDescription": entry.get("description", ""),
            "fileRefs": entry.get("refs", []),
        })

    return catalog


def translation_file_write_path(path=None):
    if path:
        return path
    latest = latest_translation_file()
    if latest:
        return latest
    return os.path.join(DATA_DIR, DEFAULT_TRANSLATION_FILE)


def sync_translation_file_catalog(path=None):
    """Append newly registered UI translation keys without changing existing rows."""
    path = translation_file_write_path(path)
    source_catalog = extract_source_translation_catalog()
    if not source_catalog:
        return {"path": path, "added": 0, "keys": []}

    entries = OrderedDict()
    if os.path.exists(path):
        entries = parse_translation_file_entries(path)
    existing = {
        to_camel_translation_key(raw_key)
        for raw_key in entries.keys()
        if to_camel_translation_key(raw_key)
    }

    missing = [
        source
        for key, source in source_catalog.items()
        if key not in existing
    ]
    if not missing:
        return {"path": path, "added": 0, "keys": []}

    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    needs_leading_newline = os.path.exists(path) and os.path.getsize(path) > 0
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(path, "a", encoding="utf-8", newline="\n") as f:
        if needs_leading_newline:
            f.write("\n")
        f.write(f"# Added by Karen Music Director on {stamp}\n")
        f.write("# Fill in the Karen translation after =. Add | y to always show both languages, or | n to show only the selected language.\n")
        f.write("# Rows without y/n stay plain and intentionally do not include descriptions or code references.\n")
        for source in missing:
            f.write(f"{source.get('fileKey') or camel_to_snake(source.get('key'))} = \n")

    return {
        "path": path,
        "added": len(missing),
        "keys": [item.get("fileKey") or camel_to_snake(item.get("key")) for item in missing],
    }


def translation_file_info(path):
    if not path:
        return {"file": None, "path": None, "mtime": None, "size": 0, "version": None}
    try:
        stat = os.stat(path)
    except OSError:
        return {"file": os.path.basename(path), "path": path, "mtime": None, "size": 0, "version": None}
    return {
        "file": os.path.basename(path),
        "path": path,
        "mtime": stat.st_mtime,
        "size": stat.st_size,
        "version": f"{stat.st_mtime_ns}:{stat.st_size}",
    }


def latest_translation_file():
    roots = [DATA_DIR, BASE_DIR, RESOURCE_DIR]
    seen = set()
    candidates = []
    for root in roots:
        for name in TRANSLATION_FILE_CANDIDATES:
            path = os.path.abspath(os.path.join(root, name))
            if path in seen:
                continue
            seen.add(path)
            if os.path.isfile(path):
                candidates.append(path)
        try:
            for entry in os.scandir(root):
                if not entry.is_file():
                    continue
                lower_name = entry.name.lower()
                if "translation" not in lower_name or not lower_name.endswith(".txt"):
                    continue
                path = os.path.abspath(entry.path)
                if path in seen:
                    continue
                seen.add(path)
                candidates.append(path)
        except OSError:
            continue
    if not candidates:
        return None
    return max(candidates, key=lambda p: os.path.getmtime(p))


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
            response = make_response(f.read())
            response.headers["Cache-Control"] = "no-store, max-age=0"
            return response
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


@app.route('/api/translations/latest', methods=['GET'])
def get_latest_translations():
    path = latest_translation_file()
    sync_result = sync_translation_file_catalog(path)
    path = sync_result["path"]
    if not path:
        return jsonify({**translation_file_info(None), "translations": {}, "policies": {}})
    try:
        entries = parse_translation_file_entries(path)
        return jsonify({
            **translation_file_info(path),
            "sync": sync_result,
            "translations": {
                key: data["value"]
                for key, data in entries.items()
                if data.get("value")
            },
            "policies": {
                key: data["policy"]
                for key, data in entries.items()
                if data.get("policy")
            },
            "entries": entries,
        })
    except Exception as e:
        return jsonify({"error": str(e), "path": path, "translations": {}}), 500


@app.route('/api/translations/catalog', methods=['GET'])
def get_translation_catalog():
    path = latest_translation_file()
    try:
        sync_result = sync_translation_file_catalog(path)
        path = sync_result["path"]
        return jsonify({
            **translation_file_info(path),
            "sync": sync_result,
            "catalog": build_translation_catalog(path),
            "format": "file_key = Karen translation | y-or-n | plain app location description | generated refs",
            "policy": {
                "y": "show Karen and English together no matter which app language is selected",
                "n": "show only the currently selected app language",
                "blank": "same as n until you decide"
            }
        })
    except Exception as e:
        return jsonify({
            "error": str(e),
            **translation_file_info(path),
            "catalog": []
        }), 500


@app.route('/api/translations/catalog.txt', methods=['GET'])
def get_translation_catalog_text():
    path = latest_translation_file()
    try:
        sync_result = sync_translation_file_catalog(path)
        path = sync_result["path"]
        catalog = build_translation_catalog(path)
        lines = [
            "# Karen Music Director translation catalog",
            "# Format when translated:",
            "# file_key = Karen translation | y | plain app location description | generated refs",
            "# Use y to always show both languages. Use n to show only the selected language.",
            "# If a row has no y/n answer, keep it as file_key = Karen translation only.",
            f"# Synced missing keys into: {sync_result['path']}",
            "",
        ]
        for item in catalog:
            key = item.get("fileKey") or camel_to_snake(item.get("key"))
            karen = item.get("karen") or ""
            answer = item.get("policyAnswer") or ""
            if answer:
                description = item.get("fileDescription") or item.get("description") or ""
                refs = ", ".join(item.get("refs") or item.get("fileRefs") or [])
                lines.append(f"{key} = {karen} | {answer} | {description} | {refs}")
            else:
                lines.append(f"{key} = {karen}")
        response = make_response("\n".join(lines) + "\n")
        response.headers["Content-Type"] = "text/plain; charset=utf-8"
        response.headers["Cache-Control"] = "no-store, max-age=0"
        return response
    except Exception as e:
        return str(e), 500, {"Content-Type": "text/plain; charset=utf-8"}


@app.route('/api/translations/sync', methods=['POST'])
def sync_translations():
    path = latest_translation_file()
    try:
        sync_result = sync_translation_file_catalog(path)
        return jsonify({
            **translation_file_info(sync_result["path"]),
            "sync": sync_result,
            "catalogCount": len(build_translation_catalog(sync_result["path"])),
        })
    except Exception as e:
        return jsonify({"error": str(e), "path": path}), 500


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
            OR COALESCE(chart_json, '') LIKE ?
        )'''
        params.extend([like] * 17)

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
    song_dir = os.path.join(FILE_UPLOAD_DIR, f"song_{song_id}")
    os.makedirs(song_dir, exist_ok=True)
    stored_path = os.path.join(song_dir, stored_filename)
    upload.save(stored_path)

    files = normalize_file_metadata_value(row['file_metadata_json'])
    display_name = str(request.form.get('name') or upload.filename).strip()
    item = {
        "id": uuid4().hex,
        "name": display_name or upload.filename,
        "kind": str(request.form.get('kind') or "Reference").strip() or "Reference",
        "path": os.path.join(FILE_UPLOAD_NAME, f"song_{song_id}", stored_filename).replace("\\", "/"),
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
        stored_path = os.path.join(FILE_UPLOAD_DIR, f"song_{song_id}", removed["stored_filename"])
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
    song_dir = os.path.join(FILE_UPLOAD_DIR, f"song_{song_id}")
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

