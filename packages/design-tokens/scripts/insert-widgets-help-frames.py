"""Insert WidgetsHelp and WidgetsHelpDark frames into quran-app-screens.html (ADR 0010)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HTML = ROOT / "quran-app-screens.html"

BACK = (
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<path d="M9 6l6 6-6 6"></path></svg>'
)

WIDGETS = [
    ("الصلاة القادمة", "اسم الصلاة ووقتها ومكانك — بدون نص قرآني"),
    ("مواقيت اليوم", "الصلاة القادمة ومواقيت اليوم الخمسة"),
    ("تقدّم اليوم", "حلقة أهدافك اليومية والصفوف التي اخترتها"),
    ("تابع القراءة", "اسم السورة ورقم الآية والصفحة — بدون نص الآية"),
    ("المسبحة", "العدّاد والهدف وزر «+» يزيد دون فتح التطبيق"),
    ("الأذكار", "أسماء الجلسات وحالة الإتمام — بدون نص الذكر"),
]

IOS_STEPS = [
    "المس الشاشة الرئيسية مطولًا حتى تتحرك الأيقونات، ثم «+».",
    "ابحث عن «طيبة» واختر الودجة.",
    "اضغط «إضافة ودجة» وضعها حيث تريد.",
]

ANDROID_STEPS = [
    "المس الشاشة الرئيسية، ثم «الودجات».",
    "ابحث عن «طيبة» واسحب الودجة.",
    "أو استخدم «إضافة إلى الشاشة الرئيسية» أدناه.",
]


def row(title: str, subtitle: str, c: dict, *, pin: bool = False) -> str:
    trailing = ""
    if pin:
        trailing = (
            f'<span style="flex-shrink: 0; min-height: 36px; padding: 0 14px; border-radius: 18px; '
            f'background: {c["brand"]}; color: {c["onBrand"]}; font-size: 13px; font-weight: 600; '
            f'display: flex; align-items: center; white-space: nowrap;">إضافة إلى الشاشة الرئيسية</span>'
        )
    return (
        f'<div style="display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 12px 16px; '
        f'border-bottom: 1px solid {c["line"]};">'
        f'<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;">'
        f'<span style="font-size: 17px; line-height: 22px; font-weight: 600; color: {c["ink"]};">{title}</span>'
        f'<span style="font-size: 13px; line-height: 18px; color: {c["muted"]};">{subtitle}</span>'
        f"</div>{trailing}</div>"
    )


def group(title: str, body: str, c: dict) -> str:
    return (
        f'<div style="display: flex; flex-direction: column; gap: 6px;">'
        f'<span style="margin: 0 6px; font-size: 12px; line-height: 16px; font-weight: 600; color: {c["muted"]};">'
        f"{title}</span>"
        f'<div style="border-radius: 16px; border: 1px solid {c["line"]}; background: {c["raised"]}; overflow: hidden;">'
        f"{body}</div></div>"
    )


def frame(frame_id: str, cap: str, dark: bool) -> str:
    c = {
        "bg": "#0e1715" if dark else "#f7f3ea",
        "ink": "#ece6d8" if dark else "#13231f",
        "muted": "#a7b3ad" if dark else "#5b6a64",
        "raised": "#172421" if dark else "#fffdf8",
        "line": "#2a3a34" if dark else "#e7dfcc",
        "brand": "#8cc5af" if dark else "#1f4d40",
        "onBrand": "#0e1715" if dark else "#f7f3ea",
        "btnBg": "#172421" if dark else "#fffdf8",
        "btnLine": "#2a3a34" if dark else "#e7dfcc",
    }

    catalog_rows = "".join(row(t, s, c) for t, s in WIDGETS)
    pin_rows = "".join(row(t, s, c, pin=True) for t, s in WIDGETS[:3])  # show 3 pin rows in frame

    ios = "".join(
        f'<p style="margin: 0 0 8px; font-size: 14px; line-height: 20px; color: {c["muted"]};">{i + 1}. {s}</p>'
        for i, s in enumerate(IOS_STEPS)
    )
    android = "".join(
        f'<p style="margin: 0 0 8px; font-size: 14px; line-height: 20px; color: {c["muted"]};">{i + 1}. {s}</p>'
        for i, s in enumerate(ANDROID_STEPS)
    )

    inner = (
        group("الودجات المتاحة", catalog_rows, c)
        + group(
            "أندرويد",
            f'<div style="padding: 12px 16px 4px;">{android}</div>{pin_rows}',
            c,
        )
        + group("آيفون", f'<div style="padding: 12px 16px;">{ios}</div>', c)
        + group(
            "الساعة",
            f'<div style="padding: 12px 16px;"><p style="margin: 0; font-size: 14px; line-height: 20px; color: {c["muted"]};">'
            "تطبيق Wear OS وودجة الساعة وApple Watch تأتي مع تطبيقات الساعة (قريبًا).</p></div>",
            c,
        )
    )

    return (
        f'<div class="gx-fig" id="{frame_id}"><div class="gx-cap">{cap} · awaiting approval</div>'
        f'<div class="device"><div class="screen"><div class="sc-host" data-sc-name="{frame_id}">'
        f'<div dir="rtl" style="width: 390px; height: 844px; position: relative; overflow: hidden; '
        f'box-sizing: border-box; background: {c["bg"]}; color: {c["ink"]}; '
        f'font-family: &quot;IBM Plex Sans Arabic&quot;, system-ui, sans-serif;">'
        f'<div style="position: absolute; inset: 52px 16px 24px; display: flex; flex-direction: column; gap: 16px; overflow: hidden;">'
        f'<div style="display: flex; align-items: center; gap: 8px;">'
        f'<a href="#Settings" aria-label="رجوع" style="width: 44px; height: 44px; border-radius: 22px; '
        f'border: 1px solid {c["btnLine"]}; background: {c["btnBg"]}; color: {c["ink"]}; display: flex; '
        f'align-items: center; justify-content: center; flex-shrink: 0; text-decoration: none;">{BACK}</a>'
        f'<h1 style="margin: 0; flex: 1; font-family: Amiri, serif; font-size: 26px; font-weight: 700;">'
        f"الودجات والساعة</h1></div>"
        f'<p style="margin: 0; font-size: 12px; line-height: 16px; color: {c["muted"]};">'
        "تعرض الودجات المواقيت والتقدّم وموضع القراءة والعدّ — لا نص قرآني ولا نص ذكر.</p>"
        f'<div style="flex: 1; display: flex; flex-direction: column; gap: 14px; overflow: hidden;">{inner}</div>'
        f"</div></div></div></div></div></div>"
    )


def main() -> None:
    html = HTML.read_text(encoding="utf-8")
    if 'id="WidgetsHelp"' in html:
        print("WidgetsHelp already present; skipping insert")
        return

    light = frame("WidgetsHelp", "Settings · widgets and watch help · Arabic · Light", dark=False)
    dark_f = frame("WidgetsHelpDark", "Settings · widgets and watch help · Arabic · Dark", dark=True)
    block = f'<div class="gx-row">{light}{dark_f}</div>'

    # Insert before the widgets section closes (after Watch frames row).
    marker = '<section class="gx-sec" id="hijri">'
    idx = html.find(marker)
    if idx < 0:
        # fallback: append before final body close
        idx = html.rfind("</body>")
        html = html[:idx] + block + html[idx:]
    else:
        html = html[:idx] + block + html[idx:]

    note = (
        '<p class="gx-note"><b>WidgetsHelp (2 Nov 2026):</b> Settings sub-screen for ADR 0035 decision 7; '
        "awaiting developer approval before code review.</p>"
    )
    html = html.replace(
        '<section class="gx-sec" id="widgets">',
        '<section class="gx-sec" id="widgets">' + note,
        1,
    )

    HTML.write_text(html, encoding="utf-8")
    print("Inserted WidgetsHelp frames before hijri section")


if __name__ == "__main__":
    main()
