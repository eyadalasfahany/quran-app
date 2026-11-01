import { menuSearchBottom } from './search-position';

describe('menuSearchBottom', () => {
  it('sits 16 above the iOS tab bar footprint', () => {
    expect(menuSearchBottom('ios', 0, false)).toBe(92 + 16);
  });

  it('sits 16 above the Android floating bar, from the system inset (ADR 0033)', () => {
    expect(menuSearchBottom('android', 0, false)).toBe(76 + 16);
    expect(menuSearchBottom('android', 24, false)).toBe(100 + 16);
  });

  it('rises above the tabs mini player when it shows', () => {
    expect(menuSearchBottom('android', 0, true)).toBe(76 + 16 + 76);
    expect(menuSearchBottom('ios', 0, true)).toBe(92 + 16 + 76);
  });
});
