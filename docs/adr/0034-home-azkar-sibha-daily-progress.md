# 0034 — Home gains Azkar sections, a misbaha, and today's progress

Date: 2026-11-01 · Status: accepted (developer, 1 Nov 2026: `Sibha`, `SibhaDark` and `DailyGoalsSheet` approved as drawn; Home approved with the continue-card rule below) · Amends ADR 0017 (Home tiles), ADR 0031 §6 (repetition) and §10 (placement)

## Context

The developer asked (1 Nov 2026) for Home to give Azkar the same weight as reading, and for daily habits to be visible in one place.

## Decision

1. **«تابع الأذكار» card** on Home. «تابع القراءة» stays the only green brand card. «تابع الأذكار» is a lighter **surface** card (hairline, an Amiri title, a brand/gold progress bar) so two heavy green cards never stack (developer, 1 Nov 2026). It resumes the reader at the first incomplete unit of the last active scope. It is hidden when there is nothing to continue or no Azkar content.
2. **«أذكار مختارة» section** with an «عرض الكل» button that opens `/azkar`. Its cards are the Azkar **session categories** (الصباح، المساء، بعد الصلاة، النوم، الاستيقاظ) with today's progress. They are chosen from the data; there is no editorial pick of religious content.
3. **«آخر الأذكار» section:** the last Azkar entries or categories opened (local history in MMKV, capped at 10), styled like «آخر ما استمعت إليه». It is hidden when empty.
4. **«المسبحة» (misbaha):**
   - a Home tile opening `/sibha`: a full-screen tap-anywhere counter
   - a large count, an optional target (33, 99, 100 or custom) with a ring, reset with confirmation, and haptics on each count and at the target
   - an optional label the user types
   - **No preset dhikr phrases are supplied.** That would be unsourced religious text (ADR 0031).
   - It is the user's own free tally, so ADR 0031 §6's "no open-ended tally" rule, which applies to sourced dhikr, does not apply.
   - Count, target and label persist locally (MMKV), and a daily total feeds today's progress.
5. **«تقدّم اليوم» card:** one ring for today's activities the user has set up, with a row per activity:
   - the Khatma wird (pages today, when a plan is active)
   - each Azkar session the user chose to track (done or not for its period)
   - the misbaha daily target, if set

   A «أهدافي اليومية» sheet chooses them; the choice is stored in MMKV. Without a setup, the card shows a short prompt to set goals. Nothing is tracked by default.
6. **«الصلاة القادمة» card** (developer, 1 Nov 2026), under «تابع القراءة». It shows the next prayer's name, time and time remaining («بعد ساعتين و٥ دقائق») and opens the Salah screen. It is a surface card, not a brand card. It reads prayer times through the existing Salah hooks without changing them, and shares the hours-and-minutes formatter with the menu. Without a location it shows a prompt that opens Salah.
7. **Frames first** (ADR 0010): `HomeNextPrayerNoLocation`, `HomeAzkar`, `HomeAzkarDark`, `HomeAzkarEnglish`, `Sibha`, `SibhaDark`, `DailyGoalsSheet`, `HomeDailyProgressEmpty`.

### «أهدافي اليومية» manages every daily activity (developer, 1 Nov 2026)
- The sheet slides up and closes like every other sheet (`SheetHost`, ADR 0020); Reduce Motion fades.
- It is the single place to manage daily activities:
  - **الورد اليومي:** the toggle when a Khatma plan is active; otherwise a «ابدأ ختمة» row that opens `/khatma`.
  - **All five Azkar sessions,** each with a toggle and a bell that opens that category's reminder sheet (`/azkar/reminders?category=`). Shown only when Azkar content exists.
  - **المسبحة:** the daily-target toggle and stepper, and a row that opens `/sibha`.
  - **The daily reading reminder,** shown as the same `DailyReminderRow` as in Settings.
  - **Prayer notifications:** a row that opens Salah, where each prayer has its bell.
- Changes still save immediately. Nothing is on by default.
- Approved difference from the `DailyGoalsSheet` frame: the sheet opens at the shared mid detent (ADR 0020) and scrolls at the full detent; the frame draws the card near the top.

## Consequences

- Home becomes longer. Section order, top to bottom:
  1. تابع القراءة
  2. تابع الأذكار
  3. تقدّم اليوم
  4. the tile row (with المسبحة)
  5. أذكار مختارة
  6. آخر الأذكار
  7. آخر ما استمعت إليه
- Personal data stays local (ADR 0027). Clear-data wipes the misbaha, history and goals.

## Implementation notes (1 Nov 2026)

How the decisions above were finally built. Where a note narrows or fills a gap in the text, the note governs.

- **Misbaha target.** It starts at 100, the chip the Sibha frame draws. Pressing the active chip clears the target (there is no separate "no target" chip). The «مخصص» chip opens a number sheet that accepts 1–9999.
- **Reset.** Reset clears the count only. Today's total is kept, and the reset confirmation says so.
- **Daily goals.** Each change is saved as it is made. Both «تم» and «حفظ» close the sheet. The misbaha goal stepper moves by 1 within 1–9999, and a new goal starts at 100.
- **Not Azkar-gated.** The misbaha tile, the misbaha progress row and the misbaha goal have no religious content, so they do not wait for Azkar content. The continue, selected-session and recent Azkar sections stay gated by `useAzkarAvailable()`.
- **Recent Azkar rows.** A completed scope shows «· مكتملة» after its count. The frame's «· اليوم» suffix on in-progress daily rows is not implemented; it has no rule in this ADR.
- **Label field.** Empty, it shows the hint «تسمية اختيارية» / "Optional label" with no brackets. The brackets in the frame are placeholder notation, not UI text.
- **Wird card.** Home shows the Khatma wird card only while the wird is not a tracked daily goal. When the wird goal is on, the progress row is the only wird display, so the wird is never shown twice.
