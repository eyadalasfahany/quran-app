# mp3quran-ingest

Local developer tool (ADR 0061, plan `docs/plans/recitation-timings.md`, step B4). It copies the surah files of an MP3Quran recording to Taybah's Cloudflare R2 bucket, measures and hashes them, and writes `apps/api/resources/mp3quran/manifest.json`. The API imports that manifest at web start; production never calls MP3Quran and never holds R2 keys.

## Where it runs

- **Only on the developer's machine.** Never on Railway, never in CI (ADR 0061 §7). Credentials are read from the local environment or a local `.env` file.
- The tool is separate from `tools/recitation-align` (the aligner) and has its own virtualenv.
- It needs `ffmpeg` on PATH for the duration measurement. Homebrew installs it in `/opt/homebrew/bin`.

## Setup

```bash
export PATH=/opt/homebrew/bin:$PATH
cd tools/mp3quran-ingest
uv sync
uv run pytest -q
```

## Safe by default: dry run unless `--upload`

`ingest` never writes to R2 unless you pass `--upload`. Without it the run is a dry run. It prints `MODE: dry run (no uploads)` first, builds no S3 client and makes no Worker call, even when `.env` holds full credentials. `--dry-run` is still accepted as a no-op, but it cannot be combined with `--upload`.

With `--upload` the first line is `MODE: UPLOAD via worker to bucket quran` or `MODE: UPLOAD via s3 to bucket quran`.

## Commands

```bash
# 1. Snapshot the catalogue (reciters in Arabic and English, riwayat, timing readings)
uv run mp3quran-ingest catalogue --out ../../apps/api/resources/mp3quran/catalogue.json

# 2. Dry run (the default): downloads, measures and hashes, uploads nothing, needs no credentials
uv run mp3quran-ingest ingest --moshaf 253 --surah 59 --manifest out/dry-manifest.json

# 3. Real run: add --upload. Reusing local files skips downloads;
#    their bytes are still checked against the source Content-Length.
uv run mp3quran-ingest ingest --moshaf 253 --source-dir ../recitation-align/out/audio/mp3quran-253 --upload
```

Options: `--surah N` (repeatable; default every surah in `surah_list`), `--source-dir`, `--work-dir`, `--manifest`, `--upload`, `--via worker|s3`, `--api-base`, `--env-file`.

- Without `--upload`, `--manifest` defaults to `out/dry-manifest.json`. With `--upload` it defaults to `apps/api/resources/mp3quran/manifest.json`, the committed path.
- `--via` only applies with `--upload`. It defaults to `worker`.

### Recommended sequence for Islam Sobhi (moshaf 253, 109 surahs)

1. Dry run all 109 from the local files, which are already downloaded and size-checked:
   `uv run mp3quran-ingest ingest --moshaf 253 --source-dir ../recitation-align/out/audio/mp3quran-253`
2. Inspect `out/dry-manifest.json` (counts, bytes, durations, keys).
3. Upload, with the same command plus `--upload`.

## Copy modes

- **`--via worker` (default with `--upload`).** The Cloudflare Worker in `tools/r2-copy-worker/` fetches each surah from the MP3Quran CDN and writes it to R2 itself, so the audio never crosses the home upload link. This tool still downloads or reuses the local file, because it needs the local bytes for the sha256, the duration and the alignment. It then posts `{source_url, key, bytes, sha256}` to the Worker and checks the result with an S3 `HEAD` (the size must match). The local file is never uploaded in this mode. Setup is in [`tools/r2-copy-worker/README.md`](../r2-copy-worker/README.md).
  - A Worker that answers 200 `exists` or 201 `copied` is a success. Any other status fails that surah with the Worker's reason. The run stops there, as in the s3 mode.
  - 502, other 5xx and timeouts are retried: three retries after the first attempt, with waits of 2, 4 and 8 seconds. 400, 401, 404, 409 and 422 are never retried.
- **`--via s3`.** Uploads the local file straight to R2 with boto3 (the direct path).

## What one surah does

1. HEAD the source file: Content-Length and ETag. Reject any byte count that differs.
2. Download (or reuse `--source-dir`) and verify the bytes against Content-Length. A short download stays as `.part`; the next run resumes it.
3. Measure the duration by decoding the whole file with ffmpeg (`out_time_us` after `-f null`).
4. sha256 of the file. The key is `audio/mp3quran/{moshaf_id}/{surah:03}-{sha256[:16]}.mp3`, so changed bytes get a new key.
5. Unless this is a dry run: copy (`--via worker` asks the Worker; `--via s3` uploads with `Cache-Control: public, max-age=31536000, immutable` and `Content-Type: audio/mpeg`), then HEAD the object and compare its size.
6. Record the file in the manifest.

A run is resumable. Downloads continue from `NNN.mp3.part`; a surah whose key already exists in R2 with the same size is not copied again. The manifest is rewritten atomically after each surah, so an interruption keeps every finished surah.

## Environment

| Variable | Required | Default |
| :--- | :--- | :--- |
| `R2_ACCOUNT_ID` | for `--upload` (both modes) | none |
| `R2_ACCESS_KEY_ID` | for `--upload` (both modes) | none |
| `R2_SECRET_ACCESS_KEY` | for `--upload` (both modes) | none |
| `R2_BUCKET` | no | `quran` |
| `R2_PUBLIC_BASE` | no | `https://audio.taybah-app.com` |
| `R2_COPY_WORKER_URL` | for `--via worker` | none |
| `R2_COPY_TOKEN` | for `--via worker` | none |

Copy `.env.example` to `.env` in this folder and fill it in. `.env` is gitignored (root `.gitignore`). Real environment variables win over the file. The tool never prints or logs a secret value, and error messages name only the missing variables. `R2_COPY_WORKER_URL` must be `https`; plain `http` is accepted only for `127.0.0.1` and `localhost` (used by the tests).

## Manifest

`schema: 1`, `source: "mp3quran"`, `generated_at`, `public_base`, and `moshafs[]`. Each moshaf has its ids and names (Arabic and English, as UTF-8), `riwayah`, `moshaf_name`, `server`, `surah_list` (as integers) and `files[]`. Each file has `surah`, `key`, `url`, `bytes`, `sha256`, `duration_ms`, `source_url` and `source_etag`. The output is sorted and deterministic. `generated_at` changes only when the content does, so a no-op rerun leaves the file byte-identical.

## Tests

`uv run pytest -q` runs offline: a local fake of the MP3Quran API and CDN, a local fake of the copy Worker (`tests/fake_worker.py`, which writes into a moto S3 mock), and moto for R2. The tests also fence off `.env` and the R2 variables in the shell. Dev-only dependencies are `pytest` and `moto[s3]` (both released within 12 months, checked 4 Nov 2026). `boto3` is the one runtime dependency. `httpx` was not used (its last release fails the 12-month rule).

## Scope and costs

- Hafs recordings only (`rewaya_id` 1); other riwayat are refused (ADR 0061 §10).
- Uploads cost R2 requests and storage. About 1.2 GB and about $0.02 a month per reciter. See ADR 0061 §12 and set a billing alert before the first batch.
