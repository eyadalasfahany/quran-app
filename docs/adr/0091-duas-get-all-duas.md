# 0091 — Duas gets all duas; Azkar keeps dhikr (15 Nov 2026)

Date: 2026-11-15 · Status: **proposed** · Decided by the developer on 15 Nov 2026 (the five decisions below). The open points are listed at the end and are not decided here. · Amends ADR 0031 §9 and §10 (display categories, placement), ADR 0044-duas decisions 1, 5, 8, 12 and the 5 Nov 2026 and 15 Nov 2026 amendments (Hisn stays in Azkar only; Duas has three parts), and ADR 0090 (the «Not done here» list: Duas by category). Does not change ADR 0055 (audio rules). Plan: `docs/plans/azkar-duas-split.md`. Review sheet: `docs/plans/azkar-duas-split/classification.md`.

## Context

- Azkar holds all of Hisn al-Muslim (OpenDua v0.0.4, 267 entries in 132 chapters; 262 ship after ADR 0090). Its browse topics are OpenDua's 19 editorial tags (ADR 0031 §9). Many entries are duas to say on an occasion, not dhikr, so a person who looks for a dua finds it under «الأذكار».
- Duas has three parts (ADR 0044, amended 5 Nov 2026): the Quranic duas, the HadeethEnc prophetic duas (45 after ADR 0090) and «أدعيتي». ADR 0090 removed from Duas what repeats Azkar, so Duas holds no Hisn content today.
- The developer wants the split drawn by meaning: Duas has all duas, Azkar keeps dhikr, and the timed sessions stay whole.
- Two pending frames already draw the category shape: `screens/frames/duas/DuasHomeCategories.html` and `DuasCategory.html`. They are drawn with themed category names that no source provides (see «Open points», 1).

## Decision (developer, 15 Nov 2026)

1. **Every Hisn al-Muslim entry gets a type, `dhikr` or `dua`.** The type is metadata about an entry. No text is written, edited or generated (non-negotiables 1 and 6).
   - Entries in the five timed sessions (`morning`, `evening`, `after_prayer`, `before_sleep`, `after_waking`, ADR 0031 §9) stay whole in the Azkar sessions, duas included.
   - Outside the sessions, an entry typed `dua` **moves** from its Azkar browse topic to Duas. An entry typed `dhikr` stays in Azkar.
2. **Classification is proposed by Claude and confirmed by the developer.** The review sheet is `docs/plans/azkar-duas-split/classification.md`; the data is `apps/api/config/azkar_entry_types.php`, keyed by `entry_key`, each row with a `type`, a `status` (`reviewed` or `candidate`) and its evidence, the pattern of `config/azkar_quran_map.php` (ADR 0031 §11). **Only the developer marks a row `reviewed`.** Production applies `reviewed` rows only. An entry with no `reviewed` row stays where it is today.
3. **Duas becomes one page like Azkar:** a home of categories, a page per category, and the reader. The categories are the Hisn duas (by topic and chapter), the HadeethEnc prophetic duas, the Quranic duas and «أدعيتي».
4. **Sources:** only the licensed ones now: Hisn al-Muslim through OpenDua, HadeethEnc, and the Quran. Permission requests for other sources are drafted in `docs/permission-requests/duas-sources.md`, and none of those sources is used.
5. **Constraints:** Quran text is never altered; nothing is generated; the user's data survives; Duas favourites keep working; no native change.

## Design of the change (proposed for the developer's approval with the plan)

1. **A moved dua is referenced, not copied.** The Hisn text stays once, in the `azkar` pack. The `duas` pack is unchanged. The `azkar` pack gains one nullable column, `azkar_entries.home` (`'duas'` or null; null means Azkar). The server computes it at import: `home = 'duas'` when the entry has a `reviewed` type `dua` and belongs to no session category. `azkar_entry_categories` is left as it is, so a moved entry keeps its topic links; the Duas page reads them to group the moved duas by the same topic.
2. **Nothing the user saved changes key.** The entry keeps its `entry_key` (`hisn-al-muslim:entry-NNNNNN`) and its `item_key`s. `azkar_favorites`, `azkar_progress`, `azkar_reminders` and `dua_favorites` need no migration and no rewrite. The reader route `/azkar/entry/<key>` opens any entry, whatever its `home`.
3. **A moved dua opens in the Azkar reader** (counter, recording, reminder, share), reached from the Duas category page. This keeps ADR 0055 §1: no second audio player, no copy of a recording, `features/duas` never imports `azkarPlayerStore`.
4. **Pack compatibility.** The new column is nullable and the pack schema version stays 1: a new app with an old pack reads `home` as null (nothing moves), and an old app with a new pack ignores the column (nothing moves). No release order is needed between the API and the app (spec §6, `packSelectList` in `core/sync/content-sync.ts`).
5. **No native change.** The `content.db` column is a Drizzle SQL migration inlined in the JavaScript bundle, no package, plugin or native field changes. The app ships as an EAS Update (`CLAUDE.md`, «Releasing the app»), after `npx eas-cli fingerprint:compare` shows the same fingerprint.
6. **Favourites.** A saved Hisn entry stays in `azkar_favorites`, and the Azkar favourites list still shows it (the user's saved items never disappear). The Duas favourites list also shows the saved entries whose `home` is `duas`, read-only. Saving or unsaving from the reader writes `azkar_favorites`; `dua_favorites` keeps the Quranic and prophetic duas.
7. **Azkar after the split.** Browse-topic lists, topic counts, search results, the chapter list (when it ships) and Home picks leave out entries whose `home` is `duas`. The session screens, the reader, the player, reminders and progress are unchanged.

## Consequences

- Production first ships with an **empty** `config/azkar_entry_types.php`: nothing moves until the developer marks rows `reviewed` and commits them. The machinery and the app can be released before the content decision.
- ADR 0044's rule that Duas has «no themes» (§2) stays unless the developer approves a Taybah category list (open point 1). Categories from OpenDua's tags and HadeethEnc's category titles are sourced and need no approval.
- The old frames `DuasHome`, `DuasHomeDark` and `DuasHomeEnglish` still draw the earlier design (Hisn topic tiles, counts that the 5 Nov amendment and ADR 0090 removed). They are replaced by the new home frames once approved (ADR 0087).
- Spec §5 (`azkar_entries.entry_class`, `home`), §6 (`azkar_entries.home`), §7 (import computes `home`), §12 (Azkar and Duas browsing), the content plan (Duas rows) and ADR 0044's pointer are edited in the same change that ships the step.

## Open points: answered by the developer (15 Nov 2026)

1. Duas uses sourced category names only: the OpenDua topics, HadeethEnc's group titles as received, one Quranic category, and «أدعيتي». Taybah writes no themes.
2. Azkar keeps all 132 chapters.
3. An entry in both a session and a browse topic stays whole in Azkar.
4. The Duas favourites list also shows saved Hisn duas.
5. Duas search comes later.
6. A Hisn dua opens in the Azkar reader.

The original wording of each point follows.

## Open points (as first written)

1. Category names for Duas: sourced (OpenDua topics, HadeethEnc titles, one Quranic category in Mushaf order) or a Taybah list that mixes sources, as the pending frames draw it. A themed list is a religious classification of Quran verses and hadith, so it needs reviewed rows and the developer's approval.
2. Whether the Azkar chapter list (frame `AzkarChapters`, pending) hides a chapter whose entries all moved, or keeps all 132 chapters (ADR 0031 §9: the book's chapter order and numbering are always kept).
3. Whether an entry that is in a session **and** in a browse topic stays in that topic (the reading here: yes, it stays whole in Azkar).
4. Whether the Duas favourites list shows saved Hisn duas (proposed) or only `dua_favorites`.
5. Whether a Duas search ships with this change (cut line).

## Release blockers

1. The review sheet rows the developer wants applied are marked `reviewed` and committed (the release can ship without any).
2. The new frames approved by the developer (ADR 0087).
3. `npx eas-cli fingerprint:compare` shows no fingerprint change.

## Later decisions (developer, 15 Nov 2026)

1. **Types reviewed:** the developer reviewed the classification sheet and had every row marked `reviewed`, which moves 97 duas to Duas. The sheet lists each dhikr on its own row, under each of its categories (`docs/plans/azkar-duas-split/classification.md`).
2. **Separate topics:** the OpenDua tags «الصباح والمساء» and «النوم والاستيقاظ» are split into four Azkar topics: `morning-topic`, `evening-topic`, `sleep-topic` and `waking-topic` (`config/azkar.php` `split_topics`).
3. **«تم» ring:** before the tap, the ring of an entry with no sourced count shows «اضغط / عند الانتهاء» and no check. The check and «تم» appear only after the tap (frames `AzkarReaderSingleIdle` and `AzkarReaderSingleDone`, which replace `AzkarReaderDone`).
4. **Hadith dua books:** the five books of supplication become Duas categories: Bukhari 80, Muslim 48, Tirmidhi 48, Ibn Majah 34 and Nasa'i 50 (content plan, decision 18). The hadiths are read from the Phase 7 hadith packs on the device, and nothing is copied into the Duas pack.
5. **No sources on the Duas screens:** home, category and dua detail show no source, takhrij, reference, grade or credit line.
   - Attribution moves to Settings › المصادر.
   - HadeethEnc's terms ask apps to name it clearly as the source. Crediting it only in Settings is a risk the developer accepts; the written confirmation request to HadeethEnc should ask whether that is enough.
6. **Same design as Azkar:** the Duas home, category and search screens use the Azkar header, cards, tiles and search layout.
7. **Duas search ships in this change.** This reverses D6 above.
8. **Other dua sources:** a search on 15 Nov 2026 found no other openly licensed collection of new duas. The GitHub dua datasets copy Hisn al-Muslim under MIT with no provenance, and the wiki collections are outside the app's sources. The permission requests in `docs/permission-requests/duas-sources.md` stay the route to more content.
9. **Following the book's own «دعاء» titles:** an Azkar entry outside the sessions whose Hisn al-Muslim chapter title says «دعاء» is a dua, whatever the text rule proposed. That retyped 49 rows, so 146 entries now sit in Duas.
10. **Topics across sources:** Quranic duas and the chapters of the five hadith dua books also get a Duas topic, reviewed row by row in `config/duas_topics.php` (sheet `docs/plans/azkar-duas-split/topics.md`). A tagged dua appears in its topic and stays in its source category. This amends D1: topics now mix Quran, Sunnah and Hisn al-Muslim, and the topic names stay the OpenDua topic names.
11. **Hisn duas open in a Duas detail:** a Hisn dua opened from Duas shows in a Duas detail with the same layout as the prophetic dua (no counter, no source line, pager within the category). This replaces D5. Within Duas that detail has no audio (ADR 0055); the Azkar reader keeps the recording.
