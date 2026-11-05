// Server-side copy of MP3Quran audio into R2 (ADR 0061, plan B4).
// One endpoint: POST /copy. The developer's machine sends a small JSON body; the bytes
// travel MP3Quran CDN -> Cloudflare -> R2, so the home connection carries no audio.

export interface Env {
  AUDIO: R2Bucket;
  COPY_TOKEN: string;
}

interface CopyRequest {
  source_url: string;
  key: string;
  bytes: number;
  sha256: string;
}

const SOURCE_HOST = "cdn.mp3quran.net";
const SOURCE_PREFIX = "/audio/";
const KEY_PATTERN = /^audio\/mp3quran\/\d+\/\d{3}-[0-9a-f]{16}\.mp3$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CONTENT_TYPE = "audio/mpeg";
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const fail = (status: number, reason: string): Response => json({ error: reason }, status);

/** Constant-time string equality (length difference is folded into the accumulator). */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  const len = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < len; i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

function isAuthorised(request: Request, env: Env): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = env.COPY_TOKEN;
  if (typeof expected !== "string" || expected.length === 0) {
    return false; // fail closed when the secret is missing
  }
  return timingSafeEqual(header, `Bearer ${expected}`);
}

/** Returns a reason string when the source URL is not an allowed MP3Quran audio URL. */
export function checkSourceUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return "source_url must be a string";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "source_url is not a URL";
  }
  if (url.protocol !== "https:") return "source_url must use https";
  if (url.hostname !== SOURCE_HOST) return "source_url host is not allowed";
  if (url.port !== "" || url.username !== "" || url.password !== "") {
    return "source_url must not carry a port or credentials";
  }
  if (!url.pathname.startsWith(SOURCE_PREFIX)) return "source_url path must start with /audio/";
  if (!url.pathname.endsWith(".mp3")) return "source_url must end with .mp3";
  if (url.pathname.includes("..")) return "source_url path must not contain ..";
  return null;
}

/** Returns a reason string when the body is not a valid copy request. */
export function validateCopyRequest(body: unknown): { ok: true; value: CopyRequest } | { ok: false; reason: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, reason: "body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;

  const sourceProblem = checkSourceUrl(b.source_url);
  if (sourceProblem) return { ok: false, reason: sourceProblem };

  const { sha256, bytes, key } = b;
  if (typeof sha256 !== "string" || !SHA256_PATTERN.test(sha256)) {
    return { ok: false, reason: "sha256 must be 64 lowercase hex characters" };
  }
  if (typeof bytes !== "number" || !Number.isSafeInteger(bytes) || bytes <= 0) {
    return { ok: false, reason: "bytes must be a positive integer" };
  }
  if (typeof key !== "string" || !KEY_PATTERN.test(key)) {
    return { ok: false, reason: "key must match audio/mp3quran/{id}/{surah}-{sha256[:16]}.mp3" };
  }
  const hashPart = key.slice(key.lastIndexOf("-") + 1, key.lastIndexOf("-") + 17);
  if (hashPart !== sha256.slice(0, 16)) {
    return { ok: false, reason: "key hash does not match sha256" };
  }
  return {
    ok: true,
    value: { source_url: b.source_url as string, key, bytes, sha256 },
  };
}

async function handleCopy(request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "body must be valid JSON");
  }
  const parsed = validateCopyRequest(body);
  if (!parsed.ok) return fail(400, parsed.reason);
  const { source_url, key, bytes, sha256 } = parsed.value;

  // Idempotent: an object already at this key with the same size is success without a fetch.
  const existing = await env.AUDIO.head(key);
  if (existing) {
    if (existing.size === bytes) {
      console.log(JSON.stringify({ key, status: "exists" }));
      return json({ status: "exists", key, size: existing.size }, 200);
    }
    console.log(JSON.stringify({ key, status: "conflict" }));
    return fail(409, "an object with this key exists with a different size");
  }

  // Manual redirects: a redirect could leave the allowed host, so it is refused outright.
  const source = await fetch(source_url, { redirect: "manual" });
  if (source.status >= 300 && source.status < 400) {
    console.log(JSON.stringify({ key, status: "redirect_refused" }));
    return fail(502, "source responded with a redirect, which is refused");
  }
  if (source.status !== 200) {
    console.log(JSON.stringify({ key, status: "source_error" }));
    return fail(502, `source responded with status ${source.status}`);
  }
  const length = source.headers.get("content-length");
  if (length === null || Number(length) !== bytes) {
    console.log(JSON.stringify({ key, status: "size_mismatch" }));
    return fail(502, "source Content-Length does not match bytes");
  }
  if (source.body === null) {
    return fail(502, "source returned no body");
  }

  // FixedLengthStream gives R2 the exact length, and it errors if the stream is longer or shorter.
  const body_ = source.body.pipeThrough(new FixedLengthStream(bytes));
  try {
    const obj = await env.AUDIO.put(key, body_, {
      sha256,
      httpMetadata: { contentType: CONTENT_TYPE, cacheControl: CACHE_CONTROL },
      customMetadata: { source_url },
    });
    if (!obj) {
      console.log(JSON.stringify({ key, status: "upload_failed" }));
      return fail(502, "upload did not return an object");
    }
    console.log(JSON.stringify({ key, status: "copied", size: obj.size }));
    return json({ status: "copied", key, size: obj.size, etag: obj.etag }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/checksum|sha-?256|digest/i.test(message)) {
      console.log(JSON.stringify({ key, status: "integrity_failed" }));
      return fail(422, "sha256 does not match the uploaded bytes");
    }
    console.log(JSON.stringify({ key, status: "upload_failed" }));
    return fail(502, "upload to R2 failed");
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/copy") {
      return fail(404, "not found");
    }
    if (!isAuthorised(request, env)) {
      return fail(401, "unauthorised");
    }
    return handleCopy(request, env);
  },
};
