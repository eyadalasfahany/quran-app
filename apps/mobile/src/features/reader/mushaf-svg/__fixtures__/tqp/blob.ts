// FIXTURE — not artwork. Helpers for the TQP1 tests: golden containers come from tqp.py; blobs are built here.
import { deflateSync } from 'fflate';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The 18-byte uncompressed header (magic, N, ncmds, nvals, nesc). */
export function tqpHeader(fields: { n?: number; ncmds?: number; nvals?: number; nesc?: number; magic?: string } = {}): Uint8Array {
  const bytes = new Uint8Array(18);
  const view = new DataView(bytes.buffer);
  const magic = fields.magic ?? 'TQP1';
  for (let i = 0; i < 4; i += 1) {
    bytes[i] = magic.charCodeAt(i);
  }
  view.setUint16(4, fields.n ?? 32, true);
  view.setUint32(6, fields.ncmds ?? 0, true);
  view.setUint32(10, fields.nvals ?? 0, true);
  view.setUint32(14, fields.nesc ?? 0, true);
  return bytes;
}

/** A page blob: the header, then the raw deflate (level 9) of the body. */
export function tqpBlob(header: Uint8Array, body: Uint8Array): Uint8Array {
  const deflated = deflateSync(body, { level: 9 });
  const blob = new Uint8Array(header.length + deflated.length);
  blob.set(header, 0);
  blob.set(deflated, header.length);
  return blob;
}

/** The golden container (header || body) that tqp.py wrote for `name`, read from __fixtures__/tqp. */
export function readGoldenContainer(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(__dirname, `${name}.container.bin`)));
}

/** The blob of a golden container: its header and its body, deflated the way the server writes it. */
export function goldenBlob(name: string): Uint8Array {
  const container = readGoldenContainer(name);
  return tqpBlob(container.subarray(0, 18), container.subarray(18));
}

/** A valid empty page: no commands. */
export function emptyPageBlob(): Uint8Array {
  return tqpBlob(tqpHeader(), new Uint8Array(0));
}

/** A blob from command codes and relative grid deltas: zigzag, byte planes and the escape list, as the encoder writes them. */
export function tqpBlobFor(cmds: readonly number[], deltas: readonly number[]): Uint8Array {
  const lo: number[] = [];
  const hi: number[] = [];
  const esc: number[] = [];
  for (const v of deltas) {
    const u = v >= 0 ? 2 * v : -2 * v - 1;
    if (u >= 0xffff) {
      lo.push(0xff);
      hi.push(0xff);
      esc.push(u);
    } else {
      lo.push(u & 0xff);
      hi.push(u >> 8);
    }
  }
  const body = new Uint8Array(cmds.length + 2 * deltas.length + 4 * esc.length);
  body.set(cmds, 0);
  body.set(lo, cmds.length);
  body.set(hi, cmds.length + deltas.length);
  const view = new DataView(body.buffer);
  esc.forEach((u, i) => view.setUint32(cmds.length + 2 * deltas.length + 4 * i, u, true));
  return tqpBlob(tqpHeader({ ncmds: cmds.length, nvals: deltas.length, nesc: esc.length }), body);
}
