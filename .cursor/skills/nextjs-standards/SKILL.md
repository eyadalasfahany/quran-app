---
name: nextjs-standards
description: Use when writing, reviewing, or scaffolding ANY Next.js (App Router) code in a company project — components, pages, data fetching, forms, i18n, CDN Lambda images, types, tests, SEO, or performance work. Defines mandatory company engineering standards including custom image loader, centralized sizes presets, and grid-aligned deviceSizes.
user-invocable: true
---

# Next.js Standards

Mandatory engineering standards for every company Next.js (App Router) project. Apply these BEFORE writing or reviewing any Next.js code.

> Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

## How to use this skill

1. **Company rules first.** Find your task in the decision table and read the matching reference file in `references/`. The company rule wins.
2. **Mechanics second.** For *how the framework works*, read the linked official doc in `next-best-practices/` and `node_modules/next/dist/docs/`.
3. **Never invent.** If the standard doesn't cover something, read the docs in `node_modules/next/dist/docs/` — do not guess from memory.

**Reference implementations** of these patterns exist in company codebases; read real files to see a pattern in practice, but treat THIS skill (not any single project) as the source of truth — copy intent, not a project's incidental warts.

## Core principles (non-negotiable)

- **Server Components by default.** Add `'use client'` only at interactive leaves.
- **All data fetching goes through a `services/` function.** Components never import the axios instance directly.
- **Client-side fetching uses TanStack React Query** — `useQuery` for reads, `useMutation` for writes. Query keys live in `lib/queryKeys.ts`; never defined inline.
- **No `any`. No inline `as` assertions.** Use `unknown` + narrowing at the data boundary.
- **No hardcoded user-facing strings.** Everything through next-intl, keys mirrored across all locales.
- **No committed debug output.** No `console.log` / leftover debug in committed code.
- **Cache-first.** Default to caching/ISR; opt out of caching only with a reason.
- **Reuse before creating.** Check `components/common/`, `utils/`, `lib/`, `hooks/` before writing new code.
- **DRY + KISS.** No duplicated logic; no over-engineered abstractions. The simplest solution that works.
- **Self-documenting code.** Name functions, variables, and components so the reader understands intent without a comment. Add a comment only when the WHY is non-obvious — a hidden constraint, a workaround, a non-trivial invariant. Never comment what the code already says.

## Project structure (canonical)

These rules apply to **new and existing** projects. If a folder/utility below is missing, **create it in this shape** — don't invent a different layout.

```text
src/
  app/[locale]/            # App Router routes; pages/layouts are Server Components
  app/api/                 # route handlers — only for client/proxy/secret/webhook
  components/
    common/                # shared, generic components (reused 2+ places)
    <Feature>/             # feature-specific components
    common/form/           # shared Formik field components
  services/                # ALL data fetching wrapped here
  config/
    axios.ts               # shared axios instance
    APIConfig.ts           # server fetch helper (serverPageFetchRequest)
    clientAPI.ts           # client fetch helpers (generalGetRequest, generalPostRequest)
  lib/
    queryKeys.ts           # ALL React Query keys — one factory per endpoint
                           # business logic, transforms, schema builders
  utils/                   # small pure helpers (cn, getMetadata, …)
  hooks/                   # custom hooks + Zustand stores
  types/                   # shared API-response & cross-component types
  i18n/                    # next-intl routing/request config
messages/                  # en.json, ar.json, … (mirrored keys)
```

When a rule names a utility (e.g. a `services/` function, the axios instance, `getMetadata`), it means the company shape: **use it if present, create it in that shape if absent.** Never assume a specific project's files exist — build to the shape.

## Decision table

Find what you are doing → read the company reference → then the official mechanics doc.

| When you are… | Read (company rule) | Then mechanics → |
| --- | --- | --- |
| Building / reusing a component | [references/reusable-components.md](references/reusable-components.md) | `next-best-practices/file-conventions.md` |
| Deciding Server vs Client, or fetching page data | [references/serverside.md](references/serverside.md) | `next-best-practices/rsc-boundaries.md`, `data-patterns.md`, `async-patterns.md`, `directives.md` |
| Integrating an API / adding a route handler | [references/api-integrations.md](references/api-integrations.md) | `next-best-practices/route-handlers.md`, `data-patterns.md` |
| Building a form | [references/forms.md](references/forms.md) | — |
| Adding / using translations | [references/translation-files.md](references/translation-files.md) | `next-best-practices/file-conventions.md` |
| Writing types / interfaces | [references/types-interfaces.md](references/types-interfaces.md) | — |
| Writing tests | [references/tests.md](references/tests.md) | — |
| Rendering an image | [references/images.md](references/images.md) | `next-best-practices/image.md` |
| Auditing CDN Lambda images / `w` over-fetch | [references/cdn-lambda-image-audit.md](references/cdn-lambda-image-audit.md) | [references/images.md](references/images.md) |
| Adding metadata / SEO | [references/seo.md](references/seo.md) | `next-best-practices/metadata.md` |
| Optimizing perf / caching / bundling | [references/performance.md](references/performance.md) | `next-best-practices/bundling.md`, `suspense-boundaries.md` |

## Reference file format

Every file in `references/` follows the same shape so rules are unambiguous:

- **REQUIRED** — what you MUST do, with a copy-paste example.
- **FORBIDDEN** — anti-patterns, with the reason.
- **Checklist** — verify before commit.
- **Don't rationalize** — `excuse → reality` table closing loopholes.
- **Mechanics →** — pointer to the official doc; never re-taught here.

## Before you commit (master checklist)

Self-audit against the non-negotiables; each maps to a reference file:

- [ ] Server Component by default; `'use client'` only at interactive leaves — [serverside.md](references/serverside.md)
- [ ] All data fetched through a `services/` function; no direct axios in components — [api-integrations.md](references/api-integrations.md)
- [ ] Client-side reads use `useQuery`, writes use `useMutation`; keys from `lib/queryKeys.ts`, none inline — [api-integrations.md](references/api-integrations.md)
- [ ] No `any`, no compiler-silencing `as`; shared types in `types/` — [types-interfaces.md](references/types-interfaces.md)
- [ ] No hardcoded user-facing strings; keys mirrored across all locales — [translation-files.md](references/translation-files.md)
- [ ] Forms use Formik + Yup + shared field components — [forms.md](references/forms.md)
- [ ] Images use `<Image>` + CDN Lambda loader + centralized `getImageSizes()` presets — [images.md](references/images.md)
- [ ] Every route exports metadata via `getMetadata` — [seo.md](references/seo.md)
- [ ] Cache-first; heavy client libs dynamically imported — [performance.md](references/performance.md)
- [ ] Yup schemas extracted to `lib/` with tests (required/format/min cases); all other logic/transforms tested — [tests.md](references/tests.md)
- [ ] No committed `console.log` / debug output.
- [ ] No duplicated logic; names are self-explanatory; comments only where the WHY is non-obvious.

## Verify before done (mandatory)

After completing ANY Next.js work, you MUST run — and pass — both before claiming the task is done:

```bash
npx tsc --noEmit     # TypeScript type check — zero errors
npm run build        # production build — must succeed
```

Do not report work as complete, commit, or open a PR until **both pass clean**. If either fails, fix it — a green type check and build are the minimum bar, not optional.

**Never auto-commit.** Do not run `git commit`, `git push`, or open a PR unless the user explicitly tells you to. Make the changes, run the checks, report the result — then stop and wait for the user to decide on committing.

## Anything not covered here

Read `node_modules/next/dist/docs/` and the `next-best-practices/` skill. Do not guess from training data.
