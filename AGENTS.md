# Quran App — monorepo

**Taybah** («طيبة»): a free, Arabic-first Quran app. Bundle ID `com.taybahapp.taybah`. Expo app for iOS and Android (phones, iPads, foldables) plus a self-hosted Laravel API. Built by one developer.

## Source of truth

- `docs/technical-spec.md` is the build spec. Read the section that covers what you're changing before you change it:
  - §1 overview and decisions · §2 architecture · §3 backend structure · §4 app structure and responsive layout
  - §5 MySQL schema · §6 device SQLite schema · §7 content pipeline · §8 API conventions · §9 endpoints
  - §10 auth · §11 user-data sync · §12 reader, audio, search · §13 notifications, environments, monitoring
  - §14 testing and CI · §15 delivery plan and cut lines · §16 open questions and risks
- `docs/content-plan.md` covers licensing, content sources and pinned library versions. On versions and licence rules it wins over the spec.
- If the code and the spec disagree, stop and ask. Don't silently pick one. When a decision changes, update the spec in the same change and add a short ADR in `docs/adr/`.

## Design source (ADR 0010)
- `quran-app-design-system.html`: tokens and components.
- `quran-app-screens.html`: phone screens, states, and the expanded-window sidebar.
- Layouts these don't cover are drawn there from the existing tokens and approved before code.
- Figma (https://www.figma.com/design/nwU9tRr75v8RrHunlKaA9U/Quran-App-%E2%80%94-Design) is optional reference only.

## Layout

```
apps/api/              Laravel 13, PHP 8.5 — see apps/api/CLAUDE.md
apps/mobile/           Expo SDK 58, TypeScript — see apps/mobile/CLAUDE.md
packages/api-contract/ openapi.json generated from the API + generated TS types
packages/design-tokens/ colors, spacing, radii, type scale
packages/quran-text-check/ 6,236-ayah checksum tool (API CI and app CI)
infra/                 docker-compose.yml, Caddyfile, deploy scripts
docs/                  spec, content plan, ADRs, runbooks
```

npm workspaces cover `apps/mobile` and `packages/*`. Composer lives inside `apps/api`. No Turborepo or Nx.

## Non-negotiables

1. **Quran text is never altered.** Store and render source text byte-for-byte. Never trim, normalize, re-encode or hand-edit it. Only the derived `text_search` column is normalized. The checksum test must pass.
2. **QF credentials live only in `apps/api` env.** The app calls only our API, the audio URLs QF's API returns (ADR 0008), and QF's public font CDN `verses.quran.foundation` for mushaf fonts (ADR 0011). Our API never serves or repackages QF font files.
3. **No QF data in the app binary.** The only bundled Quran text is the Tanzil seed. QF content reaches devices through packs and the change feed.
4. **Offline-first.** Every personal write goes to `user.db` + outbox first. The network is never on the path of a tap.
5. **Layout follows window size, never device model.** Use `useWindowClass()`; never branch on `Platform.isPad` or a device name.
6. **No generated religious content.** No AI summaries, rewrites or translations of Quran, tafsir or hadith.
7. **Arabic first, RTL.** All UI strings in i18n files; no hard-coded text.
8. **No secrets in the repo.** Env files and keys stay out of git.

## Commands

Local toolchain: PHP 8.5 from Homebrew (`php`), Node 26 through nvm (`nvm use` reads `.nvmrc`).

```bash
npm ci                                              # JS workspaces
brew services start mysql redis                     # Homebrew MySQL (3306) and Redis (6379)
cd apps/api && composer install && php artisan migrate && php artisan serve   # http://localhost:8000
cd apps/mobile && npx expo start
```

No Docker or Caddy locally for now (ADR 0003, 0004); first-time MySQL user setup is in `docs/runbooks/local-setup.md`. Mail goes to the log. `infra/docker-compose.yml` is kept but unused.

- Add Expo-managed packages with `npx expo install <pkg>`, never `npm install`.
- Before calling work done, run the checks for every app you touched:
  - API: `composer qa` (runs `pint --test`, `phpstan analyse`, `pest --parallel`)
  - Mobile: `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`
  - Contract (any endpoint change): `npm run generate -w @quran/api-contract` (Scramble export, then `openapi-typescript`), commit `openapi.json` and `src/schema.d.ts`.
  - Dependencies changed: `node .github/scripts/npm-audit.mjs` and `composer audit`. An npm advisory that can't be fixed goes in `.github/audit-allowlist.json` with a reason and a `reviewBy` date, and only after the developer agrees.

## How to work here

- **Current phase: Phase 6, الأذكار (Azkar)** on branch `ft/azkar` (spec §15, ADR 0031). The plan is `docs/plans/phase-6.md`. Production Azkar content is blocked until OpenDua confirms rights in writing (ADR 0031 release blockers). Open work in earlier phases: Phase 4 step 5 (exit check) and Phase 5 steps 4 (prayer notifications) and 6 (exit check). Phases 0–3 are done. v1 is local-only (ADR 0027). Work one step at a time and keep each change small enough to review.
- Laravel code follows the `laravel-standards` skill, except where the spec wins (ADR 0002). Design tokens and UI components come from the HTML design files above (ADR 0010).
- The developer commits and pushes. Don't commit unless asked.
- Plan before coding anything that touches the schema, sync, the API contract or the reader.
- An endpoint change ships with its OpenAPI update and the app-side types in the same change.
- New dependency: check the content plan's version table first; no package without a release in the last 12 months.
- Write the tests the spec lists for a feature (§11 sync cases, §14 matrix) alongside the feature, not after.
- **Frontend rule (every agent, every phase):**
  - **Components:** every UI component is its own file, in `apps/mobile/src/shared/ui/` (design system) or `src/features/<feature>/components/`.
  - **Tests:** each component has its own colocated test file (`ComponentName.test.tsx`) covering render, variants and props, interaction, RTL, and its accessibility role and label.
  - **Screens:** screens (`app/` routes and feature screens) only compose these components, with no one-off styled UI built inside a screen.
  - **Design:** all UI work follows the `apple-design` skill (`.agents/skills/apple-design/SKILL.md`, Apple HIG). Read it before building UI, and check the result against it before calling the work done.
  - **Review against the HTML:** every review compares the built UI with its frame in `quran-app-screens.html` (tokens and components in `quran-app-design-system.html`). It must be identical to the frame unless the developer has approved a difference (recorded in an ADR or the step brief). A mismatch fails the review.
  - **Visual check:** the review also compares a screenshot of the running app on the **iPhone 17 simulator** (`xcrun simctl io booted screenshot`) with the frame rendered at 390 × 844 (`python3 packages/design-tokens/scripts/frame-shot.py <frame-id> <out.png>`, headless Chrome; frame ids are the `gx-fig` ids, e.g. `ReaderSettings`). Unit tests and style values alone don't pass a UI review.
- **Delegation rule (every agent):** implementation tasks go to a subagent on the cheapest available model (Haiku). The orchestrating agent writes the brief, then reviews the diff against the spec and the HTML screens before the developer commits.
