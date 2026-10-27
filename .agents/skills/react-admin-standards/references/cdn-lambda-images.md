# CDN Lambda Images (Admin SPA)

> Company rule for displaying CMS/CDN images in React admin SPAs (Vite/CRA). Admin apps do **not** use `next/image` — use shared URL builders instead. Next.js consumer rules → `../../nextjs-standards/references/images.md`.

## Why this exists

The same backend **CDN Lambda** resizes images from query params (`w`, `q`, `ext=webp`). Admin SPAs show thumbnails in tables, upload previews, galleries, and draft indicators. URLs must follow the same contract as public Next.js sites, but sizing is **fixed per UI context** (not responsive `sizes`).

## Architecture

### URL contract

Every resized CDN request must include:

- `w` — target width in pixels
- `q` — quality (default 75; 80 for photos, 60–70 for small thumbs)
- `ext=webp` — output format

### Centralized builder (`buildCdnImageUrl.ts`)

**One utility** appends resize params. Never duplicate query-string logic in components.

```ts
import { isValidImageSrc } from './isValidImageSrc';

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

interface BuildCdnImageUrlOptions {
  width: number;
  quality?: number;
  ext?: 'webp' | 'avif';
}

export function buildCdnImageUrl(
  src: string | null | undefined,
  { width, quality = 75, ext = 'webp' }: BuildCdnImageUrlOptions,
): string {
  if (!isValidImageSrc(src)) return TRANSPARENT_PIXEL;

  const q = quality.toString();

  try {
    const url = new URL(src);
    url.searchParams.set('w', width.toString());
    url.searchParams.set('q', q);
    url.searchParams.set('ext', ext);
    return url.toString();
  } catch {
    const separator = src.includes('?') ? '&' : '?';
    const params = new URLSearchParams({ w: width.toString(), q, ext });
    return `${src}${separator}${params.toString()}`;
  }
}
```

### Width presets (`CDN_IMAGE_WIDTHS`)

Fixed widths per admin UI role — align with `imageSizes`-style values from Next.js projects:

```ts
export const CDN_IMAGE_WIDTHS = {
  tableThumb: 64,       // ReusableDataTable row thumbnail
  tablePreview: 128,    // larger table / list preview
  formPreview: 256,     // FormUpload single preview
  galleryThumb: 150,    // FormGalleryUpload grid cell
  galleryLightbox: 1280, // modal / lightbox view
  avatar: 96,
} as const;

export type CdnImageWidthRole = keyof typeof CDN_IMAGE_WIDTHS;
```

Usage:

```tsx
import { buildCdnImageUrl, CDN_IMAGE_WIDTHS } from '@/utils/buildCdnImageUrl';

<img
  src={buildCdnImageUrl(item.image_url, { width: CDN_IMAGE_WIDTHS.tableThumb, quality: 70 })}
  alt={item.name?.[i18n.language] ?? ''}
  width={64}
  height={64}
  className="object-cover rounded"
/>
```

## REQUIRED

- Use `buildCdnImageUrl()` (or project equivalent) for **every** displayed CDN image — tables, `FormUpload` preview, `FormGalleryUpload`, draft badges, side panels.
- Pick `width` from `CDN_IMAGE_WIDTHS` presets matching the rendered pixel size (inspect computed width).
- Guard invalid `src` with `isValidImageSrc` inside the builder — return transparent pixel fallback.
- Set explicit `width`/`height` (or `aspect-ratio` + `object-cover`) on `<img>` to prevent layout shift.
- Store **original** CDN URLs from the API in Formik/state — apply resize params only at display time.
- Upload flows (`FormUpload`, `FormGalleryUpload`) submit originals; the CDN/Lambda serves resized variants on read.

## FORBIDDEN

- Raw CDN URLs in `<img src={url}>` without `w`/`q`/`ext` (downloads full-size assets).
- Adding `w` params when **mapping API responses** (`transformItem`, `getMediaSrc`, module API normalizers) — only the display builder adds `w`.
- Baking resize params into persisted form values or POST payloads.
- Hardcoding `w=1920` for table thumbnails or upload previews.
- Duplicating URL-building logic across table cells, upload components, and modals.
- `100vw` or viewport-based widths in admin — admin layouts use fixed columns; use pixel presets.

## Where it applies

| UI | Component | Preset | Notes |
|---|---|---|---|
| CRUD table thumb | `ReusableDataTable` column render | `tableThumb` (64) or `tablePreview` (128) | Match column CSS width |
| Single upload preview | `FormUpload` | `formPreview` (256) | After upload or on edit load |
| Gallery grid | `FormGalleryUpload` | `galleryThumb` (150) | Lightbox uses `galleryLightbox` |
| Draft / preview panel | preview hooks, modals | `galleryLightbox` or context-specific | Match modal max-width |

## Checklist

- [ ] `buildCdnImageUrl` + `CDN_IMAGE_WIDTHS` exist in `src/utils/` (create if missing).
- [ ] `isValidImageSrc` guard in builder; no `undefined` URLs hit CDN.
- [ ] Table thumbs, upload previews, and galleries use presets — no inline `?w=` strings.
- [ ] API mappers store original URLs; resize only at render.
- [ ] `<img>` has `alt` + dimensions matching preset width.

## Don't rationalize

| Excuse | Reality |
|--------|---------|
| "Admin is internal — full-size images are fine" | Tables with 50 rows × 2MB originals kill bandwidth and slow renders. Use thumbs. |
| "I'll add `w` when saving to the API" | Persist originals; Lambda resizes on read. Baked `w` breaks other consumers. |
| "Next.js loader handles this on the public site" | Admin is not Next.js. Use `buildCdnImageUrl`. |
| "One-off `?w=64` in the table is fine" | Centralize in `CDN_IMAGE_WIDTHS` so all admins stay consistent. |

## Audit (admin)

When reviewing CDN image usage in admin:

1. Grep for `<img`, `background-image`, and `src={` pointing at CDN hosts.
2. Confirm each uses `buildCdnImageUrl` with a `CDN_IMAGE_WIDTHS` preset.
3. Confirm API/transform layers return bare URLs without `w`/`q`/`ext`.
4. Spot-check DevTools: table thumb ≈ 64–128 `w`, form preview ≈ 256 `w`, not 1920.
