# 0089 — Daily use first: Home and Menu ordered by how often people need them (15 Nov 2026)

Date: 2026-11-15 · Status: **proposed** (waiting for the developer; the frames carry «بانتظار الموافقة», ADR 0087) · Amends ADR 0034 (Home section order), ADR 0032 §3 (Menu cards) and ADR 0081. The app is not changed.

## Context

The developer asked for everything to be easy to reach, with what people use every day promoted (15 Nov 2026). The review followed the `ui-ux-pro-max` and `apple-design` skills.

Each feature was ranked by how often a person needs it:

| Rank | How often | Features |
|---|---|---|
| 1 | Five times a day | Next prayer, Qibla |
| 2 | Twice a day | Morning and evening Azkar |
| 3 | Daily | The wird and continue reading, the misbaha, today's goals |
| 4 | Often | Duas, Mushaf index, Hadith, Khatma |
| 5 | Monthly or rare | Hijri calendar, moon sighting, Names of Allah |

The frames did not follow this ranking:

- **Home.** The daily checklist «تقدّم اليوم» sat below the fold, and its rows were display-only (36 pt high, not tappable). Qibla took two taps (Home → Salah → Qibla).
- **Menu (`HadithCollMenu`).** The Hijri calendar, moon sighting and Names of Allah held the first spots, while Azkar came fifth. Qibla and the misbaha had no card at all, although `menu.qibla.*` already exists in `ar.json` and `en.json`.
- **Salah.** With the back button from ADR 0081, the date line wrapped onto two lines.

## Decision

1. **Home, first screen** (`HomeAzkar`, `HomeAzkarDark`, `HomeAzkarEnglish`): تابع القراءة, then الصلاة القادمة, then تقدّم اليوم.
   - The prayer card gets a 44 pt Qibla button (`home.salah.qiblaScreen.title`, «اتجاه القبلة»). It is a sibling of the card's link, not nested inside it.
   - The checklist rows are 44 pt links:
     - وردك اليومي → the reader
     - أذكار الصباح and أذكار المساء → the Azkar reader for that session
     - المسبحة → the misbaha
   - The card becomes the day's launcher. «تعديل» still opens «أهدافي اليومية».
2. **Home, scrolled** (`HomeAzkarLower`, `HomeAzkarLowerDark`): تابع الأذكار moves here, above the tiles.
   - Tile order: الأذكار، المسبحة، الأدعية، السور، الحديث، المحفوظات، القرّاء.
   - Full Home order: تابع القراءة · الصلاة القادمة · تقدّم اليوم · تابع الأذكار · tiles · أذكار مختارة · آخر الأذكار · آخر ما استمعت إليه.
   - The rule in ADR 0034 still applies: without goals set, the checklist shows its prompt (`HomeDailyProgressEmpty`). With the wird goal on, the wird is shown only once.
3. **Menu** (`HadithCollMenu`, its dark and English variants): cards in daily-use order, read in rows from the start edge.

   | Row | Start column | End column |
   |---|---|---|
   | 1 | الصلاة | الأذكار |
   | 2 | القبلة | المسبحة |
   | 3 | المصحف | الأدعية |
   | 4 | الختمة | الحديث |
   | 5 | التقويم الهجري | الهلال |
   | 6 | أسماء الله الحسنى | مصحفي |

   - The new القبلة card uses `menu.qibla.caption`, `title` and `bearing`.
   - The new المسبحة card shows today's count («اليوم ٥٠ من ١٠٠»).
4. **Salah header:** the date sits on its own line under the title row, so the back button, the title and the two actions fit on one line.

## Consequences

- New app strings:
  - the Menu misbaha card's title and preview (the preview can reuse the daily-progress count format)
  - an accessibility label for the Qibla button, which can reuse `home.salah.qiblaScreen.title`
- No new tokens or components. The checklist rows become pressable rows, and the prayer card gains a trailing icon button.
- Not changed:
  - Time-aware Azkar, meaning showing the session that is due now. It would need prayer-relative windows for each session, which are a content decision for the developer, beyond the recommended set in ADR 0034.
  - The older Menu frames (`Menu*`, `MenuV2*`, `MenuNewCards*`), kept as history.
- `design/` was rebuilt (ADR 0087). Review links:
  - `design/home/HomeAzkar/index.html?theme=both&dir=both&sizes=compact`
  - `design/home/HomeAzkarLower/index.html?theme=both&dir=rtl&sizes=compact`
  - `design/hadith/HadithCollMenu/index.html?theme=both&dir=both&sizes=compact`
  - `design/salah/Salah/index.html?theme=both&dir=rtl&sizes=compact`
