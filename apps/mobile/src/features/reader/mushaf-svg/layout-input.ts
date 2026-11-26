// Pack rows → the layout's units (ADR 0090 step 13, B1 and B5). Pure. Every rectangle is moved from the raw viewBox
// space into the zero-origin space of the artwork (the pictures are baked to zero), as useMushafPageLoader does for
// regions and boxes. A word with no contour rows joins the word before it in its ayah (covers), as 15:7 does.
import type { ContourBlock, WordBox, WordContourRun } from '@/core/mushaf-pack';

import type { BlockUnit, HizbUnit, LayoutInput, LayoutRun, WordUnit } from './rewrap-layout';
import type { Rect } from './region-geometry';

type Input = {
  boxes: readonly WordBox[];
  runs: readonly WordContourRun[];
  blocks: readonly ContourBlock[];
  origin: { x: number; y: number };
  continuing: ReadonlySet<string>;
};

const keyOf = (surah: number, ayah: number) => `${surah}:${ayah}`;

export function buildLayoutInput({ boxes, runs, blocks, origin, continuing }: Input): LayoutInput {
  const shift = (rect: { x0: number; y0: number; x1: number; y1: number }): Rect => ({
    x0: rect.x0 - origin.x,
    x1: rect.x1 - origin.x,
    y0: rect.y0 - origin.y,
    y1: rect.y1 - origin.y,
  });
  const shiftBlock = (block: ContourBlock): Rect => shift(block);

  const runsByWord = new Map<string, LayoutRun[]>();
  for (const run of runs) {
    const key = `${run.surah}:${run.ayah}:${run.position}`;
    runsByWord.set(key, [...(runsByWord.get(key) ?? []), { first: run.first, count: run.count, loose: run.loose }]);
  }

  const words: WordUnit[] = [];
  const lastUnitOfAyah = new Map<string, WordUnit>();
  const ordered = [...boxes].sort((a, b) => a.surah - b.surah || a.ayah - b.ayah || a.position - b.position);
  for (const box of ordered) {
    const own = runsByWord.get(`${box.surah}:${box.ayah}:${box.position}`);
    if (own !== undefined && own.length > 0) {
      const unit: WordUnit = {
        ayah: box.ayah,
        box: shift(box),
        covers: 1,
        line: box.line,
        mark: null,
        position: box.position,
        runs: own,
        sajda: null,
        surah: box.surah,
      };
      words.push(unit);
      lastUnitOfAyah.set(keyOf(box.surah, box.ayah), unit);
    } else {
      // No rows of its own: the word is the one before it in its ayah, placed once (15:7). With no word before it, it is not drawn.
      const leader = lastUnitOfAyah.get(keyOf(box.surah, box.ayah));
      if (leader !== undefined) {
        leader.covers += 1;
      }
    }
  }

  const blockUnits: BlockUnit[] = [];
  const hizbs: HizbUnit[] = [];
  for (const block of blocks) {
    const bounds = shift(block);
    if (block.kind === 1) {
      blockUnits.push({ bounds, count: block.count, first: block.first });
    } else if (block.kind === 2) {
      // The ayah ornament follows the last word of its ayah on this page.
      const word = lastUnitOfAyah.get(keyOf(block.surah, block.ayah));
      if (word !== undefined && word.mark === null) {
        word.mark = { bounds, count: block.count, first: block.first };
      }
    }
  }

  // A hizb ornament is several kind-4 rows (one per contour, ord in order) on the same anchor ayah, with contiguous
  // subpaths (Part A: 8 rows for each of the three on this riwayah's pages). Rows that continue the last one join it.
  const hizbRows = blocks.filter((block) => block.kind === 4).sort((a, b) => a.ord - b.ord);
  const groups: { surah: number; ayah: number; first: number; count: number; rows: ContourBlock[] }[] = [];
  for (const row of hizbRows) {
    const last = groups[groups.length - 1];
    if (last !== undefined && last.surah === row.surah && last.ayah === row.ayah && row.first === last.first + last.count) {
      last.count += row.count;
      last.rows.push(row);
    } else {
      groups.push({ ayah: row.ayah, count: row.count, first: row.first, rows: [row], surah: row.surah });
    }
  }
  for (const group of groups) {
    const rects = group.rows.map(shiftBlock);
    hizbs.push({
      ayah: group.ayah,
      bounds: {
        x0: Math.min(...rects.map((rect) => rect.x0)),
        x1: Math.max(...rects.map((rect) => rect.x1)),
        y0: Math.min(...rects.map((rect) => rect.y0)),
        y1: Math.max(...rects.map((rect) => rect.y1)),
      },
      count: group.count,
      first: group.first,
      surah: group.surah,
    });
  }

  // A sajda line belongs to the word it lies over most (its run is already in that word's runs).
  for (const block of blocks) {
    if (block.kind !== 3) {
      continue;
    }
    const bounds = shift(block);
    let best: WordUnit | null = null;
    let bestOverlap = 0;
    for (const word of words) {
      const overlapX = Math.min(word.box.x1, bounds.x1) - Math.max(word.box.x0, bounds.x0);
      const overlapY = Math.min(word.box.y1, bounds.y1) - Math.max(word.box.y0, bounds.y0);
      if (overlapX > bestOverlap && overlapY > 0 && word.sajda === null) {
        best = word;
        bestOverlap = overlapX;
      }
    }
    if (best !== null) {
      best.sajda = { bounds, count: block.count, first: block.first };
    }
  }

  const bands = new Map<number, { y0: number; y1: number }>();
  for (const box of boxes) {
    const shifted = shift(box);
    const band = bands.get(box.line);
    bands.set(box.line, band === undefined ? { y0: shifted.y0, y1: shifted.y1 } : { y0: Math.min(band.y0, shifted.y0), y1: Math.max(band.y1, shifted.y1) });
  }

  return { bands, blocks: blockUnits, continuing, hizbs, words };
}
