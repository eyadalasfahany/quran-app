# Phase 2 — Reader and responsive layouts

Spec §15. **Exit criterion:**
- All 604 mushaf pages verified on a phone, an iPad and a foldable.
- Resizing (rotate, fold, unfold, Split View) keeps the reading position.

**Design sources** (ADR 0010):
- `quran-app-screens.html`: the phone reader screens (Mushaf page, Ayah actions, Reading mode, Focus mode, Tafsir, Reader settings, Surah index, Search) and the approved **Tablet reader** section (`#tablet-reader`).
- `quran-app-design-system.html`: tokens and components.

**Rules** (`apps/mobile/CLAUDE.md`):
- **Components:** every component is its own file with its own test, and screens only compose them.
- **Design:** everything follows the `apple-design` skill.
- **Layout:** follows `useWindowClass()`, never the device model.
- **Quran text:** renders byte for byte in its Quran font, never truncated.

Work method as in Phase 1: one brief per step in `docs/plans/phase-2/`, parallel agents where steps don't depend on each other, and review before merge. The developer commits.

## Status (27 Oct 2026)

Steps 1–3 are on `main` (`05b931e`), and steps 4, 5 and 8 are committed (`46c2758`). Steps 6 and 9 are implemented in local commit `04c650a`, not pushed. Step 7 is implemented in the working tree and not committed. Do not reimplement any of them.

**Next:** step 10, the exit check, done by a person on device. It is not done.

| Step | Result |
| --- | --- |
| 1 Design-system components | ✅ 14 components in `src/shared/ui`, Amiri loaded beside IBM Plex, `expo-haptics`. `fontFamilies.quran` stays `KFGQPC HAFS Uthmanic Script`. Reading and Focus use `quranFontFamily` (`AmiriQuran`) in `fonts.ts` |
| 2 Reader data | ✅ Repositories and the reading anchor. A route key is trimmed and kept only when it matches `2:255`. `useReadingAnchor()` takes no argument |
| 3 Local user data | ✅ Separate `user.db`, outbox in the same transaction. `npm run db:generate:user` generates its migrations |
| 4 Reading and Focus | ✅ `ReadingList` windows ayahs, restores the top visible ayah on mode switch and resize, and uses FlashList `maintainVisibleContentPosition` when the window grows upward. Selection is a callback. Step 6 adds `selection.ts` |
| 5 Mushaf | ✅ QCF V2 fonts from `verses.quran.foundation` only. The visible page, not each mounted row, decides which fonts stay loaded. `revalidatePageFonts()` runs when `MushafList` mounts. A failed check does not move the 30-day clock |
| 8 Index and search | ✅ Mushaf tab index and `app/search.tsx`. Search normalizes through `@quran/quran-text-check/normalize` (not the package root; that entry pulls Node-only files). A three-letter query was 4 ms in Node |
| 6 Reader shell | ✅ `read/[verseKey]`, the glass toolbar, `selection.ts`, `AdaptiveReaderLayout` and `SidePanel`, the `ayah/[verseKey]` and `tafsir/[verseKey]` sheets. Local commit `04c650a`, not pushed |
| 9 Reader settings | ✅ The settings sheet: mode, font scale, theme, in one `reader.settings` MMKV blob (translations removed by ADR 0014). Local commit `04c650a`, not pushed |
| 7 Ayah panels | ✅ Working tree. `src/features/reader/panels/`: `PanelHeader`, `AyahActionsPanel` (with `LiveAyahActionsPanel` on the `user.db` live queries), `NoteEditor`, `TafsirPanel` (`@native-html/render` 1.0.4), `PanelButton`, `PanelSection`, and `AyahPanelContent`, which `SidePanel` and `SheetContainer` both render by tab. `expo-clipboard` added. `TranslationPanel` and word chips removed by ADR 0014 (28 Oct 2026). Play and repeat stay disabled (`AUDIO_AVAILABLE` in the actions panel) |
| 10 Exit check | Not started. A person on device |

**Carry into step 10 and later**

- The device has no resource catalogue (names, authors). The panels show "Tafsir 16" and leave the tafsir length tag empty. Wire the catalogue when it reaches the device.
- Translations, word-by-word meanings and word chips are removed; see ADR 0014.
- The tafsir empty state offers a download only for the tafsir already chosen in reader settings (`setTafsirId`). With nothing chosen there is no id to offer.
- Switching tafsir in the panel is local to the panel. Saving it with `setTafsirId` would drop the other installed tafsir at the next sync.
- Saving an edited note writes a new note and then deletes the old one, because the step 3 repository has no update.

**Carry into step 6 (done)**

- Call `resolveInitialAnchor({ verseKey })` for the route. A route ayah comes back with `page: null`. In Mushaf mode fill the page with `pageForVerse`.
- Create `src/features/reader/selection.ts`. Steps 4 and 5 do not own it.
- `ReadingList` takes translation name, author and direction as props. There is no `resources` table on the device. Wire that from the catalogue. Removed by ADR 0014 (28 Oct 2026).
- Do not speak QCF glyph bytes. A Mushaf line has no Imla'i text yet. Pass the Imla'i ayah in when you add its accessibility label.
- `SearchResultRow` is not a `ListRow`. Quran text must not be truncated.
- Opening the app needs a dev-client rebuild (`npx expo run:ios` or `run:android`). Expo Go has no Nitro module, and MMKV 4 will crash without it. `expo-haptics` is already installed.
- Appearance is already resolved (`src/core/theme/appearance.ts`, `useResolvedTheme`). Step 9 must not store a second theme field.

## Decisions (answered 27 Oct 2026, ADR 0011)

- **D1:** QCF V2 fonts load on first use **directly from QF's CDN** (QF's terms forbid serving them through our API), are cached on the device, and are revalidated every 30 days. Non-negotiable #2 is amended.
- **D2:** a local-only `user.db` (bookmarks, highlights and notes, with outbox rows written) in Phase 2. Phase 4 adds sync.
- **D3:** bundle Amiri and Amiri Quran 1.003.

The original questions:

| # | Question | Why it matters | Recommendation |
| --- | --- | --- | --- |
| **D1** | **QCF V2 mushaf fonts.** Mushaf mode renders each page in its own font (604 files) from QF. Bundle all 604 in the app (the content plan says so; a few tens of MB), or **download them as a pack** the first time Mushaf mode opens? | App size against first-use download | **Download as a pack**, cached on the device. QF's fonts terms allow use inside the app with credit, and the store download stays small. Reading mode works offline from Tanzil text and the bundled Amiri Quran font regardless |
| **D2** | **Bookmarks, highlights and notes.** They need `user.db` and the outbox (non-negotiable #4), which ADR 0009 moved to Phase 4 with sync. Show them in Phase 2 or not? | The ayah-actions panel draws them | **Pull a local-only `user.db` forward into Phase 2.** Phase 2 saves bookmarks, highlights and notes on the device; Phase 4 adds the outbox and account sync, with no schema change |
| **D3** | **Fonts for Reading and Focus mode.** The designs use **Amiri Quran** for ayah text and **Amiri** for surah names and display text | A new font dependency | **Bundle Amiri and Amiri Quran** (SIL Open Font License, the same licence as IBM Plex). Uthmani text from Tanzil renders with them; QCF stays Mushaf mode only |

## Steps

Each step becomes a brief in `docs/plans/phase-2/`. The *Needs* column shows what can run in parallel.

| # | Step | Contents | Needs | Status |
| --- | --- | --- | --- | --- |
| 1 | **Design-system components** | `src/shared/ui`, each with its own test: `GlassSurface`, `IconButton`, `ToolbarPill`, `TitlePill`, `SegmentedControl`, `Chip` / `RadioChip`, `ListRow`, `SearchField`, `ActionTile`, `HighlightSwatch`, `EmptyState`, `AyahMarker`, `SurahCartouche`. Taken from the HTML designs, theme tokens only | — | Done |
| 2 | **Reader data layer** | Repositories over `content.db`: verses by page and surah, words, mushaf pages and word layouts, tafsir (translations removed by ADR 0014). Reading-position store (MMKV, last-read). `useReadingAnchor` | Phase 1 | Done |
| 3 | **Local user data** (if D2 = yes) | `user.db` schema (spec §6) for bookmarks, highlights and notes. Repositories, with an outbox table written but not yet sent | — | Done |
| 4 | **Reading and Focus modes** | `ReadingAyahRow` (Uthmani only; translations removed by ADR 0014), `FocusAyah`. FlashList of 6,236 ayahs with measured, cached heights. Mode switching keeps the anchor ayah | 1, 2 | Done |
| 5 | **Mushaf mode** | Font pack (D1), `MushafPage` (15 lines from `word_layouts`, one QCF run per line), FlashList of 604 pages with `overrideItemLayout`. Falls back to Reading mode when a page's layout or font isn't installed | 1, 2 | Done |
| 6 | **Reader shell and adaptive layout** | The `read/[verseKey]` route, the glass toolbar, ayah selection, and `AdaptiveSplit` / `SidePanel`: docked at ≥ 1,100 pt, overlaying the page from 840 to 1,099 pt, a sheet on compact and medium. The `ayah/[verseKey]` and `tafsir/[verseKey]` routes render in the panel or a sheet | 1, 4 | Done |
| 7 | **Ayah actions and tafsir panels** | `AyahActionsPanel` (highlight colours, action tiles), `TafsirPanel` (picker, ayah card, text with its source credit, previous and next). Play-from-here is wired in Phase 3. Translation panel and word meanings removed by ADR 0014 | 1, 3, 6 | Done (working tree) |
| 8 | **Surah and juz index, and search** | The Mushaf tab's index (surah and juz lists, jump to an ayah). Search screen: FTS5 over `search_quran` (Imla'i-based, from step 11 of Phase 1), surah-name prefix matching, results with matched words highlighted, under 150 ms | 1, 2 | Done |
| 9 | **Reader settings** | Settings sheet: mode, font scale (80–160%), theme (light, sepia, dark). Translations on or off removed by ADR 0014. Persisted in MMKV and applied without a reload. Appearance is already resolved; do not add a second theme field | 1, 4 | Done |
| 10 | **Exit check** | Exit check on the iPhone 17 simulator, portrait and landscape (developer, 28 Oct 2026: no real devices in Phase 2). Arabic and English. The resize keep-position test. The 604-page pass needs QF's full mushaf layout. iPad, foldable and Split View deferred | all | |

**Parallel waves:**
- **A:** 1, 2, 3. Done. Committed.
- **B:** 4, 5, 8. Done. Committed.
- **C:** 6, 9. Done. Local commit `04c650a`, not pushed.
- **D:** 7. Done. In the working tree, not committed.
- **E:** the exit check. Next.

## Known limits

- **Prelive data:** QF prelive has the mushaf layout for only 2 surahs (translations removed by ADR 0014). Mushaf mode is built and tested on those pages, and the full 604-page check needs production QF data. Reading mode works for all 6,236 ayahs from Tanzil.
- **Audio** (play from here, highlight sync, the mini-player's live state) is Phase 3. The UI shows the controls, wired to no-ops behind a feature flag.
