"""Review helper: render one frame from screens/ to a PNG with headless Chrome.

Each frame is its own page, screens/frames/<section>/<FrameId>.html (ADR 0075). The PNG is the
frame's size as screens/index.html declares it: 390 x 844 for a phone frame, the window size for a
tablet or landscape frame. Animations are stopped and the page sits on white, so shots are stable.

usage: python3 packages/design-tokens/scripts/frame-shot.py <frame-id> <out.png>
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from screens_lib import frames  # noqa: E402


def find_chrome():
    """Chrome on the developer's Mac; elsewhere $CHROME, a chrome or chromium on PATH, or Playwright's Chromium."""
    candidates = [os.environ.get('CHROME'), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                  shutil.which('google-chrome'), shutil.which('chromium'), '/opt/pw-browsers/chromium']
    for path in candidates:
        if path and Path(path).exists():
            return path
    sys.exit('No Chrome found. Set CHROME to a Chrome or Chromium binary.')


SHOT_CSS = ('<style>html,body{background:#fff!important}'
            '*,*::before,*::after{animation:none!important;transition:none!important}</style>')


def render(frame_id, out):
    found = frames().get(frame_id)
    if not found:
        sys.exit(f'frame {frame_id} not found in screens/index.html')
    path, width, height = found
    # The temp page lives next to the PNG; <base> keeps the frame's relative links (CSS, script, images) working.
    page = path.read_text(encoding='utf-8').replace(
        '<head>', f'<head><base href="{path.parent.as_uri()}/">', 1).replace('</head>', SHOT_CSS + '</head>', 1)
    tmp = out.with_suffix('.html')
    tmp.write_text(page, encoding='utf-8')
    # Linux containers run as root, where Chromium only starts without its sandbox.
    sandbox = ['--no-sandbox'] if sys.platform.startswith('linux') else []
    subprocess.run([find_chrome(), *sandbox, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=2',
                    f'--window-size={width},{height}', '--virtual-time-budget=4000',
                    f'--screenshot={out}', tmp.as_uri()], check=True, capture_output=True)
    print(out)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    render(sys.argv[1], Path(sys.argv[2]))
