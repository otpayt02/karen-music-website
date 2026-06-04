import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "app.ico"


def make_icon(size):
    scale = size / 64
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    def p(value):
        return int(round(value * scale))

    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=p(13), fill=(13, 34, 24, 255))
    draw.polygon([(0, 0), (size, 0), (size, p(30)), (0, p(44))], fill=(30, 105, 71, 255))
    draw.polygon([(0, p(42)), (size, p(28)), (size, size), (0, size)], fill=(176, 42, 38, 255))
    draw.rectangle((0, p(38), size, p(44)), fill=(218, 168, 64, 255))
    draw.line((p(6), p(55), p(24), p(48)), fill=(71, 126, 59, 150), width=max(1, p(2)))
    draw.line((p(24), p(55), p(44), p(47)), fill=(71, 126, 59, 135), width=max(1, p(2)))
    draw.line((p(42), p(55), p(59), p(49)), fill=(71, 126, 59, 130), width=max(1, p(2)))
    draw.rounded_rectangle((p(2), p(2), size - p(3), size - p(3)), radius=p(12), outline=(255, 241, 191, 150), width=max(1, p(1)))

    gold = (255, 223, 129, 255)
    ink = (255, 249, 228, 255)
    red = (218, 64, 56, 255)

    # Four beat cells inside one measure.
    left, top, right, bottom = p(7), p(17), p(57), p(47)
    draw.rectangle((left, top, right, bottom), outline=gold, width=max(1, p(2)))
    for x in (p(19.5), p(32), p(44.5)):
        draw.line((x, top, x, bottom), fill=(255, 223, 129, 185), width=max(1, p(1)))

    # Slur leans into the vowel area of the second beat.
    draw.arc((p(10), p(7), p(36), p(30)), start=196, end=350, fill=ink, width=max(1, p(2)))

    font_path = Path(r"C:\Windows\Fonts\mmrtextb.ttf")
    try:
        font = ImageFont.truetype(str(font_path), p(10))
    except Exception:
        font = ImageFont.load_default()

    syllables = ["က", "ညီ", "သး", "ဝံ"]
    centers = [p(13.2), p(25.8), p(38.3), p(50.8)]
    for i, text in enumerate(syllables):
        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        text_x = int(round(centers[i] - text_w / 2))
        text_y = p(22) - text_h // 2
        draw.text((text_x + p(0.7), text_y + p(0.7)), text, font=font, fill=(0, 0, 0, 120))
        draw.text((text_x, text_y), text, font=font, fill=ink)
        underline_y = p(38)
        draw.line((centers[i] - p(4), underline_y, centers[i] + p(4), underline_y), fill=gold, width=max(1, p(1.6)))
        x_y = p(42)
        x_half = p(2.4)
        draw.line((centers[i] - x_half, x_y - x_half, centers[i] + x_half, x_y + x_half), fill=red, width=max(1, p(1.4)))
        draw.line((centers[i] + x_half, x_y - x_half, centers[i] - x_half, x_y + x_half), fill=red, width=max(1, p(1.4)))

    return image


def main():
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUTPUT
    output.parent.mkdir(parents=True, exist_ok=True)
    sizes = [16, 24, 32, 48, 64, 128, 256]
    images = [make_icon(size) for size in sizes]
    images[-1].save(output, format="ICO", sizes=[(size, size) for size in sizes], append_images=images[:-1])
    print(f"Created {output}")


if __name__ == "__main__":
    main()
