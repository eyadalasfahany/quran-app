# 0099 — Menu in colour sections

Date: 2026-11-26 · Status: **accepted** (developer, 26 Nov 2026; frames `MenuSections`, `MenuSectionsDark` and `MenuSectionsEnglish` approved up front). Amends ADR 0032 §3 (staggered grid) and ADR 0089 §3 (Menu order).

## Context

The menu had grown to about 19 identical grey cards in a two-column staggered grid. Every card had the same weight, the same green icon and a small muted caption above its title. The developer found it hard to read: the eye zig-zags between columns, and nothing marks where one kind of section ends and the next begins. The developer asked for a more colourful, more readable menu (26 Nov 2026), checked against the apple-design and ui-ux-pro-max skills.

## Decision

1. **Next-prayer hero.** The prayer card is a full-width `brandSurface` card at the top. It shows the caption, the prayer name (Amiri 28), the clock time and a pill with the time left. Without a location it shows «الصلاة» and the neutral line. This is the green prayer card first proposed as option D2 in `MenuV2Accent`.
2. **Titled sections, in daily-use order (ADR 0089):**
   - تابع: continue reading and continue azkar. Shown only when one of them exists.
   - العبادة (gold): الأذكار، القبلة، **المسبحة** (new; today's count)، الأدعية، الأذكار المفضلة، التذكيرات.
   - القرآن (green): المصحف، الختمة، الاستماع، مصحفي.
   - المعرفة (blue): الحديث، السيرة النبوية، اكتشف طيبة.
   - التقويم (rose): التقويم الهجري، رؤية الهلال.
   - التطبيق (neutral): الإعدادات، المصادر والشكر.

   Every card the app showed is kept (developer, 26 Nov 2026). A section with no visible card is not drawn. Section titles are headers for VoiceOver and TalkBack.
3. **Even rows, not a staggered grid.** Each section has rows of two cards (three on wider windows, ADR 0036). Cards in a row share a height, and an odd last card takes one column.
4. **Cards keep the hairline style** (`surfaceRaised`, `line`, radius 24, no shadow, as chosen in `docs/plans/names-hijri-moon.md`). Colour comes from a 44 pt icon tile in the section's hue. The small caption is no longer drawn, because the section title does its job. It is still read before the title in the card's accessibility label.
5. **The البحث card is removed.** The header's search button opens search.
6. **New tokens:** `tile{Green,Gold,Blue,Rose,Neutral}` and their `…Ink`, for light, sepia and dark. Every ink is at least 4.8:1 on its tile and at least 5.4:1 on `surface`.

## Consequences

- `MenuGrid` (staggered columns) is replaced by `MenuSection`, which gives its cards their tone through context. The feature cards (Duas, Hadith, Seerah, Hijri, Moon) are unchanged.
- New strings: `menu.sections.*` and `menu.sibha.*`. Removed: `menu.search.*`.
- The older Menu frames (`Menu*`, `MenuV2*`, `MenuNewCards*`, `HadithCollMenu*`) are kept as history.
- The change is JavaScript only, so it ships as an OTA update.
