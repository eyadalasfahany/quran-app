# Phase 4 — My Quran, Khatma and Settings (Local-Only)

Spec §15 & ADR 0027. **Exit criterion:**
- Settings screen allows switching language (Arabic / English), reading/audio preferences, and local data reset.
- My Quran tab displays local bookmarks, highlights, notes, and active Khatma with empty states.
- Khatma planner creates a reading plan and records daily reading progress locally in `user.db`.
- Local notification schedules a daily reading reminder at the selected time.
- All personal data persists offline across app restarts without any remote account or login requirement.
- Visual conformance verified on the iPhone 17 simulator against `#Settings`, `#MyQuran`, `#EmptyMyQuran`, and `#Khatma`.

**Design sources** (ADR 0010, 0012, 0027):
- Frames in `quran-app-screens.html`:
  - `Settings`: `#Settings` (adjusted: no `#SignIn` row, language switcher added, clear local data instead of delete account).
  - `My Quran`: `#MyQuran` and `#EmptyMyQuran` (adjusted: no `#SignIn` promo banner).
  - `Khatma`: `#Khatma` (planner and daily log progress).
  - `Sources`: `#Settings` sources link -> `SourcesScreen`.

**Rules:**
- All component and styling rules from previous phases apply (`apps/mobile/CLAUDE.md`, `apple-design` skill, tokens through `useTheme()`).
- One component per file with its colocated test. Screens only compose components.
- Arabic first, RTL by default; English fully supported through language switch.
- Implementation by subagents; small focused briefs.

---

## Decisions (ADR 0027)

| # | Question | Decision |
| :--- | :--- | :--- |
| **D1** | Remote accounts & authentication | **Removed.** No login, sign-in screens (`SignIn`, `VerifyCode`, `Account`, `DeleteAccount`), or backend auth endpoints. |
| **D2** | Cloud sync | **Removed.** No remote push/pull endpoints or outbox network transmission. All data stays local in `user.db`. |
| **D3** | Language selection | Placed directly in the **Settings** screen under a "General" / "العام" section; switches app locale (`ar` / `en`) and layout direction. |
| **D4** | Data lifecycle & privacy | User can reset/clear local data directly from Settings via a confirmation alert that wipes `user.db`. |

---

## Steps

| # | Step | Description | Dependencies |
| :---: | :--- | :--- | :---: |
| **1** | **Settings screen** | `SettingsScreen` matching frame `#Settings` (without sign-in row): Language selector (`ar` / `en`), Quran & reading preferences, audio preferences, reminders toggle, about link, and local data reset action. | — |
| **2** | **My Quran library** | `MyQuranScreen` matching frames `#MyQuran` & `#EmptyMyQuran` (without sign-in banner): segmented tabs for Bookmarks, Highlights, Notes, and Khatma over `user.db`; tap-to-ayah navigation, swipe/action delete. | Step 1 |
| **3** | **Khatma planner** | `KhatmaScreen` matching frame `#Khatma`: active plan card, daily reading target & progress gauge, logging pages read, and new plan creation sheet. | Step 2 |
| **4** | **Local daily reminders** | `expo-notifications` local scheduled notification: configurable daily reminder time, toggle in Settings, deep link to reading anchor on tap. | Step 1 |
| **5** | **Phase 4 exit check** | iPhone 17 simulator verification: language switch, offline persistence, Khatma tracking, notifications, visual review against frames. | Steps 1–4 |

---

## Step briefs in `docs/plans/phase-4/`

- `step-01-settings-screen.md`
- `step-02-my-quran-library.md`
- `step-03-khatma-planner.md`
- `step-04-local-reminders.md`
- `step-05-exit-check.md`

