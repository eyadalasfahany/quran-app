#!/usr/bin/env python3
"""Rebuild design/screens for team sharing + low token cost for models.

- Reads screens/ (ADR 0075) through packages/design-tokens/scripts/screens_lib.py; never writes there
- Externalizes base64 images → assets/
- Writes lean frame partials (no per-frame document chrome)
- Writes AGENTS.md, CATALOG.md and README.md (what models read). Humans review at design/<stack>/<Screen>/index.html (ADR 0087)
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
    ("السيرة النبوية", "seerah"),
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
    "seerah": "Seerah map, timeline, event page, list",
}

EXT = {"jpeg": "jpg", "jpg": "jpg", "png": "png", "webp": "webp", "gif": "gif", "svg+xml": "svg", "svg": "svg"}
# design-assets art drawn twice, as <name>.<ext> and <name>-dark.<ext>: light asset -> dark asset, so the
# reference build can swap the art when it derives a variant in the other theme (Seerah maps).
DARK_PAIRS: dict[str, str] = {}


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
    def asset_name(path: Path) -> str:
        mime = "jpeg" if path.suffix.lower() in (".jpg", ".jpeg") else path.suffix.lower().lstrip(".")
        b64 = base64.b64encode(path.read_bytes()).decode("ascii")
        return repl(re.match(r"(.+)\|(.+)", f"{mime}|{b64}", re.S))

    def repl_file(m: re.Match[str]) -> str:
        path = ROOT / m.group(0)
        out_name = asset_name(path)
        stem = path.stem[:-5] if path.stem.endswith("-dark") else path.stem
        light, dark = path.with_name(stem + path.suffix), path.with_name(stem + "-dark" + path.suffix)
        if light.exists() and dark.exists():
            DARK_PAIRS[asset_name(light).rsplit("/", 1)[-1]] = asset_name(dark).rsplit("/", 1)[-1]
        return out_name

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

    # wipe generated content, keep scripts
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

    write_catalogs(frames, by_stack)
    write_agents()
    (ASSETS / "dark-pairs.json").write_text(json.dumps(DARK_PAIRS, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    write_readme(frames, by_stack, len(digest_map), total_saved)

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
            f"{len(items)} frames · review page: `design/{stack}/<Screen>/index.html` (ADR 0087)",
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
7. Humans review at `design/<stack>/<Screen>/index.html` (ADR 0087). This folder is the build's intermediate input.

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
| widgets / watch | surfaces outside the app chrome |
| expanded | medium and expanded windows |

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

Build input for the design review pages. **Humans review at `design/<stack>/<Screen>/index.html`** (ADR 0087); **models read catalogs** (not megabytes of markup).

Generated from `screens/` (the design source, ADR 0075); edit frames there.

## Review

1. Review pages: `design/<stack>/<Screen>/index.html` (ADR 0087). Nothing here is for review.
2. Stack lists: [`frames/<stack>/`](frames/) — each has `CATALOG.md`.

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
  common/     shared CSS
  assets/     extracted images (once)
  frames/<stack>/   lean partials + CATALOG.md
  scripts/build.py
```

## Rebuild

```bash
python design/screens/scripts/build.py
```
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
