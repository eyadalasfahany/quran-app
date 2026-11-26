import { inflateSync } from 'fflate';

import type { SvgPageModel } from './svg-page-model';

/** TQP1 (ADR 0090, amendment 26 Nov 2026): a baked page on a 1/32 grid, raw deflate. Byte layout: docs/plans/madinah-svg-mushaf/spike/tqp.py. */
export const TQP_GRID = 32;
const MAGIC = 'TQP1';
const HEADER_BYTES = 18;
const MAX_BLOB_BYTES = 1 << 20;
const MAX_BODY_BYTES = 4 << 20;
const ESCAPE = 0xffff;

/** Points per command: M, L, Q, C, Z (codes 0 to 4). */
const POINTS = [1, 1, 2, 3, 0] as const;
/** SVG letters for the same codes, relative. */
const LETTERS = ['m', 'l', 'q', 'c', 'z'] as const;

export class TqpDecodeError extends Error {}

export type TqpDecoded = {
  n: number;
  /** Command codes, one byte each. */
  cmds: Uint8Array;
  /** Relative deltas in grid units, dx then dy per point, in command order. */
  deltas: Int32Array;
};

/** The zigzag inverse. Plain arithmetic: JS bit shifts are 32-bit and break from 2^31. */
function unzigzag(u: number): number {
  return u % 2 === 1 ? -(u + 1) / 2 : u / 2;
}

/** Decodes a page blob. Throws TqpDecodeError on anything malformed; never returns partial data. */
export function decodeTqp(blob: Uint8Array): TqpDecoded {
  if (blob.byteLength < HEADER_BYTES || blob.byteLength > MAX_BLOB_BYTES) {
    throw new TqpDecodeError('The page blob has the wrong size.');
  }
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  if (String.fromCharCode(blob[0]!, blob[1]!, blob[2]!, blob[3]!) !== MAGIC) {
    throw new TqpDecodeError('The page blob has no TQP1 magic.');
  }
  const n = view.getUint16(4, true);
  if (n !== TQP_GRID) {
    throw new TqpDecodeError(`The page grid is ${n}, not ${TQP_GRID}.`);
  }
  const ncmds = view.getUint32(6, true);
  const nvals = view.getUint32(10, true);
  const nesc = view.getUint32(14, true);
  const expected = ncmds + 2 * nvals + 4 * nesc;
  if (expected > MAX_BODY_BYTES) {
    throw new TqpDecodeError('The page body is too large.');
  }

  // One spare byte: fflate truncates silently to a fixed `out`, so an over-long stream must show up as a length mismatch.
  let body: Uint8Array;
  try {
    body = inflateSync(blob.subarray(HEADER_BYTES), { out: new Uint8Array(expected + 1) });
  } catch {
    throw new TqpDecodeError('The page body does not inflate.');
  }
  if (body.length !== expected) {
    throw new TqpDecodeError('The page body has the wrong length.');
  }

  const cmds = body.subarray(0, ncmds);
  let points = 0;
  for (let i = 0; i < ncmds; i += 1) {
    const code = cmds[i]!;
    if (code >= POINTS.length) {
      throw new TqpDecodeError('The page has an unknown command.');
    }
    points += POINTS[code]!;
  }
  if (2 * points !== nvals) {
    throw new TqpDecodeError('The page command count does not match its deltas.');
  }

  const hiAt = ncmds + nvals;
  const escAt = ncmds + 2 * nvals;
  const escapes = new DataView(body.buffer, body.byteOffset, body.byteLength);
  const deltas = new Int32Array(nvals);
  let used = 0;
  for (let i = 0; i < nvals; i += 1) {
    let u = body[ncmds + i]! + body[hiAt + i]! * 256;
    if (u === ESCAPE) {
      if (used >= nesc) {
        throw new TqpDecodeError('The page escape list is too short.');
      }
      u = escapes.getUint32(escAt + 4 * used, true);
      used += 1;
    }
    deltas[i] = unzigzag(u);
  }
  if (used !== nesc) {
    throw new TqpDecodeError('The page escape list is too long.');
  }
  return { n, cmds, deltas };
}

/**
 * The page as one SVG path string per piece (builder i, ADR 0090 step 12 B1): relative m, l, q, c, z over the deltas, drawn
 * at the 1/32 scale. Skia parses it once; the viewBox origin is already zero.
 */
export function tqpToModel({ cmds, deltas }: TqpDecoded): SvgPageModel {
  const parts: string[] = [];
  let at = 0;
  for (const code of cmds) {
    const count = POINTS[code]! * 2;
    parts.push(LETTERS[code]! + Array.prototype.join.call(deltas.subarray(at, at + count), ' '));
    at += count;
  }
  const scale = 1 / TQP_GRID;
  return {
    origin: { x: 0, y: 0 },
    pieces: [{ d: parts.join(''), matrix: [scale, 0, 0, scale, 0, 0] }],
    viewBox: { height: 550, width: 345 },
  };
}
