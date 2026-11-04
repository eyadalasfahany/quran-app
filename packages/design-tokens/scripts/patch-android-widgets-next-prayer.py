"""Patch small next-prayer widget faces in quran-app-screens.html (3 Nov 2026, denser chip + dots + band)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HTML = ROOT / "quran-app-screens.html"


def dot_row(*, dark: bool) -> str:
    brand = "rgb(140, 197, 175)" if dark else "rgb(31, 77, 64)"
    line = "rgb(42, 58, 52)" if dark else "rgb(231, 223, 204)"
    past = f"rgba(140, 197, 175, 0.35)" if dark else f"rgba(31, 77, 64, 0.35)"
    parts = []
    for state in ("past", "past", "next", "future", "future"):
        if state == "next":
            parts.append(
                f'<span style="width: 8px; height: 8px; border-radius: 999px; background: {brand};"></span>'
            )
        elif state == "past":
            parts.append(
                f'<span style="width: 8px; height: 8px; border-radius: 999px; background: {past};"></span>'
            )
        else:
            parts.append(
                f'<span style="width: 8px; height: 8px; border-radius: 999px; box-sizing: border-box; '
                f'border: 1px solid {line};"></span>'
            )
    return f'<div style="display: flex; gap: 6px; align-items: center;">{"".join(parts)}</div>'


def next_prayer_inner(*, dark: bool) -> str:
    muted = "rgb(167, 179, 173)" if dark else "rgb(91, 106, 100)"
    ink = "rgb(236, 230, 216)" if dark else "rgb(19, 35, 31)"
    fill = "rgb(28, 43, 39)" if dark else "rgb(239, 232, 216)"
    brand_surface = "rgb(28, 43, 39)" if dark else "rgb(232, 242, 237)"
    on_band = "rgb(236, 230, 216)" if dark else "rgb(19, 35, 31)"
    on_band_muted = "rgb(167, 179, 173)" if dark else "rgb(91, 106, 100)"
    return (
        '<div style="display: flex; flex-direction: column; justify-content: space-between; align-items: stretch; '
        'text-align: start; height: 100%; width: 100%; box-sizing: border-box;">'
        '<div style="display: flex; flex-direction: column; align-items: stretch; gap: 4px;">'
        f'<div style="font-size: 12px; line-height: 16px; font-weight: 500; color: {muted};">الصلاة القادمة</div>'
        '<div style="font-family: Amiri, serif; font-size: 35px; line-height: 40px; font-weight: 700; '
        f'color: {ink};">العصر</div>'
        f'<div style="align-self: flex-start; font-size: 15px; line-height: 20px; font-weight: 600; color: {ink}; '
        f'background: {fill}; border-radius: 999px; padding: 4px 10px;">٣:٤٧ م</div></div>'
        f"{dot_row(dark=dark)}"
        f'<div style="border-radius: 16px; background: {brand_surface}; padding: 10px 12px; display: flex; '
        f'flex-direction: column; gap: 2px;">'
        f'<div style="font-size: 11px; line-height: 14px; color: {on_band_muted};">المتبقي</div>'
        f'<div style="font-size: 22px; line-height: 28px; font-weight: 700; color: {on_band}; '
        'font-variant-numeric: tabular-nums;">٢:٠٥:١٣</div></div></div>'
    )


def widget_add_confirm_preview(*, dark: bool) -> str:
    c_muted = "rgb(167, 179, 173)" if dark else "rgb(91, 106, 100)"
    c_ink = "rgb(236, 230, 216)" if dark else "rgb(19, 35, 31)"
    c_fill = "rgb(28, 43, 39)" if dark else "rgb(239, 232, 216)"
    c_band = "rgb(28, 43, 39)" if dark else "rgb(232, 242, 237)"
    c_on_band = "rgb(236, 230, 216)" if dark else "rgb(19, 35, 31)"
    c_timer = "rgb(236, 230, 216)" if dark else "rgb(19, 35, 31)"
    c_widget_bg = "rgb(28, 43, 39)" if dark else "rgb(255, 253, 248)"
    c_line = "rgb(42, 58, 52)" if dark else "rgb(231, 223, 204)"
    inner = (
        '<div style="display: flex; flex-direction: column; justify-content: space-between; align-items: stretch; '
        'height: 100%; width: 100%; box-sizing: border-box; text-align: start;">'
        '<div style="display: flex; flex-direction: column; gap: 4px;">'
        f'<span style="font-size: 11px; line-height: 14px; color: {c_muted};">الصلاة القادمة</span>'
        f'<span style="font-size: 22px; line-height: 28px; font-weight: 700; color: {c_ink};">العشاء</span>'
        f'<span style="align-self: flex-start; font-size: 15px; line-height: 20px; font-weight: 600; color: {c_ink}; '
        f'background: {c_fill}; border-radius: 999px; padding: 4px 10px;">٦:٣٥ م</span></div>'
        f"{dot_row(dark=dark)}"
        f'<div style="border-radius: 16px; background: {c_band}; padding: 8px 10px; display: flex; flex-direction: column; '
        f'gap: 2px;">'
        f'<span style="font-size: 11px; line-height: 14px; color: {c_muted};">المتبقي</span>'
        f'<span style="font-size: 20px; line-height: 26px; font-weight: 700; color: {c_timer};">١:٤٨:٣٩</span>'
        "</div></div>"
    )
    return (
        f'<div style="align-self: stretch; display: flex; justify-content: center; margin: 4px 0 8px;">'
        f'<div style="width: 148px; height: 148px; box-sizing: border-box; padding: 14px 12px; border-radius: 22px; '
        f'background: {c_widget_bg}; border: 1px solid {c_line}; display: flex; flex-direction: column; '
        f'justify-content: space-between; text-align: start; box-shadow: rgba(19, 35, 31, 0.10) 0px 4px 16px;">'
        f"{inner}</div></div>"
    )


def patch_android_cards(html: str) -> tuple[str, int]:
    count = 0
    pattern = re.compile(
        r'(<a href="#Salah" style="width: 160px; height: 160px;[^"]*">)(.*?)(</a>)',
        re.DOTALL,
    )
    matches = list(pattern.finditer(html))
    if len(matches) < 2:
        raise SystemExit(f"Expected at least two 160×160 Salah cards, found {len(matches)}")
    for index, match in enumerate(matches[:2]):
        dark = index == 1
        new_inner = next_prayer_inner(dark=dark)
        html = html[: match.start(2)] + new_inner + html[match.end(2) :]
        count += 1
    return html, count


def patch_add_confirm_previews(html: str) -> tuple[str, int]:
    count = 0
    for dark in (False, True):
        new = widget_add_confirm_preview(dark=dark)
        marker = "width: 148px; height: 148px;"
        if marker not in html:
            continue
        # Replace each 148×148 preview block (WidgetAddConfirm frames) once per palette pass.
        pattern = re.compile(
            r'<div style="align-self: stretch; display: flex; justify-content: center; margin: 4px 0 8px;">'
            r'<div style="width: 148px; height: 148px;.*?</div></div>',
            re.DOTALL,
        )
        match = pattern.search(html)
        if match is None:
            break
        html = html[: match.start()] + new + html[match.end() :]
        count += 1
    return html, count


def patch_widget_next_prayer_small(html: str) -> tuple[str, int]:
    """Best-effort patch for the iOS WidgetNextPrayerSmall frame mock if present."""
    fig = 'id="WidgetNextPrayerSmall"'
    if fig not in html:
        return html, 0
    inner = next_prayer_inner(dark=False)
    pattern = re.compile(
        r'(<div class="gx-fig" id="WidgetNextPrayerSmall">.*?<div style="[^"]*width: 160px; height: 160px;[^"]*">)(.*?)(</div></div></div></div>)',
        re.DOTALL,
    )
    match = pattern.search(html)
    if match is None:
        return html, 0
    html = html[: match.start(2)] + inner + html[match.end(2) :]
    return html, 1


def main() -> None:
    html = HTML.read_text(encoding="utf-8")
    original = html
    total = 0
    html, n = patch_android_cards(html)
    total += n
    html, n = patch_add_confirm_previews(html)
    total += n
    html, n = patch_widget_next_prayer_small(html)
    total += n
    if html == original:
        print("No changes (already patched?)")
        return
    HTML.write_text(html, encoding="utf-8")
    print(f"Patched {total} next-prayer face block(s) in {HTML.name}")


if __name__ == "__main__":
    main()
