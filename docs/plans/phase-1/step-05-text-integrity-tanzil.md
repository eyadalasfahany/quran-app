# Step 5 — Text integrity and the Tanzil source (packages + API)

Follow [README.md](README.md). This step is independent of steps 1–4. Read also:
- `AGENTS.md` non-negotiables #1 and #3.
- `docs/content-plan.md`: the Tanzil rows (CC BY 3.0, verbatim only, credit and link).
- Spec §7, item 6 ("VerifyTextIntegrityJob").

**Goal:** pin the Tanzil text that the app will bundle (step 7), and implement the 6,236-ayah checksum in TypeScript (package) and PHP (API), proven identical.

## 1. Tanzil data files (`packages/quran-text-check/data/`)

Two files, stored **exactly as downloaded**: no edits, no reformatting, no line-ending changes. Add `data/` to the package's published files and keep it out of any formatter. This step is the **one allowed network access**: if the files aren't there, download them with these exact commands and verify the hashes. **If a hash differs, stop and report. Don't continue.**

```bash
curl -sL -o packages/quran-text-check/data/tanzil-quran-uthmani-1.1.txt \
  "https://tanzil.net/pub/download/index.php?marks=true&sajdah=true&rub=true&alef=false&tatweel=true&quranType=uthmani&outType=txt-2&agree=true"
curl -sL -o packages/quran-text-check/data/tanzil-quran-data-1.0.xml \
  "https://tanzil.net/res/text/metadata/quran-data.xml"
shasum -a 256 packages/quran-text-check/data/*
```

| File | SHA-256 |
| --- | --- |
| `tanzil-quran-uthmani-1.1.txt` | `7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326` |
| `tanzil-quran-data-1.0.xml` | `8867c1d88191472adec9db694b3cd9f135b1a2ef580574d32cf888dcb22c5c7a` |

**The text file's format:**
- 6,236 lines `sura|aya|text` (UTF-8, LF), then `#`-prefixed licence lines.
- The text includes Tanzil's own 199 `۞` marks. They are part of the verbatim text.

**`data/TANZIL-LICENSE.md`:** the source, version ("Tanzil Quran Text (Uthmani, Version 1.1)", "Quran metadata 1.0"), the download URLs, the date downloaded, CC BY 3.0, the required credit line ("Tanzil Project — tanzil.net") and the rule that copies stay verbatim.

**`.gitattributes`:** mark `packages/quran-text-check/data/*.txt` and `*.xml` as `-text` so git never rewrites line endings.

## 2. `packages/quran-text-check/src/`

Replace the throwing stub.

- **`constants.ts`:**
  - `AYAH_COUNT = 6236`
  - `SURAH_COUNT = 114`
  - `TANZIL_FILE_SHA256` = the text file hash above
  - `TANZIL_METADATA_SHA256` = the metadata hash above
  - `TANZIL_UTHMANI_CHECKSUM = '32cc746d817cad9fd4366c7597bfceb177e7649233616c0a80309074b2eb99ee'`
- **`checksum.ts`:**
  - `ayahChecksum(texts: readonly string[]): string` = lowercase hex SHA-256 of the UTF-8 bytes of `texts.join('\n')`. Texts are in verse order, 1:1 … 114:6, and **are not modified in any way**.
  - Use `node:crypto`.
- **`tanzil.ts`:**
  - `parseTanzilText(content: string): Ayah[]`, where `Ayah = { sura: number; aya: number; text: string }`.
    - Skip blank lines and lines starting with `#`.
    - Split each line on the **first two** `|` only. The text keeps everything after the second `|`, untouched.
  - `parseTanzilMetadata(xml: string): TanzilMetadata`, using a small regex/XML-attribute parser. No new dependency. It extracts:
    - `suras`: index, ayas, start, name, tname, ename, type, order, rukus
    - `juzs`, `hizbs` (the `quarter` elements), `manzils`, `rukus`, `pages`: each a list of (sura, aya) start points
    - `sajdas`: sura, aya, type
  - `loadTanzil(dataDir?: string)` reads both files (default: the package's `data/` via `import.meta.url`) and returns `{ fileSha256, metadataSha256, ayahs, metadata }`.
- **`verify.ts`:** `verifyTanzil(): VerifyResult` checks, in order:
  1. The file hash equals `TANZIL_FILE_SHA256`.
  2. The metadata hash equals `TANZIL_METADATA_SHA256`.
  3. There are 6,236 ayahs and 114 suras.
  4. The per-sura ayah counts match the metadata `ayas`.
  5. `ayahChecksum` equals `TANZIL_UTHMANI_CHECKSUM`.

  It returns `{ ok: boolean, failures: string[] }` and never throws for a data mismatch.
- **`index.ts`:** exports all of the above. Remove `NotImplementedError` and `verify` (the old stub) and update its test.
- **`package.json`:** add `"check": "node src/cli.ts"`. `src/cli.ts` runs `verifyTanzil()`, prints `ok` or each failure, and exits 1 on failure.

**Tests** (`node --test`, colocated `*.test.ts`):
- `verifyTanzil()` passes on the real files.
- `parseTanzilText` handles a `|` inside the text (the split happens only on the first two).
- **Byte-exact:** the bytes of 2:255's text from `parseTanzilText` equal the bytes of that line in the file after the second `|`.
- **Checksum:** on a tiny known input (`['a','b']` → sha256 of `"a\nb"`).
- **Failure cases:** changing one character in a copied text gives `ok: false` with a checksum failure; dropping one line gives a count failure.
- **Metadata:** 30 juz, 240 quarters, 604 pages, 15 sajdas, and sura 2 has 286 ayas.

## 3. API: PHP parity (`apps/api`)

- **`app/Support/QuranText/AyahChecksum.php`:** `compute(iterable<string> $texts): string`, the same algorithm (SHA-256 of the texts joined by `"\n"`, UTF-8, no changes).
- **`app/Support/QuranText/TanzilReader.php`:** reads `base_path('../../packages/quran-text-check/data/tanzil-quran-uthmani-1.1.txt')` with the same parsing rules.
- **Test** (`tests/Unit/Support/AyahChecksumTest.php`):
  - Computing over the real Tanzil file equals `32cc746d817cad9fd4366c7597bfceb177e7649233616c0a80309074b2eb99ee` (the parity proof).
  - The tiny `['a','b']` vector matches the TS one.
- **No job yet:** `VerifyTextIntegrityJob` is built in step 9, with `quran_core`.

## Gates

`npm run typecheck`, `npm test -w @quran/quran-text-check`, `npm run check -w @quran/quran-text-check` (prints `ok`), and `cd apps/api && vendor/bin/pint && composer qa`.

## Leave untouched

`apps/mobile`, `app/Domains`, `app/Integrations`, the migrations, `composer.json` and the root `package.json` dependencies. No new packages anywhere.
