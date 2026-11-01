import type { TextPiece } from './recited-text';
import { lineForOffset } from './word-follow';

/*
 * Pure: the geometry of the sliding recited-word pill (ADR 0039). It turns the ayah's token widths and the Text's
 * laid-out lines into boxes, so the pill can sit behind the word. None of them changes the Quran text.
 */

/** One laid-out line, as onTextLayout reports it (the fields used here). */
export type PillLine = { text: string; x: number; y: number; width: number; height: number; ascender: number; descender: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type TokenRect = Rect & { line: number };

/**
 * The drawn tokens of an ayah (every non-separator piece: words and waqf marks), in text order, with their char offsets.
 * Pieces that carry no text are skipped.
 */
export function tokensOf(pieces: readonly TextPiece[]): { text: string; offset: number; recited: boolean }[] {
  const tokens: { text: string; offset: number; recited: boolean }[] = [];
  let offset = 0;
  for (const piece of pieces) {
    if (!piece.separator && piece.text.length > 0) {
      tokens.push({ text: piece.text, offset, recited: piece.recited });
    }
    offset += piece.text.length;
  }
  return tokens;
}

/** Index among tokensOf() of the recited token, or -1. */
export function recitedTokenIndex(pieces: readonly TextPiece[]): number {
  return tokensOf(pieces).findIndex((token) => token.recited);
}

/**
 * Each token's box in the Text's own coordinates (physical x from the left). Quran text runs right to left, so on each
 * line the first token's right edge is line.x + line.width and the rest follow leftwards. The line's leftover width
 * (line.width − Σ token widths on it) is shared equally between the gaps between its tokens (covers the space width and
 * any justification); a one-token line has no gap. y/height are the line's. A token whose offset falls on no line, or a
 * missing width, gives null. A missing width also nulls the other tokens on its line: their positions depend on it.
 */
export function tokenRects(
  tokens: readonly { offset: number }[],
  widths: readonly (number | undefined)[],
  lines: readonly PillLine[],
): (TokenRect | null)[] {
  const result: (TokenRect | null)[] = tokens.map(() => null);
  const byLine = new Map<number, number[]>();

  tokens.forEach((token, index) => {
    const line = lineForOffset(lines, token.offset);
    if (line < 0) {
      return;
    }
    const group = byLine.get(line) ?? [];
    group.push(index);
    byLine.set(line, group);
  });

  for (const [lineIndex, indices] of byLine) {
    const line = lines[lineIndex]!;
    const lineWidths = indices.map((index) => widths[index]);
    if (lineWidths.some((width) => width === undefined)) {
      continue;
    }
    const known = lineWidths as number[];
    const used = known.reduce((sum, width) => sum + width, 0);
    const gap = indices.length > 1 ? (line.width - used) / (indices.length - 1) : 0;

    let right = line.x + line.width;
    indices.forEach((tokenIndex, position) => {
      const width = known[position]!;
      result[tokenIndex] = { height: line.height, line: lineIndex, width, x: right - width, y: line.y };
      right -= width + gap;
    });
  }

  return result;
}

/**
 * The pill around a token: padH added on both sides; vertically the glyph box (ascender + |descender|) centred in the
 * line, plus padV above and below, never taller than the line.
 */
export function pillRect(token: TokenRect, line: PillLine, padH: number, padV: number): Rect {
  const glyph = line.ascender + Math.abs(line.descender);
  const height = Math.min(glyph + 2 * padV, line.height);
  const glyphTop = line.y + (line.height - glyph) / 2;
  const top = Math.min(Math.max(glyphTop - padV, line.y), line.y + line.height - height);
  return { height, width: token.width + 2 * padH, x: token.x - padH, y: top };
}

/**
 * Keeps the pill inside the Text's box: a word at a line's edge would otherwise push its padding past the ayah's wash
 * (Focus draws the wash on the Text's own box). An unknown width (0) leaves it as it is.
 */
export function clampToWidth(rect: Rect, width: number): Rect {
  if (width <= 0) {
    return rect;
  }
  const left = Math.max(0, rect.x);
  const right = Math.min(width, rect.x + rect.width);
  return { ...rect, width: Math.max(0, right - left), x: left };
}

/** 'slide' when both are known and on the same line, else 'jump'. */
export function pillMove(from: TokenRect | null, to: TokenRect | null): 'slide' | 'jump' {
  if (from === null || to === null) {
    return 'jump';
  }
  return from.line === to.line ? 'slide' : 'jump';
}
