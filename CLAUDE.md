# Quran App — monorepo

Free, Arabic-first Quran app. Expo app for iOS and Android (phones, iPads, foldables) plus a self-hosted Laravel API. Built by one developer.

## Source of truth

- `docs/technical-spec.md` is the build spec. Read the section that covers what you're changing before you change it:
  - §1 overview and decisions · §2 architecture · §3 backend structure · §4 app structure and responsive layout
  - §5 MySQL schema · §6 device SQLite schema · §7 content pipeline · §8 API conventions · §9 endpoints
  - §10 auth · §11 user-data sync · §12 reader, audio, search · §13 notifications, environments, monitoring
  - §14 testing and CI · §15 delivery plan and cut lines · §16 open questions and risks
- `docs/content-plan.md` covers licensing, content sources and pinned library versions. On versions and licence rules it wins over the spec.
- If the code and the spec disagree, stop and ask. Don't silently pick one. When a decision changes, update the spec in the same change and add a short ADR in `docs/adr/`.

## Figma
https://www.figma.com/design/nwU9tRr75v8RrHunlKaA9U/Quran-App-%E2%80%94-Design?node-id=0-1&p=f&t=plhQVDpch4MTFQl4-0

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
2. **QF credentials live only in `apps/api` env.** The app calls only our API and the QF audio CDN.
3. **No QF data in the app binary.** The only bundled Quran text is the Tanzil seed. QF content reaches devices through packs and the change feed.
4. **Offline-first.** Every personal write goes to `user.db` + outbox first. The network is never on the path of a tap.
5. **Layout follows window size, never device model.** Use `useWindowClass()`; never branch on `Platform.isPad` or a device name.
6. **No generated religious content.** No AI summaries, rewrites or translations of Quran, tafsir or hadith.
7. **Arabic first, RTL.** All UI strings in i18n files; no hard-coded text.
8. **No secrets in the repo.** Env files and keys stay out of git.

## Commands

```bash
npm ci                                              # JS workspaces
docker compose -f infra/docker-compose.yml up -d    # MySQL, Redis, Mailpit
cd apps/api && composer install && php artisan migrate
cd apps/mobile && npx expo start
```

- Add Expo-managed packages with `npx expo install <pkg>`, never `npm install`.
- Before calling work done, run the checks for every app you touched:
  - API: `./vendor/bin/pint --test && ./vendor/bin/phpstan analyse && ./vendor/bin/pest --parallel`
  - Mobile: `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`
  - Contract (any endpoint change): regenerate `packages/api-contract/openapi.json` from the API, regenerate TS types, commit both.

## How to work here

- **Current phase: Phase 0, Setup and foundations** (spec §15). Work one deliverable at a time and keep each change small enough to review.
- Plan before coding anything that touches the schema, sync, the API contract or the reader.
- An endpoint change ships with its OpenAPI update and the app-side types in the same change.
- New dependency: check the content plan's version table first; no package without a release in the last 12 months.
- Write the tests the spec lists for a feature (§11 sync cases, §14 matrix) alongside the feature, not after.
