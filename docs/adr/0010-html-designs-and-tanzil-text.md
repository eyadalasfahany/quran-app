# 0010 — HTML design files are the design source; Tanzil supplies verse text and words for v1

Date: 2026-10-27 · Status: accepted; decision 1 amended by ADR 0075 (the screens moved from `quran-app-screens.html` to `screens/`, one file per frame) · Supersedes the Figma part of ADR 0005; supersedes Phase 1 step 9 (ADR 0008)

## Context

**Design.** Figma was meant to be the design source, with `quran-app-design-system.html` as a cross-check (ADR 0005). The Figma MCP quota ran out, and the developer has now decided the HTML files are the source:
- `quran-app-design-system.html`: tokens and components.
- `quran-app-screens.html`: about 30 phone screens, states (offline, empty, dark, English, Android), and the expanded-window sidebar.

**Verse text.** Our QF client gets no `quran_core` from Content Sync, and the developer won't request it (ADR 0008). QF's terms also forbid building offline packs from the public v4 API. The developer's word-segmentation plan (`docs/plans/word-segmentation-plan.md`) takes verse text and per-word text from Tanzil instead, aligned to QF's word positions so recitation word timings still line up.

**Validation** (27 Oct 2026). We ran the plan's split rules on all 6,236 Tanzil Uthmani verses. Ground truth was the word positions in our synced QF recitation timings, from two reciters covering every verse:
- **Basmala:** Tanzil prefixes the Basmala to verse 1 of 112 surahs (written «بِّسْمِ» in 95:1 and 97:1). QF doesn't count it in the verse.
- **Joined words:** QF writes «بَعْدَمَا» as one word in 2:181, 8:6 and 13:37; Tanzil has two.
- **Everything else matches.** The reciters disagree with each other on 21 verses; in each, Tanzil equals one of them. Splitting and rejoining reproduces every Tanzil line byte for byte.

## Decision

1. **Design source.**
   - `quran-app-design-system.html` and `quran-app-screens.html` are the design source. Figma is optional reference only.
   - UI follows them and the `apple-design` skill.
   - Layouts the HTML doesn't cover (tablet reader with side panel, medium windows) are drawn into `quran-app-screens.html` from the existing tokens, and approved by the developer before code (as was done for the sidebar).
2. **Verse text for v1 is Tanzil:**
   - Uthmani v1.1, already pinned.
   - Tanzil "Simple" for Imla'i, to be pinned the same way.
   - `quran_core` is not used. Phase 1 step 9 is superseded.
   - Phase 1's exit check becomes: a fresh install reads Tanzil offline, the checksums pass, and QF content (translations, tafsir, mushaf layouts, timings) syncs.
3. **The Basmala is split, not altered.**
   - For verse 1 of surahs 2–114 except 9, the leading Basmala segment, up to and including the first space, becomes `chapters.bismillah_text` (stored exactly as found).
   - The verse's `text_uthmani` is the rest of the line.
   - A test proves `bismillah_text + verse 1 text` equals the Tanzil line, byte for byte.
   - The pinned checksum stays defined over the original Tanzil lines.
4. **Word map.**
   - `word_map(verse_key, position, word_id, char_type, text_uthmani, text_imlaei)` is built by a rerunnable script, following the developer's plan.
   - Pause marks attach to the previous word, ۞ to the next word, and ۩ to the previous word.
   - An `exceptions.json` covers the three «بَعْدَمَا» joins.
   - **Validation:** word counts per verse must equal the QF positions (recitation timings everywhere; mushaf layouts where synced).
   - It ships as a pack, with the Tanzil licence notice.

## Consequences

- **Not in v1:** IndoPak and Tajweed per-word text (the plan's "later" items).
- **The 21 verses where reciters disagree** get rechecked once a full QF mushaf layout is synced (production).
- **Step 7's seed** (in progress) needs a follow-up for the Basmala split. The word map is a new Phase 1 step.
