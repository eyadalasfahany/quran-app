import type { SeerahAreaLabel, SeerahMapZoom } from '../types';

// The pack carries each level's viewbox, art and pin positions; the zoom limits and the faint region caption are the app's own
// (frames SeerahMapRegion, SeerahMapMakkah, SeerahMapMadinah). The caption is the name of the region place, not new text.

export const REGION_LEVEL_ID = 'region';

const REGION_ZOOM: SeerahMapZoom = { cityThreshold: 1.8, default: 0.6, fanOut: null, max: 2.4, min: 0.32 };
const CITY_ZOOM: SeerahMapZoom = { cityThreshold: null, default: 0.7, fanOut: 1.8, max: 2.6, min: 0.4 };

export function zoomForLevel(levelId: string): SeerahMapZoom {
  return levelId === REGION_LEVEL_ID ? REGION_ZOOM : CITY_ZOOM;
}

/** The area caption of a level, from the region place's own name. */
export function areaLabelsFor(levelId: string, regionName: string | null): SeerahAreaLabel[] {
  if (levelId !== REGION_LEVEL_ID || regionName === null) {
    return [];
  }
  return [{ id: 'area.region', nameAr: regionName, rotate: -50, x: 758.2, y: 710 }];
}

/** The pack's milestone key `revelation` is the app's `bitha` (the timeline mark and its i18n label). */
export function milestoneKey(packKey: string): string {
  return packKey === 'revelation' ? 'bitha' : packKey;
}
