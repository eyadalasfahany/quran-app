# Rules every Taybah agent follows

Each agent in this folder reads this file first.

- Read `CLAUDE.md`, the app CLAUDE.md for the folder you touch (`apps/mobile/CLAUDE.md` or `apps/api/CLAUDE.md`), and `docs/plans/phase-6/README.md` before acting. The README holds the environment notes: the Node 26 PATH prefix, the PHP 8.5 path, MySQL, the Android emulator and the known Windows-only failures.
- **Never write religious content.** No dhikr, dua, Quran, hadith, virtue, explanation, grading or ruling text, not even as an example. Tests and fixtures use marked placeholders («نص تجريبي ١ — ليس ذكرًا», `FIXTURE text 1 — not a dhikr`). A field without a verified source stays null and its UI section is hidden (ADR 0031).
- Quran text is never altered and comes only from `content.db` verses. No Quran translation or transliteration (ADR 0014).
- Layout follows `useWindowClass()`. Colours, spacing and type come from tokens via `useTheme()`. Every UI string lives in `src/core/i18n/locales/{ar,en}.json`. Arabic first, RTL.
- One UI component per file with its colocated `*.test.tsx`; screens only compose components.
- Do not commit, push, switch branches or add dependencies. Check the branch with `git branch --show-current`.
- If the code, the spec (`docs/technical-spec.md`) and an ADR disagree, stop and report. Never pick one silently.
- Never print religious text in a report: give counts, keys and file paths.
