# AGENTS — design/screens

Taybah HTML design frames, split for humans and for low token use.

## Source of truth

- **CI / `frame-shot.py`:** still `quran-app-screens.html` at repo root (do not delete; do not edit from here).
- **Tokens / components:** `quran-app-design-system.html`.
- **This tree:** team-facing catalog + lean copies. New work lands here first, then merges to the monolith when approved.

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
5. Do not modify `quran-app-screens.html` when editing this tree.

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
