import type { ReadingListMode } from './reading-list-types';

export type HeightCacheKey = string;

export function heightCacheSignature(
  width: number,
  fontScale: number,
  translationResourceIds: readonly number[],
  mode: ReadingListMode,
): string {
  const translations = translationResourceIds.length === 0 ? '-' : translationResourceIds.join(',');
  return `${mode}:${width}:${fontScale}:${translations}`;
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
  return 160;
}
