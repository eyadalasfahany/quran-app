# iPhone Frontend Development Standards

## Purpose

This capsule defines the frontend standards the team should follow when building responsive, animation-heavy, or WebGL experiences for iPhone.

> **Core principle:** iPhone is not simply a smaller breakpoint. Treat viewport behavior, safe areas, Retina/DPR, Safari/WebKit, touch, GPU performance, animation, and device capability as first-class frontend concerns.

## 1. Responsive & Viewport

- Physical screen resolution is **not** the CSS viewport size.
- Always design against CSS viewport dimensions, not physical pixels.
- Use:
  - `100svh` for stable small viewport layouts.
  - `100dvh` when the UI genuinely needs the dynamic visible viewport.
  - `100lvh` only when the large viewport is the intended reference.
- Avoid blindly using `100vh` for fullscreen mobile experiences.
- Test Safari with browser UI expanded and collapsed.
- Support portrait and landscape.

### Recommended viewport

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover"
/>
```

## 2. Safe Areas

Modern iPhones require safe-area awareness for edge-to-edge layouts.

Use:

```css
env(safe-area-inset-top)
env(safe-area-inset-right)
env(safe-area-inset-bottom)
env(safe-area-inset-left)
```

For fixed bottom UI:

```css
padding-bottom: max(16px, env(safe-area-inset-bottom));
```

Consider safe areas for:

- Fixed CTA bars
- Bottom navigation
- Modals
- Headers
- Cookie banners
- Fullscreen content
- Landscape layouts

## 3. Retina / Device Pixel Ratio

Do not assume `devicePixelRatio` should be used at full resolution for Canvas/WebGL.

```js
const dpr = Math.min(window.devicePixelRatio, 2);
```

For heavy WebGL/R3F scenes, consider a lower adaptive DPR such as `1–1.5`.

High DPR can multiply GPU pixel workload significantly.

## 4. Animation

Prefer compositor-friendly properties:

- `transform`
- `opacity`

Avoid continuously animating:

- `width`
- `height`
- `top`
- `left`
- `margin`
- `padding`

Use `will-change` selectively. Never apply it globally.

### GSAP

- Avoid expensive work in raw scroll handlers.
- Prefer GSAP/ScrollTrigger or `requestAnimationFrame`-coordinated updates.
- Reduce parallax and simultaneous effects on mobile.
- Always support `prefers-reduced-motion`.

```js
const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
```

## 5. ProMotion / High Refresh Rate

Modern ProMotion iPhones can support refresh rates up to 120 Hz.

Approximate frame budgets:

- 60 Hz → 16.7 ms/frame
- 120 Hz → 8.3 ms/frame

Do not consider 60 FPS automatically perfect. Avoid unnecessary main-thread work and expensive per-frame calculations.

## 6. GPU / WebGL / R3F

Do not ship desktop rendering quality unchanged to iPhone.

Create adaptive quality levels.

Recommended controls:

- DPR
- Texture resolution
- Particle count
- Shadow quality
- Shadow map resolution
- Post-processing
- Bloom
- SSAO
- Reflections
- Shader complexity
- Geometry complexity

Example:

```text
Desktop:
DPR 2
High shadows
Full particles
Post-processing enabled

Mobile:
DPR 1–1.5
Reduced shadows
Reduced particles
Simplified post-processing
```

Prefer capability-based quality selection over `if (isIPhone)` checks.

## 7. Expensive Effects

Be careful with:

- `filter: blur()`
- `backdrop-filter`
- Large shadows
- Multiple masks
- Complex clip paths
- Bloom
- SSAO
- DOF
- Motion blur
- Large transparent layers

Mobile should use a reduced visual-quality profile where required.

## 8. Images & Video

- Use responsive images with `srcset` and `sizes`.
- Prefer WebP/AVIF where appropriate.
- Do not send unnecessarily large desktop assets to mobile.
- Use appropriately sized video sources.
- For mobile video, consider `muted`, `playsinline`, and appropriate preload behavior.
- Video + WebGL texture + shader + post-processing is a high-risk performance combination and must be tested on physical iPhones.

## 9. Touch & Interaction

Do not rely on hover as a primary interaction.

Use:

```css
@media (hover: hover) and (pointer: fine) {
  /* desktop hover behavior */
}
```

Design comfortable touch targets; approximately 44×44 CSS px is a useful baseline.

Use `touch-action` deliberately. Avoid `touch-action: none` unless the interaction truly requires it.

## 10. Keyboard & Forms

Test:

- Input focus
- Keyboard opening/closing
- Scrolling while keyboard is open
- Fixed CTA behavior
- Validation
- Submit flows

For keyboard-sensitive experiences, consider the Visual Viewport API:

```js
window.visualViewport
```

Avoid assuming that the layout viewport and visible viewport are always identical.

## 11. Scrolling

Prefer native touch scrolling unless custom scrolling provides a clear UX benefit.

Be cautious when combining:

- Custom smooth scrolling
- GSAP
- ScrollTrigger
- `position: fixed`
- `transform`
- `overflow`
- WebGL

Do not perform expensive calculations on every raw scroll event.

## 12. Typography

Use responsive typography:

```css
font-size: clamp(40px, 10vw, 120px);
```

Avoid fixed-height text containers for dynamic/localized content.

Always validate:

- Line wrapping
- Font loading
- Line height
- Letter spacing
- English/Arabic localization
- Long content

## 13. Reduced Motion

Respect:

```css
@media (prefers-reduced-motion: reduce) {
  /* simplify or remove non-essential motion */
}
```

Reduced motion is a user preference and is separate from mobile performance optimization. Both must be supported.

## 14. Testing Matrix

Minimum validation:

- Small iPhone viewport
- Common iPhone generation
- Recent iPhone
- ProMotion iPhone
- One older iPhone

For critical pages test:

- Portrait
- Landscape
- Safari UI expanded
- Safari UI collapsed
- Keyboard open
- Keyboard closed
- Reduced Motion
- Slow network
- Long scrolling sessions
- Heavy animation
- WebGL scene

Always validate important performance behavior on **real iPhones**, not only Chrome DevTools.

## 15. Performance Monitoring

For animation-heavy pages monitor:

- FPS
- Frame time
- Long tasks
- JS execution
- Rendering workload
- WebGL load
- Memory pressure
- Dropped frames

Target consistent frame delivery rather than chasing a nominal FPS number.

## 16. Team Rules — Quick Capsule

### MUST

- Use safe-area support.
- Use modern viewport units intentionally.
- Test real Safari/iPhone hardware.
- Cap or adapt WebGL DPR.
- Support reduced motion.
- Prefer transform/opacity for animation.
- Use responsive images/video.
- Test keyboard and fixed UI.
- Test portrait and landscape.
- Build adaptive quality for heavy effects.

### AVOID

- Treating iPhone as only a CSS breakpoint.
- Blindly using `100vh`.
- Blindly using full `devicePixelRatio` for WebGL.
- Shipping desktop WebGL quality to mobile.
- Global `will-change`.
- Heavy blur/backdrop-filter everywhere.
- Expensive raw scroll handlers.
- Hover-only interactions.
- Fixed-height text containers.
- Assuming Chrome emulation equals real Safari behavior.

## 17. Recommended Architecture

Use a capability-driven quality manager:

```text
Device / Browser
       ↓
Capability Detection
       ├── viewport
       ├── DPR
       ├── touch
       ├── WebGL capability
       ├── reduced motion
       └── runtime performance
       ↓
Quality Manager
       ├── High
       ├── Medium
       └── Low
       ↓
GSAP / R3F / Effects / Media
```

This keeps mobile optimization centralized instead of scattering device-specific checks throughout the application.

## Reference Documentation

- Apple Safari Developer Tools / Responsive Design Mode
- WebKit safe-area and iPhone layout guidance
- MDN viewport units
- MDN `prefers-reduced-motion`
