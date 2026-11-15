# Taybah — design screens

Build input for the design review pages. **Humans review at `design/<stack>/<Screen>/index.html`** (ADR 0087); **models read catalogs** (not megabytes of markup).

Generated from `screens/` (the design source, ADR 0075); edit frames there.

## Review

1. Review pages: `design/<stack>/<Screen>/index.html` (ADR 0087). Nothing here is for review.
2. Stack lists: [`frames/<stack>/`](frames/) — each has `CATALOG.md`.

## For AI / agents (token budget)

| Read | ~size | When |
|---|---|---|
| [`AGENTS.md`](AGENTS.md) | 2 KB | always first |
| [`frames.tsv`](frames.tsv) | 14 KB | find an id |
| [`CATALOG.md`](CATALOG.md) | 17 KB | markdown table |
| one `frames/.../<Id>.html` | usually &lt;25 KB | visual review only |
| `screens/frames/<section>/<Id>.html` | one frame | the design source (ADR 0075) |

Never open `common/styles.css` or many frames unless asked.

## Stats

- **267** frames · **24** stacks · **13** deduped image assets
- Base64 stripped from markup (~**15369 KB** not repeated per Salah frame)

## Layout

```
design/screens/
  AGENTS.md CATALOG.md frames.tsv frames.json
  common/     shared CSS
  assets/     extracted images (once)
  frames/<stack>/   lean partials + CATALOG.md
  scripts/build.py
```

## Rebuild

```bash
python design/screens/scripts/build.py
```
