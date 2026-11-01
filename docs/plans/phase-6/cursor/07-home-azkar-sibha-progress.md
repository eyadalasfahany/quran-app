# Prompt 7 — Home Azkar sections, next prayer, misbaha, today's progress (ADR 0034)

You are working in the Taybah monorepo, Expo app `apps/mobile`, branch `ft/azkar`. Don't commit, add dependencies, or edit `apps/mobile/android/`, `src/features/salah/**` or `app/(main)/(salah)/**`. Prayer data is read through the existing Salah hooks and `prayer-times.ts`; import them, never edit them.

**Read first:** @.claude/agent-rules.md @apps/mobile/CLAUDE.md @docs/adr/0034-home-azkar-sibha-daily-progress.md (accepted) @docs/adr/0017-home-tiles-follow-features.md @apps/mobile/src/features/home/screens/HomeScreen.tsx @apps/mobile/src/features/menu (reuse its hours-and-minutes formatter and continue-Azkar logic; move shared pieces to a neutral place rather than duplicating them).

**Frames (approved):** `HomeAzkar` (top), `HomeAzkarLower` (middle), `HomeAzkarRecent` (end), `HomeAzkarDark`, `HomeAzkarLowerDark`, `HomeAzkarEnglish`, `HomeNextPrayerNoLocation`, `HomeDailyProgressEmpty`, `Sibha`, `SibhaDark`, `DailyGoalsSheet`. Render them with `frame-shot.py` and match them.

**Home, top to bottom:**
1. «تابع القراءة» (existing, green).
2. **`NextPrayerCard`** (surface): the next prayer's name, time, and «بعد ساعتين و٥ دقائق» via the shared formatter. Pushes `/salah`. Without a location: «حدّد موقعك لعرض مواقيت الصلاة».
3. **`ContinueAzkarHomeCard`** (surface, not green): resumes the reader at the first incomplete unit (same target as the menu's continue card). Hidden when there is nothing to continue.
4. **`DailyProgressCard`**:
   - a ring for today's total plus one row per goal the user chose
   - goals: the wird (pages today from the active Khatma plan), tracked Azkar sessions (done for their current period), the misbaha daily target
   - «تعديل» opens the `DailyGoalsSheet`
   - empty state «حدّد أهدافك اليومية» when nothing is chosen
5. **Tiles:** السور، الأذكار، **المسبحة** (→ `/sibha`)، المحفوظات، القرّاء. A horizontally scrolling row if five don't fit (follow the frame).
6. **«أذكار مختارة»:** the session categories with today's progress, horizontally scrolling, plus an «عرض الكل» button → `/azkar`.
7. **«آخر الأذكار»:** recently opened Azkar.
   - Record history (MMKV, cap 10) when the reader opens a scope.
   - Rows open the reader where you left off.
   - Hidden when empty.
8. «آخر ما استمعت إليه» (existing).

All Azkar parts are hidden when `useAzkarAvailable()` is false.

**Misbaha** (`src/features/sibha/`, route `app/sibha.tsx`):
- full-screen tap-anywhere counter (same rules as the Azkar reader: buttons excluded, the surface hidden from screen readers, a counter button with value)
- target chips 33 / 99 / 100 / custom (a number input sheet), and a ring toward the target
- haptic per count, success haptic at the target, counting continues after it
- reset with a confirmation `Alert`
- optional label the user types; **no preset phrases**
- persisted in MMKV: count, target, label, and today's total by local date (for the goal)
- added to clear-data

**Daily goals** (`DailyGoalsSheet`, route `app/daily-goals.tsx` as a sheet):
- toggles: wird (only with an active plan), each session category, misbaha target (stepper)
- stored in MMKV; nothing enabled by default
- add the keys to `storageKeys` and to clear-data

**Tests:** every component (render, states, press, Arabic and English, accessibility); progress math (empty, partial, all done, period rollover); misbaha (count, target, reset confirm, persistence, day rollover); history cap and order; the next-prayer card with and without a location (mock location only, use the real formatter); Home section visibility with and without Azkar content or a Khatma plan.

**Gates** (Node 26, `apps/mobile`): `npm run lint`, `npx tsc --noEmit` (0), `npx jest src/features/home src/features/sibha src/features/azkar src/features/menu __tests__`. Confirm the Salah `git diff` is empty.
