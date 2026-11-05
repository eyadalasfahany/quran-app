#!/usr/bin/env python3
"""Generate the website's fonts and app screenshots.

Idempotent: running it again overwrites the same outputs with the same bytes.
Run from anywhere; all paths resolve from this file's location.

    python website/scripts/build-assets.py

Needs Pillow and fontTools (no brotli: fonts are written as WOFF 1.0).
"""

from __future__ import annotations

from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
WEBSITE = REPO / "website"
FONT_SRC = REPO / "apps" / "mobile" / "assets" / "fonts"
FONT_OUT = WEBSITE / "assets" / "fonts"
SHOT_SRC = REPO / "docs" / "branding" / "app-store-assets" / "store-screenshots" / "sources" / "raw"
SHOT_OUT = WEBSITE / "assets" / "images" / "app"

FONTS = [
    "IBMPlexSansArabic/IBMPlexSansArabic-Regular.ttf",
    "IBMPlexSansArabic/IBMPlexSansArabic-Medium.ttf",
    "IBMPlexSansArabic/IBMPlexSansArabic-SemiBold.ttf",
    "IBMPlexSansArabic/IBMPlexSansArabic-Bold.ttf",
    "Amiri/Amiri-Regular.ttf",
    "Amiri/Amiri-Bold.ttf",
]

# Latin basic + Latin-1, Arabic, Arabic supplement, Arabic presentation forms,
# general punctuation. Nothing else is needed by the site's copy.
UNICODES = (
    "U+0020-007E,U+00A0-00FF,U+0600-06FF,U+0750-077F,"
    "U+2010-2027,U+2030-205E,U+FB50-FDFF,U+FE70-FEFF"
)

PHONE_SLIDES = [
    "01-hero",
    "02-recitation",
    "03-tafsir",
    "04-salah",
    "05-qibla",
    "06-azkar",
    "07-khatma",
    "08-home",
]
IPAD_SLIDES = ["03-tafsir", "04-salah"]
WATCH_SLIDES = ["01-next-prayer", "02-prayers", "03-misbaha", "04-azkar"]
PHONE_WIDTH = 640
IPAD_WIDTH = 1100
WATCH_WIDTH = 300
WEBP_QUALITY = 80
WEBP_METHOD = 6


def parse_unicodes(spec: str) -> list[int]:
    out: list[int] = []
    for part in spec.split(","):
        part = part.strip().removeprefix("U+")
        if "-" in part:
            lo, hi = part.split("-")
            out.extend(range(int(lo, 16), int(hi, 16) + 1))
        else:
            out.append(int(part, 16))
    return out


def build_fonts() -> None:
    FONT_OUT.mkdir(parents=True, exist_ok=True)
    codepoints = parse_unicodes(UNICODES)
    for rel in FONTS:
        src = FONT_SRC / rel
        out = FONT_OUT / (Path(rel).stem + ".woff")

        options = subset.Options()
        options.flavor = "woff"
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.name_legacy = True
        options.name_languages = ["*"]
        options.notdef_outline = True

        font = TTFont(str(src))
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=codepoints)
        subsetter.subset(font)
        font.flavor = "woff"
        font.save(str(out))
        print(f"font  {out.relative_to(REPO).as_posix()}  {out.stat().st_size} bytes")


def save_webp(img: Image.Image, out: Path, quality: int = WEBP_QUALITY) -> None:
    img.save(out, "WEBP", quality=quality, method=WEBP_METHOD)
    print(f"image {out.relative_to(REPO).as_posix()}  {img.size[0]}x{img.size[1]}  {out.stat().st_size} bytes")


def resize_to_width(img: Image.Image, width: int) -> Image.Image:
    height = round(img.size[1] * width / img.size[0])
    return img.resize((width, height), Image.Resampling.LANCZOS)


def build_screenshots() -> None:
    SHOT_OUT.mkdir(parents=True, exist_ok=True)
    for lang in ("ar", "en"):
        for slide in PHONE_SLIDES:
            src = SHOT_SRC / f"iphone-{lang}-{slide}.png"
            out = SHOT_OUT / f"{lang}-{slide}.webp"
            with Image.open(src) as im:
                save_webp(resize_to_width(im.convert("RGBA"), PHONE_WIDTH), out)

        for slide in IPAD_SLIDES:
            src = SHOT_SRC / f"ipad-{lang}-{slide}.png"
            out = SHOT_OUT / f"{lang}-ipad-{slide}.webp"
            with Image.open(src) as im:
                save_webp(resize_to_width(im.convert("RGBA"), IPAD_WIDTH), out, quality=78)

        for slide in WATCH_SLIDES:
            src = SHOT_SRC / f"watch-{lang}-{slide}.png"
            out = SHOT_OUT / f"{lang}-watch-{slide}.webp"
            with Image.open(src) as im:
                save_webp(resize_to_width(im.convert("RGBA"), WATCH_WIDTH), out, quality=85)


def main() -> None:
    build_fonts()
    build_screenshots()


if __name__ == "__main__":
    main()
