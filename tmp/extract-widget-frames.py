"""Extract widget frame HTML fragments for review."""
from pathlib import Path

s = Path("quran-app-screens.html").read_text(encoding="utf-8")
ids = [
    "AndroidWidgets",
    "AndroidWidgetsDark",
    "WidgetNextPrayerSmall",
    "WidgetNextPrayerSmallDark",
    "WidgetProgressMedium",
    "WidgetProgressMediumDark",
    "WidgetContinueReading",
    "WidgetContinueReadingDark",
    "WidgetLockScreen",
    "WidgetLockScreenDark",
    "WatchComplications",
]
out = Path("tmp/widget-frames")
out.mkdir(parents=True, exist_ok=True)
for fid in ids:
    start = s.find(f'id="{fid}"')
    if start < 0:
        print("MISSING", fid)
        continue
    end = s.find('class="gx-fig"', start + 1)
    if end < 0:
        end = start + 80000
    chunk = s[start:end]
    (out / f"{fid}.htmlfrag").write_text(chunk[:50000], encoding="utf-8")
    print(fid, "len", len(chunk))
