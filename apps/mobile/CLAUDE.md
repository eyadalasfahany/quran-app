# Mobile app (Expo SDK 58, TypeScript)

Spec: `docs/technical-spec.md` §4 (structure and responsive layout), §6 (SQLite), §7 hop 3 (content sync), §11 (user sync), §12 (reader, audio, search), §14 (device matrix).

## Structure

- `app/` holds Expo Router routes only. Routes stay thin: read params, render a feature screen.
- `src/core/` holds api, db, sync, layout, theme, i18n, storage, telemetry.
- `src/features/<feature>/` holds `components/`, `hooks/`, `data/` (repositories) and `store.ts` only when needed.
- `src/shared/ui/` holds design-system components, built from `quran-app-design-system.html` and `quran-app-screens.html` (ADR 0010) when a phase first needs them.
- Colors, spacing, radii and type come from `@quran/design-tokens`, which is transcribed from the HTML design system. No raw hex values in components. Read them through `useTheme()` from `src/core/theme`.
- Text styles set the per-weight family (`IBMPlexSansArabic-Bold`) and never `fontWeight`; on Android a weight on top of a bold face can fake-bold it.
- Motion follows spec §12 ("Motion").
  - Tabs are native components with system motion on iOS. Android draws the floating tab bar from `#Main` with `expo-router/ui` headless tabs (ADR 0033). The full player is a transparent modal with its own slide-up and drag-to-dismiss, built like the reader sheets (developer, 29 Oct 2026). Reader sheets are custom cards in a transparent modal (ADR 0013).
  - Custom motion uses `src/core/theme/motion.ts`:
    - `timing('instant' | 'fast' | 'standard' | 'slow')` for opacity and color.
    - `spring()` for position, size and drag release.
    - `useSlideUp()` for custom overlays; it fades when Reduce Motion is on.
  - No raw durations in components.
  - Glass never fades; switch its style, and without animation when Reduce Motion is on.
- Jest uses `react-native-reanimated/jest/resolver`, so tests import the real Reanimated; mock only `useReducedMotion` when a test needs it.
- The UI font is IBM Plex Sans Arabic in `assets/fonts/IBMPlexSansArabic/` (OFL, licence alongside). Load only the weights the design uses.
- Interface copy lives in `src/core/i18n/locales` (`ar.json`, `en.json`). Arabic is the default for now, whatever the device language; English is used only when the reader has saved it. The choice is the MMKV key `locale`. Switching calls `I18nManager.allowRTL` and `forceRTL`, then reloads (`DevSettings.reload` in dev, `Updates.reloadAsync` in a release build). `allowRTL(false)` is required for English, because `forceRTL(false)` does not force LTR on an Arabic device. On iOS, `setLocale` and startup (`ensureDirection`) also write `AppleLanguages` to `[locale]` via `Settings.set` (`src/core/i18n/app-language.ts`), so UIKit's native chrome (the tab bar order) mirrors with the saved language; UIKit reads that only at process launch, so it takes effect on the next cold start.
- API base URL comes from `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` (copy `.env.example`): `http://localhost:8000` on iOS simulators, `http://10.0.2.2:8000` on Android emulators.
- API types come from `@quran/api-contract`. Never hand-write a type for an API payload. Type route paths with `satisfies keyof paths`, so a renamed route fails `tsc`.

## Components and screens (rule)

- **Components:** every UI component lives in its own file:
  - Design-system pieces in `src/shared/ui/<ComponentName>.tsx`.
  - Feature pieces in `src/features/<feature>/components/<ComponentName>.tsx`.
- **Tests:** each component has its own colocated test, `<ComponentName>.test.tsx` (React Native Testing Library). It covers:
  - Render with default props, and each variant.
  - Interaction: presses and callbacks.
  - RTL: render under Arabic and English.
  - Accessibility: role, label and state.
  - Theme tokens: no raw hex values.
- **Screens:** screens (`app/` routes and `src/features/<feature>/screens/`) only compose components and wire data. Layout containers are fine; one-off styled UI blocks inside a screen are not. Extract them into a component with its own test.
- **Design:** all UI follows the `apple-design` skill (`.agents/skills/apple-design/SKILL.md`, Apple HIG), as interpreted by spec §12.
  - Read it before building UI, and check against it before done.
  - That means 44 pt touch targets, Dynamic Type, contrast, RTL mirroring, Reduce Motion and Reduce Transparency, and VoiceOver and TalkBack labels.
- **Review against the HTML:** every review compares the built UI with its frame in `quran-app-screens.html` and the tokens in `quran-app-design-system.html`. It must be identical unless the developer has approved a difference (an ADR or the step brief). A mismatch fails the review.
- **Visual check:** the review also screenshots the running app on the **iPhone 17 simulator** (`xcrun simctl io booted screenshot`) and compares it with the frame rendered at 390 × 844 by `packages/design-tokens/scripts/frame-shot.py <frame-id> <out.png>`. Tests and style values alone don't pass a UI review.
- **Delegation:** implementation goes to a subagent on the cheapest available model (Haiku); the orchestrating agent briefs it and reviews the diff.
- **Existing gap:** `Sidebar` and `SidebarItem` (Phase 0) are tested through `__tests__/sidebar-glass.test.tsx` and the router test, not by colocated per-component tests. Add those the next time either component changes.

## Where state lives

| State | Home |
| --- | --- |
| Quran text, layouts, tafsir, timings | `content.db` via feature repositories (Drizzle) |
| Bookmarks, highlights, notes, khatma, settings, outbox | `user.db`, Drizzle `useLiveQuery` |
| Account, online lookups, hadith browsing | TanStack Query |
| Player queue, active ayah and word, repeat | Zustand `playerStore` |
| Last-read verse and page, onboarding flags, theme | MMKV (read before the DB opens) |
| Auth token | `expo-secure-store` |

`content.db` can be deleted and rebuilt at any time. Never write personal data to it.

## Responsive layout (phones, iPad, foldables)

- Use `useWindowClass()` → `compact` (< 600), `medium` (600–839), `expanded` (≥ 840). Never `Platform.isPad`, never device names. A one-step resize stays in the current class until the width clears the boundary by 16; a jump across both boundaries takes the new class immediately.
- Compact and medium: native bottom tabs. Expanded: the same tabs with the bar hidden, plus `Sidebar` (300 pt, from the expanded-window drawing). The sidebar navigates the same routes, so the active tab survives the switch. iOS 26's adaptable sidebar is not used; its breakpoint is not 840, and Android tablets share this sidebar.
- `useGlass()` is true only when Liquid Glass is available and Reduce Transparency is off. Otherwise a glass surface is solid `glassFallback` with a `line` hairline.
- Compact: sheets. Medium: centered column, large sheets. Expanded: centered column plus a persistent side panel.
- Ayah actions and tafsir render in the side panel when it exists and as sheets otherwise; the routes are the same.
- Reading and Focus columns cap at about 720 pt. Mushaf page width is `min(window − gutters, 600)`, font size derived from it.
- Any resize, rotation, fold or unfold must keep the top visible verse via `useReadingAnchor`.
- No orientation locks. iPad declares all four orientations.

## Quran rendering rules

- Quran text renders only in its Quran font, exactly as stored. Never ellipsize, truncate or reflow an ayah into the UI font.
- Each ayah's accessibility label is its Imla'i text plus the ayah number.
- Audio follows the layout direction (ADR 0012), so it mirrors between Arabic and English. In Arabic, progress bars fill from the right with elapsed time on the right, and next ayah sits on the left with its glyph pointing left. In English all of it mirrors. The play glyph mirrors too, pointing left in Arabic, and every play control shows pause while its audio plays (ADR 0025).

## Dependencies and checks

- Add Expo-managed packages with `npx expo install`. Expo's pinned version wins over npm's latest. Dev tools still go in `devDependencies` (`npx expo install` drops `--dev` here).
- React and `react-dom` are pinned by `overrides` in the root `package.json`, so npm workspaces can't hoist a second React. Update them there whenever an SDK upgrade moves React.
- `app.config.ts` reads `APP_VARIANT` (`development` by default, set per profile in `eas.json`) to choose the bundle ID and scheme.
- Budgets: cold start to last-read ayah < 1.5 s on a mid-range Android, audio start < 1 s, 60 fps scrolling, search < 150 ms.
- Run: `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`.
- Every user-facing flow is checked in Arabic and English, and on compact and expanded windows.
