// Splits a decoded TQP page into its subpaths (ADR 0090 step 13, B3). Pure: no Skia. A subpath starts at an M; its
// absolute start is the current point the relative M is taken from (after a Z, the subpath start, as SVG does).
import { TqpDecodeError, type TqpDecoded } from './tqp-decoder';

/** Points per command: M L Q C Z. */
const POINTS = [1, 1, 2, 3, 0] as const;

export type SubpathTable = {
  /** Absolute grid x, y of each subpath's M (2 per subpath). */
  starts: Int32Array;
  /** Index into `cmds` of each subpath's M; length n + 1 (the last is the command count). */
  cmdFrom: Uint32Array;
  /** Index into `deltas` of each subpath's M; length n + 1. */
  deltaFrom: Uint32Array;
  count: number;
};

export type AbsoluteCommand = { code: 0 | 1 | 2 | 3 | 4; points: number[] };

export function splitSubpaths(decoded: TqpDecoded): SubpathTable {
  const { cmds, deltas } = decoded;
  const starts: number[] = [];
  const cmdFrom: number[] = [];
  const deltaFrom: number[] = [];
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let at = 0;
  cmds.forEach((code, index) => {
    if (code === 0) {
      cx += deltas[at]!;
      cy += deltas[at + 1]!;
      sx = cx;
      sy = cy;
      starts.push(cx, cy);
      cmdFrom.push(index);
      deltaFrom.push(at);
    } else if (cmdFrom.length === 0) {
      throw new TqpDecodeError('The page does not start with a move.');
    } else if (code === 4) {
      cx = sx;
      cy = sy;
    } else {
      const last = POINTS[code]! * 2 - 2;
      cx += deltas[at + last]!;
      cy += deltas[at + last + 1]!;
    }
    at += POINTS[code]! * 2;
  });
  cmdFrom.push(cmds.length);
  deltaFrom.push(deltas.length);
  return {
    count: starts.length / 2,
    cmdFrom: Uint32Array.from(cmdFrom),
    deltaFrom: Uint32Array.from(deltaFrom),
    starts: Int32Array.from(starts),
  };
}

/**
 * The absolute commands of subpaths [first, first + count), in grid units. Each subpath opens with its M (the table's
 * start); a curve's points are relative to the point the command starts from, as in SVG.
 */
export function absoluteCommands(decoded: TqpDecoded, table: SubpathTable, first: number, count: number): AbsoluteCommand[] {
  const out: AbsoluteCommand[] = [];
  for (let s = first; s < first + count; s += 1) {
    const sx = table.starts[2 * s]!;
    const sy = table.starts[2 * s + 1]!;
    let cx = sx;
    let cy = sy;
    let at = table.deltaFrom[s]!;
    for (let c = table.cmdFrom[s]!; c < table.cmdFrom[s + 1]!; c += 1) {
      const code = decoded.cmds[c]! as AbsoluteCommand['code'];
      if (code === 0) {
        out.push({ code, points: [sx, sy] });
      } else if (code === 4) {
        cx = sx;
        cy = sy;
        out.push({ code, points: [] });
      } else {
        const points: number[] = [];
        for (let p = 0; p < POINTS[code]!; p += 1) {
          points.push(cx + decoded.deltas[at + 2 * p]!, cy + decoded.deltas[at + 2 * p + 1]!);
        }
        cx = points[points.length - 2]!;
        cy = points[points.length - 1]!;
        out.push({ code, points });
      }
      at += POINTS[code]! * 2;
    }
  }
  return out;
}
