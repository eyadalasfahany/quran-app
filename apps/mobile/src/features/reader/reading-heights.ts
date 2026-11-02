import { size } from '@quran/design-tokens';

import type { QuranFont } from '@/core/theme';

import type { ReadingListMode } from './reading-list-types';

// Reading rows: the ayah's text estimate plus the 44 pt header row above it.
const READING_ROW_TEXT_ESTIMATE = 160;
export const READING_ROW_ESTIMATE = READING_ROW_TEXT_ESTIMATE + size.touchTarget;

export type HeightCacheKey = string;

export function heightCacheSignature(width: number, fontScale: number, mode: ReadingListMode, font: QuranFont): string {
  return `${mode}:${width}:${fontScale}:${font}`;
}

export class ReadingHeightCache {
  private readonly heights = new Map<HeightCacheKey, number>();
  private signature: string | null = null;

  clearForSignature(nextSignature: string): void {
    if (this.signature === nextSignature) {
      return;
    }
    this.heights.clear();
    this.signature = nextSignature;
  }

  get(rowKey: string): number | undefined {
    return this.heights.get(rowKey);
  }

  set(rowKey: string, height: number): void {
    this.heights.set(rowKey, height);
  }

  estimate(mode: ReadingListMode, viewportHeight: number): number {
    return estimateReadingRowHeight(mode, viewportHeight);
  }
}

export function estimateReadingRowHeight(mode: ReadingListMode, viewportHeight: number): number {
  if (mode === 'focus') {
    return viewportHeight;
  }
  return READING_ROW_ESTIMATE;
}
