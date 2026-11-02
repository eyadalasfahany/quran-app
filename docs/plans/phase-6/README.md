# Phase 6 step briefs

One file per step of [`../phase-6.md`](../phase-6.md). The reviewer checks the diff against ADR 0031, the spec and the frames; the developer commits.

| Step | Brief | Status |
| --- | --- | --- |
| A | [source-research.md](source-research.md) | Done (31 Oct 2026) |
| 1 | ADR 0031, spec, content plan, plan | Done (31 Oct 2026) |
| 2 | [step-02-schema.md](step-02-schema.md) | |
| 3 | [step-03-ingestion.md](step-03-ingestion.md) | |
| 4 | [step-04-frames.md](step-04-frames.md) | |
| 5 | [step-05-mobile-data.md](step-05-mobile-data.md) | |
| 6 | [step-06-mobile-ui.md](step-06-mobile-ui.md) | |
| 7 | [step-07-reminders.md](step-07-reminders.md) | |
| 8 | [step-08-audio-rights.md](step-08-audio-rights.md) | |
| 9 | [step-09-dorar-adapter.md](step-09-dorar-adapter.md) | |

## Rules for every step
- ADR 0031 wins over any brief. **Never write religious text.** Tests and development fixtures use placeholder strings such as «نص تجريبي ١ — ليس ذكرًا» / `FIXTURE text 1 — not a dhikr`, with source `taybah-dev-fixture`.
- `apps/mobile/CLAUDE.md` and `apps/api/CLAUDE.md` apply in full: one component per file with its colocated test, tokens via `useTheme()`, i18n for every string, `laravel-standards` for API code.
- Don't commit. Don't add dependencies.

## Environment on the developer's Windows machine (31 Oct 2026)
- **Node 26:** prefix commands with `export PATH="/c/Users/Asus/AppData/Roaming/nvm/v26.13.0:$PATH"` (the system Node is 24).
- **PHP 8.5:** `/c/laragon/bin/php/php-8.5.12-Win32-vs17-x64/php.exe`; Composer is `/c/composer/composer.phar`. For `npm run generate -w @quran/api-contract`, put that PHP folder first on `PATH`.
- **MySQL:** Laragon MySQL 8.0 on 127.0.0.1:3306, user `quran` / `quran`, test DB `quran_testing`.
- **Known Windows-only Pest failures on the baseline (9), not to be "fixed":** `PingQuranFoundationCommandTest` (CRLF, 2), `HealthRepositoriesReachableTest` (no Redis, 2), `PackBuilderTest` (temp-file locks and a POSIX-permission test, 5).
- **Mobile gates:** `npm run lint && npx tsc --noEmit && npx jest <paths>`. The `hide-scroll-indicators` and `router.test.tsx` baseline failures are fixed on this branch.
- **Android emulator** (`emulator-5554`, API 37, x86_64). SDK at `$LOCALAPPDATA/Android/Sdk`; export `ANDROID_HOME` to it and put `platform-tools` on `PATH`.
  - **Dev client:** `cd apps/mobile && npx expo run:android`. Afterwards, `npx expo start --dev-client` **from `apps/mobile`**. Starting Metro from the repo root, or opening the app in Expo Go, fails with `Unable to resolve ../../App`; the app needs the dev client because MMKV and Nitro are native.
  - **Env:** `apps/mobile/.env` (gitignored) sets `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000`. (The development fixtures flag was removed on 2 Nov 2026, ADR 0042: the app loads no placeholder content.)
  - **Screenshot:** `adb exec-out screencap -p > <scratchpad>/shot.png`. Save it in the scratchpad, never the repo. Compare with `frame-shot.py <frame-id>`.
  - **Drive the UI:** `adb shell input tap X Y`, `adb shell input swipe …`, `adb shell am start -a android.intent.action.VIEW -d "<scheme>://azkar"` for deep links.
  - The iPhone 17 check required by `CLAUDE.md` still needs the developer's Mac. The emulator review is the Android half.
- **Agents:** `.claude/agents/` defines `taybah-planner`, `taybah-tasks`, `taybah-implementer`, `taybah-tests`, `taybah-code-reviewer`, `taybah-feature-reviewer`, `taybah-bug-fixer` and `taybah-enhancer`. Their models follow the delegation rule: Haiku implements, a stronger model plans and reviews.
