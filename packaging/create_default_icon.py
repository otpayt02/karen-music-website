import sys
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "app.ico"


def make_icon(size):
    scale = size / 64
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    def p(value):
        return int(round(value * scale))

    draw.rounded_rectangle(
        (0, 0, size - 1, size - 1),
        radius=p(14),
        fill=(11, 17, 20, 255),
    )

    gold = (216, 166, 87, 255)
    teal = (79, 179, 164, 255)

    # Blocky K mark from the website favicon, scaled for small Windows icons.
    draw.rectangle((p(14), p(17), p(22), p(43)), fill=gold)
    draw.polygon(
        [(p(22), p(29)), (p(35), p(17)), (p(45), p(17)), (p(31), p(30)), (p(46), p(43)), (p(35), p(43))],
        fill=gold,
    )
    draw.line((p(48), p(18), p(48), p(46)), fill=teal, width=max(1, p(4)))
    draw.ellipse((p(45), p(42), p(51), p(48)), fill=teal)

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
