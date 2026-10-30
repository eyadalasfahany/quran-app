# Step 10 — Phase 2 exit check (reviewer + developer)

Not an agent coding task. The reviewer runs this on real builds and records the results in [`../phase-2.md`](../phase-2.md). The device matrix is spec §14.

**Changed 28 Oct 2026 (developer):** no real-device pass for Phase 2. The reviewer runs the checks on the **iPhone 17 simulator** (portrait and landscape, which covers the compact and expanded windows) and records the results. iPad, foldable and Split View rows are deferred to a later phase; the device matrix in spec §14 still applies before release.

| # | Check | Devices and windows | Expected |
| --- | --- | --- | --- |
| 1 | Reading mode, all 6,236 ayahs scroll from Tanzil | iPhone, iPad, Pixel Fold | Smooth (60 fps target); no truncated ayah |
| 2 | Mushaf mode, pages with QF layout (prelive: the 2 sample surahs) | Same | Page-exact lines, own font per page; placeholder for pages without layout |
| 3 | Fonts offline after first view | Airplane mode | Viewed pages render; unviewed pages show the placeholder |
| 4 | Keep position | Rotate; fold and unfold; iPad Split View 1/3 ↔ 2/3; Stage Manager live resize | The same top ayah after every change |
| 5 | Panel behaviour | iPad 13″ landscape (docked), iPad 11″ portrait (overlay), iPad mini portrait (sheet), phone (sheet) | Matches `#tablet-reader` |
| 6 | Ayah actions | All | Bookmark, highlight and note persist across restarts (`user.db`); outbox rows written |
| 7 | Tafsir (translations removed by ADR 0014) | Installed and not installed | Text as received; source credit; empty state with a download action |
| 8 | Search | Mid-range Android release build | Three-letter query under 150 ms; «العالمين» finds 1:2 |
| 9 | Accessibility | VoiceOver and TalkBack; largest text size; Increase Contrast; Reduce Motion and Reduce Transparency | Every control labelled; ayah labels are Imla'i plus number; no clipping; glass solid when reduced |
| 10 | Arabic and English | All of the above in both | Mirrors correctly, media controls included (the play glyph points left in Arabic, ADR 0025) |
| 11 | Gates | `composer qa`, mobile gates, package tests | Green |
| 12 | **604 pages** | Needs QF production mushaf layout | **Pending** until production data. Record as open if prelive only |
