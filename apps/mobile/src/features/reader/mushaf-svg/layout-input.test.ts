// Synthetic rows only: FIXTURE — not artwork.
import type { ContourBlock, WordBox, WordContourRun } from '@/core/mushaf-pack';

import { buildLayoutInput } from './layout-input';

const box = (line: number, surah: number, ayah: number, position: number, x0: number, x1: number): WordBox => ({
  ayah,
  line,
  position,
  surah,
  x0,
  x1,
  y0: 20 + line * 40,
  y1: 56.3 + line * 40,
});

const run = (surah: number, ayah: number, position: number, first: number, count: number, loose = false): WordContourRun => ({
  ayah,
  count,
  first,
  loose,
  position,
  surah,
});

const block = (kind: ContourBlock['kind'], extra: Partial<ContourBlock>): ContourBlock => ({
  ayah: 0,
  count: 1,
  first: 0,
  kind,
  ord: 0,
  page: 1,
  surah: 0,
  x0: 0,
  x1: 10,
  y0: 0,
  y1: 10,
  ...extra,
});

describe('buildLayoutInput (synthetic rows, FIXTURE — not artwork)', () => {
  const origin = { x: -10, y: -20 };
  const boxes = [box(0, 1, 1, 1, 0, 30), box(0, 1, 1, 2, 34, 64), box(1, 1, 2, 1, 40, 90), box(1, 1, 3, 1, 100, 130)];
  // Position 2 of ayah 1 has no rows: it is covered by position 1. Ayah 3 has none at all: it is not drawn.
  const runs = [run(1, 1, 1, 0, 2), run(1, 1, 1, 9, 1, true), run(1, 2, 1, 7, 3)];

  it('shifts boxes and bands into the zero-origin space', () => {
    const input = buildLayoutInput({ blocks: [], boxes, continuing: new Set(), origin, runs });
    const first = input.words[0]!;
    expect(first.box.x0).toBe(10);
    expect(first.box.x1).toBe(40);
    expect(input.bands.get(1)).toEqual({ y0: 60 + 20, y1: 96.3 + 20 });
  });

  it('gives each word its own runs, with the loose flag, and a word without rows joins the word before it (covers)', () => {
    const input = buildLayoutInput({ blocks: [], boxes, continuing: new Set(), origin, runs });
    const first = input.words.find((item) => item.ayah === 1 && item.position === 1)!;
    expect(first.runs).toEqual([
      { count: 2, first: 0, loose: false },
      { count: 1, first: 9, loose: true },
    ]);
    expect(first.covers).toBe(2);
    expect(input.words).toHaveLength(2);
  });

  it('puts the ayah ornament after the last word of its ayah, and skips one with no word on the page', () => {
    const mark = block(2, { ayah: 2, count: 1, first: 20, surah: 1, x0: 900, x1: 1000, y0: 10, y1: 20 });
    const orphan = block(2, { ayah: 9, first: 21, surah: 1, x0: 900, x1: 1000, y0: 10, y1: 20 });
    const input = buildLayoutInput({ blocks: [mark, orphan], boxes, continuing: new Set(), origin, runs });
    const second = input.words.find((item) => item.ayah === 2)!;
    expect(second.mark).toEqual({ bounds: { x0: 900 + 10, x1: 1000 + 10, y0: 10 + 20, y1: 20 + 20 }, count: 1, first: 20 });
    expect(input.words.filter((item) => item.mark !== null)).toHaveLength(1);
  });

  it('attaches a sajda line to the word it overlaps most, and moves its bounds too', () => {
    // Raw x 15 to 45 is shifted to 25 to 55: it overlaps word 1 (10 to 40) by 15, and nothing else on its line.
    const sajda = block(3, { count: 1, first: 30, x0: 15, x1: 45, y0: 20, y1: 21 });
    const input = buildLayoutInput({ blocks: [sajda], boxes, continuing: new Set(), origin, runs });
    const holder = input.words.find((item) => item.sajda !== null)!;
    expect(holder.ayah).toBe(1);
    expect(holder.position).toBe(1);
    expect(holder.sajda!.bounds).toEqual({ x0: 25, x1: 55, y0: 40, y1: 41 });
  });

  it('keeps blocks and hizb ornaments as their own units, shifted to the zero-origin space', () => {
    const title = block(1, { count: 3, first: 40, x0: 100, x1: 300, y0: 2, y1: 14 });
    const hizb = block(4, { ayah: 2, count: 2, first: 50, surah: 1, x0: 5, x1: 15, y0: 60, y1: 70 });
    const input = buildLayoutInput({ blocks: [title, hizb], boxes, continuing: new Set(['1:2']), origin, runs });
    expect(input.blocks).toEqual([{ bounds: { x0: 110, x1: 310, y0: 22, y1: 34 }, count: 3, first: 40 }]);
    expect(input.hizbs).toEqual([{ ayah: 2, bounds: { x0: 15, x1: 25, y0: 80, y1: 90 }, count: 2, first: 50, surah: 1 }]);
    expect(input.continuing?.has('1:2')).toBe(true);
  });

  it('joins the contour rows of one hizb ornament into one unit, and keeps two ornaments apart', () => {
    // Three rows run on from subpath 10 (one ornament); the fourth starts at 20, not where the third ends, so it is another.
    const rows = [
      block(4, { ayah: 41, first: 10, ord: 0, count: 1, surah: 40, x0: 0, x1: 10, y0: 0, y1: 10 }),
      block(4, { ayah: 41, first: 11, ord: 1, count: 1, surah: 40, x0: 5, x1: 20, y0: 4, y1: 12 }),
      block(4, { ayah: 41, first: 12, ord: 2, count: 1, surah: 40, x0: 2, x1: 8, y0: 20, y1: 30 }),
      block(4, { ayah: 41, first: 20, ord: 3, count: 1, surah: 40, x0: 2, x1: 8, y0: 40, y1: 50 }),
    ];
    const input = buildLayoutInput({ blocks: rows, boxes, continuing: new Set(), origin, runs });
    expect(input.hizbs).toHaveLength(2);
    const [first, second] = input.hizbs ?? [];
    expect(first).toEqual({ ayah: 41, bounds: { x0: 0 + 10, x1: 20 + 10, y0: 0 + 20, y1: 30 + 20 }, count: 3, first: 10, surah: 40 });
    expect(second!.first).toBe(20);
    expect(second!.count).toBe(1);
  });

  it('marks the words of a keep-together run with its ord, through a covered position, and no other word', () => {
    const more = [...boxes, box(0, 1, 1, 3, 70, 90)];
    const keep = block(5, { ayah: 1, count: 2, first: 2, ord: 4, surah: 1 });
    const input = buildLayoutInput({ blocks: [keep], boxes: more, continuing: new Set(), origin, runs: [...runs, run(1, 1, 3, 12, 1)] });
    // Position 2 is covered by position 1, so the run (positions 2 and 3) marks words 1 and 3.
    const marked = input.words.filter((item) => item.keep === 4).map((item) => `${item.ayah}:${item.position}`);
    expect(marked).toEqual(['1:1', '1:3']);
    expect(input.words.find((item) => item.ayah === 2)!.keep ?? null).toBeNull();
  });

  it('joins the further runs of a block (kind 6) to the block its ayah names, as one unit', () => {
    const title = block(1, { count: 3, first: 40, ord: 2 });
    const more = [block(6, { ayah: 2, count: 2, first: 50, ord: 0 }), block(6, { ayah: 2, count: 1, first: 60, ord: 1 })];
    const input = buildLayoutInput({ blocks: [title, ...more], boxes, continuing: new Set(), origin, runs });
    expect(input.blocks).toHaveLength(1);
    expect(input.blocks[0]!.more).toEqual([
      { count: 2, first: 50 },
      { count: 1, first: 60 },
    ]);
  });

  it('marks a word kept with the next word across an ayah mark (kind 7), and no other', () => {
    const link = block(7, { ayah: 1, count: 1, first: 2, ord: 0, surah: 1 });
    const input = buildLayoutInput({ blocks: [link], boxes, continuing: new Set(), origin, runs });
    // Position 2 is covered by position 1.
    expect(input.words.filter((item) => item.keepNext === true).map((item) => `${item.ayah}:${item.position}`)).toEqual(['1:1']);
  });

  it('is empty when the pack has no contour rows', () => {
    const input = buildLayoutInput({ blocks: [], boxes, continuing: new Set(), origin, runs: [] });
    expect(input.words).toEqual([]);
  });
});
