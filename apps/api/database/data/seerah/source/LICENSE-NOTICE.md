# Licence notice: «نور اليقين في سيرة سيد المرسلين» (Seerah source)

Phase 8, ADR 0089. The developer accepted the licence terms on 14 Nov 2026 (plan Q2, relayed decision).

## Credit

- Book: «نور اليقين في سيرة سيد المرسلين» by محمد بن عفيفي الباجوري، المعروف بالشيخ الخضري (d. 1345 AH / 1927). The author's text is in the public domain.
- Digital text: Shamela book 23692, as published in OpenITI (Open Islamicate Texts Initiative), repository `OpenITI/1350AH`, version `Shamela0023692-ara1`.
- Edition named in the file header: دار الفيحاء - دمشق، الطبعة الثانية 1425 هـ. The header names no editor.

## Licence

- OpenITI's terms for the digital text: **CC BY-NC-SA 4.0** (stated on the OpenITI Zenodo record, see ADR 0076). Attribution, NonCommercial and ShareAlike terms apply to the Seerah pack, which contains adapted material.
- The upstream licence of the Shamela text (al-Maktaba al-Shamila) is unclear (ADR 0076, RB21). Recorded as an open risk, not resolved. The edition's own copyright (publisher's typesetting, the modern editor's preface and footnotes) is not claimed.

## Source

- URL: https://raw.githubusercontent.com/OpenITI/1350AH/6d0c197e84a46a3cadbd36a045d09cb2bc9aa71e/data/1345IbnCafifiKhudari/1345IbnCafifiKhudari.NurYaqin/1345IbnCafifiKhudari.NurYaqin.Shamela0023692-ara1
- GitHub ref (commit): `6d0c197e84a46a3cadbd36a045d09cb2bc9aa71e`
- File: `1345IbnCafifiKhudari.NurYaqin.Shamela0023692-ara1`, 667,755 bytes, SHA-256 `5d9bbdbd7b3c17f361383a79825fa08bfbdad5848a48436d3173af383cb1895c`
- Metadata file (`.yml`) from the same folder, SHA-256 `f6c11954238c3ebab3076df8536f18d8567f43b41230d1167fa6f79e7eb0273b` (a template: it names no edition facts).

## Changes made

- **To the file: none.** The file in this folder is byte for byte the file at the URL above. It is never edited.
- **Canonical text (derived, not committed):** `seerah:canonicalize` derives the text used for quotes by removing only a closed list of markup, each token with one adjacent space: the header block; page markers (kept as page numbers); milestone tokens `ms###`; the editor's footnote references `«N»` (the modern editor's apparatus); the HTML tags `</span>`; the line markers `### | ` (headings), `# ` (paragraphs) and `~~` (continuations, joined with one space). Footnote bodies (`# «N»` blocks and their continuation lines, 64 blocks) are excluded from the text. Empty heading wrappers (`### | ` with no text, 21) are dropped. Every other byte is unchanged. The transform lives in `apps/api/app/Domains/Seerah/Canonical` and its SHA-256 is pinned in `apps/api/config/seerah.php`.
