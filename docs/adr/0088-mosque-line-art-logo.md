# 0088 — The line-art mosque logo (14 Nov 2026)

Date: 2026-11-14 · Status: **accepted** (developer, 14 Nov 2026)

## Context

The Taybah logo was a filled illustration: a green dome and gold minarets, with «طيبة» and "taybah" in green under it (`docs/branding/taybah-nabawi-logo.png`). For the printed QR card the developer approved a new mark: the same mosque drawn as gold line art, each line a hand-placed brush stroke that lands thick and tapers, with the original logo's «طيبة» and "taybah" lettering traced to vector and coloured gold. The developer asked for it to replace the app icons and logos everywhere.

## Decision

1. **New source of truth.** `apps/mobile/scripts/generate-mosque-logo.py` holds the mosque's hand-placed centrelines and writes `docs/branding/taybah-mosque-lineart.svg` (the mosque in brush strokes), `docs/branding/taybah-mosque-logo.svg` (the full logo, with the traced lettering from `taybah-wordmark-ar.svg` and `taybah-wordmark-latin.svg`) and the splash's `splash-mosque-strokes.ts`. `docs/branding/taybah-nabawi-logo.png` is the logo's 1254 × 1254 render on cream `#F9F7F2`, in the same layout as the old logo (mosque on top, «طيبة», then "taybah"), and stays the input of the asset generators.
2. **Everything is regenerated from it**, never hand-edited:
   - `apps/mobile/scripts/generate-brand-assets.mjs`: the iOS icon, the Android adaptive foreground, themed (monochrome) icon and notification icon, the splash logo images, the widget and watch icons, the website logo, favicon and apple-touch icon, the Play feature graphic and the root `logo.png`.
   - `apps/mobile/scripts/generate-splash-logo-layers.mjs`: the splash's three fade-in layers (the brush mosque, «طيبة», "taybah"), all cut from one mask since the logo is all gold.
   - The tracked widget and watch `AppIcon.appiconset` PNGs are resized from the new widget and watch icons.
3. **The splash draws the vector** (developer, 14 Nov 2026). The mosque's centrelines draw themselves with a gold pen (`launchGold`) in order: base, dome, minarets bottom-up, finials last, each line easing in and out on its own window. The exact brush mosque then fades in over the pen lines, and «طيبة» and "taybah" fade in while rising a few points. The splash runs 1200 ms (was 1800 ms) on a linear clock; with Reduce Motion on, the finished logo shows at once. The final frame is the logo itself.
4. **The app icon uses the line art as it is** (developer, 14 Nov 2026). At home-screen size (60 pt) and smaller, the thin lines read faintly; the developer accepted this rather than drawing a bolder icon-only variant.

## Consequences

- **Store build, not OTA.** The app icon, Android icons and splash images are native assets, so the change changes the native fingerprint. It ships in a store build (version bump), not with `eas update`; publishing an OTA update from this commit would reach no store build.
- The website picks up the new logo and favicons when it deploys.
- `docs/branding` keeps the earlier logo concepts for history; they are no longer used.
- The old splash animation is removed: the raster reveal of five bands, and the unused traced-outline animation of the old logo (`DrawnLogoLayer`, `taybah-logo-layers.ts` and `scripts/extract-taybah-logo-layers.mjs`).
