# Mobile app (Expo SDK 58, TypeScript)

Spec: `docs/technical-spec.md` §4 (structure and responsive layout), §6 (SQLite), §7 hop 3 (content sync), §11 (user sync), §12 (reader, audio, search), §14 (device matrix).

## Structure

- `app/` holds Expo Router routes only. Routes stay thin: read params, render a feature screen.
- `src/core/` holds api, db, sync, layout, theme, i18n, storage, telemetry.
- `src/features/<feature>/` holds `components/`, `hooks/`, `data/` (repositories) and `store.ts` only when needed.
- `src/shared/ui/` holds design-system components, rebuilt from the Figma file (link in the root CLAUDE.md) when a phase first needs them. Colors, spacing, radii and type come from `@quran/design-tokens`, which is pulled from Figma's variables and text styles; no raw hex values in components.
- The UI font is IBM Plex Sans Arabic in `assets/fonts/IBMPlexSansArabic/` (OFL, licence alongside). Load only the weights the design uses.
- API base URL comes from `EXPO_PUBLIC_API_URL`: `http://localhost:8000` on iOS simulators, `http://10.0.2.2:8000` on Android emulators.
- API types come from `@quran/api-contract`. Never hand-write a type for an API payload.

## Where state lives

| State | Home |
| --- | --- |
| Quran text, layouts, translations, tafsir, timings | `content.db` via feature repositories (Drizzle) |
| Bookmarks, highlights, notes, khatma, settings, outbox | `user.db`, Drizzle `useLiveQuery` |
| Account, online lookups, hadith browsing | TanStack Query |
| Player queue, active ayah and word, repeat | Zustand `playerStore` |
| Last-read verse and page, onboarding flags, theme | MMKV (read before the DB opens) |
| Auth token | `expo-secure-store` |

`content.db` can be deleted and rebuilt at any time. Never write personal data to it.

## Responsive layout (phones, iPad, foldables)

- Use `useWindowClass()` → `compact` (< 600), `medium` (600–839), `expanded` (≥ 840). Never `Platform.isPad`, never device names.
- Compact: bottom tabs, sheets. Medium: tabs, centered column, large sheets. Expanded: sidebar, centered column plus a persistent side panel.
- Ayah actions and tafsir render in the side panel when it exists and as sheets otherwise; the routes are the same.
- Reading and Focus columns cap at about 720 pt. Mushaf page width is `min(window − gutters, 640)`, font size derived from it.
- Any resize, rotation, fold or unfold must keep the top visible verse via `useReadingAnchor`.
- No orientation locks. iPad declares all four orientations.

## Quran rendering rules

- Quran text renders only in its Quran font, exactly as stored. Never ellipsize, truncate or reflow an ayah into the UI font.
- Each ayah's accessibility label is its Imla'i text plus the ayah number.
- Media controls and progress bars are never mirrored in RTL.

## Dependencies and checks

- Add Expo-managed packages with `npx expo install`. Expo's pinned version wins over npm's latest.
- Budgets: cold start to last-read ayah < 1.5 s on a mid-range Android, audio start < 1 s, 60 fps scrolling, search < 150 ms.
- Run: `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`.
- Every user-facing flow is checked in Arabic and English, and on compact and expanded windows.
