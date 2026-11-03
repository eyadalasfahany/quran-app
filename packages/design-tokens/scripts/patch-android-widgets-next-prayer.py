"""Patch AndroidWidgets 2×2 next-prayer cards in quran-app-screens.html (3 Nov 2026)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HTML = ROOT / "quran-app-screens.html"

OLD_LIGHT = (
    '<div style="font-size: 12px; line-height: 16px; font-weight: 500; color: rgb(91, 106, 100);">'
    "الصلاة القادمة</div><div style=\"font-family: Amiri, serif; font-size: 32px; line-height: 42px; "
    'font-weight: 700; margin-top: 4px;">العصر</div><div style="font-size: 26px; line-height: 32px; '
    'font-weight: 700; color: rgb(31, 77, 64);">٣:٤٧ م</div><div style="margin-top: auto; font-size: 12px; '
    'line-height: 16px; color: rgb(91, 106, 100);">القاهرة</div>'
)

OLD_DARK = (
    '<div style="font-size: 12px; line-height: 16px; font-weight: 500; color: rgb(167, 179, 173);">'
    "الصلاة القادمة</div><div style=\"font-family: Amiri, serif; font-size: 32px; line-height: 42px; "
    'font-weight: 700; margin-top: 4px;">العصر</div><div style="font-size: 26px; line-height: 32px; '
    'font-weight: 700; color: rgb(140, 197, 175);">٣:٤٧ م</div><div style="margin-top: auto; font-size: 12px; '
    'line-height: 16px; color: rgb(167, 179, 173);">القاهرة</div>'
)


def next_prayer_inner(*, dark: bool) -> str:
    muted = "rgb(167, 179, 173)" if dark else "rgb(91, 106, 100)"
    brand = "rgb(140, 197, 175)" if dark else "rgb(31, 77, 64)"
    return (
        '<div style="display: flex; flex-direction: column; align-items: center; text-align: center; '
        'height: 100%; width: 100%; box-sizing: border-box;">'
        f'<div style="font-size: 12px; line-height: 16px; font-weight: 500; color: {muted};">الصلاة القادمة</div>'
        '<div style="font-family: Amiri, serif; font-size: 32px; line-height: 42px; font-weight: 700; '
        f'margin-top: 4px;">العصر</div>'
        f'<div style="font-size: 15px; line-height: 20px; color: {muted};">٣:٤٧ م</div>'
        '<div style="flex: 1; min-height: 4px;"></div>'
        f'<div style="font-size: 11px; line-height: 14px; color: {muted};">المتبقي</div>'
        f'<div style="font-size: 22px; line-height: 28px; font-weight: 700; color: {brand}; '
        'font-variant-numeric: tabular-nums;">٢:٠٥:١٣</div></div>'
    )


def patch(html: str) -> tuple[str, int]:
    count = 0
    for old, dark in ((OLD_LIGHT, False), (OLD_DARK, True)):
        new = next_prayer_inner(dark=dark)
        if old in html:
            html = html.replace(old, new)
            count += 1
        else:
            # Already patched or drifted — try the first 160×2 Salah card only once per palette.
            pattern = re.compile(
                r'(<a href="#Salah" style="width: 160px; height: 160px;[^"]*">)(.*?)(</a>)',
                re.DOTALL,
            )
            matches = list(pattern.finditer(html))
            if not matches:
                raise SystemExit(f"No 160×160 Salah card found for {'dark' if dark else 'light'} patch")
            start, end = matches[0].span(2)
            html = html[:start] + new + html[end:]
            count += 1
    return html, count


def main() -> None:
    html = HTML.read_text(encoding="utf-8")
    updated, n = patch(html)
    if updated == html:
        print("No changes (already patched?)")
        return
    HTML.write_text(updated, encoding="utf-8")
    print(f"Patched {n} next-prayer 2×2 card(s) in {HTML.name}")


if __name__ == "__main__":
    main()
