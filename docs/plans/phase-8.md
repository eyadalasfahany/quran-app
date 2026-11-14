# Phase 8 — السيرة النبوية (Seerah): an interactive map and timeline of «نور اليقين»

Status: **plan written 14 Nov 2026; autonomous overnight build requested (see «Revision»); nothing accepted, nothing built yet** · Branch: `claude/focused-hamilton-18qhkz` (the overnight work branch the developer allowed) · ADR 0089 (**Proposed**) · Content plan entry added (**proposed**) · Spec edits **listed, not applied**: [`phase-8/spec-changes.md`](phase-8/spec-changes.md) · Data formats, validator and review report: [`phase-8/data-format.md`](phase-8/data-format.md).

**Goal:** a Seerah section that is a full-screen, hand-drawn, offline SVG map with semantic zoom (region, then city with landmarks) and a timeline of the Prophet's ﷺ age 0 to 63, where every event of the book «نور اليقين في سيرة سيد المرسلين» sits on its place and its year, and the developer has reviewed and signed off every one of them. The event page shows the book's text verbatim. There is a «عرض كقائمة» alternative for screen readers.

**The content is the product.** The map and timeline are only as good as the place and year assigned to each event, and the book does not state all of them. So the plan puts the data model, the validator and the review gate **before** the screens, and makes the sign-off a mandatory step.

## Revision (14 Nov 2026, later the same day): autonomous build, relayed by the coordinator as developer decisions

These five decisions **override** anything below that says a step waits for the developer. The developer has to confirm them in the ADR (they came through the coordinator, not in the developer's own words in this session).

1. **Build everything in one autonomous run:** frames, data for the **whole book**, validator, importer, API and pack, app screens, tests. No step waits for approval. The gates in the steps table become **checkpoints**: the step writes its report and the build continues. The developer's review happens afterwards, on the report and the simulator.
2. **Frames are pre-approved; the ADR 0087 approval gate is waived for Phase 8** (recorded in ADR 0089). Frames are still drawn first in `screens/frames/seerah/`, rebuilt with the two build scripts, and checked with `check:html`; app code starts right after, from the frames. Captions may keep «(بانتظار الموافقة)» until the developer looks.
3. **Nothing is invented and nothing blocks.** An event whose place the book does not state goes under a dedicated place **«أخرى»** (id `other`, kind `region`, no coordinates, no map position of its own, drawn as a «أخرى» pin on the region map's edge); an event whose year the book does not state goes into a **«غير محدد»** year bucket (`year.basis = unspecified`, age null, shown at the end of the timeline and in the list under its own heading). Both carry the matching flag (`place_not_stated`, `year_not_stated`). **Every section of the book must be covered** (V13 stays strict): an event or an exclusion, and a section with no clear place is an event in «أخرى», not a gap. The developer reviews the «أخرى» and «غير محدد» buckets later. **The review report lists them first** (view 0b).
4. **No production release.** No `eas update`, no deploy, no step 26 or 35 (they become «prepared, not run»). Work is committed and pushed to the work branch (the developer allowed this; agents still do not push without it being the work branch). The developer checks the result on the simulator.
5. **Environment of the overnight run:** PHP 8.3 (the project targets 8.5, so run `composer` with `--ignore-platform-req=php` if the platform check fails and say so), Node 22, python3, network to GitHub and OpenITI; **no MySQL, no iOS simulator**. `apps/api/phpunit.xml` sets `DB_CONNECTION=mysql` (`quran_testing`), so tests that touch the database cannot run here. The design therefore keeps **everything that matters for correctness DB-free**: canonicalizer, structure parser, loader, validator V1 to V19, report, authoring tools and the pack-row builder are pure PHP over files and need no `RefreshDatabase`; they run here. The MySQL schema, importer and endpoint tests are written alongside and run in CI (and are run locally only if the migrations also run on SQLite, which the `utf8mb4_0900_bin` collations prevent: do not weaken them for SQLite). Mobile: Jest runs here; **Expo web** (`npx expo start --web`) is used for visual checks, compared against `frame-shot.py` renders; no `xcrun simctl`.

Effects on the rest of this file (read with these in mind):

| Where | Change |
| --- | --- |
| Rules, «Not done by an agent» | **Superseded.** For this run the agent drafts the whole book as `draft`; running `seerah:approve` is still **not** allowed, so nothing is signed. `reviews/` stays empty; every record is `draft`. The developer's sign-off comes later and does not block the build. |
| `--release` validation | Two modes: **`--structure`** (CI and this run: V1 to V15, V18, V19 must pass; `draft` is allowed) and **`--release`** (needs sign-offs; not run now). The importer in this run uses `--structure`; production refuses to import without `--release`, so nothing can reach production by accident. |
| V9, V10 | `place.basis = unstated` is now valid with `place.id = other` (flag required); `year.basis = unspecified` is valid with the «غير محدد» bucket (flag required). An unstated place or year **outside** these buckets is still an error. Inferring a place or year is still an error without a stated quote. |
| V11, V12 | Events in the «غير محدد» year bucket are ignored by the ordering check and by the 0..63 range check; they sit between their book neighbours for prev/next. |
| Q7 | **Decided: option (a) in the bucket form above.** Q8 to Q19 keep their defaults and the build uses the default of each (excluded sections, hidden disputed marks, no figures, Menu card and sidebar, pack, agent-drafted maps, Wikidata, Arabic names). They stay open for the developer to change later. |
| Cut lines | The «ship later, not partial» rule applies to a future release; in this run the whole book is built. «If the art slips»: the Madinah city map is the first thing to simplify, never skipped. |
| Step 35 | Replaced by «local verification»: `npm run lint && npx tsc --noEmit && npm test`, `composer qa` where it can run, Expo web screenshots vs frames, and a written hand-off report. |

## Sources this plan rests on (read for this plan)

- `CLAUDE.md`, `.claude/agent-rules.md` (rules 6, 7, 10, 11; no religious text in plans, fixtures or reports; counts, keys and paths only).
- `docs/technical-spec.md` §5 (provenance tables, `resources`, hadith tables), §7 (content pipeline, hop 2 pack contents, hadith and Azkar import paragraphs), §14 (test layers, CI, device and window matrix).
- `docs/content-plan.md` («Content sources & licensing», «Hadith», «Rules for every provider», «Permissions to request»).
- `docs/plans/phase-7.md`, `docs/plans/phase-7/README.md`, `step-06-importer.md` (the house pattern for a pinned source, importer, packs, endpoints, frames, step briefs), `chapters-research.md`.
- ADR 0042 (hadith collections), 0045 (no switch), 0075 (screens folder), 0076 (OpenITI, Proposed), 0087 (design flow), 0088 (latest). The next free ADR number is **0089** (`docs/adr/` ends at 0088; check `git log --all` for a parallel 0089 before merging).
- `apps/mobile/package.json` (react-native-svg 15.16.0, react-native-gesture-handler ~3.3.0, react-native-reanimated 4.7.1, react-native-worklets 0.13.0, expo-sqlite ~58.0.15 are present, so no new native package).
- The three candidate book files, downloaded and measured (counts only, no text copied into any doc): see «The source».

## The source (checked 14 Nov 2026)

**Found: OpenITI, repository `OpenITI/1350AH`, folder `data/1345IbnCafifiKhudari/1345IbnCafifiKhudari.NurYaqin/`.** The URI says «IbnCafifiKhudari»: the author is محمد بن عفيفي الباجوري المعروف بالخضري (d. 1345 AH), the same person; the title is «نور اليقين في سيرة سيد المرسلين» (the file headers say so).

Pin candidate: GitHub ref `6d0c197e84a46a3cadbd36a045d09cb2bc9aa71e` (the ref GitHub code search returned). Raw URL pattern: `https://raw.githubusercontent.com/OpenITI/1350AH/6d0c197e84a46a3cadbd36a045d09cb2bc9aa71e/data/1345IbnCafifiKhudari/1345IbnCafifiKhudari.NurYaqin/<file>`. All three files below were fetched at that ref (HTTP 200).

| Version | Edition in its header | Bytes | SHA-256 | What it has |
| --- | --- | ---: | --- | --- |
| `…NurYaqin.JK009247-ara1` | مكتبة الإيمان، المنصورة، الطبعة الأولى 1419هـ / 1999م; editor أحمد محمود خطاب | 695,291 | `f8ce38b36f31cebe428ccda6e80be8561a11b615acdec0e6db55370a37443683` | Marked by OpenITI as cleaned (paratext, footnotes, indices removed, 2023; `CLEANED_VERSION`). 253 page markers, 4 «الباب» and 13 «الفصل» lines, **192 numbered headings** plus unnumbered title lines, 233 milestone tokens, 103 `{…}` runs (the book's way of quoting an ayah), 289,805 characters (CLENGTH in its `.yml`). Heading markup is irregular (`# | N ( title ) N`, some split over lines). |
| `…NurYaqin.Shamela0023692-ara1` | دار الفيحاء، دمشق، الطبعة الثانية 1425هـ (Shamela book 23692) | 667,755 | `5d9bbdbd7b3c17f361383a79825fa08bfbdad5848a48436d3173af383cb1895c` | **279 uniform `### |` headings**, no Bab/Fasl levels, 279 page markers, a modern editor's preface at the start, footnote-style markers in the body (`«6»`), 222 milestone tokens. No cleaning note. |
| `…NurYaqin.ShamAY0034443-ara1` | دار المعرفة، بيروت (Shamela book 34443) | 705,269 | `e61b25e2ec67db9d975c7b6d7418a8afa3816935449d57121795109da92371ed` | Only 19 headings: not usable for an event-per-heading plan. |

**What this means:**

- **The book is available as clean digital text, so there is no source blocker.** What is not yet settled is **which of the first two versions**, because they differ in heading granularity (192 numbered headings plus 17 structural lines, against 279 flat headings), so the choice changes how many events there are (about 200 to 280) and which headings count as «the book's own». The files cannot tell us whether the finer headings are the author's or the modern editor's (the Shamela edition's preface says the editor added title explanations). **Planner's provisional choice: `JK009247`** (cleaned of editorial paratext, keeps the Bab/Fasl structure), to be confirmed by the step 2 comparison and the developer (Q1).
- The text states a good part of the dating itself in plain words: the sampled passage of the first Bab says «ولما بلغت سنه … سنة» before the Syria journeys, the Fijar war and the marriage. Year headings exist for the Medina years («السنة الثانية» … «السنة التاسعة», 8 headings). So many events can have `year.basis = stated_age` or `section_year`; others will not, and those are flagged (Q7).
- **Licence (not settled, Q2).** ADR 0076 and its research record OpenITI as **CC BY-NC-SA 4.0** (stated on the Zenodo record, not in the GitHub repository) and the Shamela-derived versions as having an unclear upstream licence (RB21). The author's text is public domain (d. 1927), but this digital text and any editor's additions are not automatically so. For hadith chapters only titles were taken; here **the whole book ships**, so the NonCommercial and ShareAlike terms bite harder (ADR 0089, «Licence and provenance»).
- **Could not verify (stated so, not guessed):** GitHub's API refused repository access in this session, so the commit date, whether `6d0c197…` is the branch head, and whether this exact file is inside the Zenodo release 2023.1.8 (DOI `10.5281/zenodo.10007820` in ADR 0076) are **unconfirmed**. Step 2 confirms them, or pins the GitHub ref and records that the licence statement comes from the Zenodo record. The edition metadata above is the file headers' own.
- **Other sources looked for:** Arabic Wikisource and Internet Archive full text were searched; the search found catalogue records and shops only (editions by مؤسسة الرسالة 2004, دار المعاجم 1990, دار ابن كثير 1997 are annotated editions in copyright). Shamela itself has no stated redistribution licence. OpenITI is the only clean digital source found.

### Edition decided (14 Nov 2026, overnight run): `Shamela0023692`, not `JK009247`

`JK009247` is corrupt: in 1,053 places the letters U+0670 (dagger alef, decimal 1648) and U+0671 (alef wasla, 1649) were replaced by « صلى الله عليه وسلم», a line break and `# 1648 ; ` or `# 1649 ; `. Words are split and Quran verses inside the book are broken (for example «فلعنة صلى الله عليه وسلم / # 1649 ; لله على …» for «فلعنة الله على الكافرين»). Restoring it would mean guessing where the word spaces were, so the version is unusable. `Shamela0023692` (دار الفيحاء، دمشق، ط2 1425هـ) has none of this, keeps real paragraphs and has 279 headings. The canonicalizer removes its page markers, milestones and the editor's footnote markers «N» (closed list), and leaves the editor's footnote bodies out of the paragraphs. Q1 is closed with this choice; the developer can still revisit it.

### Timeline by the Prophet's age (developer, 14 Nov 2026, overnight)

The timeline is organised by the Prophet's ﷺ age, one tick per year from 0 to 63, never by Hijri years or «قبل/بعد البعثة». The primary label everywhere is the age; the Hijri or ق.هـ year is a small secondary detail on the event page only. Life-stage bands sit over the axis: «الطفولة» (٠–١١), «الصبا» (١٢–١٩), «الشباب» (٢٠–٣٩), «الكهولة» (٤٠–٦٣). Key moments (المولد ٠، الزواج من خديجة ٢٥، نزول الوحي ٤٠، الهجرة ٥٣، الوفاة ٦٣) are milestone marks, not the structure. The list view groups by stage, then age. The four review batches E1 to E4 are only how the data is reviewed, not how the app groups it.

## Rules

- All earlier rules apply (`CLAUDE.md`, `apps/mobile/CLAUDE.md`, `apple-design`, tokens through `useTheme()`, one component per file with a colocated test, screens only compose, `useWindowClass()` only, all strings in `ar.json` and `en.json`).
- **Non-negotiable 6, applied (developer, 14 Nov 2026).** No generated text: **event titles are the book's own headings**; the year and the place of an event come from the book's words. An assignment the book does not state is **flagged for the developer** and never inferred silently. An agent may *propose* an assignment (marked `drafted_by_agent`, `draft` until signed); it never approves, never writes `reviews/`, never runs `seerah:approve`, and never types Arabic quotes (they come from `seerah:quote`).
- **Non-negotiable 1, applied.** The book's own paragraphs are stored and shown verbatim (canonical text: only the closed list of removals in ADR 0089 §3). Quran text is not stored by us in the Seerah pack; the book's `{…}` runs are the book's text. `packages/quran-text-check` is untouched.
- **Fixtures and tests use placeholders** (`FIXTURE quote 1 — not from the book`, «نص تجريبي ١ — ليس من الكتاب»), in docs, tests, frames and reports. Frames use bracketed placeholders for book text. The real book text appears only in the pinned source file and the generated pack.
- No new native package; every change must keep `npx eas-cli fingerprint:compare` clean so the release is an EAS Update.
- If code, spec and an ADR disagree, stop and report.

## Decisions

### Made by the developer (14 Nov 2026)

| # | Decision |
| --- | --- |
| D1 | Book for v1: «نور اليقين» (الخضري بك). Ibn Hisham later as an expanded reference; الرحيق المختوم out. |
| D2 | Source: OpenITI first (as ADR 0076), else Shamela or Wikisource. Confirm the edition, pin it, record licence and source in `docs/content-plan.md`. A source that cannot be confirmed is a blocker (here: **not** a blocker; the edition choice and the licence are open, Q1 and Q2). |
| D3 | Screen: timeline age 0 to 63 (lunar years; «ق.هـ» before the Hijra, «هـ» after; milestones المولد، البعثة، الهجرة، بدر، الفتح، الوفاة), vertical bar on the start side on expanded windows, horizontal on compact; dragging highlights the year's places, routes and events and dims the rest. |
| D4 | The map is the whole screen: our own hand-drawn SVG, offline, from design tokens; routes (الهجرة، الطائف، رحلة الشام، الغزوات). Semantic zoom: region (cities and routes), tap a city for its hand-drawn map with landmarks; each event is a pin on its landmark; clusters with a count; label priority and reveal on zoom; 44 pt hit targets; no event list under the map on mobile. |
| D5 | Event page: the book's text verbatim, year, place, previous and next. |
| D6 | Accessibility: an optional «عرض كقائمة» toggle as the screen-reader alternative; the map stays the main view. |
| D7 | Dependencies: react-native-svg, gesture-handler and reanimated only; no new native package (OTA). |
| D8 | Data: a gazetteer first (every place, region › city › landmark, real lat/lng, drawn position, evidence), then an events file (heading span, place, year and certainty, byte-exact evidence quotes, review status, note when the book is silent); an automated validator in CI; a generated human review report; **a mandatory review step with sign-off before anything ships**. |
| D9 | Later unless trivially in scope: ayah links from the book's citations, links to hadith chapters, people index, animated Hijra route, continue-reading and bookmarks in `user.db`, search. |

### Proposed by the planner (the developer confirms or changes)

| # | Proposal | Why |
| --- | --- | --- |
| P1 | **Format:** versioned JSON under `apps/api/database/data/seerah/`, one events file per review batch, status derived from hash-bound sign-offs (never typed). Detail in `phase-8/data-format.md`. | Same pattern as `database/data/hadith/chapters/` (ADR 0076 §4); readable diffs; approval cannot outlive the text it approved (ADR 0089 §1). |
| P2 | **Flow:** repo JSON → `seerah:import` → MySQL → pack group `seerah` → app, like hadith and Azkar (spec §7). The alternative is a bundled JSON asset (Q13). | One content mechanism, versions, 410 floor, download and Storage screens for free. |
| P3 | **One event per heading**, spans partition the book. Every book section is covered by events or listed as excluded with a reason, so the whole book is reachable. | «Every book section is covered or explicitly excluded» (D8). |
| P4 | **Two map levels** (region, city) in v1, three drawn maps: the region, Makkah, Madinah. Other places (Taif, Badr, Uhud, Khaybar, Hunayn, Tabuk and so on) are pins on the region map; a battlefield or city map is a later addition. | Bounds the art effort (R1). |
| P5 | **Map art from public-domain geodata:** the region's coastline and relief are simplified from Natural Earth (public domain) and stylised by hand; the city maps are schematic. No modern borders (anachronistic and politically loaded). No OpenStreetMap data (ODbL ShareAlike). Coordinates from Wikidata (CC0) or manual. | Keeps licensing clean; «hand-drawn» is the finish, not the survey. |
| P6 | **Age convention (Q6):** the axis is the Prophet's age 0 to 63 as the book counts it; the Hijri label is derived (`ah = age − 52` for age ≥ 53, `bh = 53 − age` for age ≤ 52 as a starting convention) and checked by V11; milestones are read from their events, not typed. | The developer set 0 to 63; the book's own count decides and must be confirmed. |
| P7 | Navigation: a Menu card and a sidebar «المزيد» entry like الحديث, gated on an installed pack; no new tab (Q12). | Same as Hadith (phase-7.md step 13). |

## Data model (summary; formats and examples in `phase-8/data-format.md`)

**Repo (source of truth, reviewed):** `source/` (pinned book file + licence notice), `book/structure.json` (generated), `gazetteer.json`, `events/E1…E4.json`, `routes.json`, `milestones.json`, `exclusions.json`, `map/layout.{region,makkah,madinah}.json`, `reviews/{G,E1,E2,E3,E4,M}.json` (developer only).

**MySQL (new tables, additive; spec §5 patch):** every table has `resource_id` first and `source_id` where it holds imported rows; Arabic text columns are `utf8mb4_0900_bin`.

| Table | One row per | Key columns |
| --- | --- | --- |
| `seerah_books` | book (one for v1) | `slug` (`nur-al-yaqin`), `title_ar`, `author_ar`, `edition_ar`, `source_version`, `source_sha256`, `canonical_sha256`, counts, `imported_at` |
| `seerah_sections` | the book's headings | `parent_id`, `level` (`bab`, `fasl`, `heading`, `front`), `number`, `title_ar` (exact), `page_from`, `position`, `paragraph_from`, `paragraph_to` |
| `seerah_paragraphs` | canonical paragraph | `section_id`, `position`, `page`, `text_ar` (byte-exact), `text_sha256` |
| `seerah_places` | place | `slug`, `parent_id`, `kind`, `name_ar`, `name_en` null, `lat`, `lng`, `geo_precision`, `geo_source`, `flags` |
| `seerah_events` | event | `slug`, `section_id`, `paragraph_from`, `paragraph_to`, `title_ar`, `kind`, `place_id`, `place_basis`, `age_from`, `age_to`, `era`, `hijri_from`, `hijri_to`, `year_basis`, `certainty`, `position`, `route_id` null, `flags` |
| `seerah_event_places` | secondary place of an event | `event_id`, `place_id` |
| `seerah_routes`, `seerah_route_stops` | journey and its stops | `kind`, `name_ar`, `position` |
| `seerah_milestones` | the six markers | `key`, `label_ar`, `event_id` |
| `seerah_map_levels`, `seerah_map_layers`, `seerah_map_positions`, `seerah_map_route_paths` | one drawn map, its SVG layers, its pin and label positions, its route curves | `viewbox`, `path_d`, `style_token`, `x`, `y`, `label_priority`, `label_side` |

Review data (sign-offs, hashes) and evidence quotes **stay in the repo and the report**; they are not in MySQL or the pack in v1 (a highlight of the evidence in the event page is a later addition and would add paragraph-range rows). The pack is about 0.6 MB of Arabic text plus a few hundred rows; gzipped it is expected to be under 0.3 MB (assumption from the file sizes above; step 24 measures it).

**Device (`content.db`):** the same tables in a Drizzle content migration, read by repositories. **`user.db`:** nothing in v1 (reading position and bookmarks are later).

## Pipeline

```
OpenITI file (pinned, SHA-256)                       step 2
  → seerah:canonicalize (closed list of removals)    step 3
  → book/structure.json + canonical paragraphs
  → seerah:find / quote / skeleton (no typed Arabic) step 5
  → gazetteer.json + events/*.json + routes + …      steps 9–20  (curated, status: draft)
  → seerah:validate (V1–V19), CI                     step 4
  → seerah:report (HTML) → developer reads            step 6
  → seerah:approve <batch> (developer) → reviews/*.json   gates at 10, 13, 15, 17, 19, 20, 21
  → seerah:validate --release (all approved, covered) step 21
  → seerah:import (MySQL, one transaction, integrity)   step 23
  → pack (group seerah) + /seerah/books + manifest      steps 24, 25
  → app: content.db → repositories → map and timeline   steps 27–34
```

## The review gate (mandatory; nothing ships without it)

- **Batches:** `G` (places, with coordinates and drawn positions), `E1` Makkah before the Bi'tha, `E2` Makkah after the Bi'tha (including Habasha, Ta'if), `E3` the Hijra and the Medina years 1 to 5, `E4` the Medina years 6 to 11 and the death, `M` (routes, milestones, exclusions). The split follows the book's structure (the four Abwab) and may move after step 3 shows the real heading counts. Expected size, from the JK version's structure: 13 numbered headings in Bab 1, 26 in Bab 2, 101 in Bab 3, 51 in Bab 4, so batches of roughly 30 to 70 events (a heading count, not yet an event count).
- **What the developer reads:** `php artisan seerah:report`, views 1, 2, 4 and 5 for the batch. The report shows each event's heading, place path, year, certainty, and **the quotes in their paragraph**; the flag worklist lists every decision the book leaves open.
- **How the developer signs:** `php artisan seerah:approve E1` writes `reviews/E1.json` with each record's hash and a digest the report also prints. Any later edit to a record makes it `stale` and re-opens it.
- **What blocks:** `seerah:validate --release` fails on a `draft` or `stale` record, a flag without a decision, an uncovered section or a quote that does not match. The importer and the release wiring refuse to run without it passing.
- **Not done by an agent:** approving, writing sign-offs, deciding a flagged item, resolving a disputed date or site.

## Map behaviour (frames fix the look; this fixes the logic)

| Aspect | Rule |
| --- | --- |
| Levels | `region` (whole map; cities and standalone places as labelled points; routes) and `city` (Makkah, Madinah; landmarks as points). Tap a city point, or pinch past a threshold over it, cross-fades into its city map. Pinch out, the back chip in the header, or a swipe back returns. Within a level there is ordinary pan and pinch zoom with bounds. |
| Pins | One pin per place that has events. The pin is a native 44 pt view over the SVG (not an SVG hit area), with `accessibilityLabel` = place, event count, year range. A place with one event shows the event's title as its label; with several it is a cluster pin with a count. |
| Roll-up | A city's pin on the region map counts every event in its subtree. Tree first, screen distance second (two pins closer than 44 pt merge). |
| Cluster expand | Tap zooms to the cluster's bounds. At the deepest zoom, up to 6 events fan out on a ring; more than 6 open a small sheet **for that one spot**, ordered by year (the only list the map shows; frames decide, Q-frames). |
| Labels | Greedy placement in screen space by `label_priority`, then event count, then book order; a label that collides is hidden and revealed at a deeper zoom; labels never overlap a pin. Computed when a gesture ends, not per frame. Budget: label pass under 8 ms for 150 pins on a mid-range phone (step 27 measures). |
| Timeline | One axis for age 0 to 63 with era labels (the Hijra tick separates «ق.هـ» from «هـ»), six milestone marks read from `seerah_milestones`. Dragging sets a focus year; matching events, places and routes are full strength, the rest at reduced opacity and out of the screen-reader order; a «الكل» chip clears the focus. |
| Uncertainty | An event with certainty `approximate` or `developer_assigned` is drawn with a distinct pin edge, and its event page says so in a quiet line (wording is the developer's, Q7). |
| Reduce Motion | Cross-fade without the zoom animation. |
| Direction | Timeline age 0 on the start side (right in Arabic). The map itself is not mirrored (geography has no direction). |

### Layouts

| Window | Layout |
| --- | --- |
| compact (phone portrait) | Map full-bleed under a transparent header (title, level chip, list toggle). Horizontal timeline docked at the bottom above the tab bar with a floating chip for the selected year. Tap a pin: a small callout (title, year, «فتح»); open: the event page as a full-screen push. |
| medium (large phone landscape and small tablet, foldable half-open) | Horizontal timeline; the event page as a bottom sheet with detents (the pattern ADR 0048-series sheets use in the reader). |
| expanded (iPad, unfolded foldable, wide landscape) | The app's sidebar shell; **vertical timeline bar on the start side** (right in Arabic), map fills the rest, the event page as a **side panel on the end side**. |
| short height (landscape phone) | Thin overlay scrubber over the bottom of the map; the same event sheet. |

All of it keys off `useWindowClass()`; nothing branches on `Platform.isPad` or a device name. The frames are drawn for `sizes=compact,medium,expanded,landscape`.

### Accessibility

- «عرض كقائمة»: a header toggle that swaps the map for a list grouped by period and year, one row per event (heading, place, year), same data and same event page. Suggested on when a screen reader is on (`AccessibilityInfo`), never forced; the choice is remembered.
- Map pins and clusters are labelled; the timeline is an `adjustable` element (increment and decrement by one year, announces the number of events that year); the dimmed pins leave the focus order.
- Dynamic Type applies to the event page and the list; pin labels have a maximum size and wrap rules in the frames.

## Frames (steps 7 and 8; ADR 0087, developer approval before code)

New section `seerah` in `screens/frames/seerah/`, ids prefixed `Seerah`, each with a `gx-fig` block in `screens/index.html` captioned «(بانتظار الموافقة)», rebuilt with `python3 design/screens/scripts/build.py && python3 design/scripts/build_reference.py`, and handed over as a review link such as `design/<stack>/Seerah…/index.html?theme=light&dir=rtl&sizes=compact%2Cmedium%2Cexpanded%2Clandscape`. Generated files under `design/` are never hand-edited. Map art lives once in `design-assets/seerah/` (never inlined as base64, never copied into a frame).

| Frame | Content |
| --- | --- |
| `SeerahMapKey` | Symbols (city, landmark, cluster, route kinds, certainty styles), colours from tokens, label rules, 44 pt targets. The art-direction approval. |
| `SeerahMapRegion` (+ `Dark`, `English`) | Region map: cities, routes (Hijra, Ta'if, Sham, Habasha), clusters, a year selected (dimmed rest). |
| `SeerahMapMakkah`, `SeerahMapMadinah` (+ dark) | City maps with landmarks and event pins, a collision case with hidden labels. |
| `SeerahTimeline` | Compact horizontal timeline: idle, dragging, year chosen, milestones, era boundary, clear chip. |
| `SeerahCluster` | Fan-out ring and the spot sheet. |
| `SeerahEvent` (+ `Dark`, `English`) | Event page with placeholder paragraphs, year and place chips, previous and next, source line, the «year not stated» note. |
| `SeerahList` (+ `Dark`, `English`) | «عرض كقائمة». |
| `SeerahExpanded`, `SeerahExpandedCity` | Sidebar shell, vertical bar on the start side, map, side panel. |
| `SeerahStates` | Not downloaded (size, button), downloading, offline with a pack, load error, a year with no events. |
| Existing, updated | Menu cards, sidebar entry, `Sources` credit row (OpenITI, edition, licence, changes made). |

English UI: the book is Arabic, so the book's text, headings and place names stay Arabic; labels and chrome are English (as for hadith chapter titles, `phase-7.md` step 8b). English place names (`name_en`) need the developer's yes (Q19).

## Mobile structure

```
app/seerah/index.tsx                 map or list (param ?view=list), timeline, level chip
app/seerah/event/[id].tsx            the event page (side panel on expanded)
src/features/seerah/
  data/                              repositories over content.db
  logic/                             pure TS: age↔era labels, focus filter, cluster, label collision, zoom levels
  components/                        SeerahMap, MapPin, ClusterPin, MapLabel, RouteLine, TimelineBar (h and v), MilestoneMark,
                                     YearChip, EventCallout, EventPage, EventText, EventPager, ListToggle, EventListRow,
                                     SpotSheet, SourceLine, SeerahStateView
```

One component per file, one colocated `*.test.tsx` each; screens only compose. Pan and zoom: gesture-handler pan and pinch drive a reanimated shared transform applied to a view that holds the static SVG (GPU-composited); pins and labels are native views positioned from that transform and counter-scaled; the cluster and label passes run on gesture end.

## Steps

Each step is one reviewable change; a step brief (`phase-8/step-NN-*.md`) is written when the step starts. «Gate» marks a developer decision or sign-off; **after the Revision above it is a checkpoint: the step writes its report and the next step starts, the developer reads it later.** Steps 26 and 35 are prepared, not run (no release). Where a step needs a decision the default in «Questions» is used and recorded in the step's report.

| # | Step | Description | Depends on | Gate |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Docs | This plan, ADR 0089, `phase-8/` files, content-plan entry, spec change list (this change) | | Developer answers Q1 to Q8 |
| 2 | Source, edition, licence | Compare the two candidate versions (body text diff, headings, editor additions), confirm the Zenodo and GitHub pin, copy the chosen file into `source/` with `LICENSE-NOTICE.md`, add `config/seerah.php` pins, add the `content_sources` row (or reuse `openiti` from ADR 0076, idempotently). Report with counts only | 1 | **G0: developer chooses edition and accepts the licence** |
| 3 | Canonicalizer and structure | `seerah:canonicalize`: header, page markers (kept as page numbers), continuations, milestone tokens, heading wrapper; heading parser for the chosen version; `book/structure.json`; canonical SHA-256 pinned. Report: sections by level, paragraphs, pages, `{…}` runs, unparsed lines (must be 0) | 2 | Developer reads the section list (counts, levels) and confirms the batch split |
| 4 | Formats, loader, validator, CI | The JSON formats, `seerah:fmt`, loader, validator V1 to V19 with placeholder fixtures, `seerah:validate` (dev and `--release`), CI path filter (`seerah.yml` or a job in `api.yml`) | 3 | |
| 5 | Authoring tools | `seerah:find`, `seerah:quote`, `seerah:skeleton`, `seerah:place-candidates` (spec in `data-format.md`) | 3, 4 | |
| 6 | Review report and approve command | `seerah:report` (views 0 to 7, filters, print style), `seerah:approve` (developer only), digest in the report footer. Built on placeholder data first | 4 | Developer looks at the report on fixtures and says if it is readable |
| 7 | Frames A: map key and art | `SeerahMapKey`, region art direction; `design-assets/seerah/map-region.svg` drafted from simplified Natural Earth relief and hand-stylised; a decision on pin and label symbology | 1 | **Developer approves art direction** |
| 8 | Frames B: screens | Region, city, timeline, cluster, event, list, expanded, states, menu and Sources rows, the «أخرى» pin and the «غير محدد» year bucket; `build.py` and `build_reference.py`; review links | 7 | Pre-approved (waiver, ADR 0089); app code follows at once |
| 9 | Gazetteer draft | `gazetteer.json` from `seerah:place-candidates` and the book: every place, tree, `names_in_book`, evidence quotes by `seerah:quote`; no coordinates yet | 5, 6 | |
| 10 | Coordinates and geo checks | `geo` for every place from Wikidata or manual with a note; V6 plausibility; disputed and approximate flags | 9 | **Review gate G: developer signs the gazetteer** (`seerah:approve G`) |
| 11 | Map art and layouts | `map-makkah.svg`, `map-madinah.svg`; `map/layout.*.json` positions, label priority, route paths; V7 direction check; report view 3 | 8, 10 | **Developer approves the three maps** |
| 12 | Events E1 draft | `events/E1-…json` from `seerah:skeleton`; place and year with quotes; flags | 10 | |
| 13 | Review gate E1 | Report, flag decisions by the developer, `seerah:approve E1` | 12 | **Sign-off E1** |
| 14 | Events E2 draft | as step 12 | 13 | |
| 15 | Review gate E2 | as step 13 | 14 | **Sign-off E2** |
| 16 | Events E3 draft | as step 12 | 15 | |
| 17 | Review gate E3 | as step 13 | 16 | **Sign-off E3** |
| 18 | Events E4 draft | as step 12 | 17 | |
| 19 | Review gate E4 | as step 13 | 18 | **Sign-off E4** |
| 20 | Routes, milestones, exclusions | `routes.json`, `milestones.json`, `exclusions.json`, route paths in the layouts; V14, V15, V13 | 11, 19 | **Review gate M: sign-off** |
| 21 | Final content gate | `seerah:validate --release` green; the whole report re-read; counts pinned in `config/seerah.php` (V19) | 20 | **Developer: «content complete»** |
| 22 | MySQL schema | Migrations, models, factories for the tables above; `seerah` in `ResourceGroup`; additive only | 4 | |
| 23 | Importer | `seerah:import` (reads the data folder, runs the release validator, one transaction, integrity check of stored paragraphs against canonical hashes, report, no-op when unchanged), `Cache::lock`; **not** wired into deploy yet | 21, 22 | |
| 24 | Pack contract | `PackSchema` tables, builder, manifest, mobile `PackGroup` and `content-tables.ts`; measure pack size | 22, 23 | |
| 25 | Endpoint and contract | `GET /seerah/books` (catalogue: title, author, edition, counts, source credit, pack resource id); OpenAPI and `schema.d.ts` regenerated | 22 | |
| 26 | Release wiring | `seerah:import --defer-pack` in `docker/start-web.sh` (the Azkar and hadith pattern, ADR 0044), runbook line | 21, 24, 25 | |
| 27 | Map performance spike | Throw-away screen with fixture data: region map with 150 pins, gesture transform, cluster and label passes, on the iPhone 17 simulator, a mid-range Android and the low-end Android emulator. Report fps and pass time | 8 (frames), 24 | **Go / no-go on the approach (R2)** |
| 28 | Mobile data layer | `content.db` migration, pack install, repositories (events by year, by place subtree, previous/next, paragraphs of a span), fixtures | 24 | |
| 29 | Pure logic | `logic/`: age and era labels, focus filter, tree roll-up and distance clustering, label collision, zoom thresholds, year → events index; heavy unit tests | 27 | |
| 30 | Components | One file and one test each (list above) | 8, 29 | |
| 31 | Screens, routes, entry | The two routes, i18n, Menu card, sidebar entry, Sources credit, download state through the existing downloads screen | 28, 30 | |
| 32 | List view and accessibility | «عرض كقائمة», pin and timeline labels, screen-reader order, suggest-on-screen-reader | 31 | |
| 33 | Hardening | Offline, resize keeps place and year, Reduce Motion, Dynamic Type, English UI, light, sepia, dark | 32 | |
| 34 | Exit check | Checks, visual review against the frames on iPhone 17 and an expanded window, device and window matrix, one Maestro flow, release-blocker audit | 33, 26 | |
| 35 | Release | `eas update --channel production` after `fingerprint:compare` shows no change; the pack is built at web start | 34 | Developer |

Steps 7 and 8 can run in parallel with 2 to 6 (frames need no real data). Steps 22 to 25 can run in parallel with 9 to 20. The app steps 28 to 33 can be built on fixtures before step 21, but **step 26 and step 35 wait for the content gate**.

## Tests for each step (written with the step, spec §14)

| # | Tests |
| :---: | :--- |
| 1 | Docs only. Review: every claim cites a path; no religious text; ADR number free. |
| 2 | Pest: `config/seerah.php` pins the full 40-character ref and the file SHA-256; the pinned file hashes to its pin; `LICENSE-NOTICE.md` exists; the `content_sources` row exists once; no source text in any test. Manual: the diff report between the versions (counts). |
| 3 | Pest on placeholder mARkdown: each removal tested alone and together; every other byte unchanged (byte compare, including bidirectional marks and spaces); a heading in each markup shape parses; split headings join; page markers kept as page numbers; paragraph ids are stable across runs; unparsed lines fail the command; canonical SHA-256 equals the pin. |
| 4 | Pest: one fixture book (placeholder) and fixture data files; each rule V1 to V19 has a passing and a failing case (a quote off by one byte, a place id missing, an event title not equal to its heading, a gap in the span partition, a year outside 0..63, an event out of order without an exception, a year heading mismatch, a stale hash, a draft in `--release`, an unknown key, an unformatted file); `arch()` layering; CI job runs on a changed data file. |
| 5 | Pest: `find` normalises like the Quran/hadith search normaliser and never alters stored text; `quote` output is byte-identical to the canonical substring and refuses a range across paragraphs; `skeleton` copies the heading exactly and writes no place or year; `place-candidates` is deterministic. |
| 6 | Pest: the report builds from fixtures, shows each view, highlights a quote inside its paragraph, escapes everything, makes no network call; the digest in the footer equals `seerah:approve`'s; `approve` refuses a draft with an open flag and refuses to run in CI or non-interactively without a flag; the report never writes to the data folder. |
| 7, 8 | Review only: frames compared to tokens (`npm run check:html -w @quran/design-tokens`); placeholders only; every state; light, dark; Arabic, English; the four `sizes`; 44 pt targets measured; approval recorded in the step brief. |
| 9, 10 | `seerah:validate` green on the gazetteer part (V2, V3, V4, V5, V6); the report's gazetteer view; sign-off G recorded by the developer. |
| 11 | V7 green; each SVG passes `check:html`; every layout position lies inside its viewbox; report view 3 renders all maps; developer approval recorded. |
| 12 to 19 | Per batch: V2, V3, V8 to V13 green on the batch; zero unflagged `implied` or `unstated`; the report's flag worklist empty after the developer's decisions; sign-off recorded. |
| 20 | V13 (coverage), V14, V15 green; every exclusion has a reason; every milestone points at an approved event. |
| 21 | `seerah:validate --release` exits 0; the data counts equal the pinned counts. |
| 22 | Pest: migrations run and roll back; collations; unique keys; byte-exact round trip of a paragraph with diacritics and bidirectional marks (placeholder characters); `arch()`. |
| 23 | Pest: imports the fixture data; refuses without a release-valid folder; one transaction, rollback on error; integrity check detects an altered paragraph; idempotent (no version bump when unchanged); a changed paragraph bumps the version; lock; no Quran text column exists. |
| 24 | Pest: pack has the tables, none of the review data; manifest lists the resource only once imported; size measured; Jest: `content-tables` mirrors `PackSchema`. |
| 25 | Pest feature test: 200, ETag and 304, problem details; OpenAPI regenerated and drift-free. |
| 26 | Pest: `start-web.sh` runs the import after hadith and the failure path warns and keeps the current version. |
| 27 | Written report with numbers; no pass/fail test. |
| 28 | Jest: pack install in one transaction and rollback; repositories (events of a year, of a place subtree, previous and next in book order, paragraphs of a span in order); Arabic bytes round trip; no personal data in `content.db`. |
| 29 | Jest, table-driven: age 0, 40, 52, 53, 63 give the right era and number; focus filter with ranges; roll-up counts equal the sum of the subtree; two pins at 43 pt merge and at 44 pt do not; label collision keeps the higher priority and is deterministic; zoom thresholds. |
| 30 | One `*.test.tsx` per component: render and variants, interaction, RTL (ar and en), role and label, tokens, no raw hex, 44 pt target. |
| 31 | Jest screen and route tests (`routes.test.ts` with `satisfies keyof paths`); Menu card and sidebar only with an installed pack; every string in `ar.json` and `en.json`; no hard-coded text; the Sources credit equals `content_sources`. |
| 32 | Jest: list shows every event once in book order; the toggle persists; dimmed pins are out of the accessibility order; timeline `adjustable` actions change the year. Manual: VoiceOver and TalkBack pass. |
| 33 | Jest: offline, loading, error, retry; resize keeps place and year; Reduce Motion uses a cross-fade; Dynamic Type at the largest sizes. |
| 34 | `composer qa`; `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`; contract drift-free; screenshots vs `frame-shot.py` at 390 × 844; the expanded window; the device and window matrix rows for phones, iPad and foldable; one Maestro flow (open Seerah, tap a city, tap an event, next, back) in Arabic and English; airplane mode. |
| 35 | `npx eas-cli fingerprint:compare` clean; `node .github/scripts/npm-audit.mjs` unchanged (no dependency changes). |

## Cut lines

| Line | Content |
| --- | --- |
| **Must ship (v1)** | Steps 1 to 35 for: region map, Makkah and Madinah city maps, timeline, event page with the book's text, previous and next, the list view, every section covered or excluded, all signed off. |
| **If the art slips** | Ship the region map and Makkah only; every Madinah event becomes a pin on the region map's Madinah point and the Madinah city map follows in an update (an additive pack version). Never ship an unapproved map. |
| **If the review is too heavy** | Ship the periods that are signed off (E1 to E3) and hide the later ones? **No.** A partial book misleads, and the plan's rule (as for hadith) is that a feature that ships is complete. The fallback is to ship later, not partial. |
| **Later (not in this plan's v1)** | Ayah links from the `{…}` runs (the V16 index is the start), hadith-chapter links, people index, animated Hijra route, evidence highlight in the event text, reading position and bookmarks in `user.db`, search over the book (FTS5), battlefield maps (Badr, Uhud, Khandaq), city maps for Ta'if and Khaybar, English place names, Ibn Hisham, website version. |

## Questions for the developer

Defaults are the planner's recommendation; **none is decided until answered.** Q1, Q2, Q6, Q7 block step 2 to 3. Religious-interpretation items (Q8, Q9, Q10) and navigation (Q12) are never decided by an agent.

| # | Question | Default offered |
| --- | --- | --- |
| Q1 | **Edition.** `JK009247` (cleaned, Bab/Fasl, fewer headings) or `Shamela0023692` (279 flat headings, editor's apparatus)? | JK009247, subject to the step 2 comparison |
| Q2 | **Licence.** Accept CC BY-NC-SA 4.0 for the book text, the NonCommercial limit on the Seerah section if Taybah ever earns money, ShareAlike on the Seerah pack, and the unclear Shamela upstream (as RB21)? Or ask OpenITI or the Shamela side in writing first? | Accept, credit on the Sources screen, ask in writing in parallel, non-blocking |
| Q3 | **Pin.** GitHub ref `6d0c197…` or the Zenodo release (needs the file confirmed inside it)? | The Zenodo file if present, else the GitHub ref |
| Q4 | **Format.** JSON in the repo with hash-bound sign-offs (ADR 0089 §1)? | Yes |
| Q5 | **Event granularity.** One event per heading, and where a heading holds several places or years, split by the developer into `e042.1`, `e042.2` with the **same heading** as title? | Yes |
| Q6 | **Age and Hijri convention.** The axis counts completed years from 0 at the birth; the Hijra falls at age 53; the death at 63; «ق.هـ» labels count back from the Hijra. The book's own stated ages (including at death) decide; the files show the book states ages in words, not digits. | Confirm in step 3 with the book's own statements |
| Q7 | **An event whose place or year the book does not state.** (a) the developer assigns it, shown with a distinct pin edge and a quiet note «لم يذكر الكتاب …»; (b) it appears as `background` with no map pin or no year; (c) it is left out. Wording of the note is the developer's. | (a) with the note, decided event by event in the review |
| Q8 | **Sections that are not events** (genealogy, books that foretold him, his characteristics, the closing section): excluded with a reason and not shown in v1, or readable somewhere (a «الكتاب» reading view)? | Excluded; reading view later |
| Q9 | **Disputed dates and sites.** The plan shows only what the book says and marks the record `disputed_*` for the developer; it does not adjudicate. Should the app show a «اختلف في…» mark on those? | Hidden from users in v1, shown in the report |
| Q10 | **Depiction.** No human figures on the map (symbols only); how to draw the Ka'ba and the mosques (an abstract mark, not a picture); «ﷺ» in UI labels. | No figures, abstract symbols |
| Q11 | An animated Hijra route in v1? | Later |
| Q12 | **Entry points:** a Menu card, a sidebar «المزيد» entry, and a Home tile? A tab is not proposed. | Menu card and sidebar |
| Q13 | **Delivery:** pack through the API (P2), or a bundled asset shipped by EAS Update (saves about six steps, loses versions and the downloads screen)? | Pack |
| Q14 | **Who draws the maps:** an agent drafts from simplified public-domain relief and the developer approves, or an illustrator? Budget for revisions. | Agent draft, developer approval |
| Q15 | **Coordinates:** Wikidata (CC0) plus manual; no OpenStreetMap. | Yes |
| Q16 | Search, ayah links, bookmarks: later. | Later |
| Q17 | **Reviewer:** the developer alone signs (as for hadith, no content reviewer), or a scholar reviews the assignments too? | The developer; a scholar is the developer's call |
| Q18 | **Names:** pack group `seerah`, resource `nur-al-yaqin`, so Ibn Hisham is another resource later. | Yes |
| Q19 | **English place names** (from Wikidata labels, for example «Mecca») in the English UI, or Arabic names with English chrome? | Arabic names, English chrome |

## Risks and release blockers

| # | Risk | Mitigation |
| --- | --- | --- |
| R1 | **Map art effort** is the largest unknown: three hand-finished maps with legible landmarks. | Frames A first with an art-direction approval; Natural Earth relief as the base; Makkah and Madinah schematic; the cut line above. |
| R2 | **Map performance and label density** in react-native-svg with many pins and gestures on a low-end Android. | The spike (step 27) decides before any screen; native views for pins, static SVG under a transformed view, passes on gesture end, a cap on labels per area; fallback: fewer simultaneous labels and clustering at a lower threshold. |
| R3 | **Disputed dates and places.** The book may differ from other sources; the dating is the book's. | Only the book's statement is used; `disputed_*` flags; the developer decides what the app shows (Q9). |
| R4 | **Events with no stated place or year.** | Flagged, decided individually (Q7); never inferred silently; counted in the report so the size of the problem is known after step 3. |
| R5 | **Review fatigue:** about 200 to 280 events, each with two or three quotes. | Batches of 30 to 70; the report shows the quote in its paragraph; the validator already proves the quote exists, so the reader checks meaning, not bytes. |
| R6 | **Licence.** CC BY-NC-SA 4.0 and Shamela upstream (ADR 0076 RB21); editor's copyright in an edition. | Q2; step 2 diff proves no editorial text or lists what to strip; credit and changes made on the Sources screen. |
| R7 | **Heading authenticity.** Headings may be the editor's, not the author's. | Q1, the version comparison, and the developer's decision; the report names the version. |
| R8 | **The canonical-text rule.** Removing milestone tokens inside a quoted ayah changes the text of a `{…}` run. | The closed list only touches OpenITI's own markup; V16 runs on the canonical text and lists unmatched runs. |
| R9 | **Drift:** the pinned file or the transform changes silently. | Two SHA-256 pins (V1) and count pins (V19). |
| R10 | **Heading parsing of the JK file** (irregular markup). | Step 3 fails on any unparsed line; the section list is read by the developer. |
| R11 | **Phase 7 is not finished** (hadith release waits for chapters; ADR 0076 Proposed). | Seerah content steps 2 to 21 touch only new files; the `openiti` row is created idempotently or reused; mobile steps wait for the Phase 7 release to avoid merge noise in shared files (`content-tables.ts`, `PackSchema.php`, i18n, Menu). |

**Release blockers for Phase 8** (all must be clear before step 35):

| # | Blocker |
| --- | --- |
| RB-S1 | Q1 and Q2 answered; `LICENSE-NOTICE.md` and the Sources credit present. |
| RB-S2 | Sign-offs G, E1 to E4 and M exist and `seerah:validate --release` passes on the committed data. |
| RB-S3 | No open flag: every `implied`, `unstated`, `developer_assigned`, `disputed_*` and `order_exception` has the developer's decision recorded. |
| RB-S4 | Every `{…}` run is classified (V16); unmatched runs decided by the developer. |
| RB-S5 | The three maps and all frames approved; the built UI matches the frames (visual check on iPhone 17 and an expanded window). |
| RB-S6 | The performance spike passed on the low-end Android target (step 27). |
| RB-S7 | VoiceOver and TalkBack pass on the list and the map. |
| RB-S8 | `npx eas-cli fingerprint:compare` shows no native change (OTA release). |
| RB-S9 | Spec and CLAUDE.md edits from `phase-8/spec-changes.md` applied. |
| RB-S10 | Phase 7's `openiti` source row and its attribution wording are settled (or the Seerah migration owns the row without conflict). |
