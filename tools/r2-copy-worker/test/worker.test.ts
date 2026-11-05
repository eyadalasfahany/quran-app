import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { checkSourceUrl, timingSafeEqual, validateCopyRequest, type Env } from "../src/index";
import {
  bytesResponse,
  fakeBucket,
  installFixedLengthStream,
  mockSourceFetch,
  sha256Hex,
} from "./helpers";

const TOKEN = "test-token-not-real";
const SOURCE = "https://cdn.mp3quran.net/audio/islam-sobhi/r1/059.mp3";
const DATA = new TextEncoder().encode("FIXTURE audio bytes 1");
const BYTES = DATA.byteLength;

let SHA = "";
let KEY = "";

beforeEach(async () => {
  installFixedLengthStream();
  SHA = await sha256Hex(DATA);
  KEY = `audio/mp3quran/253/059-${SHA.slice(0, 16)}.mp3`;
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function copyRequest(body: unknown, headers: Record<string, string> = { authorization: `Bearer ${TOKEN}` }) {
  return new Request("https://worker.example/copy", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return { source_url: SOURCE, key: KEY, bytes: BYTES, sha256: SHA, ...overrides };
}

function makeEnv(seed: Record<string, Uint8Array> = {}) {
  const bucket = fakeBucket(seed);
  const env = { AUDIO: bucket.binding, COPY_TOKEN: TOKEN } as Env;
  return { env, bucket };
}

async function call(request: Request, env: Env): Promise<Response> {
  return worker.fetch(request, env);
}

describe("routing", () => {
  it("returns 404 for other methods and paths, before any auth check", async () => {
    const { env } = makeEnv();
    expect((await call(new Request("https://w.example/copy"), env)).status).toBe(404);
    expect((await call(new Request("https://w.example/other", { method: "POST" }), env)).status).toBe(404);
    expect((await call(new Request("https://w.example/", { method: "GET" }), env)).status).toBe(404);
  });
});

describe("auth", () => {
  it("returns 401 when the Authorization header is missing", async () => {
    const { env, bucket } = makeEnv();
    const res = await call(copyRequest(validBody(), {}), env);
    expect(res.status).toBe(401);
    expect(bucket.head).not.toHaveBeenCalled();
  });

  it("returns 401 for a wrong token", async () => {
    const { env } = makeEnv();
    const res = await call(copyRequest(validBody(), { authorization: "Bearer wrong" }), env);
    expect(res.status).toBe(401);
  });

  it("returns 401 for a token with the right value but without the Bearer scheme", async () => {
    const { env } = makeEnv();
    const res = await call(copyRequest(validBody(), { authorization: TOKEN }), env);
    expect(res.status).toBe(401);
  });

  it("fails closed when COPY_TOKEN is unset", async () => {
    const { bucket } = makeEnv();
    const env = { AUDIO: bucket.binding, COPY_TOKEN: "" } as Env;
    const res = await call(copyRequest(validBody(), { authorization: "Bearer " }), env);
    expect(res.status).toBe(401);
  });

  it("compares tokens in constant time without short-circuiting on length", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
    expect(timingSafeEqual("", "a")).toBe(false);
  });
});

describe("validation", () => {
  it.each([
    ["other host", { source_url: "https://example.com/audio/x/059.mp3" }],
    ["http scheme", { source_url: "http://cdn.mp3quran.net/audio/islam-sobhi/r1/059.mp3" }],
    ["path outside /audio/", { source_url: "https://cdn.mp3quran.net/other/059.mp3" }],
    ["not .mp3", { source_url: "https://cdn.mp3quran.net/audio/islam-sobhi/r1/059.m4a" }],
    ["port", { source_url: "https://cdn.mp3quran.net:8443/audio/islam-sobhi/r1/059.mp3" }],
    ["dot segments", { source_url: "https://cdn.mp3quran.net/audio/../secret/059.mp3" }],
    ["not a URL", { source_url: "not a url" }],
    ["bad key prefix", { key: `audio/other/253/059-${SHA.slice(0, 16)}.mp3` }],
    ["bad surah width", { key: `audio/mp3quran/253/59-${SHA.slice(0, 16)}.mp3` }],
    ["key hash mismatch", { key: `audio/mp3quran/253/059-${"0".repeat(16)}.mp3` }],
    ["uppercase sha", { sha256: SHA.toUpperCase() }],
    ["short sha", { sha256: SHA.slice(0, 32) }],
    ["zero bytes", { bytes: 0 }],
    ["fractional bytes", { bytes: 1.5 }],
    ["string bytes", { bytes: "8" }],
  ])("returns 400 for %s", async (_name, overrides) => {
    const { env, bucket } = makeEnv();
    const res = await call(copyRequest(validBody(overrides)), env);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error.length).toBeGreaterThan(0);
    expect(bucket.head).not.toHaveBeenCalled();
  });

  it("returns 400 for a body that is not JSON", async () => {
    const { env } = makeEnv();
    expect((await call(copyRequest("{not json"), env)).status).toBe(400);
  });

  it("returns 400 for a JSON array or null", async () => {
    const { env } = makeEnv();
    expect((await call(copyRequest([]), env)).status).toBe(400);
    expect((await call(copyRequest("null"), env)).status).toBe(400);
  });

  it("accepts a well-formed request", () => {
    expect(validateCopyRequest(validBody()).ok).toBe(true);
    expect(checkSourceUrl(SOURCE)).toBeNull();
  });
});

describe("source URL", () => {
  it("refuses a redirect and never follows it", async () => {
    const { env, bucket } = makeEnv();
    const fetchMock = mockSourceFetch(
      () => new Response(null, { status: 302, headers: { location: "https://evil.example/x.mp3" } }),
    );
    const res = await call(copyRequest(validBody()), env);
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toMatch(/redirect/);
    expect(fetchMock).toHaveBeenCalledWith(SOURCE, { redirect: "manual" });
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("refuses a 3xx status even without a Location header", async () => {
    const { env, bucket } = makeEnv();
    mockSourceFetch(() => new Response(null, { status: 301 }));
    expect((await call(copyRequest(validBody()), env)).status).toBe(502);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("returns 502 when the source is not 200", async () => {
    const { env, bucket } = makeEnv();
    mockSourceFetch(() => new Response("nope", { status: 404 }));
    expect((await call(copyRequest(validBody()), env)).status).toBe(502);
    expect(bucket.put).not.toHaveBeenCalled();
  });
});

describe("idempotency", () => {
  it("returns 200 exists without fetching when the object has the same size", async () => {
    const { env, bucket } = makeEnv({ [KEY]: DATA });
    const fetchMock = mockSourceFetch(() => bytesResponse(DATA));
    const res = await call(copyRequest(validBody()), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "exists", key: KEY, size: BYTES });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("returns 409 when the object exists with a different size", async () => {
    const { env, bucket } = makeEnv({ [KEY]: new Uint8Array(BYTES + 1) });
    const fetchMock = mockSourceFetch(() => bytesResponse(DATA));
    const res = await call(copyRequest(validBody()), env);
    expect(res.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(bucket.put).not.toHaveBeenCalled();
  });
});

describe("copy", () => {
  it("returns 502 when the source Content-Length differs from bytes", async () => {
    const { env, bucket } = makeEnv();
    mockSourceFetch(() => bytesResponse(new Uint8Array(BYTES + 3)));
    const res = await call(copyRequest(validBody()), env);
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toMatch(/Content-Length/);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("returns 502 when the source has no Content-Length", async () => {
    const { env, bucket } = makeEnv();
    mockSourceFetch(() => new Response(DATA, { status: 200 }));
    expect((await call(copyRequest(validBody()), env)).status).toBe(502);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("streams the source into put with the exact key, sha256 and headers", async () => {
    const { env, bucket } = makeEnv();
    const fetchMock = mockSourceFetch(() => bytesResponse(DATA));
    const res = await call(copyRequest(validBody()), env);

    expect(res.status).toBe(201);
    const json = (await res.json()) as { status: string; key: string; size: number; etag: string };
    expect(json).toEqual({ status: "copied", key: KEY, size: BYTES, etag: expect.any(String) });
    expect(fetchMock).toHaveBeenCalledWith(SOURCE, { redirect: "manual" });

    expect(bucket.put).toHaveBeenCalledTimes(1);
    const [putKey, putBody, putOptions] = bucket.put.mock.calls[0];
    expect(putKey).toBe(KEY);
    expect(putBody).toBeInstanceOf(ReadableStream);
    expect(putOptions).toEqual({
      sha256: SHA,
      httpMetadata: {
        contentType: "audio/mpeg",
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: { source_url: SOURCE },
    });

    const stored = bucket.store.get(KEY);
    expect(stored?.body).toEqual(DATA);
    expect(stored?.sha256).toBe(SHA);
  });

  it("returns 422 when R2 rejects the sha256 (integrity failure)", async () => {
    const { env, bucket } = makeEnv();
    // Source bytes differ from the declared sha256 while the length still matches.
    const other = new Uint8Array(BYTES).fill(0x41);
    mockSourceFetch(() => bytesResponse(other));
    const res = await call(copyRequest(validBody()), env);
    expect(res.status).toBe(422);
    expect(bucket.store.has(KEY)).toBe(false);
  });

  it("returns 502 for an upload failure that is not an integrity failure", async () => {
    const { env, bucket } = makeEnv();
    bucket.put.mockRejectedValueOnce(new Error("R2 unavailable"));
    mockSourceFetch(() => bytesResponse(DATA));
    expect((await call(copyRequest(validBody()), env)).status).toBe(502);
  });

  it("never puts the token or the source response into the log", async () => {
    const { env } = makeEnv();
    mockSourceFetch(() => bytesResponse(DATA));
    const log = vi.mocked(console.log);
    await call(copyRequest(validBody()), env);
    const logged = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain(KEY);
    expect(logged).toContain("copied");
    expect(logged).not.toContain(TOKEN);
  });
});
