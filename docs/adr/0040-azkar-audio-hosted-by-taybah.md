# 0040 — Azkar audio ships in production, hosted by Taybah

Date: 2026-11-01 · Status: accepted (developer, 1 Nov 2026) · Supersedes ADR 0038 decision 3 · Amends ADR 0031 §1.2, §8 and release blocker 5, the content plan (OpenDua row, open questions), and `docs/plans/phase-6/step-08-audio-rights.md` (its opening rule)


## Context

ADR 0038 split audio out of the Arabic-text decision and kept it blocked: "no OpenDua recording is streamed, downloaded or bundled without written rights". ADR 0031 §8 says the same ("not streamed, downloaded, proxied, cached, re-hosted or bundled") and release blocker 5 asks for written rights "only if audio is to ship".

New evidence, read by the developer on 1 Nov 2026:

- OpenDua's downloads page says of the recordings archive: "For apps, ship the archive rather than streaming from us: it is faster for your users and works offline."
- The archive `opendua-audio-hisn-v0.0.2` (README.txt) says "Attribution: Recitation by Muhammad Jumah for OpenDua." and "The CC BY 4.0 OpenDua data licence does not apply to the recordings."
- Its `manifest.json` has `"rightsProfile": "contracted-recitation"`. The published manifest at `https://audio.opendua.org/hisn/v0.0.2/manifest.json` adds `"rightsNotice": "Recorded for OpenDua by Muhammad Jumah under a written agreement held by the Human Development Fund."`
- The audio licence URL named in the catalogue (`opendua.org/licence/audio`) still returns 404.
- The recitation is therefore not under CC BY 4.0, and OpenDua has published no audio licence text. What exists is a public invitation to apps to ship the archive.

## Decision

1. **Azkar audio ships in production.** The developer accepts OpenDua's public invitation to ship the archive as the basis. This is a developer decision on the public invitation, not a written licence. It supersedes ADR 0038 decision 3 and closes ADR 0031 release blocker 5.
2. **Taybah hosts the files itself.** The app never streams from `audio.opendua.org`, and the API never proxies to it. The archive's files sit in Taybah's own storage and our API serves them. They are not committed to git.
3. **Attribution** shown with the audio: «Recitation by Muhammad Jumah for OpenDua».
4. **Storage.** Production file storage is a Railway volume attached to the API service, with no R2 or S3. Packs and audio live on it. The service runs one replica. The migration steps are in `docs/plans/phase-6/step-14-audio-and-storage.md`.
5. **Scope.** The 258 entries that ship (ADR 0031 §11, amended) get audio. The 9 excluded entries get none: their recordings are not imported. 238 of 249 tracks ship.
6. **Written confirmation is requested, not required.** A non-blocking email to `opendua@hdfund.org` asks them to confirm streaming, offline download and re-hosting by Taybah, and the attribution wording. The answer is filed beside ADR 0038's.

The rights record values (`licence`, `licence_url`, `redistribution_allowed`, the meaning of `rights_verified_at`) and the way the files are first copied are proposals in the plan, not decisions of this ADR. They become part of it when the developer confirms them (plan, open question 4).

## Consequences

- ADR 0031 §8 changes: the bullet "OpenDua recordings are not streamed, downloaded, proxied, cached, re-hosted or bundled" no longer applies. The bullet "With no legal audio, the UI shows no audio controls at all" still holds for any entry without a recording. The bullet "Downloads will reuse the Quran download manager" is replaced (developer, 1 Nov 2026): Azkar downloads use a separate file-backed downloader behind `AzkarDownloadPort`, with no `user.db` change and no change to the Quran download manager. The licence shown with audio is the attribution line «Recitation by Muhammad Jumah for OpenDua» and a link to `https://opendua.org/developers`.
- The bullet on offline downloads reusing the Quran download manager is not decided here. See the open question in the plan.
- **Rollback.** If OpenDua restricts the audio, turn the audio flag off (plan): the next import drops every recording row, the new pack carries none, and the audio endpoint answers 404. The files stay on the volume until removed by hand.
- Production now has state outside the database. A volume loss is recoverable in principle: the plan adds commands to re-copy and verify the audio and to rebuild packs from MySQL.
- A volume-backed service has no zero-downtime deploy, and it cannot have replicas (Railway volumes reference, checked 1 Nov 2026). Each deploy has a short outage.
- The 249 recordings are 63.1 MB; the 238 that ship are 57,874,176 bytes (about 55 MiB, 5,771 s).
