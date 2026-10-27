# Timeline

Sequence and choreograph multiple tweens. Prefer a timeline over chained `delay`s for any multi-step animation. The reveal system here (`GeneralAnimation`) builds a small timeline per trigger.

> Mechanics → https://gsap.com/docs/v3/GSAP/Timeline/

## REQUIRED

- **Use a timeline for multi-step animation**, not stacked `delay` values.
- **Set shared values via `defaults`** so child tweens inherit `duration`/`ease`.
- **Attach ScrollTrigger to the timeline**, never to a child `.to()` (see [scroll-trigger.md](scroll-trigger.md)).
- **Store the instance** when you need playback control or cleanup.

```javascript
const tl = gsap.timeline({ defaults: { duration: 0.5, ease: "power2.out" } });
tl.to(".a", { x: 100 })
  .to(".b", { y: 50 }, "+=0.2")   // 0.2s after previous ends
  .to(".c", { autoAlpha: 0 }, "<"); // same start as previous
```

## Position parameter (3rd arg)

| Value | Meaning |
| --- | --- |
| `1` | Absolute: start at 1s. |
| `"+=0.5"` / `"-=0.2"` | Relative to current end. |
| `"<"` / `">"` | Start of / end of the previously added animation. |
| `"<0.2"` | 0.2s after previous animation's start. |
| `"label"` / `"label+=0.3"` | At a label (+ offset). |

## Labels

```javascript
tl.addLabel("intro", 0).to(".a", { x: 100 }, "intro");
tl.addLabel("outro", "+=0.5").to(".b", { autoAlpha: 0 }, "outro");
tl.play("outro");
```

## Constructor options

`paused: true`, `repeat`, `yoyo`, `defaults`, `onComplete`/`onStart`/`onUpdate`, and `scrollTrigger`. Note: a timeline's duration is determined by its children — the constructor has no `duration`.

## Nesting

```javascript
const master = gsap.timeline();
const child = gsap.timeline().to(".a", { x: 100 }).to(".b", { y: 50 });
master.add(child, 0).to(".c", { autoAlpha: 0 }, "+=0.2");
```

## Playback

`play()`, `pause()`, `reverse()`, `restart()`, `seek(time)`, `progress(0.5)`, `kill()` (kills children by default).

## FORBIDDEN

- Chaining `delay` to fake sequencing when a timeline is clearer.
- Nesting a ScrollTriggered animation inside a parent timeline — triggers live on top-level animations only.

## Checklist

- [ ] Multi-step animation uses a timeline + position parameter.
- [ ] Shared `duration`/`ease` in `defaults`.
- [ ] Any `scrollTrigger` is on the timeline, not a child tween.
