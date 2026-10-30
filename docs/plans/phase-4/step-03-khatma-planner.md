# Step 3 — Khatma Planner & Daily Log Tracker

Spec §15, §11, ADR 0027. Frame `#Khatma` in `quran-app-screens.html`.

## Goal
Build the Khatma planner feature allowing readers to set a Quran reading goal (e.g. 30 days), track daily reading progress, and log daily pages read, all persisted locally in `user.db`.

## Scope
1. **Database Models (`user.db`):**
   - Verify/wire `khatma_plans` (id, title, duration_days, start_date, target_end_date, status, start_page, end_page).
   - Verify/wire `khatma_logs` (id, plan_id, date, pages_read, last_verse_id).
2. **Khatma Screen (`#Khatma`):**
   - Active Khatma card:
     - Title, days elapsed vs total duration.
     - Circular or linear progress meter.
     - Daily target: "اليوم: قراءة ٢٠ صفحة" (e.g., pages 1 to 20).
     - Daily check-in / mark as read button.
   - Historical logs and stats:
     - Streak counter (consecutive days read).
     - Pages read this week / month.
3. **Plan Creation / Reset Sheet:**
   - Choose duration (e.g., 30 days, 60 days, or custom end date).
   - Set start point (e.g., Page 1 or current reading anchor).
   - "Start Khatma" button saves to `user.db` and updates the active plan.
   - Ability to archive/restart an existing plan.
4. **Integration:**
   - Khatma tab inside `MyQuranScreen`.
   - Khatma row in `SettingsScreen` and quick widget on `HomeScreen` (if applicable).

## Deliverables
- Khatma repository and hooks in `apps/mobile/src/features/khatma/`.
- UI components in `apps/mobile/src/features/khatma/components/`.
- Screen at `apps/mobile/src/features/khatma/screens/KhatmaScreen.tsx` and route `apps/mobile/app/khatma.tsx`.
- Colocated tests for components and repositories.
- i18n keys in `ar.json` and `en.json`.

