# Step 2 — Salah Data Layer

Phase-5 decisions D2, D3, D5. Content plan: `adhan` 4.4.6, `expo-location` ~58.0.19.

## Goal
A tested, offline-first data layer for prayer times, qibla bearing, location and Hijri date — before any UI.

## Scope
1. **Dependencies:** `npx expo install expo-location`; add `adhan@4.4.6` (content-plan pinned). Run the dependency audits (`node .github/scripts/npm-audit.mjs`).
2. **`src/features/salah/data/location.ts`:** permission status + request with Arabic rationale; current coordinates via `expo-location` (balanced accuracy, cached last-known first); persisted source in **MMKV** via `storageKeys` (`auto` | manual city id + coordinates), following the `src/features/notifications/reminder-service.ts` pattern — `user.db` is personal content only.
3. **`src/features/salah/data/cities.ts`:** bundled gazetteer (`assets/salah/cities.json`, hand-compiled major cities, ar/en names, approximate city centers — facts, no attribution needed). Search: normalized substring on ar + en names, offline.
4. **`src/features/salah/data/prayer-times.ts`:** thin wrapper over `adhan` — `timesFor(date, coordinates)` → five times + شروق (Umm al-Qura, Shafi'i Asr, per D2); `qiblaBearing(coordinates)` → degrees from true north; `nextPrayer(times, now)`. Pure functions, no React.
5. **Hijri date:** on-device via `formatHijriDate(date, locale)` in `src/core/i18n/dates.ts` — `Intl.DateTimeFormat` with the `islamic-umalqura` calendar (matches the prayer-time method), era suffix (هـ/AH) stripped. No network, no cache, no drift (ADR 0030 §6 — supersedes the earlier `/bootstrap`-field idea; D3's stale-drop rule is moot).
6. **Hooks:** `usePrayerLocation()`, `useTodayTimes()`, `useNextPrayer(now)`, `useHijriDate()` in `src/features/salah/hooks/`.

## Tests
- Known-fixture unit tests: Riyadh & Jakarta coordinates against published Umm al-Qura times for fixed dates (tolerance 1 minute, documented DST/method caveats); qibla bearing for known cities (±0.5°).
- Gazetteer search: Arabic normalization (أ/ا, ة/ه), English case-insensitivity, empty-result state.
- Hijri: known Gregorian→Hijri fixture (2026-10-31 → «٢٠ جمادى الأولى ١٤٤٨»), era suffix stripped, en variant, locale default.
- Location: permission denied → manual source persisted; manual city overrides GPS.

## Deliverables
- `src/features/salah/data/` + `hooks/` with colocated tests; `assets/salah/cities.json`; i18n keys for city names come from the gazetteer, UI strings in `ar.json`/`en.json`.
