# 0057 — Salah screen design freeze (header, scrims, past rows)

Date: 2026-11-03 · Status: **accepted** (developer approved the design-review execution plan, 3 Nov 2026) · Branch: `ft/salah-screen-refactor` · Rests on ADR 0010 (frames first), 0012 (RTL media progress), 0030 §7 (scenic imagery), 0031 §10 (Salah placement), 0047 (adhan sound entry on Salah) · Amends ADR 0030 §7 (row scrim behaviour), ADR 0032 §2 (Salah may change for this approved visual pass only) · Plan: `docs/plans/salah-screen-refactor.md`

## Context

A design review of the shipped الصلاة tab found three drifts from the approved frames and token rules:

1. **Header.** ADR 0047 added a speaker control beside the location button. The app (`SalahDateHeader`) and frame `#SalahAdhanSoundEntry` show the dual-button header, but canonical frames `#Salah` and `#SalahDark` still show the location button alone (`quran-app-screens.html`: `#Salah` ~line 1306, `#SalahDark` ~line 1544 vs `#SalahAdhanSoundEntry` ~line 1425).
2. **Raw colours.** `NextPrayerHero` hard-codes hero veils as `rgba(31, 77, 64, …)` and `rgba(19, 44, 37, …)`. `PrayerTimeRow` builds scrims with hex alpha suffixes on `surfaceRaised` (`SCRIM` map in `PrayerTimeRow.tsx`), not semantic tokens.
3. **Past rows.** All list rows use the same scrim weight whether the prayer time has passed or not. The review asked for quieter past obligatory prayers (and past sunrise) while keeping sky photos and row pitch.

The review also suggested a slim Azkar row on Salah. **That stays rejected** (ADR 0031 §10, developer 1 Nov 2026).

Implementation is UI-only: no schema, sync, API contract, notification engine, or Qibla screen changes.

## Decision (accepted 3 Nov 2026)

### 1. Canonical `#Salah` / `#SalahDark` header

- **`#Salah` and `#SalahDark` are the source of truth** for the main الصلاة tab: Amiri title, Hijri · Gregorian subtitle, **adhan-sound** raised button (links to `#AdhanSoundPicker` / `/adhan-sound`), then **location** raised button — same block as `#SalahAdhanSoundEntry` today (speaker first so it sits between title and location in Arabic).
- **`#SalahAdhanSoundEntry` is superseded** as a separate canonical frame. Keep the frame id in `quran-app-screens.html` only as a **redirect note** in its `gx-cap` (or a one-line `gx-note`): «الرأس — انظر #Salah»; do not maintain a second full duplicate long term.
- **`SalahDateHeader`** remains the app component; no new header component. Settings and pushed routes that omit `onSoundPress` stay as today.

### 2. No Azkar row on Salah (unchanged)

- **Do not add** an «أذكار بعد الصلاة» row, slim or otherwise, under the times card or Qibla row.
- Frame `#SalahAzkar` stays **withdrawn** (ADR 0031 §10). Do not update it in this work except an optional «withdrawn» note if touched.
- Azkar entry points remain Home, Menu, and `/azkar/*` only.

### 3. Scenic hero + plain times list (amended 3 Nov 2026)

Developer: keep the **existing scenic hero**; change only the **times card** (and bells).

- **Hero:** restore sunset photo + brand veils + gold linear progress + remaining caption (original layout; veil colours stay on tokens).
- **Times list (redesign):** no sky photos. Section label «مواقيت اليوم». Each row: leading prayer glyph chip, name (+ «القادمة» on active), time, bell. Active: `fillSecondary` wash + brand bar. Past / sunrise: muted. Bells on obligatory rows only.
- Clock-first ring hero is **withdrawn**.

**Past detection (app):** unchanged — `past = times[k] <= now` and not `active`. Sunrise uses key `sunrise`.

### 4. Design tokens for Salah veils

- Add **semantic colour tokens** in `@quran/design-tokens` (and the CSS variables in `quran-app-design-system.html` so `npm run check:html -w @quran/design-tokens` passes):
  - **Hero:** two full-card veils (full + lower band) replacing raw `rgba(31, 77, 64, …)` / `rgba(19, 44, 37, …)` in `NextPrayerHero`.
  - **Rows:** replace the `SCRIM` hex-alpha map with named scrim colours for **default**, **active**, **last**, and **past** rows — each **base** (full-height) and **top** (upper half) layer, plus **active brand tint** where the row already uses it. Values are transcribed from the current shipped alphas for default/active/last; **past** base/top are **stronger** than default (review target: clearly dimmer photo, readable muted text — implementer picks alphas in step 2 and documents in the plan PR).
- **Themes:** define for `light`, `sepia`, and `dark`. Hero green card stays **theme-stable** on `brandSurface` in dark mode (existing test).
- **Increase Contrast:** no separate scrim palette required. Past rows use `inkMuted`, which already overrides under `highContrast` (`packages/design-tokens/src/colors.ts`). If contrast testing shows insufficient separation on past rows, bump **past** scrim tokens only (not a new ADR).

### 5. RTL hero interval progress

- The hero countdown **progress fill** follows **ADR 0012** / audio convention: in Arabic (RTL) the gold fill grows from the **start** edge (physical **right**); in English from the **left**. Match `PlayerProgress` (`flexDirection: 'row'` on the track, width percentage on the fill — `apps/mobile/src/features/audio/components/PlayerProgress.tsx`).
- Elapsed countdown label position in the row is unchanged unless a test proves misalignment after the track fix.

### 6. Polish (same change if cheap)

- **`QiblaRow`:** replace `paddingHorizontal: 18` with the theme horizontal inset token (`theme.space[4]` is 16 — use `theme.space[4]` or add `theme.size.cardPadding` if that is what frames use; goal is **no magic number 18**).
- **Sunrise bell slot:** the empty 44 pt slot must **not** be an accessible empty control. Use a non-interactive spacer with `accessible={false}` (or `importantForAccessibility="no"`) and no button role; keep layout width for alignment with bell rows.

### 7. Out of scope

- Dynamic Type full reflow on Salah (follow-up).
- Live simulator visual check (developer, spec §14 / frontend rule).
- Discover tip card content/layout (`DiscoverTipCard` on Salah).
- Qibla screen, prayer notification engine, location data layer, Hijri header logic.
- Reintroducing `#SalahAzkar` or any Azkar UI on Salah.

## Consequences

- **Positive:** Frames, tokens, and app match for ADR 0047 entry point; past times read calmer without losing the scenic design; hero progress matches audio RTL convention; fewer raw literals in Salah components.
- **Negative:** More colour tokens to maintain; `#Salah` HTML edit is surgical but touches a huge file (embedded JPEGs — string replace only, no re-encode).
- **Release blockers:** None for backend or content. **UI review:** developer visual check `#Salah` / `#SalahDark` vs simulator (out of scope for implementer gate, required before merge per ADR 0010).

## Spec edits (minimal)

- `docs/technical-spec.md` §15 phase row 5: note `#SalahDark` and ADR 0057 alongside `#Salah` / `#Qibla` verification (see plan step 1).

## Alternatives considered

- **Hide photo on past rows.** Rejected: prefer stronger scrim + muted ink to keep row pitch and grid stability (developer, review).
- **Slim Azkar row on Salah.** Rejected: ADR 0031 §10.
- **Keep `#SalahAdhanSoundEntry` as co-canonical.** Rejected: duplicates maintenance; one main frame pair is enough.

## Decisions that need the developer

None for this ADR — the review items above were **approved for execution** (3 Nov 2026). Follow-up (not blocking code): Dynamic Type pass on Salah; optional deletion of `#SalahAzkar` HTML frame in a later cleanup.
