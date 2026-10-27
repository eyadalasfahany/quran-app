# SEO & Metadata

> Company rule for page metadata. Mechanics → `next-best-practices/metadata.md`. Localization → [translation-files.md](translation-files.md).

## REQUIRED

- **Every route exports metadata.** Static via `export const metadata`; data-driven via `export async function generateMetadata`.
- **Build metadata through the shared `getMetadata` helper** (`utils/getMetadata`) so every page produces a consistent shape. Create it in the shape below if absent.
- **`getMetadata` must produce:** localized `title` + `description` (resolve `{ en, ar }` CMS fields for the active locale), `openGraph` + `twitter` (with **absolute** image URLs), `alternates.canonical`, and `robots: "noindex, nofollow"` on non-production envs.
- **Always provide a placeholder fallback** when CMS data is missing — never ship an empty/default title.

## Canonical example

```tsx
// app/[locale]/projects/[slug]/page.tsx
import type { Metadata } from "next";
import getMetadata from "@/src/utils/getMetadata";
import { getProject } from "@/src/services/projects";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getProject(slug, locale);
  return getMetadata(`/projects/${slug}`, `/projects/${slug}`, locale, data);
}
```

`getMetadata` shape (server-only; uses `headers()` for the base URL; **no `console.log`**):

```ts
// utils/getMetadata.ts — responsibilities, not the whole impl
export default async function getMetadata(
  route: string,
  pageRoute: string,
  locale = "en",
  fetchedData?: CmsMetaPayload | null,
  revalidate = 24,
): Promise<Metadata> {
  // 1. baseUrl from x-forwarded-host/host + proto
  // 2. data = fetchedData ?? (await serverPageFetchRequest(route, revalidate, locale))
  // 3. if no data -> placeholder metadata
  // 4. resolve localized title/description (pick locale from { en, ar })
  // 5. absolute OG image URL; openGraph + twitter + alternates.canonical
  // 6. robots "noindex,nofollow" unless NEXT_PUBLIC_PRODUCTION_ENV === "true"
}
```

## FORBIDDEN

- A route with no metadata / default boilerplate title.
- Hand-building metadata ad hoc when `getMetadata` covers it.
- Hardcoded, non-localized titles/descriptions.
- Relative OG/Twitter image URLs (must be absolute).
- Indexable metadata on non-production environments.

## Checklist

- [ ] Route exports `metadata` or `generateMetadata`.
- [ ] Built via the shared `getMetadata` helper.
- [ ] Title/description localized; placeholder fallback present.
- [ ] OG + Twitter (absolute images) + canonical set.
- [ ] `noindex` on non-prod.

## Don't rationalize

| Excuse | Reality |
|--------|---------|
| "Metadata later" | SEO ships with the page. Add it now. |
| "I'll inline a quick title" | Use `getMetadata` for consistent OG/canonical/robots. |
| "Relative image URL is fine" | OG/Twitter need absolute URLs or the preview breaks. |
