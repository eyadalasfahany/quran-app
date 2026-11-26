# 0100 — Reading and Focus show the chosen riwayah's own text (draft)

Date: 2026-11-26 · Status: **proposed** (draft by the planner; nothing here is decided). Written after the developer's instruction of 26 Nov 2026: «words of each riwayah should also be shown on reading and focus modes, not only on quran». Plan: `docs/plans/madinah-svg-mushaf/step-15-riwayah-reading-focus.md`. If accepted it supersedes ADR 0090 «Decided» 5 (Reading and Focus switch to Hafs), changes ADR 0090 decision 3 (Amiri Quran is the only Quran font) if a second font is chosen, and replaces the sentence «The text itself ... is never stored by us» in the `docs/content-plan.md` quran-text row. Amends spec §4, §6, §12 and §16 (listed at the end).

## Context

- Today Reading and Focus show Tanzil Hafs in Amiri Quran for every riwayah (ADR 0090 «Decided» 5; spec §12 «Other riwayat in other modes»). Frames `ReadingOtherRiwayah` and `FocusOtherRiwayah` (both «بانتظار الموافقة») draw that switch.
- **The text exists, per word, for all four other riwayat**, in the source already pinned for the word boxes: quran-ws/quran-text at `7bdefdea` (`data/mushaf/{warsh,qalun,shubah,duri}.csv.gz`, read 26 Nov 2026). It is the King Fahd Complex's own v3.0 text (al-Duri: the 2022 V20 document), one row per word with surah, ayah, position, page, line and the Unicode text exactly as released (`docs/format.md`: «the text is the release's, codepoint for codepoint»). Its licence: CC BY 4.0 for the data (attribution waived inside a product, asked for when the data itself is republished), the Complex's usage statement for the text. quran-text is «Beta» and asks publishers to verify against an authorised printed mushaf. The v3.0 documents have no recorded origin (`docs/sources.md`).
- **Numbering differs.** Shu'bah is Kufi (6,236, identical to Hafs). Warsh and Qalun are Last Madani (6,214; Fatiha's basmala is unnumbered). al-Duri: quran-text prints First Madani (6,217), but the quran-svg artwork's ayah set equals quran-text's **Sūsī** count (6,218, 67:9 counted) on all 604 pages (planner's check, 26 Nov 2026). The task statement's «6,205 Basran» appears in neither source. `data/ayah-map.csv` in quran-text maps each Kufi reference to each edition's: for Warsh and Qalun 6,019 same, 59 split, 155 merged, 2 shifted, 1 unnumbered; for al-Duri 6,036 same, 57 split, 141 merged, 1 shifted, 1 unnumbered.
- **The font question is real.** Planner's measurements (26 Nov 2026), shaping every word of each file with HarfBuzz:

  | Riwayah | Codepoints Amiri Quran lacks | Words with a `.notdef` glyph in Amiri Quran | Scheherazade New 4.500 (SIL OFL) | The Complex's own font (unmodified) |
  | --- | --- | --- | --- | --- |
  | Hafs | 0 | 0 | 0 missing | 0 missing |
  | Shu'bah | 0 | 0 | 0 | 0 |
  | Warsh | 12 (U+0870–0879, 0887, 0888, 08C9, 06D1, 06D2) | **15,469 of 77,431** | 0 | 0 |
  | Qalun | 11 | **13,508** | 0 | 0 |
  | al-Duri | 1 (U+065E) | **1,806** | 0 | 0 |

  A render of two lines each of Warsh and al-Duri in Chrome (Skia and HarfBuzz) showed Amiri Quran drawing tofu boxes and misplaced marks, Scheherazade New drawing all the letters, and the Complex's font drawing the print's shapes. **Warsh and Qalun write fa and qaf with the plain codepoints U+0641 and U+0642** (8,748 fa and 7,034 qaf): the Maghribi dotting (fa with one dot below, qaf with one dot above) comes from the Complex's Warsh and Qaloun fonts. Neither Amiri Quran nor Scheherazade New has a way to get it: the planner shaped fa and qaf (isolated, initial, medial, final) with HarfBuzz under the languages wo, ar, ary, fr, ber, kab, tzm and arq and with every Scheherazade New `cvNN` and `salt` feature, and every Amiri Quran `ss01`–`ss08` feature on, and no glyph changed (26 Nov 2026). The Complex's Warsh font has no GSUB feature for it either: it simply maps U+0641 and U+0642 to Maghribi glyphs. With the OFL fonts Warsh and Qalun would therefore show the Mashriqi dotting that the printed Madinah pages do not. (Noto Naskh Arabic's `aalt` changes the isolated fa and qaf glyphs; it was not examined further and is not a candidate.)
- **The Complex's font licence** (embedded EULA, name ID 13, read in the Warsh and Shu'bah files; fsType 0): free of cost «to Use, Copy, Distribute», subject to: the font software «cannot be Sold, Modified, Altered, Translated, Reverse Engineered, Decompiled, Disassembled, Reproduced». Name ID 0: «may not be reproduced, modified without the express written approval» of the Complex. The Complex's published statement (reproduced in quran-text's `LICENSE`) lists «True Type Font» among the free digital copies usable in websites and software. ADR 0048 rejected the **Hafs** font for its encoding and summarised the EULA as forbidding modifying or reproducing; it did not record the Use, Copy, Distribute grant. Whether an unmodified TTF inside an app or served as a pack file is «Distribute» (allowed) or «Reproduce» (forbidden) is a legal reading for the developer, and the Complex can be asked.
- The Complex's text is not NFC-ordered: 22,690 to 24,291 words per file change under NFC. It must be stored exactly as released (non-negotiable 1) and **never normalised**.

## Decisions proposed (none is made; each needs the developer)

1. **Reading and Focus show the selected riwayah's text and numbering** (Hafs 6,236 from Tanzil in `content.db` as today; Shu'bah 6,236; Warsh and Qalun 6,214; al-Duri per decision 6). The switch to Hafs, the «OtherRiwayah» frames and the notice that names Hafs are withdrawn.
2. **Source:** quran-text at the pinned commit for Warsh, Qalun, Shu'bah and al-Duri; Hafs stays on Tanzil (non-negotiable 1's checksum, unchanged). Ayah text is the words joined with a single space, **except** where quran-text marks a word `resegmented` (2 words in Qalun, 10 in al-Duri): the join rule there is verified against the Complex's own ayah-level file (`*Data_v2` CSV in `sources/kfgqpc/`) before the importer is written, so the stored ayah is the release's bytes.
3. **Delivery:** one content pack per riwayah text, built and served by the API, opened read-only on the device as its own SQLite file (like the SVG packs), never bundled in the binary (non-negotiable 3: the only bundled text stays the Tanzil seed). The chosen riwayah's text pack downloads at once, before its pages, because it is small. Each pack needs its own integrity check: a SHA-256 of the stored ayahs in a canonical order, recorded when the developer signs off the text against an authorised printed mushaf, enforced in API CI and in the app's pack verify. `packages/quran-text-check` gets a per-riwayah mode; its Tanzil check is untouched.
4. **Font** (developer chooses; recommended order and consequences in the plan):
   - **A.** The Complex's own fonts, unmodified, for Warsh, Qalun and al-Duri (about 250 KB each), Amiri Quran for Hafs and Shu'bah, if the Shu'bah render check passes. Shows the print's shapes and the Maghribi dotting. Changes decision 3 of ADR 0090 and reverses ADR 0048's EULA reading; **needs the legal reading above, ideally the Complex's written confirmation**. No subsetting or conversion (that would be «Modify»).
   - **B.** Scheherazade New 4.500 (OFL) for the three. Covers every codepoint; shows Mashriqi fa and qaf for Warsh and Qalun, which the print does not. It was removed on 12 Nov 2026 (ADR 0090 decision 3), so this reverses that too.
   - **C.** Reading and Focus for Shu'bah only (and Hafs), until a font is chosen for the rest.
   - Amiri Quran alone is not an option for Warsh, Qalun or al-Duri (the table above).
5. **What follows the riwayah and what stays Hafs** (defaults, each reversible):
   - Marks (colours, bookmarks, notes) and the reading place: per riwayah, in the tables of plan step 9, in Reading and Focus as in Mushaf mode.
   - Search: the chosen riwayah's own text (a per-riwayah `text_search` made with the same `ArabicNormalizer` rules plus a fold for the Extended-B letters; quran-text publishes its own in `docs/SEARCH-FOLD.md`), with results opening that riwayah's place.
   - Ayah labels for screen readers: see open question 5.
   - Tafsir stays Hafs-only (ADR 0090 «Decided» 1) except for Shu'bah, whose numbering equals Hafs'; a «not available for this riwayah» state elsewhere.
   - Audio stays Hafs-only (ADR 0090 decision 12): the play controls on non-Hafs text show an honest unavailable state.
   - Carrying a place between riwayat uses quran-text's `ayah-map` (shipped as a small table in each text pack); the rule for `split`, `merged`, `shifted` and `unnumbered` ayahs is open question 6.
6. **al-Duri's numbering** follows whatever the developer decides in step 14 (a, b or c). Until then al-Duri has no Reading or Focus text.
7. **Credit:** Settings › Sources and `website/sources.html` add quran-text (CC BY 4.0, «quran-text by quran-ws — https://github.com/quran-ws/quran-text — CC BY 4.0», modified: yes) because a served text pack is republication of the data as data (quran-text `NOTICE.md`), and the Complex for the text. No permission wording (memory: grants live in ADRs).

## Consequences

- A new content kind, a new pack, per-riwayah text integrity, and a render check per riwayah. The text is religious content from a source «Beta»: the developer's sign-off against the printed mushaf is a release blocker, as the artwork's A4 was.
- `docs/content-plan.md`: the quran-text row («The text is under KFGQPC's terms and is never stored by us») becomes wrong; edit it when this ADR is accepted, add the font rows (versions, licences, dates) for whichever font is chosen, and the quran-text row for text packs. Not edited yet: it is a licence statement.
- A store build is needed only if a font is bundled in the binary; a pack-delivered font file loaded at runtime (as Amiri is) needs none. Which is allowed depends on decision 4's legal reading.
- Spec edits on acceptance: §4 (reader column text), §6 (the device reads riwayah text packs; marks keys per step 9), §12 «Other riwayat in other modes» and the ayah-label rule, §16 risks. The `apps/mobile/CLAUDE.md` labelling rule needs the approved difference recorded.
- Withdraws frames `ReadingOtherRiwayah` and `FocusOtherRiwayah`; new frames are listed in the plan (ADR 0087).

## Open questions for the developer

1. **Font:** A, B or C (above), and, for A, whether to ask the Complex for written confirmation first.
2. **Orthography:** is Mashriqi fa and qaf acceptable for Warsh and Qalun in Reading and Focus (option B), given the printed pages show the Maghribi shapes? This is a judgement about the riwayah's script, not a technical one.
3. **al-Duri numbering** (step 14 options a, b, c).
4. **Verify the text.** quran-text asks publishers to check against an authorised printed mushaf. Will you sign off each riwayah's text (a sheet of random ayahs against the print, zero errors), as you did for the artwork?
5. **Screen-reader labels** for non-Hafs ayahs: the riwayah's own Uthmani text plus the number (VoiceOver and TalkBack may mispronounce the Extended-B letters; to be tested), or keep «surah name and ayah number» (the current approved difference, ADR 0090 decision 10)?
6. **Place across riwayat** for merged and split ayahs: land on the first Kufi ayah of the range, or on the start of the surah (ADR 0090 «Decided» 5, still unconfirmed)?
7. **Search scope:** the chosen riwayah's text only, or Hafs plus the chosen riwayah?
8. **Tafsir for Warsh, Qalun and al-Duri:** keep it Hafs-only, or show the tafsir of the mapped Kufi ayah(s) with a note? (A religious-interpretation choice; the planner's default is Hafs-only.)


## Developer answers, 26 Nov 2026

- **Font:** use the King Fahd Complex's qira'at fonts for Warsh and Qalun (and al-Duri when it returns), unmodified; no written confirmation from the Complex is sought (the developer reads the EULA's grant to use, copy and distribute as covering delivery of the unmodified file).
- **al-Duri** is hidden for now (ADR 0090 amendment, item 12).
- The remaining D-questions of step 15 are still open.
