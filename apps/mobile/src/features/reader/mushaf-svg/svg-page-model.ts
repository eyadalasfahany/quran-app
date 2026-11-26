import type { TqpDecoded } from './tqp-decoder';

export type Matrix = readonly [a: number, b: number, c: number, d: number, e: number, f: number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** p · q in SVG order: q is applied to a point first, then p. */
export function multiply(p: Matrix, q: Matrix): Matrix {
  const [pa, pb, pc, pd, pe, pf] = p;
  const [qa, qb, qc, qd, qe, qf] = q;
  return [pa * qa + pc * qb, pb * qa + pd * qb, pa * qc + pc * qd, pb * qc + pd * qd, pa * qe + pc * qf + pe, pb * qe + pd * qf + pf];
}

export type PagePathPiece = { d: string; matrix: Matrix };

/**
 * The page model the picture is built from. Pages are decoded from TQP1 (tqp-decoder.ts), which bakes the viewBox origin
 * into the artwork, so `origin` is zero there.
 */
export type SvgPageModel = {
  viewBox: { width: number; height: number };
  origin: { x: number; y: number };
  pieces: readonly PagePathPiece[];
  /** A TQP1 page's commands: drawn straight onto a PathBuilder (buildTqpPath), with no SVG string. Pieces are then empty. */
  decoded?: TqpDecoded;
};

export class SvgPageParseError extends Error {}
