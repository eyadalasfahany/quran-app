# Taybah — design screens

Team-share design catalog. **Humans browse HTML**; **models read catalogs** (not megabytes of markup).

Monolith `quran-app-screens.html` stays untouched for CI / `frame-shot.py`.

## Share with the team

1. Open [`index.html`](index.html) (or host this folder).
2. Deep-link any frame: [`viewer.html?id=Main`](viewer.html?id=Main).
3. Stack lists: [`frames/<stack>/`](frames/) — each has `CATALOG.md`.
4. Devices / sizes / notifications / Wear OS: [`extras/`](extras/).

## For AI / agents (token budget)

| Read | ~size | When |
|---|---|---|
| [`AGENTS.md`](AGENTS.md) | 2 KB | always first |
| [`frames.tsv`](frames.tsv) | 14 KB | find an id |
| [`CATALOG.md`](CATALOG.md) | 17 KB | markdown table |
| one `frames/.../<Id>.html` | usually &lt;25 KB | visual review only |
| `quran-app-screens.html` | **avoid** | CI monolith only |

Never open `common/styles.css` or many frames unless asked.

## Stats

- **165** frames · **23** stacks · **7** deduped image assets
- Base64 stripped from markup (~**5782 KB** not repeated per Salah frame)

## Layout

```
design/screens/
  AGENTS.md CATALOG.md frames.tsv frames.json
  index.html  viewer.html?id=FrameId
  common/     shared CSS
  assets/     extracted images (once)
  frames/<stack>/   lean partials + CATALOG.md
  extras/     devices, sizes, notifications, wear, components
  scripts/build.py
```

## Rebuild

```bash
python design/screens/scripts/build.py
```
