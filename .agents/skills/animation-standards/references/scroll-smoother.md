# Smooth Scroll (Lenis + ScrollTrigger)

This codebase uses **[Lenis](https://github.com/darkroomengineering/lenis)** for smooth scrolling, synced to GSAP ScrollTrigger — **not** GSAP's own `ScrollSmoother` plugin. One `ScrollSmootherContainer` mounts near the root, owns the Lenis instance, drives it from `gsap.ticker`, and exposes scroll controls on `window` for the rest of the app.

> If you actually want GSAP's `ScrollSmoother` plugin instead, see https://gsap.com/docs/v3/Plugins/ScrollSmoother/ — but the standard here is Lenis. Don't run both at once.
>
> Related: [scroll-trigger.md](scroll-trigger.md), [common-patterns.md](common-patterns.md).

## Why this exists

- Native scroll feels abrupt; Lenis interpolates it (`lerp`) for momentum.
- ScrollTrigger must read Lenis's scroll position, so Lenis's `scroll` event calls `ScrollTrigger.update`, and Lenis's RAF is driven by `gsap.ticker` (single shared animation loop — never two competing RAF loops).
- App-wide scroll control (lock during modals/nav, programmatic scroll-to) is centralized on `window` helpers so any component can call them without prop-drilling the Lenis instance.

## REQUIRED

- **Single instance.** Mount `ScrollSmootherContainer` once, high in the tree. Never create a second Lenis.
- **Drive Lenis from `gsap.ticker`**, not its own RAF, and set `gsap.ticker.lagSmoothing(0)` so scrub stays in sync after tab-switches/jank.
- **Sync ScrollTrigger:** `lenis.on("scroll", ScrollTrigger.update)`.
- **Client-only** (`"use client"`) and inside `useLayoutEffect` so the smooth wrapper exists before first paint.
- **Full cleanup:** `lenis.destroy()`, `gsap.ticker.remove(raf)`, and clear the `window` helpers on unmount.
- **Refresh after layout changes** through `window.updateLenis()` (debounced `lenis.resize()` + `ScrollTrigger.refresh()`) — e.g. after fonts load, content height changes, or route transitions. Pass `{ immediate: true }` when the layout is already settled and you cannot wait (route transition complete, fonts loaded).
- **Resize without breaking animations:** handle viewport resize in one place (`ScrollSmootherContainer`), debounced (~200ms). Always call `lenis.resize()` **before** `ScrollTrigger.refresh()`. Disable ScrollTrigger's built-in resize refresh (`autoRefreshEvents` omits `resize`) so Lenis and triggers stay in sync and scrub/pin progress is not reset mid-drag.
- **Mobile:** the inner `#smooth-content` wrapper is skipped on mobile and `ScrollTrigger.config({ ignoreMobileResize: true })` is set to avoid jumps from mobile URL-bar resize.
- **Provider order:** `IsMobileProvider` must wrap `ScrollSmootherContainer` — the container reads `isMobile` from context and its `useLayoutEffect` depends on `[isMobile]`.

## IsMobileProvider (required dependency)

`ScrollSmootherContainer` consumes `isMobileContext`. Mount `IsMobileProvider` **above** it in the root layout. The provider gates children until `isMobile` is resolved (`null` → `boolean`) so Lenis never initializes with an unknown breakpoint.

| Breakpoint | Query | Used for |
| --- | --- | --- |
| Mobile | `(max-width: 1024px)` | Skips `#smooth-content`, sets `ignoreMobileResize`, toggles `is-mobile` on `<html>` |
| Tablet | `(max-width: 1024px) and (min-width: 640px)` | Available via context; scroll container uses `isMobile` only |

Breakpoint changes update React state only — **do not** call `ScrollTrigger.refresh()` here. Layout recalc is delegated to the debounced `window.updateLenis()` in `ScrollSmootherContainer` so resize does not fight scrub/pin animations.

```tsx
"use client"

import { createContext, useEffect, useState } from "react"

export interface IsMobileContextType {
  isMobile: boolean
  setMobile: React.Dispatch<React.SetStateAction<boolean>>
  setTablet: React.Dispatch<React.SetStateAction<boolean>>
  isTablet: boolean
  screenOrientation: string
  isIOS: boolean
}
export const isMobileContext = createContext<IsMobileContextType>(null)

const MOBILE_QUERY = "(max-width: 1024px)"
const TABLET_QUERY = "(max-width: 1024px) and (min-width: 640px)"

function IsMobileProvider(props: { children: React.ReactNode }) {
  const [isMobile, setMobile] = useState<boolean>(null)
  const [isTablet, setTablet] = useState<boolean>(null)
  const [screenOrientation, setScreenOrientation] = useState<string>("")
  const [isIOS, setIsIOS] = useState<boolean>(false)

  useEffect(() => {
    const mobileMql = window.matchMedia(MOBILE_QUERY)
    const tabletMql = window.matchMedia(TABLET_QUERY)

    const syncBreakpoints = () => {
      setMobile(mobileMql.matches)
      setTablet(tabletMql.matches)
      setScreenOrientation(window?.screen?.orientation?.type ?? "")
    }

    const onBreakpointChange = () => {
      syncBreakpoints()
      window.updateLenis?.()
    }

    const onOrientationChange = () => {
      syncBreakpoints()
      window.updateLenis?.()
    }

    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    setIsIOS(isIOSDevice)

    syncBreakpoints()
    mobileMql.addEventListener("change", onBreakpointChange)
    tabletMql.addEventListener("change", onBreakpointChange)
    window.addEventListener("orientationchange", onOrientationChange)

    return () => {
      mobileMql.removeEventListener("change", onBreakpointChange)
      tabletMql.removeEventListener("change", onBreakpointChange)
      window.removeEventListener("orientationchange", onOrientationChange)
    }
  }, [])

  useEffect(() => {
    if (isMobile) {
      document.documentElement.classList.add("is-mobile")
      if (isIOS) {
        document.documentElement.classList.add("is-ios")
        document.documentElement.classList.remove("is-android")
      } else {
        document.documentElement.classList.remove("is-ios")
        document.documentElement.classList.add("is-android")
      }
    } else {
      document.documentElement.classList.remove("is-mobile")
    }
  }, [isMobile, isIOS])

  return (
    <isMobileContext.Provider
      value={{
        isMobile,
        setMobile,
        isTablet,
        setTablet,
        screenOrientation,
        isIOS,
      }}
    >
      {isMobile != null ? props.children : null}
    </isMobileContext.Provider>
  )
}

export default IsMobileProvider
```

**Root layout order:** `IsMobileProvider` → `ScrollSmootherContainer` → rest of app (alongside `LoadingStateContextProvider` / `IsFontsLoadedProvider` — see [common-patterns.md](common-patterns.md)).

## Resize without breaking animations

Viewport resize is handled **only** in `ScrollSmootherContainer`:

1. **Debounce (~200ms)** — coalesces drag-resize events; avoids refresh storms that reset scrub progress or jitter pinned sections.
2. **`lenis.resize()` then `ScrollTrigger.refresh()`** — Lenis must recalc scroll bounds before triggers re-measure, or positions drift.
3. **`autoRefreshEvents` excludes `resize`** — GSAP's built-in resize refresh runs without Lenis awareness; disabling it prevents double-refresh races.
4. **`IsMobileProvider` never refreshes ScrollTrigger** — it only flips breakpoint state and calls `window.updateLenis()` (already debounced) when the media query crosses.

For layout changes you control (fonts loaded, accordion open, route transition done), call `window.updateLenis({ immediate: true })` once the DOM is final.

## Component

```tsx
"use client"

import { useContext, useEffect, useLayoutEffect, useRef } from "react"
import Lenis from "lenis"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import MorphSVGPlugin from "gsap/MorphSVGPlugin"
import { isMobileContext } from "@/app/context/isMobileContext"

const RESIZE_DEBOUNCE_MS = 200

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let id: ReturnType<typeof setTimeout> | undefined
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(id)
    id = setTimeout(() => fn(...args), ms)
  }
  debounced.cancel = () => clearTimeout(id)
  debounced.flush = (...args: Parameters<T>) => {
    clearTimeout(id)
    fn(...args)
  }
  return debounced
}

declare global {
  interface Window {
    lenisProgress: () => number
    stopScroll?: (value: boolean, force?: boolean) => void
    scrollToTarget?: (target: number | Element | string, smooth?: boolean, force?: boolean, options?: { duration: number, ease?: (x: number) => number }) => void
    currentScrollPosition?: () => number
    isScrollPaused?: () => boolean
    updateLenis?: (options?: { immediate?: boolean }) => void
  }
}

gsap.config({ nullTargetWarn: false })
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText, MorphSVGPlugin)

const ScrollSmootherContainer = ({ children }: { children: React.ReactNode }) => {
  const { isMobile } = useContext(isMobileContext)
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const onScroll = () => {
      document.body.classList.toggle("scrolled", window.pageYOffset >= 10)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });

    ScrollTrigger.config({
      ignoreMobileResize: isMobile,
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
    });

    const lenis = new Lenis({
      lerp: 0.06,
      smoothWheel: true,
      syncTouch: true,
      syncTouchLerp: 0.06,
    })
    lenis.scrollTo(0, { immediate: true });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    window.stopScroll = (value, force) => {
      const doc = document.documentElement
      if (!doc.classList.contains("nav") || force) {
        if (value) { lenis.stop(); doc.classList.add("scroll-paused") }
        else { lenis.start(); doc.classList.remove("scroll-paused") }
      }
    }
    window.scrollToTarget = (target, smooth, force, options) => {
      const doc = document.documentElement
      if (!doc.classList.contains("nav") || force) {
        lenis.scrollTo(target as number | HTMLElement | string, {
          duration: smooth ? options?.duration || 0.5 : 0,
          easing: options?.ease || ((x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
          force,
          immediate: !smooth,
        })
      }
    }
    window.lenisProgress = () => lenis.progress;
    window.currentScrollPosition = () => lenis.scroll;
    window.isScrollPaused = () => lenis.isStopped;

    const refreshLayout = () => {
      lenis.resize();
      ScrollTrigger.refresh();
    };
    const debouncedRefreshLayout = debounce(refreshLayout, RESIZE_DEBOUNCE_MS);

    window.updateLenis = (options) => {
      if (options?.immediate) debouncedRefreshLayout.flush();
      else debouncedRefreshLayout();
    };

    window.addEventListener("resize", debouncedRefreshLayout);

    return () => {
      window.removeEventListener("resize", debouncedRefreshLayout);
      debouncedRefreshLayout.cancel();
      lenis.destroy();
      lenisRef.current = null
      window.lenis = null
      window.updateLenis = undefined
      gsap.ticker.remove(raf);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [isMobile])

  return (
    <div id="smooth-container">
      <div id="smooth-wrapper">
        {isMobile ? children : <div id="smooth-content">{children}</div>}
      </div>
    </div>
  )
}

export default ScrollSmootherContainer
```

## Lenis native APIs vs app helpers

Lenis has **no** `window.updateLenis` — that is an **app helper** defined by `ScrollSmootherContainer`. Do not call Lenis primitives directly from feature components; the Lenis instance is private to the container.

| Concern | Lenis / GSAP native | This app |
| --- | --- | --- |
| Frame updates (continuous scroll physics) | `lenis.raf(time)` — typically in a RAF loop | Driven via `gsap.ticker.add((time) => lenis.raf(time * 1000))` — **never** a separate `requestAnimationFrame` loop alongside the ticker |
| ScrollTrigger sync | `lenis.on("scroll", ScrollTrigger.update)` | Same — wired once in `ScrollSmootherContainer` |
| Layout / dimension changes | `lenis.resize()` recalculates scroll bounds | Call `window.updateLenis()` — runs debounced `lenis.resize()` **then** `ScrollTrigger.refresh()` in the correct order |
| Viewport resize | Generic Lenis docs often rely on GSAP's built-in resize refresh | **Disabled here** (`autoRefreshEvents` omits `resize`); one debounced path in `ScrollSmootherContainer` only |

From components after fonts load, route transitions, accordions, or late images: `window.updateLenis({ immediate: true })`. Do **not** call `lenis.resize()` or `ScrollTrigger.refresh()` directly — bypasses debounce, Lenis-first ordering, and the disabled auto-refresh config.

## window controls (use these app-wide)

| Helper | Purpose |
| --- | --- |
| `window.stopScroll(value, force?)` | Lock (`true`) / unlock (`false`) scrolling — e.g. open modal, menu. Skips when `nav` class is present unless `force`. Toggles `scroll-paused` on `<html>`. |
| `window.scrollToTarget(target, smooth?, force?, options?)` | Programmatic scroll to a number, element, or selector. `smooth` toggles duration; `options.duration` / `options.ease` override the default easeInOutQuad. |
| `window.currentScrollPosition()` | Current Lenis scroll value (px). |
| `window.lenisProgress()` | Scroll progress 0–1. |
| `window.isScrollPaused()` | Whether Lenis is stopped. |
| `window.updateLenis(options?)` | **App helper** (not a Lenis API). Debounced `lenis.resize()` + `ScrollTrigger.refresh()`. Pass `{ immediate: true }` after fonts load or route transition when DOM is settled. |

Call `window.scrollToTarget(...)` / `window.stopScroll(...)` from components rather than creating new scroll logic. After any DOM change that alters page height (route transition, accordion, late images), call `window.updateLenis({ immediate: true })`. Viewport resize is handled automatically via the debounced listener in `ScrollSmootherContainer`.

## Lenis config used here

| Option | Value | Notes |
| --- | --- | --- |
| `lerp` | `0.06` | Lower = smoother/slower catch-up. |
| `smoothWheel` | `true` | Smooth mouse-wheel input. |
| `syncTouch` | `true` | Smooth touch (use cautiously; can feel off on some devices). |
| `syncTouchLerp` | `0.06` | Touch interpolation. |

## Integration notes

- **Plugin registration lives here.** This container registers `ScrollTrigger, ScrollToPlugin, SplitText, MorphSVGPlugin` once for the whole app, so individual components don't need to re-register those. `gsap.config({ nullTargetWarn: false })` quiets warnings for conditionally-rendered targets.
- **Pinning + Lenis:** ScrollTrigger pinning works because positions come through `ScrollTrigger.update` on Lenis scroll. If pins jitter, verify the ticker wiring and that only one Lenis exists.
- **Resize:** one debounced path (`lenis.resize` → `ScrollTrigger.refresh`); never call `ScrollTrigger.refresh()` directly on `window.resize` elsewhere.
- **Resets to top on mount/unmount** (`window.scrollTo({ top: 0, behavior: "instant" })`) to avoid restored-scroll mismatches across the custom route transitions (see `useNavigation` in [common-patterns.md](common-patterns.md)).

## FORBIDDEN

- Running GSAP `ScrollSmoother` and Lenis simultaneously.
- Creating more than one Lenis instance, or giving Lenis its own `requestAnimationFrame` loop alongside `gsap.ticker`.
- Forgetting `lenis.on("scroll", ScrollTrigger.update)` — ScrollTriggers will read stale positions.
- Skipping cleanup (`lenis.destroy()`, `gsap.ticker.remove(raf)`, clearing `window` helpers) — leaks and duplicate tickers after route changes.
- Hard-coding scroll-to logic in components instead of `window.scrollToTarget`.
- Calling `ScrollTrigger.refresh()` on raw `window.resize` or from `IsMobileProvider` — use debounced `window.updateLenis()` instead.
- Calling `lenis.resize()` or `ScrollTrigger.refresh()` directly from feature components — use `window.updateLenis()` instead.
- A standalone `requestAnimationFrame` loop calling `lenis.raf()` when GSAP is already driving the ticker — use `gsap.ticker` only.

## Checklist

- [ ] `IsMobileProvider` wraps `ScrollSmootherContainer`; children render only after `isMobile` resolves.
- [ ] Exactly one `ScrollSmootherContainer` mounted near root.
- [ ] Lenis driven by `gsap.ticker` with `lagSmoothing(0)`; `ScrollTrigger.update` on Lenis scroll.
- [ ] Resize handled via debounced listener; `autoRefreshEvents` omits `resize`; `lenis.resize()` runs before `ScrollTrigger.refresh()`.
- [ ] `window.updateLenis({ immediate: true })` called after layout-affecting changes you control (fonts, route, dynamic content).
- [ ] Full cleanup on unmount.
- [ ] Components use `window.scrollToTarget` / `window.stopScroll`, not ad-hoc scroll code.
