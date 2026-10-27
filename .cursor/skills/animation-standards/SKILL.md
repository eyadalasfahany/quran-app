---
name: animation-standards
description: Use when writing, reviewing, scaffolding, or auditing ANY animation in a company Next.js (App Router) frontend — GSAP (scroll reveals, parallax, pinning, timelines, SplitText, Draggable), Three.js / React Three Fiber (scenes, materials, loaders, shaders, postprocessing), performance optimization, or monitoring existing animation code for unsupported/deprecated APIs. Enforces ref-first GSAP targeting, SSR-safe client-only execution, R3F performance budgets, and warns on deprecated Three.js / unsupported animation patterns.
user-invocable: true
license: MIT
---

# Animation Standards

Engineering standards for **all animation work** in company Next.js frontends — DOM/UI motion (GSAP) and 3D (Three.js / R3F). Apply these BEFORE writing or reviewing animation code. This SKILL is a **router**: read the matching file under `references/`, `gsap-skills/`, or `threejs-skills/` for the task; don't guess library behavior from memory.

Scope:

- **Implementation standards** — how we structure GSAP and Three/R3F code in this stack
- **Best practices** — upstream mechanics (vendored) + company rules (references)
- **Performance** — transform budgets, draw-call reduction, frame budgets, profiling
- **Monitoring / review** — flag unsupported, deprecated, or anti-pattern usage when auditing existing code

> **GSAP is 100% free**, including every plugin (SplitText, MorphSVG, Draggable, …). Install from the public `gsap` npm package — no Club membership, no `.npmrc` / auth token, no private registry.

## Stack assumptions

- **Next.js App Router**, React, TypeScript, Tailwind.
- Animation / WebGL code is **client-only** (`"use client"`), runs after mount — never during SSR or render.
- **DOM animation** → GSAP (+ Lenis synced to ScrollTrigger). Prefer company components (`GeneralAnimation`, `ParallaxContainer`, `Pin`) over bespoke ScrollTriggers.
- **3D** → Three.js via **React Three Fiber** (`@react-three/fiber` + `@react-three/drei` when helpers fit). Prefer R3F declarative scenes over imperative `document.body.appendChild(renderer.domElement)` bootstraps inside React apps.
- Reveal animations are gated by **loading-state + fonts-loaded** orchestration (see GSAP common-patterns).

## Which stack?

| Need | Prefer | Read first |
| ---- | ------ | ---------- |
| Scroll reveals, pinning, scrub, UI timelines, text split, drag | **GSAP** | Decision table → GSAP below |
| 3D scenes, models, materials, lights, shaders, postprocessing | **Three.js / R3F** | Decision table → Three.js / R3F below |
| Mix UI motion + 3D | Both — keep GSAP on DOM/CSS; drive 3D in `useFrame` / R3F state. Do not animate the same property from both. | Both tables |

## Decision table — GSAP

| When you are… | Read |
| ------------- | ---- |
| Deciding refs vs scoped class/querySelector for element targets | [references/common-patterns.md](references/common-patterns.md#choosing-how-to-target-elements) |
| Building scroll reveals, parallax, pinning, scrub, batch | [references/scroll-trigger.md](references/scroll-trigger.md) |
| Sequencing multiple steps (position parameter, labels, nesting) | [references/timeline.md](references/timeline.md) |
| Animating text per line/word/char | [references/split-text.md](references/split-text.md) |
| Adding drag / throw / sliders | [references/draggable.md](references/draggable.md) |
| Smooth scroll (Lenis + ScrollTrigger), scroll lock, scroll-to, resize/refresh | [references/scroll-smoother.md](references/scroll-smoother.md) |
| Wiring GSAP into React/Next.js, app animation components & loading orchestration | [references/common-patterns.md](references/common-patterns.md) |
| Optimizing jank, reflow, animation budget, breakpoints | [gsap-skills/gsap-performance/SKILL.md](gsap-skills/gsap-performance/SKILL.md) + [references/scroll-smoother.md](references/scroll-smoother.md) |

### Canonical GSAP best practices (`gsap-skills/`)

Company rules live in `references/`; upstream mechanics in `gsap-skills/`. When they disagree, **company rules win**.

| Topic | Upstream file |
| ----- | ------------- |
| Core API: tweens, eases, stagger, transforms, `matchMedia` | [gsap-skills/gsap-core/SKILL.md](gsap-skills/gsap-core/SKILL.md) |
| Timelines | [gsap-skills/gsap-timeline/SKILL.md](gsap-skills/gsap-timeline/SKILL.md) |
| ScrollTrigger | [gsap-skills/gsap-scrolltrigger/SKILL.md](gsap-skills/gsap-scrolltrigger/SKILL.md) |
| Plugins (Flip, MorphSVG, MotionPath, SplitText, Draggable, …) | [gsap-skills/gsap-plugins/SKILL.md](gsap-skills/gsap-plugins/SKILL.md) |
| Utilities | [gsap-skills/gsap-utils/SKILL.md](gsap-skills/gsap-utils/SKILL.md) |
| React (`useGSAP`, context, SSR) | [gsap-skills/gsap-react/SKILL.md](gsap-skills/gsap-react/SKILL.md) |
| Vue / Svelte / other frameworks | [gsap-skills/gsap-frameworks/SKILL.md](gsap-skills/gsap-frameworks/SKILL.md) |
| Performance | [gsap-skills/gsap-performance/SKILL.md](gsap-skills/gsap-performance/SKILL.md) |

Index: [gsap-skills/llms.txt](gsap-skills/llms.txt). Final reference: [gsap.com/docs/v3](https://gsap.com/docs/v3/).

## Decision table — Three.js / R3F

| When you are… | Read |
| ------------- | ---- |
| Scene, camera, renderer, Object3D, coordinates | [threejs-skills/threejs-fundamentals/SKILL.md](threejs-skills/threejs-fundamentals/SKILL.md) |
| Built-in / custom geometry, BufferGeometry, instancing | [threejs-skills/threejs-geometry/SKILL.md](threejs-skills/threejs-geometry/SKILL.md) |
| Materials, PBR, ShaderMaterial | [threejs-skills/threejs-materials/SKILL.md](threejs-skills/threejs-materials/SKILL.md) |
| Textures, UVs, env maps | [threejs-skills/threejs-textures/SKILL.md](threejs-skills/threejs-textures/SKILL.md) |
| Lights, shadows, IBL | [threejs-skills/threejs-lighting/SKILL.md](threejs-skills/threejs-lighting/SKILL.md) |
| GLTF / asset loading, progress | [threejs-skills/threejs-loaders/SKILL.md](threejs-skills/threejs-loaders/SKILL.md) |
| Keyframes, skeletal, morph, mixing | [threejs-skills/threejs-animation/SKILL.md](threejs-skills/threejs-animation/SKILL.md) |
| Raycasting, controls, pick/select | [threejs-skills/threejs-interaction/SKILL.md](threejs-skills/threejs-interaction/SKILL.md) |
| GLSL / custom shaders | [threejs-skills/threejs-shaders/SKILL.md](threejs-skills/threejs-shaders/SKILL.md) |
| EffectComposer, bloom, DOF | [threejs-skills/threejs-postprocessing/SKILL.md](threejs-skills/threejs-postprocessing/SKILL.md) |
| R3F perf: LOD, culling, instancing, frame budget, profiling | [threejs-skills/r3f-performance/SKILL.md](threejs-skills/r3f-performance/SKILL.md) |

Provenance lock: [threejs-skills/skills-lock.json](threejs-skills/skills-lock.json). Final reference: [threejs.org/docs](https://threejs.org/docs/) and [docs.pmnd.rs/react-three-fiber](https://docs.pmnd.rs/react-three-fiber).

## Core principles (non-negotiable)

### Shared

- **Client-only.** `"use client"`; never call GSAP, Three, or R3F APIs during SSR or in the render path (except declaring R3F JSX that mounts on the client).
- **Dispose / clean up.** Kill GSAP triggers and `revert()` contexts on unmount; dispose Three geometries, materials, textures, renderers, and cancel `useFrame` side effects. Custom routers swap pages without full reload — leaks accumulate.
- **Transforms over layout.** Prefer `x`/`y`/`scale`/`rotation`/`opacity` (GSAP) and GPU-friendly matrix updates (Three). Avoid animating layout properties every frame.
- **Respect `prefers-reduced-motion`.** Gate or simplify motion when the user requests reduced motion.
- **One owner per property.** Do not drive the same DOM/CSS/`object.position` from both GSAP and `useFrame`.

### GSAP

- **Choose the right target strategy.** Always scope to a container ref — never `document.querySelector`:
  - **One element** → dedicated `useRef`, pass `ref.current`.
  - **Many, same animation** → scoped class + `gsap.utils.selector(containerRef)` / `querySelectorAll` on the container — not a ref per item.
  - **ScrollTrigger `trigger`** → usually `containerRef.current`.
- **No ad-hoc timers.** No `setTimeout` / `setInterval` / standalone RAF for animation timing, DOM readiness, or scroll sync — use GSAP timelines, `useGSAP`/`useEffect`, and Lenis + `gsap.ticker`.
- **Reuse components.** Prefer `GeneralAnimation`, `ParallaxContainer`, `Pin`.
- **Gate reveals** on fonts loaded + `loadingState === "page-ready"`.
- **Timelines over chained `delay`**; **ScrollTrigger on the timeline**, not child tweens.
- **One of `scrub` or `toggleActions`** per trigger, never both.
- **One smooth-scroll engine.** Single Lenis + `gsap.ticker` + `ScrollTrigger.update`; use `window.scrollToTarget` / `window.stopScroll` / `window.updateLenis()` — never a second RAF loop or GSAP `ScrollSmoother` alongside Lenis.
- **No `markers: true`** in committed code.

### Three.js / R3F

- Prefer **R3F `<Canvas>`** in React/Next; keep heavy scenes behind dynamic import + `Suspense`.
- Cap **`dpr`**, prefer `frameloop="demand"` when the scene is static, and budget ~16.7ms/frame — see r3f-performance.
- Prefer **instancing / merged static geometry / fewer materials** over many draw calls.
- Load assets with loaders/`useGLTF` (drei); dispose on unmount; do not leave GPU resources orphaned.
- Prefer **modern materials** (`MeshStandardMaterial` / `MeshPhysicalMaterial`) and **BufferGeometry** — see unsupported/deprecated below.

## Unsupported / deprecated — warn on review

When implementing or auditing animation code, **surface a clear warning** if you find any of the following. Prefer a short note: what is wrong, why, and the supported replacement.

### Three.js — deprecated / removed (do not introduce; migrate if present)

| Avoid | Use instead |
| ----- | ----------- |
| `Geometry` (legacy) | `BufferGeometry` |
| `Face3`, face-based geometry APIs | Buffer attributes / indexed BufferGeometry |
| `MeshFaceMaterial`, `MultiMaterial` | Multiple meshes or groups; one material per draw |
| `CubicInterpolant` misuse / old animation paths undocumented in current docs | Current `AnimationMixer` / `AnimationClip` / `KeyframeTrack` APIs |
| `SceneUtils` / old utils moved under `examples/jsm` without updating imports | Current `three/examples/jsm/...` or `three/addons/...` paths for the installed major |
| `WebGLRenderer` gamma / old encoding flags (`gammaOutput`, `gammaFactor`) | `outputColorSpace` / color-management APIs for the installed Three major |
| Importing from deep `three/src/...` | Public `three` / `three/addons` entry points |

Always match the **installed `three` major**; if training data and package version disagree, trust the package docs.

### R3F / ecosystem — unsupported in company apps

| Avoid | Prefer |
| ----- | ------ |
| Imperative Three bootstrap appended to `document.body` inside a Next page | R3F `<Canvas>` in a client component |
| Creating a new `WebGLRenderer` per remount without dispose | Single Canvas lifecycle; dispose on unmount |
| Animating React state every frame for transforms | `useFrame` + refs / `object3D` mutation |
| Unbounded `dpr={window.devicePixelRatio}` on mobile | `dpr={[1, 2]}` (or lower) + performance tuning |
| Shipping `OrbitControls` + custom controls fighting each other | One control system |
| Postprocessing stacks without a perf budget | Enable effects intentionally; profile first (r3f-performance) |

### GSAP — unsupported patterns (company)

| Avoid | Prefer |
| ----- | ------ |
| `document.querySelector` / global selectors | Container ref + scoped selector / individual refs |
| `setTimeout` / `setInterval` / ad-hoc RAF for motion | Timelines, `useGSAP`, Lenis + ticker |
| GSAP `ScrollSmoother` alongside Lenis | Lenis + ScrollTrigger only |
| Direct `ScrollTrigger.refresh()` / per-component resize listeners | `window.updateLenis()` |
| `markers: true` in committed code | Remove before merge |
| Chained `delay` soup | Timeline position parameter |
| Both `scrub` and `toggleActions` on one trigger | Pick one |

### General anti-patterns

- CSS `@keyframes` / Framer Motion / anime.js **for the same interaction** already owned by GSAP or R3F — consolidate; don't stack engines.
- Layout thrashing (read `getBoundingClientRect` / `offsetWidth` inside scroll/`onUpdate`/every frame).
- Missing cleanup on route change.

## Performance monitoring checklist

When asked to **monitor**, **audit**, or **review** animation implementation:

1. Identify engines in use (GSAP, Three/R3F, CSS, other) and whether they conflict.
2. Run through unsupported/deprecated tables above — **warn explicitly** for each hit.
3. GSAP: cleanup, scoped targets, no timers, Lenis path, transform-only budget, `matchMedia` / reduced motion.
4. R3F: frame budget, draw calls, `dpr`, `frameloop`, dispose, Suspense/lazy, LOD/instancing where scale demands it.
5. Report findings as: **Unsupported/Deprecated** (must fix), **Performance** (should fix), **Nit** (optional).

## Before you commit (checklist)

- [ ] Animation / WebGL files are `"use client"`; no library calls during SSR/render.
- [ ] GSAP: target strategy correct; no `document.querySelector`; no ad-hoc timers; cleanup on unmount.
- [ ] GSAP: reveals gated on fonts + `page-ready`; reused company components where they fit.
- [ ] GSAP: resize via `window.updateLenis()` only; no committed `markers: true`.
- [ ] Three/R3F: Canvas lifecycle + dispose; no deprecated Geometry/material APIs; perf knobs considered.
- [ ] No dual-engine fights on the same property; `prefers-reduced-motion` respected.
- [ ] Audit warnings filed for any unsupported/deprecated usage left in the tree.
