# ScrollTrigger

Scroll-linked animation: trigger tweens/timelines on scroll, pin elements, scrub progress to scroll position. In this codebase ScrollTrigger is the backbone of every reveal, parallax, and pinned section — see [common-patterns.md](common-patterns.md) for the wrapper components (`GeneralAnimation`, `ParallaxContainer`, `Pin`).

> Mechanics → https://gsap.com/docs/v3/Plugins/ScrollTrigger/

## REQUIRED

- **Register once.** `gsap.registerPlugin(ScrollTrigger)` before any usage. In Next.js, do this inside a client component / effect, never at module scope on the server.
- **Run client-only.** All ScrollTrigger code lives in `useEffect`/`useGSAP`/`useLayoutEffect` after mount (this app is App Router; components that animate are `"use client"`). Never pass selectors to ScrollTrigger during SSR.
- **Trigger via refs or scoped selectors.** Pass `ref.current` for individual triggers/pin targets. For groups, query inside `containerRef.current` — not `document.querySelector` or global selector strings.
- **Always kill on unmount.** Store the instance and `trigger.kill()` in the effect cleanup. With many triggers, `ScrollTrigger.getAll().forEach(t => t.kill())` or kill by `id`.
- **Refresh after layout changes.** After DOM/content/font changes that move trigger positions, call `window.updateLenis({ immediate: true })` — it runs `lenis.resize()` then `ScrollTrigger.refresh()` in the correct order. Do **not** call `ScrollTrigger.refresh()` directly from components. Viewport resize is **not** handled by GSAP's built-in refresh in this app; see [scroll-smoother.md](scroll-smoother.md). Reveal animations wait on `isFontsLoaded` (fonts change line heights).
- **ScrollTrigger on the timeline, not child tweens.** Attach `scrollTrigger` to the timeline or a top-level tween — never to a `.to()` inside a timeline.

```javascript
gsap.registerPlugin(ScrollTrigger);

// ✅ trigger is a ref.current (or element from scoped container)
const tween = gsap.to(boxRef.current, {
  x: 500,
  scrollTrigger: {
    trigger: boxRef.current,
    start: "top center",   // triggerPos viewportPos
    end: "bottom center",
    scrub: true,           // tie progress to scroll
    // toggleActions: "play none none reverse"  // discrete, mutually exclusive with scrub
  },
});
```

## Standalone trigger (callbacks only)

Use `ScrollTrigger.create()` when you drive state yourself (the pattern `ParallaxContainer` and `GeneralAnimation` use):

```javascript
const trigger = ScrollTrigger.create({
  id: "hero-parallax",
  trigger: containerEl,
  start: "top bottom",
  end: "bottom top",
  scrub: true,
  onUpdate: (self) => gsap.set(imageEl, { yPercent: self.progress * travel }),
});
// cleanup: trigger.kill()
```

## start / end

Format `"triggerPosition viewportPosition"` (e.g. `"top center"`, `"bottom 80%"`), a number (px of scroll), or a function returning either. Relative: `"+=300"`, `"+=100%"`, `"max"`. Wrap in `clamp()` to stay in page bounds: `start: "clamp(top bottom)"`. Defaults: `start: "top bottom"` (or `"top top"` when `pin: true`), `end: "bottom top"`.

## Key options

| Property | Notes |
| --- | --- |
| `trigger` | Element/selector defining start position (required, or shorthand `scrollTrigger: ".sel"`). |
| `start` / `end` | When trigger activates/deactivates. |
| `scrub` | `true` = direct link to scroll; number = seconds of catch-up lag. |
| `toggleActions` | 4 discrete actions: onEnter onLeave onEnterBack onLeaveBack (e.g. `"play none none reverse"`). |
| `pin` | Pin element while active. Pin a wrapper, animate children — don't animate the pinned element. |
| `pinSpacing` | Default `true` (adds spacer). `false` only if layout handled elsewhere. |
| `once` | Kill trigger after end reached once. Used by reveal animations here. |
| `markers` | `true` for dev markers. **Never ship `true`.** |
| `id` | For `ScrollTrigger.getById(id)`. |
| `containerAnimation` | Tie a trigger to a horizontal tween's progress (fake horizontal scroll). |
| `onEnter`/`onLeave`/`onEnterBack`/`onLeaveBack`/`onUpdate` | Callbacks; receive the instance (`progress`, `direction`, `isActive`). |

## scrub vs toggleActions

Pick one per trigger. `scrub` ties animation progress to scroll position (parallax, scrubbed timelines). `toggleActions` plays/reverses discretely at boundaries (reveals). If both are set, **scrub wins**.

## Pinning

```javascript
scrollTrigger: { trigger: ".section", start: "top top", end: "+=1000", pin: true, scrub: 1 }
```

Pin a wrapper element and animate its children, not the pinned node itself. See the `Pin` component in [common-patterns.md](common-patterns.md).

## Horizontal scroll (containerAnimation)

Pin a section; as the user scrolls vertically, inner content moves horizontally. The horizontal tween **must** use `ease: "none"` or scroll/position won't line up. Pinning and snapping aren't available on `containerAnimation`-based triggers.

```javascript
const scrollTween = gsap.to(".horizontal-el", {
  xPercent: () => Math.min(0, window.innerWidth - el.offsetWidth),
  ease: "none",
  scrollTrigger: {
    trigger: ".horizontal-el",
    pin: ".horizontal-el-parent",
    start: "top top",
    end: "+=1000",
    invalidateOnRefresh: true, // re-run function values on resize/refresh, not every frame
  },
});
gsap.to(".nested", {
  y: 100,
  scrollTrigger: { containerAnimation: scrollTween, trigger: ".nested", start: "left center" },
});
```

## batch()

`ScrollTrigger.batch(targets, vars)` groups callbacks for many elements that enter around the same time — a cleaner alternative to per-element triggers for staggered reveals. Batched callbacks receive `(elements, triggers)`. Don't pass `trigger`, `scrub`, `snap`, or `toggleActions`.

```javascript
ScrollTrigger.batch(".card", {
  start: "top 80%",
  onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, stagger: 0.1, overwrite: true }),
  onLeaveBack: (els) => gsap.set(els, { autoAlpha: 0, y: 50, overwrite: true }),
});
```

## FORBIDDEN

- Putting `scrollTrigger` on a tween **inside** a timeline. Put it on the timeline/top-level tween only.
- Using `scrub` and `toggleActions` together on the same trigger.
- Using an ease other than `"none"` on a `containerAnimation` horizontal tween.
- Leaving `markers: true` in committed code.
- Skipping `trigger.kill()` cleanup — leaks and updates on detached nodes after route changes.
- Forgetting `window.updateLenis({ immediate: true })` after fonts/images/dynamic content change layout.
- Calling `ScrollTrigger.refresh()` or `lenis.resize()` directly from components — use `window.updateLenis()` (see [scroll-smoother.md](scroll-smoother.md)).
- Adding per-component `window.resize` listeners that refresh triggers — resize is centralized in `ScrollSmootherContainer`.
- Layout reads (`offsetWidth`, `getBoundingClientRect`) inside `onUpdate` or scroll handlers — use function-based tween values + `invalidateOnRefresh: true` instead.

## Checklist

- [ ] Plugin registered once, client-side.
- [ ] Trigger stored and killed in cleanup.
- [ ] One of `scrub` / `toggleActions`, not both.
- [ ] `window.updateLenis({ immediate: true })` (or fonts-loaded gate) after layout-affecting changes.
- [ ] Viewport-dependent tween values use `invalidateOnRefresh: true`.
- [ ] No `markers: true` committed.
