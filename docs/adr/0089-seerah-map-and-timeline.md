# 0089 — Seerah: an interactive map and timeline of «نور اليقين», built from reviewed data

Date: 2026-11-14 · Status: **Proposed** (the developer made the product decisions on 14 Nov 2026; the items under «Developer decisions still open» are not decided and the ADR is not Accepted until they are) · Plan: `docs/plans/phase-8.md` and `docs/plans/phase-8/` · Rests on ADR 0042 (hadith packs, source in repo, no switch), ADR 0045, ADR 0068 (source cache), ADR 0075 and 0087 (design flow), ADR 0076 (OpenITI as a source, licence consequences; **Proposed** itself). Does not amend an accepted ADR. Spec changes it implies are listed in `docs/plans/phase-8/spec-changes.md`; none is applied.

## Context

The developer wants a Seerah feature that is a map and a timeline, not a list of articles. The book is «نور اليقين في سيرة سيد المرسلين» by محمد الخضري بك (d. 1345 AH / 1927), chosen because it is concise and chronological. The author is in the public domain; a digital edition is not automatically so (see Licence).

A source was found and read on 14 Nov 2026: OpenITI `1350AH`, folder `data/1345IbnCafifiKhudari/1345IbnCafifiKhudari.NurYaqin/`, three digital versions (`JK009247-ara1`, `ShamAY0034443-ara1`, `Shamela0023692-ara1`). Details, sizes, SHA-256 values and structure counts are in the plan («The source»).

Two properties of this feature are new for Taybah and drive the decisions below:

1. **The data is curated, not imported.** Hadith and Azkar come from a source that already has structure (books, numbers). Here the structure we need (which place, which year, which event) is **not in the source**. Someone has to assign it, and every assignment is a claim about history that users will read as fact.
2. **The developer must be able to verify all of it.** «Every year, every event, in the correct place; all our places defined.»

Non-negotiable 6 (no generated religious content) governs both: event titles are the book's own headings, and a place or a year that the book does not state is never filled in silently.

## Decisions (developer, 14 Nov 2026)

1. **One book for v1:** «نور اليقين في سيرة سيد المرسلين», الخضري بك. Ibn Hisham may follow as an expanded reference; الرحيق المختوم is out (copyright).
2. **Screen:** a full-screen hand-drawn SVG map with semantic zoom (region, then city with landmarks), a timeline of the Prophet's ﷺ age 0 to 63 (before the Hijra «ق.هـ», after it «هـ»), routes, event pins and clusters, an event page with the book's text verbatim, and an optional «عرض كقائمة» list as the screen-reader alternative. No event list under the map on mobile.
3. **No new native package.** react-native-svg 15.16, react-native-gesture-handler 3.3 and react-native-reanimated 4.7 are already in `apps/mobile/package.json`. The release is an EAS Update (CLAUDE.md, «Releasing»), provided `npx eas-cli fingerprint:compare` shows no change.

## Decisions proposed by the planner (the developer confirms)

### 1. The reviewed source of truth is JSON in the repo, with sign-offs bound to a hash

`apps/api/database/data/seerah/` holds the pinned book text, a gazetteer, events split by period, routes, milestones, exclusions, map layouts and sign-off files. Reasons, against the spec:

- Spec §7 and ADR 0042/0076 already use committed, SHA-pinned data that the importer reads, not `config/` (too large) and not a runtime download.
- JSON is read by PHP (importer, validator) and JS (nothing needed) without a dependency. YAML was rejected: implicit typing and indentation errors in hand-edited files. CSV and SQLite were rejected: nested evidence and unreadable diffs.
- One file per period makes a **review batch equal a file**, so approving a period is a reviewable diff.
- **Review status is not typed into the data.** An event is `approved` only if a sign-off file lists its id with the SHA-256 of its current content. Editing an approved event makes it `stale` and the release validator fails. This is the property the developer asked for («review status»): an approval can never silently outlive the text it approved, and an agent cannot approve its own work by editing a field.

### 2. The pipeline reuses the hadith and Azkar flow end to end

`pinned book file → canonicalize (closed list of removals) → book structure (sections, paragraphs, pages) → gazetteer + events (JSON) → validator (CI) → review report → developer sign-off → seerah:import (MySQL) → pack → API catalogue endpoint → app`. A new `ResourceGroup` case `seerah`, one `resources` row for the book (`source_key` = `nur-al-yaqin`), the existing pack builder, manifest, ETag, 410 floor, device `installed_resources`, download sheet and Storage screen. Nothing new is built on the device for sync.

The simpler alternative is a bundled JSON asset shipped by EAS Update (no MySQL, pack or endpoint). It is **not chosen**, and it is listed as the developer's option in the plan (open question Q13), because it would add a second content mechanism and lose the version, floor and download machinery. It would save about six steps.

### 3. Quotes are exact; the text they quote is "canonical"

A quote is a byte-for-byte substring of one paragraph of the **canonical text**. The canonical text is the pinned file with only these removals, tested one by one (this is the same device as ADR 0076 §3): the header, page markers (kept as page numbers), line-continuation markers (joined with one space), OpenITI milestone tokens (`ms` plus three digits) with one adjacent space, and the heading wrapper. Every other byte is unchanged. Quotes are never typed: `seerah:quote` extracts them from a paragraph id and a word range, so no agent or person retypes Arabic. The validator catches any mismatch anyway.

### 4. Places have a real-world position and a drawn position, kept apart

`gazetteer.json` holds the place tree with latitude and longitude (from Wikidata, CC0, or marked manual). The drawn position on each SVG map is in `map/layout.*.json`, because it is a design artefact the developer approves by looking at it. The validator checks that the two agree in relative direction, so a hand-drawn map cannot put Medina south of Mecca.

### 5. Map implementation constraints

Semantic zoom is two coordinate spaces (region and city), not one infinite zoom: tap a city or pinch past a threshold to cross-fade into its city map. Pins and labels are native views over the SVG (so each has a 44 pt hit target and an accessibility label), placed by a collision pass that runs when a gesture ends. Clusters follow the gazetteer tree first (a city's events roll up to the city pin on the region map) and screen distance second. A performance spike (plan step 19) must pass on a low-end Android before the screens are built.

## Licence and provenance (to be recorded in `docs/content-plan.md`; see the entry added with this ADR)

- The author died in 1927, so the original text is public domain.
- The digital text is from OpenITI. ADR 0076 and its research record OpenITI's licence as **CC BY-NC-SA 4.0** (stated on the Zenodo record, not in the GitHub repository), and the Shamela-derived versions carry an unclear upstream licence from al-Maktaba al-Shamila (RB21 in ADR 0076).
- **This is heavier than for hadith chapter titles**: here the whole book text ships in the pack, so the Seerah pack is adapted material under ShareAlike, and the NonCommercial term applies to it. Taybah is free today; the term would block monetising the Seerah section later. This is a developer decision (Q2).
- Editions add copyright of their own (an editor's introduction, footnotes, headings). The step-2 brief requires proof that the chosen version holds no editorial text, or a list of what to strip.

## Decisions relayed on 14 Nov 2026 (later, via the coordinator; the developer confirms)

1. The whole feature is built in one autonomous run, with no step waiting for approval; the plan's gates become checkpoints.
2. **ADR 0087's approval gate is waived for Phase 8.** Frames are still drawn in `screens/frames/seerah/` and rebuilt first, then implemented at once. This is an exception to ADR 0087 §4, for this phase only.
3. An event whose place or year the book does not state is **not invented and does not block**: it goes under the place «أخرى» (`other`) or the year bucket «غير محدد», flagged, and the review report lists these first. Every section is still covered. This refines non-negotiable 6's «flagged for the developer» into a visible bucket.
4. **No production release** (no OTA, no deploy); commits to the work branch are allowed; the developer verifies on the simulator. Production import stays blocked by `--release` validation, which needs sign-offs.
5. The build environment has no MySQL and no iOS simulator, so the correctness-critical parts (canonicalizer, validator, report, pack rows) are DB-free and the MySQL tests run in CI. Visual checks use Expo web.

## Developer decisions still open

Listed with defaults in `docs/plans/phase-8.md`, «Questions for the developer». The ones that block the first steps are: edition and version (Q1), licence acceptance (Q2), the age and Hijri year convention (Q6) and whether an event with no stated place or year is shown (Q7). Q8 (non-event sections), Q9 (disputed dates and sites), Q10 (no human figures on the map) and Q12 (navigation entry) are religious-interpretation or navigation decisions and are never taken by an agent.

## Consequences

- A new content tree, a new pack group, a new importer, one catalogue endpoint, a new device content table set, new screens. About 35 steps (plan), roughly half of them content work that cannot be skipped: the gazetteer and the events are the product.
- The review gate is a mandatory step with a sign-off per period; no pack is built in production without a release-mode validator pass (100% of records approved and not stale, every section covered or excluded, no open flag).
- The map art is the largest unknown (plan risk R1). It is drawn and approved as frames before code (ADR 0087).
- If ADR 0076 is not accepted, the `openiti` row in `content_sources` does not exist yet; the Seerah import migration must create it idempotently or wait (plan, dependencies).
