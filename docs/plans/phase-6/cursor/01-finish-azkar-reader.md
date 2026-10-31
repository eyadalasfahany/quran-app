# Prompt 1 — Finish the Azkar reader (step 6a)

You are working in the Taybah monorepo (`D:\projects\quran-app`), Expo app `apps/mobile`, on branch `ft/azkar`. Don't switch branches, commit, add dependencies, or edit `apps/mobile/android/`, `src/features/salah/**` or `app/(main)/(salah)/**`.

**Read first:** @AGENTS.md @apps/mobile/CLAUDE.md @.claude/agent-rules.md @docs/plans/phase-6/README.md @docs/adr/0031-azkar.md @docs/plans/phase-6.md (sections "Variations" and "Progress periods") @docs/plans/phase-6/step-06-mobile-ui.md (section **6a — Reader** and its Rules).

**State:** a previous agent built most of step 6a and was stopped mid-way. The work is in `apps/mobile/src/features/azkar/{components,screens}`, `src/features/azkar/reader-model.ts`, `src/features/azkar/haptics.ts`, `apps/mobile/jest/azkar-ui-fixtures.ts`, `app/azkar/` and `app/_layout.tsx`. The data layer in `src/features/azkar/data/` is done and tested; use it, don't duplicate it. Current gates:
- `npx tsc --noEmit`: **36 errors**, mostly `TestInstance` vs `ReactTestInstance` type mismatches in the new tests and `jest/azkar-ui-fixtures.ts`. Check which type `@testing-library/react-native` v14 exports and use it consistently.
- `npx jest src/features/azkar`: **15 failing** tests in 1 suite (the reader screen test, which had re-render problems with mocked hooks).
- ESLint: 9 warnings (unused imports) in the new files.
- The stopped agent may have left **debug logging** in a component or screen. Remove every `console.log` / `console.debug` it added.

**Task:**
1. Make all gates green.
2. Finish anything in section 6a not yet built. Check each component and route the brief lists, and the reviewer corrections below.

**Must hold (the review checks each):**
- Counts read «٢ من ٣» with Arabic-Indic digits (`formatNumber` from `src/core/i18n`) in Arabic, and "2 of 3" in English. Never «X / Y», never «١ من ١».
- `requiredCount === null` → `AzkarDoneButton` («تم»), no number anywhere.
- **Quran segments:**
  - rendered with the existing `QuranText` component from `content.db` verses (`getQuranSegmentVerses`)
  - never in the dhikr font
  - never copied
- Dhikr text uses the `dhikr` type token (Amiri), scaled by the Azkar font scale.
- Sourced sections (instruction, context, explanation, virtue, reference, grade) render **only** when present. No "not available" text.
- `AzkarVariationSwitch` renders only when an entry has more than one variation, labelled «الصيغة ١ / ٢».
- **Counter:**
  - one count per tap, with the data layer's 120 ms guard
  - `Haptics.selectionAsync()` per accepted tap and `notificationAsync(Success)` on completion, each with `.catch(() => undefined)`
  - accessibility role `button`, a label and a value, plus a reset accessibility action
  - Reduce Motion → no animation
- Share uses `Share.share({ message: azkarShareText(...) })` with nothing appended.
- No audio controls.
- Routes:
  - `app/azkar/read/[categoryId].tsx`, `app/azkar/entry/[entryKey].tsx`, `app/azkar/details/[entryKey].tsx`
  - details is registered as a sheet in `app/_layout.tsx` with `sheetScreenOptions`, like `ayah/[verseKey]`

**Frames to match:** render them with `python packages/design-tokens/scripts/frame-shot.py <id> <out.png>` (set `CHROME` to your Chrome path): `AzkarReader`, `AzkarReaderDark`, `AzkarReaderDone`, `AzkarReaderComplete`, `AzkarDetails`, `AzkarDetailsFull`, `AzkarExpanded`.

**Gates** (Node 26 on PATH, from `apps/mobile`): `npm run lint` (0 errors), `npx tsc --noEmit` (0), `npx jest src/features/azkar __tests__`.

**Report:** files changed, test counts, gate output summary, any deviation from the frames. No religious text in the report.
