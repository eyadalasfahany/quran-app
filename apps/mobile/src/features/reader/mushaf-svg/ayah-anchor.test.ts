import type { PageRegion } from '@/core/mushaf-pack';

import { offsetForAyah, topAyahAt } from './ayah-anchor';
import { buildRegionGeometry, type PageRegionGeometry } from './region-geometry';

// Synthetic polygons in page units; no artwork.
const TWO_LINES = 'M 0 10 L 100 10 L 100 20 L 0 20 Z M 0 30 L 100 30 L 100 40 L 0 40 Z';
const SHARED_RIGHT = 'M 50 50 L 100 50 L 100 60 L 50 60 Z';
const SHARED_LEFT = 'M 0 50 L 50 50 L 50 60 L 0 60 Z';

function regionsOf(entries: readonly { surah: number; ayah: number; polygon: string; labelled: boolean }[]): PageRegionGeometry[] {
  const raw: PageRegion[] = entries.map((entry) => ({
    ayah: entry.ayah,
    labelX: entry.labelled ? 1 : null,
    labelY: entry.labelled ? 1 : null,
    polygon: entry.polygon,
    surah: entry.surah,
  }));
  return buildRegionGeometry(raw);
}

describe('offsetForAyah', () => {
  it('is the top of the first line, in screen units', () => {
    const regions = regionsOf([{ ayah: 1, labelled: true, polygon: TWO_LINES, surah: 1 }]);
    expect(offsetForAyah(regions, '1:1', 690)).toBe(20);
    expect(offsetForAyah(regions, '1:1', 345)).toBe(10);
  });

  it('is null for an ayah that continues from the page before, or is not on this page', () => {
    const regions = regionsOf([{ ayah: 2, labelled: false, polygon: TWO_LINES, surah: 1 }]);
    expect(offsetForAyah(regions, '1:2', 345)).toBeNull();
    expect(offsetForAyah(regions, '1:9', 345)).toBeNull();
  });
});

describe('topAyahAt', () => {
  it('returns the ayah of the first line at or below the point, across a two-line ayah', () => {
    const regions = regionsOf([{ ayah: 1, labelled: true, polygon: TWO_LINES, surah: 1 }]);
    expect(topAyahAt(regions, 0)).toBe('1:1');
    expect(topAyahAt(regions, 25)).toBe('1:1');
  });

  it('gives a line shared by two ayahs to the one read first (the right-hand one)', () => {
    const regions = regionsOf([
      { ayah: 2, labelled: true, polygon: SHARED_RIGHT, surah: 1 },
      { ayah: 3, labelled: true, polygon: SHARED_LEFT, surah: 1 },
    ]);
    expect(topAyahAt(regions, 45)).toBe('1:2');
  });

  it('is null when no line is at or below the point', () => {
    const regions = regionsOf([{ ayah: 1, labelled: true, polygon: TWO_LINES, surah: 1 }]);
    expect(topAyahAt(regions, 999)).toBeNull();
    expect(topAyahAt([], 0)).toBeNull();
  });

  it('reports a continuing region on the first line of the page', () => {
    const regions = regionsOf([
      { ayah: 5, labelled: false, polygon: 'M 0 0 L 100 0 L 100 8 L 0 8 Z', surah: 1 },
      { ayah: 6, labelled: true, polygon: TWO_LINES, surah: 1 },
    ]);
    expect(topAyahAt(regions, 0)).toBe('1:5');
  });
});
