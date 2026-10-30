# Phase 4 — implementation briefs

One file per step of [`../phase-4.md`](../phase-4.md). Send a subagent *"Implement `docs/plans/phase-4/step-NN-….md`. Follow `docs/plans/phase-4/README.md`."* The reviewer checks the diff, the gates and the iPhone 17 simulator against the frames; the developer commits. Do not reimplement a step marked done in `../phase-4.md`.

| Step | Brief | Needs | Status |
| --- | --- | --- | --- |
| 1 | [step-01-settings-screen.md](step-01-settings-screen.md) | — | Not started |
| 2 | [step-02-my-quran-library.md](step-02-my-quran-library.md) | 1 | Not started |
| 3 | [step-03-khatma-planner.md](step-03-khatma-planner.md) | 2 | Not started |
| 4 | [step-04-local-reminders.md](step-04-local-reminders.md) | 1 | Not started |
| 5 | [step-05-exit-check.md](step-05-exit-check.md) | all | Not started |

## Rules for every step
- Follow `apps/mobile/CLAUDE.md`: one component per file with its colocated test file (`ComponentName.test.tsx`), screens only compose components.
- Design tokens from `useTheme()`; styling and UX follow `apple-design` skill.
- Review against the approved frames in `quran-app-screens.html` (`#Settings`, `#MyQuran`, `#EmptyMyQuran`, `#Khatma`) with the approved ADR 0027 difference (no `#SignIn` or account prompts).
- All UI strings in i18n locale files (`ar.json` / `en.json`); no hardcoded text.
- Gates for mobile: `cd apps/mobile && npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`.

