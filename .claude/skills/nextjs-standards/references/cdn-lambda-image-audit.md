# CDN Lambda Image Loader — Grid Audit

> Use when auditing a Next.js app's CDN image setup, diagnosing `w` over-fetch/under-fetch, or verifying grid ↔ `sizes` ↔ `deviceSizes` alignment. Company rules → [images.md](images.md).

## Architecture to verify

1. `**next.config**` must have:
  - `images.loader: 'custom'`
  - `images.loaderFile` pointing to the CDN loader
  - `deviceSizes` and `imageSizes` arrays that match the grid breakpoints
  - `remotePatterns` for all CDN hostnames
2. **Custom loader** must:
  - Accept `{ src, width, quality }` from Next.js `<Image>`
  - Append `w`, `q`, `ext=webp` to the CDN URL
  - Guard invalid/missing `src` (`undefined`, `null`, empty) and return a safe fallback
  - **NOT** add width params in CMS hooks or `getMediaSrc` — only the loader should
3. **How `w` is chosen** (most common bug):
  - Next.js reads the `sizes` prop → computes layout width for current viewport
  - Multiplies by device pixel ratio (DPR): 2× retina, 3× on some phones
  - Snaps **UP** to the nearest value in `deviceSizes` (not `imageSizes` when using `fill` + responsive)
  - Passes that snapped width to the custom loader as `width`
  - Example: card at 33vw on 1920px screen, 2× DPR → ~1268px needed → snaps to next deviceSize (1280 if present; 1920 if gap between 1200 and 1920)

## Grid system standards (CSS ↔ `sizes` ↔ `deviceSizes`)

Define **ONE** source of truth for breakpoints, typically:

- **Small mobile**: 640px
- **Tablet / mobile layout**: 1024px
- **Desktop grid**: 1200px+ (match SCSS `@media` values)

### Required `sizes` presets (map to grid columns)


| Layout role                | Grid behavior             | `sizes` pattern                                                               |
| -------------------------- | ------------------------- | ----------------------------------------------------------------------------- |
| Hero / banner / full bleed | 1 col                     | `(max-width: 1024px) min(100vw, 640px), 100vw`                                |
| 2-col row                  | 50% desktop, stack tablet | `(max-width: 640px) min(100vw, 640px), 50vw`                                  |
| 3-col cards                | 33% desktop, 2-col tablet | `(max-width: 640px) min(100vw, 640px), (max-width: 1024px) 50vw, 33vw`        |
| 4-col                      | 25% desktop               | `(max-width: 640px) min(100vw, 640px), (max-width: 1024px) 50vw, 25vw`        |
| Sidebar / fixed column     | ~400px                    | `(max-width: 1024px) min(100vw, 640px), 400px`                                |
| Icons / logos              | fixed em/px               | use fixed values, not `100vw`                                                 |
| Swiper / slider slides     | actual slide width        | fixed px or measured vw, NOT generic `100vw` unless slide is truly full width |


### Mobile cap rule (critical)

- **NEVER** use bare `100vw` on mobile without a cap
- Always use `min(100vw, 640px)` for mobile breakpoints so 2×/3× DPR phones don't request 1920px for a 375px-wide image

### `deviceSizes` recommendation

Align with grid + DPR math:

```
[250, 640, 750, 828, 1080, 1200, 1280, 1920]
```

- Include 640 and 750 for mobile cap × 1×/2× DPR
- Add **1280** between 1200 and 1920 to avoid over-fetching retina cards
- `imageSizes` for fixed small assets: `[16, 32, 48, 64, 96, 128, 256, 384]`

## Audit tasks

### A. zzz

1. Find `imageLoader` / `cdnImageLoader` and confirm param contract (`w`, `q`, `ext`)
2. Find centralized `IMAGE_SIZES` / `getImageSizes` presets — or flag if `sizes` is hardcoded per component
3. List all `<Image>` usages and map each to a grid role (hero, card, logo, thumb, etc.)
4. Compare SCSS breakpoints (`@media max-width`) with `sizes` breakpoints — they must match

### B. Per-component checks

For every `<Image>`:

- Has explicit `sizes` from a preset (not omitted, not `100vw` everywhere)
- Preset matches actual rendered width in CSS (inspect computed width)
- `quality` uses a shared constant (e.g. 80 for CMS photos, lower for thumbs if needed)
- `fill` images have a positioned parent with defined dimensions
- `priority` only on true LCP candidates (hero, above-fold)
- LCP/priority images have `overrideSrc` from `getOverrideSrc` / `cdnImageLoader` at the correct snapped `w`
- Preload URLs (if any) use the same `w`/`q`/`ext` contract as the loader and match `overrideSrc` when set

### C. URL validation (browser DevTools)

For each image type, at these viewports, record the final CDN URL `w` param:


| Viewport  | DPR | Component   | Expected layout width | Expected `w` (snapped)                    | Actual `w` | OK? |
| --------- | --- | ----------- | --------------------- | ----------------------------------------- | ---------- | --- |
| 375×812   | 2×  | mobile hero | 640px cap             | 750 or 828                                |            |     |
| 375×812   | 2×  | 3-col card  | 640px cap             | 750 or 828                                |            |     |
| 1440×900  | 2×  | 3-col card  | ~480px (33vw)         | ~960 → 1080 or 1200                       |            |     |
| 1920×1080 | 2×  | 3-col card  | ~634px (33vw)         | ~1268 → should NOT be 1920 if 1280 exists |            |     |


- Flag as **over-fetch** if `w` is >2× the visual layout width.
- Flag as **under-fetch** if image looks soft on retina at that size.

### D. Anti-patterns to fix

- `sizes="100vw"` on cards, logos, or swiper slides
- Missing `sizes` on `fill` images (Next.js defaults poorly)
- Width params added in `getMediaSrc` / CMS layer AND in loader (double sizing)
- `deviceSizes` gap between 1200 and 1920 causing all retina images to jump to 1920
- Mismatched breakpoints: CSS stacks at 1024px but `sizes` uses 768px or 1200px
- Hardcoded `w=1920` in preload hints or `overrideSrc` for mobile
- No `isValidImageSrc` guard → broken `src=undefined` requests hit CDN

### E. Fixes (apply in order)

1. Centralize all `sizes` into one `image-sizes.ts` file aligned to grid
2. Add missing intermediate `deviceSize` (e.g. 1280) if retina cards over-fetch to 1920
3. Replace hardcoded `sizes` with correct preset per component
4. Add swiper-specific preset if slide width is fixed (e.g. 400px not 33vw)
5. Align preload `w` / `overrideSrc` with `MOBILE_HERO_PRELOAD_CDN_WIDTH` (or `getOverrideSrc`) matching `deviceSizes` math
6. Re-test URLs at 375px, 768px, 1024px, 1440px, 1920px viewports

## Output format

Return:

1. **Summary** — is the loader wired correctly? are presets centralized?
2. **Mismatch table** — component → current `sizes` → correct preset → current `w` at 2× → recommended fix
3. **Config changes** — `deviceSizes`, new presets, loader fixes
4. **Code diffs** — only for components with wrong `sizes` or missing guards
5. **Verification checklist** — URLs to spot-check after deploy

## Reference formulas

```
needed_width = layout_width_from_sizes × DPR
cdn_w = smallest deviceSize >= needed_width
```

For mobile with cap:

```
layout_width = min(viewport_width, 640)
needed_width = layout_width × DPR
```

Do not change unrelated components. Match existing import paths and naming conventions in the repo being audited.

## Quick usage tips


| Goal                    | How to use                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Full app audit          | Read `next.config`, loader file, `image-sizes.ts`, scan all `<Image>` usages                          |
| Single component        | Focus on one component + its SCSS; compare computed width vs `sizes` preset                           |
| New feature             | Adding a 4-col grid card slider — pick or create the correct `sizes` preset and `deviceSize` coverage |
| Fix `w=1920` over-fetch | Diagnose DPR snap; propose `deviceSizes` + `sizes` fix                                                |


## What "working properly" looks like

- CDN URLs always have `?w=…&q=…&ext=webp`
- Mobile images cap at ~640–750px `w`, not 1920
- Desktop 3-col cards land around 1080–1280 `w` on 2× screens, not 1920
- CSS breakpoints, `sizes` strings, and `deviceSizes` tell the same grid story
- No raw `100vw` on non-hero images

