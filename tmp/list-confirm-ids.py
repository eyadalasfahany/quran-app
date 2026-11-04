import re
from pathlib import Path

t = Path("quran-app-screens.html").read_text(encoding="utf-8")
print(re.findall(r'id="WidgetAddConfirm[^"]*"', t))
