# Prompt 4 — Azkar reminders (step 7)

You are working in the Taybah monorepo, Expo app `apps/mobile`, branch `ft/azkar`. Don't commit, add dependencies, or edit `apps/mobile/android/`, `src/features/salah/**` or `app/(main)/(salah)/**`. Prayer times are **read** through `src/features/salah/data/prayer-times.ts`; import from it, never change it.

**Read first:** @AGENTS.md @apps/mobile/CLAUDE.md @.claude/agent-rules.md @docs/adr/0031-azkar.md (§7) @docs/plans/phase-6/step-07-reminders.md (implement it exactly) @apps/mobile/src/features/notifications/reminder-service.ts @apps/mobile/src/features/notifications/reminder-deeplink.ts @apps/mobile/src/features/settings/components/DailyReminderRow.tsx.

**Key rules from the brief:**
- **Extend the existing notification layer; no second system:**
  - the deep-link allowlist becomes `['/read/', '/azkar/']`
  - a shared `channels.ts`
  - a shared `budget.ts` (`AZKAR_ROLLING_DAYS = 4`, `IOS_PENDING_LIMIT = 64`)
- **Reminders are user preferences, never religious timing:**
  - nothing is enabled by default
  - no recommended time
  - the disclaimer «وقت التذكير من اختيارك، وليس وقتًا محددًا للذكر» is always visible in the sheet
- **Triggers:**
  - clock → one repeating trigger (Android `DAILY` on the `azkar` channel, iOS `CALENDAR`)
  - prayer-relative → a rolling 4-day list of `DATE` triggers from `timesFor(day, coords)[prayer] + offset`
  - cancel stored ids before rescheduling
- **Resync:**
  - on app start (next to `syncDailyReminder` in `app/_layout.tsx`)
  - on returning to the foreground when the date, time zone or coordinates changed
  - after any reminder edit
  - Location changes made on the Salah screen can't be hooked without editing Salah; the foreground check (coordinates key) covers them. Note this in your report.
- **Permission:** requested only when a toggle turns on. If denied, the toggle reverts and the same alert pattern as `DailyReminderRow` appears.
- **UI:**
  - `app/azkar/reminders.tsx` as a sheet (`sheetScreenOptions`)
  - components `AzkarReminderRow`, `ReminderTriggerPicker`, `PrayerOffsetPicker`, `ReminderDisclaimer`; reuse `ReminderTimeSheet`
  - show the reminders button on the Azkar home header and the bell on the category header
  - a «تذكير الأذكار» row in Settings `HabitsSection`, only when Azkar content exists
  - frames: `AzkarReminders`, `AzkarRemindersDenied`

**Tests** (from the brief):
- fire-date math, including the DST date `Europe/London` 2026-10-25 and the no-coordinates case
- no duplicates across two syncs
- the resync conditions
- the deep-link allowlist
- the budget
- components, including the permission-denied revert

**Gates** (Node 26, `apps/mobile`): `npm run lint`, `npx tsc --noEmit` (0), `npx jest src/features/azkar src/features/notifications src/features/settings __tests__`.

**Report:** files, test counts, gates, and the Salah no-change confirmation (`git diff --stat -- apps/mobile/src/features/salah` is empty).
