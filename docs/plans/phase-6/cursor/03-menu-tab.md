# Prompt 3 — القائمة tab and menu screen (ADR 0032)

You are working in the Taybah monorepo, Expo app `apps/mobile`, branch `ft/azkar`. Don't commit, add dependencies, or edit `apps/mobile/android/`.

**The Salah feature must not change** (developer, 1 Nov 2026). Do not edit anything under `src/features/salah/**` or `app/(main)/(salah)/**`. Only the tab-bar **item** changes. The Salah screen and its route stay exactly as they are and are opened from the menu.

**Read first:** @AGENTS.md @apps/mobile/CLAUDE.md @.claude/agent-rules.md @docs/adr/0032-menu-tab.md @docs/adr/0030-salah-qibla-on-device.md (§4) @apps/mobile/src/core/layout/destinations.ts @apps/mobile/app/(main)/_layout.tsx @apps/mobile/src/core/layout/MainShell.tsx @apps/mobile/__tests__/router.test.tsx.

**Frames (approved):** `Menu`, `MenuDark`, `MenuEnglish`, `MainMenuTab`. Render them with `python packages/design-tokens/scripts/frame-shot.py <id> <out.png>` and match them.

**Navigation:**
- **Tab bar order** (first is rightmost in RTL): الرئيسية، المصحف، مصحفي (centre)، الاستماع، **القائمة**.
  - New destination `(menu)`: href `/(main)/(menu)`, label `tabs.menu` («القائمة» / "Menu"), SF symbol `line.3.horizontal`, Material icon `menu`, testID `menu`.
  - Route `app/(main)/(menu)/index.tsx`, rendering `MenuScreen`.
- **Hide الصلاة's tab item; keep its route.** `app/(main)/(salah)/index.tsx` stays registered under `(main)` but has **no visible tab item**. Check how `expo-router/native-tabs` hides a route (for example a hidden `NativeTabs.Trigger` or a hidden option) in the installed `expo-router` version, and use that. If it can't be hidden, stop and report.
- **Sidebar unchanged** (expanded windows): مصحفي، الرئيسية، المصحف، الاستماع، الصلاة. Split `destinations.ts` into a full destination list, `tabDestinations` (with `(menu)` instead of `(salah)`) and `sidebarDestinations` (still including `(salah)`). Do not add القائمة to the sidebar.
- Update `destinations.test.ts`, `MainShell.test.tsx` and `__tests__/router.test.tsx` for the new tab list. The sidebar expectations stay as they are.

**Menu screen** (`src/features/menu/{components,screens}`):
- **Components:**
  - `MenuCard`: icon, caption, Amiri title, optional preview line, optional thin progress bar; the whole card is one button with an accessibility label and hint; 44 pt+
  - `MenuGrid`: two staggered columns; items alternate between columns, and columns mirror in LTR
  - `MenuSearchButton`: floating, bottom-leading, above the tab bar, opening `/search`
  - `MenuScreen`: composes the components
- **Cards and their live previews** (read-only use of existing hooks; don't modify them):
  - **الصلاة** → `router.navigate('/(main)/(salah)')`. Preview: the next prayer name and time, from `usePrayerLocation`, `useTodayTimes`, `useNextPrayer`, `useNow` (imported, **not edited**). Without a location, a neutral subtitle.
  - **الأذكار** → `/azkar`, **only when** `useAzkarAvailable()`. Preview from `useContinueScope` («أذكار الصباح · ١٢ من ٢٤» with a bar), or a subtitle.
  - **القبلة** → `/salah/qibla`. Preview: the bearing via `qiblaBearing` when there's a location.
  - **الختمة** → `/khatma`. Preview: today's progress when a plan is active.
  - **المصحف**, **الاستماع**, **مصحفي** → their tabs.
  - **البحث** → `/search`.
  - **الإعدادات** → `/settings`.
  - **المصادر والشكر** → `/settings/sources`.
  - Downloads: link it only if a downloads route exists; otherwise leave it out.
- **Strings:** add every string under `menu.*` and `tabs.menu` in `ar.json` and `en.json`. Counts use Arabic-Indic digits in Arabic.

**Tests:**
- every component (render, variants, press, Arabic and English, accessibility)
- `MenuScreen`: the Azkar card hidden without content; previews hidden without data
- navigation: five tabs in the new order; the Salah route still reachable; the sidebar unchanged

**Gates** (Node 26, `apps/mobile`): `npm run lint`, `npx tsc --noEmit` (0), `npx jest src/features/menu src/core/layout __tests__`. **Confirm `git diff --stat -- apps/mobile/src/features/salah 'apps/mobile/app/(main)/(salah)'` is empty.**

**Report:** files, test counts, gates, and the Salah no-change confirmation.
