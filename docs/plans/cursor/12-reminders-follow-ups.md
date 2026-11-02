# Prompt 12 — Reminders hub follow-ups and Hijri occasion reminders (after 10 and 11)

Monorepo `D:\projects\quran-app`, `apps/mobile`. Follow @docs/plans/cursor/README.md. Read first: @apps/mobile/CLAUDE.md @.claude/agent-rules.md @docs/adr/0034-home-azkar-sibha-daily-progress.md @apps/mobile/src/features/reminders @apps/mobile/src/features/notifications (`budget.ts`, `channels.ts`, `reminder-service.ts`, `reminder-deeplink.ts`, `permission.ts`) and the H5 brief in @docs/plans/names-hijri-moon.md. **Salah may change only in step 6 below** (developer-approved).

**Already done (don't redo):**
- `app/reminders.tsx` and `app/reminders/recommended.tsx` (a sheet), with their screens `RemindersScreen.tsx` and `RecommendedRemindersScreen.tsx`.
- 11 components with tests: Friday, Misbaha, Recommended item and content, ClockRow, Limit and Permission dialogs, Row, EntryRow, Intro, TestReminderButton.
- `data/*`, each with tests.
- `useReminderGoalsSync` mounted in `app/_layout.tsx`.
- The Settings hub row and the Menu card «التذكيرات».
- `budget.ts`: `AZKAR_SLOTS` = 64 − 1 − 40 − 1 − 1 = 21.
- Prompt 10 added `SCHEDULE_EXACT_ALARM`.

**Remaining work:**
1. **Frames first.** In `quran-app-screens.html`, draw `RemindersHub`, `RemindersHubDark` and `RemindersRecommended` from the built screens (they mirror the Settings layout: `SettingsHeader`, `SettingsGroup`, `ListRow`). Include the new exact-alarm row (item 3) and the Hijri occasions group (item 5). **Stop for the developer's approval**, then make the built UI match.
2. **Screen tests:** add `RemindersScreen.test.tsx` and `RecommendedRemindersScreen.test.tsx`. Cover:
   - which sections render with and without Azkar content, a location and a Khatma plan;
   - the permission-denied dialog;
   - the limit dialog when the budget is full;
   - the recommended prompt, accepted and dismissed;
   - Arabic and English, and the labels.
3. **Exact alarms (Android 12+).** Add `src/features/notifications/exact-alarm.ts` with `canScheduleExact(): Promise<boolean>` (`getExactAlarmPermissionsAsync`; true on iOS and below Android 12) and `requestExact(): Promise<boolean>` (`requestExactAlarmPermissionsAsync`). Add the component `ExactAlarmRow` («تنبيهات في وقتها الدقيق» / "Exact-time alerts", with a hint). It shows in the hub only when exact alarms are not granted, and the request opens the system page. Re-check on foreground (AppState). Tests mock both functions.
4. **Remove the `__DEV__` button:**
   - In `TestReminderButton.tsx`, delete the second button, the `sentLate` outcome and the `delaySeconds` parameter of `sendTestReminder`.
   - Delete the `reminders.test.devAction` and `devSent` keys from both locales.
   - Update both tests.
5. **Stale daily-reminder body.** `reminder-service.ts` computes «وردك اليوم: N صفحات» once per schedule. Add `useDailyReminderSync(ready)` in `src/features/notifications/` and mount it in `app/_layout.tsx` next to `useReminderGoalsSync`. It calls `syncDailyReminder()` (debounced 500 ms) when the active plan (`useActivePlan`), its logs (`usePlanLogs`) or the local day changes, and on foreground. Remove the one-off call at `app/_layout.tsx:96` if the hook covers launch. Tests: a new log re-plans with the new body, and no plan gives the generic body.
6. **Salah header:** in `src/features/salah/screens/SalahScreen.tsx:26`, import `useHijriDate` from `@/features/hijri/hooks/useHijriDate` (prompt 11) instead of `../hooks`. Delete `useHijriDate` from `src/features/salah/hooks/index.ts:162` if nothing else uses it. Update the Salah screen test for a +1 adjustment. Nothing else in Salah changes.
7. **Hijri occasion reminders (H5, developer decision 4):**
   - `budget.ts`: add `HIJRI_REMINDER_SLOTS = 6` and subtract it in `AZKAR_SLOTS`, which becomes 15. Update `budget.test.ts` and `src/features/azkar/reminders/budget-plan.test.ts`.
   - `src/features/hijri/reminders/`: one DATE trigger per enabled occasion (its next occurrence, adjustment applied) at a user-chosen time. They are off by default and the user turns them on, or accepts them in the recommended set.
   - Android channel `occasions` in `channels.ts`, with its name key in i18n.
   - Add `/hijri` to `REMINDER_ROUTE_PREFIXES`.
   - Resync on launch, on foreground when the day, time zone or adjustment changed, and on any edit.
   - Ask for permission only when one is turned on. Clear-data cancels them.
   - Hub group «المناسبات الهجرية» uses `ReminderRow`, and `recommended-items.ts` gains the occasions item.
   - Tests: off by default schedules nothing; the adjustment moves the fire date; a full budget shows `ReminderLimitDialog` and never drops silently; `/hijrix` is ignored; permission denied; clear-data.

**Acceptance:** frames approved and matched; the hub shows the exact-alarm row only when needed; no `__DEV__` UI; the daily body follows today's target; Salah's diff is only the import and the test; budget total ≤ 64 (`IOS_PENDING_LIMIT`).

**Gates:** `npx jest src/features/reminders src/features/notifications src/features/azkar/reminders src/features/hijri src/features/salah/screens`, then the full suite; `lint` and `tsc` at 0.

**Emulator (`emulator-5554`, app built by prompt 10):**
1. In the hub, tap «إرسال تذكير تجريبي» and lock the screen. It shows as a **heads-up** on the `goals` channel (screenshot it).
2. Revoke exact alarms (`adb shell appops set com.taybahapp.taybah.dev SCHEDULE_EXACT_ALARM deny`, using the dev package from `app.config.ts`). The row appears, and the request opens the system page.
3. Set the daily reminder 2 minutes ahead, then `adb shell am force-stop <package>`. It fires in the background. Tapping it opens `/read/<key>`.
4. Turn on one occasion reminder, move the emulator date to the day before (`adb shell date`; root image needed, otherwise use `adb shell cmd alarm` and report it), and confirm that it fires and opens `/hijri`.
