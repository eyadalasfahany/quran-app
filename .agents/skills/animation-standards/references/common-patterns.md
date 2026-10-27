# Common Patterns (GSAP + Next.js)

How GSAP is wired into this App Router codebase: client-only execution, the loading/fonts orchestration that gates reveals, and the canonical reusable animation components. Reuse these components — don't hand-roll a new ScrollTrigger per feature.

> Related: [scroll-trigger.md](scroll-trigger.md), [timeline.md](timeline.md), [split-text.md](split-text.md), [draggable.md](draggable.md).

## React / Next.js rules (non-negotiable)

- **`"use client"` on anything that animates.** GSAP runs in the browser only; never call `gsap`/`ScrollTrigger` during SSR or in the render body.
- **Register plugins once, client-side:** `gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)`. Never at module scope where the server evaluates it.
- **Prefer `useGSAP()` from `@gsap/react`** over raw `useEffect` for new code — automatic revert/cleanup, scope, and `contextSafe`. The existing components below predate that and use `useEffect` + manual `kill()`/`revert()`, which is acceptable as long as cleanup is present.
- **Choose the right target strategy** (see [Choosing how to target elements](#choosing-how-to-target-elements) below). Always hold a **container ref**; then use individual refs for one-offs or scoped class/querySelector for groups — never `document.querySelector` globally.
- **Mount guards, not timer polls.** Inside `useGSAP`/`useEffect`, bail early when refs are not ready (`if (!containerRef.current) return`). Do not `setTimeout` to "wait for DOM" — the effect already runs after paint when refs are populated. Use `useLayoutEffect` only when you must measure before first paint (rare; prefer `invalidateOnRefresh` on ScrollTrigger).
- **No ad-hoc timers for animation.** Do not use `setTimeout`/`setInterval`/standalone `requestAnimationFrame` to drive tweens, stagger steps, scroll physics, or layout polling. Use GSAP timelines (`onComplete`, position parameter), `delay`/`stagger`, `ScrollTrigger`, or the centralized `gsap.ticker` + Lenis path. Per-component `window.resize` listeners and debounced `setTimeout` refresh handlers are forbidden — use `window.updateLenis()` only.
- **Scope selectors.** Pass a `scope` (ref) to `useGSAP`/`gsap.context()` or query within a container ref (`gsap.utils.selector(container)`) so `.class` selectors never escape the component.
- **Always clean up.** Kill triggers and `revert()` SplitText/contexts in the effect return. Critical here because the custom router swaps pages without a full reload.

### Choosing how to target elements

Before writing animation code, ask: **how many elements need to be referenced, and are they individual or a group sharing the same tween?**

| Situation | Use | Example |
| --- | --- | --- |
| **One specific element** you animate or use as ScrollTrigger/pin anchor | Dedicated `useRef` → `ref.current` | Hero headline, parallax inner layer (`imageRef`), section wrapper (`containerRef`) |
| **Many elements, same animation** (stagger, shared reveal) | Scoped class + `gsap.utils.selector(containerRef)` | `._eleY` children, `.card` list items, `._split` text blocks |
| **One child located by prop/config** inside a known container | `containerRef.current.querySelector(propSelector)` — scoped, not `document` | `wrapperSelector` / `triggerSelector` in `GeneralAnimation` |
| **2–3 named elements** with different animations | Separate refs per element (not an array of refs for 20 items) | `headlineRef`, `ctaRef`, `imageRef` on the same section |
| **Dynamic list** where count changes | Scoped `querySelectorAll` or class inside container; re-run effect/`revertOnUpdate` when list changes | `q(".list-item")` with `dependencies: [items.length]` |

**Rules**

1. **Always** attach a `containerRef` to the component root (or animation wrapper) and pass it as `useGSAP` `scope`.
2. **Individual ref** when the element is unique and you reference it more than once (trigger + tween target, or parallax container + inner layer).
3. **Scoped class / `gsap.utils.selector`** when multiple siblings share the same animation — do **not** create `useRef` per list item.
4. **`document.querySelector` / global selectors** are never allowed — query only inside `containerRef.current`.
5. **ScrollTrigger `trigger`** is usually `containerRef.current` (the section). Pin target can be a child ref or a scoped selector like `".sticky-card"` queried inside the container.

```tsx
// ✅ Individual refs — few specific elements
const sectionRef = useRef<HTMLDivElement>(null);
const titleRef = useRef<HTMLHeadingElement>(null);
const imageRef = useRef<HTMLDivElement>(null);

useGSAP(() => {
  if (!sectionRef.current || !titleRef.current || !imageRef.current) return;
  gsap.from(titleRef.current, { autoAlpha: 0, y: 40 });
  ScrollTrigger.create({ trigger: sectionRef.current, pin: imageRef.current, ... });
}, { scope: sectionRef });

// ✅ Many elements — scoped class, one container ref
const containerRef = useRef<HTMLDivElement>(null);
useGSAP(() => {
  if (!containerRef.current) return;
  const q = gsap.utils.selector(containerRef);
  gsap.from(q("._eleY"), { autoAlpha: 0, y: 24, stagger: 0.1,
    scrollTrigger: { trigger: containerRef.current, start: "top 80%" } });
}, { scope: containerRef });

// ❌ Wrong — ref per list item when they share one animation
items.map((item, i) => {
  const ref = useRef(null); // illegal: hooks in loop
  ...
});

// ❌ Wrong — global document query
document.querySelectorAll(".card");
gsap.to(".hero-title", { y: 100 }); // unscoped selector
```

### Ref-first targeting (examples)

```tsx
"use client";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

function RevealBlock({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    if (!containerRef.current || !headlineRef.current) return;

    // ✅ Direct ref targets — best for single elements
    gsap.from(headlineRef.current, { autoAlpha: 0, y: 24, duration: 0.8 });

    // ✅ Scoped selector — OK for multiple descendants inside the container
    const q = gsap.utils.selector(containerRef);
    gsap.from(q("._eleY"), {
      autoAlpha: 0, y: 24, stagger: 0.1,
      scrollTrigger: { trigger: containerRef.current, start: "top 80%" },
    });
  }, { scope: containerRef }); // cleanup is automatic

  return (
    <div ref={containerRef}>
      <h2 ref={headlineRef}>{children}</h2>
      <p className="_eleY">…</p>
    </div>
  );
}
```

```tsx
// ❌ Avoid — global document queries, no scope, breaks SSR/multi-instance
const el = document.querySelector(".hero");
gsap.to(".hero-title", { y: 100 });

// ❌ Avoid — timer to wait for DOM; useEffect/useGSAP already runs after mount
setTimeout(() => {
  gsap.to(containerRef.current, { autoAlpha: 1 });
}, 100);

// ❌ Avoid — RAF loop for scroll/animation; use ScrollTrigger or gsap.ticker
function tick() {
  gsap.set(boxRef.current, { x: scrollY * 0.5 });
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
```

```javascript
"use client";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

useGSAP(() => {
  if (!containerRef.current) return;
  const q = gsap.utils.selector(containerRef);
  gsap.from(q(".item"), { autoAlpha: 0, y: 24, stagger: 0.1,
    scrollTrigger: { trigger: containerRef.current, start: "top 80%" } });
}, { scope: containerRef }); // cleanup is automatic
```

## Animation orchestration: loading state + fonts

Reveal animations must not fire until (a) custom fonts are loaded (line metrics are final, so SplitText splits correctly and ScrollTrigger positions are accurate) and (b) the page transition has settled. Two contexts coordinate this; reveal components read both before creating triggers.

### `isFontsLoadedContext` — fonts ready gate

```tsx
"use client"
import { createContext, useEffect, useState } from "react"

export interface IsFontsLoadedContextType { isFontsLoaded: boolean }
export const isFontsLoadedContext = createContext<IsFontsLoadedContextType>(null)

function IsFontsLoadedProvider({ children }: { children: React.ReactNode }) {
  const [isFontsLoaded, setIsFontsLoaded] = useState(false);
  useEffect(() => {
    document.fonts.ready.then(() => setIsFontsLoaded(true));
  }, []);
  return (
    <isFontsLoadedContext.Provider value={{ isFontsLoaded }}>
      {children}
    </isFontsLoadedContext.Provider>
  )
}
export default IsFontsLoadedProvider;
```

### `loadingStateContext` — page transition state machine

States: `"start-loading" → "send-request" → "content-fetched" → "page-ready"`. Reveals only build their ScrollTriggers once state is `"page-ready"`, and bail out while `"start-loading"`.

```tsx
"use client"
import React, { createContext, useState } from "react"

type loadingType = "start-loading" | "send-request" | "content-fetched" | "page-ready";
export const loadingStateContext = createContext<{
  loadingState: loadingType
  setLoadingState: React.Dispatch<React.SetStateAction<loadingType>>
}>({ loadingState: "content-fetched", setLoadingState: () => {} })

export default function LoadingStateContextProvider({ children }: { children: React.ReactNode }) {
  const [loadingState, setLoadingState] = useState<loadingType>("start-loading");
  return (
    <loadingStateContext.Provider value={{ loadingState, setLoadingState }}>
      {children}
    </loadingStateContext.Provider>
  )
}
```

### Delayed navigation: `useNavigation` + `NavLink`

Navigation is deferred so an exit animation can play before the route changes. Both set `"start-loading"`, wait, then `router.push` and move to `"send-request"`. A `navigationIsRunning` ref guards against double-fires. **Use `NavLink` / `useNavigation` for internal links instead of bare `next/link` / `router.push`** so transitions stay in sync with the loading state.

> **Timer note:** The snippets below use `setTimeout` with a fixed `LOADING_DELAY` — a legacy pattern. For new code, prefer driving navigation from a GSAP exit timeline's `onComplete` (or the loading state machine reacting to animation end) so the delay matches actual animation duration instead of a magic number. Keep `setTimeout` here only when no timeline owns the exit animation.

```tsx
// useNavigation.ts
import { useContext, useEffect, useRef } from "react";
import { loadingStateContext } from "../context/loadingStateContext";
import { useRouter, usePathname } from "next/navigation";

const LOADING_DELAY = 1000;

export const useNavigation = () => {
  const { loadingState, setLoadingState } = useContext(loadingStateContext);
  const navigationIsRunning = useRef<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loadingState === "page-ready") navigationIsRunning.current = false;
  }, [loadingState]);

  return {
    push: (url: string, options?: any) => {
      if (url === pathname) return;
      if (navigationIsRunning.current) return;
      setLoadingState("start-loading");
      navigationIsRunning.current = true;
      setTimeout(() => {
        router.push(url, options);
        setLoadingState("send-request");
      }, LOADING_DELAY);
    },
  }
}
```

```tsx
// NavLink.tsx — drop-in next/link replacement; external/_blank links pass through untouched
"use client"
import React, { useContext, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { loadingStateContext } from '@/app/context/loadingStateContext'

interface LinkProps extends Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href' | 'onClick'> {
  children: React.ReactNode
  href: string
  target?: string
  prefetch?: boolean
  ref?: React.RefObject<HTMLAnchorElement>
  handleClick?: () => void
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

const EXTERNAL_URL_REGEX = /^(https?:|mailto:|tel:|wa\.me)/;
const LOADING_DELAY = 1000;

function NavLink({ children, href, target, prefetch = false, ref, onClick, ...props }: LinkProps) {
  const { loadingState, setLoadingState } = useContext(loadingStateContext);
  const router = useRouter();
  const pathname = usePathname();
  const navigationIsRunning = useRef<boolean>(false);

  const isExternalUrl = EXTERNAL_URL_REGEX.test(href);
  const shouldUseCustomNavigation = target !== '_blank' && !isExternalUrl

  const handleNavigation = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    e.preventDefault();
    const normalizedTarget = href.replace(/\/+$/, '') || '/';
    const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
    if (normalizedTarget !== normalizedPathname) {
      if (navigationIsRunning.current) return;
      setLoadingState('start-loading');
      navigationIsRunning.current = true;
      setTimeout(() => {
        router.push(href);
        setLoadingState("send-request");
      }, LOADING_DELAY);
    }
  }, [href, pathname, onClick, setLoadingState, router]);

  useEffect(() => {
    if (loadingState === "content-fetched") navigationIsRunning.current = false;
  }, [loadingState])

  return (
    <Link ref={ref} onClick={shouldUseCustomNavigation ? handleNavigation : onClick}
      href={href} target={target} prefetch={prefetch} {...props}>
      {children}
    </Link>
  )
}
export default NavLink;
```

**Provider order (root layout):** `IsMobileProvider` → `ScrollSmootherContainer` → `LoadingStateContextProvider` → `IsFontsLoadedProvider` → page content. Mobile detection must resolve before Lenis mounts (see [scroll-smoother.md](scroll-smoother.md)); loading/fonts contexts gate reveal animations.

## Reusable animation components

### `GeneralAnimation` — scroll-reveal (SplitText + ScrollTrigger + timeline)

The workhorse reveal. Splits `._split` text into masked lines and/or moves `._eleX/_eleY/_eleRX/_eleRY` elements in on scroll. Gated on `isFontsLoaded` and `loadingState === "page-ready"`; cleans up the trigger and reverts SplitText on unmount.

Wrap content, give it a `containerRef`, tag children with the relevant class (`._split`, `._eleY`, …), and pick a `type`.

```tsx
"use client";
import { isFontsLoadedContext } from '@/app/context/isFontLoadedContext';
import { loadingStateContext } from '@/app/context/loadingStateContext';
import gsap, { EaseString } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import React, { useContext, useEffect } from 'react'

type AnimationTypes = "_eleX" | "_eleY" | "_eleRY" | "_eleRX" | "void" | Array<string>;

interface GeneralAnimationProps {
  id?: string;
  children?: React.ReactNode;
  dependencies?: any;
  containerRef?: any;
  wrapperSelector?: string;
  triggerSelector?: string;
  staggerTime?: number;
  delayTime?: number;
  durationTime?: number;
  easeFunction?: EaseString;
  start?: string;
  end?: string;
  markers?: boolean;
  once?: boolean;
  type?: AnimationTypes;
  startPosition?: gsap.TweenVars;
  endPosition?: gsap.TweenVars;
  split?: boolean;
  typeClassName?: string;
  plus?: string;
  onEnter?: () => void;
  onComplete?: () => void;
  onEnterBack?: () => void;
  onLeaveBack?: () => void;
}

function GeneralAnimation({
  id, children, dependencies, containerRef, wrapperSelector, triggerSelector,
  delayTime, staggerTime, durationTime, easeFunction, start, end, markers,
  once = true, type, startPosition, endPosition, split = true, typeClassName,
  plus, onEnter, onComplete, onEnterBack, onLeaveBack,
}: GeneralAnimationProps) {
  const { isFontsLoaded } = useContext(isFontsLoadedContext);
  const { loadingState } = useContext(loadingStateContext);
  const isRTL = false;

  useEffect(() => {
    if (!isFontsLoaded) return;
    if (!containerRef.current) return;
    if (loadingState === "start-loading") return;

    const container = containerRef.current;
    const wrapperSelectorElement = container.querySelector(wrapperSelector);
    const query = gsap.utils.selector(wrapperSelectorElement || container);
    const target = triggerSelector ? container.querySelector(triggerSelector) : container;

    let elements: any;
    let tweendProperties = {};
    const ease = easeFunction || 'power3.out';
    const duration = durationTime || 1;
    const delay = delayTime || 0.25;
    const stagger = staggerTime || 0.1;

    let splitedText: SplitText;
    if (split) {
      const targetText = query("._split");
      splitedText = new SplitText(targetText, {
        type: "lines",
        linesClass: type as unknown as string,
        mask: "lines",
      });
    }

    if (type === "_eleX") {
      elements = query(typeClassName || "._eleX");
      gsap.set(elements, startPosition || { x: isRTL ? "-30%" : "30%", autoAlpha: 0 });
      tweendProperties = Object.assign(tweendProperties, endPosition || { x: 0, autoAlpha: 1 });
    }
    if (type === "_eleY") {
      elements = query(typeClassName || "._eleY");
      gsap.set(elements, startPosition || { y: window.innerHeight * 0.15, autoAlpha: 0 });
      tweendProperties = Object.assign(tweendProperties, endPosition || { y: 0, autoAlpha: 1 });
    }
    if (type === "_eleRY") {
      elements = query(typeClassName || "._eleRY");
      gsap.set(elements, startPosition || { opacity: 0, rotateY: isRTL ? '-30deg' : '30deg', yPercent: 40 });
      tweendProperties = Object.assign(tweendProperties, endPosition || { opacity: 1, rotateY: 0, yPercent: 0 });
    }
    if (type === "_eleRX") {
      elements = query(typeClassName || "._eleRX");
      gsap.set(elements, startPosition || { opacity: 0, rotateX: '90deg', y: window.innerHeight * 0.35 });
      tweendProperties = Object.assign(tweendProperties, endPosition || { opacity: 1, rotateX: 0, y: 0 });
    }
    if (plus === "PN") {
      gsap.set(elements, startPosition || { pointerEvents: "none" });
      tweendProperties = Object.assign(tweendProperties, endPosition || { pointerEvents: "auto" });
    }

    if (loadingState === "page-ready") {
      const trigger = ScrollTrigger.create({
        id,
        trigger: target,
        start: start || "top bottom",
        end: end || start || "top bottom",
        once,
        onEnter: () => {
          if (type) {
            const timeline = gsap.timeline({ delay });
            timeline.to(elements, { duration, stagger, ease, onComplete, ...tweendProperties });
          }
          onEnter?.();
        },
        onEnterBack,
        onLeaveBack,
      });

      return () => {
        trigger.kill();
        splitedText?.revert();
      };
    }
  }, [loadingState, isFontsLoaded]);

  return <>{children}</>
}

export default GeneralAnimation;
```

**Usage**

```tsx
const ref = useRef<HTMLDivElement>(null);
<div ref={ref}>
  <GeneralAnimation containerRef={ref} type="_eleY" start="top 80%">
    <h2 className="_split">Headline that reveals line by line</h2>
    <p className="_eleY">Fades and rises into place.</p>
  </GeneralAnimation>
</div>
```

Notes / gotchas: gate is intentional (`isFontsLoaded` + `page-ready`) — keep it. `mask: "lines"` requires the split lines to be clipped; the line wrappers get `linesClass = type`, so style reveal offsets via that class. SplitText and ScrollTrigger must be registered once at app start.

### `ParallaxContainer` — scrubbed image/element parallax

Scales inner content and translates it on scroll via a standalone `ScrollTrigger` with `scrub`. Promote with `translateZ(0)` + `will-change` for smooth compositing. Cleans up its trigger on unmount.

```tsx
"use client"
import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

function ParallaxContainer({
  className, innerClassName, speed = 1.2, scale = 1.2,
  start = 'top bottom', end = 'bottom top', children,
}: {
  className?: string; objectContain?: boolean; innerClassName?: string;
  speed?: number; scale?: number; start?: string; end?: string;
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const image = imageRef.current
    if (!container || !image) return

    const offset = (scale - 1) / 2;
    const travel = offset * 2 * 100 * speed;

    gsap.set(image, { yPercent: -offset * 100 * speed })

    const trigger = ScrollTrigger.create({
      trigger: container, start, end, scrub: true,
      onUpdate: (self) => {
        gsap.set(image, { yPercent: (-offset * 100 * speed) + (self.progress * travel) })
      },
    })

    return () => { trigger.kill() }
  }, [speed, scale])

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className ?? ''}`}>
      <div ref={imageRef}
        style={{ transform: `translateZ(0) scale(${scale})`, willChange: 'transform' }}
        className={`absolute inset-0 ${innerClassName ?? ''}`}>
        {children}
      </div>
    </div>
  )
}

export default ParallaxContainer
```

**Usage**

```tsx
<ParallaxContainer scale={1.25} speed={1.2} className="h-[60vh]">
  <Image src="/hero.jpg" alt="" fill className="object-cover" />
</ParallaxContainer>
```

Notes: `scale > 1` gives headroom so the translate never reveals empty edges. Higher `speed` = more travel. Uses `gsap.set` in `onUpdate` (no tween) so it tracks scroll exactly.

### `Pin` — pin a section through a scroll range

Thin wrapper over ScrollTrigger pinning. Pin a wrapper; animate children separately (e.g. with `GeneralAnimation` inside).

```tsx
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import React, { useEffect } from 'react'

function Pin({
  children, containerRef, pinTarget, start, end, pinSpacing, markers
}: {
  children: React.ReactNode,
  containerRef: React.RefObject<HTMLDivElement>,
  pinTarget: string | boolean,
  start?: string, end?: string, pinSpacing?: boolean, markers?: boolean,
}) {
  useEffect(() => {
    if (!containerRef.current) return;
    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: start || "top top",
      end: end || "bottom bottom",
      pin: pinTarget,
      pinSpacing,
      markers,
    });
    return () => { trigger.kill() };
  }, []);

  return <>{children}</>
}

export default Pin
```

**Usage**

```tsx
const sectionRef = useRef<HTMLDivElement>(null);
<div ref={sectionRef}>
  <Pin containerRef={sectionRef} pinTarget=".sticky-card" start="top top" end="+=1200">
    <div className="sticky-card">Stays put while the section scrolls</div>
  </Pin>
</div>
```

Notes: `pinTarget` can be a selector or `true` (pin the trigger). Pin a wrapper and animate its children — never animate the pinned node. Don't leave `markers` on in committed code.

## Checklist (every animation component)

- [ ] `"use client"`; plugins registered once, client-side; no GSAP during render/SSR.
- [ ] Target strategy chosen: individual `useRef` for one-offs, scoped class/`gsap.utils.selector` for many — no `document.querySelector`.
- [ ] No ad-hoc `setTimeout` / `setInterval` / RAF for animation timing; GSAP timelines or lifecycle hooks.
- [ ] Selectors scoped to a container ref.
- [ ] Trigger/SplitText/Draggable cleaned up (`kill()` / `revert()`) on unmount.
- [ ] Reveal logic gated on fonts loaded + `loadingState === "page-ready"`.
- [ ] Reused an existing component (`GeneralAnimation`/`ParallaxContainer`/`Pin`) before writing a new ScrollTrigger.
- [ ] No `markers: true` committed.
