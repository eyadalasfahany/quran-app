"""Insert WidgetAddConfirm* frames into quran-app-screens.html (ADR 0054)."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HTML = ROOT / "quran-app-screens.html"


def palette(dark: bool) -> dict[str, str]:
    if dark:
        return {
            "bg": "#0e1715",
            "ink": "#ece6d8",
            "muted": "#a7b3ad",
            "raised": "#172421",
            "line": "#2a3a34",
            "brand": "#8cc5af",
            "onBrand": "#0e1715",
            "fill": "#1c2b27",
            "scrim": "rgba(14, 23, 21, 0.72)",
            "widgetBg": "#1c2b27",
            "widgetInk": "#ece6d8",
            "widgetMuted": "#a7b3ad",
            "timer": "#8cc5af",
            "segTrack": "#1c2b27",
            "segOn": "#172421",
            "segOnLine": "#8cc5af",
            "btnSecondary": "#2a3a34",
            "btnSecondaryInk": "#ece6d8",
        }
    return {
        "bg": "#f7f3ea",
        "ink": "#13231f",
        "muted": "#5b6a64",
        "raised": "#fffdf8",
        "line": "#e7dfcc",
        "brand": "#1f4d40",
        "onBrand": "#f7f3ea",
        "fill": "#efe8d8",
        "scrim": "rgba(19, 35, 31, 0.40)",
        "widgetBg": "#fffdf8",
        "widgetInk": "#13231f",
        "widgetMuted": "#5b6a64",
        "timer": "#1f4d40",
        "segTrack": "#efe8d8",
        "segOn": "#fffdf8",
        "segOnLine": "#1f4d40",
        "btnSecondary": "#efe8d8",
        "btnSecondaryInk": "#13231f",
    }


def widget_preview(c: dict[str, str]) -> str:
    dots = (
        '<div style="display: flex; gap: 6px; align-items: center;">'
        '<span style="width: 8px; height: 8px; border-radius: 999px; background: rgba(31, 77, 64, 0.35);"></span>'
        '<span style="width: 8px; height: 8px; border-radius: 999px; background: rgba(31, 77, 64, 0.35);"></span>'
        f'<span style="width: 8px; height: 8px; border-radius: 999px; background: {c["brand"]};"></span>'
        f'<span style="width: 8px; height: 8px; border-radius: 999px; box-sizing: border-box; border: 1px solid {c["line"]};"></span>'
        f'<span style="width: 8px; height: 8px; border-radius: 999px; box-sizing: border-box; border: 1px solid {c["line"]};"></span>'
        "</div>"
    )
    return (
        f'<div style="align-self: stretch; display: flex; justify-content: center; margin: 4px 0 8px;">'
        f'<div style="width: 148px; height: 148px; box-sizing: border-box; padding: 14px 12px; border-radius: 22px; '
        f'background: {c["widgetBg"]}; border: 1px solid {c["line"]}; display: flex; flex-direction: column; '
        f'justify-content: space-between; text-align: start; box-shadow: rgba(19, 35, 31, 0.10) 0px 4px 16px;">'
        f'<div style="display: flex; flex-direction: column; gap: 4px;">'
        f'<span style="font-size: 11px; line-height: 14px; color: {c["widgetMuted"]};">الصلاة القادمة</span>'
        f'<span style="font-size: 22px; line-height: 28px; font-weight: 700; color: {c["widgetInk"]};">العشاء</span>'
        f'<span style="align-self: flex-start; font-size: 15px; line-height: 20px; font-weight: 600; color: {c["widgetInk"]}; '
        f'background: {c["fill"]}; border-radius: 999px; padding: 4px 10px;">٦:٣٥ م</span></div>'
        f"{dots}"
        f'<div style="border-radius: 16px; background: {c["fill"]}; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px;">'
        f'<span style="font-size: 11px; line-height: 14px; color: {c["widgetMuted"]};">المتبقي</span>'
        f'<span style="font-size: 20px; line-height: 26px; font-weight: 700; color: {c["timer"]};">١:٤٨:٣٩</span>'
        f"</div></div></div>"
    )


def destination_picker(c: dict[str, str], *, lock_selected: bool = False) -> str:
    home_bg = c["segOn"] if not lock_selected else "transparent"
    home_line = c["segOnLine"] if not lock_selected else "transparent"
    lock_bg = c["segOn"] if lock_selected else "transparent"
    lock_line = c["segOnLine"] if lock_selected else "transparent"
    return (
        f'<div style="align-self: stretch; display: flex; gap: 4px; padding: 4px; border-radius: 999px; '
        f'background: {c["segTrack"]}; margin-top: 4px;">'
        f'<span style="flex: 1; min-height: 36px; border-radius: 999px; display: flex; align-items: center; '
        f'justify-content: center; font-size: 14px; font-weight: 600; color: {c["ink"]}; '
        f'background: {home_bg}; border: 1px solid {home_line};">الشاشة الرئيسية</span>'
        f'<span style="flex: 1; min-height: 36px; border-radius: 999px; display: flex; align-items: center; '
        f'justify-content: center; font-size: 14px; font-weight: 600; color: {c["ink"]}; '
        f'background: {lock_bg}; border: 1px solid {lock_line};">شاشة القفل</span>'
        f"</div>"
    )


def dialog_card(
    frame_id: str,
    cap: str,
    *,
    dark: bool,
    title: str,
    message: str,
    confirm: str,
    cancel: str,
    confirm_brand: bool,
    already: bool,
) -> str:
    c = palette(dark)
    preview = widget_preview(c)
    dest = "" if already else destination_picker(c)
    confirm_bg = c["brand"] if confirm_brand else c["brand"]
    confirm_ink = c["onBrand"]
    return (
        f'<div class="gx-fig" id="{frame_id}"><div class="gx-cap">{cap}</div>'
        f'<div class="device"><div class="screen"><div class="sc-host" data-sc-name="{frame_id}">'
        f'<div dir="rtl" style="width: 390px; height: 844px; position: relative; overflow: hidden; '
        f'box-sizing: border-box; background: {c["bg"]}; color: {c["ink"]}; '
        f'font-family: &quot;IBM Plex Sans Arabic&quot;, system-ui, sans-serif;">'
        # Dimmed widgets-help backdrop hint
        f'<div style="padding: 52px 16px 24px; opacity: 0.35;">'
        f'<h1 style="margin: 0 0 8px; font-family: Amiri, serif; font-size: 26px; font-weight: 700;">الودجات والساعة</h1>'
        f'<p style="margin: 0; font-size: 14px; color: {c["muted"]};">تعرض الودجات المواقيت والتقدّم…</p></div>'
        f'<div style="position: absolute; inset: 0; background: {c["scrim"]};"></div>'
        f'<div style="position: absolute; left: 25px; top: 160px; width: 340px; box-sizing: border-box; '
        f'padding: 24px 20px 20px; background: {c["raised"]}; border-radius: 28px; '
        f'box-shadow: rgba(19, 35, 31, 0.14) 0px 8px 32px; text-align: center;">'
        f'<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">'
        f'<div style="align-self: stretch; font-size: 22px; line-height: 30px; font-weight: 600; color: {c["ink"]};">'
        f"{title}</div>"
        f'<div style="align-self: stretch; font-size: 17px; line-height: 26px; color: {c["muted"]};">{message}</div>'
        f"{preview}{dest}</div>"
        f'<div style="display: flex; gap: 12px; margin-top: 24px;">'
        f'<span style="flex: 1; height: 48px; display: flex; align-items: center; justify-content: center; '
        f'border-radius: 999px; background: {c["btnSecondary"]}; color: {c["btnSecondaryInk"]}; '
        f'font-size: 17px; font-weight: 600;">{cancel}</span>'
        f'<span style="flex: 1; height: 48px; display: flex; align-items: center; justify-content: center; '
        f'border-radius: 999px; background: {confirm_bg}; color: {confirm_ink}; '
        f'font-size: 17px; font-weight: 600;">{confirm}</span>'
        f"</div></div></div></div></div></div></div>"
    )


def main() -> None:
    html = HTML.read_text(encoding="utf-8")
    if 'id="WidgetAddConfirm"' in html:
        print("WidgetAddConfirm already present; skipping")
        return

    frames = [
        dialog_card(
            "WidgetAddConfirm",
            "Widgets · add confirm · next prayer · Arabic · Light (ADR 0054)",
            dark=False,
            title="إضافة الودجة؟",
            message="الصلاة القادمة — ستظهر على الشاشة التي تختارها.",
            confirm="متابعة",
            cancel="إلغاء",
            confirm_brand=True,
            already=False,
        ),
        dialog_card(
            "WidgetAddConfirmDark",
            "Widgets · add confirm · next prayer · Arabic · Dark (ADR 0054)",
            dark=True,
            title="إضافة الودجة؟",
            message="الصلاة القادمة — ستظهر على الشاشة التي تختارها.",
            confirm="متابعة",
            cancel="إلغاء",
            confirm_brand=True,
            already=False,
        ),
        dialog_card(
            "WidgetAddConfirmAlready",
            "Widgets · already on home · Arabic · Light (ADR 0054)",
            dark=False,
            title="الودجة موجودة",
            message="هذه الودجة على الشاشة الرئيسية بالفعل. يمكنك الإبقاء عليها أو إضافة أخرى.",
            confirm="إضافة على أي حال",
            cancel="تم",
            confirm_brand=True,
            already=True,
        ),
        dialog_card(
            "WidgetAddConfirmAlreadyDark",
            "Widgets · already on home · Arabic · Dark (ADR 0054)",
            dark=True,
            title="الودجة موجودة",
            message="هذه الودجة على الشاشة الرئيسية بالفعل. يمكنك الإبقاء عليها أو إضافة أخرى.",
            confirm="إضافة على أي حال",
            cancel="تم",
            confirm_brand=True,
            already=True,
        ),
    ]
    block = '<div class="gx-row">' + "".join(frames) + "</div>"

    # Prefer after WidgetsHelpDark; else before hijri; else before </body>.
    markers = [
        'id="WidgetsHelpDark"',
        '<section class="gx-sec" id="hijri">',
        "</body>",
    ]
    inserted = False
    for marker in markers:
        idx = html.find(marker)
        if idx < 0:
            continue
        if marker.startswith("id="):
            # after the closing of that figure: find next </div></div></div></div></div></div> is fragile;
            # insert after the gx-row that contains WidgetsHelp by finding the row end after WidgetsHelpDark.
            row_end = html.find("</div>", html.find("WidgetsHelpDark", idx))
            # Find the gx-row closing after WidgetsHelpDark figure — walk to end of figure then row.
            fig_end = html.find("</div></div></div></div></div></div>", idx)
            if fig_end > 0:
                insert_at = fig_end + len("</div></div></div></div></div></div>")
                html = html[:insert_at] + block + html[insert_at:]
                inserted = True
                break
            _ = row_end
        else:
            html = html[:idx] + block + html[idx:]
            inserted = True
            break

    if not inserted:
        raise SystemExit("Could not find insert point")

    note = (
        '<p class="gx-note"><b>WidgetAddConfirm (3 Nov 2026, ADR 0054):</b> ConfirmDialog-shaped add preview with '
        "destination (home/lock) and already-on-home state. Approved with ADR 0054.</p>"
    )
    if "WidgetAddConfirm (3 Nov 2026" not in html:
        html = html.replace(
            '<section class="gx-sec" id="widgets">',
            '<section class="gx-sec" id="widgets">' + note,
            1,
        )

    HTML.write_text(html, encoding="utf-8")
    print("Inserted WidgetAddConfirm* frames")


if __name__ == "__main__":
    main()
