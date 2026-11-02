# Phase 5 — Salah & Qibla (On-Device)

Spec §15 (new phase row lands with step 1), ADR 0027 (local-only), ADR 0010 (frames before code). Content plan pins `adhan` 4.4.6 + `expo-location` ~58.0.19. **Exit criterion:**
- الصلاة tab shows today's five prayer times + شروق, a next-prayer countdown, and the Hijri + Gregorian date, computed on-device and fully functional offline.
- Per-prayer local notifications fire at the prayer time with no network and no account.
- Qibla compass at `/salah/qibla` keeps its face fixed and moves the Kaaba marker live with the device heading to point to Makkah (ADR 0049), with calibration guidance when sensor accuracy is poor.
- Location comes from GPS when permitted and from a searchable bundled city list otherwise; the choice persists across launches.
- Tab bar has five tabs with مصحفي in the center; the sidebar keeps مصحفي first.
- Visual conformance verified on the iPhone 17 simulator against `#Salah`, `#SalahDark`, `#Qibla` and the updated sidebar frames, in Arabic and English.

**Design sources** (ADR 0010 — drawn and approved in step 1, before any code):
- New frames in `quran-app-screens.html`: `#Salah` (phone), `#SalahDark`, `#Qibla`.
- Updated frames: `#ExpandedHome` / `#ExpandedHomeDark` sidebars gain الصلاة (five destinations, مصحفي first).

**Rules:**
- All component and styling rules from previous phases apply (`apps/mobile/CLAUDE.md`, `apple-design` skill, tokens through `useTheme()`).
- One component per file with its colocated test. Screens only compose components.
- Arabic first, RTL by default; English fully supported.
- Offline-first: times, qibla, notifications and the Hijri date must work with airplane mode on (Non-negotiable 4). الصلاة needs no network at all.
- Implementation by subagents; small focused briefs.

---

## Decisions (developer, 31 Oct 2026 — to be recorded as ADR 0030 in step 1)

| # | Question | Decision |
| :--- | :--- | :--- |
| **D1** | Placement | New `(salah)` tab. Tab order: الرئيسية، المصحف، **مصحفي (center)**، الاستماع، الصلاة (RTL: first = rightmost). Sidebar keeps Phase 4 order with الصلاة appended after الاستماع. Qibla lives inside الصلاة, pushed as `/salah/qibla`. |
| **D2** | Computation | **On-device only.** `adhan` (adhan-js) computes the five times, شروق and the qibla bearing from coordinates; `expo-location` supplies GPS and heading. Fixed calculation defaults — **Umm al-Qura, Shafi'i Asr** — no method picker in v1. |
| **D3** | Hijri date | On-device via `Intl.DateTimeFormat` with the `islamic-umalqura` calendar (same Umm al-Qura basis as the times), `formatHijriDate()` in `src/core/i18n/dates.ts`. No network, no cache, no drift. A free online Hijri API was rejected (non-negotiable #2: the app calls only our API), as was a `/bootstrap` field (drift + contract work). |
| **D4** | Notifications | Local `expo-notifications` only. Rolling 8-day schedule per enabled prayer, refreshed on app foreground and on any location/toggle change. Per-prayer toggle on each row + master settings. System default sound — **no bundled adhan audio in v1** (file size, licensing review). |
| **D5** | Location | Foreground permission with an Arabic rationale sheet. Denied → searchable bundled gazetteer (hand-compiled major cities, ar/en names, approximate city centers — facts, no attribution needed). Selected source + coordinates persist in **MMKV** (`storageKeys`), matching the daily-reminder pattern; `user.db` is for personal content only. No geocoding network calls. |
| **D6** | Qibla compass | Live: `adhan` bearing + `Location.watchHeadingAsync`. Calibration guidance when heading accuracy is poor. Reduce Motion → static dial (bearing + arrow, no rotation). Distance to Makkah shown as a caption. |
| **D7** | Spec & ADR | Step 1 ships ADR 0030 and the spec edits (§15 phase row, §12 salah/qibla notes) together with the frames — before any app code. |

---

## Steps

| # | Step | Description | Dependencies |
| :---: | :--- | :--- | :---: |
| **1** | **Frames, ADR & spec** | Draw `#Salah`, `#SalahDark`, `#Qibla` and update the sidebar frames in `quran-app-screens.html` from existing tokens; developer approves; write ADR 0030 and the spec §15/§12 edits. Icons for الصلاة (suggestion: SF `moon.stars` / Material `mosque`) are finalized here. | Phase 4 step 6 |
| **2** | **Salah data layer** | `src/features/salah/data/`: location service (permission flow, GPS, gazetteer search, persisted source in MMKV), `adhan` wrapper (times + qibla bearing, Umm al-Qura/Shafi'i), on-device Hijri (`formatHijriDate`). Unit tests with known city/date fixtures. `npx expo install expo-location`; `adhan` 4.4.6 per content plan. | Step 1 |
| **3** | **الصلاة screen + five tabs** | `SalahScreen` per `#Salah`: date header (Hijri + Gregorian), next-prayer hero (name, time, countdown), times list (٥ + شروق) with per-prayer bell, qibla row → `/salah/qibla`. `destinations.ts` gains `(salah)`; مصحفي takes the tab-bar center; sidebar gains الصلاة. i18n ar/en. | Step 2 |
| **4** | **Prayer notifications** | Scheduling engine (rolling 8 days, refresh on foreground/location/toggle), per-prayer toggles wired to the bell, Settings master row, deep link to الصلاة on tap. Tests: schedule math, refresh triggers, toggle persistence. | Step 3 |
| **5** | **Qibla compass** | `/salah/qibla` per `#Qibla`: fixed dial with a live-moving Kaaba marker (ADR 0049), bearing degrees, distance caption, calibration prompt, Reduce-Motion static variant. Hook tests with mocked heading. | Step 2 |
| **6** | **Phase 5 exit check** | iPhone 17 simulator + iPad: airplane-mode pass (times, qibla, notifications), ar/en both directions, visual review against all new/updated frames, notification delivery on a real device build. | Steps 3–5 |

---

## Step briefs in `docs/plans/phase-5/`
- `step-01-frames-adr-spec.md`
- `step-02-salah-data-layer.md`
- `step-03-salah-screen-and-tabs.md`
- `step-04-prayer-notifications.md`
- `step-05-qibla-compass.md`
- `step-06-exit-check.md`
