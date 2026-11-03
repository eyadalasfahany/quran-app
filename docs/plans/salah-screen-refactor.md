# Plan: Salah screen design refactor

Status: **approved** (developer, 3 Nov 2026; **option B list amended same evening**) · Branch: **`ft/salah-screen-refactor`** only — do **not** commit unrelated dirty work on `main` (notifications, widgets, downloads-storage).

**Amendment:** times list is plain raised rows; sky photo only on hero + **active (next)** row (ADR 0057 §3 option B).

## Rests on

- `docs/adr/0057-salah-screen-design-freeze.md` (this work’s decisions).
- ADR 0010, 0012, 0030 §7, 0031 §10, 0047.
- Spec §14 (mobile gates), §15 row 5 (Salah phase).
- Code: `SalahDateHeader`, `NextPrayerHero`, `PrayerTimeRow`, `QiblaRow`, `SalahScreen`, `packages/design-tokens/src/colors.ts`.

## Release blockers

- None for API, content, or notifications.
- Developer **visual check** (iPhone 17 sim vs `#Salah` / `#SalahDark` via `frame-shot.py`) before merge — implementer runs unit gates only.

## Decisions that need the developer

| # | Topic | Status |
| --- | --- | --- |
| 1 | All design choices in ADR 0057 | **Decided** (3 Nov 2026) |
| 2 | Exact past-row scrim alphas vs default | Implementer proposes from review intent; no product change without developer PR comment |
| 3 | Dynamic Type reflow on Salah | **Deferred** follow-up |

---

## Step 1 — ADR, spec touch, HTML frames

**Goal:** Lock decisions (ADR 0057, done in planning) and align canonical frames before code.

**Tasks**

1. Confirm ADR 0057 is on the branch (planning deliverable).
2. **Minimal spec:** In `docs/technical-spec.md` §15, phase 5 exit line — add `#SalahDark` and pointer to ADR 0057 for the Salah layout freeze (header + past rows + tokens).
3. **`quran-app-screens.html` (surgical string replace only; do not re-encode photos):**
   - Copy the **dual-button header** block from `#SalahAdhanSoundEntry` (speaker + location, ~line 1425) into **`#Salah`** and **`#SalahDark`**, replacing the single location-only control (~1306, ~1544). Preserve each frame’s light/dark raised-button colours.
   - Update `#SalahAdhanSoundEntry` `gx-cap` or add a short `gx-note`: header superseded by `#Salah` / `#SalahDark`.
   - **Past-row appearance:** Painting six muted past rows in HTML is optional and heavy (embedded images). Prefer a **`gx-note`** under the Salah section documenting past-row behaviour per ADR 0057 §3 (muted ink + stronger scrim; active/future unchanged). If the developer wants one exemplar row in `#Salah`, add a single past row state in a **new** small frame id `SalahPastRow` instead of re-rendering the full list.
4. Do **not** restore or edit `#SalahAzkar` content except an optional «withdrawn — ADR 0031» note.

**Tests / gates**

- Manual: open `#Salah` and `#SalahDark` in the screens HTML; header shows speaker + location.
- `npm run check:html -w @quran/design-tokens` after step 2 tokens land (or run again at end of step 2).

**Files**

- `docs/adr/0057-salah-screen-design-freeze.md`
- `docs/plans/salah-screen-refactor.md`
- `docs/technical-spec.md` (§15 one line)
- `quran-app-screens.html`

---

## Step 2 — Design tokens

**Goal:** Semantic Salah veil/scrim colours; remove hex-alpha maps from components.

**Tasks**

1. Extend `ColorTokens` in `packages/design-tokens/src/colors.ts` with hero veils and row scrims (default, active, last, **past**, active tint) for `light`, `sepia`, `dark`. Transcribe current `NextPrayerHero` / `PrayerTimeRow` `SCRIM` values for non-past; define **past** stronger than default.
2. Mirror new CSS custom properties in `quran-app-design-system.html` line-3 token block (all themes + contrast block unchanged unless audit fails).
3. Tokens flow automatically through `apps/mobile/src/core/theme/theme.ts` (`colors[name]`).

**Tests / gates**

- `npm run check:html -w @quran/design-tokens`
- Unit: optional snapshot or table test in `packages/design-tokens` if one exists for colours; otherwise rely on `check:html`.

**Files**

- `packages/design-tokens/src/colors.ts`
- `quran-app-design-system.html`

---

## Step 3 — Mobile components

**Goal:** Match ADR 0057 in app UI.

**Tasks**

1. **`NextPrayerHero.tsx`:** Use hero veil tokens; progress track uses the same RTL pattern as `PlayerProgress` (row direction + width fill from start edge).
2. **`PrayerTimeRow.tsx`:** Read scrim tokens by variant (`active`, `last`, `past`, default); add `past?: boolean` prop; remove `SCRIM` hex suffix map.
3. **`SalahScreen.tsx`:** Compute `past` per row from `times`, `now`, and `next.name` (ADR 0057 §3). Pass `past` into `PrayerTimeRow`; sunrise gets past scrim when `times.sunrise <= now`.
4. **`QiblaRow.tsx`:** Replace `paddingHorizontal: 18` with theme spacing token.
5. **`PrayerTimeRow.tsx`:** Sunrise empty bell slot — `accessible={false}` / not a hit target (ADR 0057 §6).
6. **`SalahDateHeader`:** No layout change expected if already dual-button; verify comments cite `#Salah` not `#SalahAdhanSoundEntry` as canonical.

**Out of scope:** `QiblaScreen`, notifications, Discover, audio, location sheets.

**Tests / gates**

- Colocated tests updated/added:
  - `NextPrayerHero.test.tsx` — RTL progress from start edge in `ar` (mirror `PlayerProgress` / `MiniPlayer` patterns); no raw colour literals in file (project convention).
  - `PrayerTimeRow.test.tsx` — `past` scrim token colours; `past` + `muted` ink; active unchanged.
  - `QiblaRow.test.tsx` — padding uses token.
  - `SalahScreen.test.tsx` — row receives `past` when times fixture says so (mock clock).
- `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor` in `apps/mobile`.

**Files**

- `apps/mobile/src/features/salah/components/NextPrayerHero.tsx`
- `apps/mobile/src/features/salah/components/PrayerTimeRow.tsx`
- `apps/mobile/src/features/salah/components/QiblaRow.tsx`
- `apps/mobile/src/features/salah/screens/SalahScreen.tsx`
- `apps/mobile/src/features/salah/components/SalahDateHeader.tsx` (comments only, unless drift found)
- `*.test.tsx` colocated with the above

---

## Step 4 — Review gates and follow-ups

**Implementer**

- All mobile gates in step 3.
- Compare **frame-shot** exports for `#Salah` / `#SalahDark` at 390×844 against token values (static check).

**Developer (before merge)**

- Simulator screenshot vs frames (Arabic + English, light + dark) per frontend rule.
- Confirm unrelated dirty files on `main` were not included in the branch.

**Follow-up (not this branch)**

- Salah Dynamic Type reflow audit.
- Optional: remove or archive `#SalahAzkar` HTML frame.

---

## File checklist (implementer)

| Area | Path |
| --- | --- |
| ADR | `docs/adr/0057-salah-screen-design-freeze.md` |
| Plan | `docs/plans/salah-screen-refactor.md` |
| Spec | `docs/technical-spec.md` |
| Frames | `quran-app-screens.html` |
| Tokens | `packages/design-tokens/src/colors.ts`, `quran-app-design-system.html` |
| App | `apps/mobile/src/features/salah/components/NextPrayerHero.tsx`, `PrayerTimeRow.tsx`, `QiblaRow.tsx`, `SalahDateHeader.tsx`, `apps/mobile/src/features/salah/screens/SalahScreen.tsx` |
| Tests | Matching `*.test.tsx` under `apps/mobile/src/features/salah/` |

**Do not touch (unless accidental conflict):** `apps/mobile/src/features/notifications/**`, widget targets, downloads-storage dirty paths on `main`.
