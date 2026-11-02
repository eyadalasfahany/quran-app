# 0038 — OpenDua's Arabic text is accepted on its public statements

Date: 2026-11-01 · Status: accepted (developer, 1 Nov 2026) · Amends ADR 0031 §1.2, §11 and release blocker 1, and the content plan (OpenDua row, open questions) · Decisions 4 and 5 amended by ADR 0042

## Context

ADR 0031 kept the production Azkar import locked until OpenDua confirmed in writing the Arabic dataset's redistribution rights and attribution. OpenDua has not been asked directly.

OpenDua's own site says the following. Each quote was checked against the raw HTML on 1 Nov 2026.

- `opendua.org/developers`, «Licence and attribution»:
  - "OpenDua's independently authored English, transliteration, editorial metadata and dataset structure are licensed under CC BY 4.0."
  - "OpenDua makes no ownership claim over the underlying Quranic, hadith or supplication text."
  - "The recitation was recorded for OpenDua under a separate written agreement and is not offered under the dataset licence."
  - "Credit Hisn al-Muslim as the collection and paste the attribution below when reusing OpenDua material."
- `attribution.txt` on the same page: "OpenDua dataset v0.0.4 (https://opendua.org), by Ihsan Labs at the Human Development Fund. Based on Hisn al-Muslim by Sa'id ibn Ali ibn Wahf al-Qahtani. OpenDua editorial text and dataset structure are licensed CC BY 4.0. Recitation by Muhammad Jumah for OpenDua. OpenDua makes no ownership claim over the underlying religious texts."
- `opendua.org/developers`, «Limits and errors»: "Need more? Bundle the dataset instead."
- Footer of every page: "OpenDua data · CC BY 4.0. Religious source text is not claimed; recitation terms are separate."
- The licence URLs inside `catalogue.json` (`opendua.org/licence/data`, `/licence/audio`) still return 404.

## Decision

1. **Release blocker 1 is closed by developer decision.** The developer accepts OpenDua's published statements in place of a direct written confirmation:
   - OpenDua's own work (structure, metadata, English, transliteration) is CC BY 4.0.
   - OpenDua claims no rights over the Arabic religious text.
   - OpenDua invites developers to bundle the dataset.
2. **The `opendua` row in `content_sources` becomes `granted`** through a reviewed migration. The record:
   - `licence_url` is `https://opendua.org/developers`. The old `opendua.hdfund.org` URL now redirects there.
   - `attribution_en` stays OpenDua's `attribution.txt`, verbatim.
   - `attribution_ar` stays empty. No Arabic wording is published, and we don't write one.
   - `notes` cites this ADR.
3. **Audio is split out and stays blocked.** *(Superseded 1 Nov 2026 by ADR 0040, which ships the audio.)* ADR 0031 §1.2 tied audio to the same confirmation. The recitation is explicitly outside the dataset licence, so §8 is unchanged: no OpenDua recording is streamed, downloaded or bundled without written rights. `audio_rights_verified` and `recording_rights` stay off.
4. **English stays off.** *(Amended 1 Nov 2026 by ADR 0042: `store_english` is `true`; English is stored for every item except one with a Quran segment, which this decision requires.)* `store_english` was `false`. CC BY 4.0 covers OpenDua's English, but the catalogue carries English renderings of Quran passages (for example entry 4, Āl ʿImrān 190–200), and ADR 0014 forbids them. Turning English on for non-Quranic duas is a separate decision.
5. **The other locks stay.**
   - *(Amended by ADR 0042)* `AZKAR_OPENDUA_IMPORT_ENABLED` is removed. The import is on by default, and the reviewed Quran map and the `opendua` row remain the rules.
   - Production still accepts only `reviewed` Quran map rows (ADR 0031 §11). The review sheet is `docs/plans/phase-6/quran-map-review.md`.
   - These production rules apply only when Railway runs with `APP_ENV=production`. That must be set before the import flag is turned on. Otherwise the importer applies local rules and accepts `candidate` map rows.

## Consequences

- Production Azkar now depends on the reviewed Quran map and `APP_ENV=production` on Railway. The `AZKAR_OPENDUA_IMPORT_ENABLED=true` step is removed (ADR 0042: the import is on by default).
- Release blockers 2 (Arabic chapter titles) and 4 (design approval) in ADR 0031 are not changed by this ADR.
- If OpenDua later publishes terms that restrict the Arabic, the rollback is the existing one (runbook, «Rolling back the content»): the flag goes off and a reviewed migration sets the source back to `pending`.
- The written question to `opendua@hdfund.org` is no longer a blocker. It stays open for the Arabic attribution wording and the Arabic chapter titles.

## Amendment pointer, 2 Nov 2026 (ADR 0042)

Decisions 4 and 5 are read with ADR 0042's amendment of 2 Nov 2026. `azkar.opendua.store_english` and `azkar.opendua.audio_rights_verified` are removed; English is always stored except for an item with a Quran segment, and recordings are imported whenever their file is on the audio disk (ADR 0040). The `opendua` row's `permission_status` is provenance only.
