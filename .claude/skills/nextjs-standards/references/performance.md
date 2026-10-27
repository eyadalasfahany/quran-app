# Performance & Caching

> Company rule for caching strategy, data-fetching performance, and bundle/runtime performance. Mechanics → `next-best-practices/bundling.md`, `suspense-boundaries.md`, `data-patterns.md`, `image.md`, `font.md`. Cache Components / PPR → `next-cache-components/SKILL.md`.

## Caching — cache-first (company standard)

### Caching — REQUIRED

- **Default to caching / ISR.** Pass a sensible `revalidate` (seconds) to data fetches; let static content stay static.
- **Opt out of caching only with a reason** (truly live / per-request data) — and only for that one fetch/route, not globally.
- Use Next's primitives deliberately: `revalidate`, `'use cache'`, route segment config, `staleTimes`.
- **Invalidate after writes:** `revalidatePath` / `revalidateTag` in Server Actions or route handlers; invalidate matching React Query keys after client mutations ([api-integrations.md](api-integrations.md)).

```ts
// cache-first default in the service layer
return serverPageFetchRequest(`/items/${slug}`, isValidItem, 60, locale); // revalidate 60s

// live data — scoped opt-out, with a reason:
return serverPageFetchRequest(`/quote/${id}`, isValidQuote, 0, locale);   // pricing must be live
```

```ts
'use server';
import { revalidateTag } from 'next/cache';

export async function updateItem(id: string, formData: FormData) {
  await updateItemService(id, formData);
  revalidateTag(`item-${id}`);
}
```

### Caching — FORBIDDEN

- Blanket `no-store` / `revalidate: 0` everywhere "to be safe."
- Disabling caching globally in `next.config` headers without a documented reason.
- Mutations that leave stale server or client cache with no invalidation.

## Client cache — React Query (complements server `revalidate`)

Server ISR and client React Query are two cache layers. Configure the **client defaults once** where `QueryClientProvider` is mounted — not repeated on every `useQuery`.

### REQUIRED

- Set global query defaults in `QueryClient` `defaultOptions.queries`:
  - `staleTime` — align with server `revalidate` where sensible (e.g. `60_000` when server uses `revalidate: 60`).
  - `gcTime` — keep cached data long enough for back-navigation (e.g. `10 * 60_000`).
  - `refetchOnWindowFocus: false` — unless the product requires live-on-focus data.
- **Override per-query only when data must be live** (`staleTime: 0`) — same rule as scoped server opt-out.

```tsx
// QueryClientProvider wrapper — cache defaults live here, once
"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,              // mirrors server revalidate: 60
            gcTime: 10 * 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

```tsx
// inherits global defaults — no per-query staleTime needed
useQuery({
  queryKey: queryKeys.items.detail(slug, locale),
  queryFn: () => getItemClient(slug, locale),
});

// live data — scoped per-query opt-out, with a reason
useQuery({
  queryKey: queryKeys.quote.detail(id),
  queryFn: () => getQuoteClient(id),
  staleTime: 0,
});
```

### FORBIDDEN

- Leaving `staleTime` unset (React Query defaults to `0` → refetch on every mount).
- Copy-pasting `staleTime` / `gcTime` onto every `useQuery` when the global default is correct.
- Setting per-query cache times that contradict the global policy without a reason.

## Data fetching — avoid waterfalls

### REQUIRED

- **Fetch independent data in parallel** on the server with `Promise.all`.
- **Pre-generate known paths** with `generateStaticParams` where slugs are finite and known at build time.
- Page/route data still flows through `services/` ([serverside.md](serverside.md), [api-integrations.md](api-integrations.md)).

```tsx
// parallel — unrelated fetches on the same page
const [item, related] = await Promise.all([
  getItem(slug, locale),
  getRelatedItems(slug, locale),
]);
```

### FORBIDDEN

- Sequential `await` for unrelated data on the same page.
- Client-side fetch waterfalls when the data could be fetched on the server.

## Rendering & perceived performance

### REQUIRED

- Add **`loading.tsx`** on data-heavy routes so users see feedback immediately — not a blank screen. Use a **skeleton** or **reuse the project's existing shared loader** from `components/common/`; do not invent a one-off spinner per route.
- Wrap client hooks that force CSR bailout (`useSearchParams`, `usePathname` on dynamic routes) in **`<Suspense>`** with a meaningful fallback. Mechanics → `suspense-boundaries.md`.
- **LCP image:** `priority` on the single above-the-fold hero image only. See [images.md](images.md) for CDN Lambda loader, centralized `sizes` presets, and mobile cap rules.
- **Third-party scripts** (analytics, chat, maps, tag managers) via `next/script` with `strategy="lazyOnload"` or `afterInteractive` — never blocking `<script>` tags in root layout.
- **Maps and heavy embeds:** dynamic-import the wrapper; load only when the user needs it.
- **Link prefetch:** default on for primary navigation; `prefetch={false}` on low-priority links (footer, modals, one-off CTAs, heavy destination pages).
- **Long lists** (> ~50 items): virtualize instead of rendering every row in the DOM.

```tsx
// Suspense for a client hook that needs search params
import { Suspense } from "react";
import SearchResults from "./SearchResults";

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}> {/* skeleton or the project's shared loader */}
      <SearchResults />
    </Suspense>
  );
}
```

```tsx
import Script from "next/script";

<Script src="https://example.com/analytics.js" strategy="lazyOnload" />
```

### FORBIDDEN

- Blocking the entire page on one slow section when others could stream.
- `priority` on every image — only the LCP candidate.
- Synchronous third-party scripts in root layout.
- Rendering hundreds of list rows without virtualization.

## Core Web Vitals — CLS (Cumulative Layout Shift)

Layout shift hurts UX and Core Web Vitals. Reserve space **before** content loads so the page does not jump.

### REQUIRED

- **Images** — follow [images.md](images.md) in full; these rules exist partly to prevent CLS:
  - Always use `<Image>` (never raw `<img>`).
  - Always set `width`/`height` **or** `fill` on a sized parent (`position: relative` + explicit height/aspect-ratio).
  - Always set `sizes` derived from the actual container layout — wrong `sizes` can fetch the wrong dimensions and cause shift.
  - `priority` only on the LCP hero; everything else lazy-loads by default.
- **Loading UI** (skeleton, shared loader, or placeholder) must match the final layout dimensions (`min-h`, `aspect-ratio`, fixed width/height) — not a tiny spinner where a 400 px card will appear. Reuse the project's loader when one exists.
- **Fonts** via `next/font` with a fallback that closely matches metrics — mechanics → `next-best-practices/font.md`.
- **Dynamic content** (tabs, accordions, carousels, modals): reserve space for the largest expected state, or reveal content without pushing siblings (transform/opacity — not height/width).
- **Ads, embeds, iframes:** set explicit `width`/`height` or `aspect-ratio` on the container before the embed loads.

```tsx
// sizes from getImageSizes() — see images.md
<div className="relative aspect-[16/9] w-full">
  <Image src={src} alt={alt} fill sizes={getImageSizes('fullWidth')} className="object-cover" />
</div>
```

```tsx
// skeleton matches final card dimensions
<div className="min-h-[400px] w-full animate-pulse rounded-lg bg-muted" />
```

### FORBIDDEN

- Raw `<img>` without reserved dimensions.
- Omitting `width`/`height` or a sized `fill` parent.
- Loading UI (skeleton or loader) that is much smaller than the content it replaces.
- Injecting banners, toasts, or cookie bars that push page content down without a reserved slot.
- Animating **layout properties** (`width`, `height`, `top`, `left`, `margin`, `padding`) to reveal content — use transform/opacity and reserve space with `min-height` / `aspect-ratio`.

## Hydration & client boundaries

### REQUIRED

- Pass **only the props a client leaf needs** — not the full API response. Smaller RSC payloads = faster hydration.
- Keep `'use client'` boundaries **small and deep** in the tree ([serverside.md](serverside.md)).
- Scope context providers to the subtree that needs them — avoid wrapping the entire app in a client provider that triggers wide re-renders.

### FORBIDDEN

- `'use client'` on a layout just to host a provider only one subtree needs.
- Passing non-serializable or oversized props across the server→client boundary.

## Bundle & runtime

### Bundle — REQUIRED

- **Lazy-load heavy client libraries** (animation/canvas/carousel/chart/map — e.g. recharts, mapbox-gl, swiper) via `next/dynamic` / dynamic `import()`, client-side, below the fold.
- Keep heavy deps out of the shared/server bundle; keep client components small.
- Images via the Lambda loader ([images.md](images.md)); fonts via `next/font`.
- **Run bundle analysis** when adding a dependency that is large or pulls in animation/map/chart code. Mechanics → `next-best-practices/bundling.md` (`next experimental-analyze`).
- Prefer **tree-shakeable named imports**; avoid barrel files that pull entire packages.
- Keep **`middleware.ts` lean** — no API calls or heavy logic on every request.

```tsx
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("./Chart"), {
  ssr: false,
  loading: () => <div className="min-h-[400px]" />,
});
```

- **Prefer native primitives over `setInterval`/polling.** Use the framework's native mechanism (event listeners, `IntersectionObserver`, `requestAnimationFrame`, React Query/SWR refetch) before reaching for a timer. Intervals are a last resort, scoped and cleaned up.

### Bundle — FORBIDDEN

- Importing a heavy animation/canvas/chart lib at the top of a shared module.
- Shipping large client bundles when the work could be server-side.
- `setInterval`/polling where a native primitive does the job.

## Running a performance test

To actually **measure** performance (Lighthouse, bundle analysis, Core Web Vitals) and produce a report, use the dedicated **performance-audit** skill (`frontend/performance-audit`). It mandates the tool set (lighthouse, unlighthouse, source-map-explorer, @next/bundle-analyzer), the homepage-by-default scope, the no-UI-change constraint, and the 3-tier report format.

## Checklist

- [ ] Server caching on by default; opt-outs scoped + justified.
- [ ] Mutations invalidate server cache (`revalidateTag`/`revalidatePath`) and/or React Query keys.
- [ ] `QueryClient` defaults set at provider setup (`staleTime`, `gcTime`, `refetchOnWindowFocus`); per-query overrides only for live data.
- [ ] Independent server fetches run in parallel (`Promise.all`).
- [ ] Data-heavy routes have `loading.tsx` / targeted Suspense (skeleton or project's shared loader).
- [ ] LCP image has `priority`; below-fold media is lazy.
- [ ] Images follow [images.md](images.md) (`<Image>`, dimensions/`fill`, `sizes`, loader) — CLS-safe.
- [ ] Loading UI (skeleton, shared loader, or placeholder) matches final content dimensions.
- [ ] Third-party scripts use `next/script` with a non-blocking strategy.
- [ ] Client leaves receive minimal serializable props.
- [ ] Heavy client libs dynamically imported (`ssr: false` where DOM-only).
- [ ] New heavy deps checked with bundle analysis.
- [ ] Images/fonts optimized per their refs.

## Don't rationalize

| Excuse | Reality |
| ------ | ------- |
| "no-store everywhere is safest" | It wastes the platform. Cache-first; opt out per-case with a reason. |
| "I'll set staleTime on each useQuery" | Set it once on `QueryClient` at provider setup. Override per-query only for live data. |
| "React Query refetches anyway, staleTime doesn't matter" | Default `staleTime: 0` refetches on every mount. Configure it at provider setup. |
| "I'll fetch B after A even though they're unrelated" | Sequential awaits add latency. `Promise.all` for independent data. |
| "No loading state — the page is fast enough" | Perceived perf matters. Show something immediately — `loading.tsx` with a skeleton or the project's shared loader. Blank screens are not acceptable. |
| "Prefetch everything" | Prefetching heavy routes wastes bandwidth. Disable on low-priority links. |
| "I'll add analytics in `<head>` synchronously" | Blocks parsing. Use `next/script` with `lazyOnload`. |
| "Pass the whole API object to the client leaf" | Bloats the RSC payload and slows hydration. Trim props. |
| "Dynamic import is extra work" | Heavy libs in the main bundle tank load time. Lazy-load them. |
| "I'll import an animation lib at the top, it's fine" | Pulls it into the bundle for everyone. Import it in the client leaf that uses it. |
| "I'll animate height to reveal content" | Layout animations cause CLS and jank. Use transform/opacity; reserve space with `min-height`. |
| "No width/height on images — CSS handles it" | Browser can't reserve space without dimensions. Follow [images.md](images.md). |
| "A small skeleton/loader is fine" | Content jumping in causes CLS. Match loading UI size to final layout. |
