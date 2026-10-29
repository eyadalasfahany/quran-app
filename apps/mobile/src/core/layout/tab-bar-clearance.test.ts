import { miniPlayerBottom } from './tab-bar-clearance';

describe('miniPlayerBottom', () => {
  it('clears the iOS tab bar by the frame footprint (28 + 64) and the 12 pt gap', () => {
    expect(miniPlayerBottom('ios', 0)).toBe(104);
    expect(miniPlayerBottom('ios', 34)).toBe(104);
  });

  it('clears the Android bar (80) above the system inset, plus the 12 pt gap', () => {
    expect(miniPlayerBottom('android', 0)).toBe(92);
    expect(miniPlayerBottom('android', 24)).toBe(116);
  });

  it('never takes a negative inset', () => {
    expect(miniPlayerBottom('android', -4)).toBe(92);
  });
});
