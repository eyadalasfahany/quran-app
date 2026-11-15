# 0090 — Azkar gets the Quls back; Duas stops repeating Azkar (15 Nov 2026)

Date: 2026-11-15 · Status: **proposed.** The developer asked on 15 Nov 2026 for the recommendations to be done without breaking anything. Claude prepared the rows. The review sheet says Claude does not mark rows `reviewed`, so the developer confirms the four entries (and the Duas filter) by checking them in the app and committing. · Amends ADR 0031 §11 (excluded entries) and ADR 0044-duas decision 5 (HadeethEnc categories). Reference and review: `DUAS-HISN-AND-CORPUS.md`.

## Context

- **Azkar.** Nine Hisn al-Muslim entries were left out of every import because the generated Quran map could not identify their passages (ADR 0031 §11, amended 1 Nov 2026). Three of them carry المعوذات (الإخلاص، الفلق، الناس): entry 70 (after prayer), entry 76 (morning and evening) and entry 99 (before sleep). The matcher guessed 17:111 for سورة الإخلاص because short surahs defeat its similarity score. Entry 110 (before sleep) quotes only ﴿الم﴾, which is 32:1.
- Checked on 15 Nov 2026 against the bundled Tanzil text: each span of entries 70, 76 and 99 is exactly 112:1–4, 113:1–5 and 114:1–6. The only differences are the basmala, which the bundled `verses` table does not store in verse 1 (it lives in `chapters.bismillah_text`), and one extra space in «و الناس». Entry 110's span is exactly 32:1.
- The other five excluded entries (50, 206, 207, 235, 236) quote **part** of a verse: the end of 23:14, part of 43:13 and all of 43:14, part of 2:201, part of 2:158. A Quran segment maps to whole verses, and the app renders those verses from `content.db`. Mapping these spans would show Quran words that the dhikr does not quote.
- **Duas.** Of the 103 HadeethEnc hadiths in Duas, the six categories 301, 302, 303, 305, 306 and 308 are azkar already in Hisn al-Muslim (morning and evening, general dhikr, home, toilet, mosque, occasions). The developer does not want Duas to repeat Azkar (15 Nov 2026). Three hadiths in category 313 repeat another hadith's dua: 3598 (= 3056), 3596 (= 3057) and 66012 (= 5883, and 66012 has a typo, «عن الجوع»).

## Decision

1. **Azkar map:** entries 70, 76 and 99 get three `reviewed` rows each (112:1–4, 113:1–5, 114:1–6), and entry 110 gets one (32:1). These four leave `excluded_entries`. Production ships 262 of 267 entries.
2. **Partial verses stay excluded:** entries 50, 206, 207, 235 and 236 stay in `excluded_entries`, with the reason `quran_partial_verse`. They return only when a segment can point to part of a verse. That needs a schema and renderer change, planned separately.
3. **Duas, hidden categories:** `duas.hadeethenc.hidden_category_ids` = 301, 302, 303, 305, 306, 308. The pinned snapshot and its SHA-256 are unchanged. A hidden category makes no group but still consumes its group id, so the shown groups keep their ids. A hadith that is only in hidden categories is not imported. A hadith in both a hidden and a shown category goes to the shown one.
4. **Duas, duplicates:** `duas.hadeethenc.excluded_hadith_ids` = 3598, 3596, 66012, each with its `duplicate_of` reason.
5. Duas therefore shows 45 prophetic duas in two groups: «الأذكار التي تقال في أوقات الشدة» (4) and «الأدعية المأثورة» (41). The Quranic part and «أدعيتي» are unchanged.

## Consequences

- No app change and no new design: both packs rebuild at the next web start, and devices pick them up through the normal pack update.
- **Audio:** entries 70, 76 and 99 have recordings in the pinned audio manifest (OD-070, OD-076, OD-099). Entry 110 has none. They were never synced, because excluded entries are skipped. Shipped tracks go from 238 to 241. Until `php artisan azkar:audio-sync` runs on the server, `azkar:audio-verify` logs the three as missing and the start continues. The transformer leaves out a recording whose file is missing, so the pack still builds (`AzkarAudioReadiness` sees only listed files), and those entries ship without audio until the sync. Run the sync once after deploy (`docs/runbooks/railway-release.md`). The next start then imports the recordings.
- A saved favourite pointing to a removed dua is skipped, not deleted (`listDuaFavoriteCards`), and its detail route shows the not-found state.
- Not done here, still open in `DUAS-HISN-AND-CORPUS.md` §7: chapter navigation in Azkar (needs frames), Duas by category (needs an ADR 0044 amendment, schema and frames), a primary dua corpus (permission requests), the narrations in category 313 that are not duas to say (developer to pick them), and the partial-verse segments.
