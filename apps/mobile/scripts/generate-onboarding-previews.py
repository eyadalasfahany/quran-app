#!/usr/bin/env python3
"""Dev tool: crop the onboarding mushaf previews from the cached King Fahd Complex SVG pages.

For each riwayah it finds the page where surah 3 starts (from the cached JSON polygons), renders that raw page SVG
with headless Chrome, and crops a 1074 x 571 window that starts just above the surah title. The output is black ink on
a transparent background (the card tints it). It crops the artwork; it never redraws or alters a letter.

usage: python3 -I apps/mobile/scripts/generate-onboarding-previews.py [KEY ...]
needs: headless Chrome (CHROME env, or Google Chrome on the Mac) and ImageMagick (`magick`).
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
SOURCE_ROOT = (
    REPO / "apps/api/storage/app/private/sources/svg-mushaf/3ff27b46cecb0c0519d77531d9c868a579d1f623/mushafs"
)
OUT_DIR = REPO / "apps/mobile/assets/mushaf"

# App key -> folder in the cached source.
FOLDERS = {"hafs": "hafs", "warsh": "warsh", "qalun": "qalon", "shubah": "shubah", "duri": "douri"}

SURAH = 3
PAGE_VIEWBOX = (345, 550)  # the raw page's viewBox width and height
CROP_W, CROP_H = 1074, 571  # the Hafs asset's size, which the card's ratio is built on
RENDER_W = CROP_W
LEAD = 30  # pixels of paper above the surah title, as in the shipped Hafs asset
SHIFT_LIMIT = 12  # how far the top may move to keep the last line whole


def find_page(folder: str) -> int:
    """The page whose JSON holds surah 3, ayah 1."""
    for path in sorted((SOURCE_ROOT / folder / "kfqc/json").glob("*.json")):
        ayahs = json.loads(path.read_text(encoding="utf-8"))
        if any(a.get("surahNumber") == SURAH and a.get("ayahNumber") == 1 for a in ayahs):
            return int(path.stem)
    sys.exit(f"{folder}: no page holds surah {SURAH} ayah 1")


def find_chrome() -> str:
    candidates = [
        os.environ.get("CHROME"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        shutil.which("google-chrome"),
        shutil.which("chromium"),
    ]
    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate
    sys.exit("No Chrome found. Set CHROME to a Chrome or Chromium binary.")


def render_page(chrome: str, svg: Path, workdir: Path, height: int) -> Path:
    """Draw the raw SVG at RENDER_W wide, transparent, and return the PNG path."""
    html = workdir / "page.html"
    html.write_text(
        '<!doctype html><html><head><style>html,body{margin:0;background:transparent}'
        f'img{{display:block;width:{RENDER_W}px;height:{height}px}}</style></head>'
        f'<body><img src="{svg.as_uri()}"></body></html>',
        encoding="utf-8",
    )
    png = workdir / "page.png"
    subprocess.run(
        [
            chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
            "--default-background-color=00000000", f"--window-size={RENDER_W},{height}",
            f"--screenshot={png}", html.as_uri(),
        ],
        check=True,
        capture_output=True,
    )
    return png


def ink_profile(png: Path, height: int) -> list[int]:
    """Mean alpha of each row, 0-255. Blank rows are 0."""
    raw = subprocess.run(
        ["magick", str(png), "-alpha", "extract", "-resize", f"1x{height}!", "gray:-"],
        check=True,
        capture_output=True,
    ).stdout
    return list(raw)


def choose_top(profile: list[int]) -> int:
    """The crop top: LEAD above the first ink row, moved by the least amount that leaves the bottom edge on blank paper."""
    first = next(i for i, value in enumerate(profile) if value > 0)
    base = max(0, first - LEAD)
    for shift in sorted(range(-SHIFT_LIMIT, SHIFT_LIMIT + 1), key=abs):
        top = base + shift
        bottom = top + CROP_H
        if top >= 0 and bottom <= len(profile) and max(profile[bottom - 3 : bottom]) <= 3:
            return top
    sys.exit("no crop top leaves the last line whole; check the page by hand")


def crop(png: Path, top: int, out: Path) -> None:
    subprocess.run(
        [
            "magick", str(png), "-crop", f"{CROP_W}x{CROP_H}+0+{top}", "+repage",
            "-channel", "RGB", "-evaluate", "set", "0", "+channel",
            "-define", "png:color-type=4", "-strip", str(out),
        ],
        check=True,
    )


def main(keys: list[str]) -> None:
    chrome = find_chrome()
    for key in keys:
        folder = FOLDERS[key]
        page = find_page(folder)
        svg = SOURCE_ROOT / folder / "kfqc/svg" / f"{page:03d}.svg"
        height = round(RENDER_W * PAGE_VIEWBOX[1] / PAGE_VIEWBOX[0])
        with tempfile.TemporaryDirectory() as workdir:
            png = render_page(chrome, svg, Path(workdir), height)
            profile = ink_profile(png, height)
            top = choose_top(profile)
            out = OUT_DIR / f"onboarding-preview-{key}.png"
            crop(png, top, out)
        print(f"{key}: page {page:03d}, crop top {top}, {out.relative_to(REPO)}, {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    selected = sys.argv[1:] or list(FOLDERS)
    unknown = [key for key in selected if key not in FOLDERS]
    if unknown:
        sys.exit(f"unknown riwayah key: {', '.join(unknown)}")
    main(selected)
