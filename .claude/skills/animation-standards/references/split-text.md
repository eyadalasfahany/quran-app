# SplitText

Split an element's text into characters, words, and/or lines (each its own element) for per-unit staggered animation. This is the basis of the line-reveal in `GeneralAnimation` (see [common-patterns.md](common-patterns.md)).

> SplitText is **free** (formerly Club-only). Install from the public `gsap` package; import from `gsap/SplitText`. No auth token or membership.
>
> Mechanics → https://gsap.com/docs/v3/Plugins/SplitText/

## REQUIRED

- **Register before use:** `gsap.registerPlugin(SplitText)`.
- **Split after fonts load.** Custom fonts change metrics and break line splitting. Gate on `document.fonts.ready` (this app exposes that via `isFontsLoadedContext` — see [common-patterns.md](common-patterns.md)) or use `autoSplit: true`.
- **Always revert on unmount/re-render.** Keep the instance and call `split.revert()` in cleanup (restores original markup). `useGSAP`/`gsap.context()` revert automatically.
- **Split only what you animate.** `type: "lines"` if you only animate lines; don't request `chars` you won't use.

```javascript
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

const split = SplitText.create(".heading", { type: "lines", mask: "lines", linesClass: "line" });
gsap.from(split.lines, { yPercent: 100, autoAlpha: 0, stagger: 0.08, duration: 0.6 });
// cleanup: split.revert()
```

## Key options

| Option | Notes |
| --- | --- |
| `type` | `"chars"`, `"words"`, `"lines"` (comma-separated). Default `"chars,words,lines"`. |
| `charsClass` / `wordsClass` / `linesClass` | Class per split element. `"name++"` appends an incrementing index. |
| `mask` | `"lines"` / `"words"` / `"chars"` — wraps each unit in an `overflow: clip` element for reveal/mask effects. Access via the `masks` array. |
| `autoSplit` | Reverts & re-splits when fonts load or width changes. **Create animations inside `onSplit()` and return them** for auto cleanup/time-sync. |
| `onSplit(self)` | Fires on split (and each re-split with `autoSplit`). Return a tween/timeline for automatic revert/sync. |
| `aria` | `"auto"` (default) keeps screen readers reading the original text; `"none"` to manage manually. |
| `tag` | Wrapper tag, default `"div"`. |
| `smartWrap` | When splitting chars only, prevents mid-word breaks. |

The `mask: "lines"` + `linesClass` pattern is exactly what `GeneralAnimation` uses to clip lines and reveal them with `yPercent`.

## autoSplit (responsive / late fonts)

```javascript
SplitText.create(".split", {
  type: "lines",
  mask: "lines",
  autoSplit: true,
  onSplit: (self) => gsap.from(self.lines, { yPercent: 100, autoAlpha: 0, stagger: 0.05, duration: 0.5 }),
});
```

## FORBIDDEN

- Splitting before custom fonts are ready (wrong line breaks).
- Using SplitText without registering it, or adding an auth token / private registry to "unlock" it.
- Forgetting `revert()` — leaves fragmented markup and leaks.
- Requesting `chars`/`words` you never animate (perf, extra DOM).
- SVG `<text>` (unsupported).

## Checklist

- [ ] `registerPlugin(SplitText)` once.
- [ ] Split gated on fonts loaded (or `autoSplit: true`).
- [ ] Only the needed `type` is split.
- [ ] `revert()` runs on unmount/re-render.
