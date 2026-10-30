# Step 3 — Khatma Planner & Daily Log Tracker

Spec §15, §11, ADR 0027. Frame `#Khatma` in `quran-app-screens.html`.

## Goal
Build the Khatma planner feature allowing readers to set a Quran reading goal (e.g. 30 days), track daily reading progress, and log daily pages read, all persisted locally in `user.db`.

## Decisions (developer, 30 Oct 2026)
- **Schema follows spec §6**, not the earlier column sketch below: `khatma_plans(id, duration_days, start_verse_id, start_date, status, completed_at)` — no title, no target_end_date, no start/end page (end date = start_date + duration_days; pages derive from the start verse's page to 604). `khatma_logs(id, plan_id, date, pages_read, last_verse_id)`. Both carry the standard user.db sync columns.
- **No streak counter.** The `#Khatma` frame's footnote says «لا عدّاد انقطاع» — missed days redistribute, nothing is counted. The weekly/monthly stats below are cut too; the frame shows only the day grid.
- **Progress follows a manual khatma marker, set from an ayah action** (developer, 30 Oct 2026 — supersedes both earlier check-in and reading-bookmark decisions): like the single reading bookmark, the khatma has ONE position marker. The reader moves it manually via a new ayah action «علّمها كموضع الختمة» (visible only while a plan is active). The marker is the furthest `last_verse_id` in the plan's logs — no new column. Each marker move writes/merges today's `khatma_logs` row with the pages delta (`updateKhatmaPosition`, idempotent; backward moves are no-ops so history never shrinks). The success haptic (spec §12) fires when a marker move completes today's target. Active-plan bottom CTA is «تابع القراءة» (→ reader at the marker); editing duration or start point returns the CTA to «حفظ الخطة». The ayah-actions panel gains a row — an approved deviation from its frame.
- **My Quran tab is a summary card**, not the full planner: active plan shows day count + mini progress and taps through to `/khatma`; no plan shows an empty state with «ابدأ ختمة» → `/khatma`.
- **Home widget exists** (corrected 30 Oct 2026 — the `#Main` frame draws it): a daily-wird progress block under the «تابع القراءة» card — «الورد اليومي · ختمة N يومًا» on the right, «X من Y صفحة» (today's logged pages of today's target) + progress bar, tap → `/khatma`. Shown only when a plan is active.
- **No title column** (developer, 30 Oct 2026): the frame's «ختمة رمضان» is a custom name, but the plan name derives from the duration («ختمة ٣٠ يومًا») instead of a user-set title. Schema stays per spec §6.
- Ending a plan: a destructive «إنهاء الختمة» text button under the progress card (same style as «حذف التفسير» in `#Downloads`) marks the plan `abandoned`. Not in the frame — flagged for design review.
- **Marker is visible on the Quran** (developer, 30 Oct 2026): Reading mode draws a gold edge-tick on the marker ayah's row (same geometry as the recited-ayah brand tick, ADR 0012; recitation wins when both apply). Mushaf tints the marker ayah's end-of-ayah glyph gold — decoration only, text stays byte-exact.
- **Mark feedback** (developer, 30 Oct 2026): after «علّمها كموضع الختمة» a transient pill «تم تحديث موضع الختمة» slides up over the reader and auto-dismisses (ResumePill language; fade under Reduce Motion), alongside the spec §12 haptic.
- **Tile label shortened** (developer, 30 Oct 2026, HIG `buttons.md › Content` — short labels, no truncation): the ayah-action tile reads «موضع الختمة» / "Khatma position", not «علّمها كموضع الختمة».

## Scope
1. **Database Models (`user.db`):**
   - Add `khatma_plans` and `khatma_logs` to `src/core/db/user/schema.ts` per the decision above; generate migration with `npm run db:generate:user`.
2. **Khatma Screen (`#Khatma`), one screen for setup and progress:**
   - Duration segmented control (٧ / ١٥ / ٣٠ / ٦٠ days).
   - Daily wird card: pages per day = ceil(remaining pages / remaining days), recomputed daily (missed days redistribute — the frame's footnote).
   - Start radios: «من حيث توقفت» (last-read verse from `useLastReadVerseKey`) / «من بداية المصحف».
   - Progress card: «التقدّم», «اليوم N», day grid (one cell per plan day: filled = logged, thick outline = today, empty = future).
   - Bottom CTA per the check-in decision above; «إنهاء الختمة» under the progress card when a plan is active.
3. **Integration:**
   - Khatma tab inside `MyQuranScreen` (summary card per the decision above; un-disable the segment in `MyQuranTabs`).
   - `HabitsSection` row in `SettingsScreen`: value = active plan's duration, tap → `/khatma`.
   - Route `app/khatma.tsx`; success haptic on check-in (spec §12).

## Deliverables
- Khatma repository and hooks in `apps/mobile/src/features/khatma/`.
- UI components in `apps/mobile/src/features/khatma/components/`.
- Screen at `apps/mobile/src/features/khatma/screens/KhatmaScreen.tsx` and route `apps/mobile/app/khatma.tsx`.
- Colocated tests for components and repositories.
- i18n keys in `ar.json` and `en.json`.

