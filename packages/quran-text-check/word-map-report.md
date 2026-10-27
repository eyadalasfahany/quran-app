# Tanzil word map

Built from Tanzil Uthmani 1.1 and Tanzil Simple 1.1. Word counts are checked against `test-fixtures/qf-word-counts.json`, which is a test fixture and is not shipped.

- Verses: 6236
- Uthmani Basmala splits: 112
- Simple Basmala splits: 112
- Word rows: 77433
- End rows: 6236
- Unexpected mismatches: 0
- Alignment failures: 0

Pause marks (U+06D6–U+06DC, U+06E2, U+06ED) and sajdah (U+06E9) attach to the previous word. Rub el hizb (U+06DE) attaches to the following word. A leading `۞` still counts when Simple merges the vocatives يا, ويا, فيا, أيا and ها with the next word.

Word positions follow the mushaf layout count when the fixture has one. Otherwise they follow the audio count when both reciters agree. A verse in `data/audio-segment-merges.json` is expected to have one fewer audio position for each merged pair.

## Exceptions

- `17:110`: أَيًّا مَّا means whichever. The vocative test ignores diacritics, so أَيًّا looks like أيا, but Uthmani keeps the two words. Do not merge them.
- `20:94`: Simple «يَا ابْنَ أُمَّ» against Uthmani «يَبْنَؤُمَّ». Indexes are after the vocative merge, so group [1, 2] joins «يَا ابْنَ» with «أُمَّ».
- `72:16`: Simple «وَأَن لَّوِ» against Uthmani «وَأَلَّوِ».

## Known audio merges

- `2:181`: words 14; audio 13, 13; layout 14; merged positions 3, 4. QF timing data treats بَعْدَ مَا as one segment; QF layout has two words
- `8:6`: words 12; audio 11, 11; merged positions 4, 5. QF timing data treats بَعْدَ مَا as one segment; the word map keeps Tanzil's two words
- `13:37`: words 20; audio 19, 19; merged positions 8, 9. QF timing data treats بَعْدَ مَا as one segment; the word map keeps Tanzil's two words

## Audio-disputed verses

- `5:1`: words 23; audio 23, 22
- `7:82`: words 13; audio 13, 12
- `7:158`: words 31; audio 31, 29
- `9:60`: words 22; audio 21, 22
- `11:29`: words 22; audio 22, 21
- `11:86`: words 11; audio 11, 10
- `11:110`: words 18; audio 18, 17
- `13:11`: words 35; audio 35, 34
- `13:18`: words 27; audio 25, 27
- `13:34`: words 14; audio 14, 13
- `19:16`: words 10; audio 10, 9
- `19:26`: words 18; audio 18, 17
- `24:46`: words 11; audio 11, 7
- `25:46`: words 5; audio 5, 4
- `35:1`: words 24; audio 24, 13
- `42:13`: words 38; audio 38, 37
- `42:14`: words 30; audio 30, 29
- `57:9`: words 17; audio 17, 12
- `60:12`: words 38; audio 38, 37
- `69:17`: words 9; audio 9, 3
- `71:25`: words 12; audio 12, 11

## Unexpected mismatches

None.

## Alignment failures

None.
