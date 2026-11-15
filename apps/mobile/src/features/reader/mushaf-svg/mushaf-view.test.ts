import { mushafView, pinchFontScale } from './mushaf-view';

describe('mushafView', () => {
  it('shows the printed pages at 1× and below', () => {
    expect(mushafView({ fontScale: 1, mushafKey: 'hafs', svgShown: true })).toBe('svg');
    expect(mushafView({ fontScale: 0.8, mushafKey: 'hafs', svgShown: true })).toBe('svg');
  });

  it('shows the flowed Hafs text above 1×', () => {
    expect(mushafView({ fontScale: 1.1, mushafKey: 'hafs', svgShown: true })).toBe('flowed');
    expect(mushafView({ fontScale: 1.6, mushafKey: 'hafs', svgShown: true })).toBe('flowed');
  });

  it('keeps another riwayah on its printed pages at every size', () => {
    expect(mushafView({ fontScale: 1.6, mushafKey: 'warsh', svgShown: true })).toBe('svg');
    expect(mushafView({ fontScale: 1.1, mushafKey: 'qalun', svgShown: true })).toBe('svg');
  });

  it('shows the flowed text when the pages are not available', () => {
    expect(mushafView({ fontScale: 1, mushafKey: 'hafs', svgShown: false })).toBe('flowed');
    expect(mushafView({ fontScale: 1.6, mushafKey: 'warsh', svgShown: false })).toBe('flowed');
  });
});

describe('pinchFontScale', () => {
  it('scales the size the pinch started from', () => {
    expect(pinchFontScale(1, 1.3, 1.6)).toBe(1.3);
    expect(pinchFontScale(1.2, 0.75, 1.6)).toBe(0.9);
  });

  it('snaps to the 0.1 grid, so small movements make no step', () => {
    expect(pinchFontScale(1, 1.04, 1.6)).toBe(1);
    expect(pinchFontScale(1, 1.06, 1.6)).toBe(1.1);
    expect(pinchFontScale(1.3, 1.01, 1.6)).toBe(1.3);
  });

  it('clamps to 0.8 and 1.6', () => {
    expect(pinchFontScale(1, 0.2, 1.6)).toBe(0.8);
    expect(pinchFontScale(1, 4, 1.6)).toBe(1.6);
  });

  it('caps another riwayah’s printed pages at 1×, and still lets them shrink', () => {
    expect(pinchFontScale(1, 1.5, 1)).toBe(1);
    expect(pinchFontScale(0.9, 1.5, 1)).toBe(1);
    expect(pinchFontScale(1, 0.88, 1)).toBe(0.9);
  });

  it('holds a start above the cap rather than dropping it against a spreading pinch', () => {
    expect(pinchFontScale(1.4, 1.3, 1)).toBe(1.4);
    expect(pinchFontScale(1.4, 0.8, 1)).toBe(1.1);
  });
});
