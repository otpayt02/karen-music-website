from pathlib import Path

from PIL import Image


SCRIPT_DIR = Path(__file__).resolve().parent
ICON_PATH = SCRIPT_DIR / "app.ico"
OUTPUT_DIR = SCRIPT_DIR / "msix" / "Assets"


ASSETS = {
    "Square44x44Logo.png": (44, 44),
    "Square71x71Logo.png": (71, 71),
    "Square150x150Logo.png": (150, 150),
    "Square310x310Logo.png": (310, 310),
    "StoreLogo.png": (50, 50),
}


def load_icon():
    if not ICON_PATH.exists():
        raise FileNotFoundError(f"Missing {ICON_PATH}. Run create_default_icon.py first.")
    image = Image.open(ICON_PATH)
    image.seek(getattr(image, "n_frames", 1) - 1)
    return image.convert("RGBA")


def save_square_asset(icon, filename, size):
    canvas = Image.new("RGBA", size, (11, 17, 20, 255))
    inset = max(4, int(min(size) * 0.08))
    icon_size = (size[0] - inset * 2, size[1] - inset * 2)
    resized = icon.resize(icon_size, Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized, (inset, inset))
    canvas.save(OUTPUT_DIR / filename)


def save_wide_asset(icon):
    size = (310, 150)
    canvas = Image.new("RGBA", size, (11, 17, 20, 255))
    icon_size = (118, 118)
    resized = icon.resize(icon_size, Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized, (24, 16))
    canvas.save(OUTPUT_DIR / "Wide310x150Logo.png")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    icon = load_icon()
    for filename, size in ASSETS.items():
        save_square_asset(icon, filename, size)
    save_wide_asset(icon)
    print(f"Created MSIX assets in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
