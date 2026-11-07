"""Read the phone and tablet screen designs in screens/ (ADR 0075).

screens/index.html holds the sections, headings and notes, and loads each frame from
screens/frames/<section>/<FrameId>.html in an iframe. Shared styles live in screens/screens.css and
the shared script in screens/screens.js; images live in design-assets/.

Tools that still want everything in one document call combined(): the index with every iframe
replaced by its frame's markup, in the form the old quran-app-screens.html used.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCREENS = ROOT / 'screens'
INDEX = SCREENS / 'index.html'
CSS = SCREENS / 'screens.css'

IFRAME = re.compile(r'<iframe class="gx-frame[^"]*" src="(frames/[^"]+)" width="(\d+)" height="(\d+)"[^>]*></iframe>')
BODY = re.compile(r'<body[^>]*>\n(.*)\n<script src="../../screens.js"></script>\n</body>', re.S)


def frames():
    """{frame id: (path, width, height)} in index order."""
    out = {}
    for m in IFRAME.finditer(INDEX.read_text(encoding='utf-8')):
        path = SCREENS / m.group(1)
        out[path.stem] = (path, int(m.group(2)), int(m.group(3)))
    return out


def frame_markup(path):
    """A frame's screen element as the monolith had it: links point at #ids, images at design-assets/."""
    m = BODY.search(Path(path).read_text(encoding='utf-8'))
    if not m:
        raise ValueError(f'{path}: no frame body')
    return m.group(1).replace('href="../../index.html#', 'href="#').replace('../../../design-assets/', 'design-assets/')


def css():
    """screens.css without its font @import (callers add their own font link)."""
    return re.sub(r'^@import[^;]+;\n', '', CSS.read_text(encoding='utf-8'), flags=re.M)


def combined():
    """The whole design as one document, in the form the old quran-app-screens.html used."""
    index = INDEX.read_text(encoding='utf-8')
    index = index.replace('<link rel="stylesheet" href="screens.css">', f'<style>{css()}</style>', 1)
    return IFRAME.sub(lambda m: frame_markup(SCREENS / m.group(1)), index)
