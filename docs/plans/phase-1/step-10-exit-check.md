# Step 10 — Phase 1 exit check (reviewer + developer)

Not an agent coding task. The reviewer runs this after step 8 (and step 9, if it's unblocked), and records the results in [`../phase-1.md`](../phase-1.md).

## Checks

| # | Check | How | Expected |
| --- | --- | --- | --- |
| 1 | Fresh install, offline, reads Tanzil | Delete the app, install a dev build, airplane mode, launch | 1:1 and 2:255 readable; `meta.bundled_text = tanzil-uthmani-1.1` |
| 2 | Tanzil checksum | `npm run check -w @quran/quran-text-check`; the step 7 seed tests | `ok`; seed checksum = `32cc746d…2eb99ee` |
| 3 | API sync on prelive | `content:sync` for translations, tafsirs, mushafs and chapter_recitations | Counts as in steps 3 and 4; every `sync_runs` row `ok` |
| 4 | Resume | Kill a sync in the middle, then rerun | Completes, no duplicate rows, token stored once |
| 5 | Packs and manifest | `curl` the manifest (200, then 304), download a pack, check its sha256 | Matches `content_packs` |
| 6 | Device sync | Online launch, then airplane mode | Translation 85 offline for both sample surahs; tafsir and mushaf layout rows present |
| 7 | Change feed | Simulate a `ROW_UPDATE` in a test sync, then foreground the app | The device row is updated with no pack download |
| 8 | Atomicity | Corrupt a pack's hash on the server | The device keeps its old rows and reports `failed` |
| 9 | All gates | `composer qa`, the mobile gates, `npm run typecheck`, the package tests | Green |
| 10 | Word map and Basmala | `npm run word-map:report -w @quran/quran-text-check`; the seed `words` table | 0 unexpected mismatches against QF word positions; 112 Basmala splits; every verse rejoins byte for byte |
| 11 | Tanzil Simple (Imla'i) | The seed tests | Checksum rebuilt from the original lines |

The exit criterion is ADR 0010's: a fresh install reads Tanzil offline, the checksums pass, and QF content syncs. `quran_core` is no longer required.
