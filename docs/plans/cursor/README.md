# Cursor Composer prompts — post-Phase-6 work (08 to 16)

Developer decision (2 Nov 2026): **Cursor implements; Claude agents only plan, review and test.** Run one prompt per Composer session: paste the file or `@`-mention it and say "do this". Then tell Claude "prompt N done"; Claude reviews the diff against the prompt, the ADRs and the frames, runs the gates and checks the emulator before you commit.

Prompts 01 to 07 are in `docs/plans/phase-6/cursor/`. The tree is `main` plus about 226 uncommitted files from several half-finished tasks (inspected 2 Nov 2026, HEAD `8d982cd`). Each prompt says what is already done, so Cursor resumes rather than redoes.

## Run order

| Order | Prompt | Depends on | Status at inspection | Delivers |
| :---: | --- | --- | --- | --- |
| 1 | [14-adr-renumbering.md](14-adr-renumbering.md) | developer confirms the numbers | not started; **blocked**: upstream took 0044 | ADR files renamed, references fixed |
| 2 | [08-rtl-i18n-audit-fixes.md](08-rtl-i18n-audit-fixes.md) | — | about 60% done | RTL/i18n audit fixes, green mobile gates |
| 3 | [09-api-step14-and-switches.md](09-api-step14-and-switches.md) | 14 | code about 90% done; docs and local run left | step 14 closed, switches gone, Hadith switch docs |
| 4 | [10-widgets-android.md](10-widgets-android.md) | 08 | widgets and snapshot built; Settings, docs, build left | Android widgets end to end |
| 5 | [11-hijri-and-moon.md](11-hijri-and-moon.md) | 14 | frames only | Hijri calendar, adjustment, occasions, moon sighting |
| 6 | [12-reminders-follow-ups.md](12-reminders-follow-ups.md) | 10, 11 | hub built; frames, tests and fixes left | reminders hub finished, Hijri reminders |
| 7 | [13-azkar-player-follow-ups.md](13-azkar-player-follow-ups.md) | 14 | player built; ADR, drag, frame left | player ADR, seek drag, frame match |
| 8 | [15-wear-os.md](15-wear-os.md) | 10 | not started; **Gradle deps need approval** | Wear OS app and tile |
| 9 | [16-apple-widgets-and-watch.md](16-apple-widgets-and-watch.md) | 10 | not started; not buildable on Windows | iOS widgets and watchOS code |

### Duas (prompts 17 and up; ADR 0046 accepted, "Developer decisions (2 Nov 2026)")

The tasks are already Cursor-ready in [`docs/plans/duas.md`](../duas.md) («Tasks», 1a to 9). There are no separate prompt files: for each session, paste this README's rules plus the named task sections from the plan. Task 0 (accept ADR 0046 and make the spec and content-plan edits) and task 6 (frames) are the developer's and come first. Release order follows decision 21: hadith books, Hisn by topic and «أدعيتي» first, then the Quranic part, then the Prophetic part. All of Duas depends on **prompt 09**, which provides the pinned snapshot mechanism in `release.sh`, and on **prompt 14**, which settles the ADR numbers. The hadith-books part also depends on **Phase 7** (steps 4, 6 and 13 on `ft/hadith`, which is not in this tree).

| Order | Session | Plan tasks | Depends on | Ships |
| :---: | --- | --- | --- | --- |
| 10 | 17 — Duas schema and pack | 2a, 2b, 2c | 09, 14, task 0 | `duas` tables, pack group, contract, `content.db` install |
| 11 | 18 — «أدعيتي» and Hisn by topic | 5b, 5c, 7a, 7b, 7f | 17, 12 (reminders hub), task 6 frames | Release 1 (part) |
| 12 | 19 — Hadith books | 1b, 1d, 7e | 17, **Phase 7 steps 4, 6 and 13 (blocked here)** | Release 1 (part) |
| 13 | 20 — Quranic generator and import | 1a, 3a (Quranic part), 3b | 17; then **task 4** (the developer reviews every candidate) | Release 2, API |
| 14 | 21 — Quranic UI, Menu and Home, search, share | 5a, 7c, 7g, 8a, 8b | 20 and task 4's `reviewed` rows | Release 2, app |
| 15 | 22 — Prophetic | 1c, 3a (Prophetic part), 7d, plus the grade note in `0042-hadith-collections-source.md` (decision 7) | 19, 20 | Release 3 |
| 16 | 23 — Duas exit check | 9 | all | — |

If a session is too large for one Composer run, run one task per session in the order listed.

Prompt 14 goes first because it is documentation only and every later prompt cites the ADR numbers it settles. Prompts 08 and 11 both edit `ar.json`/`en.json`. Prompts 10 and 12 both edit `app.config.ts` and Settings. Run them in this order, not in parallel.

## Shared rules (every prompt includes them by reference)

- **Read first:** `CLAUDE.md`, `apps/mobile/CLAUDE.md` or `apps/api/CLAUDE.md`, `.claude/agent-rules.md`, and `docs/plans/phase-6/README.md` (environment).
- **No feature switches** (ADR "features enabled by default", renumbered by prompt 14; memory rule of 2 Nov 2026). Do not add an env, config or code switch, an import flag or a dev-fixture flag. Keep only user preferences, data-availability checks, platform-capability checks and correctness rules: pinned checksums, reviewed-only Quran map rows in production, validation, `excluded_entries`. Rollback is a code revert or a data migration. Tests control their inputs and never disable config.
- **One design line.** Reuse tokens (`useTheme()`), `src/shared/ui` components and the layout of an existing screen (Settings, Azkar, Salah, Player). A new screen names the screen it mirrors. No look-alike component.
- **Frames before code (ADR 0010).** UI matches its `gx-fig` frame in `quran-app-screens.html`. If no frame exists, draw it there from existing tokens and stop for approval before coding that UI.
- **RTL.** React Native swaps `left`/`right` (and `paddingLeft`/`marginRight`) in RTL. Use `start`/`end` for spacing. For absolute geometry, use a `translateX` from a `left: 0` anchor with the RTL correction (`src/features/salah/data/dial-placement.ts`, `dialTranslateX`). Play glyphs never flip (ADR 0029). Progress, times and next/previous follow the layout direction.
- **Strings.** Every UI string goes in both `src/core/i18n/locales/ar.json` and `en.json`. Re-read both files right before each edit, because other prompts change them. `__tests__/i18n.test.tsx` requires identical leaf keys: an Arabic plural key with `_zero/_one/_two/_few/_many/_other` needs the same six suffixes in English.
- **Components.** One component per file in `src/shared/ui/` or `src/features/<f>/components/`, each with a colocated `*.test.tsx` covering render, variants, interaction, Arabic and English (RTL), and role and label. Screens only compose components.
- **No religious text authored.** No Quran, dhikr, dua, hadith, virtue, ruling or grading text, even in fixtures. Use placeholders («نص تجريبي ١ — ليس ذكرًا», `FIXTURE text 1 — not a dhikr`). Quran text comes only from `content.db`.
- **Salah** stays unchanged except where a prompt says so (approved: the Qibla work already in the tree, and the Hijri header in prompt 12).
- **Dependencies** only where a prompt names them: `npx expo install <pkg>` from `apps/mobile`, a row in `docs/content-plan.md`'s version table, then `node .github/scripts/npm-audit.mjs`.
- **Don't commit, push or switch branches.** Don't touch `apps/mobile/android/` by hand (prebuild output).
- **Metro** is the developer's, on port 8081. Don't start another one. Builds use `--no-bundler`.

## Environment and gates

- Node 26: `export PATH="/c/Users/Asus/AppData/Roaming/nvm/v26.13.0:$PATH"` (PowerShell: `$env:Path = "C:\Users\Asus\AppData\Roaming\nvm\v26.13.0;$env:Path"`).
- PHP 8.5: `/c/laragon/bin/php/php-8.5.12-Win32-vs17-x64/php.exe`; Composer `/c/composer/composer.phar`. Put the PHP folder first on `PATH` for `npm run generate -w @quran/api-contract`.
- Android: `ANDROID_HOME=C:\Users\Asus\AppData\Local\Android\Sdk`, `platform-tools` on `PATH`, emulator `emulator-5554`. The API on the LAN is `http://192.168.1.20:8000`.
- **Mobile gates** (from `apps/mobile`): `npm run lint` (0 errors), `npx tsc --noEmit` (0), `npx jest <paths named in the prompt>`, plus the full `npx jest` before "done".
- **API gates** (from `apps/api`): `php vendor/bin/pint --test`, `php -d memory_limit=2G vendor/bin/phpstan analyse`, `php vendor/bin/pest`. Known Windows-only failures, not to be fixed: `PingQuranFoundationCommandTest` (CRLF, 2), `HealthRepositoriesReachableTest` (no Redis, 2), `PackBuilderTest` (POSIX permissions and file locks).
- **Contract** (any endpoint change): `npm run generate -w @quran/api-contract`.

## Logo rule (developer, 2 Nov 2026)
- The app logo is `image (93).png`, identical to `docs/branding/taybah-nabawi-logo.png` and root `logo.png`. Never change it, redraw it or substitute another (no Kaaba / concept marks in shipping surfaces).
- Every logo asset is generated from it by `apps/mobile/scripts/generate-brand-assets.mjs` (`npm run assets:brand -w @quran/mobile`): icon, adaptive foreground/monochrome, splash logo and posters, splash icon, notification icon, widget/watch icons, Play feature graphic, website logo/favicons, and root `logo.png`. New surfaces must use those generated files or add an output to that script, from the same source.
- Don't hand-edit files under `apps/mobile/assets/images/`, `docs/branding/` (generated PNGs), or `website/assets/images/`.
