# taybah-r2-copy

A small Cloudflare Worker that copies MP3Quran surah files into the Taybah R2 bucket (`quran`) on the server side (ADR 0061, plan `docs/plans/recitation-timings.md` step B4).

**Why:** the developer's home connection is slow. The Worker fetches each file from `cdn.mp3quran.net` and writes it to R2 itself, so the bytes never pass through the home upload link. Only a small JSON request goes from the developer's machine.

This folder is a standalone npm project. It is not part of the root npm workspaces. The ingest tool in `tools/mp3quran-ingest/` calls the Worker.

## Endpoint

`POST /copy` with `Authorization: Bearer <COPY_TOKEN>` and a JSON body:

```json
{
  "source_url": "https://cdn.mp3quran.net/audio/islam-sobhi/r1/059.mp3",
  "key": "audio/mp3quran/253/059-0123456789abcdef.mp3",
  "bytes": 8680138,
  "sha256": "<64 lowercase hex characters>"
}
```

| Status | Meaning |
| :--- | :--- |
| 201 | copied: `{status:"copied", key, size, etag}` |
| 200 | already there with the same size, nothing fetched: `{status:"exists", key, size}` |
| 400 | the request is invalid (host, path, key, hash, sha256 or bytes), with a short reason |
| 401 | missing or wrong token |
| 404 | any other method or path |
| 409 | an object exists at the key with a different size |
| 422 | R2 rejected the sha256 (the bytes do not match the declared hash) |
| 502 | the source failed: a redirect, a non-200 status, or a Content-Length that differs from `bytes`; or the upload failed |

The key must be `audio/mp3quran/{moshaf_id}/{surah:03}-{sha256[:16]}.mp3`, and its 16-hex part must equal the first 16 characters of `sha256`.

## One-time setup (the developer runs this)

```bash
cd tools/r2-copy-worker
npm install
npx wrangler login
npx wrangler secret put COPY_TOKEN     # paste a long random token; it is not saved in any file
npx wrangler deploy                    # prints the https://taybah-r2-copy.<subdomain>.workers.dev URL
```

Then add two lines to `tools/mp3quran-ingest/.env` (git-ignored):

```
R2_COPY_WORKER_URL=https://taybah-r2-copy.<subdomain>.workers.dev
R2_COPY_TOKEN=<the same token>
```

Example request:

```bash
curl -sS -X POST "$R2_COPY_WORKER_URL/copy" \
  -H "Authorization: Bearer $R2_COPY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source_url":"https://cdn.mp3quran.net/audio/islam-sobhi/r1/059.mp3","key":"audio/mp3quran/253/059-0123456789abcdef.mp3","bytes":8680138,"sha256":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}'
```

The sample hash above is a placeholder; a real request uses the file's own sha256.

## Security notes

- **Host:** only `https://cdn.mp3quran.net/audio/...` ending in `.mp3`. Other hosts are refused.
- **Redirects:** fetched with `redirect: "manual"`; any 3xx is refused, so the Worker never follows a redirect to another host.
- **Keys:** only `audio/mp3quran/` keys with a content hash in the name. The Worker cannot overwrite a different file under an existing key (409).
- **Integrity:** R2 checks the sha256 on write and refuses a mismatch (422). The stream length is enforced with `FixedLengthStream`.
- **Token:** required on every copy. The Worker fails closed when `COPY_TOKEN` is unset. The token is compared in constant time and is never logged. Logs hold the key and status only.
- **Clean-up:** when ingestion is finished, delete the Worker with `npx wrangler delete` if you do not need it. The R2 objects it wrote stay in the bucket.

## Commands

```bash
npm test          # vitest: auth, validation, redirect, size, idempotency, put and integrity cases
npm run typecheck # tsc --noEmit
npm run deploy    # wrangler deploy (needs wrangler login)
```
