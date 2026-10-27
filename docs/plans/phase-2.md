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

| # | Step | Contents | Needs |
| --- | --- | --- | --- |
| 1 | **Design-system components** | `src/shared/ui`, each with its own test: `GlassSurface`, `IconButton`, `ToolbarPill`, `TitlePill`, `SegmentedControl`, `Chip` / `RadioChip`, `ListRow`, `SearchField`, `ActionTile`, `HighlightSwatch`, `EmptyState`, `AyahMarker`, `SurahCartouche`. Taken from the HTML designs, theme tokens only | — |
| 2 | **Reader data layer** | Repositories over `content.db`: verses by page and surah, words, mushaf pages and word layouts, translations, tafsir. Reading-position store (MMKV, last-read). `useReadingAnchor` | Phase 1 |
| 3 | **Local user data** (if D2 = yes) | `user.db` schema (spec §6) for bookmarks, highlights and notes. Repositories, with an outbox table written but not yet sent | — |
| 4 | **Reading and Focus modes** | `ReadingAyahRow` (Uthmani plus the selected translations), `FocusAyah`. FlashList of 6,236 ayahs with measured, cached heights. Mode switching keeps the anchor ayah | 1, 2 |
| 5 | **Mushaf mode** | Font pack (D1), `MushafPage` (15 lines from `word_layouts`, one QCF run per line), FlashList of 604 pages with `overrideItemLayout`. Falls back to Reading mode when a page's layout or font isn't installed | 1, 2 |
| 6 | **Reader shell and adaptive layout** | The `read/[verseKey]` route, the glass toolbar, ayah selection, and `AdaptiveSplit` / `SidePanel`: docked at ≥ 1,100 pt, overlaying the page from 840 to 1,099 pt, a sheet on compact and medium. The `ayah/[verseKey]` and `tafsir/[verseKey]` routes render in the panel or a sheet | 1, 4 |
| 7 | **Ayah actions, tafsir and translation panels** | `AyahActionsPanel` (word meanings, highlight colours, action tiles), `TafsirPanel` (picker, ayah card, text with its source credit, previous and next), `TranslationPanel`. Play-from-here is wired in Phase 3 | 1, 3, 6 |
| 8 | **Surah and juz index, and search** | The Mushaf tab's index (surah and juz lists, jump to an ayah). Search screen: FTS5 over `search_quran` (Imla'i-based, from step 11 of Phase 1), surah-name prefix matching, results with matched words highlighted, under 150 ms | 1, 2 |
| 9 | **Reader settings** | Settings sheet: mode, font scale (80–160%), theme (light, sepia, dark), translations on or off. Persisted in MMKV and applied without a reload | 1, 4 |
| 10 | **Exit check** | Device matrix (spec §14): phone, iPad and foldable, in Arabic and English. The resize and fold keep-position test. The 604-page pass needs QF's full mushaf layout | all |

**Parallel waves:**
- **A:** 1, 2, 3.
- **B:** 4, 5, 8 (need 1 and 2).
- **C:** 6, 9.
- **D:** 7.
- **E:** the exit check.

## Known limits

- **Prelive data:** QF prelive has the mushaf layout and translations for only 2 surahs. Mushaf mode is built and tested on those pages, and the full 604-page check needs production QF data. Reading mode works for all 6,236 ayahs from Tanzil.
- **Audio** (play from here, highlight sync, the mini-player's live state) is Phase 3. The UI shows the controls, wired to no-ops behind a feature flag.
