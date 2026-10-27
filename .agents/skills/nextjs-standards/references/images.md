# Images — CDN Lambda Loader

> Company OVERRIDE of Next.js image handling. Read this fully — it diverges from the framework default. Mechanics → `next-best-practices/image.md` (note the divergence below). Grid audit workflow → [cdn-lambda-image-audit.md](cdn-lambda-image-audit.md).

## Why this diverges

The company does **not** use Next.js built-in image optimization (`/_next/image`) — it burns server CPU. A backend **CDN Lambda** resizes images from query params (`w`, `q`, `ext=webp` or `avif`) and serves WebP/AVIF from the CDN/origin.

## Architecture (must be wired)

### `next.config`

```js
images: {
  loader: 'custom',
  loaderFile: './src/app/utils/imageLoader.ts', // match project path
  deviceSizes: [250, 640, 750, 828, 1080, 1200, 1280, 1920],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  qualities: [60, 70, 75, 80, 85, 90, 95],
  remotePatterns: [
    // every CDN hostname the app loads from
    { protocol: 'https', hostname: 'api.example.com' },
    { protocol: 'https', hostname: 'assets.example.com' },
  ],
},
```

- `deviceSizes` and `imageSizes` **must align with grid breakpoints** (see below).
- Include **1280** between 1200 and 1920 to avoid retina cards snapping to 1920.
- `remotePatterns` must list **all** CDN hostnames.

### Custom loader (`imageLoader.ts`)

- Accept `{ src, width, quality }` from Next.js `<Image>`.
- Append `w`, `q`, `ext=webp` to the CDN URL.
- Guard invalid/missing `src` (`undefined`, `null`, empty) → safe fallback pixel.
- **Only the loader (or `getOverrideSrc` wrapping it) adds `w`** — never in CMS hooks or `getMediaSrc`.

```ts
import { isValidImageSrc } from './isValidImageSrc';

interface ImageLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export default function cdnImageLoader({ src, width, quality }: ImageLoaderParams): string {
  if (!isValidImageSrc(src)) return TRANSPARENT_PIXEL;

  const q = (quality ?? 75).toString();

  try {
    const url = new URL(src);
    url.searchParams.set('w', width.toString());
    url.searchParams.set('q', q);
    url.searchParams.set('ext', 'webp');
    return url.toString();
  } catch {
    const separator = src.includes('?') ? '&' : '?';
    const params = new URLSearchParams({ w: width.toString(), q, ext: 'webp' });
    return `${src}${separator}${params.toString()}`;
  }
}
```

### Centralized `sizes` presets (`image-sizes.ts`)

**One source of truth** for all `<Image sizes={…}>` values. Never hardcode `sizes` per component unless adding a new preset here first.

Breakpoints align with global SCSS (typically **640px** small mobile, **1024px** tablet/mobile layout, **1200px+** desktop grid):

```ts
const MOBILE_BP = 1024;
const SMALL_MOBILE_BP = 640;
const MOBILE_CAP = 'min(100vw, 640px)';

export const IMAGE_SIZE_VARIANTS = {
  fullWidth: `(max-width: ${MOBILE_BP}px) ${MOBILE_CAP}, 100vw`,
  twoCol: `(max-width: ${SMALL_MOBILE_BP}px) ${MOBILE_CAP}, 50vw`,
  threeCol: `(max-width: ${SMALL_MOBILE_BP}px) ${MOBILE_CAP}, (max-width: ${MOBILE_BP}px) 50vw, 33vw`,
  fourCol: `(max-width: ${SMALL_MOBILE_BP}px) ${MOBILE_CAP}, (max-width: ${MOBILE_BP}px) 50vw, 25vw`,
  fiveCol: `(max-width: ${SMALL_MOBILE_BP}px) ${MOBILE_CAP}, (max-width: ${MOBILE_BP}px) 33vw, 20vw`,
  sidebar: `(max-width: ${MOBILE_BP}px) ${MOBILE_CAP}, 400px`,
  modal: `(max-width: ${MOBILE_BP}px) ${MOBILE_CAP}, min(75vw, 25em)`,
  thumbnail: `(max-width: ${MOBILE_BP}px) 8em, 10em`,
  tinyIcon: '15px',
  // add project-specific variants here (navLogo, swiperSlide, etc.)
} as const;

export type ImageSizeVariant = keyof typeof IMAGE_SIZE_VARIANTS;

export function getImageSizes(variant: ImageSizeVariant): string {
  return IMAGE_SIZE_VARIANTS[variant];
}

/** Mobile hero preload `w` — 640px cap × 2× DPR → snaps to 750 in deviceSizes */
export const MOBILE_HERO_PRELOAD_CDN_WIDTH = 750;
```

### `overrideSrc` — present `src` at the right CDN width

Next.js `<Image>` generates `srcset` from the custom loader but also sets a default `src`. Use **`overrideSrc`** to replace that default `src` with a CDN URL already sized via the loader — same `w`/`q`/`ext` contract, no duplicate logic elsewhere.

- Build `overrideSrc` **only** through `cdnImageLoader` (or a thin `getOverrideSrc` wrapper) — never hand-assemble query strings, never in `getMediaSrc`.
- Pick `width` for the override to match the **initial viewport** the image serves (mobile cap × DPR for heroes → `MOBILE_HERO_PRELOAD_CDN_WIDTH`; fixed-layout images → a `deviceSizes`/`imageSizes` value that fits the rendered box).
- `src` stays the **bare CMS/CDN URL**; the loader still drives `srcset` for responsive picks.
- **Required** on `priority` / LCP heroes and whenever a `<link rel="preload">` must match the rendered `src`.
- Preload `href` must equal `overrideSrc` when both are present.

```ts
// getOverrideSrc.ts — optional thin wrapper; same contract as cdnImageLoader
import cdnImageLoader from './imageLoader';

export function getOverrideSrc(
  src: string,
  width: number,
  quality?: number,
): string {
  return cdnImageLoader({ src, width, quality });
}
```

Usage:

```tsx
import Image from 'next/image';
import { getOverrideSrc } from '@/app/utils/getOverrideSrc';
import { getImageSizes, MOBILE_HERO_PRELOAD_CDN_WIDTH } from '@/app/utils/image-sizes';

const quality = 80;

// Hero / LCP — overrideSrc at mobile cap × 2× DPR (750)
<Image
  src={src}
  overrideSrc={getOverrideSrc(src, MOBILE_HERO_PRELOAD_CDN_WIDTH, quality)}
  alt={alt}
  fill
  sizes={getImageSizes('fullWidth')}
  quality={quality}
  priority
/>

// Grid card — overrideSrc at a sensible default snapped width for first paint
<Image
  src={src}
  overrideSrc={getOverrideSrc(src, 750, quality)}
  alt={alt}
  fill
  sizes={getImageSizes('threeCol')}
  quality={quality}
/>
```

## How `w` is chosen (most common bug source)

1. Next.js reads the `sizes` prop → computes layout width for the current viewport.
2. Multiplies by device pixel ratio (DPR): 2× retina, 3× on some phones.
3. Snaps **up** to the nearest value in `deviceSizes` (not `imageSizes` when using `fill` + responsive).
4. Passes that snapped width to the custom loader as `width`.

```
needed_width = layout_width_from_sizes × DPR
cdn_w = smallest deviceSize >= needed_width
```

Mobile with cap:

```
layout_width = min(viewport_width, 640)
needed_width = layout_width × DPR
```

Example: 3-col card at 33vw on 1920px screen, 2× DPR → ~1268px needed → should snap to **1280**, not 1920.

## Grid ↔ `sizes` ↔ `deviceSizes` alignment

| Layout role | Grid behavior | `sizes` preset |
|---|---|---|
| Hero / banner / full bleed | 1 col | `fullWidth` |
| 2-col row | 50% desktop, stack tablet | `twoCol` |
| 3-col cards | 33% desktop, 2-col tablet | `threeCol` |
| 4-col | 25% desktop | `fourCol` |
| Sidebar / fixed column | ~400px | `sidebar` |
| Icons / logos | fixed em/px | `thumbnail`, `tinyIcon`, or fixed px |
| Swiper / slider slides | actual slide width | fixed px or measured vw — **not** generic `100vw` unless slide is truly full width |

### Mobile cap rule (critical)

- **NEVER** use bare `100vw` on mobile for cards, logos, or swiper slides.
- Always use `min(100vw, 640px)` at mobile breakpoints so 2×/3× DPR phones don't request `w=1920` for a 375px-wide image.

## REQUIRED

- Use `next/image` **`<Image>`** (never raw `<img>`).
- Wire the CDN Lambda loader globally via `images.loader: 'custom'` + `images.loaderFile` — do **not** pass a per-`<Image>` `loader` prop when global config is set.
- Always provide `alt`, and either `width`/`height` or `fill`.
- **`sizes` from `getImageSizes()` presets** — pick the preset that matches the component's grid role and CSS layout.
- `quality` from a shared constant (e.g. `80` for CMS photos; lower for thumbs if needed).
- `fill` images: positioned parent with defined dimensions.
- `priority` only on true LCP candidates (hero, above-fold).
- **`overrideSrc`** via `getOverrideSrc` / `cdnImageLoader` on LCP/priority images (and any image with a preload hint) so the default `src` is a correctly sized CDN URL.
- Preload URLs (if any) use the same `w`/`q`/`ext` contract, match `overrideSrc`, and use `MOBILE_HERO_PRELOAD_CDN_WIDTH` for mobile hero.

## FORBIDDEN

- Raw `<img>` tags.
- Next.js built-in image optimization (default optimizer).
- Omitting `sizes`, `alt`, or dimensions.
- `sizes="100vw"` on cards, logos, or swiper slides.
- Missing `sizes` on `fill` images (Next.js defaults poorly).
- Adding `w` params in `getMediaSrc` / CMS layer **and** in the loader (double sizing).
- Hardcoded `w=1920` in preload hints or `overrideSrc` for mobile.
- No `isValidImageSrc` guard → broken `src=undefined` requests hit CDN.
- Mismatched breakpoints: CSS stacks at 1024px but `sizes` uses 768px or 1200px.
- Hand-built `overrideSrc` query strings bypassing `cdnImageLoader`.
- Copying a `sizes` string without verifying it matches the component's computed CSS width.

## Checklist

- [ ] `<Image>` used (no raw `<img>`).
- [ ] CDN Lambda loader wired in `next.config` + `imageLoader.ts` with `isValidImageSrc` guard.
- [ ] `deviceSizes` includes 640, 750, 1280; `remotePatterns` lists all CDN hosts.
- [ ] `sizes` from centralized `image-sizes.ts` preset matching grid role.
- [ ] SCSS `@media` breakpoints match `sizes` breakpoints.
- [ ] `alt` + dimensions (`width`/`height` or `fill` + sized parent).
- [ ] `priority` only on LCP hero; shared `quality` constant.
- [ ] LCP/priority images have `overrideSrc` from `getOverrideSrc` / `cdnImageLoader`; preload `href` matches when used.
- [ ] No `w` params in CMS/`getMediaSrc` layer.

## Don't rationalize

| Excuse | Reality |
|--------|---------|
| "Next's optimizer is built in, just use it" | Forbidden — CPU cost. Use the CDN Lambda loader. |
| "I'll use `100vw` — it's simpler" | Cards/logos on mobile will over-fetch to 1920px on retina. Use presets with mobile cap. |
| "I'll add `w` in getMediaSrc for safety" | Double sizing. Only the loader / `getOverrideSrc` sets `w`. |
| "I'll use the example sizes string from the skill" | Pick the preset that matches computed CSS width at each breakpoint. |
| "`<img>` is simpler" | `<Image>` + loader is mandatory for perf + lazy-load. |
| "deviceSizes 1200 then 1920 is fine" | Retina 3-col cards jump to 1920. Add 1280. |

## Mechanics →

`next-best-practices/image.md` — framework API for `<Image>`, `fill`, `priority`, `placeholder`. Company rules above override optimizer and `sizes` defaults.

## Audit

When auditing image URLs, over-fetch, or breakpoint mismatches → [cdn-lambda-image-audit.md](cdn-lambda-image-audit.md).
