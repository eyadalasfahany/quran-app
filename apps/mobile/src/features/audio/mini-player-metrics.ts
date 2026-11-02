import { MINI_PLAYER_BOTTOM_GAP } from '@/core/layout/tab-bar-clearance';

// The mini player's numbers, read from the two phone frames (quran-app-screens.html: #Main for tabs,
// #Mushaf and #Reading for reader). Padding is logical: the start edge is the right in Arabic, and the
// English frames mirror it. The tabs bar is the same on tablets as on phones (ADR 0051).
export type MiniPlayerVariant = 'tabs' | 'reader';

export type MiniPlayerMetrics = {
  height: number;
  paddingStart: number;
  paddingEnd: number;
  tileSize: number;
  tileRadius: number;
  /** The reciter's initial: brand on the tab frames, ink on the reader frames. */
  tileGlyph: 'brand' | 'ink';
  title: { variant: 'headline' | 'subhead'; weight: 600 };
  subtitle: { variant: 'caption' | 'label'; weight: 400 };
};

export const MINI_PLAYER_METRICS: Record<MiniPlayerVariant, MiniPlayerMetrics> = {
  tabs: {
    height: 64,
    paddingStart: 10,
    paddingEnd: 12,
    tileSize: 44,
    tileRadius: 14,
    tileGlyph: 'brand',
    title: { variant: 'headline', weight: 600 },
    subtitle: { variant: 'caption', weight: 400 },
  },
  reader: {
    height: 68,
    paddingStart: 12,
    paddingEnd: 10,
    tileSize: 46,
    tileRadius: 12,
    tileGlyph: 'ink',
    title: { variant: 'subhead', weight: 600 },
    subtitle: { variant: 'label', weight: 400 },
  },
};

/** Gap between the bar's children (tile, text, button) on both frames. */
export const MINI_PLAYER_GAP = 12;
/** Side inset of the floating bar from the screen edges. */
export const MINI_PLAYER_SIDE = 16;
/** The gold progress line along the top edge. */
export const MINI_PLAYER_PROGRESS_HEIGHT = 3;
/** The inline progress track (`.xw-progress`), used by the adhan sound rows: 3 high, radius 2, in the `line` track. */
export const MINI_PLAYER_INLINE_PROGRESS = { height: 3, radius: 2 } as const;
/** The play/pause button: a 44 pt circle with an 18 pt glyph. */
export const MINI_PLAYER_BUTTON_SIZE = 44;
export const MINI_PLAYER_GLYPH_SIZE = 18;

/** The reader bar's bottom edge, 28 above the bottom safe area (#Mushaf, #Reading: bottom 28). */
export const MINI_PLAYER_READER_BOTTOM = 28;
/** Bottom content inset of the reader's lists while the reader bar shows: the bar's footprint plus the gap. */
export const MINI_PLAYER_READER_FOOTPRINT = MINI_PLAYER_READER_BOTTOM + MINI_PLAYER_METRICS.reader.height + MINI_PLAYER_BOTTOM_GAP;
/** Bottom content inset of the tab screens while the tabs bar shows: the bar's height plus the gap. */
export const MINI_PLAYER_TABS_FOOTPRINT = MINI_PLAYER_METRICS.tabs.height + MINI_PLAYER_BOTTOM_GAP;

/**
 * The collapsed capsule (#ReadingMiniCollapsed): a 64 × 24 glass pill centred in an 88 × 44 hit area, whose
 * bottom edge sits 18 above the safe area. Its grabber is 28 × 4.
 */
export const MINI_PLAYER_CAPSULE = {
  bottom: 18,
  hitWidth: 88,
  hitHeight: 44,
  width: 64,
  height: 24,
  grabberWidth: 28,
  grabberHeight: 4,
} as const;

/** The collapsed footprint the lists and the resume pill clear: the hit area's bottom plus its height (18 + 44). */
export const MINI_PLAYER_CAPSULE_FOOTPRINT = MINI_PLAYER_CAPSULE.bottom + MINI_PLAYER_CAPSULE.hitHeight;

/** The chevron drawn at the top centre of the reader bar (#Reading, #ReadingMiniIdle): 16 × 8, 5 from the top, 70%. */
export const MINI_PLAYER_CHEVRON = { width: 16, height: 8, top: 5, opacity: 0.7 } as const;

/** How far a bar or capsule starts below its rest position when it switches in (the slide, not Reduce Motion). */
export const MINI_PLAYER_ENTER_OFFSET = 40;
