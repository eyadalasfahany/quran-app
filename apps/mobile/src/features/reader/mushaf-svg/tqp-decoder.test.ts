import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { goldenBlob, tqpBlobFor as blobFor, tqpBlob, tqpHeader } from './__fixtures__/tqp/blob';
import { decodeTqp, TqpDecodeError, tqpToModel, type TqpDecoded } from './tqp-decoder';

// Synthetic goldens only (FIXTURE — not artwork), written by tqp.py. Hand-built blobs below use the same byte layout.

const POINTS = [1, 1, 2, 3, 0];

/** Absolute grid points per command, rebuilt the way tqp.py's parse_container does (every point from the segment start). */
function absolute({ cmds, deltas }: TqpDecoded): [number, [number, number][]][] {
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let at = 0;
  const out: [number, [number, number][]][] = [];
  for (const code of cmds) {
    const pts: [number, number][] = [];
    for (let i = 0; i < POINTS[code]!; i += 1) {
      pts.push([cx + deltas[at]!, cy + deltas[at + 1]!]);
      at += 2;
    }
    out.push([code, pts]);
    if (code === 4) {
      cx = sx;
      cy = sy;
    } else if (pts.length > 0) {
      [cx, cy] = pts[pts.length - 1]!;
      if (code === 0) {
        [sx, sy] = [cx, cy];
      }
    }
  }
  return out;
}

function golden(name: string): [number, [number, number][]][] {
  return JSON.parse(readFileSync(join(__dirname, '__fixtures__', 'tqp', `${name}.ints.json`), 'utf8')) as [number, [number, number][]][];
}

describe('decodeTqp on the tqp.py goldens', () => {
  it('rebuilds the integers of the basic page: ayah marks only, curves, a Z then a relative move, half-grid rounding', () => {
    const decoded = decodeTqp(goldenBlob('basic'));
    expect(decoded.n).toBe(32);
    expect(absolute(decoded)).toEqual(golden('basic'));
  });

  it('rebuilds the integers of the escape page, including a delta of exactly 0xFFFF in zigzag', () => {
    const decoded = decodeTqp(goldenBlob('escape'));
    expect(absolute(decoded)).toEqual(golden('escape'));
    expect(decoded.deltas).toContain(-32768);
  });
});

describe('decodeTqp errors', () => {
  const body = (length: number) => new Uint8Array(length);

  it('throws on bad magic, a grid other than 32, and a blob shorter than the header', () => {
    expect(() => decodeTqp(tqpBlob(tqpHeader({ magic: 'TQP2' }), body(0)))).toThrow(TqpDecodeError);
    expect(() => decodeTqp(tqpBlob(tqpHeader({ n: 16 }), body(0)))).toThrow(TqpDecodeError);
    expect(() => decodeTqp(new Uint8Array(17))).toThrow(TqpDecodeError);
  });

  it('throws on a blob above 1 MiB, before inflating', () => {
    expect(() => decodeTqp(new Uint8Array((1 << 20) + 1))).toThrow(TqpDecodeError);
  });

  it('throws when the expected body is above 4 MiB', () => {
    expect(() => decodeTqp(tqpBlob(tqpHeader({ ncmds: (4 << 20) + 1 }), body(0)))).toThrow(TqpDecodeError);
    expect(() => decodeTqp(tqpBlob(tqpHeader({ nvals: 1 << 30 }), body(0)))).toThrow(TqpDecodeError);
  });

  it('throws on a stream that is not deflate', () => {
    const blob = new Uint8Array(18 + 4).fill(0xff);
    blob.set(tqpHeader({ ncmds: 1 }), 0);
    expect(() => decodeTqp(blob)).toThrow(TqpDecodeError);
  });

  it('throws when the body is shorter or longer than the header says', () => {
    expect(() => decodeTqp(tqpBlob(tqpHeader({ ncmds: 2 }), body(1)))).toThrow(TqpDecodeError);
    expect(() => decodeTqp(tqpBlob(tqpHeader({ ncmds: 0 }), body(5)))).toThrow(TqpDecodeError);
  });

  it('throws when the command points do not match the delta count', () => {
    // One M (one point, two deltas) but the header claims four deltas: the body length is consistent, the counts are not.
    expect(() => decodeTqp(tqpBlob(tqpHeader({ ncmds: 1, nvals: 4 }), body(9)))).toThrow(TqpDecodeError);
  });

  it('throws on an unknown command code', () => {
    const bytes = body(1 + 2);
    bytes[0] = 5;
    expect(() => decodeTqp(tqpBlob(tqpHeader({ ncmds: 1, nvals: 2 }), bytes))).toThrow(TqpDecodeError);
  });

  it('throws when the escape list is shorter or longer than the 0xFFFF markers', () => {
    // A 0xFFFF marker with no escape entry.
    const marked = new Uint8Array([0, 0xff, 0x00, 0xff, 0x00]);
    expect(() => decodeTqp(tqpBlob(tqpHeader({ ncmds: 1, nvals: 2, nesc: 0 }), marked))).toThrow(TqpDecodeError);
    // An escape entry with no marker.
    const unused = new Uint8Array(1 + 2 + 2 + 4);
    expect(() => decodeTqp(tqpBlob(tqpHeader({ ncmds: 1, nvals: 2, nesc: 1 }), unused))).toThrow(TqpDecodeError);
  });
});

describe('decodeTqp zigzag edges (hand-built blobs)', () => {
  it('reads an escaped delta of 0xFFFFFFFF as -2^31 and 0xFFFFFFFE as 2^31 - 1, without bit shifts', () => {
    const minimum = decodeTqp(blobFor([0], [-2147483648, 0]));
    expect(minimum.deltas[0]).toBe(-2147483648);
    const maximum = decodeTqp(blobFor([0], [2147483647, 0]));
    expect(maximum.deltas[0]).toBe(2147483647);
  });

  it('reads 0xFFFF exactly as an escape with the value 32768 (zigzag of -32768 is 0xFFFF)', () => {
    expect(decodeTqp(blobFor([0], [-32768, 0])).deltas[0]).toBe(-32768);
  });
});

describe('tqpToModel', () => {
  it('builds one piece with the 1/32 scale matrix and the zero origin', () => {
    const model = tqpToModel(decodeTqp(blobFor([0], [0, 0])));
    expect(model.pieces).toHaveLength(1);
    expect(model.pieces[0]!.matrix).toEqual([1 / 32, 0, 0, 1 / 32, 0, 0]);
    expect(model.origin).toEqual({ x: 0, y: 0 });
    expect(model.viewBox).toEqual({ height: 550, width: 345 });
  });

  it('writes the relative path text: m, l, z over the deltas', () => {
    // M to (3, 5), L by (2, -1) from there, then Z.
    const model = tqpToModel(decodeTqp(blobFor([0, 1, 4], [3, 5, 2, -1])));
    expect(model.pieces[0]!.d).toBe('m3 5l2 -1z');
  });
});
