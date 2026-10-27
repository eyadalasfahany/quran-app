# Server-Side Rendering & Data Fetching

> Company rule for Server vs Client Components and where page data is fetched. Mechanics → `next-best-practices/rsc-boundaries.md`, `data-patterns.md`, `async-patterns.md`, `directives.md`. (Caching → [performance.md](performance.md). Building the service/route → [api-integrations.md](api-integrations.md).)

## REQUIRED

- **Server Components by default.** A component has NO directive unless it needs the client.
- **Add `'use client'` only at interactive leaves** — components that use `useState`/effects, event handlers, browser APIs, or context. Keep them small and low in the tree.
- **Fetch page/route data in the Server Component**, through a `services/` function. Pass plain (serializable) data down as props.
- **Client-side fetching only for interactive / post-mount / auth-gated data** — and still through a `services/` function ([api-integrations.md](api-integrations.md)).
- **Await async APIs.** `params`, `searchParams`, `cookies()`, `headers()` are async (Next 15+) — always `await`.

## Canonical example

Server page fetches via a service and passes plain data to a small client leaf. (If `services/` doesn't exist yet, create it in the shape shown in [api-integrations.md](api-integrations.md).)

```tsx
// app/[locale]/projects/[slug]/page.tsx  — Server Component (no directive)
import { getProject } from "@/src/services/projects";
import ProjectActions from "@/src/components/Projects/ProjectActions";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export default async function Page({ params }: PageProps) {
  const { locale, slug } = await params;        // async params — await
  const project = await getProject(slug, locale); // fetch via services/

  return (
    <article>
      <h1>{project.title}</h1>
      {/* interactivity isolated to a small client leaf */}
      <ProjectActions projectId={project.id} />
    </article>
  );
}
```

```tsx
// components/Projects/ProjectActions.tsx — client leaf, only because it needs state/handlers
"use client";
import { useState } from "react";

export default function ProjectActions({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return <button onClick={() => setOpen((v) => !v)}>{open ? "Close" : "Enquire"}</button>;
}
```

The page stays a Server Component; only `ProjectActions` is `'use client'`.

## FORBIDDEN

- `'use client'` at the top of a page/layout just to use one hook — push the client boundary down into a leaf instead.
- Fetching page content from the client (waterfalls, no SEO).
- Importing the axios instance directly in a component (go through `services/`).
- Passing non-serializable props (functions, class instances) across the server→client boundary.

## Recommended (not mandatory)

- `loading.tsx` (Suspense fallback) and `error.tsx` (error boundary) per data route — prevents blank/janky states. Mechanics → `next-best-practices/error-handling.md`.

## Checklist

- [ ] No `'use client'` unless the component truly needs the client.
- [ ] Page data fetched server-side through a `services/` function.
- [ ] `params`/`searchParams`/`cookies`/`headers` awaited.
- [ ] Client boundary is a small leaf, as deep as possible.
- [ ] Only serializable props cross the boundary.

## Don't rationalize

| Excuse | Reality |
|--------|---------|
| "Whole page needs one click handler, so mark it client" | Extract the interactive part into a small client leaf; keep the page server. |
| "Client fetch is easier" | Server fetch = SEO + no waterfall. Client only for interaction. |
| "I'll await params later / destructure directly" | `params` is a Promise in Next 15+. Await it or it breaks. |
| "Passing a callback prop to a client child is fine" | Functions aren't serializable across server→client. Restructure. |
