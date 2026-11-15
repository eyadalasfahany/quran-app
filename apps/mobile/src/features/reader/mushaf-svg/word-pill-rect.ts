// The recited word's pill, in page units (ADR 0090 decision 8, the approved Mushaf frame). Pure.
import type { WordBox } from '@/core/mushaf-pack';

// Tuned against the frame's pill for the same word (plan D9). Zero until a real pack's boxes are compared.
export const PILL_PAD_X = 0;
export const PILL_PAD_Y = 0;

export type PillRect = { x: number; y: number; w: number; h: number };

/** The word's box, inflated by the pill padding. */
export function pillRectFor(box: WordBox): PillRect {
  return {
    h: box.y1 - box.y0 + 2 * PILL_PAD_Y,
    w: box.x1 - box.x0 + 2 * PILL_PAD_X,
    x: box.x0 - PILL_PAD_X,
    y: box.y0 - PILL_PAD_Y,
  };
}

/**
 * The pill slides (ADR 0039 decision 4) only to the next word on the same line of the same page; a new line, a new
 * ayah or a new page jumps. `prev` is null across a page change, so the caller passes null there.
 */
export function pillMove(prev: WordBox | null, next: WordBox | null): 'slide' | 'jump' {
  if (prev === null || next === null) {
    return 'jump';
  }
  return prev.line === next.line ? 'slide' : 'jump';
}
