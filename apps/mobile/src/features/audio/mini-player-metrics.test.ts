import {
  MINI_PLAYER_BUTTON_SIZE,
  MINI_PLAYER_CAPSULE,
  MINI_PLAYER_CAPSULE_FOOTPRINT,
  MINI_PLAYER_CHEVRON,
  MINI_PLAYER_GAP,
  MINI_PLAYER_METRICS,
  MINI_PLAYER_NOTICE_HEIGHT,
  MINI_PLAYER_PROGRESS_HEIGHT,
  MINI_PLAYER_READER_BOTTOM,
  MINI_PLAYER_READER_FOOTPRINT,
  MINI_PLAYER_READER_UNAVAILABLE_FOOTPRINT,
  MINI_PLAYER_READER_UNAVAILABLE_HEIGHT,
  MINI_PLAYER_TABS_FOOTPRINT,
} from './mini-player-metrics';

describe('MINI_PLAYER_METRICS', () => {
  it('matches the tab frames (#Main, #HomeAndroid)', () => {
    expect(MINI_PLAYER_METRICS.tabs).toEqual({
      height: 64,
      paddingStart: 10,
      paddingEnd: 12,
      tileSize: 44,
      tileRadius: 14,
      tileGlyph: 'brand',
      title: { variant: 'headline', weight: 600 },
      subtitle: { variant: 'caption', weight: 400 },
    });
  });

  it('matches the reader frames (#Mushaf, #Reading)', () => {
    expect(MINI_PLAYER_METRICS.reader).toEqual({
      height: 68,
      paddingStart: 12,
      paddingEnd: 10,
      tileSize: 46,
      tileRadius: 12,
      tileGlyph: 'ink',
      title: { variant: 'subhead', weight: 600 },
      subtitle: { variant: 'label', weight: 400 },
    });
  });

  it('uses the 12 pt gap, 44 pt button and 3 pt progress line the frames draw', () => {
    expect(MINI_PLAYER_GAP).toBe(12);
    expect(MINI_PLAYER_BUTTON_SIZE).toBe(44);
    expect(MINI_PLAYER_PROGRESS_HEIGHT).toBe(3);
  });
});

describe('clearance above the bar', () => {
  it('sets the reader bar 28 above the safe area, and its list inset at the footprint: 28 + 68 + 12', () => {
    expect(MINI_PLAYER_READER_BOTTOM).toBe(28);
    expect(MINI_PLAYER_READER_FOOTPRINT).toBe(108);
  });

  it('sets the unavailable bar at 24 + 46 + 10 + 44 + 12 = 136 high, and its list inset at 28 + 136 + 12 = 176', () => {
    expect(MINI_PLAYER_READER_UNAVAILABLE_HEIGHT).toBe(24 + 46 + 10 + 44 + 12);
    expect(MINI_PLAYER_READER_UNAVAILABLE_FOOTPRINT).toBe(28 + 136 + 12);
    expect(MINI_PLAYER_READER_UNAVAILABLE_FOOTPRINT).toBe(176);
  });

  it('sets the tabs list inset at the bar height plus its gap: 64 + 12', () => {
    expect(MINI_PLAYER_TABS_FOOTPRINT).toBe(76);
  });

  it('adds the skip notice line of 18 pt, as in #ReadingMiniSkipped (ADR 0062)', () => {
    expect(MINI_PLAYER_NOTICE_HEIGHT).toBe(18);
  });
});

describe('the collapsed capsule and chevron', () => {
  it('matches #ReadingMiniCollapsed: a 64 by 24 pill in an 88 by 44 hit area, 18 above the safe area', () => {
    expect(MINI_PLAYER_CAPSULE).toMatchObject({ bottom: 18, height: 24, hitHeight: 44, hitWidth: 88, width: 64 });
    expect(MINI_PLAYER_CAPSULE.grabberWidth).toBe(28);
    expect(MINI_PLAYER_CAPSULE.grabberHeight).toBe(4);
    expect(MINI_PLAYER_CAPSULE_FOOTPRINT).toBe(62);
  });

  it('matches the reader chevron: 16 by 8, 5 from the top, at 70%', () => {
    expect(MINI_PLAYER_CHEVRON).toEqual({ height: 8, opacity: 0.7, top: 5, width: 16 });
  });
});
