import re

t = open(r"d:\projects\quran-app\quran-app-screens.html", encoding="utf-8").read()
i = t.find('id="WidgetAddConfirm"')
print(t[i : i + 5000] if i >= 0 else "missing")
