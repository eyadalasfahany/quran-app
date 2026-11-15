# 0092 — One topic per dua, single-name topics, audio in Duas, all licensed content (15 Nov 2026)

Date: 2026-11-15 · Status: **accepted** (developer, 15 Nov 2026: the four directions below, every topic row and topic name marked `reviewed`, and «start all steps») · Amends ADR 0091 later decisions 2, 10 and 11, ADR 0055 §1 and §2, ADR 0090 decisions 2 and 3, and ADR 0031 §9 (browse topics come from OpenDua's tags). Plan: `docs/plans/single-topics-audio.md`. Review sheet: `docs/plans/single-topics-audio/topics.md`.

## Context

- Azkar's browse topics, and the Duas topics since ADR 0091 decision 10, are OpenDua's 19 editorial tags. 17 of them join two subjects («المغفرة والتوبة», «الرزق والدين», «الصلاة والمسجد», «البيت والأسرة»…). Only two were split so far (`split_topics`, ADR 0091 later decision 2).
- 38 of the 132 Hisn al-Muslim chapters carry two or three tags (`config/azkar_chapter_tags.php`), so the same entry is listed under several topics. Example: chapter 73 «الدعاء إذا أفطر عند أهل بيت» is in fasting, food and gatherings.
- Some tags don't fit their chapter: 98 «دعاء دخول السوق» is tagged travel, 4 «الدعاء لمن لبس ثوبا جديدا» is tagged gatherings.
- The Quranic and hadith-chapter topics in `config/duas_topics.php` came from a keyword rule, and some are plainly wrong. For example, `quran:2:128` is marked «الموت والمتوفى» because of the word «مسلمين».
- Duas has no audio. ADR 0091 decision 11 left Hisn duas silent inside Duas. ADR 0055 §2 made playing a Quranic dua a cut line («فتح في المصحف» only).
- The developer wants (15 Nov 2026): single-name topics, no repeats, topics checked; Duas and Azkar on one design; all content; audio for each dua, handled the way the Quran is.

## Decision (developer, 15 Nov 2026)

1. **Single-name topics.** One shared topic list for Azkar and Duas. Every topic names one subject (e.g. «الصلاة», «المسجد», «الرزق», «الدَّين», «الاستغفار»). Taybah names the topics. This replaces «topic names stay the OpenDua names» (ADR 0091 later decision 10).
2. **One topic per item.** Each Hisn chapter, Quranic dua and hadith dua-book chapter has exactly one topic, so nothing is listed twice. Where the tag does not fit, the chapter title decides. The data is a reviewed config like `azkar_quran_map.php`: Claude proposes `candidate` rows, only the developer marks them `reviewed`, and production applies only reviewed rows. Until a chapter has a reviewed row, it keeps its OpenDua tags.
   - The five timed sessions are unchanged (ADR 0031 §9, ADR 0091 D2).
   - Source categories are unchanged: «من القرآن الكريم», the hadith book, «حصن المسلم» by chapter.
3. **Audio in Duas.**
   - A Hisn dua opened from Duas plays its OpenDua recording, using the Azkar player and `azkarPlayerStore`. No file is copied. This replaces ADR 0091 decision 11 («no audio in Duas»).
   - A Quranic dua gets a play button that plays its verse range with the Quran player: `playerStore`, the user's reciter, verse highlighting and the existing timings. This lifts the cut line in ADR 0055 §2. No new audio file is made.
   - Hadith duas stay text-only. No licensed recording exists, and TTS of religious text stays banned (ADR 0055 §3).
4. **All licensed content.**
   - The five Hisn entries that quote part of a verse (50, 206, 207, 235, 236) come back. A Quran segment can then point to part of a verse, word to word, so the app shows only the words the dhikr quotes. This needs a schema and renderer change, planned separately (it touches the reader). It amends ADR 0090 decision 2.
   - The six HadeethEnc categories hidden by ADR 0090 (301, 302, 303, 305, 306, 308) come back in Duas. This amends ADR 0090 decision 3.
   - **Not done:** importing collections whose owners have not licensed them. The developer asked to skip permission and take all content. `docs/content-plan.md` makes licensing binding, so that stays out until a reply, an ADR and a pinned snapshot exist (ADR 0091 later decision 8).
5. **Same design.** The built Azkar and Duas screens are audited against their frames and against each other. The Duas frames are redrawn to match Azkar and marked «(بانتظار الموافقة)» (ADR 0087) before any code.

## Open points (answered by the developer, 15 Nov 2026)

1. **Repeats from restoring HadeethEnc.** The six restored categories repeat azkar already in Hisn al-Muslim (that is why ADR 0090 hid them). A reviewed `duplicate_of_hisn` list (HadeethEnc id → Hisn entry_key) keeps listed hadiths out; it starts empty, and the developer fills it. Taybah does not match the texts automatically.
2. **Topic names.** The developer approved the 29 names in the sheet.

## Consequences

- No `user.db` change. Topic ids are new. Old progress rows keyed `category:<old-topic>` stay stored, and stop counting once a chapter's row is reviewed (the same short-lived effect as ADR 0091 §4).
- The `azkar` pack gets new `azkar_categories` and `azkar_entry_categories` rows (same tables) and the `duas` pack gets new topic ids. No pack schema change for decisions 1–3. Decision 4's partial-verse segments do change the schema: a new nullable word range on `azkar_segments`.
- Decision 3 (Quran play button) and decision 4 (partial verses) touch the reader and player, so each is planned before code (CLAUDE.md).
- Spec §5, §6, §7, §12, the content plan and ADRs 0031, 0055, 0090 and 0091 get pointer lines once this ADR is accepted.
