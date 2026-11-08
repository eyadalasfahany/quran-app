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
- `screens/` (ADR 0075): phone screens, states, and the expanded-window sidebar.
  - One frame per file: `screens/frames/<section>/<FrameId>.html`. `screens/index.html` combines them (open it in a browser; frames load as you scroll).
  - Shared styles, script and images live once, in `screens/screens.css`, `screens/screens.js` and `design-assets/`. Never copy them into a frame, and never inline an image as base64.
  - Edit only the frame file you're changing. To add a frame, copy a sibling in the same section, then add its `gx-fig` block with the iframe to `index.html`.
  - `npm run check:html -w @quran/design-tokens` checks the folder.
- Layouts these don't cover are drawn there from the existing tokens and approved before code.
- Figma (https://www.figma.com/design/nwU9tRr75v8RrHunlKaA9U/Quran-App-%E2%80%94-Design) is optional reference only.

## Layout

```
apps/api/              Laravel 13, PHP 8.5 — see apps/api/CLAUDE.md
apps/mobile/           Expo SDK 58, TypeScript — see apps/mobile/CLAUDE.md
packages/api-contract/ openapi.json generated from the API + generated TS types
packages/design-tokens/ colors, spacing, radii, type scale
packages/quran-text-check/ 6,236-ayah checksum tool (API CI and app CI)
screens/               screen designs, one file per frame (ADR 0075)
design-assets/         images shared by the screen designs
website/               taybah-app.com, static HTML on Vercel — see website/CLAUDE.md
infra/                 docker-compose.yml, Caddyfile, deploy scripts
docs/                  spec, content plan, ADRs, runbooks
```

npm workspaces cover `apps/mobile` and `packages/*`. Composer lives inside `apps/api`. No Turborepo or Nx.

## Non-negotiables

1. **Quran text is never altered.** Store and render source text byte-for-byte. Never trim, normalize, re-encode or hand-edit it. Only the derived `text_search` column is normalized. The checksum test must pass.
2. **QF credentials live only in `apps/api` env.** The app calls only our API, the audio URLs QF's API returns (ADR 0008), Taybah's own audio host `audio.taybah-app.com` on Cloudflare R2 (bucket `quran`) for MP3Quran and Way2Quran reciters (ADR 0061, 0074), and QF's public font CDN `verses.quran.foundation` for mushaf fonts (ADR 0011). Our API never serves or repackages QF font files.
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

- **Current phase: Phase 7, الحديث (Hadith: full collections)** (ADR 0042, plan `docs/plans/phase-7.md`), built and on the server (steps 2–17 done, 7 Nov 2026; all ten collections complete, chapters and book titles from OpenITI, 73 «غير متوفر حاليًا» notes). **Waiting for the developer:** the app release (`eas update --channel production`; no native change) and an English-UI look on a device. The source is fawazahmed0/hadith-api, pinned to a commit, with chapter titles and text gaps from OpenITI (ADR 0076). **Every hadith collection that ships must be complete**: every hadith with its text and book, filled from OpenITI or hadithapi.com when confirmed; a hadith that no source has is shown as an honest «غير متوفر حاليًا في المصدر» note in its place, never silently skipped (developer rule, 7 Nov 2026, ADR 0076). Grades are hidden, and there is no content reviewer. Sunnah.com's key is pending, and HadeethEnc (daily hadith, topics) is deferred.
  - **Done (developer, 6 Nov 2026):** Phases 0–6, including the Phase 4 and Phase 5 exit checks and Azkar in production (ADR 0031, 0045).
  - **Shipped:** the follow-ups (widgets and watch ADR 0035, Names, Hijri and Moon ADR 0043, Duas ADR 0044), the store release (v1.0.2), and the suggestions form on the website, the API and the app (ADR 0066).
  - **Rules:** v1 is local-only (ADR 0027). Work one step at a time and keep each change small enough to review. Check the branch with `git branch --show-current`. The developer now works on `main` unless they name a branch.
- **Releasing the app: OTA by default (developer, 6 Nov 2026).** Ship app changes as an EAS Update (`eas update --channel production`), not a new store build.
  - **When a store build is needed instead:**
    - A package was installed or upgraded in `apps/mobile`.
    - The native fingerprint changed for another reason: a config plugin, a native field in `app.config.ts`, or an Expo SDK upgrade.
  - **Why:** `runtimeVersion` uses the `fingerprint` policy, so an update only reaches builds with the same fingerprint. Check before publishing with `npx eas-cli fingerprint:compare`, or compare `npx expo-updates fingerprint:generate` against the store build.
  - Details: `apps/mobile/CLAUDE.md`, «Releasing».
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
  - **Review against the HTML:** every review compares the built UI with its frame in `screens/` (`screens/frames/<section>/<FrameId>.html`; tokens and components in `quran-app-design-system.html`). It must be identical to the frame unless the developer has approved a difference (recorded in an ADR or the step brief). A mismatch fails the review.
  - **Visual check:** the review also compares a screenshot of the running app on the **iPhone 17 simulator** (`xcrun simctl io booted screenshot`) with the frame rendered at 390 × 844 (`python3 packages/design-tokens/scripts/frame-shot.py <frame-id> <out.png>`, headless Chrome; frame ids are the `gx-fig` ids, e.g. `ReaderSettings`). Unit tests and style values alone don't pass a UI review.
- **Delegation rule (every agent):** implementation tasks go to a subagent on the cheapest available model (Haiku). The orchestrating agent writes the brief, then reviews the diff against the spec and the HTML screens before the developer commits.

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (90-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk vitest run          # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->