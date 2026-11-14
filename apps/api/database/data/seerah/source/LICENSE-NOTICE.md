# Licence notice: «نور اليقين في سيرة سيد المرسلين» (Seerah source)

Phase 8, ADR 0089. Developer accepted the licence terms on 14 Nov 2026 (plan Q2, relayed decision).

## Credit

- Book: «نور اليقين في سيرة سيد المرسلين» by الشيخ محمد الخضري (d. 1345 AH / 1927). The author's text is in the public domain.
- Digital text: OpenITI (Open Islamicate Texts Initiative), repository `OpenITI/1350AH`, version `JK009247-ara1`
  (Cleaned version: paratext, footnotes and indices removed by OpenITI in 2023; the edition header names مكتبة الإيمان، المنصورة، الطبعة الأولى 1419هـ / 1999م, editor أحمد محمود خطاب).

## Licence

- OpenITI digital text: **CC BY-NC-SA 4.0** (stated on the OpenITI Zenodo record, see ADR 0076). Attribution, NonCommercial and ShareAlike terms apply to the Seerah pack, which contains adapted material.
- The edition's own copyright (editor, publisher, cleaning) is not claimed; the upstream rights of the Shamela-derived text are unclear (ADR 0076, RB21). Recorded as an open risk, not resolved.

## Source

- URL: https://raw.githubusercontent.com/OpenITI/1350AH/6d0c197e84a46a3cadbd36a045d09cb2bc9aa71e/data/1345IbnCafifiKhudari/1345IbnCafifiKhudari.NurYaqin/1345IbnCafifiKhudari.NurYaqin.JK009247-ara1
- GitHub ref (commit): `6d0c197e84a46a3cadbd36a045d09cb2bc9aa71e`
- File: `1345IbnCafifiKhudari.NurYaqin.JK009247-ara1`, 695,291 bytes, SHA-256 `f8ce38b36f31cebe428ccda6e80be8561a11b615acdec0e6db55370a37443683`
- Metadata file (`.yml`) from the same folder, SHA-256 `55d7ea5bb4eaf2903695f232c50ae82becffc08e1e8d6878946f13974311e8f3`

## Changes made

- **To the file: none.** The file in this folder is byte for byte the file at the URL above. It is never edited.
- **Canonical text (derived, not committed):** `seerah:canonicalize` produces the text used for quotes by removing only the closed list of OpenITI markup in ADR 0089 §3 (header, page markers kept as page numbers, continuation markers joined with one space, milestone tokens, the heading wrapper and the paragraph marker). Every other byte is unchanged. The transform is documented in `apps/api/app/Domains/Seerah` and pinned by SHA-256 in `apps/api/config/seerah.php`.
