# Quran reference map: reviewer sheet

Phase 6, ADR 0031 §4 and §11, §12. Generated from `apps/api/config/azkar_quran_map.php` (OpenDua) and `apps/api/config/azkar_hisnmuslim_quran_map.php` (hisnmuslim.com) after `azkar:quran-map-candidates`.

This sheet holds keys, span positions, references and scores only. It contains no Quran or dhikr text.

## How to review

- Each row is one ﴿…﴾ span. `span` is its position in the item (1 = first).
- `best candidate` is the closest verse range the matcher found in the standard-orthography Tanzil text, as surah:from-to.
- `similarity` is the character similarity to that range (threshold 0.97 for a candidate). `uthmani` is the same range compared with the Uthmani text.
- To confirm a span, set its row in the map file to `status => 'reviewed'` and keep its references (or correct them). Re-running the command keeps reviewed rows.
- A span with no candidate range is marked `none`.

## Totals

| Source | Spans in map | Unmatched spans |
| --- | ---: | ---: |
| OpenDua v0.0.4 (primary) | 22 | 16 |
| hisnmuslim.com | 22 | 16 |

## OpenDua: unmatched spans

| item_key | span | best candidate | similarity | uthmani |
| --- | ---: | --- | ---: | ---: |
| `hisn-al-muslim:entry-000050:standard:1` | 1 | 95:8 | 0.70 | 0.67 |
| `hisn-al-muslim:entry-000070:standard:2` | 1 | 17:111 | 0.58 | 0.58 |
| `hisn-al-muslim:entry-000070:standard:2` | 2 | 17:42 | 0.50 | 0.50 |
| `hisn-al-muslim:entry-000070:standard:2` | 3 | 4:170 | 0.50 | 0.50 |
| `hisn-al-muslim:entry-000076:standard:1` | 1 | 17:111 | 0.58 | 0.58 |
| `hisn-al-muslim:entry-000076:standard:1` | 2 | 17:42 | 0.50 | 0.50 |
| `hisn-al-muslim:entry-000076:standard:1` | 3 | 4:170 | 0.50 | 0.50 |
| `hisn-al-muslim:entry-000099:standard:2` | 1 | 17:111 | 0.58 | 0.58 |
| `hisn-al-muslim:entry-000099:standard:2` | 2 | 17:42 | 0.50 | 0.50 |
| `hisn-al-muslim:entry-000099:standard:2` | 3 | 4:170 | 0.50 | 0.50 |
| `hisn-al-muslim:entry-000110:standard:1` | 1 | 26:225 | 0.21 | 0.21 |
| `hisn-al-muslim:entry-000206:standard:1` | 1 | 26:190-191 | 0.57 | 0.57 |
| `hisn-al-muslim:entry-000207:outbound:1` | 1 | 26:190-191 | 0.57 | 0.57 |
| `hisn-al-muslim:entry-000207:returning:1` | 1 | 26:190-191 | 0.57 | 0.57 |
| `hisn-al-muslim:entry-000235:standard:2` | 1 | 2:201 | 0.89 | 0.88 |
| `hisn-al-muslim:entry-000236:standard:2` | 1 | 44:48 | 0.59 | 0.59 |

## hisnmuslim.com: unmatched spans

| item_key | span | best candidate | similarity | uthmani |
| --- | ---: | --- | ---: | ---: |
| `hisn-al-muslim-hm:76:standard:1` | 1 | 17:111 | 0.58 | 0.58 |
| `hisn-al-muslim-hm:76:standard:1` | 2 | 17:42 | 0.50 | 0.50 |
| `hisn-al-muslim-hm:76:standard:1` | 3 | 4:170 | 0.50 | 0.50 |
| `hisn-al-muslim-hm:99:standard:1` | 1 | 17:111 | 0.58 | 0.58 |
| `hisn-al-muslim-hm:99:standard:1` | 2 | 17:42 | 0.50 | 0.50 |
| `hisn-al-muslim-hm:99:standard:1` | 3 | 4:170 | 0.50 | 0.50 |
| `hisn-al-muslim-hm:110:standard:1` | 1 | 26:225 | 0.21 | 0.21 |
| `hisn-al-muslim-hm:50:standard:1` | 1 | 95:8 | 0.70 | 0.67 |
| `hisn-al-muslim-hm:70:standard:1` | 1 | 17:111 | 0.58 | 0.58 |
| `hisn-al-muslim-hm:70:standard:1` | 2 | 17:42 | 0.50 | 0.50 |
| `hisn-al-muslim-hm:70:standard:1` | 3 | 4:170 | 0.50 | 0.50 |
| `hisn-al-muslim-hm:74:standard:1` | 1 | 23:56 | 0.59 | 0.57 |
| `hisn-al-muslim-hm:206:standard:1` | 1 | 26:190-191 | 0.57 | 0.57 |
| `hisn-al-muslim-hm:207:standard:1` | 1 | 26:190-191 | 0.57 | 0.57 |
| `hisn-al-muslim-hm:235:standard:1` | 1 | 2:201 | 0.89 | 0.88 |
| `hisn-al-muslim-hm:236:standard:1` | 1 | 44:48 | 0.59 | 0.59 |

