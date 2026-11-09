# AGENTS — design/screens

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
