# Website — taybah-app.com

Static HTML on Vercel (`cleanUrls`). No framework, no build step on Vercel: what is committed is what ships.
SEO and URL decisions: ADR 0063.

## Source vs generated

| Hand-edited (source) | Generated, never edit by hand |
|---|---|
| `*.html` in this folder (Arabic URLs, both languages inside) | `en/*.html` (English URLs `/en/<slug>`) |
| `robots.txt`, `llms.txt`, `vercel.json` | `sitemap.xml` |
| | everything between `<!-- seo:start -->` and `<!-- seo:end -->` in every page |
| | the inline icon sprite (`icons:start`/`icons:end`) |

## Every change to a page

```bash
python3 scripts/inline-icons.py      # icons first
python3 scripts/build-seo.py         # then SEO head, en/ pages, sitemap
python3 scripts/build-seo.py --check # must pass
```
Commit the source page together with the regenerated `en/` page and `sitemap.xml`.

## Writing a page

- Every language-specific element carries `data-l="ar"` or `data-l="en"`; write both. The English page is the source with the `data-l="ar"` elements removed, so nothing English may live inside an Arabic-only element.
- Give labels both languages: `aria-label="…" data-aria-ar="…" data-aria-en="…"`.
- Put the English title and description on `<html data-title-en="…" data-desc-en="…">`. Arabic title and description go in `<title>` and `<meta name="description">` (inside the seo block; the script reads them from there).
- Link pages as `<slug>.html` and assets as `assets/…` (relative). The script makes them absolute in `en/`.
- Content hidden in an HTML comment is not published in either language.

## Adding a new page

1. Copy an existing page (e.g. `support.html`) to `<slug>.html` and replace its content, title, description and `data-title-en`/`data-desc-en`.
2. Add `("<slug>", True)` to `PAGES` in `scripts/build-seo.py` (`False` for pages that must not be indexed: utilities, redirects). The script refuses to run while a page is missing from `PAGES`.
3. Add it to the header, mobile and footer navs of every page if it belongs in navigation.
4. If it's public and indexable, add it under "Pages" in `llms.txt` (English URL).
5. Run the three commands above.

## Rules

- Copy comes from what the app actually does; no claims, numbers or features that aren't shipped (remove them when a feature is removed). No generated religious content (root non-negotiable 6), in `llms.txt` too.
- No ratings or reviews in structured data unless real ones exist.
- Share image: `assets/images/google-play-feature-graphic.png` (1024×500, keep it under 300 KB for WhatsApp). Changing it means updating the size in `build-seo.py`.
- QR code (`assets/images/taybah-qr.svg`, used on `/qr` and `/download`) encodes `https://taybah-app.com/download?src=qr` (`src` becomes the store campaign). Once printed it must never change. Made with segno: `segno.make(url, error='q').save(path, kind='svg', border=0, dark='#13231f', xmldecl=False, omitsize=True)`.
- Pages that redirect or are print/utility pages are `noindex` (`False` in `PAGES`).
