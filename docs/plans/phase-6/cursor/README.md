# Cursor Composer prompts — Phase 6 (Azkar) and ADR 0032 (menu tab)

Run these **in order**, one Composer session each, on branch `ft/azkar`. Paste the whole prompt file into Composer, or `@`-mention the file and say "do this".

After each prompt, tell Claude "prompt N done". Claude then reviews the diff against the briefs, ADRs and frames, runs the gates, and checks the app on the Android emulator before you commit.

| # | Prompt | Depends on | Delivers |
| --- | --- | --- | --- |
| 1 | [01-finish-azkar-reader.md](01-finish-azkar-reader.md) | — | Step 6a: reader, counter, details, green gates |
| 2 | [02-azkar-browse.md](02-azkar-browse.md) | 1 | Step 6b: Azkar home, category, search, favourites, Home tile |
| 3 | [03-menu-tab.md](03-menu-tab.md) | 2 | ADR 0032: القائمة tab and menu screen (Salah unchanged) |
| 4 | [04-azkar-reminders.md](04-azkar-reminders.md) | 2 | Step 7: category reminders (clock and prayer-relative) |
| 5 | [05-azkar-audio-states.md](05-azkar-audio-states.md) | 1 | Step 8: audio rights model and UI states (no OpenDua audio) |

## Rules every prompt includes
- Read `AGENTS.md`, `apps/mobile/CLAUDE.md`, `.claude/agent-rules.md` and `docs/plans/phase-6/README.md` (environment) first.
- **Never write religious text** (dhikr, dua, Quran, hadith, virtue, explanation). Use placeholders only. A field without a verified source stays null and its UI section is hidden (ADR 0031).
- **The Salah feature must not change.** No edits to `src/features/salah/**` or `app/(main)/(salah)/**` (developer, 1 Nov 2026).
- One component per file in `src/features/<feature>/components/`, each with a colocated `*.test.tsx`. Screens only compose components. Tokens via `useTheme()`. Every string in `ar.json` and `en.json`.
- Don't commit, don't add dependencies, and don't touch `apps/mobile/android/`.
- **Gates** (Node 26: `$env:Path = "C:\Users\Asus\AppData\Roaming\nvm\v26.13.0;$env:Path"`), from `apps/mobile`: `npm run lint` (0 errors), `npx tsc --noEmit` (0 errors), `npx jest` on the paths named in the prompt.
