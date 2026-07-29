"""Generate a private, permission-cleared OCR accuracy corpus for chord charts."""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont


CANVAS_SIZE = (1800, 2400)
FONT_CANDIDATES = {
    "round": [
        Path(r"C:\Windows\Fonts\segoepr.ttf"),
        Path(r"C:\Windows\Fonts\comic.ttf"),
    ],
    "upright": [
        Path(r"C:\Windows\Fonts\Inkfree.ttf"),
        Path(r"C:\Windows\Fonts\segoepr.ttf"),
    ],
    "slanted": [
        Path(r"C:\Windows\Fonts\comici.ttf"),
        Path(r"C:\Windows\Fonts\comic.ttf"),
    ],
}


def beat(chord="", bass="", *, circle=False, dot=False, x_marks=0):
    return {
        "chord": chord,
        "bass": bass,
        "circle": circle,
        "dot": dot,
        "x_marks": x_marks,
    }


def sample_definitions():
    return [
        {
            "id": "round-pen-4-4",
            "filename": "round-pen-4-4.png",
            "source_kind": "handwritten-image",
            "handwriting_style": "rounded print",
            "font_style": "round",
            "paper": "#f7f0dd",
            "ink": "#16395d",
            "rule": "#b6c9d5",
            "rotation": -0.35,
            "metadata": {
                "title": "Cedar River",
                "title_karen": "",
                "category": "Youth",
                "current_key": "G",
                "original_key": "Bb",
                "style": "Worship",
                "tempo": "84",
                "time_signature": "4/4",
                "instruments": ["Piano 1", "Drums"],
                "song_group": "Youth Team",
                "notes": "Arrangement test only",
            },
            "sections": [
                {"type": "Verse", "measures": [
                    [beat("G", circle=True), beat(), beat("C", dot=True), beat()],
                    [beat("D", "F#"), beat(), beat("Em"), beat(x_marks=1)],
                ]},
                {"type": "Chorus", "measures": [
                    [beat("C"), beat("G", "B"), beat("Am7"), beat("F")],
                    [beat(x_marks=2), beat("G"), beat("D7"), beat("G", dot=True)],
                ]},
            ],
        },
        {
            "id": "upright-marker-3-4",
            "filename": "upright-marker-3-4.png",
            "source_kind": "handwritten-image",
            "handwriting_style": "upright marker",
            "font_style": "upright",
            "paper": "#f5f2e9",
            "ink": "#342d74",
            "rule": "#c8c1dc",
            "rotation": 0.2,
            "metadata": {
                "title": "Morning Mercy",
                "title_karen": "",
                "category": "Choir",
                "current_key": "D",
                "original_key": "D",
                "style": "Hymn",
                "tempo": "72",
                "time_signature": "3/4",
                "instruments": ["Piano 1", "Acoustic Guitar"],
                "song_group": "Choir",
                "notes": "Three beat rehearsal chart",
            },
            "sections": [
                {"type": "Verse", "measures": [
                    [beat("D", circle=True), beat("A", "C#"), beat("Bm")],
                    [beat("G", dot=True), beat("D", "F#"), beat(x_marks=1)],
                ]},
                {"type": "Bridge", "measures": [
                    [beat("Em7"), beat("A7"), beat("D")],
                    [beat(x_marks=3), beat("G"), beat("A", dot=True)],
                ]},
            ],
        },
        {
            "id": "slanted-pencil-6-8",
            "filename": "slanted-pencil-6-8.png",
            "source_kind": "handwritten-image",
            "handwriting_style": "slanted pencil",
            "font_style": "slanted",
            "paper": "#f2eee5",
            "ink": "#3d4b42",
            "rule": "#bdc8be",
            "rotation": -0.8,
            "metadata": {
                "title": "Harbor Light",
                "title_karen": "",
                "category": "Praise",
                "current_key": "Bb",
                "original_key": "Ab",
                "style": "Gospel",
                "tempo": "96",
                "time_signature": "6/8",
                "instruments": ["Piano 2", "Electric Bass", "Drums"],
                "song_group": "Sunday Band",
                "notes": "Six beat arrangement test",
            },
            "sections": [
                {"type": "Intro", "measures": [
                    [beat("Bb", circle=True), beat(), beat(), beat("F", "A"), beat(), beat()],
                    [beat("Gm7"), beat(), beat("Eb", dot=True), beat(), beat(x_marks=1), beat()],
                ]},
                {"type": "Chorus", "measures": [
                    [beat("Eb"), beat(), beat("Bb", "D"), beat(), beat("Cm7"), beat()],
                    [beat(x_marks=4), beat(), beat("F7"), beat(), beat("Bb", dot=True), beat()],
                ]},
            ],
        },
        {
            "id": "multipage-performance-chart",
            "filename": "multipage-performance-chart.pdf",
            "source_kind": "multipage-pdf",
            "handwriting_style": "two-page handwritten performance chart",
            "font_style": "round",
            "paper": "#f7f0dd",
            "ink": "#283b4a",
            "rule": "#c1ccd3",
            "rotation": 0,
            "metadata": {
                "title": "Open Hands",
                "title_karen": "",
                "category": "Worship",
                "current_key": "C",
                "original_key": "Db",
                "style": "Worship Ballad",
                "tempo": "88",
                "time_signature": "4/4",
                "instruments": ["Piano 1", "Electric Guitar", "Drums"],
                "song_group": "Main Team",
                "notes": "Two page performance order",
            },
            "pages": [
                ["Intro", "Verse"],
                ["Chorus", "Ending"],
            ],
            "sections": [
                {"type": "Intro", "measures": [
                    [beat("C", circle=True), beat(), beat("G", "B"), beat()],
                    [beat("Am7"), beat(), beat("F", dot=True), beat()],
                ]},
                {"type": "Verse", "measures": [
                    [beat("C"), beat("Em", "B"), beat("F"), beat("G")],
                    [beat(x_marks=1), beat("Am7"), beat("F"), beat("G7")],
                ]},
                {"type": "Chorus", "measures": [
                    [beat("F", circle=True), beat("G"), beat("Em7"), beat("Am7")],
                    [beat("Dm7"), beat("G", "B"), beat("C"), beat(x_marks=2)],
                ]},
                {"type": "Ending", "measures": [
                    [beat("F"), beat("G7"), beat("C", dot=True), beat()],
                    [beat(x_marks=4), beat(), beat("C", circle=True), beat("C", dot=True)],
                ]},
            ],
        },
    ]


def _font_path(style):
    for candidate in FONT_CANDIDATES[style]:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"No local handwriting font was found for style: {style}")


def _font(path, size):
    return ImageFont.truetype(str(path), size)


def _text_center(draw, xy, text, font, fill):
    box = draw.textbbox((0, 0), text, font=font)
    width = box[2] - box[0]
    height = box[3] - box[1]
    draw.text((xy[0] - width / 2, xy[1] - height / 2), text, font=font, fill=fill)


def _metadata_lines(metadata):
    return [
        f"Title: {metadata['title']}",
        f"Category: {metadata['category']}    Current Key: {metadata['current_key']}    Original Key: {metadata['original_key']}",
        f"Style: {metadata['style']}    Tempo: {metadata['tempo']} BPM    Time: {metadata['time_signature']}",
        f"Instruments: {', '.join(metadata['instruments'])}",
        f"Group: {metadata['song_group']}    Notes: {metadata['notes']}",
    ]


def _draw_beat(draw, box, value, font, ink, jitter):
    left, top, right, bottom = box
    cx = (left + right) / 2 + jitter.randint(-3, 3)
    cy = (top + bottom) / 2 + jitter.randint(-2, 2)
    if value["x_marks"]:
        count = value["x_marks"]
        spacing = 34
        start = cx - ((count - 1) * spacing) / 2
        for index in range(count):
            x = start + index * spacing
            size = 17
            draw.line((x - size, cy - size, x + size, cy + size), fill=ink, width=5)
            draw.line((x - size, cy + size, x + size, cy - size), fill=ink, width=5)
        return
    symbol = value["chord"] + (f"/{value['bass']}" if value["bass"] else "")
    if not symbol:
        return
    text_box = draw.textbbox((0, 0), symbol, font=font)
    text_width = text_box[2] - text_box[0]
    text_height = text_box[3] - text_box[1]
    text_xy = (cx - text_width / 2, cy - text_height / 2)
    draw.text(text_xy, symbol, font=font, fill=ink)
    if value["circle"]:
        pad_x = 20
        pad_y = 12
        draw.ellipse(
            (
                text_xy[0] - pad_x,
                text_xy[1] - pad_y,
                text_xy[0] + text_width + pad_x,
                text_xy[1] + text_height + pad_y,
            ),
            outline=ink,
            width=4,
        )
    if value["dot"]:
        radius = 7
        dot_x = text_xy[0] + text_width + 18
        dot_y = text_xy[1] + text_height - 5
        draw.ellipse((dot_x - radius, dot_y - radius, dot_x + radius, dot_y + radius), fill=ink)


def _draw_chart_page(sample, sections, page_number=1, page_count=1):
    image = Image.new("RGB", CANVAS_SIZE, sample["paper"])
    draw = ImageDraw.Draw(image)
    rng = random.Random(f"{sample['id']}-{page_number}")
    font_path = _font_path(sample["font_style"])
    title_font = _font(font_path, 76)
    meta_font = _font(font_path, 38)
    section_font = _font(font_path, 54)
    chord_font = _font(font_path, 54)
    small_font = _font(font_path, 28)
    ink = sample["ink"]
    rule = sample["rule"]

    for y in range(110, CANVAS_SIZE[1] - 100, 72):
        draw.line((70, y, CANVAS_SIZE[0] - 70, y), fill=rule, width=1)

    title = sample["metadata"]["title"]
    if page_count > 1 and page_number > 1:
        title = f"{title} - Page {page_number} Continued"
    draw.text((105, 85), title, font=title_font, fill=ink)
    y = 205
    if page_number == 1:
        for line in _metadata_lines(sample["metadata"]):
            draw.text((110 + rng.randint(-2, 2), y), line, font=meta_font, fill=ink)
            y += 66
    else:
        compact = (
            f"Key: {sample['metadata']['current_key']}    "
            f"Tempo: {sample['metadata']['tempo']}    "
            f"Time: {sample['metadata']['time_signature']}"
        )
        draw.text((110, y), compact, font=meta_font, fill=ink)
        y += 82

    beats_per_measure = int(sample["metadata"]["time_signature"].split("/", 1)[0])
    chart_left = 110
    chart_right = CANVAS_SIZE[0] - 110
    measure_height = 142
    for section in sections:
        y += 24
        draw.text((chart_left, y), section["type"].upper(), font=section_font, fill=ink)
        y += 78
        for measure_index, beats in enumerate(section["measures"], start=1):
            top = y
            bottom = y + measure_height
            draw.line((chart_left, top, chart_right, top), fill=ink, width=4)
            draw.line((chart_left, bottom, chart_right, bottom), fill=ink, width=4)
            draw.line((chart_left, top, chart_left, bottom), fill=ink, width=6)
            draw.line((chart_right, top, chart_right, bottom), fill=ink, width=6)
            beat_width = (chart_right - chart_left) / beats_per_measure
            for beat_index in range(1, beats_per_measure):
                x = chart_left + beat_index * beat_width
                draw.line((x, top, x, bottom), fill=rule, width=2)
            for beat_index, value in enumerate(beats):
                left = chart_left + beat_index * beat_width
                right = left + beat_width
                _draw_beat(draw, (left, top, right, bottom), value, chord_font, ink, rng)
            draw.text((chart_left - 66, top + 48), str(measure_index), font=small_font, fill=ink)
            y = bottom + 24

    footer = (
        f"SYNTHETIC TEST CHART - NO REAL SONG OR PERSONAL DATA    "
        f"Page {page_number}/{page_count}"
    )
    draw.text((105, CANVAS_SIZE[1] - 78), footer, font=small_font, fill=ink)
    if sample.get("rotation"):
        image = image.rotate(
            sample["rotation"],
            resample=Image.Resampling.BICUBIC,
            expand=False,
            fillcolor=sample["paper"],
        )
    if sample["font_style"] == "slanted":
        image = ImageEnhance.Contrast(image).enhance(0.92)
    return image


def _sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def generate_corpus(output_dir):
    output_dir = Path(output_dir).resolve()
    source_dir = output_dir / "sources"
    expected_dir = output_dir / "expected"
    page_dir = source_dir / "pdf-pages"
    source_dir.mkdir(parents=True, exist_ok=True)
    expected_dir.mkdir(parents=True, exist_ok=True)
    page_dir.mkdir(parents=True, exist_ok=True)
    index_samples = []

    for sample in sample_definitions():
        source_path = source_dir / sample["filename"]
        if sample["source_kind"] == "multipage-pdf":
            pages = []
            for page_number, section_names in enumerate(sample["pages"], start=1):
                sections = [section for section in sample["sections"] if section["type"] in section_names]
                page = _draw_chart_page(sample, sections, page_number, len(sample["pages"]))
                preview_path = page_dir / f"{sample['id']}-page-{page_number}.png"
                page.save(preview_path, "PNG", optimize=True)
                pages.append(page.convert("RGB"))
            pages[0].save(
                source_path,
                "PDF",
                save_all=True,
                append_images=pages[1:],
                resolution=150.0,
                quality=92,
            )
        else:
            image = _draw_chart_page(sample, sample["sections"])
            image.save(source_path, "PNG", optimize=True)

        expected = {
            "id": sample["id"],
            "source_file": f"sources/{sample['filename']}",
            "source_kind": sample["source_kind"],
            "handwriting_style": sample["handwriting_style"],
            "permission": {
                "status": "permission-cleared",
                "basis": "Synthetic fixture generated locally by this repository; no real song, person, or community chart is included.",
                "publication": "private-only unless separately approved",
            },
            "metadata": sample["metadata"],
            "sections": sample["sections"],
            "sha256": _sha256(source_path),
        }
        expected_path = expected_dir / f"{sample['id']}.expected.json"
        expected_path.write_text(json.dumps(expected, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        index_samples.append({
            "id": sample["id"],
            "source": expected["source_file"],
            "expected": f"expected/{expected_path.name}",
            "source_kind": sample["source_kind"],
            "handwriting_style": sample["handwriting_style"],
            "permission_status": "permission-cleared",
            "sha256": expected["sha256"],
        })

    manifest = {
        "version": "2026-07-18",
        "private": True,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "raw_provider_payloads_retained": False,
        "save_policy": "OCR results are scored in memory and never saved as songs.",
        "samples": index_samples,
    }
    manifest_path = output_dir / "corpus-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    readme = """# Private synthetic import accuracy corpus

This folder is generated locally and ignored by Git. Every source is synthetic,
contains no real song or personal data, and is permission-cleared for private
testing. OCR files may be sent to configured providers only for accuracy runs.
Raw provider payloads are not retained. Imported results are never saved as songs.
"""
    (output_dir / "README.md").write_text(readme, encoding="utf-8")
    return manifest_path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        default="private/import_accuracy_corpus",
        help="Private output directory (default: private/import_accuracy_corpus)",
    )
    args = parser.parse_args()
    manifest_path = generate_corpus(args.output)
    print(manifest_path)


if __name__ == "__main__":
    main()
