# 0032 — القائمة tab replaces the الصلاة tab

Date: 2026-11-01 · Status: accepted (frames `Menu`, `MenuDark`, `MenuEnglish`, `MainMenuTab` approved by the developer, 1 Nov 2026) · Amends ADR 0030 §4 (navigation) and ADR 0031 §10 (Azkar placement)

## Context

The tab bar has five tabs (ADR 0030 §4), and الصلاة holds the last one. Azkar (ADR 0031) has no tab, and Qibla, Khatma, Downloads, Settings and Sources are reachable only from inside other screens.

The developer asked (1 Nov 2026) for the الصلاة tab to become a menu tab that opens a menu screen listing every section, laid out as a two-column staggered card grid. The visual reference was a notes app's masonry grid.

## Decision

1. **Tabs** (first is rightmost in RTL): الرئيسية، المصحف، **مصحفي** (centre)، الاستماع، **القائمة**. Icon: SF `line.3.horizontal`, Material `menu`. Route group `(menu)`.
2. **The Salah feature is unchanged** (developer, 1 Nov 2026). Only its tab-bar item is replaced. `SalahScreen`, `QiblaScreen`, their components, data, hooks, the `(salah)` route and `/salah/qibla` stay exactly as they are; no Salah file is edited. The route stays registered under `(main)` without a visible tab item, and the menu's الصلاة card navigates to it. The expanded sidebar keeps its الصلاة entry unchanged.
3. **Menu screen «القائمة»:** a two-column staggered grid of cards drawn from the existing tokens (no new colours, radii or type). Each card has a small caption, an Amiri title and, where useful, a live preview line:
   - الصلاة: the next prayer and its time
   - القبلة: the bearing
   - الأذكار: «تابع» progress; shown only when Azkar content is installed (ADR 0031)
   - الختمة: today's progress
   - المصحف، الاستماع، مصحفي، البحث، التنزيلات، الإعدادات، المصادر: a short subtitle each

   A floating search button opens the existing search. The reference's compose and filter buttons have no Taybah counterpart and are omitted.
4. **Expanded windows:** the sidebar keeps every destination (مصحفي first, then الرئيسية، المصحف، الاستماع، الصلاة، الأذكار). The menu tab is hidden with the tab bar, as all tabs are.
5. Frames `Menu`, `MenuDark`, `MenuEnglish` and an updated tab bar in `#Main` are drawn and approved before code (ADR 0010).

6. **Additions (developer, 1 Nov 2026):**
   - **Continue cards** at the top of the grid:
     - «تابع القراءة» opens `/read/<last-read verseKey>` (MMKV `reader.lastVerseKey`; hidden on a fresh install).
     - «تابع الأذكار» resumes the reader at the first incomplete unit of the last active scope (`/azkar/read/<categoryId>` or `/azkar/entry/<entryKey>`). Hidden when there is nothing to continue.
   - **Every user-facing screen has a card** (each hidden when its route or content does not exist): الرئيسية، المصحف (surah index)، الاستماع، القرّاء، مصحفي، الختمة، الصلاة، القبلة، الأذكار (home)، الأذكار المفضلة، البحث، الإعدادات، التنزيلات، المصادر والشكر.
   - **Search covers Quran and Azkar.** The menu's floating search opens `/search`, which gains an «الأذكار» scope (segmented or chip filter) next to the Quran scopes. Azkar results come from the Azkar search (text segments only, never Quran text copied into Azkar). It is shown only when Azkar content exists.
   - The floating search button sits at the bottom-leading corner above the tab bar, as drawn in `Menu`.
   - **Approved difference (developer, 1 Nov 2026):** the `#Search` frame does not draw the scope control; it sits under the field, shown only with Azkar content. No frame edit.

## Consequences

- Prayer times move one tap deeper on phones. The menu's الصلاة card shows the next prayer, so the most-used information stays visible.
- Only navigation code and its tests change: `destinations.ts` (tab list vs sidebar list), `app/(main)/_layout.tsx` and `router.test.tsx`. The `#Salah` / `#SalahDark` / `#Qibla` frames and all Salah code stay as they are.
- Azkar gains a permanent entry point without a sixth tab.

Amended by ADR 0042 (1 Nov 2026): the menu gains an الحديث card, shown only while at least one hadith collection pack is installed; the `Menu`, `MenuDark` and `MenuEnglish` frames are updated in Phase 7 step 8.

Amended (developer, 2 Nov 2026): the search button lives in the header row beside the title, as on Home (`ScreenHeader` trailing `SearchButton`), not as a floating button above the tab bar. The floating-button wording in decisions 3 and 6 is superseded on this point.
