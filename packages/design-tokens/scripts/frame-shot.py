"""Review helper: render one phone frame from quran-app-screens.html to a PNG with headless Chrome.

usage: python3 packages/design-tokens/scripts/frame-shot.py <frame-id> <out.png>
"""
import re
import subprocess
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[3] / 'quran-app-screens.html'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri+Quran'
         '&family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap">')

frame_id, out = sys.argv[1], Path(sys.argv[2])
s = SRC.read_text(encoding='utf-8')
head = s[:s.find('<body')]
styles = ''.join(re.findall(r'<style>.*?</style>', head, re.S))

start = s.find(f'id="{frame_id}"')
if start < 0:
    sys.exit(f'frame {frame_id} not found')
host = s.find('class="sc-host"', start)
open_at = s.find('<div', host + 1)

depth, i = 0, open_at
for m in re.finditer(r'<(/?)div\b', s[open_at:]):
    depth += -1 if m.group(1) else 1
    if depth == 0:
        end = open_at + m.end()
        end = s.find('>', end) + 1
        break
screen = s[open_at:end]

doc = (f'<!doctype html><html><head><meta charset="utf-8">{FONTS}{styles}'
       '<style>body{margin:0;background:#fff}</style></head><body>'
       f'{screen}</body></html>')
page = out.with_suffix('.html')
page.write_text(doc, encoding='utf-8')
subprocess.run([CHROME, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=2',
                '--window-size=390,844', '--virtual-time-budget=4000',
                f'--screenshot={out}', page.as_uri()], check=True, capture_output=True)
print(out)
