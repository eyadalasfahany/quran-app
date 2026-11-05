# 0061 — MP3Quran reciters, hosted by Taybah on Cloudflare R2

Date: 2026-11-04 · Status: accepted (developer, 4 Nov 2026) · Amends ADR 0022 and 0040 (object storage "comes with a new ADR"), the content plan (MP3Quran row, "Later" becomes "Primary for additional reciters"; checklist line 205), non-negotiable 2 in `CLAUDE.md` (the list of hosts the app calls), ADR 0021 (a recitation can come from a source other than QF). Uses ADR 0060 for timings. Plan: `docs/plans/recitation-timings.md`, track B.

## Context

The app plays 20 QF chapter reciters (ADR 0008). MP3Quran.net's catalogue is much larger. Read live on 4 Nov 2026 from `https://www.mp3quran.net/api/v3/reciters?language=eng`: 244 reciters with 299 recordings (moshaf), of which 236 are Hafs from Asim and 213 have a full 114 surahs. A recording is served as one mp3 per surah at `{server}{NNN}.mp3` (for example `https://cdn.mp3quran.net/audio/islam-sobhi/r1/059.mp3`: 8,680,138 bytes, `accept-ranges: bytes`). Islam Sobhi's recording lists 109 surahs, not 114.

The content plan lists MP3Quran as "Later, after written permission" (`docs/content-plan.md` line 139, checklist line 205). The sample file `059.mp3` carries the tag "Reserved For KFGQPC".

## Decisions

Developer, 4 Nov 2026:

1. **Rights basis.** MP3Quran.net gave written permission covering its whole catalogue: Taybah may (a) host the files itself, (b) allow offline download, (c) publish timings derived from them. The developer relies on that grant for the files tagged "Reserved For KFGQPC". This is a developer decision on MP3Quran's grant; the files' own tag is a risk the developer has accepted (same style as ADR 0040). The developer holds the written permission; it is not in the repo and this ADR does not quote it (done, 4 Nov 2026). Streaming from MP3Quran's servers was not part of the choice, so the app never streams from them. QuranicAudio's files (the QF reciters) are not covered by this grant.
2. **Attribution.** MP3Quran is listed in Settings › Sources with a credit line. The line is a new UI string: it is drawn in `quran-app-screens.html` first and approved (ADR 0010, 0013), then added to the Arabic and English i18n files. The wording is the developer's and MP3Quran's, not this ADR's.
3. **Hosting is Cloudflare R2.** Object storage with Cloudflare's CDN in front. The app streams or downloads our R2 URL directly, as it does QF's. The API only hands out URLs inside recitation packs; it never proxies audio. R2 egress to the internet is free; storage is $0.015 per GB-month and the first 10 GB-month, 1 million Class A and 10 million Class B requests a month are free (https://developers.cloudflare.com/r2/pricing/, read 4 Nov 2026; recheck before relying on it).

Accepted with this ADR (developer, 4 Nov 2026):

4. **Copy once, never link.** A local, one-off command downloads each surah mp3 from the MP3Quran server, verifies it, uploads it to R2 and records its facts. Nothing reads MP3Quran's servers in production.
5. **Key layout.** `audio/mp3quran/{moshaf_id}/{surah:03}-{sha256[:16]}.mp3`. The key contains a hash of the content, so a key is never reused for different bytes. Objects are uploaded with `Cache-Control: public, max-age=31536000, immutable` and `Content-Type: audio/mpeg`. Replacing a file means a new key, a new row and a new pack version; the old object stays until no installed pack can name it.
6. **Public host.** A custom domain on the bucket (the developer chooses the name). The `r2.dev` development URL is not used in production (Cloudflare documents it as a development URL with its own limits; verify before choosing).
7. **Credentials.** R2 keys live only in the developer's local env for the upload command (never in the repo, never on Railway, never in the app; non-negotiable 8). The API reads a committed manifest and holds no storage SDK or key.
8. **Manifest, not live fetch.** The ingest writes `apps/api/resources/mp3quran/manifest.json` (catalogue snapshot of the chosen reciters, plus per-file R2 key, URL, bytes, sha256, measured duration, source URL and source ETag). An artisan command imports it at web start, like Azkar (ADR 0044). Production never calls MP3Quran's API.
9. **Data model (ADR 0021 amended).** The MP3Quran source is a `content_sources` row (`mp3quran`, permission `granted`, attribution columns). Each recording is a `resources` row (source `mp3quran`, group `chapter_recitations`, `source_key` = MP3Quran moshaf id) with one `recitations` row and its `chapter_audio_files` rows. File ids come from a reserved range (`1_000_000_000 + moshaf_id * 1000 + surah`) because the table's primary key is QF's record id (457 to 26,442 today) and is not auto-increment. Timings use the Taybah tables of ADR 0060. QF sync never touches these rows (it works from `sourceId('qf')`, `ContentSyncService.php:71`). The pack, device and endpoint shapes do not change.
10. **Scope of the first release.** Hafs recordings only. The app's text and ayah numbering are Hafs (Tanzil), and another riwayah can divide ayahs differently, so the timings and the reader would not line up. Other riwayat are a separate decision (plan, developer questions). Islam Sobhi is the pilot; the developer then picks the list.
11. **Dedupe with QF.** A reciter in both catalogues (for example Mishary al-Afasy: QF 7 and MP3Quran 123) keeps QF's recitation; the MP3Quran copy is hidden, through a config map from moshaf id to QF `source_key`. Where Taybah timings exist for a file they are used instead of QF's (ADR 0060 decision 5).
12. **Cost.** About 1.2 GB per reciter at 128 kbps (114 files, about 8–10 MB each). At $0.015 per GB-month: about $0.02 a month for one reciter, $0.21 for 20 (24 GB, after the free 10 GB), $1.65 for 100. Egress is free. Upload is about 114 Class A requests a reciter. Set a billing alert; the plan lists it.
13. **Rollback.** Mark the MP3Quran resources inactive (the manifest stops listing them; the next pack build drops them). Installed devices keep downloaded files; a streaming device fails to load a removed object, so objects are deleted only after the developer accepts that, and never while an installed pack can name them. If MP3Quran withdraws its permission, remove the objects, the resources and the Sources line in one change.

## Consequences

- `CLAUDE.md` non-negotiable 2 must name the R2 host as an allowed audio host (the developer edits it when accepting this ADR). The app has no audio host allowlist in code (grep of `apps/mobile/src` and `apps/api` found none; only the QF font host is pinned, `reader/mushaf/constants.ts`).
- Production gains state outside Railway. The Azkar audio stays on the Railway volume (ADR 0040 is amended only for "no R2 or S3"). Horizon and the scheduler stay out until the developer decides otherwise; this ADR does not need them.
- The reciter list grows from about 20 to as many as the developer picks. The list screen needs search or grouping, which is a design and navigation decision (plan, developer question).
- QF's 7-day question does not apply to MP3Quran files; the existing Quran download manager treats an R2 URL like any audio URL (`apps/mobile/src/features/audio/downloads/manager.ts` compares the downloaded size with `chapter_audio_files.size_bytes`, which the ingest records exactly).
- Partial recordings (Islam Sobhi lists 109 of 114 surahs): a surah the reciter lacks is shown as unavailable in the list and skipped in continuous play. A reciter ships only when its set is complete (all the surahs it lists); a missing timing would play «بدون تتبع», so no surah-by-surah shipping.
- Open items: confirm the Sources wording; choose the custom domain; confirm the R2 account and billing alert.

## Amendment, 5 Nov 2026: ingestion may run in GitHub Actions

Developer decision, 5 Nov 2026. This amends decision 7 (credentials) and the "never in CI" rule in the ingest README (`tools/mp3quran-ingest/README.md`, §Where it runs). Decisions 4 to 6 and 8 to 13 stand.

1. **Ingestion may run in GitHub Actions.** The manual workflow `.github/workflows/add-reciter.yml` copies a moshaf's surah files to R2 with the same tool, aligns them on CPU runners and opens a pull request with the manifest and the published-span timings. A surah whose published timings do not fit its audio file (moshaf 86, surah 75: they run about 17 s ahead from ayah 26 on), or end more than a minute before the audio does (moshaf 86, surah 89: the reciter repeats ayahs 21–26 and the timings stop at 182 s of 334 s), is aligned by the whole-surah aligner instead, written with `source: "aligner"`, and labelled in the pull request's quality table. Production never calls MP3Quran; the Railway deploy imports the merged manifest.
2. **R2 keys live in two places only:** the GitHub `taybah-app / production` environment's encrypted secrets (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`), read only by the align job, and the developer's local `.env`. The environment is restricted to the `main` branch; a required reviewer may be added. The keys are never repository secrets, never on Railway, and never in the app.
3. **The workflow opens PRs only.** It pushes a `reciter/<id>-<run_id>` branch and opens a PR against the default branch. It never pushes to the default branch and never deploys. The developer reviews and merges.
4. **Refusals stay.** The plan refuses a moshaf that is not Hafs, has no published timings, is held or duplicated, or is already complete; the merge refuses a moshaf with any missing surah.

