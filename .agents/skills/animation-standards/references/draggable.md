# Draggable

Make elements draggable, spinnable, or throwable with mouse/touch — sliders, cards, reorderable lists, knobs. Pair with InertiaPlugin for momentum/throw.

> All GSAP plugins are **free**, including Draggable and InertiaPlugin. Install from the public `gsap` package (`npm install gsap`). No auth token, `.npmrc`, or Club membership.
>
> Mechanics → https://gsap.com/docs/v3/Plugins/Draggable/

## REQUIRED

- **Register before use:** `gsap.registerPlugin(Draggable, InertiaPlugin)` (drop InertiaPlugin if not using `inertia`).
- **Client-only** (App Router): create Draggables inside `useGSAP`/`useEffect`.
- **Clean up on unmount:** `Draggable.create()` returns an array of instances — `kill()` each in cleanup. `useGSAP`/`gsap.context()` reverts them automatically (see [common-patterns.md](common-patterns.md)).

```javascript
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

gsap.registerPlugin(Draggable, InertiaPlugin);

const [drag] = Draggable.create(".box", {
  type: "x,y",
  bounds: "#container",
  inertia: true,
  edgeResistance: 0.65,
});
// cleanup: drag.kill()
```

## Key options

| Option | Notes |
| --- | --- |
| `type` | `"x"`, `"y"`, `"x,y"`, `"rotation"`, `"scroll"`. |
| `bounds` | Element, selector, or `{ minX, maxX, minY, maxY }`. |
| `inertia` | `true` for throw/momentum (requires InertiaPlugin). |
| `edgeResistance` | 0–1; resistance past bounds. |
| `cursor` | CSS cursor during drag. |
| `onDragStart` / `onDrag` / `onDragEnd` | Drag callbacks. |
| `onThrowUpdate` / `onThrowComplete` | Inertia callbacks. |

## In React

Scope to a container ref and revert on unmount:

```javascript
useGSAP(() => {
  Draggable.create(boxRef.current, { type: "x,y", bounds: containerRef.current, inertia: true });
}, { scope: containerRef });
```

`useGSAP` cleanup reverts the Draggable automatically. With a manual `useEffect`, keep the returned instances and `kill()` them in the cleanup.

## FORBIDDEN

- Using Draggable without registering it.
- Generating an `.npmrc` / GreenSock auth token or pointing at a private registry to "unlock" it — unnecessary, it's free.
- Leaving instances alive after unmount.

## Checklist

- [ ] `registerPlugin(Draggable[, InertiaPlugin])` once.
- [ ] Created client-side, scoped to a ref.
- [ ] Instances killed/reverted on unmount.
