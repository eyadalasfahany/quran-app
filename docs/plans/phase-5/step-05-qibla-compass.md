# Step 5 — Qibla Compass

Phase-5 decision D6. Frame `#Qibla` (step 1). Bearing from step 2.

## Goal
`/salah/qibla` — a live compass that points to Makkah, matching its frame, offline.

## Scope
1. **Route:** `app/salah/qibla.tsx` (pushed from `QiblaRow`; medium/expanded render as a centered column per §4).
2. **Components** (`src/features/salah/components/`):
   - `QiblaCompass` — dial with cardinal marks + Kaaba marker; needle rotates to `qiblaBearing − heading`. Rotation via Reanimated `spring()` from `src/core/theme/motion.ts`; **Reduce Motion → static dial** (bearing degrees + fixed arrow, no rotation, D6).
   - `QiblaBearingLabel` — degrees from true north (Arabic-Indic digits in ar).
   - `QiblaDistanceCaption` — great-circle distance to المسجد الحرام (21.4225, 39.8262), km, muted caption.
   - `CompassCalibrationNotice` — shown when `watchHeadingAsync` reports poor accuracy («حرّك جهازك على شكل ٨»); disappears on recovery.
3. **Hook:** `useQiblaHeading()` — subscribes to `Location.watchHeadingAsync` (true north), throttles updates (~10 Hz), cleans up on unmount; exposes heading, accuracy, and a `supported` flag (devices without a magnetometer → static dial + note).
4. **Edge cases:** location unset (neither GPS nor manual) → empty state linking to the location picker; heading unavailable on some Android emulators → static dial.

## Tests
- Needle angle math: bearing − heading normalized to −180…180 (no 350° swings through 0°).
- Accuracy states: good → no notice; poor → notice; recovery hides it.
- Reduce Motion: no rotation animation, static dial rendered.
- `supported = false` fallback; unset-location empty state.
- Component tests: render, RTL, a11y label («اتجاه القبلة: N درجة»).

## Deliverables
- Screen, components, hook, route, i18n keys, colocated tests. Visual check vs `#Qibla` on the iPhone 17 simulator.
