# Remove translations (ADR 0014)

Goal: no Quran translation and no word-by-word meaning or transliteration anywhere in the product. The English interface and tafsir stay. Each part below is one brief for a Haiku agent; the orchestrator reviews each diff (and the app on the iPhone 17 simulator for UI parts) before the next starts. The developer commits.

| Part | Area | Needs | Status |
| --- | --- | --- | --- |
| 1 | API | — | Done |
| 2 | Device data and sync | — (runs with 1) | Done |
| 3 | Reader UI | 2 | Done. iPhone 17 (28 Oct): ayah sheet, settings and Reading mode show no translations |
| 4 | Design HTML | — (runs with 1, 2) | Done |
| 5 | Docs | 1–4 | Done |

## 1. API (`apps/api`)
- Delete `Sync/Handlers/TranslationsHandler.php`, `Sync/TranslationRow.php`, `Models/TranslationEntry.php`, the `TranslationEntryRepository` contract and Eloquent class, `TranslationEntryFactory`, and their bindings in `ContentServiceProvider`.
- `ResourceGroup`: the sync skips `translations`, `word_by_word_translations` and `word_by_word_transliterations` (logged once per run, no row written). Decide in the brief whether the enum cases go or stay as "ignored"; the change-feed parser must not fail on them.
- `PackSchema` and the pack builder: no translation group. `GET /content/manifest`, `/content/resources` and `/content/changes` never list translation resources.
- New migration: drop `translation_entries` (and `word_translations` if it exists); delete `resources` rows in the three groups and their packs/snapshots. The old create migration stays (history).
- Tests: remove translation cases, add "sync skips translation groups" and "manifest lists no translation". Fixtures `tests/Fixtures/qf/sync-page-*.json` keep their translation items so the skip is tested.
- Contract: `npm run generate -w @quran/api-contract`; commit `openapi.json` and `src/schema.d.ts`.
- Gates: `composer qa`.

## 2. Device data and sync (`apps/mobile/src/core`, `src/features/reader/data`, settings model)
- `content.db`: drop `translation_entries` from `schema.ts`, generate a new Drizzle migration that drops the table.
- `core/sync/content-tables.ts`: remove the `translations` pack group. `core/sync/selection.ts`: no default translation, no `translationIds` override.
- Delete `features/reader/data/translations.ts`; remove translation reads from the repositories.
- `settings-model.ts` / `settings.ts`: drop `translationIds`; reading an old MMKV blob that still has it must not fail.
- `reading-window.ts`, `reading-heights.ts`, `reading-list-types.ts`: rows carry no translations; the height cache key loses the translations part.
- Tests: `__tests__/content-sync.test.ts`, `content-selection.test.ts`, `repositories.test.ts`, `settings.test.ts` updated.

## 3. Reader UI (`apps/mobile`)
- Delete `TranslationBlock`, `TranslationPanel`, `TranslationToggleList` (and tests).
- `ReadingAyahRow`, `ReadingList`, `ReaderScreen`: Arabic only.
- `PanelTabs` / `AyahPanelContent` / `SheetContainer` / `SidePanel` / `form-sheet.ts` / `selection.ts`: tabs are actions and tafsir only.
- `AyahActionsPanel`: no translation tile; remove the word chips section, `WordMeaningChip` and `loadWordMeanings`.
- `ReaderSettingsSheet`: no translations section.
- i18n: remove translation and word-meaning keys from `ar.json` and `en.json` (keep the language switch).
- Visual check on the iPhone 17 simulator: Reading mode, ayah sheet, reader settings.

## 4. Design HTML
- `quran-app-screens.html`: remove translation lines under ayahs, the translation tile, word chips, translation tabs, the translation frames ("Translations, khatma, downloads and account": the language list and translation picker), translation search filters, and any settings rows for translations. Keep khatma, downloads and account.
- `quran-app-design-system.html`: remove the word-meaning chip and translation block components and any translation copy. Tokens stay.
- `quran-app-plan.html`: mark translations as out of scope.

## 5. Docs
- Spec §1, §2, §5, §6, §7, §9, §11, §12, §15: remove translation tables, groups, endpoints, settings and search; reading-row height key.
- `docs/content-plan.md`: translations, word-by-word and QuranEnc rows out.
- Phase plans and briefs (`docs/plans/phase-1*`, `phase-2*`): note translations removed by ADR 0014 where they mention them; don't rewrite history.
- ADR 0008 and 0013: add "Amended by ADR 0014".
- Root `CLAUDE.md`/`AGENTS.md` and `apps/mobile/CLAUDE.md`: drop translation mentions from the state table and rules.

## Hadith (kept)
Hadith translations stay. The Arabic hadith always shows; with the English interface, the English text sits under it. Part 4 checks the hadith frames (daily hadith, detail, and their English variant) draw that and adds it where missing.

## Follow-ups

- **(a)** Narrow the `ResourceGroup` type in the OpenAPI contract so clients don't see the ignored groups (`translations`, `word_by_word_translations`, `word_by_word_transliterations`). **In progress.**
- **(b)** The drop migration `2026_10_28_100000_drop_translation_entries_and_resources` has no automated test, because MySQL DDL breaks the test transaction. Verify it with `php artisan migrate` on a dev database.
