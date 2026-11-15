// Parses one quran-svg page into the paths Skia draws (ADR 0090 decision 8). Pure: no React, no Skia import.
// The page is read tag by tag, never as a DOM; each path's `d` is kept byte for byte.

export type Matrix = readonly [a: number, b: number, c: number, d: number, e: number, f: number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** p · q in SVG order: q is applied to a point first, then p. */
export function multiply(p: Matrix, q: Matrix): Matrix {
  const [pa, pb, pc, pd, pe, pf] = p;
  const [qa, qb, qc, qd, qe, qf] = q;
  return [pa * qa + pc * qb, pb * qa + pd * qb, pa * qc + pc * qd, pb * qc + pd * qd, pa * qe + pc * qf + pe, pb * qe + pd * qf + pf];
}

export type PagePathPiece = { d: string; matrix: Matrix };

/** `origin` is the viewBox min-x, min-y. The pieces are already moved to a zero origin. */
export type SvgPageModel = {
  viewBox: { width: number; height: number };
  origin: { x: number; y: number };
  pieces: readonly PagePathPiece[];
};

export class SvgPageParseError extends Error {}

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const TRANSFORM_FUNCTION = /^[\s,]*(translate|scale|matrix)\s*\(([^()]*)\)/;

function transformFunction(name: string, args: readonly number[]): Matrix | null {
  if (name === 'translate' && (args.length === 1 || args.length === 2)) {
    return [1, 0, 0, 1, args[0]!, args[1] ?? 0];
  }
  if (name === 'scale' && (args.length === 1 || args.length === 2)) {
    return [args[0]!, 0, 0, args[1] ?? args[0]!, 0, 0];
  }
  if (name === 'matrix' && args.length === 6) {
    return [args[0]!, args[1]!, args[2]!, args[3]!, args[4]!, args[5]!];
  }
  return null;
}

/** A transform list (translate, scale, matrix). Null for any other function or a bad number. */
export function parseTransform(value: string): Matrix | null {
  let rest = value;
  let matrix: Matrix = IDENTITY;
  let found = false;
  for (;;) {
    const match = TRANSFORM_FUNCTION.exec(rest);
    if (match === null) {
      break;
    }
    const parts = match[2]!.trim().split(/[\s,]+/).filter((part) => part !== '');
    if (!parts.every((part) => NUMBER.test(part))) {
      return null;
    }
    const fn = transformFunction(match[1]!, parts.map(Number));
    if (fn === null) {
      return null;
    }
    matrix = multiply(matrix, fn);
    rest = rest.slice(match[0].length);
    found = true;
  }
  return found && rest.trim() === '' ? matrix : null;
}

type Tag = { name: string; close: boolean; self: boolean; attrs: Record<string, string> };

const TAG = /<[^>]*>/g;
const ATTR = /([^\s=/]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function parseTag(raw: string): Tag | null {
  const head = /^<(\/?)\s*([A-Za-z][\w:-]*)/.exec(raw);
  if (head === null) {
    return null;
  }
  const attrs: Record<string, string> = {};
  for (const match of raw.matchAll(ATTR)) {
    attrs[match[1]!] = match[2] ?? match[3] ?? '';
  }
  return { attrs, close: head[1] === '/', name: head[2]!, self: /\/\s*>$/.test(raw) };
}

function tagsOf(svg: string): Tag[] {
  const tags: Tag[] = [];
  for (const match of svg.matchAll(TAG)) {
    const tag = parseTag(match[0]);
    if (tag !== null) {
      tags.push(tag);
    }
  }
  return tags;
}

/** The index of the `</g>` that closes the `<g>` at `start`. -1 when it never closes. */
function closeOf(tags: readonly Tag[], start: number): number {
  let depth = 0;
  for (let index = start; index < tags.length; index += 1) {
    const tag = tags[index]!;
    if (tag.name !== 'g' || tag.self) {
      continue;
    }
    depth += tag.close ? -1 : 1;
    if (depth === 0) {
      return index;
    }
  }
  return -1;
}

export function parseSvgPage(svg: string): SvgPageModel {
  const tags = tagsOf(svg.replace(/<!--[\s\S]*?-->/g, ''));

  const svgTag = tags.find((tag) => tag.name === 'svg' && !tag.close);
  const viewBox = svgTag?.attrs.viewBox?.trim().split(/[\s,]+/).map(Number);
  if (
    viewBox === undefined ||
    viewBox.length !== 4 ||
    !viewBox.every(Number.isFinite) ||
    viewBox[2] !== 345 ||
    viewBox[3] !== 550
  ) {
    throw new SvgPageParseError('The page viewBox is not 345 × 550.');
  }
  // pages 1–2 of the Madinah artwork have a shifted viewBox origin; the pieces are moved to zero below.
  const origin = { x: viewBox[0]!, y: viewBox[1]! };

  // The root group: the first <g transform> whose body holds the ayah markers or the content.
  let rootStart = -1;
  let rootEnd = -1;
  for (let index = 0; index < tags.length && rootStart < 0; index += 1) {
    const tag = tags[index]!;
    if (tag.name !== 'g' || tag.close || tag.self || tag.attrs.transform === undefined) {
      continue;
    }
    const end = closeOf(tags, index);
    const holdsSection = tags
      .slice(index + 1, end < 0 ? undefined : end)
      .some((inner) => !inner.close && (inner.attrs.id === 'ayah_markers' || inner.attrs.id === 'content'));
    if (holdsSection && end >= 0) {
      rootStart = index;
      rootEnd = end;
    }
  }
  if (rootStart < 0) {
    throw new SvgPageParseError('The page has no root group with ayah_markers or content.');
  }

  const rootMatrix = parseTransform(tags[rootStart]!.attrs.transform!);
  if (rootMatrix === null) {
    throw new SvgPageParseError('The page root transform is not supported.');
  }

  const markers: PagePathPiece[] = [];
  const content: PagePathPiece[] = [];
  let running: Matrix = rootMatrix;
  // One entry per open <g> inside the root: the matrix to restore, the section it sits in, and its ayah-mark flag.
  const stack: { prev: Matrix; section: 'markers' | 'content' | null; ayahMark: boolean }[] = [];

  for (let index = rootStart + 1; index < rootEnd; index += 1) {
    const tag = tags[index]!;
    const parent = stack[stack.length - 1] ?? { prev: running, section: null, ayahMark: false };

    if (tag.name === 'g') {
      if (tag.close) {
        const frame = stack.pop();
        if (frame !== undefined) {
          running = frame.prev;
        }
        continue;
      }
      let section = parent.section;
      if (tag.attrs.id === 'ayah_markers') {
        section = 'markers';
      } else if (tag.attrs.id === 'content') {
        section = 'content';
      }
      const ayahMark = parent.ayahMark || (tag.attrs.class ?? '').split(/\s+/).includes('ayah-mark');
      const prev = running;
      if (tag.attrs.transform !== undefined) {
        const matrix = parseTransform(tag.attrs.transform);
        if (matrix === null) {
          throw new SvgPageParseError('A page transform is not supported.');
        }
        running = multiply(running, matrix);
      }
      if (!tag.self) {
        stack.push({ prev, section, ayahMark });
      }
      continue;
    }

    if (tag.name !== 'path' || tag.close || tag.attrs.d === undefined) {
      continue;
    }
    if (parent.section === 'markers' && parent.ayahMark) {
      markers.push({ d: tag.attrs.d, matrix: running });
    } else if (parent.section === 'content') {
      content.push({ d: tag.attrs.d, matrix: running });
    }
  }

  const pieces = [...markers, ...content];
  if (pieces.length === 0) {
    throw new SvgPageParseError('The page has no paths.');
  }
  const shift: Matrix = [1, 0, 0, 1, -origin.x, -origin.y];
  const zeroed =
    origin.x === 0 && origin.y === 0 ? pieces : pieces.map((piece) => ({ d: piece.d, matrix: multiply(shift, piece.matrix) }));
  return { origin, pieces: zeroed, viewBox: { height: 550, width: 345 } };
}
