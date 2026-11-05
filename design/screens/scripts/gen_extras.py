#!/usr/bin/env python3
"""Lean extras: devices, sizes, notifications, wear, components. Imported by build.py."""
from __future__ import annotations

from pathlib import Path

HEAD = """<!doctype html>
<html lang="{lang}" dir="{dir_}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="{css}common/styles.css">
<link rel="stylesheet" href="{css}common/devices.css">
<link rel="stylesheet" href="{css}common/catalog.css">
</head>
<body>
<header class="gx-head"><p>{crumbs}</p><h1>{h1}</h1><p>{sub}</p></header>
<section class="gx-sec">
{body}
</section>
</body></html>
"""


def page(path: Path, **kw):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(HEAD.format(**kw), encoding="utf-8")


def write_extras(out: Path, by_stack: dict) -> None:
    extras = out / "extras"
    if extras.exists():
        import shutil

        shutil.rmtree(extras)
    write_devices(extras)
    write_sizes(extras)
    write_notifications(extras)
    write_wear(extras)
    write_components(extras)
    # lean catalogs for agents
    (extras / "CATALOG.md").write_text(
        """# Extras catalog

| folder | purpose | status |
|---|---|---|
| devices | iOS/Android phone, tablet, fold shells | review aids only |
| sizes | window classes + widget/watch sizes | reference |
| notifications | prayer, iqamah, daily, azkar banners | awaiting-approval |
| wear | Wear OS home/sibha/tile | awaiting-approval |
| components | TabBar, sheet, mini player, dialog | shared chrome |

Models: read this table. Open one HTML file only if reviewing that surface.
""",
        encoding="utf-8",
    )


def write_devices(extras: Path):
    devices = [
        ("iphone-17", "iPhone 17", "ios", "phone", "390×844 compact"),
        ("pixel-9", "Pixel 9", "android", "phone", "390×844 compact"),
        ("iphone-landscape", "Phone landscape", "ios", "land", "844×390 short"),
        ("ipad-mini", "iPad mini", "ios", "medium", "744×1133 medium"),
        ("ipad-pro-11", "iPad Pro landscape", "ios", "expanded", "1194×834 expanded"),
        ("pixel-fold-open", "Pixel Fold open", "android", "fold", "hinge mock"),
        ("galaxy-s25", "Galaxy S25", "android", "phone", "390×844 compact"),
        ("android-tablet", "Android tablet", "android", "expanded", "1194×834"),
    ]
    cards = []
    for slug, name, plat, kind, size in devices:
        if kind == "phone":
            shell = f"""<div class="dv-phone {plat}"><div class="dv-phone-inner">
            {"<div class='dv-dynamic-island'></div>" if plat=="ios" else "<div class='dv-android-cam'></div>"}
            <div class="slot-fill" style="padding-top:48px">{name}<br>{size}</div>
            {"<div class='dv-home-ind'></div>" if plat=="ios" else "<div class='dv-nav-android'><span></span><span></span><span></span></div>"}
            </div></div>"""
        elif kind == "land":
            shell = '<div class="dv-phone-land"><div class="dv-phone-land-inner"><div class="slot-fill">Short window · tab rail</div></div></div>'
        elif kind == "medium":
            shell = '<div class="dv-medium"><div class="dv-medium-inner"><div class="slot-fill">Medium</div></div></div>'
        elif kind == "expanded":
            shell = '<div class="dv-expanded"><div class="dv-expanded-inner"><div class="slot-fill">Expanded · sidebar</div></div></div>'
        else:
            shell = '<div class="dv-fold"><div class="dv-fold-inner"><div class="dv-hinge"></div><div class="slot-fill">Foldable</div></div></div>'
        page(
            extras / "devices" / f"{slug}.html",
            lang="en",
            dir_="ltr",
            title=name,
            css="../../",
            crumbs='<a href="../../index.html">←</a> · <a href="./index.html">devices</a>',
            h1=name,
            sub=f"{plat} · {size} · window-class review shell (not a model branch in code)",
            body=f'<div class="gx-row"><div class="dv-frame"><div class="dv-label">{name}</div>{shell}</div></div>',
        )
        cards.append(
            f'<a class="catalog-card" href="{slug}.html"><span class="badge">{plat}</span><strong>{name}</strong><span>{size}</span></a>'
        )
    page(
        extras / "devices" / "index.html",
        lang="en",
        dir_="ltr",
        title="Devices",
        css="../../",
        crumbs='<a href="../../index.html">←</a>',
        h1="Devices · iOS & Android",
        sub="Design review shells. App uses useWindowClass(), never device model.",
        body=f'<ul class="catalog-grid">{"".join(cards)}</ul>',
    )
    (extras / "devices" / "CATALOG.md").write_text(
        "# Devices\n\n"
        + "\n".join(f"- `{s}` — {n} · {sz}" for s, n, _, _, sz in devices)
        + "\n",
        encoding="utf-8",
    )


def write_sizes(extras: Path):
    rows = [
        ("compact", "390×844", "Phone portrait · bottom tabs", "viewer.html?id=Main"),
        ("compact-short", "844×390", "Landscape · rail", "viewer.html?id=MainLandscapeRail"),
        ("medium", "744×1133", "Tablet portrait", "viewer.html?id=ReaderMedium"),
        ("expanded", "1194×834", "Sidebar + panels", "viewer.html?id=ExpandedHome"),
        ("widget-ios-sm", "158×158", "iOS small widget", "viewer.html?id=WidgetNextPrayerSmall"),
        ("widget-ios-md", "338×158", "iOS medium widget", "viewer.html?id=WidgetProgressMedium"),
        ("widget-and-2x2", "~168×168", "Android 2×2", "viewer.html?id=AndroidWidgets"),
        ("watch-41", "~184×224", "Apple Watch 41mm", "viewer.html?id=WatchHome"),
        ("wear-round", "~192×192", "Wear OS round", "../wear/WearHome.html"),
    ]
    cards = []
    for slug, size, note, link in rows:
        page(
            extras / "sizes" / f"{slug}.html",
            lang="en",
            dir_="ltr",
            title=slug,
            css="../../",
            crumbs='<a href="../../index.html">←</a> · <a href="./index.html">sizes</a>',
            h1=slug,
            sub=f"{size} · {note}",
            body=f'<div class="slot-fill brand" style="max-width:420px;min-height:140px;border-radius:20px;margin:0 auto"><div><b>{size}</b><br>{note}<br><a href="../../{link}" style="color:#e6c77e">sample →</a></div></div>',
        )
        cards.append(
            f'<a class="catalog-card" href="{slug}.html"><strong>{slug}</strong><span>{size} · {note}</span></a>'
        )
    page(
        extras / "sizes" / "index.html",
        lang="en",
        dir_="ltr",
        title="Sizes",
        css="../../",
        crumbs='<a href="../../index.html">←</a>',
        h1="All sizes",
        sub="Window classes, widgets, watches",
        body=f'<ul class="catalog-grid">{"".join(cards)}</ul>',
    )
    (extras / "sizes" / "CATALOG.md").write_text(
        "# Sizes\n\n" + "\n".join(f"- `{s}` — {sz} — {n}" for s, sz, n, _ in rows) + "\n",
        encoding="utf-8",
    )


def _banner(title, text, time, dark=False):
    cls = "dv-notif-banner dark" if dark else "dv-notif-banner"
    return f"""<div class="{cls}" dir="rtl"><div class="dv-notif-icon">ط</div>
    <div class="dv-notif-body"><span class="dv-notif-app">طيبة</span>
    <span class="dv-notif-title">{title}</span><span class="dv-notif-text">{text}</span></div>
    <span class="dv-notif-time">{time}</span></div>"""


def write_notifications(extras: Path):
    items = [
        ("NotifPrayerAdhan", "أذان العصر", "حان الآن موعد صلاة العصر", "الآن", "ADR 0047"),
        ("NotifPrayerIqamah", "الإقامة بعد قليل", "العصر · بعد ١٠ دقائق", "الآن", "ADR 0056"),
        ("NotifDailyReminder", "ورد اليوم", "٤ من ١٠ صفحات", "٨:٠٠", "daily"),
        ("NotifKhatma", "تذكير الختمة", "بقي ٦ أيام", "٩:٠٠", "khatma"),
        ("NotifAzkar", "أذكار الصباح", "حان وقت جلسة الصباح", "بعد الفجر", "ADR 0031"),
    ]
    cards = []
    for fid, title, text, time, note in items:
        body = f"""<p class="gx-note"><span class="badge warn">awaiting-approval</span> {note}. No Quran/dhikr text.</p>
        <div class="gx-row">
          <div class="dv-frame"><div class="dv-label">Lock</div>
            <div class="dv-notif-lock" style="background:linear-gradient(180deg,#3a4a42,#1a2420);padding:56px 16px;box-sizing:border-box">
              <div style="text-align:center;color:#f3eee2;margin-bottom:20px;font-size:48px">٩:٤١</div>
              {_banner(title, text, time)}
            </div>
          </div>
          <div class="dv-frame"><div class="dv-label">Banner</div>{_banner(title, text, time)}
            <div style="height:12px"></div>{_banner(title, text, time, True)}</div>
        </div>"""
        page(
            extras / "notifications" / f"{fid}.html",
            lang="ar",
            dir_="rtl",
            title=fid,
            css="../../",
            crumbs='<a href="../../index.html">←</a> · <a href="./index.html">notifications</a>',
            h1=fid,
            sub=note,
            body=body,
        )
        cards.append(
            f'<a class="catalog-card" href="{fid}.html"><span class="badge new">new</span><strong>{fid}</strong><span>{title}</span></a>'
        )
    page(
        extras / "notifications" / "index.html",
        lang="en",
        dir_="ltr",
        title="Notifications",
        css="../../",
        crumbs='<a href="../../index.html">←</a>',
        h1="Notifications",
        sub="Local notification frames · awaiting approval",
        body=f'<ul class="catalog-grid">{"".join(cards)}</ul>',
    )
    (extras / "notifications" / "CATALOG.md").write_text(
        "# Notifications (awaiting-approval)\n\n"
        + "\n".join(f"- `{i[0]}` — {i[1]} — {i[4]}" for i in items)
        + "\n",
        encoding="utf-8",
    )


def write_wear(extras: Path):
    faces = [
        ("WearHome", "Next prayer + progress"),
        ("WearSibha", "Misbaha"),
        ("WearTile", "Tile"),
        ("WearStale", "Stale / open phone"),
    ]
    cards = []
    for fid, note in faces:
        page(
            extras / "wear" / f"{fid}.html",
            lang="ar",
            dir_="rtl",
            title=fid,
            css="../../",
            crumbs='<a href="../../index.html">←</a> · <a href="./index.html">wear</a>',
            h1=fid,
            sub=f"{note} · <span class='badge warn'>awaiting-approval</span>",
            body=f"""<div class="gx-row">
              <div class="dv-frame"><div class="dv-label">Round</div>
                <div class="dv-wear"><div class="dv-wear-inner" style="display:flex;align-items:center;justify-content:center;text-align:center;padding:16px;font-size:13px">{note}</div></div>
              </div>
              <div class="dv-frame"><div class="dv-label">Square</div>
                <div class="dv-wear square"><div class="dv-wear-inner" style="display:flex;align-items:center;justify-content:center;text-align:center;padding:16px;font-size:13px">{note}</div></div>
              </div>
            </div>""",
        )
        cards.append(
            f'<a class="catalog-card" href="{fid}.html"><span class="badge new">new</span><strong>{fid}</strong><span>{note}</span></a>'
        )
    page(
        extras / "wear" / "index.html",
        lang="en",
        dir_="ltr",
        title="Wear OS",
        css="../../",
        crumbs='<a href="../../index.html">←</a>',
        h1="Wear OS",
        sub="ADR 0035 · awaiting approval",
        body=f'<ul class="catalog-grid">{"".join(cards)}</ul>',
    )
    (extras / "wear" / "CATALOG.md").write_text(
        "# Wear OS (awaiting-approval)\n\n" + "\n".join(f"- `{a}` — {b}" for a, b in faces) + "\n",
        encoding="utf-8",
    )


def write_components(extras: Path):
    comps = [
        ("tab-bar", "TabBar", "Floating glass tabs · compact"),
        ("mini-player", "MiniPlayer", "Idle + collapsed"),
        ("bottom-sheet", "BottomSheet", "Mid + full detents"),
        ("confirm-dialog", "ConfirmDialog", "Reset / delete / widget add"),
        ("status-bar", "StatusBar", "iOS + Android chrome"),
        ("glass-button", "GlassButton", "44pt glass controls"),
    ]
    # Prefer hand-authored templates if present (team-quality previews)
    tmpl_dir = Path(__file__).with_name("component-templates")
    cards = []
    for slug, name, note in comps:
        dest = extras / "components" / f"{slug}.html"
        src = tmpl_dir / f"{slug}.html"
        if src.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
        else:
            page(
                dest,
                lang="en",
                dir_="ltr",
                title=name,
                css="../../",
                crumbs='<a href="../../index.html">←</a> · <a href="./index.html">components</a>',
                h1=name,
                sub=note + " · full specimens in quran-app-design-system.html",
                body=f'<div class="slot-fill" style="max-width:420px;min-height:120px;border-radius:16px;margin:0 auto">{name}<br>{note}</div>',
            )
        cards.append(
            f'<a class="catalog-card" href="{slug}.html"><strong>{name}</strong><span>{note}</span></a>'
        )
    page(
        extras / "components" / "index.html",
        lang="en",
        dir_="ltr",
        title="Components",
        css="../../",
        crumbs='<a href="../../index.html">←</a>',
        h1="Common components",
        sub="Shared chrome. Full token specimens: quran-app-design-system.html",
        body=f'<ul class="catalog-grid">{"".join(cards)}</ul>',
    )
    (extras / "components" / "CATALOG.md").write_text(
        "# Components\n\n" + "\n".join(f"- `{a}` — {b}" for a, b, _ in comps) + "\n",
        encoding="utf-8",
    )
