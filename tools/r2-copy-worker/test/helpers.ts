import { vi } from "vitest";

// Node has no FixedLengthStream (a Workers global). This stand-in enforces the same
// length rule: it errors if the stream is longer or shorter than the declared length.
class FakeFixedLengthStream extends TransformStream<Uint8Array, Uint8Array> {
  constructor(expected: number) {
    let seen = 0;
    super({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > expected) {
          controller.error(new Error("FixedLengthStream: more bytes than declared"));
          return;
        }
        controller.enqueue(chunk);
      },
      flush(controller) {
        if (seen !== expected) {
          controller.error(new Error("FixedLengthStream: fewer bytes than declared"));
        }
      },
    });
  }
}

export function installFixedLengthStream(): void {
  (globalThis as unknown as { FixedLengthStream: unknown }).FixedLengthStream = FakeFixedLengthStream;
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface StoredObject {
  body: Uint8Array;
  size: number;
  etag: string;
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
  sha256?: string;
}

/** In-memory R2 bucket: enforces the sha256 option like R2 does. */
export function fakeBucket(seed: Record<string, Uint8Array> = {}) {
  const store = new Map<string, StoredObject>();
  for (const [key, body] of Object.entries(seed)) {
    store.set(key, { body, size: body.byteLength, etag: "seed" });
  }

  const head = vi.fn(async (key: string) => {
    const obj = store.get(key);
    if (!obj) return null;
    return { key, size: obj.size, etag: obj.etag };
  });

  const put = vi.fn(async (key: string, value: ReadableStream<Uint8Array>, options: {
    sha256?: string;
    httpMetadata?: Record<string, string>;
    customMetadata?: Record<string, string>;
  }) => {
    const chunks: Uint8Array[] = [];
    const reader = value.getReader();
    for (;;) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      chunks.push(chunk);
    }
    const body = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
    let offset = 0;
    for (const c of chunks) {
      body.set(c, offset);
      offset += c.byteLength;
    }
    if (options.sha256 !== undefined) {
      const actual = await sha256Hex(body);
      if (actual !== options.sha256) {
        throw new Error("The SHA-256 checksum you specified did not match what we received");
      }
    }
    const obj: StoredObject = {
      body,
      size: body.byteLength,
      etag: `etag-${store.size + 1}`,
      httpMetadata: options.httpMetadata,
      customMetadata: options.customMetadata,
      sha256: options.sha256,
    };
    store.set(key, obj);
    return { key, size: obj.size, etag: obj.etag };
  });

  return {
    store,
    head,
    put,
    binding: { head, put } as unknown as R2Bucket,
  };
}

/** A fetch mock that answers the MP3Quran source with the given response factory. */
export function mockSourceFetch(respond: (url: string, init?: RequestInit) => Response) {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return respond(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function bytesResponse(data: Uint8Array, headers: Record<string, string> = {}): Response {
  return new Response(data, {
    status: 200,
    headers: { "content-length": String(data.byteLength), ...headers },
  });
}
