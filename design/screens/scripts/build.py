#!/usr/bin/env python3
"""Rebuild design/screens for team sharing + low token cost for models.

- Reads screens/ (ADR 0075) through packages/design-tokens/scripts/screens_lib.py; never writes there
- Externalizes base64 images → assets/
- Writes lean frame partials (no per-frame document chrome)
- Writes AGENTS.md + CATALOG.md (what models should read)
- Writes viewer.html + index.html for humans
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "packages" / "design-tokens" / "scripts"))
from screens_lib import combined  # noqa: E402

OUT = ROOT / "design" / "screens"
ASSETS = OUT / "assets"
FRAMES = OUT / "frames"  # frames/<stack>/<id>.html partials

SECTION_SLUGS = [
    ("Core flow", "core"),
    ("Reading and discovery", "reading"),
    ("الصلاة والقبلة", "salah"),
    ("الأذكار", "azkar"),
    ("القائمة — Menu tab", "menu"),
    ("القائمة — card redesign", "menu-v2"),
    ("الرئيسية والمسبحة", "home"),
    ("Onboarding", "onboarding"),
    ("Khatma, downloads and account", "account"),
    ("States and variants", "states"),
    ("Hadith", "hadith"),
    ("أسماء الله الحسنى", "asmaa"),
    ("التقويم الهجري", "hijri"),
    ("رؤية الهلال", "moon"),
    ("نقاط الدخول", "entry-points"),
    ("الودجات وساعة آبل", "widgets"),
]

ID_STACK: dict[str, str] = {
    "ExpandedHome": "expanded",
    "ExpandedHomeDark": "expanded",
    "ReaderExpandedActions": "expanded",
    "ReaderExpandedTafsir": "expanded",
    "ReaderOverlayTafsir": "expanded",
    "ReaderExpandedDark": "expanded",
    "ReaderMedium": "expanded",
    "AzkarExpanded": "azkar",
    "WidgetNextPrayerSmall": "widgets",
    "WidgetNextPrayerSmallDark": "widgets",
    "WidgetProgressMedium": "widgets",
    "WidgetProgressMediumDark": "widgets",
    "WidgetContinueReading": "widgets",
    "WidgetContinueReadingDark": "widgets",
    "WidgetLockScreen": "widgets",
    "WidgetLockScreenDark": "widgets",
    "AndroidWidgets": "widgets",
    "AndroidWidgetsDark": "widgets",
    "WatchHome": "watch",
    "WatchSibha": "watch",
    "WatchComplications": "watch",
    "WidgetsHelp": "widgets",
    "WidgetsHelpDark": "widgets",
    "WidgetAddConfirm": "widgets",
    "WidgetAddConfirmDark": "widgets",
    "WidgetAddConfirmAlready": "widgets",
    "WidgetAddConfirmAlreadyDark": "widgets",
    "DiscoverCard": "discover",
    "DiscoverCardNew": "discover",
    "DiscoverCardDone": "discover",
    "DiscoverScreen": "discover",
    "DiscoverTip": "discover",
    "DiscoverWidgetSheet": "discover",
    "MainAzkar": "azkar",
    "SalahAzkar": "azkar",
    "MyQuran": "my-quran",
    "EmptyMyQuran": "my-quran",
    "Reciters": "audio",
    "LoadingReciters": "audio",
    "PlayerBuffering": "audio",
    "Settings": "settings",
    "AdhanSoundPicker": "settings",
    "AdhanSoundPickerDark": "settings",
    "SettingsAdhanSoundRow": "settings",
    "Sources": "settings",
    "SignIn": "account",
    "VerifyCode": "account",
    "LoadingHome": "states",
    "LoadingIndex": "states",
    "LoadingTafsir": "states",
    "LoadingMushaf": "states",
    "HomeDark": "states",
    "HomeEnglish": "states",
    "HomeAndroid": "states",
    "Offline": "states",
    "DuasHome": "duas",
    "DuasHomeDark": "duas",
    "DuasHomeEnglish": "duas",
    "DuaQuranDetail": "duas",
    "DuaQuranDetailDark": "duas",
    "DuaQuranDetailEnglish": "duas",
    "DuaHadithDetail": "duas",
    "DuaHadithDetailDark": "duas",
    "DuaHadithDetailEnglish": "duas",
    "MyDuas": "duas",
    "MyDuasDark": "duas",
    "MyDuasEnglish": "duas",
    "MyDuaEditor": "duas",
    "MyDuaEditorDark": "duas",
    "MyDuaEditorEnglish": "duas",
    "MyDuasEmpty": "duas",
    "MyDuasEmptyEnglish": "duas",
}

STACK_BLURBS = {
    "core": "Home, mushaf, ayah sheet, player, reader settings",
    "reading": "Index, search, reading/focus modes, tafsir",
    "salah": "Prayer times + qibla",
    "azkar": "Azkar home, reader, reminders, downloads",
    "duas": "Duas + my duas",
    "menu": "Menu tab v1",
    "menu-v2": "Menu card redesign",
    "home": "Home additions, misbaha, daily goals",
    "onboarding": "First launch",
    "account": "Auth, khatma, downloads, account",
    "settings": "Settings + adhan sound + sources",
    "my-quran": "My Quran",
    "audio": "Reciters + buffering",
    "states": "Offline, empty, dark, English, Android, loading",
    "hadith": "Daily hadith",
    "asmaa": "Names of Allah",
    "hijri": "Hijri calendar",
    "moon": "Moon sighting",
    "entry-points": "Menu cards + home Hijri line",
    "discover": "Discover Taybah",
    "widgets": "iOS + Android widgets + help",
    "watch": "Apple Watch",
    "expanded": "Medium + expanded windows",
}

EXT = {"jpeg": "jpg", "jpg": "jpg", "png": "png", "webp": "webp", "gif": "gif", "svg+xml": "svg"}


def section_slug(title: str) -> str:
    for prefix, slug in SECTION_SLUGS:
        if title.startswith(prefix) or prefix in title:
            return slug
    if "Widgets" in title or "ودجات" in title:
        return "widgets"
    return "misc"


def extract_fig(html: str, open_at: int, end_at: int) -> str:
    chunk = html[open_at:end_at].rstrip()
    opens = len(re.findall(r"<div\b", chunk))
    closes = len(re.findall(r"</div>", chunk))
    if opens > closes:
        chunk += "</div>" * (opens - closes)
    elif closes > opens:
        extra = closes - opens
        while extra > 0 and chunk.endswith("</div>"):
            chunk = chunk[: -len("</div>")].rstrip()
            extra -= 1
    return chunk


def externalize_images(fig: str, rel_prefix: str, digest_map: dict[str, str]) -> tuple[str, int]:
    """Replace data:image… with assets files. Returns (html, bytes_saved)."""
    saved = 0

    def repl(m: re.Match[str]) -> str:
        nonlocal saved
        mime = m.group(1).lower()
        raw_b64 = m.group(2)
        # strip whitespace/newlines inside base64
        raw_b64 = re.sub(r"\s+", "", raw_b64)
        digest = hashlib.sha1(raw_b64.encode("ascii")).hexdigest()[:12]
        if digest in digest_map:
            name = digest_map[digest]
        else:
            ext = EXT.get(mime, "bin")
            name = f"{digest}.{ext}"
            path = ASSETS / name
            if not path.exists():
                path.write_bytes(base64.b64decode(raw_b64))
            digest_map[digest] = name
        saved += len(m.group(0)) - len(f"{rel_prefix}{name}")
        return f"{rel_prefix}{name}"

    # url("data:image/jpeg;base64,....") and url('...') and bare url(data:...)
    out = re.sub(
        r'data:image/([a-z0-9+.-]+);base64,([A-Za-z0-9+/=\s]+)',
        repl,
        fig,
    )

    # Frames reference repo-root images (design-assets/...) instead of inlining them.
    # Treat them like inline images so the asset names stay the same.
    def repl_file(m: re.Match[str]) -> str:
        path = ROOT / m.group(0)
        mime = "jpeg" if path.suffix.lower() in (".jpg", ".jpeg") else path.suffix.lower().lstrip(".")
        b64 = base64.b64encode(path.read_bytes()).decode("ascii")
        return repl(re.match(r"(.+)\|(.+)", f"{mime}|{b64}", re.S))

    out = re.sub(r'design-assets/[^)"\'\s]+', repl_file, out)
    return out, saved


def detect_size(fig: str) -> str:
    for cls, label in (
        ("xw-device", "expanded"),
        ("xr-device-md", "medium"),
    ):
        if f'class="{cls}"' in fig:
            return label
    m = re.search(r'width:\s*(\d+)px;\s*height:\s*(\d+)px', fig)
    if not m:
        return "compact"
    w, h = int(m.group(1)), int(m.group(2))
    if w == 844 and h == 390:
        return "compact-short"
    if w >= 1100:
        return "expanded"
    if w >= 700:
        return "medium"
    if w < 250:
        return "watch"
    return "compact"


def detect_theme(fid: str, cap: str) -> str:
    blob = f"{fid} {cap}".lower()
    if "dark" in blob:
        return "dark"
    if "english" in blob or "ltr" in blob:
        return "en"
    return "ar-light"


def main() -> None:
    html = combined()  # screens/ as one document, in the old single-file form
    style_m = re.search(r"<style>(.*?)</style>", html, re.S)
    if not style_m:
        raise SystemExit("no style block")

    # wipe generated content, keep scripts + hand-written common extras we rewrite
    if OUT.exists():
        for child in OUT.iterdir():
            if child.name == "scripts":
                continue
            if child.is_dir():
                shutil.rmtree(child)
            else:
                child.unlink()

    ASSETS.mkdir(parents=True)
    FRAMES.mkdir(parents=True)
    common = OUT / "common"
    common.mkdir()
    (common / "styles.css").write_text(
        "/* From screens/screens.css — edit it there, not here */\n" + style_m.group(1),
        encoding="utf-8",
    )

    # copy device/catalog CSS from previous if present in scripts sibling templates — rewrite below
    # (written by write_common_css)

    section_positions: list[tuple[int, str]] = []
    for m in re.finditer(r'<section class="gx-sec"[^>]*>.*?<h2 class="gx-h2">(.*?)</h2>', html, re.S):
        title = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        section_positions.append((m.start(), title))

    fig_starts = [(m.start(), m.group(1)) for m in re.finditer(r'<div class="gx-fig" id="([^"]+)"', html)]
    body_end = html.rfind("</body>")
    if body_end < 0:
        body_end = len(html)

    digest_map: dict[str, str] = {}
    frames: list[dict] = []
    total_saved = 0

    for i, (open_at, fid) in enumerate(fig_starts):
        end_at = fig_starts[i + 1][0] if i + 1 < len(fig_starts) else body_end
        fig_html = extract_fig(html, open_at, end_at)
        cap_m = re.search(r'<div class="gx-cap">(.*?)</div>', fig_html, re.S)
        cap = re.sub(r"<[^>]+>", "", cap_m.group(1)).strip() if cap_m else fid
        title = "misc"
        for pos, t in section_positions:
            if pos <= open_at:
                title = t
            else:
                break
        stack = ID_STACK.get(fid, section_slug(title))
        # assets path relative to frames/<stack>/file.html → ../../assets/
        fig_html, saved = externalize_images(fig_html, "../../assets/", digest_map)
        total_saved += max(0, saved)

        stack_dir = FRAMES / stack
        stack_dir.mkdir(parents=True, exist_ok=True)
        rel = f"frames/{stack}/{fid}.html"
        (stack_dir / f"{fid}.html").write_text(fig_html + "\n", encoding="utf-8")

        status = "source"
        if "بانتظار" in cap or "awaiting" in cap.lower() or "proposed" in cap.lower():
            status = "awaiting-approval"

        frames.append(
            {
                "id": fid,
                "stack": stack,
                "caption": cap,
                "size": detect_size(fig_html),
                "theme": detect_theme(fid, cap),
                "status": status,
                "path": rel,
                "bytes": (stack_dir / f"{fid}.html").stat().st_size,
            }
        )

    by_stack: dict[str, list[dict]] = {}
    for fr in frames:
        by_stack.setdefault(fr["stack"], []).append(fr)

    write_common_css(common)
    write_catalogs(frames, by_stack)
    write_agents()
    write_readme(frames, by_stack, len(digest_map), total_saved)
    write_viewer()
    write_index(frames, by_stack)
    write_stack_indexes(by_stack)

    # extras: devices, sizes, notifications, wear (hand-authored lean pages)
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from gen_extras import write_extras  # noqa: E402

    write_extras(OUT, by_stack)

    manifest = {
        "source": "screens/",
        "frameCount": len(frames),
        "assetCount": len(digest_map),
        "bytesSavedVsInline": total_saved,
        "stacks": {s: [f["id"] for f in items] for s, items in by_stack.items()},
        "frames": frames,
    }
    (OUT / "frames.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    # token-cheap line protocol for agents
    lines = [
        f"{f['id']}\t{f['stack']}\t{f['size']}\t{f['theme']}\t{f['status']}\t{f['caption']}"
        for f in frames
    ]
    (OUT / "frames.tsv").write_text(
        "id\tstack\tsize\ttheme\tstatus\tcaption\n" + "\n".join(lines) + "\n",
        encoding="utf-8",
    )

    html_bytes = sum(f["bytes"] for f in frames)
    print(f"frames={len(frames)} stacks={len(by_stack)} assets={len(digest_map)}")
    print(f"frame HTML total KB={html_bytes // 1024}  (base64 externalized, ~{total_saved // 1024}KB removed from markup)")


def write_common_css(common: Path) -> None:
    # keep devices.css + catalog.css next to build — import from gen_extras templates
    devices = Path(__file__).with_name("devices.css")
    catalog = Path(__file__).with_name("catalog.css")
    if devices.exists():
        shutil.copy(devices, common / "devices.css")
    if catalog.exists():
        shutil.copy(catalog, common / "catalog.css")


def write_catalogs(frames: list[dict], by_stack: dict[str, list[dict]]) -> None:
    lines = [
        "# Frame catalog",
        "",
        "Token-cheap inventory. **Models: read this or `frames.tsv`, not HTML frames.**",
        "",
        f"Total: **{len(frames)}** frames · **{len(by_stack)}** stacks",
        "",
        "| id | stack | size | theme | status | caption |",
        "|---|---|---|---|---|---|",
    ]
    for f in frames:
        cap = f["caption"].replace("|", "/")
        lines.append(
            f"| `{f['id']}` | {f['stack']} | {f['size']} | {f['theme']} | {f['status']} | {cap} |"
        )
    (OUT / "CATALOG.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    for stack, items in by_stack.items():
        blurb = STACK_BLURBS.get(stack, "")
        sl = [
            f"# {stack}",
            "",
            blurb,
            "",
            f"{len(items)} frames · open in viewer: `viewer.html?id=<FrameId>`",
            "",
            "| id | size | theme | status | caption |",
            "|---|---|---|---|---|",
        ]
        for f in items:
            sl.append(
                f"| `{f['id']}` | {f['size']} | {f['theme']} | {f['status']} | {f['caption'].replace('|', '/')} |"
            )
        sl += [
            "",
            "## Model rule",
            f"Read this file only. Open `frames/{stack}/<id>.html` only for visual/HTML review of one frame.",
            "",
        ]
        (FRAMES / stack / "CATALOG.md").write_text("\n".join(sl), encoding="utf-8")


def write_agents() -> None:
    (OUT / "AGENTS.md").write_text(
        """# AGENTS — design/screens

Taybah HTML design frames, split for humans and for low token use.

## Source of truth

- **Design source, CI and `frame-shot.py`:** `screens/` at repo root, one file per frame (ADR 0075). Edit frames there, never here.
- **Tokens / components:** `quran-app-design-system.html`.
- **This tree:** generated catalog + lean copies of `screens/`. Never edit it by hand; rebuild it.

## Read order (save tokens)

1. This file (`AGENTS.md`) — rules only.
2. `CATALOG.md` or `frames.tsv` — find the frame id.
3. `frames/<stack>/CATALOG.md` — stack detail.
4. **Only if you must see markup:** one file `frames/<stack>/<FrameId>.html` (partial, no chrome).
5. **Never** open `common/styles.css` unless changing shared CSS.
6. **Never** open more than one large frame unless asked.
7. Humans preview with `viewer.html?id=Main` or `index.html`.

## Hard rules

1. Quran text byte-for-byte; no AI rewrite of ayah/tafsir/hadith.
2. Widgets / watch / wear / notifications: no Quran ayah text, no dhikr text.
3. Layout follows window class (`compact` / `medium` / `expanded` / short), never device model.
4. Frames marked `awaiting-approval` need developer sign-off before app code (ADR 0010).
5. This tree is generated from `screens/`; change frames in `screens/frames/<section>/<FrameId>.html`.

## Stacks (quick map)

| stack | about |
|---|---|
| core | home, mushaf, player |
| reading | index, search, modes, tafsir |
| salah | prayer, qibla |
| azkar / duas | azkar + duas |
| home / menu* | home additions, menu |
| widgets / watch / wear | surfaces outside the app chrome |
| expanded / sizes / devices | form factors |
| notifications | local notification frames |

## Rebuild

```bash
python design/screens/scripts/build.py
```
""",
        encoding="utf-8",
    )


def write_readme(frames: list[dict], by_stack: dict, assets: int, saved: int) -> None:
    (OUT / "README.md").write_text(
        f"""# Taybah — design screens

Team-share design catalog. **Humans browse HTML**; **models read catalogs** (not megabytes of markup).

Generated from `screens/` (the design source, ADR 0075); edit frames there.

## Share with the team

1. Open [`index.html`](index.html) (or host this folder).
2. Deep-link any frame: [`viewer.html?id=Main`](viewer.html?id=Main).
3. Stack lists: [`frames/<stack>/`](frames/) — each has `CATALOG.md`.
4. Devices / sizes / notifications / Wear OS: [`extras/`](extras/).

## For AI / agents (token budget)

| Read | ~size | When |
|---|---|---|
| [`AGENTS.md`](AGENTS.md) | 2 KB | always first |
| [`frames.tsv`](frames.tsv) | 14 KB | find an id |
| [`CATALOG.md`](CATALOG.md) | 17 KB | markdown table |
| one `frames/.../<Id>.html` | usually &lt;25 KB | visual review only |
| `screens/frames/<section>/<Id>.html` | one frame | the design source (ADR 0075) |

Never open `common/styles.css` or many frames unless asked.

## Stats

- **{len(frames)}** frames · **{len(by_stack)}** stacks · **{assets}** deduped image assets
- Base64 stripped from markup (~**{saved // 1024} KB** not repeated per Salah frame)

## Layout

```
design/screens/
  AGENTS.md CATALOG.md frames.tsv frames.json
  index.html  viewer.html?id=FrameId
  common/     shared CSS
  assets/     extracted images (once)
  frames/<stack>/   lean partials + CATALOG.md
  extras/     devices, sizes, notifications, wear, components
  scripts/build.py
```

## Rebuild

```bash
python design/screens/scripts/build.py
```
""",
        encoding="utf-8",
    )


def write_viewer() -> None:
    (OUT / "viewer.html").write_text(
        """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Frame viewer — Taybah</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="common/styles.css">
<link rel="stylesheet" href="common/devices.css">
<link rel="stylesheet" href="common/catalog.css">
<style>
.bar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:16px 24px;border-bottom:1px solid #e7dfcc;background:#fffdf8;position:sticky;top:0;z-index:10}
.bar input,.bar select{min-height:40px;padding:0 12px;border-radius:10px;border:1px solid #e7dfcc;font:inherit}
.bar button{min-height:40px;padding:0 16px;border-radius:10px;border:none;background:#1f4d40;color:#f7f3ea;font:inherit;font-weight:600;cursor:pointer}
#meta{color:#5b6a64;font-size:13px}
#stage{padding:24px;overflow:auto}
</style>
</head>
<body>
<div class="bar">
  <a href="index.html">← catalog</a>
  <label>Frame <input id="fid" list="ids" placeholder="Main" style="width:220px"></label>
  <datalist id="ids"></datalist>
  <button type="button" id="go">Open</button>
  <span id="meta"></span>
</div>
<section id="stage" class="gx-sec"><p class="gx-note">Loading…</p></section>
<script>
const params = new URLSearchParams(location.search);
const stage = document.getElementById('stage');
const meta = document.getElementById('meta');
const fidInput = document.getElementById('fid');
let catalog = null;

async function loadCatalog(){
  const res = await fetch('frames.json');
  catalog = await res.json();
  const dl = document.getElementById('ids');
  for (const f of catalog.frames){
    const o = document.createElement('option');
    o.value = f.id;
    dl.appendChild(o);
  }
}

async function show(id){
  if (!catalog) await loadCatalog();
  const f = catalog.frames.find(x => x.id === id);
  if (!f){ stage.innerHTML = '<p class="gx-note">Frame not found: '+id+'</p>'; return; }
  fidInput.value = id;
  meta.textContent = f.stack+' · '+f.size+' · '+f.theme+' · '+f.status+' — '+f.caption;
  history.replaceState(null,'','?id='+encodeURIComponent(id));
  const html = await fetch(f.path).then(r => r.text());
  stage.innerHTML = '<div class="gx-row">'+html+'</div>';
}

document.getElementById('go').onclick = () => show(fidInput.value.trim());
fidInput.addEventListener('keydown', e => { if (e.key==='Enter') show(fidInput.value.trim()); });
loadCatalog().then(() => show(params.get('id') || 'Main'));
</script>
</body>
</html>
""",
        encoding="utf-8",
    )


def write_index(frames: list[dict], by_stack: dict[str, list[dict]]) -> None:
    stack_cards = "".join(
        f'<a class="catalog-card" href="frames/{s}/index.html"><strong>{s}</strong>'
        f'<span>{len(items)} · {STACK_BLURBS.get(s, "")}</span></a>'
        for s, items in sorted(by_stack.items())
    )
    extras = "".join(
        f'<a class="catalog-card" href="extras/{href}"><span class="badge">extras</span>'
        f"<strong>{title}</strong><span>{sub}</span></a>"
        for href, title, sub in [
            ("devices/index.html", "devices", "iOS + Android shells"),
            ("sizes/index.html", "sizes", "Window + widget + watch sizes"),
            ("notifications/index.html", "notifications", "Local notification frames"),
            ("wear/index.html", "wear", "Wear OS"),
            ("components/index.html", "components", "Shared UI chrome"),
        ]
    )
    (OUT / "index.html").write_text(
        f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Taybah — design screens</title>
<link rel="stylesheet" href="common/styles.css">
<link rel="stylesheet" href="common/catalog.css">
</head>
<body>
<header class="gx-head">
  <p><a href="../../screens/index.html">screens (source)</a> · <a href="../../quran-app-design-system.html">design system</a> · <a href="AGENTS.md">AGENTS.md</a> · <a href="CATALOG.md">CATALOG.md</a></p>
  <h1>Taybah design screens</h1>
  <p>{len(frames)} frames · {len(by_stack)} stacks · lean partials + shared viewer. Open any frame: <a href="viewer.html?id=Main">viewer.html?id=Main</a></p>
</header>
<section class="gx-sec">
  <p class="gx-note">Team: use this catalog. Agents: read <code>AGENTS.md</code> then <code>CATALOG.md</code> — skip HTML unless reviewing one frame.</p>
  <h2 class="gx-h2">Extras</h2>
  <ul class="catalog-grid">{extras}</ul>
  <h2 class="gx-h2">Stacks</h2>
  <ul class="catalog-grid">{stack_cards}</ul>
</section>
</body>
</html>
""",
        encoding="utf-8",
    )


def write_stack_indexes(by_stack: dict[str, list[dict]]) -> None:
    for stack, items in by_stack.items():
        links = "\n".join(
            f'    <li><a href="../../viewer.html?id={f["id"]}">{f["id"]}</a> — {f["caption"]}</li>'
            for f in items
        )
        (FRAMES / stack / "index.html").write_text(
            f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{stack} — Taybah</title>
<link rel="stylesheet" href="../../common/styles.css">
<link rel="stylesheet" href="../../common/catalog.css">
</head>
<body>
<header class="gx-head">
  <p><a href="../../index.html">← catalog</a> · <a href="CATALOG.md">CATALOG.md</a></p>
  <h1>{stack}</h1>
  <p>{STACK_BLURBS.get(stack, "")} · {len(items)} frames</p>
</header>
<section class="gx-sec">
  <ul class="catalog-list">
{links}
  </ul>
</section>
</body>
</html>
""",
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
