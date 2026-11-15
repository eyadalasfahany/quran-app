# Single topics, audio in Duas, all licensed content — plan

Date: 15 Nov 2026 · Status: **proposed** · ADR draft: `docs/adr/0092-single-topics-and-duas-audio.md` · Sheet: `docs/plans/single-topics-audio/topics.md` · Branch: `main`.

Each step is one reviewable change. Each step runs the checks for every app it touches (`composer qa`; mobile `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`). Agents write no religious text: fixtures use marked placeholders.

## Step 0 — Developer (no code)
- Accept or change ADR 0092 and its two open points (HadeethEnc repeats, topic names).
- Review `topics.md` row by row; mark rows `reviewed`.

## Step 1 — Topic list and one-topic config (API)
- `config/azkar_topics.php`: `topics` (id → position) and `chapters` (chapter → `['topic', 'status', 'evidence']`). A reviewed row replaces that chapter's OpenDua tags, and `split_topics` stays for chapter 27.
- `TopicPolicy` (production: reviewed only), `azkar:topics-check` (every chapter once, known topic, no excluded entries).
- `AzkarTransformer::categories()` emits one browse category per entry from the policy. `AzkarImportFingerprint` includes the config. i18n names in `ar.json`/`en.json` only after the developer approves them.
- Tests: an empty config gives today's output with the same fingerprint; a reviewed row gives one topic; candidates are ignored with a warning; session categories and Quran segments are byte-identical.

## Step 2 — Duas topics redrafted (API + sheet)
- Redraft `config/duas_topics.php` (80 Quranic, hadith-book chapters) on the new ids. Claude drafts by reading each chapter title or verse, not by keyword. All rows are candidates. Tests as in step 1.

## Step 3 — Restore HadeethEnc categories (API)
- `duas.hadeethenc.hidden_category_ids` → `[]`; new reviewed list `duplicate_of_hisn` (HadeethEnc id → Hisn entry_key, filled by the developer). The 3 `excluded_hadith_ids` duplicates stay. Tests: hidden list empty keeps group ids stable; a listed duplicate is not imported.

## Step 4 — Hisn audio inside Duas (app)
- `DuaHisnDetailScreen`: the play control reuses the Azkar player components and `azkarPlayerStore` (ADR 0055 §1). The architecture test is updated: `features/duas` may start Azkar playback only through the public `features/azkar` API. Needs a frame state (step 7).

## Step 5 — Quranic dua playback (plan first: player)
- `DuaQuranDetailScreen` play button → Quran `playerStore` with `verse_from..verse_to`, the user's reciter, highlighting from existing timings. Needs a «play range» API on the player. The planner writes a separate brief (spec §12).

## Step 6 — Partial-verse segments (plan first: schema + reader)
- `azkar_segments.word_from`, `word_to` (nullable); map rows for entries 50, 206, 207, 235, 236; the renderer draws only those words from `content.db` (never from the source text). Pack and device migrations are additive. Checksum test must pass. Separate plan.

## Step 7 — Design audit and frames
- Compare every built Azkar and Duas screen with its frame and with each other (iPhone 17 screenshots vs `frame-shot.py`). List the mismatches.
- Redraw the Duas home, category, detail (with the audio states from steps 4–5) and search frames on the Azkar layout, captions «(بانتظار الموافقة)». Retire `DuasHome*`. Rebuild with `python design/screens/scripts/build.py && python design/scripts/build_reference.py`, then hand over the review links.

## Status (15 Nov 2026)
- Steps 1–3 built, not committed. Step 2 added 14 topics (43 total, `config/azkar_topics.php`), and 26 non-dua rows in `duas_quran_map.php` were marked `rejected` (developer). Sheet: `single-topics-audio/duas-topics.md`.
- **Gap found:** nothing reads `config/duas_topics.php` yet, so Duas topics across sources (ADR 0091 decision 10) are not wired. New step 2b: the Duas import writes topic links into the `duas` pack and the Duas home lists topics. Needs its own brief (pack contract).
- Step 7 frames drawn (28 files), all «(بانتظار الموافقة)». Steps 4 and 5 UI wait for approval.
- Step 5 answers (developer): separate listen (no «continue reading», no «Recently listened»), verse highlight only, second tap pauses, no repeat; a reciter without ayah timings disables the button with a hint. Plan: `docs/plans/quran-dua-playback.md`.
- Step 6 answers (developer): app OTA first, then the API returns the entries; commit the generated word map; pause signs as stored; the developer reviews each range in `partial-verse-segments/words.md`; a non-contiguous quote stays excluded. Plan: `docs/plans/partial-verse-segments.md` (ADR 0093 to accept).

## Step 8 — Release
- API deploy rebuilds the packs. App: `npx eas-cli fingerprint:compare`, then `eas update --channel production`. Steps 1–4 have no native change. Step 5 or 6 may change it: stop and report if the fingerprint differs.

## Not in scope
- Unlicensed dua collections (content plan; ADR 0092 decision 4).
- Audio for hadith duas (no licensed recording; no TTS).
