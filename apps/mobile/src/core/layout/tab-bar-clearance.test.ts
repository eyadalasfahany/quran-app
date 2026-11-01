import { FLOATING_TAB_BAR, miniPlayerBottom, tabBarFootprint, tabContentClearance } from './tab-bar-clearance';

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
  it('needs no padding on iOS, where the native bar insets the content', () => {
    expect(tabContentClearance('ios', 0)).toBe(0);
    expect(tabContentClearance('ios', 34)).toBe(0);
  });

  it('pads Android screens by the floating bar footprint, so no content sits under it', () => {
    expect(tabContentClearance('android', 0)).toBe(76);
    expect(tabContentClearance('android', 24)).toBe(100);
  });
});
