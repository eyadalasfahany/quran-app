import re
from html import unescape

path = r"d:\projects\quran-app\tmp\widget-frames\WidgetNextPrayerSmall.htmlfrag"
html = open(path, encoding="utf-8").read()
m = re.search(r'<a href="#Salah"[^>]*>(.*?)</a>', html, re.DOTALL)
inner = m.group(1)
parts = re.findall(r'<div style="([^"]*)"[^>]*>([^<]*)</div>', inner)
for i, (style, text) in enumerate(parts):
    text = unescape(text.strip())
    if not text:
        continue
    keys = []
    for k in ("font-size", "font-weight", "color", "margin-top", "font-family"):
        sm = re.search(rf"{k}:\s*([^;]+)", style)
        if sm:
            keys.append(f"{k}={sm.group(1).strip()}")
    print(f"{i}: {text!r}")
    print("   ", "; ".join(keys))
