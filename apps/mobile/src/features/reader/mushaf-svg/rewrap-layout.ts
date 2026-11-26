// The zoomed Mushaf page (ADR 0090 amendment, 26 Nov 2026, item 9; plan step 13, B2). Pure: no Skia, no I/O.
// The printed word shapes are laid out again, on the same page width, in shorter and bigger lines. A word moves as a
// rigid piece (a translation; a title block or an over-wide word is scaled uniformly). Nothing is re-drawn.
//
// Units: the layout works in the page's zero-origin printed units (the same space as the word boxes). A line holds
// A = B / z of them, where B is the printed text width, so each word shows z times larger on the screen; the picture is
// unitsWidth = 345 / z units wide and is drawn at z × column / 345, so the page is always exactly the column wide.
import type { PageRegionGeometry, Point, Rect } from './region-geometry';
import type { WordBox } from '@/core/mushaf-pack';

const PRINTED_WIDTH = 345;
const PRINTED_HEIGHT = 550;
/** A gap between two neighbours on one printed line: clamped to this range (19% of printed gaps are negative). */
export const GAP_MIN = -1.5;
export const GAP_MAX = 4.0;
/** A gap between units that were not neighbours (a printed line break). */
export const GAP_BETWEEN_LINES = 1.6;
/** A line whose gaps would each grow by more than this stays ragged (right-aligned), not justified. */
export const GAP_STRETCH_MAX = 6.0;
/** A paragraph whose non-last printed lines are all narrower than this share of B is centred and ragged. */
export const CENTRED_BELOW = 0.8;
/** A paragraph's printed last line at least this full is justified; a shorter one is right-aligned. */
export const FULL_LAST_LINE = 0.97;
/** The line pitch when the page has no text lines (Hafs: 36.3). */
export const DEFAULT_PITCH = 36.3;
const EPS = 1e-9;

export type LayoutRun = { first: number; count: number; loose: boolean };

/** One word of the page: its approved box and the contour runs the builder gave it (ADR 0090, word_contours). */
export type WordUnit = {
  surah: number;
  ayah: number;
  position: number;
  /** 1, or more for a word that has no contour rows of its own (15:7): it covers positions position … position + covers − 1. */
  covers: number;
  /** The printed line index (the word boxes' `line`). */
  line: number;
  box: Rect;
  runs: readonly LayoutRun[];
  /** The ayah ornament after this word (contour_blocks kind 2), drawn with it. */
  mark: { first: number; count: number; bounds: Rect } | null;
  /** A sajda line over this word (contour_blocks kind 3): an annotation, never drawn on its own. */
  sajda: { first: number; count: number; bounds: Rect } | null;
  /**
   * The keep-together run this word belongs to (contour_blocks kind 5, its ord): the artwork draws these neighbouring words
   * as one shape, so the zoomed layout never breaks a line between them.
   */
  keep?: number | null;
};

/** A title, basmala or other full-line art (contour_blocks kind 1): centred, on its own line, never broken. */
export type BlockUnit = { first: number; count: number; bounds: Rect };

/** A hizb ornament (contour_blocks kind 4): drawn in the margin beside the line that holds its anchor word. */
export type HizbUnit = { first: number; count: number; bounds: Rect; surah: number; ayah: number };

export type LayoutInput = {
  words: readonly WordUnit[];
  blocks: readonly BlockUnit[];
  hizbs?: readonly HizbUnit[];
  /** Printed line → its band (the word boxes' y0 and y1). Missing lines are measured from their boxes. */
  bands: ReadonlyMap<number, { y0: number; y1: number }>;
  /** Ayahs that continue from the previous page (their label is not on this page). */
  continuing?: ReadonlySet<string>;
};

/**
 * A unit moved to its place: its original point p maps to scale × (p − c) + c + (dx, dy), with c = (cx, cy) the centre
 * of its extent. A word is only translated (scale 1).
 */
export type Placed = {
  unit: WordUnit | BlockUnit | HizbUnit;
  dx: number;
  dy: number;
  scale: number;
  cx: number;
  cy: number;
};

export type PageLayout = {
  unitsWidth: number;
  unitsHeight: number;
  placed: readonly Placed[];
  lines: readonly { y0: number; y1: number; wordRects: readonly WordBox[] }[];
  regions: readonly PageRegionGeometry[];
  /** The placed rectangle of a word (`line` is the laid-out line), or null for a word the page does not have. */
  wordRect: (surah: number, ayah: number, position: number) => WordBox | null;
};

type Band = { y0: number; y1: number };
type Piece = { members: WordUnit[]; ext: Rect; line: number; band: Band; cx: number; cy: number };
type Item = { kind: 'line'; line: number; band: Band; pieces: Piece[] } | { kind: 'block'; block: BlockUnit };

const union = (a: Rect, b: Rect): Rect => ({
  x0: Math.min(a.x0, b.x0),
  x1: Math.max(a.x1, b.x1),
  y0: Math.min(a.y0, b.y0),
  y1: Math.max(a.y1, b.y1),
});

const extentOf = (word: WordUnit): Rect => (word.mark === null ? word.box : union(word.box, word.mark.bounds));

const overlapX = (a: Rect, b: Rect): number => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);

const median = (values: readonly number[]): number => {
  if (values.length === 0) {
    return DEFAULT_PITCH;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

/** The printed gap between two neighbours, clamped; units on different printed lines get the line-break gap. */
function naturalGap(prev: Piece, next: Piece): number {
  if (prev.line !== next.line) {
    return GAP_BETWEEN_LINES;
  }
  return Math.min(GAP_MAX, Math.max(GAP_MIN, prev.ext.x0 - next.ext.x1));
}

/**
 * Splits one printed line into pieces. Words whose box overlaps a sajda line by at least half their width join one piece,
 * and so do the words of one keep-together run (rigid, unbreakable, keeping their printed offsets); a word in both joins
 * the two pieces into one. Every other word is its own piece.
 */
function piecesOfLine(words: readonly WordUnit[], band: Band): Piece[] {
  const sajdas = words.flatMap((word) => (word.sajda === null ? [] : [word.sajda.bounds]));
  const overlapsSajda = (word: WordUnit) =>
    word.box.x1 > word.box.x0 &&
    sajdas.some((sajda) => overlapX(word.box, sajda) >= 0.5 * (word.box.x1 - word.box.x0));
  // Each word starts in its own group; the sajda words and each keep-together run are merged.
  const parent = words.map((_, index) => index);
  const find = (index: number): number => (parent[index] === index ? index : (parent[index] = find(parent[index]!)));
  const join = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };
  const sajdaWords = words.flatMap((word, index) => (overlapsSajda(word) ? [index] : []));
  sajdaWords.slice(1).forEach((index) => join(index, sajdaWords[0]!));
  const runs = new Map<number, number>();
  words.forEach((word, index) => {
    if (word.keep === undefined || word.keep === null) {
      return;
    }
    const first = runs.get(word.keep);
    if (first === undefined) {
      runs.set(word.keep, index);
    } else {
      join(index, first);
    }
  });
  const groups = new Map<number, WordUnit[]>();
  words.forEach((word, index) => groups.set(find(index), [...(groups.get(find(index)) ?? []), word]));
  const sajdaRoot = sajdaWords.length > 0 ? find(sajdaWords[0]!) : null;
  const pieceOf = (members: WordUnit[], extra: Rect[]): Piece => {
    const ext = [...members.map(extentOf), ...extra].reduce(union);
    return { band, cx: (ext.x0 + ext.x1) / 2, cy: (band.y0 + band.y1) / 2, ext, line: members[0]!.line, members };
  };
  const pieces = [...groups.entries()].map(([root, members]) => {
    const touching = root === sajdaRoot ? sajdas.filter((sajda) => members.some((word) => overlapX(word.box, sajda) > 0)) : [];
    return pieceOf(members, touching);
  });
  return pieces.sort((a, b) => b.ext.x1 - a.ext.x1);
}

/** Feasibility and cost of pieces i … j (inclusive) on one line. */
function segment(
  i: number,
  j: number,
  last: boolean,
  extentPrefix: readonly number[],
  gapPrefix: readonly number[],
  available: number,
): { feasible: boolean; cost: number; scale: number } {
  const width = extentPrefix[j + 1]! - extentPrefix[i]! + gapPrefix[j]! - gapPrefix[i]!;
  if (i === j) {
    const extent = extentPrefix[i + 1]! - extentPrefix[i]!;
    // A unit wider than the line goes alone and is scaled down to it (no cost).
    return extent > available ? { feasible: true, cost: 0, scale: available / extent } : { feasible: true, cost: last ? 0 : (available - extent) ** 2, scale: 1 };
  }
  if (width > available + EPS) {
    return { feasible: false, cost: 0, scale: 1 };
  }
  const slack = available - width;
  return { feasible: true, cost: last ? 0 : slack * slack, scale: 1 };
}

/**
 * Breaks a paragraph's pieces into lines by minimum raggedness (dynamic programming over the pieces; the last line of the
 * paragraph costs nothing). Returns the inclusive piece ranges, in order.
 */
export function breakParagraph(
  extents: readonly number[],
  gaps: readonly number[],
  available: number,
): { first: number; last: number }[] {
  const n = extents.length;
  const extentPrefix = [0];
  for (const extent of extents) {
    extentPrefix.push(extentPrefix[extentPrefix.length - 1]! + extent);
  }
  const gapPrefix = [0];
  for (let k = 0; k < n - 1; k += 1) {
    gapPrefix.push(gapPrefix[k]! + gaps[k]!);
  }
  gapPrefix.push(gapPrefix[gapPrefix.length - 1]!);
  const best = new Array<number>(n + 1).fill(Infinity);
  const back = new Array<number>(n + 1).fill(-1);
  best[0] = 0;
  for (let j = 1; j <= n; j += 1) {
    for (let i = 0; i < j; i += 1) {
      const seg = segment(i, j - 1, false, extentPrefix, gapPrefix, available);
      if (seg.feasible && best[i]! + seg.cost < best[j]!) {
        best[j] = best[i]! + seg.cost;
        back[j] = i;
      }
    }
  }
  let finalStart = -1;
  let finalCost = Infinity;
  for (let i = 0; i < n; i += 1) {
    const seg = segment(i, n - 1, true, extentPrefix, gapPrefix, available);
    if (seg.feasible && best[i]! + seg.cost < finalCost) {
      finalCost = best[i]! + seg.cost;
      finalStart = i;
    }
  }
  const lines: { first: number; last: number }[] = [{ first: finalStart, last: n - 1 }];
  let at = finalStart;
  while (at > 0) {
    const from = back[at]!;
    lines.unshift({ first: from, last: at - 1 });
    at = from;
  }
  return lines;
}

/** Right-to-left packing: the first piece's right edge is `rightEdge`; gaps are the given ones. Returns each left edge. */
function packFromRight(rightEdge: number, widths: readonly number[], gaps: readonly number[]): number[] {
  const lefts: number[] = [];
  let right = rightEdge;
  widths.forEach((width, k) => {
    const left = right - width;
    lefts.push(left);
    right = left - (gaps[k] ?? 0);
  });
  return lefts;
}

type Mode = 'justify' | 'right' | 'centre';

export function layoutPage(input: LayoutInput, zoom: number): PageLayout {
  const z = zoom;
  const words = input.words;
  const bandCache = new Map<number, Band>();
  const bandOf = (line: number): Band => {
    const known = bandCache.get(line) ?? input.bands.get(line);
    if (known !== undefined) {
      return known;
    }
    const onLine = words.filter((word) => word.line === line).map((word) => word.box);
    const band = {
      y0: Math.min(...onLine.map((box) => box.y0)),
      y1: Math.max(...onLine.map((box) => box.y1)),
    };
    bandCache.set(line, band);
    return band;
  };

  // The printed text width B (the widest printed line) and the start edge Lx (the leftmost word).
  const lineGroups = new Map<number, WordUnit[]>();
  for (const word of words) {
    lineGroups.set(word.line, [...(lineGroups.get(word.line) ?? []), word]);
  }
  let B = 0;
  let Lx = Infinity;
  for (const group of lineGroups.values()) {
    const x0 = Math.min(...group.map((word) => word.box.x0));
    const x1 = Math.max(...group.map((word) => word.box.x1));
    B = Math.max(B, x1 - x0);
    Lx = Math.min(Lx, x0);
  }
  if (!(B > 0)) {
    B = PRINTED_WIDTH;
    Lx = 0;
  }
  const available = B / z;
  const rightEdge = (Lx + B) / z;
  const centreX = (Lx + B / 2) / z;
  const printedWidthOf = (line: number) => {
    const group = lineGroups.get(line) ?? [];
    return group.length === 0 ? 0 : Math.max(...group.map((word) => word.box.x1)) - Math.min(...group.map((word) => word.box.x0));
  };

  // Printed items in reading order: text lines top to bottom, blocks slotted in by their centre.
  const lines = [...lineGroups.keys()]
    .map((line) => ({ line, band: bandOf(line) }))
    .sort((a, b) => a.band.y0 - b.band.y0 || a.line - b.line);
  const blocks = [...(input.blocks ?? [])].sort((a, b) => a.bounds.y0 - b.bounds.y0);
  const items: Item[] = [];
  const centreOfBlock = (block: BlockUnit) => (block.bounds.y0 + block.bounds.y1) / 2;
  let nextBlock = 0;
  for (const { line, band } of lines) {
    const centre = (band.y0 + band.y1) / 2;
    while (nextBlock < blocks.length && centreOfBlock(blocks[nextBlock]!) < centre) {
      items.push({ block: blocks[nextBlock]!, kind: 'block' });
      nextBlock += 1;
    }
    items.push({ band, kind: 'line', line, pieces: piecesOfLine(lineGroups.get(line)!, band) });
  }
  for (; nextBlock < blocks.length; nextBlock += 1) {
    items.push({ block: blocks[nextBlock]!, kind: 'block' });
  }

  const pitch = median(lines.map(({ band }) => band.y1 - band.y0));
  const itemTop = (item: Item) => (item.kind === 'block' ? item.block.bounds.y0 : item.band.y0);
  const itemBottom = (item: Item) => (item.kind === 'block' ? item.block.bounds.y1 : item.band.y1);

  // Paragraphs: runs of text lines between blocks.
  const segments: ({ kind: 'block'; block: BlockUnit } | { kind: 'para'; lines: Item[] })[] = [];
  for (const item of items) {
    if (item.kind === 'block') {
      segments.push({ block: item.block, kind: 'block' });
    } else {
      const previous = segments[segments.length - 1];
      if (previous !== undefined && previous.kind === 'para') {
        previous.lines.push(item);
      } else {
        segments.push({ kind: 'para', lines: [item] });
      }
    }
  }

  const placed: Placed[] = [];
  const laidLines: { y0: number; y1: number; wordRects: WordBox[] }[] = [];
  const wordRects = new Map<string, WordBox>();
  const regionRects = new Map<string, { surah: number; ayah: number; byLine: Map<number, Rect> }>();
  const addRegionRect = (surah: number, ayah: number, lineIndex: number, rect: Rect) => {
    const key = `${surah}:${ayah}`;
    const entry = regionRects.get(key) ?? { ayah, byLine: new Map<number, Rect>(), surah };
    const current = entry.byLine.get(lineIndex);
    entry.byLine.set(lineIndex, current === undefined ? rect : union(current, rect));
    regionRects.set(key, entry);
  };

  const transformed = (piece: { scale: number; cx: number; cy: number; dx: number; dy: number }, rect: Rect): Rect => {
    const tx = (x: number) => piece.scale * (x - piece.cx) + piece.cx + piece.dx;
    const ty = (y: number) => piece.scale * (y - piece.cy) + piece.cy + piece.dy;
    return { x0: tx(rect.x0), x1: tx(rect.x1), y0: ty(rect.y0), y1: ty(rect.y1) };
  };

  let cursor = items.length === 0 ? 0 : itemTop(items[0]!) / z;
  let previousBottom: number | null = null;
  let maxBottom = 0;

  for (const segment of segments) {
    if (segment.kind === 'block') {
      const { block } = segment;
      if (previousBottom !== null) {
        cursor += Math.max(0, block.bounds.y0 - previousBottom);
      }
      const width = block.bounds.x1 - block.bounds.x0;
      const height = block.bounds.y1 - block.bounds.y0;
      const scale = Math.min(1, available / Math.max(width, EPS));
      const cx = (block.bounds.x0 + block.bounds.x1) / 2;
      const cy = (block.bounds.y0 + block.bounds.y1) / 2;
      placed.push({
        cx,
        cy,
        dx: centreX - cx,
        dy: cursor - cy + (scale * height) / 2,
        scale,
        unit: block,
      });
      cursor += scale * height;
      previousBottom = block.bounds.y1;
      maxBottom = Math.max(maxBottom, block.bounds.y1);
      continue;
    }

    // A paragraph: its pieces in reading order, with their gaps.
    const paragraphItems = segment.lines;
    const pieces = paragraphItems.flatMap((item) => (item.kind === 'line' ? item.pieces : []));
    const gaps = pieces.slice(1).map((piece, k) => naturalGap(pieces[k]!, piece));
    const printedLines = paragraphItems.map((item) => (item.kind === 'line' ? item.line : -1));
    const lastLine = printedLines[printedLines.length - 1]!;
    const nonLast = printedLines.slice(0, -1);
    // A one-line paragraph has no non-last line to judge, so it follows the last-line rule.
    const paragraphCentred = nonLast.length > 0 && nonLast.every((line) => printedWidthOf(line) < CENTRED_BELOW * B);
    const lastFull = printedWidthOf(lastLine) >= FULL_LAST_LINE * B;

    if (previousBottom !== null) {
      cursor += Math.max(0, itemTop(paragraphItems[0]!) - previousBottom);
    }
    const extents = pieces.map((piece) => piece.ext.x1 - piece.ext.x0);
    const ranges = breakParagraph(extents, gaps, available);

    ranges.forEach((range, index) => {
      const count = range.last - range.first + 1;
      const isLast = index === ranges.length - 1;
      const scales = pieces.slice(range.first, range.last + 1).map((piece, k) => {
        const extent = extents[range.first + k]!;
        return extent > available && count === 1 ? available / extent : 1;
      });
      const widths = pieces.slice(range.first, range.last + 1).map((piece, k) => extents[range.first + k]! * scales[k]!);
      const lineGaps = gaps.slice(range.first, range.last);
      const natural = widths.reduce((sum, width) => sum + width, 0) + lineGaps.reduce((sum, gap) => sum + gap, 0);
      const slack = available - natural;
      const spread = count >= 2 ? slack / (count - 1) : Infinity;
      const justifiable = count >= 2 && slack >= -EPS && spread <= GAP_STRETCH_MAX;

      let mode: Mode;
      if (paragraphCentred) {
        mode = 'centre';
      } else if (isLast) {
        mode = justifiable && lastFull ? 'justify' : 'right';
      } else {
        mode = justifiable ? 'justify' : 'right';
      }

      let finalGaps = lineGaps;
      let right = rightEdge;
      if (mode === 'justify') {
        finalGaps = lineGaps.map((gap) => gap + spread);
      } else if (mode === 'centre') {
        right = centreX + natural / 2;
      }
      const lefts = packFromRight(right, widths, finalGaps);

      const top = cursor;
      const lineIndex = laidLines.length;
      const lineRecord: { y0: number; y1: number; wordRects: WordBox[] } = { wordRects: [], y0: top, y1: top + pitch };
      laidLines.push(lineRecord);

      pieces.slice(range.first, range.last + 1).forEach((piece, k) => {
        const scale = scales[k]!;
        const extentWidth = extents[range.first + k]!;
        const dx = lefts[k]! - piece.cx + (scale * extentWidth) / 2;
        const dy = top - piece.cy + (scale * (piece.band.y1 - piece.band.y0)) / 2;
        const transform = { cx: piece.cx, cy: piece.cy, dx, dy, scale };
        for (const member of piece.members) {
          placed.push({ cx: piece.cx, cy: piece.cy, dx, dy, scale, unit: member });
          const box = transformed(transform, member.box);
          for (let p = 0; p < member.covers; p += 1) {
            const wordBox: WordBox = {
              ayah: member.ayah,
              line: lineIndex,
              position: member.position + p,
              surah: member.surah,
              x0: box.x0,
              x1: box.x1,
              y0: box.y0,
              y1: box.y1,
            };
            wordRects.set(`${member.surah}:${member.ayah}:${member.position + p}`, wordBox);
            lineRecord.wordRects.push(wordBox);
          }
          addRegionRect(member.surah, member.ayah, lineIndex, transformed(transform, extentOf(member)));
        }
      });
      cursor += pitch;
    });

    previousBottom = itemBottom(paragraphItems[paragraphItems.length - 1]!);
    maxBottom = Math.max(maxBottom, previousBottom);
  }

  // Hizb ornaments: in the margin on their printed side, centred on the laid-out line of their anchor word.
  for (const hizb of input.hizbs ?? []) {
    const hizbCx = (hizb.bounds.x0 + hizb.bounds.x1) / 2;
    const hizbCy = (hizb.bounds.y0 + hizb.bounds.y1) / 2;
    const candidates = words.filter((word) => hizb.surah > 0 && word.surah === hizb.surah && word.ayah === hizb.ayah);
    const pool = candidates.length > 0 ? candidates : words;
    let anchor: WordUnit | null = null;
    let anchorDistance = Infinity;
    for (const word of pool) {
      const gapX = Math.max(0, hizb.bounds.x0 - word.box.x1, word.box.x0 - hizb.bounds.x1);
      const gapY = Math.max(0, hizb.bounds.y0 - word.box.y1, word.box.y0 - hizb.bounds.y1);
      const distance = Math.hypot(gapX, gapY);
      if (distance < anchorDistance || (distance === anchorDistance && anchor !== null && word.box.x0 > anchor.box.x0)) {
        anchor = word;
        anchorDistance = distance;
      }
    }
    const anchorBox = anchor === null ? null : wordRects.get(`${anchor.surah}:${anchor.ayah}:${anchor.position}`);
    if (anchorBox === undefined || anchorBox === null) {
      continue;
    }
    const lineRecord = laidLines[anchorBox.line]!;
    const centreLine = (lineRecord.y0 + lineRecord.y1) / 2;
    const onLeft = hizbCx < Lx + B / 2;
    const margin = onLeft ? Lx / z : (PRINTED_WIDTH - Lx - B) / z;
    const width = hizb.bounds.x1 - hizb.bounds.x0;
    const scale = margin > 0 ? Math.min(1, margin / Math.max(width, EPS)) : 1;
    const marginCentre = onLeft ? Lx / (2 * z) : (Lx + B) / z + margin / 2;
    placed.push({
      cx: hizbCx,
      cy: hizbCy,
      dx: marginCentre - hizbCx,
      dy: centreLine - hizbCy,
      scale,
      unit: hizb,
    });
  }

  const unitsHeight = cursor + Math.max(0, PRINTED_HEIGHT - maxBottom) / z;

  const regions: PageRegionGeometry[] = [...regionRects.values()]
    .sort((a, b) => a.surah - b.surah || a.ayah - b.ayah)
    .map(({ surah, ayah, byLine }) => {
      const rects = [...byLine.values()].sort((a, b) => a.y0 - b.y0 || b.x1 - a.x1);
      const subpaths: Point[][] = rects.map((rect) => [
        [rect.x0, rect.y0],
        [rect.x1, rect.y0],
        [rect.x1, rect.y1],
        [rect.x0, rect.y1],
      ]);
      const bounds = rects.reduce(union);
      return {
        ayah,
        bounds,
        continues: input.continuing?.has(`${surah}:${ayah}`) ?? false,
        lines: rects,
        polygon: rects.map((rect) => `M ${rect.x0} ${rect.y0} L ${rect.x1} ${rect.y0} L ${rect.x1} ${rect.y1} L ${rect.x0} ${rect.y1} Z`).join(' '),
        subpaths,
        surah,
        verseKey: `${surah}:${ayah}`,
      };
    });

  return {
    lines: laidLines,
    placed,
    regions,
    unitsHeight,
    unitsWidth: PRINTED_WIDTH / z,
    wordRect: (surah, ayah, position) => wordRects.get(`${surah}:${ayah}:${position}`) ?? null,
  };
}

/** The units a placed unit draws: a word's runs with its ornament, a block's or hizb ornament's own run. */
export function runsOf(unit: WordUnit | BlockUnit | HizbUnit): readonly { first: number; count: number }[] {
  if ('box' in unit) {
    const runs: { first: number; count: number }[] = [...unit.runs];
    if (unit.mark !== null) {
      runs.push({ count: unit.mark.count, first: unit.mark.first });
    }
    return runs;
  }
  return [{ count: unit.count, first: unit.first }];
}
