import type { PlatformOSType } from 'react-native';

import {
  FLOATING_TAB_BAR,
  miniPlayerBottom,
  miniPlayerHiddenTabsBottom,
  TAB_RAIL_CLEARANCE,
  tabBarFootprint,
  tabBarMode,
  tabBarSideClearance,
  tabContentClearance,
} from './tab-bar-clearance';

describe('miniPlayerBottom', () => {
  it('clears the iOS tab bar by the frame footprint (28 + 64) and the 12 pt gap', () => {
    expect(miniPlayerBottom('ios', 0)).toBe(104);
    expect(miniPlayerBottom('ios', 34)).toBe(104);
  });

  it('clears the Android floating bar (12 + 64 above the system inset) plus the 12 pt gap (ADR 0033)', () => {
    expect(miniPlayerBottom('android', 0)).toBe(88);
    expect(miniPlayerBottom('android', 24)).toBe(112);
  });

  it('never takes a negative inset', () => {
    expect(miniPlayerBottom('android', -4)).toBe(88);
  });
});

describe('miniPlayerHiddenTabsBottom', () => {
  it('drops onto the iOS tab bar slot: 28 from the edge', () => {
    expect(miniPlayerHiddenTabsBottom('ios', 0)).toBe(28);
    expect(miniPlayerHiddenTabsBottom('ios', 34)).toBe(28);
  });

  it('drops onto the Android floating bar slot: 12 above the system inset', () => {
    expect(miniPlayerHiddenTabsBottom('android', 0)).toBe(12);
    expect(miniPlayerHiddenTabsBottom('android', 24)).toBe(36);
    expect(miniPlayerHiddenTabsBottom('android', -4)).toBe(12);
  });

  it('is the shown position in a short window, where there is no bar to drop into', () => {
    expect(miniPlayerHiddenTabsBottom('ios', 21, true)).toBe(miniPlayerBottom('ios', 21, true));
    expect(miniPlayerHiddenTabsBottom('android', 0, true)).toBe(miniPlayerBottom('android', 0, true));
  });
});

describe('tabBarFootprint', () => {
  it('is the iOS frame footprint, whatever the inset', () => {
    expect(tabBarFootprint('ios', 0)).toBe(92);
    expect(tabBarFootprint('ios', 34)).toBe(92);
  });

  it('is the Android floating bar: its offset and height above the system inset', () => {
    expect(tabBarFootprint('android', 0)).toBe(76);
    expect(tabBarFootprint('android', 24)).toBe(100);
    expect(tabBarFootprint('android', -4)).toBe(76);
  });

  it('keeps the floating bar geometry from ADR 0033 §2', () => {
    expect(FLOATING_TAB_BAR).toEqual({ side: 16, offset: 12, height: 64, radius: 32, padding: 6, gap: 4, itemRadius: 26 });
  });
});

describe('tabContentClearance', () => {
  it('pads iOS screens by the native bar footprint too, since the bar does not inset scroll views (measured 1 Nov 2026)', () => {
    expect(tabContentClearance('ios', 0)).toBe(92);
    expect(tabContentClearance('ios', 34)).toBe(92);
  });

  it('pads Android screens by the floating bar footprint, so no content sits under it', () => {
    expect(tabContentClearance('android', 0)).toBe(76);
    expect(tabContentClearance('android', 24)).toBe(100);
  });
});

describe('tab rail in a short window (ADR 0036, developer 1 Nov 2026)', () => {
  it('reserves 100 pt on the start edge: 12 offset, 76 wide, 12 gap', () => {
    expect(TAB_RAIL_CLEARANCE).toBe(100);
    expect(tabBarSideClearance(true)).toBe(100);
    expect(tabBarSideClearance(false)).toBe(0);
  });

  it.each<[PlatformOSType, boolean, 'native' | 'headless']>([
    // iOS keeps its native tabs in tall windows; a short window is the rail on both platforms.
    ['ios', false, 'native'],
    ['ios', true, 'headless'],
    ['android', false, 'headless'],
    ['android', true, 'headless'],
  ])('tabBarMode(%s, short %s) is %s', (platform, short, expected) => {
    expect(tabBarMode(platform, short)).toBe(expected);
  });

  it('has no bottom bar in a short window, so the footprint is the bottom safe area only', () => {
    expect(tabBarFootprint('android', 21, true)).toBe(21);
    expect(tabBarFootprint('ios', 21, true)).toBe(21);
    expect(miniPlayerBottom('ios', 21, true)).toBe(33);
    expect(miniPlayerBottom('android', 0, true)).toBe(12);
  });

  it('gives tab screens no bottom clearance in a short window, on either platform', () => {
    expect(tabContentClearance('android', 21, true)).toBe(0);
    expect(tabContentClearance('ios', 21, true)).toBe(0);
  });

  it('keeps the tall-window clearance unchanged', () => {
    expect(tabContentClearance('android', 0)).toBe(76);
    expect(tabContentClearance('ios', 0)).toBe(92);
    expect(miniPlayerBottom('ios', 0)).toBe(104);
  });
});
