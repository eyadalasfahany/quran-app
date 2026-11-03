import re
from html import unescape

path = r"d:\projects\quran-app\tmp\widget-frames\AndroidWidgets.htmlfrag"
html = open(path, encoding="utf-8").read()
# First Salah link = 2x2 next prayer (RTL: right column in row)
m = re.search(r'<a href="#Salah"[^>]*>(.*?)</a>', html, re.DOTALL)
if not m:
    raise SystemExit("no Salah anchor")
inner = m.group(1)
# strip nested tags to see structure
parts = re.findall(r'<div style="([^"]*)"[^>]*>([^<]*)</div>', inner)
for i, (style, text) in enumerate(parts):
    text = unescape(text.strip())
    if not text:
        continue
    keys = []
    for k in ("font-size", "font-weight", "color", "margin-top", "font-family", "line-height"):
        sm = re.search(rf"{k}:\s*([^;]+)", style)
        if sm:
            keys.append(f"{k}={sm.group(1).strip()}")
    print(f"{i}: {text!r}")
    print("   ", "; ".join(keys))
