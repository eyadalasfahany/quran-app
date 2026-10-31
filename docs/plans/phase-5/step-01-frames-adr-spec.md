# Step 1 — Frames, ADR & Spec

ADR 0010 (frames before code), phase-5 decisions D1–D7 (`docs/plans/phase-5.md`).

## Goal
Every layout this phase ships exists first as a frame in `quran-app-screens.html`, drawn from `@quran/design-tokens`, and the spec records the new phase. No app code in this step.

## Scope
1. **New frames** in `quran-app-screens.html`:
   - `#Salah` (390 × 844, RTL): date header (Hijri + Gregorian), next-prayer hero (name, time, countdown), times list (الفجر، الشروق، الظهر، العصر، المغرب، العشاء) with a per-row bell toggle, qibla row («اتجاه القبلة» + bearing) → `/salah/qibla`, location line («مكة المكرمة · تلقائي» or «جدة · يدوي» style) that opens the location picker.
   - `#SalahDark`: dark variant.
   - `#Qibla` (390 × 844): live compass dial (Kaaba marker, needle, degrees), distance caption, calibration state.
   - Update `#ExpandedHome` / `#ExpandedHomeDark`: sidebar gains الصلاة after الاستماع (مصحفي stays first, per phase-4 step 6).
2. **Icon for الصلاة** finalized in the frames (suggestion: SF `moon.stars` / Material `mosque`); the person-circle مصحفي glyph from phase-4 step 6 carries over.
3. **ADR 0030** in `docs/adr/`: salah & qibla on-device (adhan-js, no times API), fixed Umm al-Qura/Shafi'i defaults, local-only notifications, five-tab navigation with مصحفي center, gazetteer licensing (GeoNames CC-BY).
4. **Spec edits** in the same change: §15 gains the Phase 5 row; §12 gains salah/qibla notes (motion: compass rotation, Reduce Motion static dial); §16 drops any resolved questions.

## Deliverables
- Frames committed to `quran-app-screens.html`; developer approval recorded in this brief (deviation list stays empty).
- `docs/adr/0030-salah-qibla-on-device.md`.
- Spec diff for §15, §12, §16.

## Done when
- Developer approves the frames; `frame-shot.py Salah out.png` and `frame-shot.py Qibla out.png` render at 390 × 844.
