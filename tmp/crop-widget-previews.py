"""Crop Android widget picker previews from the AndroidWidgets frame shot (2×)."""
from pathlib import Path

from PIL import Image

# frame-shot renders the 390×844 sc-host at device pixel ratio 2 → 780×1688
SCALE = 2
SRC = Path("tmp/widget-frames/AndroidWidgets.png")
OUT = Path("apps/mobile/assets/widget-previews")
OUT.mkdir(parents=True, exist_ok=True)

# 1× layout from AndroidWidgets HTML (sc-host coords)
# top row at y=52; left inset 26; gap 22; small 160; wide 338
# RTL: first child (NextPrayer) on the right, Misbaha on the left
CROPS_1X = {
    "Misbaha": (26, 52, 160, 160),
    "NextPrayer": (26 + 160 + 22, 52, 160, 160),
    "Progress": (26, 52 + 160 + 22, 338, 160),
    "ContinueReading": (26, 52 + 2 * (160 + 22), 338, 160),
    "NextPrayerWide": (26, 52 + 3 * (160 + 22), 338, 160),
}


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    for name, (x, y, w, h) in CROPS_1X.items():
        box = (x * SCALE, y * SCALE, (x + w) * SCALE, (y + h) * SCALE)
        crop = img.crop(box)
        dest = OUT / f"{name}.png"
        crop.save(dest)
        print(dest, crop.size)


if __name__ == "__main__":
    main()
