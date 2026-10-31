# Step 3 — الصلاة Screen & Five Tabs

Phase-5 decision D1. Frame `#Salah` / `#SalahDark` (step 1). Data layer from step 2.

## Goal
The الصلاة tab ships: five tabs with مصحفي in the center, the screen matching its frame exactly, in Arabic and English.

## Scope
1. **Navigation:**
   - `destinations.ts`: add `(salah)` — route group `app/(main)/(salah)/index.tsx`, label `tabs.salah`, icon per step-1 frames.
   - `tabDestinations` order: (home), (mushaf), **(my-quran)**, (listen), (salah) — مصحفي center.
   - `sidebarDestinations`: (my-quran), (home), (mushaf), (listen), (salah); Settings stays last.
2. **Screen** (`src/features/salah/screens/SalahScreen.tsx` + components in `src/features/salah/components/`), composing only:
   - `SalahDateHeader` — Hijri (`formatHijriDate`, on-device Umm al-Qura) + Gregorian.
   - `NextPrayerHero` — name, time, live countdown. The countdown is plain text re-rendered once per second while the app is foregrounded; no animation, so Reduce Motion does not apply.
   - `PrayerTimeRow` × 6 (٥ + شروق) — name, time, per-row bell toggle (wired in step 4; here it renders disabled-pending or stores the toggle without scheduling).
   - `QiblaRow` — «اتجاه القبلة» + bearing → `router.push('/salah/qibla')`.
   - `LocationLine` — current source («تلقائي» GPS / manual city), tap → location picker sheet (permission request or gazetteer search, per step 2).
3. **Scenic imagery (ADR 0030 §7):** copy `design-assets/salah/*.jpg` to `apps/mobile/assets/salah/`; `PrayerTimeRow` takes a `scene` (`fajr|shurouq|dhuhr|asr|maghrib|isha`) rendered as an `expo-image` background under a theme scrim matching the frame values (light: card color at 0.74→0.56; dark: 0.60→0.44; active row lighter); `NextPrayerHero` uses `hero-sunset.jpg` under the green scrim (168deg, `rgba(31,77,64,0.56)` → `rgba(19,44,37,0.8)`). Images are bundled, never fetched; decorative (`accessible={false}`).
4. **i18n:** all strings in `ar.json` / `en.json`; times in Arabic-Indic digits in ar, per existing convention.
5. **Medium/expanded:** centered column per §4 rules; no sidebar changes beyond the item add.

## Tests
- Component tests per file (render, variants, interaction, RTL, a11y role/label).
- Countdown tick and next-prayer rollover at midnight (mocked clock).
- Location line states: GPS, manual city, unset (first-run prompt).
- Navigation tests: tab order, sidebar order, active-tab survival across resize.

## Deliverables
- Screen, components, route group, updated `destinations.ts`/`MainShell.tsx`, i18n keys, colocated tests. Visual check vs `#Salah`/`#SalahDark` on the iPhone 17 simulator.
