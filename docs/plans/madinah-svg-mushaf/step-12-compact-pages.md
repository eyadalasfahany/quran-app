# Step 12 — Compact pages: TQP1 baked geometry on a 1/32 grid, raw deflate, pack schema 2 (ADR 0090, amendments of 24 and 26 Nov 2026)

Branch: `main` (check with `git branch --show-current`). Stage and commit nothing. Read `.claude/agent-rules.md`, root `CLAUDE.md`, `apps/api/CLAUDE.md` and `apps/mobile/CLAUDE.md` first. Do the parts in order: **0 (checks), A (API), B (device), C (measure and gate)**. One part per review.

**Depends on:** steps 2, 5 and 7 (import, packs, renderer). **Step 11 (release) waits for this step.** Spec, content plan and ADR edits are already written (ADR 0090 «Amendment, 26 Nov 2026», which supersedes the LZMA and 1/16 parts of the 24 Nov one); do not re-edit them except where Part C says to record numbers.

## Rests on

- ADR 0090 «Amendment, 26 Nov 2026» (the decision: N = 32, raw deflate) and «Amendment, 24 Nov 2026» (the rest), decisions 7 (A1), 8 (Skia), 9 (delivery).
- Spec §7 «SVG mushafs», §12 «Mushaf rendering», §14, §16; `docs/content-plan.md` row `quran-svg`.
- The reference codec: `docs/plans/madinah-svg-mushaf/spike/tqp.py` (+ `tqp_degen.py`).
- Code: `apps/api/app/Domains/Mushaf/{Sources/SvgMushafStore.php, Sources/SvgMushafDownloader.php, Services/SvgMushafImporter.php, Services/SvgMushafPublisher.php, Services/WordBoxBuilder.php, Packs/SvgMushafPackBuilder.php, Packs/SvgMushafPackWriter.php}`, `apps/api/app/Domains/Content/Packs/PackSchema.php`; `apps/mobile/src/features/reader/mushaf-svg/{page-source.ts, svg-page-model.ts, page-picture.ts, useMushafPageLoader.ts}`, `src/features/reader/components/MushafSvgPage.tsx`, `src/core/mushaf-pack/SvgMushafPackReader.ts`.

## Rules for this step

- **The raw SVG is never altered.** The cached files stay byte for byte as downloaded and A1 (git blob SHA-1 and size, `SvgMushafDownloader`) still runs on them. `WordBoxBuilder` keeps reading the **raw** SVG through `SvgMushafDownloader::bytes()`; do not point it at TQP data. The approved word-box digest (`8944a6b3…`) must not change. If it does, stop and report.
- **No Quran text, and no quran-svg artwork, in tests or fixtures** (`.claude/agent-rules.md`; step 5 says the same). Fixtures are small synthetic SVGs marked `FIXTURE — not artwork`, written to exercise each rule below. Real-page parity runs from the local cache, is skipped when the cache is absent, and checks nothing in.
- **Add no dependency**, in either app. The device inflates with `fflate` (already installed); the server compresses with PHP's built-in `gzdeflate`. `apps/mobile/package.json`, `package-lock.json` and `apps/api/Dockerfile` must stay as they are (an earlier try with `lzma1` and `xz-utils` was reverted on 26 Nov 2026). No `transformIgnorePatterns` change.
- **Do not bump `PackSchema::VERSION`** (it is global: `content-sync.ts` checks it for every other pack). SVG packs get their own constant (A5).
- Dropping `gz_sha256` / `gz_bytes` is a destructive migration and is **not** part of this step.

## The format: TQP1 (decided; byte layout)

One page = one blob in `pages.tqp`: an **18-byte header, uncompressed**, then **one raw deflate stream** (RFC 1951, no zlib or gzip wrapper) of the body.

```
offset size  field
0      4     magic "TQP1" (ASCII 54 51 50 31)
4      2     N       uint16 LE   grid steps per viewBox unit; always 32 in this release
6      4     ncmds   uint32 LE   number of commands
10     4     nvals   uint32 LE   number of deltas (entries in each of the lo and hi planes)
14     4     nesc    uint32 LE   number of escaped deltas
18     …     raw deflate (level 9) of the BODY
BODY = cmds[ncmds]  |  lo[nvals]  |  hi[nvals]  |  esc[nesc] as uint32 LE, 4 bytes each
```

- The page's viewBox is fixed 345 × 550 with a zero origin; it is not stored. Coordinates are in grid units: viewBox unit × N.
- **Page origin (orchestrator, 26 Nov 2026).** Hafs pages 1 and 2 have a non-zero raw viewBox origin (about −53.31, −198.48). The artwork is baked to a zero origin, but the pack's `regions` and `word_boxes` stay in the raw page space. So the pack's `pages` table also stores the raw origin: `pages (page INTEGER PRIMARY KEY, tqp BLOB NOT NULL, origin_x REAL NOT NULL, origin_y REAL NOT NULL)`, written from the viewBox min-x/min-y (0, 0 on most pages). The origin is not part of the container or its digest. The app sets `model.origin` from these columns and subtracts it from regions and word boxes, as it did with the parsed SVG.
- **Commands** (one byte each): `M = 0`, `L = 1`, `Q = 2`, `C = 3`, `Z = 4`. Points per command: M 1, L 1, Q 2, C 3, Z 0. Each point is two deltas, **dx then dy**.
- **Deltas** are relative to the current point **at the start of the segment** (so a Q's two points and a C's three points are all relative to the same start; this is exactly SVG's relative `q` and `c`). Start: current point (0, 0), subpath start (0, 0). After `M p`: current = start = p. After `L`, `Q`, `C`: current = the last point. After `Z`: current = the subpath start.
- **Zigzag** of an integer delta `v`: `u = v >= 0 ? 2v : -2v - 1`. Inverse: `v = (u & 1) ? -((u + 1) >> 1) : (u >> 1)`. Written without bit shifts on negatives so PHP, Python and JS agree (JS `>>` is 32-bit; keep `u < 2^32`; throw if a delta needs more).
- **Planes:** if `u < 0xFFFF`: `lo.push(u & 0xFF)`, `hi.push(u >> 8)`. Otherwise `lo.push(0xFF)`, `hi.push(0xFF)`, `esc.push(u)` (0xFFFF itself escapes). The decoder reads `lo[i] | hi[i] << 8`; the value `0xFFFF` means «take the next escape».
- **Quantisation** of a point: `X = floor(V * N + 0.5)` where `V = a*x + c*y + e` (and `Y` with `b, d, f`) in IEEE doubles. **Never** `round()` (Python rounds half to even, PHP half away from zero). `floor` is `math.floor` in Python, `(int) floor(...)` in PHP, `Math.floor` in JS. The integers are what is stored; no value is ever divided before storing.
- **Compression framing.** `blob = header(18) || raw_deflate(body)`. Server: `gzdeflate($body, 9)` (PHP; `tqp.py` `deflate()` is the same with zlib level 9, wbits -15). Device: `fflate.inflateSync(blob.subarray(18), { out: new Uint8Array(expected) })` where `expected = ncmds + 2*nvals + 4*nesc`, taken from the header. Before inflating, the decoder rejects `expected` above 4 MiB (a page body is about 0.5 MB at N = 32). After inflating it checks that the output length equals `expected` exactly. A longer or shorter stream throws `TqpDecodeError`.
- **Why deflate (developer, 26 Nov 2026):** on the iPhone 17 Pro simulator (Hermes, dev build) the same page-3 body (218,649 bytes, grid 1/64) took about 263 ms to decode with `lzma1` (258–266 ms over 10 runs) and about 23 ms with `fflate.inflateSync` (22.3–26.1 ms). LZMA is about 11 times slower and would stutter on page turns.
- **Determinism.** The BODY (and the 18-byte header) is deterministic by this spec. The deflate bytes are not part of any digest, because a zlib upgrade may change them. Digests are over `header || body` (the «container»).

## Part 0 — checks (0.2 to 0.4 are done or obsolete; record)

1. **Scope parity: done (26 Nov 2026), 0 differences.** The real `parseSvgPage` and `tqp.py page_pieces()` were run over all 604 Hafs pages plus page 050 of warsh, qalon, shubah and douri: 608 pages, 13,460 pieces each, equal multisets of `d`, final matrices equal within 1e-9. No Hafs path carries its own `transform` or an `ayah-mark` class. Re-run only if `parseSvgPage` or the source pin changes. The original brief follows for reference: The app's parser (`parseSvgPage` in `svg-page-model.ts`) is canonical: it is what the developer signed off. `tqp.py`'s `page_pieces()` now follows it (ancestor `<g class="ayah-mark">` inside `#ayah_markers`; root `<g transform>`). Write a throwaway script (scratchpad, not committed) that runs both over all 604 Hafs pages and one page of each other riwayah (local cache `apps/api/storage/app/private/sources/svg-mushaf/<commit>/mushafs/<folder>/kfqc/svg/NNN.svg`) and compares the **multiset** of `d` strings and each piece's final matrix (within 1e-9). Order does not matter for an even-odd fill; document order is TQP1's order. A difference: **stop and report**; the app's rule wins.
2. **Done, 26 Nov 2026 (result):** `lzma1` loads and decodes on Hermes, but takes about 263 ms a page against about 23 ms for `fflate.inflateSync`. LZMA is dropped (ADR 0090 amendment of 26 Nov). Nothing to do.
3. **Obsolete:** no `lzma1` under jest, no `transformIgnorePatterns` change, no `xz` on the API image or CI.
4. **Done:** `tqp.py` has the floor rounding, the app's scope, raw deflate, and the `body` and `ints` modes: the golden generators for A7 and B3. Its docstring still says «N = 16 for TQP1»; change that to 32 (a documentation line in the spike file).

## Part A — API

### A1. Migration

`apps/api/database/migrations/2026_11_24_100000_add_tqp_digest_to_svg_mushaf_pages_table.php`: add `tqp_sha256` `char(64)` NULL and `tqp_bytes` `unsignedInteger` NULL to `svg_mushaf_pages`; `down()` drops them. Update `SvgMushafPage` casts/fillable, `SvgMushafPlan` page row shape and the repository's `pages()` return shape (`tqp_sha256: string|null`, `tqp_bytes: int|null`) with PHPDoc, and `SvgMushafPackRepository`.

### A2. The encoder (new, `apps/api/app/Domains/Mushaf/Packs/Tqp/`)

- `TqpPageScope.php`: `pieces(string $svg): array` of `array{d: string, m: array{6: float}}` (`m` = a, b, c, d, e, f). Parse with `DOMDocument::loadXML($svg, LIBXML_NONET)` (no external entities), throw `TqpEncodeException` on bad XML. Follow the **Part 0.1 canonical rule** and `tqp.py`'s `page_pieces`:
  - `shift = [1,0,0,1,-vbX,-vbY]` from the viewBox; the viewBox must be `W=345`, `H=550` (else throw). Pages 1 and 2 have a non-zero origin: the shift bakes it in.
  - The matrix of a node is `mul(parentMatrix, parse_transform(node transform))`, **starting from `shift` and multiplying down the tree** (this order, not «chain first, shift last»: the doubles must match `tqp.py` bit for bit). `mul(p, q)` is `(a*A + c*B, b*A + d*B, a*C + c*D, b*C + d*D, a*E + c*F + e, b*E + d*F + f)` with `p = (a,b,c,d,e,f)`, `q = (A,B,C,D,E,F)`.
  - `parse_transform`: a list of `translate(x[,y])`, `scale(x[,y])`, `matrix(a,b,c,d,e,f)`, left to right with `mul`; anything else throws.
  - A path is drawn when it has a `d` and sits under `#content`, or under `#ayah_markers` and inside a `<g>` with class `ayah-mark`.
- `TqpPathParser.php`: `segments(string $d): array` of `[code, points[]]`, absolute, as `abs_segments` in `tqp.py`: commands `M m L l H h V v C c S s Q q T t Z z`; implicit repeated commands (after `m` the repeat is `l`/`L`); `S` and `T` reflect the previous control point only after `C/S` or `Q/T`; `Z` sets current to the subpath start. An arc (`A a`) throws (none exist in the pinned source; the import must fail loudly if one appears). Numbers: the regex of `tqp.py` (`NUM`), parsed with `(float)`.
- `TqpEncoder.php`: `container(string $svg, int $n = 32): string` returns `header || body` exactly as the format above. Quantise with `(int) floor($v * $n + 0.5)` where `$v = $a*$x + $c*$y + $e` (same operand order as `tqp.py`). Keep `ncmds`, `nvals`, `nesc` counters; assert each `u < 2**32`. Hold one page in memory at a time.
- `TqpPageBlob.php`: `build(string $svg): array{blob: string, container_sha256: string, container_bytes: int}` = `container()`, then `substr($container, 0, 18) . gzdeflate(substr($container, 18), 9)`; `gzdeflate` returning `false` throws `TqpEncodeException`. The blob's first 18 bytes are the container header.

### A3. Importer

`SvgMushafImporter` pass 2 (after A2): for each page also compute `container(raw svg)` and record `tqp_sha256 = hash('sha256', container)` and `tqp_bytes = strlen(container)` in the page row. **Keep** `writeGzip` and the `gz_*` columns for now (the report still prints them; remove in a later developer-approved cleanup). Any `TqpEncodeException` fails the import, writes nothing (same as an A1–A3 failure), and names the page.

### A4. Publisher

`SvgMushafPublisher`: the fingerprint's per-page digest becomes `page:tqp_sha256` (not `gz_sha256`), and the fingerprint JSON gains the constant `SvgMushafPackBuilder::FORMAT` (`'tqp1-deflate-n32'`). A page with `tqp_sha256 = null` throws `SvgMushafException('Run mushaf:import again: the page digests are from before TQP1.')`. Effect: a zlib upgrade never bumps a version; a change of N or of the format does.

### A5. Pack builder and schema

- `PackSchema`: add `public const int SVG_MUSHAF_VERSION = 2;` (leave `VERSION = 1`).
- `SvgMushafPackBuilder`:
  - `public const FORMAT = 'tqp1-deflate-n32';`
  - For each page: `$svg = $this->downloader->bytes($mushaf->folder, sprintf('svg/%03d.svg', $page['page']), true)` (offline; A1 re-checks size and blob SHA-1 every time), then `TqpPageBlob::build($svg)`. If `container_sha256 !== $page['tqp_sha256']` throw `PackBuildException('Page N: the encoded page changed since import. Run mushaf:import.')`. Insert the blob unchanged. Hold one page.
  - `meta`: `pack_schema_version` = `(string) PackSchema::SVG_MUSHAF_VERSION`; add `page_format` = `FORMAT`; the rest unchanged (`has_word_boxes`, `word_boxes_digest` as before).
  - `content_packs.schema_version` = `PackSchema::SVG_MUSHAF_VERSION`.
  - Drop the `svg/NNN.svg.gz` read (the file stays on disk, unused).
- `SvgMushafPackWriter::createSchema()`: `pages (page INTEGER PRIMARY KEY, tqp BLOB NOT NULL)` (renamed from `svgz`); `insertPage(int $page, string $tqp)`. Everything else unchanged.
- Serving is unchanged (`application/vnd.sqlite3`; the blobs are already compressed).

### A6. Docs and contract

No endpoint changes: skip `npm run generate`. Check that no OpenAPI text names «gzip pages». Add to `docs/runbooks/railway-release.md` the re-import note already written there (do not rewrite it).

### A7. Tests (Pest; put them in `tests/Unit/Mushaf/Tqp/` and `tests/Feature/Mushaf/`)

1. `TqpPathParserTest`: table-driven. Absolute and relative `M L H V C S Q T Z`, implicit `l` after `m`, `S`/`T` reflection with and without a previous curve, `Z` then relative `m`, scientific notation, numbers glued by a minus sign (`1-2`), an arc throws.
2. `TqpPageScopeTest` (synthetic SVGs): nested `translate`, `scale(1)`, `scale(sx,sy)`, `matrix` and a two-function list; a non-zero viewBox origin (the page-1/2 case) bakes the shift; an `ayah-mark` group under `#ayah_markers` is drawn, a path under `#ayah_markers` outside an `ayah-mark` group is not, a path with the class on itself only is not (app rule); a non-345×550 viewBox throws; a `rotate(` throws.
3. `TqpEncoderTest`: (a) the header fields; (b) **the golden**: for each fixture `tests/Fixtures/mushaf/tqp/<name>.svg`, `container()` equals `<name>.container.bin` byte for byte. The `.bin` files are generated **by `tqp.py body`**, not by PHP, and are checked in. (c) Rounding: with N = 32, a coordinate `0.015625` (scaled value exactly 0.5) quantises to `1` and `-0.015625` to `0` (`floor(v*N+0.5)`, half rounds toward +infinity); assert the integers the reference `tqp.py` gives. (d) An escape: a coordinate jump of 32,768 grid units or more (1,024 viewBox units at N = 32; a synthetic path may leave the 345 × 550 box, the encoder does not clip: use a 1,100-unit move, 35,200 steps) yields `nesc > 0`; `lo/hi` carry `0xFF 0xFF` at that position. (e) `u = 0xFFFF` exactly escapes.
4. `TqpPageBlobTest`: the blob starts with the 18-byte header; `gzinflate(substr($blob, 18))` equals the container body; level 9 is used (the output is not larger than `gzdeflate($body, 6)`); the blob is neither gzip (`1f 8b`) nor zlib-wrapped.
5. `SvgMushafImportTest` (extend): `tqp_sha256` and `tqp_bytes` are written; a page with an arc fails the import and writes nothing.
6. `SvgMushafPackTest` (extend; fixtures from `tests/Support/SvgMushafPackFixtures.php`, now synthetic SVGs): `meta.pack_schema_version = '2'`, `meta.page_format = 'tqp1-deflate-n32'`, `content_packs.schema_version = 2`, `pages` has column `tqp` (not `svgz`), each blob starts `TQP1`, and the header plus `gzinflate(substr($blob, 18))` equals the container whose sha is `tqp_sha256`; a changed raw file fails A1 before encoding; `WordBoxBuilder` input is the raw SVG (assert via the existing word-box digest test: **the digest does not change**).
7. `SvgMushafPublishCommandTest` (extend): an unchanged re-publish does not bump; a null `tqp_sha256` refuses; a changed `FORMAT` bumps.
8. Parity (skipped when the cache is missing): `tests/Feature/Mushaf/TqpRealPageParityTest.php` encodes pages 1, 2, 3, 50, 300, 604 of Hafs from the local cache, and compares `sha256(container)` with a `tqp.py body` run by Process (skipped if `python3` is missing). Nothing from the cache is checked in.

Run: `cd apps/api && composer qa`.

## Part B — device

### B1. Decoder (new, pure, no Skia import)

`apps/mobile/src/features/reader/mushaf-svg/tqp-decoder.ts`:

- `decodeTqp(blob: Uint8Array): { n: number; cmds: Uint8Array; deltas: Int32Array }` — check the magic, `n === 32` (reject others), the counts against each other; reject `expected` above 4 MiB and a blob above 1 MiB; `inflateSync(blob.subarray(18), { out: new Uint8Array(expected) })` from `fflate`; check the output length equals `expected` exactly. Write the test first and see what `fflate` does with a too-small `out`: if it does not throw on an over-long stream, inflate without `out` (after the size caps) and compare lengths. Rebuild the deltas through the zigzag inverse and the escape rule. Throw `TqpDecodeError` (new class) for every failure; never return partial data.
- `tqpToModel(decoded): SvgPageModel` — **one** piece. The decision between two builders is left to the timed check (C2): write both behind the same signature and keep the faster:
  - **(i) SVG string:** one relative path string from the deltas (`m`, `l`, `q`, `c`, `z`, integers, space-separated); `piece.d` = that string and `piece.matrix = [1/32, 0, 0, 1/32, 0, 0]`. `page-picture.ts` is unchanged: it calls `Skia.Path.MakeFromSVGString(d)` once and `addPath` with the scale matrix. Build the string with an array and a single `join('')` (not `+=` in a loop).
  - **(ii) direct builder calls:** `rMoveTo`, `rLineTo`, `rQuadTo`, `rCubicTo`, `close` on `Skia.PathBuilder.Make()` (about 16,000 calls a page), then `addPath(path, scale matrix)`. This needs a new field on the model (a prebuilt `SkPath`) or a `buildPagePath` branch; keep `SvgPageModel` pure by putting the builder in `page-picture.ts`.
- `viewBox` stays `{ width: 345, height: 550 }` and `origin` `{ x: 0, y: 0 }` (the origin is baked in).

### B2. Loader and reader

- `page-source.ts`: `inflatePage` is removed (the decoder's `inflateSync` replaces its `gunzipSync`). `loadPageModel` calls `reader.getPage(page)` then `tqpToModel(decodeTqp(blob))`. Keep `PageModelCache` and `PAGE_MODEL_CACHE`. Keep `MushafPageMissingError`.
- `SvgMushafPackReader.ts`: `PACK_SCHEMA_VERSION = '2'`, `verify()` also requires `meta.page_format === 'tqp1-deflate-n32'`, and `getPage` reads `SELECT tqp FROM pages WHERE page = ?`. An older pack (schema `'1'`) fails `verify`: the existing code path removes the file and keeps the old record (`failed/import`), so a client never opens a gzip pack with the new decoder.
- `svg-page-model.ts`: `parseSvgPage`, `parseTransform`, the tag parser and `SvgPageParseError` usage in the parser are now dead: delete them and their tests. **Keep** `Matrix`, `IDENTITY`, `multiply`, `SvgPageModel`, `PagePathPiece`, and `SvgPageParseError` (still thrown by `page-picture.ts`). Grep for every importer first (`MushafSvgPage.tsx`, `region-geometry.ts`, tests) and fix them; if anything outside the list above uses `model.origin`, report it.

### B3. Tests (Jest, colocated; no artwork)

1. `tqp-decoder.test.ts`: golden. Load `src/features/reader/mushaf-svg/__fixtures__/tqp/<name>.container.bin` and `<name>.ints.json` (both produced by `tqp.py`, checked in; the **same synthetic SVGs** as A7). Build the blob in the test with `deflateSync(body, { level: 9 })` from `fflate`, and assert `decodeTqp` returns exactly the integers in `ints.json` (absolute points rebuilt by a test helper that mirrors `tqp.py`'s `parse_container`). One fixture must contain an escaped delta and one a `Z` followed by a relative move. Cross-language: also check in `<name>.blob.bin` produced by the PHP `TqpPageBlob` (generate once with `php artisan tinker`) and assert the TS decoder reads it to the same integers.
2. Error cases: bad magic, `n !== 32`, truncated stream, output length mismatch (shorter and longer), `expected` above 4 MiB, `nvals` too large for the blob. Each throws `TqpDecodeError`.
3. `tqpToModel`: one piece; the matrix is exactly `[1/32,0,0,1/32,0,0]`; the string for a tiny page equals the expected relative path text (builder (i)).
4. `SvgMushafPackReader.test.ts`: update the fixture (`pages.tqp`, `meta.page_format`, schema `'2'`); a schema-1 pack fails `verify`.
5. `page-source.test.ts`, `page-picture.test.ts`, `MushafSvgPage.test.tsx`: updated to the new loader. `device-sync.ts` tests: a fixture pack with `pack_schema_version = '1'` is refused and removed, the old record kept.

Run: `cd apps/mobile && npm run lint && npx tsc --noEmit && npm test -- --maxWorkers=2 && npx expo-doctor` (never two jest runs at once; kill orphans first).

## Part C — measure and gate

1. **Real sizes.** Pages only, measured by the coordinator on 26 Nov 2026 with `tqp.py` at 1/32 and raw deflate 9, all 604 pages of each riwayah, exact round trip on every page, no arcs or unsupported transforms in any riwayah: Hafs 38.19 MB (per-page gzip today 94.98), Warsh 41.90 (106.56), Qalun 43.55 (101.41), Shu'bah 39.83 (94.87), al-Duri 38.65 (91.86). Re-measure with the **PHP encoder**: on this Mac, one riwayah at a time (`nice`), run `php -d memory_limit=-1 artisan mushaf:import {key}` then `mushaf:publish {key} --without-word-boxes` against a **local** database, and record `content_packs.size_bytes` and the sums of the compressed blobs, the `regions` rows and the `word_boxes` rows (query the stored `.sqlite`). The PHP page sums must equal the Python numbers within 0.5% (same container, same level). If a Hafs pack is above 40 MB, stop and report.
   - **Result, 26 Nov 2026 (orchestrator, local database, PHP encoder).** `content_packs.size_bytes` (schema 2): Hafs 45,756,416 (pages 38,412,394 + regions and 77,433 word boxes; was 102,436,864 at schema 1), Warsh 43,753,472, Qalun 45,416,448, Shu'bah 41,713,664, al-Duri 40,488,960. PHP page sums are 0.57% above `tqp.py` (same containers; `gzdeflate` cannot set zlib's memLevel), accepted. Hafs word boxes rebuilt from the raw SVG: digest `8944a6b3…` unchanged, status approved, `word-boxes-hafs.json` unchanged. Origins: page 1 of every riwayah and page 2 of Hafs are non-zero; stored in `pages.origin_x/origin_y`.
2. **Timed decode on the booted iPhone 17 Pro simulator** (never create a simulator; no Android emulator; shut the simulator down when finished). Repeat step 1's 20-page animated scroll over Hafs pages 3, 50, 300 with **decode in the loop** (inflate, build path, record picture), for builders (i) and (ii). Gate: **60 fps with the longest frame under 24 ms** (the step 1 bar). Every page decode runs in the idle loader, never in a scroll frame. Record per page: inflate ms (about 23 ms measured on a 1/64 body), unpack and build ms, first picture ms. The baseline is step 1's 62 ms gunzip plus parse. If the gate fails, report; do not change format or grid.
3. **A4 re-sign-off sheet.** The artwork changed (grid 1/32), so the developer's A4 check no longer covers it. Produce a throwaway HTML sheet (scratchpad; `tqp.py svg 32 in out` for the decoded page) with side-by-side raw vs TQP1 crops at 1,290 px, **2,580 px** (a phone at 3× density with step 13's 2× page zoom) and **4,200 px** (600 pt × density 3.5 × 2, the densest Android tablet) for Hafs pages 1, 2, 3, 50, 300, 604, one page of each other riwayah, and the five pages with the smallest contours (`tqp_degen.py`). Hand it over as the review link. **A4 is a developer sign-off: do not mark it done.**
4. **Word-box alignment.** Render the recited-word pill over TQP1 pages 3 and 300 in the simulator and compare with the pill over the old gzip page (screenshot pair). The boxes are unchanged and live in raw page units; a visible drift fails.
5. Rerun the contour-area scan (`tqp_degen.py`) at 1/32 over all 604 pages of each riwayah (not only Hafs). Record the worst area change and the count of contours that collapse to a point. Bar (set at 1/16 on Hafs, so 1/32 must be at least as good): no contour with area above 0.05 unit² changes by more than 8.5%; collapsed contours all have reference area at or below 0.0003 unit².
   - **Result, 26 Nov 2026 (orchestrator).** Hafs: worst 4.5%, 0 collapsed. al-Duri: worst 8.0%, 98 collapsed. Shu'bah: worst 8.5% (at the bar), 7,292 collapsed. Warsh: worst 9.6% (p361 #148), 10 collapsed. Qalun: worst 31.6% (p009 #633), 13,995 collapsed. Every collapsed contour is source debris: reference area at most 0.000187 unit² and extent at most 0.028 unit (about 0.2 px at 2,580 px), inside the 0.0003 bar. The two shapes over 8.5% were rendered in Chrome at 2,580 px (reference, 1/32 and 1/64 side by side, 5× crop): Warsh p361 #148 is a 3 px speck and Qalun p009 #633 is a hair-thin sliver inside a letter. Both look identical in all three. The area bar overstates slivers and specks, so 1/32 stays for every riwayah; the crops go on the A4 sheet for the developer.
6. `npx expo-doctor` and `node .github/scripts/npm-audit.mjs` must show nothing new (no dependency changed).

## Release (not part of this step; for the reader of the report)

- **This step adds no native change and no package**, so by itself it is OTA-able (`apps/mobile/CLAUDE.md` «Releasing»). What is true today: the SVG viewer needs `@shopify/react-native-skia`, which came after the 1.0.3 store build (`docs/runbooks/railway-release.md`), and no released build is known to carry it. So the first release that shows the printed pages is a **store build**, and this step rides in it. If `npx eas-cli fingerprint:compare` shows the latest store build already holds Skia, the page-format change alone is an EAS Update. Run the comparison before publishing; do not assume.
- Nothing shipped reads `svg_mushafs` packs (developer, 26 Nov 2026), so no old client can meet a schema-2 pack. API first is safe. Re-run `mushaf:import` per riwayah on the server (a new digest), then `mushaf:publish`; the runbook says so.

## Report back

Files changed; Part 0.1 result (scope parity); the Part C size table; the timing table for builders (i) and (ii) and the one kept (inflate, unpack, picture); the A4 sheet link; anything in the spec or code that disagreed with this brief. Also say whether any other riwayah's pages contain an arc, a transform other than translate/scale/matrix, or a delta that needs an escape (the encoder throws on the first two).
