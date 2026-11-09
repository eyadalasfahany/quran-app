# 0081 — Navigation and findability in the screen designs (8 Nov 2026)

Date: 2026-11-08 · Status: **proposed** (waiting for the developer) · Applies ADR 0032 (Menu tab, search in the header), ADR 0035 §8 (Settings → الودجات والساعة), ADR 0044 (Duas entry points) and ADR 0051 (tablet rail, Salah pushed) to the frames in `screens/` (ADR 0075). The app is not changed.

## Context

The developer asked for every part of the app to be easy to reach (8 Nov 2026). Every link between frames was mapped (238 frames, `href="../../index.html#…"`). The map showed four problems:

- **Three tab bars.** 15 frames drew the old 4-tab bar (الرئيسية، المصحف، الاستماع، مصحفي) with no القائمة. Six drew الصلاة as a tab. Only 22 drew the approved bar from ADR 0032. From `#Main`, Azkar, Duas, Salah, Hadith, Names, the Hijri calendar and Settings could not be reached.
- **Decisions not yet drawn.**
  - Menu search moved to the header (ADR 0032, amended 2 Nov 2026), but six Menu frames still drew the floating button, which covered card text. The six newest Menu frames had no search at all.
  - The tablet sidebar was replaced by the rail (ADR 0051), but the expanded frames still drew the sidebar.
  - The Duas Menu card and Home tile (ADR 0044) and the Settings «الودجات والساعة» row (ADR 0035) were drawn nowhere.
- **Screens nothing linked to:** the saved-hadith list, the Azkar audio downloads, the widgets help screen, and Discover once its card is hidden.
- **Wrong or dead links:** the Menu's «المصادر والشكر» card opened Settings. «سياسة الخصوصية» showed a chevron but was not a link. The Azkar loading state drew an empty circle where the back button belongs.

## Decision

1. **One tab bar.** Every phone frame with tabs draws الرئيسية، المصحف، مصحفي، الاستماع، القائمة, keeping the tab it had selected. That is 15 frames, including `#Main`, `SurahIndex`, `MyQuran`, `Reciters`, the Home states and the loading states.
2. **Salah is a pushed screen** (ADR 0051). `Salah`, `SalahDark`, `SalahAdhanSoundEntry` and `SalahAzkar` lose the stale الصلاة tab bar and gain a back button. It is reached from the Home prayer card and the Menu.
3. **Tablet rail** (ADR 0051).
   - `ExpandedHome` and `ExpandedHomeDark` draw the 5-tab rail on the start edge, as in `HadithCollExpanded`. The mini player sits 116 pt from the start edge, and the Home header has its search button back.
   - `AzkarExpanded` is a pushed reader, so it draws no rail.
   - The section note in `index.html` is updated. This supersedes the sidebar bullet in ADR 0080.
4. **Search in every Menu header** (ADR 0032). The floating button is removed from `Menu*` and `MenuV2*`. A header button is added to `MenuNewCards*` and `HadithCollMenu*`.
5. **Duas is reachable** (ADR 0044).
   - The «الأدعية» card is added to `MenuNewCards*` and `HadithCollMenu*`, after Azkar. It uses the app's strings `duas.menu.title` and `duas.menu.subtitle`.
   - `HomeAzkarLower*` gets «الأدعية» and «الحديث» tiles. The row scrolls (ADR 0080), so it holds seven tiles.
6. **Hidden screens get an entry point.**
   - Hadith header: a saved button (bookmark, like the Azkar header) opens `HadithCollSaved`.
   - Downloads: a «الأذكار» section links `AzkarDownloads`.
   - Settings (`SettingsSuggestCard`): «الودجات والساعة» goes in the Habits section (ADR 0035 §8). «اكتشف طيبة» goes under About, so a hidden Discover card can be reopened.
7. **Links fixed.**
   - «المصادر والشكر» in the Menu opens `Sources`.
   - «سياسة الخصوصية» links taybah-app.com/privacy.
   - «مسح كل البيانات المحلية» is a real button.
   - `AzkarLoading` has a working back button while content loads.

## Consequences

- New strings for the app: «اكتشف طيبة» in Settings, the Downloads «الأذكار» section and its row, and the saved-hadith button label. The Duas card and tile reuse existing strings.
- Code already matches most of this (the Menu tab, the rail, the Duas card). The Settings rows, the Hadith saved button and the Downloads link are new to build.
- `apps/mobile/CLAUDE.md` still describes the expanded sidebar (noted in ADR 0051). That's left for the developer.
