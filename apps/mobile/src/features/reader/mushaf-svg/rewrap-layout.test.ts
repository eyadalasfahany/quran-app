// Synthetic pages only: FIXTURE — not artwork. Words, blocks and bands are invented numbers.
import {
  breakParagraph,
  CENTRED_BELOW,
  GAP_BETWEEN_LINES,
  layoutPage,
  runsOf,
  type BlockUnit,
  type HizbUnit,
  type LayoutInput,
  type WordUnit,
} from './rewrap-layout';

const EPS = 1e-6;

/** The printed band of a line: 36.3 units tall, 40 apart (line 0 at 20, line 1 at 60, …). */
const bandOf = (line: number) => ({ y0: 20 + line * 40, y1: 20 + line * 40 + 36.3 });

/** A band-aligned word. Ayah defaults to 1; position is the word's own. */
function word(
  position: number,
  line: number,
  x0: number,
  x1: number,
  extra: Partial<Pick<WordUnit, 'surah' | 'ayah' | 'covers' | 'mark' | 'sajda' | 'keep' | 'keepNext'>> = {},
): WordUnit {
  const band = bandOf(line);
  return {
    ayah: 1,
    box: { x0, x1, y0: band.y0, y1: band.y1 },
    covers: 1,
    line,
    mark: null,
    position,
    runs: [{ count: 1, first: position, loose: false }],
    sajda: null,
    surah: 1,
    ...extra,
  };
}

function page(words: WordUnit[], extra: Partial<LayoutInput> = {}): LayoutInput {
  const lines = [...new Set(words.map((item) => item.line))];
  return { bands: new Map(lines.map((line) => [line, bandOf(line)])), blocks: [], words, ...extra };
}

/** Six 30-unit words on one printed line, 4 apart: the printed width B is 200 (from x 0 to 200). Ayahs 1 to 6. */
function fullLine(line: number, ayahBase = 0): WordUnit[] {
  return Array.from({ length: 6 }, (_, k) =>
    word(k + 1, line, k * 34, k * 34 + 30, { ayah: ayahBase + k + 1 }),
  );
}

/** A block between printed line 0 and line 1 (its centre is 58: after line 0 at 38, before line 1 at 78). */
const BETWEEN: BlockUnit = { bounds: { x0: 50, x1: 150, y0: 57, y1: 59 }, count: 1, first: 0 };

describe('breakParagraph (minimum raggedness, synthetic widths)', () => {
  it('breaks where the squared slack of the non-last lines is least', () => {
    // Five 40-unit pieces, 1.6 apart, on a 170 line: four fit (164.8), so the best split is 4 + 1.
    expect(breakParagraph([40, 40, 40, 40, 40], [1.6, 1.6, 1.6, 1.6], 170)).toEqual([
      { first: 0, last: 3 },
      { first: 4, last: 4 },
    ]);
  });

  it('keeps one line when the paragraph fits', () => {
    expect(breakParagraph([40, 40], [1.6], 170)).toEqual([{ first: 0, last: 1 }]);
  });

  it('lets a unit wider than the line go alone', () => {
    expect(breakParagraph([200, 40], [1.6], 170)).toEqual([
      { first: 0, last: 0 },
      { first: 1, last: 1 },
    ]);
  });

  it('never makes a multi-unit line wider than the line', () => {
    const extents = Array.from({ length: 30 }, (_, k) => 10 + (k % 7) * 3);
    const gaps = extents.slice(1).map(() => 1.6);
    for (const line of breakParagraph(extents, gaps, 120)) {
      let width = 0;
      for (let k = line.first; k <= line.last; k += 1) {
        width += extents[k]!;
        if (k > line.first) {
          width += gaps[k - 1]!;
        }
      }
      expect(line.first === line.last || width <= 120 + EPS).toBe(true);
    }
  });
});

describe('layoutPage: justification and the gap cap', () => {
  it('justifies a non-last line to the full width when its gaps stay under the cap', () => {
    // Zoom 2: A = 100. Three 30-unit words with 4-unit gaps are 98 (spread 1). Two paragraphs: the block keeps line 0 separate.
    const layout = layoutPage(page([...fullLine(0), ...fullLine(1, 10)], { blocks: [BETWEEN] }), 2);
    const first = layout.lines[0]!.wordRects;
    expect(Math.max(...first.map((rect) => rect.x1))).toBeCloseTo(100, 4);
    expect(Math.min(...first.map((rect) => rect.x0))).toBeCloseTo(0, 4);
  });

  it('keeps a line ragged (right-aligned, natural gaps) when its gaps would pass the cap', () => {
    // Line 0 is 200 wide (B), so A = 100 at zoom 2. Line 1 holds 40, 40 and 25-unit pieces with no printed gap:
    // the best break is [40, 40] + [25]; the first line would need 20 units of slack per gap (> 6), so it stays ragged.
    const words = [
      word(1, 0, 0, 200, { ayah: 9 }),
      word(2, 1, 70, 110, { ayah: 1 }),
      word(3, 1, 30, 70, { ayah: 2 }),
      word(4, 1, 5, 30, { ayah: 3 }),
    ];
    const layout = layoutPage(page(words, { blocks: [BETWEEN] }), 2);
    const a = layout.wordRect(1, 1, 2)!;
    const b = layout.wordRect(1, 2, 3)!;
    expect(a.x1).toBeCloseTo(100, 4);
    // Ragged: b ends where a starts (natural gap 0), not 20 units further left as a justified line would.
    expect(b.x1).toBeCloseTo(a.x0, 4);
  });

  it('justifies a paragraph last line only when the printed last line was full', () => {
    // Zoom 2, A = 100. Three 30-unit words with 4-unit printed gaps: the natural line is 98 (spread 1).
    const threeWords = (line: number, ayahBase: number, spanEnd: number) => [
      word(1, line, 0, 30, { ayah: ayahBase + 1 }),
      word(2, line, 34, 64, { ayah: ayahBase + 2 }),
      word(3, line, spanEnd - 30, spanEnd, { ayah: ayahBase + 3 }),
    ];
    // Full printed last line (x from 0 to 200): justified, so the gap grows from 4 to 5.
    const full = layoutPage(page([...fullLine(0), ...threeWords(1, 20, 200)], { blocks: [BETWEEN] }), 2);
    const fullLast = full.lines[full.lines.length - 1]!.wordRects;
    expect(Math.max(...fullLast.map((rect) => rect.x1))).toBeCloseTo(100, 4);
    expect(Math.min(...fullLast.map((rect) => rect.x0))).toBeCloseTo(0, 4);

    // Short printed last line (x from 0 to 98): right-aligned, the printed gap of 4 is kept.
    const short = layoutPage(page([...fullLine(0), ...threeWords(1, 20, 98)], { blocks: [BETWEEN] }), 2);
    const shortLast = short.lines[short.lines.length - 1]!.wordRects;
    expect(Math.max(...shortLast.map((rect) => rect.x1))).toBeCloseTo(100, 4);
    expect(Math.min(...shortLast.map((rect) => rect.x0))).toBeCloseTo(2, 4);
  });

  it('keeps a negative printed gap between neighbours', () => {
    // Printed gap −1 between two words (the right one overlaps the left by 1). Alone on a ragged line, it stays −1.
    const words = [
      word(1, 0, 0, 200, { ayah: 9 }),
      word(2, 1, 60, 90, { ayah: 1 }),
      word(3, 1, 31, 61, { ayah: 2 }),
    ];
    const layout = layoutPage(page(words, { blocks: [BETWEEN] }), 1);
    const right = layout.wordRect(1, 1, 2)!;
    const left = layout.wordRect(1, 2, 3)!;
    expect(right.x0 - left.x1).toBeCloseTo(-1, 4);
  });

  it('uses the line-break gap between units that were not neighbours', () => {
    expect(GAP_BETWEEN_LINES).toBe(1.6);
  });
});

describe('layoutPage: blocks, centring and paragraphs', () => {
  it('a block splits the paragraph and is centred on the text column', () => {
    const layout = layoutPage(page([...fullLine(0), ...fullLine(1, 10)], { blocks: [BETWEEN] }), 2);
    const block = layout.placed.find((item) => item.unit === BETWEEN)!;
    // The text column is [0, 200] in printed units: its centre is 100, which is 50 at zoom 2.
    expect(block.cx + block.dx).toBeCloseTo(50, 4);
  });

  it('scales a block that is wider than the line, keeping it on the centre', () => {
    const wide: BlockUnit = { bounds: { x0: 0, x1: 400, y0: 0, y1: 16 }, count: 1, first: 0 };
    const layout = layoutPage(page(fullLine(0), { blocks: [wide] }), 2);
    const placed = layout.placed.find((item) => item.unit === wide)!;
    expect(placed.scale).toBeCloseTo(100 / 400, 6);
    expect(placed.cx + placed.dx).toBeCloseTo(50, 4);
  });

  it('centres a paragraph whose non-last printed lines are short', () => {
    // Line 0 is 60 wide (under 80% of B = 200), line 1 is full: line 0 is centred on (0 + 100) / 2 = 50.
    expect(60 / 200).toBeLessThan(CENTRED_BELOW);
    const short = [word(1, 0, 70, 80, { ayah: 1 }), word(2, 0, 80, 90, { ayah: 2 }), word(3, 0, 90, 130, { ayah: 3 })];
    const layout = layoutPage(page([...short, ...fullLine(1, 10)]), 2);
    const laid = layout.lines[0]!.wordRects;
    const centre = (Math.min(...laid.map((rect) => rect.x0)) + Math.max(...laid.map((rect) => rect.x1))) / 2;
    expect(centre).toBeCloseTo(50, 4);
  });
});

describe('layoutPage: covers, marks, sajda fusion, regions and hizb', () => {
  it('a word with covers 2 is one placed word and both positions share its rectangle', () => {
    const layout = layoutPage(page([word(3, 0, 0, 40, { ayah: 2, covers: 2 }), word(5, 0, 50, 90, { ayah: 2 })]), 2);
    const first = layout.wordRect(1, 2, 3)!;
    const second = layout.wordRect(1, 2, 4)!;
    expect([second.x0, second.x1, second.y0, second.y1, second.line]).toEqual([first.x0, first.x1, first.y0, first.y1, first.line]);
    // At A = 45 the two 40-unit words cannot share a line, so the covering word is on its own laid line.
    expect(layout.wordRect(1, 2, 3)!.line).not.toBe(layout.wordRect(1, 2, 5)!.line);
    expect(layout.placed.filter((item) => 'box' in item.unit)).toHaveLength(2);
  });

  it('the ayah ornament travels with its word and stays inside the region', () => {
    const mark = { bounds: { x0: 42, x1: 50, y0: 20, y1: 30 }, count: 1, first: 9 };
    const words = [word(1, 0, 0, 40, { ayah: 1, mark }), word(2, 0, 150, 200, { ayah: 2 })];
    const layout = layoutPage(page(words), 1);
    const region = layout.regions.find((item) => item.verseKey === '1:1')!;
    expect(region.bounds.x1 - region.bounds.x0).toBeGreaterThanOrEqual(50 - EPS);
    const unit = layout.placed.find((item) => 'box' in item.unit && item.unit.ayah === 1)!.unit;
    expect(runsOf(unit)).toEqual([
      { count: 1, first: 1, loose: false },
      { count: 1, first: 9 },
    ]);
  });

  it('fuses the words under a sajda line into one piece that keeps its printed offsets', () => {
    const sajda = { bounds: { x0: 20, x1: 100, y0: 20, y1: 21 }, count: 1, first: 99 };
    const words = [
      word(1, 0, 0, 30, { ayah: 1 }),
      word(2, 0, 30, 60, { ayah: 2, sajda }),
      word(3, 0, 60, 90, { ayah: 3 }),
      word(4, 0, 90, 120, { ayah: 4 }),
    ];
    const layout = layoutPage(page(words), 1);
    const b = layout.wordRect(1, 2, 2)!;
    const c = layout.wordRect(1, 3, 3)!;
    // B and C are one unit: C sits 30 units right of B, as printed, and on the same line.
    expect(c.x0 - b.x0).toBeCloseTo(30, 6);
    expect(c.y0).toBeCloseTo(b.y0, 6);
  });

  it('never breaks a line inside a keep-together run, and keeps its printed offsets', () => {
    // B = 132, so A = 66 at zoom 2: two 30-unit words with their 4-unit gap fit (64), three do not. Without the run the
    // break falls between words 2 and 3.
    const words = [word(1, 0, 0, 30), word(2, 0, 34, 64), word(3, 0, 68, 98), word(4, 0, 102, 132)];
    const apart = layoutPage(page(words), 2);
    expect(apart.wordRect(1, 1, 2)!.line).not.toBe(apart.wordRect(1, 1, 3)!.line);

    const kept = [word(1, 0, 0, 30), word(2, 0, 34, 64, { keep: 0 }), word(3, 0, 68, 98, { keep: 0 }), word(4, 0, 102, 132)];
    const layout = layoutPage(page(kept), 2);
    const b = layout.wordRect(1, 1, 2)!;
    const c = layout.wordRect(1, 1, 3)!;
    expect(c.line).toBe(b.line);
    expect(c.x0 - b.x0).toBeCloseTo(34, 6);
  });

  it('joins a keep-together run and a sajda piece that share a word into one piece', () => {
    const sajda = { bounds: { x0: 0, x1: 30, y0: 20, y1: 21 }, count: 1, first: 99 };
    const words = [word(1, 0, 0, 30, { sajda }), word(2, 0, 34, 64, { keep: 1 }), word(3, 0, 68, 98, { keep: 1 })];
    const both = [word(1, 0, 0, 30, { keep: 1, sajda }), word(2, 0, 34, 64, { keep: 1 }), word(3, 0, 68, 98)];
    const layout = layoutPage(page(both), 1);
    const a = layout.wordRect(1, 1, 1)!;
    const b = layout.wordRect(1, 1, 2)!;
    expect(b.x0 - a.x0).toBeCloseTo(34, 6);
    expect(layoutPage(page(words), 1).placed).toHaveLength(3);
  });

  it('draws every run of a block that the source draws in several runs', () => {
    expect(runsOf({ bounds: BETWEEN.bounds, count: 1, first: 0, more: [{ count: 2, first: 7 }] })).toEqual([
      { count: 1, first: 0 },
      { count: 2, first: 7 },
    ]);
  });

  it('keeps a word marked keepNext with the next word in reading order, across an ayah', () => {
    const words = [word(1, 0, 0, 30, { ayah: 2 }), word(9, 0, 34, 64, { ayah: 1, keepNext: true }), word(8, 0, 68, 98, { ayah: 1 }), word(7, 0, 102, 132, { ayah: 1 })];
    const layout = layoutPage(page(words), 2);
    const last = layout.wordRect(1, 1, 9)!;
    const first = layout.wordRect(1, 2, 1)!;
    expect(first.line).toBe(last.line);
    expect(last.x0 - first.x0).toBeCloseTo(34, 6);
  });

  it('a sajda piece wider than the line scales as one unit, keeping the ratio of its words', () => {
    // B = 140 at zoom 2, so A = 70. The sajda line is 200 wide: the piece scales by 70 / 200 about its centre.
    const sajda = { bounds: { x0: 0, x1: 200, y0: 20, y1: 21 }, count: 1, first: 99 };
    const words = [word(1, 0, 0, 60, { ayah: 1, sajda }), word(2, 0, 80, 140, { ayah: 2 })];
    const layout = layoutPage(page(words), 2);
    const a = layout.wordRect(1, 1, 1)!;
    const b = layout.wordRect(1, 2, 2)!;
    expect(b.x0 - a.x0).toBeCloseTo(80 * (70 / 200), 4);
  });

  it('a region unions one ayah on a laid-out line into one rectangle', () => {
    const layout = layoutPage(page([word(1, 0, 0, 30, { ayah: 5 }), word(2, 0, 40, 70, { ayah: 5 }), word(3, 0, 150, 200, { ayah: 6 })]), 1);
    const region = layout.regions.find((item) => item.verseKey === '1:5')!;
    expect(region.lines).toHaveLength(1);
    // Two words 30 wide with a printed gap of 10, clamped to the 4-unit maximum: 30 + 4 + 30.
    expect(region.bounds.x1 - region.bounds.x0).toBeCloseTo(64, 6);
  });

  it('marks a region continuing from the previous page', () => {
    const layout = layoutPage(page([word(1, 0, 0, 30, { ayah: 5 })], { continuing: new Set(['1:5']) }), 1);
    expect(layout.regions[0]!.continues).toBe(true);
  });

  it('places a hizb ornament in the left margin, beside the line of its anchor word', () => {
    // Text spans [50, 250]; the hizb is left of it. The left margin is 50 / z; at z = 2 its centre is 12.5.
    const hizb: HizbUnit = { bounds: { x0: 10, x1: 30, y0: 62, y1: 82 }, count: 1, first: 77, surah: 0, ayah: 0 };
    const words = [
      word(1, 0, 50, 100, { ayah: 1 }),
      word(2, 0, 150, 250, { ayah: 2 }),
      word(3, 1, 50, 100, { ayah: 3 }),
      word(4, 1, 150, 250, { ayah: 4 }),
    ];
    const layout = layoutPage(page(words, { hizbs: [hizb] }), 2);
    const placed = layout.placed.find((item) => item.unit === hizb)!;
    expect(placed.cx + placed.dx).toBeCloseTo(50 / (2 * 2), 4);
    // The nearest word is word 3 (distance 20), so the ornament is centred on the laid line that holds it.
    const anchor = layout.wordRect(1, 3, 3)!;
    const line = layout.lines[anchor.line]!;
    expect(placed.cy + placed.dy).toBeCloseTo((line.y0 + line.y1) / 2, 4);
  });

  it('places a hizb ornament in the right margin when it sits right of the text', () => {
    const words = [word(1, 0, 50, 100, { ayah: 1 }), word(2, 0, 150, 250, { ayah: 2 })];
    const hizb: HizbUnit = { bounds: { x0: 320, x1: 340, y0: 20, y1: 40 }, count: 1, first: 5, surah: 0, ayah: 0 };
    const layout = layoutPage(page(words, { hizbs: [hizb] }), 2);
    const placed = layout.placed.find((item) => item.unit === hizb)!;
    // Right margin: from 250 to 345 in printed units, so 95 / 2 = 47.5 layout units; its centre is 125 + 23.75.
    expect(placed.cx + placed.dx).toBeCloseTo(125 + 95 / 2 / 2, 4);
  });
});

describe('layoutPage: page size and invariants', () => {
  it('the picture is 345 / z units wide', () => {
    const layout = layoutPage(page(fullLine(0)), 1.5);
    expect(layout.unitsWidth * 1.5).toBeCloseTo(345, 6);
  });

  it('is deterministic', () => {
    const words = [...fullLine(0), ...fullLine(1, 10)];
    const pick = (layout: ReturnType<typeof layoutPage>) => ({ lines: layout.lines, placed: layout.placed, regions: layout.regions, unitsHeight: layout.unitsHeight });
    expect(pick(layoutPage(page(words), 1.75))).toEqual(pick(layoutPage(page(words), 1.75)));
  });

  it('keeps every word inside the text column', () => {
    const words: WordUnit[] = [];
    for (let line = 0; line < 12; line += 1) {
      for (let k = 0; k < 7; k += 1) {
        const start = ((k * 7 + line * 3) % 40) * 5;
        words.push(word(line * 10 + k + 1, line, start, start + 12 + (k % 4) * 4, { ayah: line * 10 + k + 1 }));
      }
    }
    const layout = layoutPage(page(words), 1.5);
    const minX = Math.min(...words.map((item) => item.box.x0));
    const maxX = Math.max(...words.map((item) => item.box.x1));
    for (const rect of layout.lines.flatMap((line) => line.wordRects)) {
      expect(rect.x0).toBeGreaterThanOrEqual(minX / 1.5 - EPS);
      expect(rect.x1).toBeLessThanOrEqual(maxX / 1.5 + EPS);
    }
  });

  it('an empty page lays out to nothing but its size', () => {
    const layout = layoutPage({ blocks: [], bands: new Map(), words: [] }, 2);
    expect(layout.placed).toEqual([]);
    expect(layout.unitsWidth).toBeCloseTo(172.5, 6);
    expect(Number.isFinite(layout.unitsHeight)).toBe(true);
  });
});
