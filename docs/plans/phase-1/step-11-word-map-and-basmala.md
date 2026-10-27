# Step 11 — Tanzil word map, Imla'i text and the Basmala split (packages + App)

Follow [README.md](README.md). Needs steps 5 and 7 committed. Read also:
- [ADR 0010](../../adr/0010-html-designs-and-tanzil-text.md).
- The developer's plan: [`../word-segmentation-plan.md`](../word-segmentation-plan.md).
- The step 5 code (`packages/quran-text-check`) and the step 7 code (`apps/mobile/src/core/db/content`, `apps/mobile/scripts/build-content-seed.mjs`).

**Goal:**
- Per-word Uthmani and Imla'i text from Tanzil, positioned exactly like Quran Foundation's word numbering, so recitation word timings line up.
- The Basmala split out of verse 1.
- Both in the bundled seed.

Text is **never altered**: only split at spaces, with marks attached to neighbouring words. Every rule below is a split rule.

## Inputs (already in the repo; download nothing)

| File | Pinned SHA-256 |
| --- | --- |
| `packages/quran-text-check/data/tanzil-quran-uthmani-1.1.txt` | `7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326` |
| `packages/quran-text-check/data/tanzil-quran-simple-1.1.txt` | `b3638f5cf03e2b05e4000efc0e4b656aafb3cf6ed28f8770b6497c5b43c46089` (new; add to `constants.ts` and to `verifyTanzil()`, plus a `TANZIL_SIMPLE_CHECKSUM` computed the same way as Uthmani) |
| `packages/quran-text-check/test-fixtures/qf-word-counts.json` | Ground truth for tests only, never shipped. `verses["2:255"] = {"audio": [n6, n7], "layout"?: n}`: the max word position in two QF reciters' audio timings, and the word-row count from QF mushaf 1 where synced (2 surahs) |

Update `data/TANZIL-LICENSE.md` with the Simple file (version 1.1, the URL `https://tanzil.net/pub/download/index.php?quranType=simple&outType=txt-2&agree=true`, and today's date).

## 1. Basmala split (`packages/quran-text-check/src/basmala.ts`)

- For verse 1 of surahs 2–114 except 9, Tanzil prefixes the Basmala. It's 4 words, normally `verses['1:1'] + ' '`; in **95:1 and 97:1** it's written «بِّسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ » (with a shadda on the ba).
- **Rule:** if verse 1 of surah *s* (≠ 1, ≠ 9) starts with exactly 4 space-separated tokens that, after the first one, equal `ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ` and the first token is `بِسْمِ` or `بِّسْمِ`, split them off.
  - `bismillah_text` = those 4 tokens, joined exactly as in the source (no trailing space).
  - The verse text = the remainder after the following space.
- **The surahs without a prefix in this file:** 1 (the Basmala *is* verse 1) and 9 (none). Expect **112** splits in Uthmani. Apply the same rule to Simple, with its own spelling (`بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ` / `بِّسْمِ …`).
- **Export:** `splitBasmala(suraNumber, ayaNumber, text): { bismillah: string | null; text: string }`.
- **Invariant (tested for all 6,236 verses):** `bismillah === null ? text : bismillah + ' ' + text` equals the Tanzil text byte for byte.
- **The pinned checksums stay defined over the original Tanzil lines.** Don't change them.

## 2. Uthmani word split (`src/words.ts`)

`splitUthmaniWords(verseKey, verseText)` applies these steps to the text *after* the Basmala split:
1. Split on U+0020 only. Empty tokens can't occur in Tanzil; throw if they do.
2. A token made only of pause or waqf marks (U+06D6–U+06DC, U+06E2, U+06ED) is appended to the **previous** word, keeping its separating space (`word + ' ' + mark`).
3. `۩` (U+06E9, sajdah) is appended to the **previous** word the same way.
4. `۞` (U+06DE, rub el hizb) is prepended to the **following** word (`'۞ ' + word`).
5. **Exceptions** come from `data/word-exceptions.json`: `[{ "verse_key": "2:181", "join": ["بَعْدَ", "مَا"], "reason": "QF writes بَعْدَمَا as one word" }, …]`. Joining keeps the space (`"بَعْدَ مَا"` becomes one word whose text contains the space). Seed it with **2:181, 8:6 and 13:37** (each joins `بَعْدَ مَا`). Add an entry only with evidence from the fixture, and say why.
6. **Output:** `[{ position: 1…n, char_type: 'word', text }]`, then one `{ position: n+1, char_type: 'end', text: '' }` row, matching QF's verse-end marker.

**Invariant:** joining the `word` rows' text with `' '` reproduces the post-Basmala verse text, byte for byte.

## 3. Imla'i alignment (`src/words.ts`)

`alignImlaei(uthmaniWords, simpleVerseText)`, using the Simple text after its own Basmala split:
1. Tokenize on U+0020. Pause, sajdah and rub tokens are attached exactly as in §2.
2. **Vocative merge:** a token whose letters (diacritics and tatweel ignored for the *test only*) are `يا`, `ويا`, `فيا`, `أيا` or `ها` is merged with the **following** token (keeping the space). Tanzil Simple writes «يَا أَيُّهَا», «وَيَا آدَمُ» as two words, where Uthmani has one («يَـٰٓأَيُّهَا»). This explains about 350 of the 363 verses whose raw counts differ.
3. Apply the same `word-exceptions.json` joins where their Simple spelling is present (add a `join_simple` field if it differs).
4. After the merges, the count must equal the Uthmani word count. Every remaining mismatch is either fixed by a general rule or listed in `word-exceptions.json` as `{ "verse_key": …, "simple_groups": [[0,1],[2],…] }` with a reason. The known case is **20:94**: «يَا ابْنَ أُمَّ» against Uthmani «يَبْنَؤُمَّ».
5. **Output:** `text_imlaei` per position. The `end` row gets `''`.

**Invariant:** joining the Imla'i texts with `' '` reproduces the post-Basmala Simple text, byte for byte.

## 4. The word map (`src/word-map.ts`) and its report

- `buildWordMap(): WordMapRow[]`, each row `{ verse_id, verse_key, position, char_type, text_uthmani, text_imlaei }`, for all 6,236 verses.
- `buildChapterBismillah(): Map<number, { uthmani: string; imlaei: string }>`.
- **CLI** `npm run word-map:report -w @quran/quran-text-check` writes `packages/quran-text-check/word-map-report.md` (committed):
  - Totals and the Basmala split count.
  - The exceptions used.
  - Verses where the word count differs from the fixture: **must be 0** except the audio-disputed verses below.
  - The alignment failures: **must be 0**.

**Validation against the fixture:**
- Word rows per verse (`char_type = 'word'`) must equal `layout` where present.
- Otherwise they must equal `audio[0]` when both reciters agree.
- When the reciters disagree (21 verses), the count must equal one of the two, and the report lists those verses for a later check against a full QF layout.

## 5. Seed and device schema (`apps/mobile`)

- **`content.db` schema:**
  - Add a nullable `chapters.bismillah_text` (Uthmani) and `chapters.bismillah_imlaei`.
  - Add a `words` table: `verse_id` int, `position` int, `char_type` TEXT (`word` | `end`), `text_uthmani` TEXT, `text_imlaei` TEXT. PK (`verse_id`,`position`), index `verse_id`.
  - Generate the Drizzle migration (`npm run db:generate`).
- **Seed builder:**
  - `verses.text_uthmani` = the post-Basmala text; `verses.text_imlaei` = the post-Basmala Simple text.
  - `text_search` = `normalizeForSearch(text_imlaei)`. **This changes step 7, which normalized Uthmani:** stripping Uthmani's dagger alef turns «ٱلْعَـٰلَمِينَ» into «العلمين», so a user typing «العالمين» finds nothing. The Imla'i spelling matches what people type. Rebuild `search_quran` from the new `text_search`. Test that 1:2 gives `الحمد لله رب العالمين` and 1:1 gives `بسم الله الرحمن الرحيم`.
  - `chapters.bismillah_text` and `chapters.bismillah_imlaei` filled from the split.
  - `words` from `buildWordMap()`.
  - `meta.word_map_version` = `1`.
  - Rebuild `assets/db/tanzil-seed.db`.
- **`importSeedIfNeeded`** also copies `words` and the new chapter columns.
- **Step 7's tests change:**
  - The seed checksum check now **rebuilds the original lines**: `ayahChecksum` over `(bismillah ? bismillah + ' ' : '') + text_uthmani` in `id` order equals `TANZIL_UTHMANI_CHECKSUM`.
  - Add the same check for Simple.

## Tests

**Package** (`node --test`):
- Basmala: exactly 112 Uthmani splits, 95:1 and 97:1 included, none for 1:1 or 9:1; the round-trip invariant holds on all 6,236 verses, for both texts.
- Uthmani split: the round-trip invariant on all 6,236 verses; the fixed cases 1:1 (4 words + end), 2:255, 112:1, 2:26 (pause mark attached), 7:206 (`۩` attached), a verse starting with `۞`; the three `بَعْدَ مَا` joins.
- Imla'i: the invariant on all verses, the vocative merge on 2:21 and 7:19, and 20:94.
- **Fixture validation:** 0 unexpected mismatches, and the disputed list equals the report's list.

**App** (Jest, `node:sqlite` executor):
- The seed's `words` has one `end` row per verse (6,236 in total).
- The words of 2:255 rejoin into `text_uthmani`.
- `chapters.bismillah_text` is null for 1 and 9, and set for the other 112.
- The seed checksums for Uthmani and Simple are rebuilt from the original lines.

## Gates

`npm run typecheck`, `npm test -w @quran/quran-text-check`, `npm run check -w @quran/quran-text-check`, `npm run word-map:report -w @quran/quran-text-check` (exits 0, and the report shows 0 unexpected mismatches), the mobile gates, and `node .github/scripts/npm-audit.mjs`.

## Leave untouched

`apps/api`, the API contract, step 8's sync code (`src/core/sync`), and the UI.
