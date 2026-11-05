# 0063 — Website SEO: English pages at /en/, structured data and AI-crawler files

Date: 2026-11-05 · Status: **accepted** (developer, 5 Nov 2026) · Scope: `website/` only (taybah-app.com)

## Context

The website is hand-written static HTML on Vercel. Every page holds both languages; CSS shows one according to `<html lang>`, which an inline script set from `?lang=` or localStorage. English was therefore served at `?lang=en` from the *same* HTML: Arabic `<title>`, `lang="ar"`, and a canonical pointing at the Arabic URL. Search engines drop an hreflang alternate whose canonical points elsewhere, and AI crawlers (GPTBot, ClaudeBot, PerplexityBot) do not run JavaScript, so English was effectively not indexed. The site also had no robots.txt, sitemap, structured data or llms.txt.

## Decisions

1. **English lives at `/en/<slug>`** (`/en` for the home page). `scripts/build-seo.py` generates `website/en/*.html` from the bilingual sources: `lang="en" dir="ltr"`, English head, Arabic elements (`data-l="ar"`) removed, English aria labels set in the markup, and root-absolute asset and page links. The root pages stay the hand-edited source; `en/` is generated and never edited by hand.
2. **Language follows the URL.** The inline head script now picks `en` only for paths under `/en`; the `?lang` query and the remembered localStorage choice are gone. Old `?lang=en` links get a permanent redirect to the `/en/` path (vercel.json).
3. **Head metadata is generated** between `seo:start`/`seo:end` markers on every page: canonical, hreflang (ar, en, x-default = Arabic), Open Graph (url, site name, locale, image size and alt), and JSON-LD (`WebPage`, `BreadcrumbList`; `WebSite`, `Organization`, `MobileApplication` on the home page; `FAQPage` on support from the visible FAQ). No ratings or reviews are marked up: none exist.
4. **`download` and `qr` are `noindex`.** The download page redirects mobile user agents, Googlebot smartphone included, to the store; `qr` is a print utility. `404` has no canonical or alternates.
5. **All crawlers, AI training and AI search included, are allowed** (`robots.txt`). `sitemap.xml` lists the indexable pages in both languages with alternates. `llms.txt` summarises the app for answer engines using only copy already on the site (non-negotiable 6: no generated religious content).

## Consequences

- After editing any page: run `python3 scripts/inline-icons.py`, then `python3 scripts/build-seo.py`, and commit the `en/` output and `sitemap.xml` with the source change.
- Internal links in the Arabic sources stay `*.html` (kept for file:// preview); under `cleanUrls` they cost one 308 redirect each.
- A visitor who chose English is no longer remembered across visits to Arabic URLs; the language switch links to the other path instead.
