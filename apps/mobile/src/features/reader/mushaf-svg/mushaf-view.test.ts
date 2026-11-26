import { mushafView } from './mushaf-view';

describe('mushafView', () => {
  it('shows the printed pages whenever the pack shows, whatever the text size', () => {
    expect(mushafView({ svgShown: true })).toBe('svg');
  });

  it('shows the flowed Tanzil text only while no pack is available', () => {
    expect(mushafView({ svgShown: false })).toBe('flowed');
  });
});
