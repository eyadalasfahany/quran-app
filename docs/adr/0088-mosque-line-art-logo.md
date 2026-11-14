# 0088 — The line-art mosque logo (14 Nov 2026)

Date: 2026-11-14 · Status: **accepted** (developer, 14 Nov 2026)

## Context

The Taybah logo was a filled illustration: a green dome and gold minarets, with «طيبة» and "taybah" in green under it (`docs/branding/taybah-nabawi-logo.png`). For the printed QR card the developer approved a new mark: the same mosque drawn as gold line art, each line a hand-placed brush stroke that lands thick and tapers, with the original logo's «طيبة» and "taybah" lettering traced to vector and coloured gold. The developer asked for it to replace the app icons and logos everywhere.

## Decision

1. **New source of truth.** `docs/branding/taybah-mosque-logo.svg` is the vector master. `docs/branding/taybah-nabawi-logo.png` is its 1254 × 1254 render on cream `#F9F7F2`, in the same layout as the old logo (mosque on top, «طيبة», then "taybah"), and stays the input of the generators.
2. **Everything is regenerated from it**, never hand-edited:
   - `apps/mobile/scripts/generate-brand-assets.mjs`: the iOS icon, the Android adaptive foreground, themed (monochrome) icon and notification icon, the splash logo images, the widget and watch icons, the website logo, favicon and apple-touch icon, the Play feature graphic and the root `logo.png`.
   - `apps/mobile/scripts/generate-splash-logo-layers.mjs`: the five animated-splash layers (two minarets, the dome, the Arabic and the Latin words). The new logo is all gold, so every layer is cut from one mask instead of separate gold and green masks; the crop rects moved to the new artwork and `splash-logo-raster-layers.ts` matches them.
   - The tracked widget and watch `AppIcon.appiconset` PNGs are resized from the new widget and watch icons.
3. **The app icon uses the line art as it is** (developer, 14 Nov 2026). At home-screen size (60 pt) and smaller, the thin lines read faintly; the developer accepted this rather than drawing a bolder icon-only variant.

## Consequences

- **Store build, not OTA.** The app icon, Android icons and splash images are native assets, so the change changes the native fingerprint. It ships in a store build (version bump), not with `eas update`; publishing an OTA update from this commit would reach no store build.
- The website picks up the new logo and favicons when it deploys.
- `docs/branding` keeps the earlier logo concepts for history; they are no longer used.
- `taybah-logo-layers.ts` (the traced vector layers for `DrawnLogoLayer`) still describes the old logo. Nothing in the app renders it (the splash uses the raster layers); refresh it with `scripts/extract-taybah-logo-layers.mjs` if `DrawnLogoLayer` is used again.
