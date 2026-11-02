#!/usr/bin/env python3
"""Compose every store screenshot from sources/raw + manifest.json (headless Chrome, device scale 1).

Each slide: brand mark, headline and supporting line on top; the real app capture in a device frame below;
a faint gold eight-point-star pattern behind. Slides 01 and 08 use the deep green theme, the rest paper.
Quran text appears only inside the real captures, never in the composed copy.

Usage: python3 compose.py [--only <outDir substring>]
"""

from __future__ import annotations

import argparse
import html
import json
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE.parent
ROOT = BASE.parents[3]
FONTS = ROOT / 'apps/mobile/assets/fonts'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
DARK_SLIDES = {'01-hero', '08-privacy'}
CAPTURE_MAP = {'08-privacy': '08-home'}

# Per layout: header height and type sizes as fractions of the canvas width; device width cap; frame proportions.
LAYOUTS = {
    'phone': {'header': 0.42, 'brand': 0.060, 'headline': 0.074, 'sub': 0.038, 'maxW': 0.80,
              'bezel': 0.030, 'radius': 0.125, 'screenRadius': 0.100, 'pad': 0.06},
    'tablet': {'header': 0.205, 'brand': 0.036, 'headline': 0.054, 'sub': 0.026, 'maxW': 0.84,
               'bezel': 0.022, 'radius': 0.050, 'screenRadius': 0.034, 'pad': 0.05},
}


def png_size(path: Path) -> tuple[int, int]:
    with path.open('rb') as f:
        head = f.read(24)
    return struct.unpack('>II', head[16:24])


def device_box(width: int, height: int, cap_w: int, cap_h: int, lay: dict) -> dict:
    """Largest frame that fits under the header, capped at maxW of the canvas."""
    header = width * lay['header']
    bottom = width * lay['pad'] * 0.6
    avail_h = height - header - bottom
    aspect = cap_h / cap_w
    screen_w = width * lay['maxW']
    bezel = screen_w * lay['bezel']
    if screen_w * aspect + 2 * bezel > avail_h:
        screen_w = (avail_h - 2 * bezel) / (aspect + 2 * lay['bezel'])
        bezel = screen_w * lay['bezel']
    screen_h = screen_w * aspect
    dev_w, dev_h = screen_w + 2 * bezel, screen_h + 2 * bezel
    # Centre the device in the space under the header.
    top = header + max(0.0, (avail_h - dev_h) / 2)
    return {'screenW': screen_w, 'screenH': screen_h, 'bezel': bezel, 'devW': dev_w, 'devH': dev_h,
            'left': (width - dev_w) / 2, 'top': top, 'header': header}


def page(width: int, height: int, layout: str, lang: str, dark: bool, headline: str, sub: str, capture: Path) -> str:
    lay = LAYOUTS[layout]
    cap_w, cap_h = png_size(capture)
    box = device_box(width, height, cap_w, cap_h, lay)
    direction = 'rtl' if lang == 'ar' else 'ltr'
    brand = 'طيبة' if lang == 'ar' else 'طيبة <span class="latin">TAYBAH</span>'
    bg = ('radial-gradient(120% 70% at 50% 0%, #2A5F50 0%, #1F4D40 45%, #14342B 100%)' if dark else
          'radial-gradient(110% 60% at 50% 0%, #FFFDF8 0%, #F7F3EA 55%, #EFE8D8 100%)')
    ink, muted, brand_c = ('#FFFDF8', '#D9CFB4', '#C9A961') if dark else ('#13231F', '#5B6A64', '#1F4D40')
    star_op = 0.22 if dark else 0.30
    shadow = '0 60px 120px rgba(0,0,0,.45)' if dark else '0 50px 110px rgba(19,35,31,.22), 0 12px 30px rgba(19,35,31,.10)'
    w = width
    return f"""<!doctype html><html lang="{lang}" dir="{direction}"><head><meta charset="utf-8"><style>
@font-face {{ font-family: Plex; src: url('{(FONTS / 'IBMPlexSansArabic/IBMPlexSansArabic-Regular.ttf').as_uri()}'); font-weight: 400; }}
@font-face {{ font-family: Plex; src: url('{(FONTS / 'IBMPlexSansArabic/IBMPlexSansArabic-Bold.ttf').as_uri()}'); font-weight: 700; }}
@font-face {{ font-family: Amiri; src: url('{(FONTS / 'Amiri/Amiri-Bold.ttf').as_uri()}'); font-weight: 700; }}
* {{ box-sizing: border-box; margin: 0; }}
html, body {{ width: {width}px; height: {height}px; overflow: hidden; background: {bg}; }}
.canvas {{ position: relative; width: {width}px; height: {height}px; overflow: hidden; font-family: Plex, sans-serif; }}
.pattern {{ position: absolute; inset: 0; opacity: {star_op};
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, rgba(0,0,0,.55) {box['header'] / height * 100:.1f}%, transparent 78%); }}
header {{ position: absolute; top: 0; left: 0; right: 0; height: {box['header']:.0f}px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; padding: 0 {w * 0.07:.0f}px; gap: {w * lay['sub'] * 0.35:.0f}px; }}
.brand {{ font-family: Amiri, serif; font-weight: 700; color: {brand_c}; font-size: {w * lay['brand']:.0f}px; line-height: 1; display: flex; align-items: center; gap: {w * 0.02:.0f}px; }}
.brand .latin {{ font-family: Plex, sans-serif; font-weight: 400; font-size: .42em; letter-spacing: .32em; }}
.rule {{ width: {w * 0.12:.0f}px; height: {max(2, w * 0.0025):.0f}px; background: linear-gradient(90deg, transparent, #C9A961, transparent); }}
h1 {{ text-wrap: balance; color: {ink}; font-weight: 700; font-size: {w * lay['headline']:.0f}px; line-height: 1.22; letter-spacing: {'-0.01em' if lang == 'en' else '0'}; }}
p {{ text-wrap: balance; color: {muted}; font-size: {w * lay['sub']:.0f}px; line-height: 1.45; max-width: 92%; }}
.device {{ position: absolute; left: {box['left']:.1f}px; top: {box['top']:.1f}px; width: {box['devW']:.1f}px; height: {box['devH']:.1f}px;
  padding: {box['bezel']:.1f}px; border-radius: {box['devW'] * lay['radius']:.1f}px; background: linear-gradient(145deg, #2B3A35, #0E1916 60%);
  box-shadow: {shadow}, inset 0 0 0 {max(2, w * 0.002):.0f}px rgba(201,169,97,.35); }}
.screen {{ width: 100%; height: 100%; border-radius: {box['screenW'] * lay['screenRadius']:.1f}px; overflow: hidden; background: #F7F3EA; }}
.screen img {{ display: block; width: 100%; height: 100%; object-fit: cover; }}
</style></head><body><div class="canvas">
<svg class="pattern" width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg"><defs>
<pattern id="star" width="{w * 0.16:.0f}" height="{w * 0.16:.0f}" patternUnits="userSpaceOnUse">
<g fill="none" stroke="#C9A961" stroke-width="{max(1.5, w * 0.0018):.1f}" transform="translate({w * 0.08:.1f} {w * 0.08:.1f})">
<rect x="{-w * 0.04:.1f}" y="{-w * 0.04:.1f}" width="{w * 0.08:.1f}" height="{w * 0.08:.1f}"/>
<rect x="{-w * 0.04:.1f}" y="{-w * 0.04:.1f}" width="{w * 0.08:.1f}" height="{w * 0.08:.1f}" transform="rotate(45)"/>
<circle r="{w * 0.018:.1f}"/></g></pattern></defs>
<rect width="100%" height="100%" fill="url(#star)"/></svg>
<header><div class="brand">{brand}</div><div class="rule"></div><h1>{html.escape(headline)}</h1><p>{html.escape(sub)}</p></header>
<div class="device"><div class="screen"><img src="{capture.as_uri()}"></div></div>
</div></body></html>"""


def render(doc: str, width: int, height: int, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        page_path = Path(tmp) / 'slide.html'
        shot = Path(tmp) / 'shot.png'
        page_path.write_text(doc, encoding='utf-8')
        subprocess.run([CHROME, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
                        '--allow-file-access-from-files', f'--window-size={width},{height}', '--virtual-time-budget=3000',
                        f'--screenshot={shot}', page_path.as_uri()], check=True, capture_output=True)
        subprocess.run(['magick', str(shot), '-background', '#F7F3EA', '-alpha', 'remove', '-alpha', 'off',
                        '-crop', f'{width}x{height}+0+0', '+repage', f'PNG24:{out}'], check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', default='')
    args = parser.parse_args()
    data = json.loads((HERE / 'manifest.json').read_text(encoding='utf-8'))
    for st in data['sets']:
        if args.only and args.only not in st['outDir']:
            continue
        for lang in ('ar', 'en'):
            for slide in data['slides']:
                sid = slide['id']
                capture = HERE / 'raw' / f"{st['capturePrefix'][lang]}-{CAPTURE_MAP.get(sid, sid)}.png"
                if not capture.exists() and sid in CAPTURE_MAP:
                    capture = HERE / 'raw' / f"{st['capturePrefix'][lang]}-08-settings.png"
                if not capture.exists():
                    sys.exit(f'Missing capture {capture}')
                out = BASE / st['outDir'] / lang / f'{sid}.png'
                doc = page(st['width'], st['height'], st['layout'], lang, sid in DARK_SLIDES,
                           slide['headline'][lang], slide['sub'][lang], capture)
                render(doc, st['width'], st['height'], out)
                print(out.relative_to(ROOT))


if __name__ == '__main__':
    if not shutil.which('magick'):
        sys.exit('ImageMagick (magick) is required.')
    main()
