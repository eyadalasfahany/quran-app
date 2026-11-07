import type { ColorTokens } from '@quran/design-tokens';

// Pure data for CollectionCover (screens/frames/hadith, HadithCollCovers*). Slugs are the ten canonical
// collections of ADR 0042; a null or unknown slug draws the neutral cover with the star.
export const coverSlugs = [
  'bukhari',
  'muslim',
  'abudawud',
  'tirmidhi',
  'ibnmajah',
  'nasai',
  'malik',
  'nawawi40',
  'qudsi40',
  'shahwaliullah40',
] as const;

export type CoverSlug = (typeof coverSlugs)[number];

export type CoverSize = 'list' | 'header' | 'compact';

export type CoverOrnamentShape = 'star' | 'rings' | 'diamond';

// Keys of ColorTokens that are binding grounds (plus the neutral fallback).
export type CoverGround = Extract<keyof ColorTokens, 'coverGreen' | 'coverMaroon' | 'coverNavy' | 'coverBrown' | 'coverNeutral'>;

export type CoverMetrics = {
  width: number;
  height: number;
  spineWidth: number;
  pageEdgeWidth: number;
  frameInsetY: number;
  frameInsetStart: number;
  frameInsetEnd: number;
  ornamentSize: number;
  ornamentTop: number;
  ornamentStart: number;
  titleSize: number;
  titleBottom: number;
  titleInsetStart: number;
  titleInsetEnd: number;
};

// Sizes in dp, from the approved frames: list is the 56 × 75 thumbnail, header the 96 × 128 cover, compact the 40 × 53 cover.
export const coverMetrics: Record<CoverSize, CoverMetrics> = {
  list: {
    width: 56,
    height: 75,
    spineWidth: 6,
    pageEdgeWidth: 2,
    frameInsetY: 7,
    frameInsetStart: 10,
    frameInsetEnd: 6,
    ornamentSize: 19,
    ornamentTop: 16,
    ornamentStart: 20,
    titleSize: 11,
    titleBottom: 12,
    titleInsetStart: 13,
    titleInsetEnd: 9,
  },
  header: {
    width: 96,
    height: 128,
    spineWidth: 11,
    pageEdgeWidth: 4,
    frameInsetY: 7,
    frameInsetStart: 15,
    frameInsetEnd: 8,
    ornamentSize: 33,
    ornamentTop: 28,
    ornamentStart: 35,
    titleSize: 12,
    titleBottom: 12,
    titleInsetStart: 18,
    titleInsetEnd: 11,
  },
  compact: {
    width: 40,
    height: 53,
    spineWidth: 5,
    pageEdgeWidth: 2,
    frameInsetY: 7,
    frameInsetStart: 9,
    frameInsetEnd: 6,
    ornamentSize: 14,
    ornamentTop: 12,
    ornamentStart: 14,
    titleSize: 11,
    titleBottom: 12,
    titleInsetStart: 12,
    titleInsetEnd: 9,
  },
};

export const coverGrounds: Record<CoverSlug, CoverGround> = {
  bukhari: 'coverGreen',
  nasai: 'coverGreen',
  shahwaliullah40: 'coverGreen',
  muslim: 'coverMaroon',
  malik: 'coverMaroon',
  qudsi40: 'coverMaroon',
  abudawud: 'coverNavy',
  nawawi40: 'coverNavy',
  tirmidhi: 'coverBrown',
  ibnmajah: 'coverBrown',
};

export const coverOrnaments: Record<CoverSlug, CoverOrnamentShape> = {
  bukhari: 'star',
  nawawi40: 'star',
  qudsi40: 'star',
  muslim: 'rings',
  tirmidhi: 'rings',
  nasai: 'rings',
  abudawud: 'diamond',
  ibnmajah: 'diamond',
  malik: 'diamond',
  shahwaliullah40: 'diamond',
};

export const fallbackGround: CoverGround = 'coverNeutral';
export const fallbackOrnament: CoverOrnamentShape = 'star';

export function isCoverSlug(value: string | null | undefined): value is CoverSlug {
  return typeof value === 'string' && (coverSlugs as readonly string[]).includes(value);
}

export function coverGround(slug: string | null | undefined): CoverGround {
  return isCoverSlug(slug) ? coverGrounds[slug] : fallbackGround;
}

export function coverOrnament(slug: string | null | undefined): CoverOrnamentShape {
  return isCoverSlug(slug) ? coverOrnaments[slug] : fallbackOrnament;
}
