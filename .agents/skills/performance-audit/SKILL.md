---
name: performance-audit
description: Use when asked to run a performance test/audit, measure Lighthouse or Core Web Vitals, analyze bundle size, or investigate slow page load on a frontend web app.
user-invocable: true
---

# Performance Audit

## Overview

Measure performance with real tools, then deliver a 3-tier report. **Measurement is mandatory — never report numbers you didn't generate from the tools below.**

**Core constraint:** Performance is improved WITHOUT touching design or UI. Any change that alters layout, visuals, markup, or behavior the user sees is out of scope for this skill (see FORBIDDEN).

## Required tools (MUST use all)

Run every audit through these four. If a tool is not in the repo, install it (dev dependency or `npx`):

| Tool | Purpose | Run |
|------|---------|-----|
| `lighthouse` | Lab scores + Core Web Vitals, one URL | `npx lighthouse <url> --output html --output-path <out>` |
| `unlighthouse` | Lighthouse across the **whole site** | `npx unlighthouse --site <url>` |
| `source-map-explorer` | What's actually inside each JS bundle | `npx source-map-explorer '<build>/**/*.js'` |
| `@next/bundle-analyzer` (webpack-bundle-analyzer) | Treemap of the webpack bundle | wrap `next.config`, then `ANALYZE=true <build cmd>` |

> Non-Next projects: use the `webpack-bundle-analyzer` plugin directly. `@next/bundle-analyzer` is the supported wrapper for Next.js.

## Scope rule

- **Default: homepage only.** Run `lighthouse` on the homepage.
- **Only when the user says "run on all"** → also run `unlighthouse` across the entire site.
- If the user names a specific URL, use that instead of the homepage.

## Procedure

1. **Detect the stack & build command.** Read `package.json`. Next.js → `next build`; otherwise the project's prod build script.
2. **Install missing tools** (skip any already present).
3. **Production build.** Audit the prod build, never the dev server. For source maps, ensure they're emitted (Next: `productionBrowserSourceMaps: true` temporarily; revert after).
4. **lighthouse** on the homepage (or given URL) → save HTML/JSON report.
5. **unlighthouse** across the site — **only if "run on all".**
6. **Bundle analysis:** `ANALYZE=true` build via `@next/bundle-analyzer` (Next) or `webpack-bundle-analyzer` (other).
7. **source-map-explorer** on the built JS to find heavy/duplicated modules.
8. **Third parties:** identify third-party scripts/SDKs and whether they hurt the score (render-blocking, large, long tasks).
9. **Timers:** scan for `setInterval`/`setTimeout` polling. **Prefer a native implementation** within the framework (e.g. event listeners, `IntersectionObserver`, `requestAnimationFrame`, React Query refetch, SWR) — flag intervals as findings.

## FORBIDDEN

- **Any change that affects design or the UI in any way** — layout, spacing, colors, fonts, copy, markup structure, visible behavior. Performance gains come from how things load/run, not how they look.
- Reporting scores not produced by the tools above.
- Auditing the dev server instead of a production build.
- Using `setInterval`/polling where a native primitive exists.
- Skipping a required tool because it "isn't installed" — install it.

## Report format (MUST contain 3 tiers)

Save the full report to a repo file — `docs/perf-report-<YYYY-MM-DD>.md` — and give a short summary in chat.

1. **Quick wins** — small, safe changes that raise the numbers with low risk and no retest of the whole app.
2. **Needs time** — changes that require regenerating reports to confirm the numbers improved: code refactoring, code splitting, dependency swaps — anything that can affect the whole site and needs retesting.
3. **UI changes needing business approval** — anything that would alter what the user sees (e.g. hiding/removing a loader that hurts the score). List the score impact; **do not implement** — these wait for business sign-off.

Each finding: what was measured (the number), the cause, the proposed change, and which tier it belongs to.

## After the report — ASK FIRST

The report is the deliverable. **Do NOT apply any edits or fixes automatically.** After presenting the report, stop and ask the user whether they want you to apply the changes and fix the issues — and which tiers. Only proceed on explicit approval.

## Common mistakes

| Mistake | Reality |
|---------|---------|
| "I'll estimate the scores" | Estimates are worthless. Run lighthouse and report real numbers. |
| "Tool isn't installed, skip it" | Install it. All four are required. |
| "I'll tweak the layout to boost LCP" | UI/design changes are FORBIDDEN here — put them in tier 3 for approval. |
| "setInterval is fine for polling" | Check for a native primitive first; intervals are a last resort. |
| "Run unlighthouse always" | Homepage only by default; whole-site only when the user says "run on all". |
| "Audit the dev server" | Dev builds aren't representative. Build for production first. |
