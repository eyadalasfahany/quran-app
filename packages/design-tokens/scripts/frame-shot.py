"""Review helper: render one frame from quran-app-screens.html to a PNG with headless Chrome.

Phone frames (a `sc-host` screen) render at 390 x 844. Tablet frames (an `xw-device` window) render
at the device's declared size, read from its inline style or from the `.xw-device` rule.

usage: python3 packages/design-tokens/scripts/frame-shot.py <frame-id> <out.png>
"""
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[3] / 'quran-app-screens.html'


def find_chrome():
    """Chrome on the developer's Mac; elsewhere $CHROME, a chrome or chromium on PATH, or Playwright's Chromium."""
    candidates = [os.environ.get('CHROME'), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                  shutil.which('google-chrome'), shutil.which('chromium'), '/opt/pw-browsers/chromium']
    for path in candidates:
        if path and Path(path).exists():
            return path
    sys.exit('No Chrome found. Set CHROME to a Chrome or Chromium binary.')


CHROME = find_chrome()
FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri+Quran'
         '&family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap">')


def element_at(s, open_at):
    """The source of the <div> that opens at open_at, found by matching its closing tag."""
    depth = 0
    for m in re.finditer(r'<(/?)div\b', s[open_at:]):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return s[open_at:s.find('>', open_at + m.end()) + 1]
    sys.exit('unbalanced <div> in the frame')


def device_size(s, tag, opening):
    """Width and height of a tablet window: its inline style, else the .xw-device rule."""
    inline = re.search(r'width:\s*(\d+)px;\s*height:\s*(\d+)px', tag)
    if inline:
        return int(inline.group(1)), int(inline.group(2))
    rule = re.search(r'\.xw-device\{width:(\d+)px;height:(\d+)px', s)
    if rule:
        return int(rule.group(1)), int(rule.group(2))
    sys.exit('no size declared for the tablet window')


def render(frame_id, out):
    s = SRC.read_text(encoding='utf-8')
    head = s[:s.find('<body')]
    styles = ''.join(re.findall(r'<style>.*?</style>', head, re.S))

    start = s.find(f'id="{frame_id}"')
    if start < 0:
        sys.exit(f'frame {frame_id} not found')
    fig_end = s.find('class="gx-fig"', start + 1)
    fig_end = len(s) if fig_end < 0 else fig_end

    host = s.find('class="sc-host"', start)
    if 0 <= host < fig_end:
        open_at = s.find('<div', host + 1)
        screen = element_at(s, open_at)
        width, height = 390, 844
    else:
        device = s.find('class="xw-device"', start)
        if not 0 <= device < fig_end:
            sys.exit(f'frame {frame_id} has neither a phone screen nor a tablet window')
        open_at = s.rfind('<div', 0, device)
        screen = element_at(s, open_at)
        width, height = device_size(s, screen[:screen.find('>') + 1], open_at)

    doc = (f'<!doctype html><html><head><meta charset="utf-8">{FONTS}{styles}'
           '<style>body{margin:0;background:#fff}</style></head><body>'
           f'{screen}</body></html>')
    page = out.with_suffix('.html')
    page.write_text(doc, encoding='utf-8')
    # Linux containers run as root, where Chromium only starts without its sandbox.
    sandbox = ['--no-sandbox'] if sys.platform.startswith('linux') else []
    subprocess.run([CHROME, *sandbox, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=2',
                    f'--window-size={width},{height}', '--virtual-time-budget=4000',
                    f'--screenshot={out}', page.as_uri()], check=True, capture_output=True)
    print(out)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    render(sys.argv[1], Path(sys.argv[2]))
