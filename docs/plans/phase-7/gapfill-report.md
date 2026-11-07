# Gap report: filling fawazahmed0's missing hadith texts from OpenITI

Measurement only, 7 Nov 2026, for the ADR 0076 section "OpenITI also fills text gaps". No app code, config or data was changed. This file holds counts, numbers, ids and hashes only: no hadith text, no titles.

Scripts and downloads are in the session scratchpad (`gapfill/scripts/`, `gapfill/data/`). Downloads were treated as untrusted and read with `python3 -I`.

## Summary

The safe-fill count is lower than the rule's "confirmed" count. Some gaps are not missing text: the text already sits inside a neighbouring fawazahmed0 hadith, so filling them would show it twice.

| Collection | Gaps | Confirmed by the rule | **Safe** (confirmed, no duplication) | Confirmed but duplicated | Partly confirmed: both neighbours match, count differs | Partly confirmed: one neighbour matches | Unconfirmed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bukhari | 9 | 2 | **0** | 2 | 7 | 0 | 0 |
| Muslim, all | 203 | 42 | **37** | 5 | 147 | 14 | 0 |
| Muslim, introduction (section 0) | 89 | 0 | **0** | 0 | 87 | 2 | 0 |
| Muslim, other sections | 114 | 42 | **37** | 5 | 60 | 12 | 0 |
| Tirmidhi (not in the pinned release, see below) | 74 | 56 | **55** | 1 | 17 | 1 | 0 |
| Nasa'i | 86 | 86 | **86** (82 have no fawazahmed0 section) | 0 | 0 | 0 | 0 |
| Malik | 29 | 6 | **4** | 2 | 17 | 5 | 1 |
| Abu Dawud | 2 | 1 | **1** | 0 | 1 | 0 | 0 |
| Ibn Majah | 5 | 5 | **5** (2 sit in overlapping sections) | 0 | 0 | 0 | 0 |
| **Total** | **408** | **196** | **188** | 8 | 172 | 20 | 1 |

- **Bukhari: none of the 9 can be filled.** fawazahmed0 has no missing text here. The text for the empty numbers is already inside the previous hadith. Details are under Bukhari below.
- **Muslim's introduction cannot be filled by the rule.** OpenITI's pinned versions divide the introduction into far fewer units than fawazahmed0's 92 numbers. Details are under the introduction section below.
- **Nasa'i's 82-hadith block (3857–3938)** passes the rule. But fawazahmed0 has no section for it, so a fill also needs a book row. OpenITI puts the whole block in its own book, between fawazahmed0 sections 35 and 36.
- **Tirmidhi's Sunan is not in Zenodo release 2023.1.8.** It was measured on unpinned GitHub files. Under the ADR rule (pinned release only), Tirmidhi fills are blocked until a pinned source exists.

## Source and pin

- **Zenodo record:** `10.5281/zenodo.10007820` is the **version record** for release 2023.1.8 (17 Oct 2023), licence `cc-by-nc-sa-4.0`. The concept record is `3082463` (DOI `10.5281/zenodo.3082463`).
- **`data.zip`:**
  - File id `e1b4fd36-e7b8-4041-b893-3dc5db88c8de`, 5,794,098,657 bytes.
  - Zenodo publishes only an md5 for it, `8563c35f71bb51d4509d839f8cf069e6`, and no SHA-256.
  - The archive was not downloaded whole. Single members were read through HTTP range requests on `https://zenodo.org/api/records/10007820/files/data.zip/content`, and Python `zipfile` checked each member's CRC-32 on read.
- **The Zenodo files differ from the GitHub files** the chapter research measured. The Bukhari, Muslim, Nasa'i, Abu Dawud and Ibn Majah versions used here all differ byte-wise from the research copies (`cmp`). So the chapter research figures were not measured on the pinned files.
- **Tirmidhi:** the zip's `0279Tirmidhi/` folder has only the Shamail and the two Cilal works, and no `Sunan`. Tirmidhi was measured on the GitHub raw files the chapter research downloaded on 7 Nov 2026 (repository `OpenITI/0300AH`). That research did not record the commit.

### Files used (SHA-256)

**Primary versions:** one per collection, chosen by alignment rate before the gaps were looked at.

| Collection | Zenodo member (`data.zip` path) | SHA-256 | Aligned (fawazahmed0 hadith with text matched) |
| --- | --- | --- | --- |
| Bukhari | `0256Bukhari/0256Bukhari.Sahih/0256Bukhari.Sahih.Shamela0001681-ara1` | `b19b17cb5da39e06fde6b099dc8674994ca59980f090a12ca86a55adcd163375` | 6,610 / 7,580 (87.20%) |
| Muslim | `0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1` | `a96f38425099d55769435a4d8d240b064d7d98c2326457ed8d28fb1f098d32b4` | 7,255 / 7,360 (98.57%) |
| Nasa'i | `0303Nasai/0303Nasai.SunanSughra/0303Nasai.SunanSughra.Shamela0000829-ara1` | `3fce1aacdaa96a20c7fd32f97d6d255196ebe21c458693f9281baf46fd7db11e` | 5,673 / 5,679 (99.89%) |
| Abu Dawud | `0275AbuDawudSijistani/0275AbuDawudSijistani.Sunan/0275AbuDawudSijistani.Sunan.Shamela0001726-ara1` | `58f8fb59122383c1dd0d7c7184f372a0076f3db9e19e9af9640881564b480472` | 4,842 / 5,272 (91.84%) |
| Ibn Majah | `0273IbnMaja/0273IbnMaja.Sunan/0273IbnMaja.Sunan.Shamela0001198-ara1` | `17c6161f01caec91d3ee3ea602d2885f6b2bb499de44d6090a76196945dd6bc9` | 4,335 / 4,338 (99.93%) |
| Malik | `0179MalikIbnAnas/0179MalikIbnAnas.Muwatta/0179MalikIbnAnas.Muwatta.JK000466-ara1` | `c104e5604d96af249ad631d0c8e92e41e7fd65b53f29d5ae443cb0142637db46` | 1,716 / 1,829 (93.82%) |
| Tirmidhi (GitHub, unpinned) | `0279Tirmidhi.Sunan.JK000140-ara1.completed` | `5bc99d3d942ceaa729a83c11389016d940ae11fb0b641a4e012c743f9e44b647` | 3,889 / 3,924 (99.11%) |

**Cross-check versions:** measured, but not used for the counts above.

| Collection | Version | SHA-256 | Aligned | Safe fills |
| --- | --- | --- | --- | --- |
| Bukhari | `JK000110-ara1.completed` | `4466fb3b1228584c69df8b50a56b74a3d6beacd6a410af47c59e9637140db2a8` | 93.17% | 0 (all 4 runs: 0 units between neighbours) |
| Muslim | `ShamAY0033938-ara2` | `5d67f6d47ab9ab08801c7b840b6f36daa138f641fa5ca78f7c6ec0ad39d67478` | 96.90% | 36 (10 of them in the introduction) |
| Muslim | `Shamela0001727-ara1.mARkdown` | `511373465b8ca47d53655ef15a3a57de3c943a5d7f307c5537d1aa6c39a5a746` | 84.36% | 31 confirmed (duplication not measured) |
| Nasa'i | `JK000130-ara1.mARkdown` | `e87d10e2600435005e3ceb4afa91a33489e483f299b77d97cabac79f321acc26` | 99.70% | 86 |
| Malik | `Shamela0001699-ara1.completed` | `b2b1e115ee424d81629a0f9b6976b92f33437088a5e5fc7c39b6bbbc56f55116` | 92.56% | 4 |
| Malik | `Shamela0008140-ara1.completed` | `d90bd76855a70ce55729522ec0c48ef13c0a4f85234a2d6443169d4875ae3a34` | 43.74% | 1 (version has commentary; not usable) |
| Malik | `Shamela0028107-ara1.completed` | `33d58d0479619e84e3aceb76631daf44ea741641578202f516f1cafa80a2c63d` | 47.73% | 1 (version has commentary; not usable) |
| Tirmidhi (GitHub) | `Shamela0001435-ara1` | `965e8032d319ca639eebeac0f213a154acb379e3faaf49fd9a46b1f9289ec6e2` | 98.27% | 53 |
| Tirmidhi (GitHub) | `Shamela0007895-ara2` | `8ac7c1a66705c26ab2c968a691c885c008735def6d748995e747dee44375f270` | 96.89% | 57 |

Confirmations were **not** combined across versions, because that would inflate the count.

The Muslim introduction is where the versions disagree most: ShamAY confirms 10 introduction gaps and JK confirms none.

## Method

1. **Parsing.** Each OpenITI version was split into ordered hadith units at its own hadith marker, a numbered line. A unit runs until the next marker or heading. Number schemes per version:
   - **fawazahmed0's numbering:** Bukhari, Nasa'i, Abu Dawud and Ibn Majah (Shamela versions).
   - **Abd al-Baqi numbers:** Muslim JK and Bukhari JK. Several narrations share one number.
   - **Arabic-Indic digits:** Tirmidhi's Shamela versions.
   - Muslim's Shamela0001727 numbers its hadith within each book, and many hadith carry no number at all.
2. **Text check.** This is the same as the chapter research: the Jaccard similarity of normalised Arabic word sets, with diacritics and tatweel stripped, alif forms, alif maqsura and ta marbuta folded, page and manuscript markers removed, and words of at least 3 letters, must be **≥ 0.5**. Normalisation is for comparison only.
3. **Alignment.** For each fawazahmed0 hadith with text:
   - The best-matching unit was found within ±700 units of its proportional position.
   - Where OpenITI uses fawazahmed0's numbering, the unit with the same number was preferred whenever it also passes the text check.
   - The longest strictly increasing subsequence of matches was then kept, so the alignment is monotonic.
4. **Gap runs.** Consecutive empty hadith in fawazahmed0's order form one run. The neighbours are the fawazahmed0 hadith directly before and after the run. Classes:
   - **Confirmed:** both neighbours are aligned, and the number of OpenITI units strictly between them equals the run length. Every unit between them had text.
   - **Partly confirmed (count differs):** both neighbours are aligned, but the unit count differs.
   - **Partly confirmed (one neighbour):** only one neighbour is aligned.
   - **Unconfirmed:** neither neighbour is aligned.
5. **Duplication check** (added because of Bukhari):
   - A unit between the neighbours counts as already present when at least 60% of its words occur in the fawazahmed0 neighbour's text. Only the unit's words that are not in that neighbour's own OpenITI unit are counted.
   - **Safe** means confirmed with no such unit.
6. **Sections.** These come from fawazahmed0's `section_details`, with Muslim 16 = 3398–3567 and 43 = 5938–6168. An OpenITI book is the span after a book (kitab) heading.
   - For Bukhari's Shamela version, the heading numbers equal fawazahmed0's section numbers. Each of its 95 headed books maps to the same-numbered section.
   - For Muslim JK, the 55 book headings were mapped to sections by the majority section of the hadith aligned inside them.

## Bukhari (9 gaps, 0 safe)

| Run | Units between neighbours | Class | Measured |
| --- | --- | --- | --- |
| 5710–5712 | 1 (OpenITI 5712) | count differs | OpenITI has no 5710 or 5711. fawazahmed0 5709 contains all words of OpenITI 5709 and 5712 (Jaccard of 5709 with their union: 1.00). |
| 5774–5775 | 0 | count differs | OpenITI has 5774 and 5775. fawazahmed0 5773 contains 95%, 100% and 97% of the words of OpenITI 5773, 5774 and 5775 (union Jaccard 0.94). |
| 6074–6075 | 0 | count differs | OpenITI has no 6074 or 6075. fawazahmed0 6073 has 144 words against 89 in OpenITI 6073 (Jaccard 0.62). The extra text is not separated in OpenITI. |
| 6174–6175 | 2 (OpenITI 6174, 6175) | confirmed, **duplicated** | fawazahmed0 6173 contains 100% of the words of OpenITI 6173, 6174 and 6175. |

The pattern: in all 4 runs, fawazahmed0 put the text of the empty numbers into the preceding hadith. Filling them would repeat text that is already shown. The JK version agrees: it has 0 units between the neighbours in all 4 runs.

## Muslim (203 gaps)

Outside the introduction (114 gaps, 54 runs):

- **Safe:** 37 hadith in 8 runs: 852–853, 2339, 5214, 5541–5545, 5995–6003, 7256, 7301, 7447–7463.
- **Confirmed but duplicated:** 5 hadith (384, 1351, 1355, 1719, 5384).
- **Count differs:** 60 hadith. In most of these runs OpenITI has one unit fewer than the gap, often 0 units for a 1-hadith gap. This fits a narration that OpenITI keeps inside the neighbouring unit; the JK version groups narrations under Abd al-Baqi numbers.
  - Largest: 7329–7343 has 14 units for 15 numbers. 6527–6529 has 0 units for 3.
- **One neighbour:** 12 hadith: 3262, 5114–5115, 7016, 7513–7520.

### Muslim introduction (section 0)

- **fawazahmed0:** 92 numbers (1–92), of which 89 are empty. Text exists only for 3, 4 and 15, and its `arabicnumber` range for the section is 1–7.
- **The three runs:**
  - 1–2 (2 numbers): no aligned neighbour before them, so one neighbour only.
  - 5–14 (10 numbers): **JK has 2 units** between the neighbours.
  - 16–92 (77 numbers): **JK has 1 unit** between 15 and 93.
- **How OpenITI structures it (pinned versions):**
  - **JK000109:** the introduction has **7 numbered units** before the first hadith of the first book. Their numbers are 1–7, the same range as fawazahmed0's `arabicnumber`. They are separated by chapter headings (the `# | n ( n` heading form), and each unit carries several paragraphs of continuous prose.
  - **Shamela0001727:** the same split, **7 units** before the first book. Each unit is an unnumbered `### $` line followed by prose paragraphs, and the units sit under `### ||` chapter headings, some of which carry small numbers.
  - **ShamAY0033938:** the introduction has **101 numbered paragraphs** (`# n-` form) before the first book.
    - Between the neighbours, run 5–14 has 10 paragraphs, which matches and is confirmed.
    - Run 16–92 has 81 paragraphs for 77 numbers.
    - Run 1–2 has 7 paragraphs before 3.
- **Result:** with the primary version, 0 of the 89 can be filled by the rule. Only ShamAY splits the introduction finely enough. Even there only 10 numbers (5–14) pass, and 79 do not.

## Tirmidhi (74 gaps, measured on unpinned GitHub files)

- **Safe:** 55 hadith in 47 runs: 455, 1205, 1208–1209, 1225, 1255, 1258, 1301, 1317, 1365, 1395, 1420, 1438, 1465, 1471, 1477, 1480, 1484, 1491–1492, 1497–1498, 1500, 1515, 1522, 1526, 1537, 1553–1554, 1558, 1565, 1579, 1599, 1617–1618, 1637, 1705, 1709, 1711, 1756–1757, 1767, 1781, 1794, 1820, 1825, 1851, 1858, 2129, 2392, 3367–3368, 3717, 3758–3759.
- **Duplicated:** 2089.
- **Count differs:** 17 hadith. The runs, given as units between the neighbours against numbers in the run:

  | Run | Units | Numbers |
  | --- | --- | --- |
  | 391–391.2 | 1 | 2 |
  | 457–458 | 1 | 2 |
  | 945 | 2 | 1 |
  | 1322 | 2 | 1 |
  | 1560–1562 | 3 | 4 |
  | 1770 | 2 | 1 |
  | 1884–1884.2 | 1 | 2 |
  | 2787.2 | 0 | 1 |
  | 3011.2 | 0 | 1 |
  | 3015.2 | 0 | 1 |
  | 3799 | 3 | 1 |

- **One neighbour:** 2855.2.
- **Blocked:** the Sunan is not in the pinned Zenodo release.

## Nasa'i (86 gaps, all safe)

- **The runs:** 125; 1368–1369; 1372; 3857–3938. In each run OpenITI has exactly one numbered unit per gap number, and the unit numbers equal the gap numbers. The JK version gives the same result.
- **The 82-hadith block 3857–3938:**
  - It falls between fawazahmed0 section 35 (3761–3856) and section 36 (3939–3965), inside no section.
  - In OpenITI all 82 units sit in one book of their own (book 36 by heading order). That book holds no other fawazahmed0 hadith; OpenITI's next book maps to fawazahmed0 section 36.
  - So fawazahmed0 is missing this whole book: both its text and its section row.

## Malik (29 gaps)

- **Safe:** 470, 485, 958, 1597.
- **Duplicated:** 951, 1040.
- **Count differs:** 17 hadith. Mostly 0 units for 1 number, or 2 units for 1 number.
- **One neighbour:** 671, 694, 927, 1090, 1171.
- **Unconfirmed:** 1583.
- **Versions:** JK000466 is the primary version. Two Shamela versions align below 50% because they carry commentary.

## Abu Dawud (2) and Ibn Majah (5)

- **Abu Dawud:** 907 is safe. 4290 has 2 units, both numbered 4290, for 1 number, so the count differs.
- **Ibn Majah:** all 5 are safe (1928–1929, 1955, 2490, 2497), each on a same-numbered unit. But 2490 falls in fawazahmed0 sections 15 and 16, and 2497 in sections 15 and 17. fawazahmed0's `section_details` ranges overlap there, so the section must be settled before import.

## Hadith with text outside every section range

These are placed by the OpenITI book that holds the matching unit.

| Collection | Hadith | How placed | Score | OpenITI book → fawazahmed0 section | Previous / next section | Matches |
| --- | --- | --- | --- | --- | --- | --- |
| Bukhari | 521 | same-number unit (not in the monotonic alignment) | 0.500 | 9 | 8 / 9 | next |
| Bukhari | 2384 | aligned (OpenITI unit numbered 2383) | 1.000 | 42 | 42 / 43 | previous |
| Bukhari | 2516 | aligned (OpenITI unit numbered 2515) | 0.959 | 48 | 48 / 49 | previous |
| Bukhari | 2711 | same-number unit, **below the 0.5 threshold (weak)** | 0.463 | 54 | 53 / 54 | next |
| Bukhari | 3156 | same-number unit (not in the monotonic alignment) | 0.804 | 58 | 57 / 58 | next |
| Bukhari | 4978 | same-number unit (not in the monotonic alignment) | 1.000 | 66 | 65 / 66 | next |
| Muslim | 4968 | aligned | 1.000 | 33 | 33 / 34 | previous |
| Muslim | 4969 | aligned | 1.000 | 33 | 33 / 34 | previous |
| Muslim | 4970 | aligned | 1.000 | 33 | 33 / 34 | previous |
| Muslim | 4971 | aligned | 0.893 | 33 | 33 / 34 | previous |
| Muslim | 5885 | best match only: the first unit of OpenITI book 41, the same unit 5886 aligns to. fawazahmed0 5885 and 5886 have identical word sets (Jaccard 1.00), so they look like a duplicate pair. | 0.720 | 41 | 40 / 41 | next (ambiguous) |
| Muslim | 5886 | aligned | 0.700 | 41 | 40 / 41 | next |

For Bukhari, the OpenITI book number in the heading equals the section number. For Muslim, the book was mapped to a section by majority.

All 12 fall at a section boundary. Bukhari: 2 belong to the previous section and 4 to the next. Muslim: 4 belong to the previous section and 2 to the next.

## Open points for the developer

1. **Accept "safe" rather than "confirmed" as the fill rule.** This leaves 188 fills in total: Bukhari 0, Muslim 37, Tirmidhi 55, Nasa'i 86, Malik 4, Abu Dawud 1, Ibn Majah 5.
2. **Bukhari's 9 numbers stay empty.** Their text is already shown under the previous number. The open question is whether the app should show the number range (for example 5709–5712) on that hadith instead.
3. **Muslim's introduction** cannot be filled from the pinned primary version. The alternatives are ShamAY (10 of 89), or leaving the introduction as it is.
4. **Tirmidhi** needs a pinned source before any fill: a later Zenodo release that contains the Sunan, or a commit pin with ADR approval.
5. **Nasa'i 3857–3938** needs a section row (a missing book) as well as the text.
6. **Section conflicts:** Ibn Majah 2490 and 2497 have overlapping section ranges. Muslim 5885 and 5886 look like duplicates in fawazahmed0.

## Follow-up, 7 Nov 2026: merge classification, hadithapi.com fallback, pins and corrections

This follows the decisions at the end of ADR 0076. Counts only, as before.

The machine-readable results are in the scratchpad, one file per collection: `gapfill/out/final-classification-{slug}.json`. Each holds one entry per gap with its number, class, source, scores and reason. They contain no text. Each file also records the pinned OpenITI file (source, path and SHA-256), the fawazahmed0 commit and the threshold.

### Final classification per collection

| Collection | Gaps | Safe before (first report) | Not safe | Merge (OpenITI) | Fill-safe (OpenITI, new) | Unknown after OpenITI | hadithapi.com fallback: fill / merge | **Unknown after OpenITI and hadithapi.com** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bukhari | 9 | 0 | 9 | 7 (prev) | 0 | 2 | 0 / 2 | **0: complete** |
| Muslim, all | 203 | 37 | 166 | 17 (16 prev, 1 next) | 0 | 149 | 94 / 4 | **51** |
| Muslim, introduction | 89 | 0 | 89 | 0 | 0 | 89 | 86 / 1 | **2** (numbers 1–2) |
| Muslim, other sections | 114 | 37 | 77 | 17 | 0 | 60 | 8 / 3 | **49** |
| Tirmidhi | 74 | 55 | 19 | 1 (prev) | 0 | 18 | 9 / 0 | **9** |
| Nasa'i | 86 | 86 | 0 | 0 | 0 | 0 | — | **0: complete** |
| Malik | 29 | 4 | 25 | 4 (prev) | 0 | 21 | not in hadithapi.com | **21** |
| Abu Dawud | 2 | 1 | 1 | 0 | 0 | 1 | 1 / 0 | **0: complete** |
| Ibn Majah | 5 | 5 | 0 | 0 | 0 | 0 | — | **0: complete** (after the range correction below) |

**Complete:** Bukhari, Nasa'i, Abu Dawud and Ibn Majah.

**Still incomplete:**
- **Muslim, 51 unknown:** 1–2, 128, 209, 248, 881, 1251, 1332, 1648, 1778, 2295, 2381, 2810, 3038–3039, 3262, 3525, 3836, 3845–3846, 4436, 5114–5115, 5393, 5637, 6144, 6527–6529, 6792, 7016, 7020, 7144, 7317, 7329–7343, 7371, 7557.
- **Tirmidhi, 9 unknown:** 391.2, 457, 458, 1561.2, 1884.2, 2787.2, 2855.2, 3011.2, 3015.2.
- **Malik, 21 unknown:** 522, 671, 684, 694, 927, 994, 1013, 1054, 1057, 1090, 1171, 1176, 1191, 1203, 1389, 1492, 1519, 1528, 1583, 1748, 1762.

**Merges by number:**
- **Bukhari:** 5710–5712, 5774–5775 and 6174–6175 merge into the previous hadith (OpenITI). 6074–6075 also merge into the previous hadith (hadithapi.com).
- **Muslim:**
  - Into the previous hadith (OpenITI): 384, 1221–1222, 1351, 1355, 1366, 1719, 5384, 7513–7520.
  - Into the next hadith (OpenITI): 7325.
  - Into the previous hadith (hadithapi.com): 16, 388, 794, 3463.
- **Tirmidhi:** 2089 merges into the previous hadith.
- **Malik:** 167, 951, 1040 and 1338 merge into the previous hadith.

**Fills from hadithapi.com:**
- **Muslim:** 5–14, 17–92, 637–638, 1428–1429, 6701–6702, 6844–6845.
- **Tirmidhi:** 391, 945, 1322, 1560, 1561, 1562, 1770, 1884, 3799.
- **Abu Dawud:** 4290.

In 8 of the Muslim fills (637–638, 1428–1429, 6701–6702, 6844–6845), OpenITI has 1 unit for 2 numbers. hadithapi.com has 2 distinct records there, neither contained in a neighbour.

### Merge method and threshold

1. **Window.** For each gap run that is not safe, the OpenITI window is every unit strictly between the aligned unit of the fawazahmed0 hadith before the previous neighbour and the aligned unit of the hadith after the next neighbour.
2. **Containment.** For each unit in the window: the share of its normalised words that are present in the previous, and in the next, fawazahmed0 hadith. A unit at or above the threshold is assigned to the neighbour with the higher score.
3. **Neighbour confirmation.** This is the same text check as before (Jaccard ≥ 0.5), applied to the neighbour against the union of the units assigned to it. So a neighbour that carries merged text is still confirmed.
4. **Classes:**
   - **Merge.** Both neighbours are confirmed, and no unit between them is left unassigned. The neighbour holding the extra unit or units gives the side.
   - **Fill-safe.** The unassigned units equal the run length.
   - **Unknown.** Every other case:
     - A neighbour is not confirmed.
     - The unassigned count differs from the run length.
     - Both neighbours are single units, so OpenITI has no separate text for the gap.
     - Another unaligned fawazahmed0 hadith sits in the window.
     - The assigned blocks are out of order.
   - Units outside the span between the two neighbour blocks are ignored, and their count is recorded.
5. **Threshold 0.8, from the distribution.** There were 286 window units in all collections:
   - **Unaligned units (115)** are bimodal: 84 score ≤ 0.59 and 30 score ≥ 0.86. Only one lies in between (0.667, inside Muslim 7329–7343, which stays unknown).
   - **Units aligned to their own neighbour (171):** 168 of them score ≥ 0.9. The other three score in the 0.5, 0.7 and 0.8 bands.
   - Across all 286 units, only 2 fall between 0.6 and 0.85: 0.667 (Muslim 7329–7343) and 0.757 (the aligned neighbour unit at Tirmidhi 2855.2). Both runs stay unknown either way.
   - So 0.8 sits in the sparse band between the two modes.
6. **Count fit.** All merges have extra units equal to the run length, except Bukhari 5710–5712. There OpenITI has 1 extra unit for 3 numbers, because OpenITI's own 5709 unit spans 5709–5711. It is recorded as `count_fits: false`.

### hadithapi.com fallback

- **Scope.** Applied only to gaps still unknown after OpenITI. hadithapi.com has no Malik.
- **Requests.**
  - Only the gap numbers and their two neighbours were fetched: 4 numbers for Bukhari, 3 for Abu Dawud, 35 for Tirmidhi and 227 for Muslim.
  - Requests were spaced at least 1.5 s apart, and 0 rate-limit (429) answers were received.
  - The key was read through `php artisan tinker` into the process environment. It does not appear in any saved file or log (checked).
- **Tests** (the same as for OpenITI):
  - Both neighbours must match fawazahmed0 by the text check.
  - The gap record's containment in a fawazahmed0 neighbour must be ≥ 0.8 for a merge.
  - A fill also needs that record not to match any other fawazahmed0 hadith within ±20 (Jaccard < 0.5), and the classes in a run must stay in order.
  - **Declared merge.** hadithapi.com sometimes stores one record under several numbers, for example a record numbered with three Bukhari numbers. When the gap number shares a record with the confirmed previous neighbour, the gap is a merge into that neighbour. This settled Bukhari 6074–6075.
- **Measured scores:**
  - Fills: the maximum containment in a neighbour is 0.53, and the maximum Jaccard against other nearby fawazahmed0 hadith is 0.35.
  - The 4 containment merges score 1.00.
  - No hadithapi.com record repeats across the fills.
- **Same-number match rate** on the fetched numbers that have fawazahmed0 text. This sample is only the gap neighbours, so it is biased towards the hard places.

  | Collection | Matched | Rate |
  | --- | --- | --- |
  | Bukhari | 2 of 2 | 100% |
  | Muslim | 47 of 78 | 60.3% |
  | Tirmidhi | 23 of 24 | 95.8% |
  | Abu Dawud | 2 of 2 | 100% |

  - **Muslim:** all 31 mismatches are numbers directly next to a gap, such as 127 before 128. This points to a local one-number shift in hadithapi.com at those gaps, which is why 49 Muslim gaps fail neighbour confirmation. No offset was tried, because nothing is guessed.
  - **Bukhari:** hadithapi.com lists 7,276 records against fawazahmed0's 7,563 numbers, and stores some records under combined numbers. So its Bukhari numbering is not one-to-one with fawazahmed0's.
- **Remaining Tirmidhi unknowns:** 7 are decimal numbers (391.2 and the others) that hadithapi.com does not have. 457–458 fail neighbour confirmation.

### Muslim introduction: content check

The question was whether fawazahmed0 3, 4 and 15 contain the OpenITI introduction, which would make the introduction complete as merges. They do not.

| Version | Introduction units | Units ≥ 0.8 contained in fawazahmed0 3+4+15 | Word coverage of the units | Word coverage of the whole region before the first book's first hadith |
| --- | --- | --- | --- | --- |
| JK000109 | 7 | 3 | 22.6% | 3.7% (2,188 distinct words) |
| Shamela0001727 | 7 | 3 | 23.5% | 3.8% |
| ShamAY0033938 | 101 | 2 | 6.4% | 3.6% |

The introduction is not content-complete through merges. It becomes complete only through the hadithapi.com fills: 86 fills and 1 merge (16 into 15), with 1–2 still unknown because there is no previous neighbour.

### Tirmidhi pin

- **Repository:** `OpenITI/0300AH` (GitHub), branch `master`.
- **Pin commit:** `01a1544130e0236850ef2698923ad01575c5bd7c`, HEAD on 2025-11-28T08:56:55Z. The three files last changed in commit `2559a70673678bc9b91e2b8dba1d942981ddae3a` (2025-11-27).
- **Verification:** the files were re-downloaded at the pin commit from `raw.githubusercontent.com/OpenITI/0300AH/01a1544…/data/0279Tirmidhi/0279Tirmidhi.Sunan/`. They are byte-identical to the measured files, and their git blob SHAs match the tree.

| File | Git blob | SHA-256 |
| --- | --- | --- |
| `0279Tirmidhi.Sunan.JK000140-ara1.completed` (primary) | `6b4d4ed60c31557c046788d2801b3848d2be11f8` | `5bc99d3d942ceaa729a83c11389016d940ae11fb0b641a4e012c743f9e44b647` |
| `0279Tirmidhi.Sunan.Shamela0001435-ara1` | `1a49972fc4faf148a73d6dc7874f7039b04851d7` | `965e8032d319ca639eebeac0f213a154acb379e3faaf49fd9a46b1f9289ec6e2` |
| `0279Tirmidhi.Sunan.Shamela0007895-ara2` | `64612edfe30a8b45e639ce8fc3afaa68b28015e3` | `8ac7c1a66705c26ab2c968a691c885c008735def6d748995e747dee44375f270` |
| `0279Tirmidhi.Sunan.JK000140-ara1.yml` | — | `d68b05896cd0be4f711868cd5333045b5073c2664bcbfa34804ff1471b9f500c` |

### Ibn Majah range correction (2490, 2497)

fawazahmed0's `section_details` has two over-wide ranges:
- **Section 10** is 2016–2477, which covers sections 11–16.
- **Section 15** is 2390–2528, which covers 16–19.

Proposed correction:

| Section | Current | Proposed | `reference.book` | OpenITI book (aligned hadith) |
| --- | --- | --- | --- | --- |
| 10 | 2016–2477 | **2016–2089** | 74 hadith tagged 10 in 2016–2089, plus 4 strays (2435, 2464, 2476, 2477) | book 12: 74 aligned, all in 2016–2089 |
| 15 | 2390–2528 | **2390–2435** | 45 hadith tagged 15 in 2390–2434, plus 1 stray (2528) | book 17: 46 aligned, 2390–2435 (45 tagged 15, 1 tagged 10) |
| 16 | 2436–2491 | unchanged | 52 tagged 16 | book 18: 55 aligned, 2436–2491 (52 tagged 16, 3 tagged 10) |
| 17 | 2492–2501 | unchanged | 10 tagged 17 | book 19: 9 aligned, 2492–2501 |
| 19 | 2512–2532 | unchanged | 20 tagged 19, plus 2528 tagged 15 | book 21: 21 aligned, 2512–2532 (20 tagged 19, 1 tagged 15) |

- **2490:** `reference.book` 16, and it falls only in section 16 after the correction. They agree.
- **2497:** `reference.book` 17, section 17 only. They agree.
- **The 5 strays** have a `reference.book` that disagrees with both the corrected ranges and OpenITI's books: 2435, 2464, 2476 and 2477 are tagged 10, and 2528 is tagged 15. Contiguous range and OpenITI agree for all 5: 2435 goes to section 15, 2464, 2476 and 2477 to section 16, and 2528 to section 19. They need listing as developer-decided exceptions to the `reference.book` check (plan step 6 test).

### Nasa'i missing book (3857–3938)

- **The heading exists in OpenITI.** It is the 36th book heading in Shamela0000829, a kitab heading, and the only one of the 52 marked at heading level `### ||`. The other 51 use `### |`, so a parser must accept both levels.
- **Contents:** the book holds 82 hadith units, numbered 3857 to 3938, all distinct.
- **Two-way rule:**
  - Forward: 82 of the 82 numbers in 3857–3938 fall in this book, 100%.
  - Backward: 82 of the book's 82 units fall in 3857–3938, 100%.
  - It passes the 95% rule.
- **Position:** the next OpenITI book maps to fawazahmed0 section 36 (from 3939), and the previous one to section 35 (to 3856).

## Final round, 7 Nov 2026: closing the last unknowns

The rules are the same as before: both neighbours must confirm, a gap is either fill-safe or a merge, and nothing is guessed. The `final-classification-{slug}.json` files are updated and final.

**Change of input path.** During this round, the app's snapshot folder (`apps/api/storage/app/private/sources/hadith/df57907…/editions/`) was rebuilt and no longer holds `ara-muslim.json`, `ara-tirmidhi.json` or `ara-malik.json`. I downloaded these three from `fawazahmed0/hadith-api` at the pinned commit into the scratchpad (`gapfill/faw/`). Their SHA-256s match `config/hadith.php` exactly. Nothing in the app was changed.

### Recorded decisions (in the JSON)

- **Muslim 637–638, 1428–1429, 6701–6702 and 6844–6845:** accepted as fills, with a `decision` field on each entry.
- **Bukhari 5710–5712:** accepted as a merge into 5709 (`count_fits: false`, no text added), also with a `decision` field.

### Results

| Collection | Unknown before this round | Closed by other OpenITI versions | Closed by hadithapi.com offsets | **Final unknown** |
| --- | --- | --- | --- | --- |
| Bukhari | 0 | — | — | **0: complete** |
| Muslim | 51 | 2 | 1 | **48** (2 in the introduction: 1–2) |
| Tirmidhi | 9 | 0 | 0 | **9** |
| Nasa'i | 0 | — | — | **0: complete** |
| Malik | 21 | 1 | not in hadithapi.com | **20** |
| Abu Dawud | 0 | — | — | **0: complete** |
| Ibn Majah | 0 | — | — | **0: complete** |

**1. Muslim.**

- **Other OpenITI versions.** I tried the two Muslim versions not used before, ShamAY0033938 and Shamela0001727.
  - **Closed:** 209 (fill-safe, from Shamela0001727) and 2295 (merge into the next hadith, from ShamAY0033938).
  - **Not accepted: 248.** The two versions disagree: ShamAY gives a merge into the next hadith, and Shamela0001727 gives a fill. Both results are recorded in the entry.
  - Each closed entry records the version used, its path and its SHA-256.
- **hadithapi.com offsets −2 to +2.** I fetched 109 extra records for Muslim and 30 for Tirmidhi, at least 1.5 s apart, with 0 rate-limit answers.
  - An offset was accepted only when both fawazahmed0 neighbours match the hadithapi.com records at that same offset, and the count fits.
  - **Closed:** 2381, a merge into the next hadith at offset +1. The neighbour Jaccards are 0.94 and 0.60, and the gap record is fully contained (1.00) in the next neighbour.
  - **Not closed: 46 Muslim numbers.** In every other run, no single offset confirms both neighbours. The dominant pattern, 33 numbers, is that the previous neighbour matches only at +1 and the next only at 0. So hadithapi.com files the previous neighbour's text under the gap number and has no separate record for the gap. Other patterns:

    | Previous neighbour matches at | Next neighbour matches at | Gaps |
    | --- | --- | --- |
    | 0 | −1 | 7 |
    | 0 | (no offset) | 3 |
    | −1 | 0 | 2 |
    | (no offset) | −2 | 1 |

  - 2 gaps (1–2) have no previous neighbour.
- **Muslim's final unknowns (48):** 1–2, 128, 248, 881, 1251, 1332, 1648, 1778, 2810, 3038–3039, 3262, 3525, 3836, 3845–3846, 4436, 5114–5115, 5393, 5637, 6144, 6527–6529, 6792, 7016, 7020, 7144, 7317, 7329–7343, 7371, 7557.

**2. Tirmidhi decimals.** I checked all 3 versions (JK000140, Shamela0001435, Shamela0007895).

- **None of the decimal numbers exists as a separate unit between confirmed neighbours** in any version.
- **For 391.2, 1561.2 and 1884.2,** each run's whole numbers were filled from hadithapi.com. The OpenITI units between the neighbours can then be compared with those fill records:
  - In Shamela0007895, each unit is fully contained in a fill record (1.00).
  - In JK000140 and Shamela0001435, the same units are 0.28–0.84 contained, because they carry more text than the hadithapi.com record.
  - So whether the decimal sub-hadith's text is inside the whole-numbered hadith depends on the version. That is not confirmed, and they stay unknown.
- **3011.2 and 3015.2:** no version has a separate unit for them, while both neighbours are confirmed single units.
- **2787.2 and 2855.2:** a neighbour is not confirmed in 2 of the 3 versions.
- **457–458:** OpenITI has 1 unit for 2 numbers. On hadithapi.com the previous neighbour matches only at +1 and the next only at 0.
- **Tirmidhi's final unknowns (9):** 391.2, 457, 458, 1561.2, 1884.2, 2787.2, 2855.2, 3011.2, 3015.2.

**3. Malik.** I measured all 10 Muwatta versions in the pinned release.

| Version | Aligned to fawazahmed0 |
| --- | --- |
| JK000466 | 93.8% |
| Shamela0001699 | 92.6% |
| Shamela0028107 | 47.7% (with commentary) |
| Shia000901Vols | 47.6% |
| Shamela0008140 | 43.7% |
| ShamAY0033923 | 11.1% |
| Shamela0016050 | 6.3% |
| ShamAY0033991 | 4.0% |
| ShamAY0033921 | 3.1% |
| ShamAY0033922 | 0.9% |

- **Recension.** Only JK000466 and Shamela0001699 match fawazahmed0's recension. They were the only versions accepted as evidence.
- **Closed:** 1492 (fill-safe, from Shamela0001699).
- **Candidates recorded but not accepted** (in `not_accepted_candidates`), because their versions align below 50%: 10 numbers from Shamela0028107 and Shamela0008140 (927, 1013, 1090, 1171, 1176, 1191, 1203, 1528, 1583, 1748).
- **Malik's final unknowns (20):** 522, 671, 684, 694, 927, 994, 1013, 1054, 1057, 1090, 1171, 1176, 1191, 1203, 1389, 1519, 1528, 1583, 1748, 1762. The most common reasons:
  - OpenITI has 2 units where fawazahmed0 has 1 number (6).
  - There is no separate OpenITI text (6).
  - A neighbour is not confirmed (4).

### Final unknown count per collection

| Collection | Final unknown |
| --- | --- |
| Bukhari | 0 |
| Muslim | 48 |
| Tirmidhi | 9 |
| Nasa'i | 0 |
| Malik | 20 |
| Abu Dawud | 0 |
| Ibn Majah | 0 |

Under the completeness rule, Muslim, Tirmidhi and Malik stay held back until Sunnah.com (step 18) or another confirmed source closes them.

### Final round, part 2: sunnah.com-derived sources and Dorar

The rules are the same as before: both neighbours must confirm, the count must fit, and the duplication check must pass. Each source's records were treated as ordered units and aligned by text, because neither source shares fawazahmed0's numbering everywhere.

The downloads are in `gapfill/data2/` and were read with `python3 -I`. The fawazahmed0 input was read from the hash-verified copies in `gapfill/faw/`. Nothing was written under `apps/api/storage`.

**Sources:**

| Source | Pin | Files (SHA-256) | Licence claim, provenance | Arabic text | Numbering against fawazahmed0 | Aligned by text |
| --- | --- | --- | --- | --- | --- | --- |
| meeAtif/hadith_datasets (Hugging Face) | revision `cd62605e4fef3c46968a5f9fdcccbbbffdf631b5` (2026-02-09) | `Sahih Muslim.json` `1484b907…a55b8`; `` Jami` at-Tirmidhi.json `` `b17d9acc…5d693`; `README.md` `ddcb8605…d595` | "MIT" tag set by the uploader; sunnah.com-derived (each row links to sunnah.com). No Malik. | yes, 0 empty records | sunnah.com references. Muslim uses the Abd al-Baqi number plus a letter, has no introduction and has 7,368 records. Tirmidhi uses its number plus a letter for sub-hadith, with 4,053 records. | Muslim 98.83%, Tirmidhi 99.87% |
| AhmedBaset/hadith-json (GitHub) | commit `70b83d6d21995bb32f8d7271cd75501be5a922a7` (`main`, 2026-03-28) | `db/by_book/the_9_books/muslim.json` `12e3cbe8…6ae`; `tirmidhi.json` `9ba6da92…437`; `malik.json` `a926eb63…ef8` | No licence; README says it was scraped from sunnah.com | yes. Malik has 125 empty records; Muslim and Tirmidhi have none. | `idInBook` is not fawazahmed0's number. The same-number match rate is Muslim 0.0%, Tirmidhi 19.2%, Malik 5.7%. | Muslim 98.83%, Tirmidhi 99.87%, Malik 99.95% |
| Dorar.net | — | — | ADR 0031: an official API with a token; no bulk import, no permanent storage | — | — | **Not used.** The repo client (`apps/api/app/Integrations/Dorar/`) has no endpoint paths ("the mapper owns those once Dorar documents them"), and no `DORAR_API_BASE_URL` or token is set locally. So nothing could be confirmed through it. |

**Results for the 77 gaps:**

- **Tirmidhi: 4 closed as fill-safe.** These are 391.2, 1884.2, 2787.2 and 2855.2.
  - Both sources independently confirm each one: both neighbours match, the count fits, and nothing is duplicated. Their records for these numbers are identical (Jaccard 1.00 between the two sources).
  - The source recorded is meeAtif, corroborated by hadith-json.
  - Consistency check: in both runs where the whole number was already filled from hadithapi.com (391 and 1884), the meeAtif record for that whole number matches the hadithapi.com fill (Jaccard 1.00).
- **Malik: 1 closed as fill-safe.** This is 1519, from hadith-json, the only source with Malik.
- **Muslim: 0 closed.**
  - Both sources reproduce the same structure as fawazahmed0:
    - 23 gaps have no separate record between confirmed single-record neighbours.
    - 15 are the 7329–7343 run, with 14 records for 15 numbers.
    - 4 have 1 record for 2 numbers.
    - 6 have a neighbour that is not confirmed, including 1–2.
  - So sunnah.com itself appears to have no separate text at these numbers.
  - For 1–2: hadith-json has introduction records, but none aligns to fawazahmed0 3. So the start of the collection cannot be used as a boundary.
- **Tirmidhi's remaining 5 (457, 458, 1561.2, 3011.2, 3015.2)** and **Malik's remaining 19** fail for the same structural reasons in both sources:
  - Source and fawazahmed0 have different record counts (Malik 8, Tirmidhi 3).
  - There is no separate record (Malik 11, Tirmidhi 2).
- **Recorded in the JSON:** each still-unknown entry has a `sunnah_derived_results` field with both sources' class and reason. Each `final-classification-*.json` file has an `extra_sources` block with each source's URL, pin, file, SHA-256, licence claim and provenance. Accepted entries have `source` set to `meeAtif/hadith_datasets` or `AhmedBaset/hadith-json`, and `corroborated_by` where both sources agree.

**For the developer:** both sources are sunnah.com-derived. meeAtif's MIT tag is the uploader's own claim, and hadith-json has no licence. These are the same rights questions as RB13. The 5 new fills therefore carry that rights status.

### Final unknown count per collection (after part 2)

| Collection | Final unknown |
| --- | --- |
| Bukhari | 0 |
| Muslim | 48 |
| Tirmidhi | 5 |
| Nasa'i | 0 |
| Malik | 19 |
| Abu Dawud | 0 |
| Ibn Majah | 0 |
