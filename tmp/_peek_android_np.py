import re
from pathlib import Path

for name in ("AndroidWidgets", "AndroidWidgetsDark"):
    t = Path(r"d:\projects\quran-app\tmp\widget-frames") / f"{name}.htmlfrag"
    text = t.read_text(encoding="utf-8")
    m = re.search(
        r'href="#Salah" style="width: 160px; height: 160px;[^"]*">(.*?)</a>',
        text,
        re.DOTALL,
    )
    print("===", name, "===")
    print(m.group(1)[:1200] if m else "MISSING")
