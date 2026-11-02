import { renderUi } from '../../../../jest/render-ui';

import { MoonPhaseDisc, moonLitPath } from './MoonPhaseDisc';

/** The terminator's x-radius and sweep flag, read back from the path. */
function terminator(path: string) {
  const match = /A [\d.]+ [\d.]+ 0 0 (\d) [\d.]+ [\d.]+ A ([\d.]+) [\d.]+ 0 0 (\d)/.exec(path);
  return { limbSweep: Number(match![1]), rx: Number(match![2]), terminatorSweep: Number(match![3]) };
}

describe('moonLitPath', () => {
  it('draws a thin crescent for a young moon: the terminator almost on the limb', () => {
    // k = 0.019 → rx = r·(1 − 0.038) ≈ 0.962 r: a sliver, not a half disc.
    expect(terminator(moonLitPath(0.019, true, 40)).rx).toBeCloseTo(38.48, 1);
  });

  it('lights a waxing moon on the right and a waning moon on the left', () => {
    expect(terminator(moonLitPath(0.2, true, 40)).limbSweep).toBe(1);
    expect(terminator(moonLitPath(0.2, false, 40)).limbSweep).toBe(0);
  });

  it('bulges the terminator into the lit side for a crescent and away from it for a gibbous moon', () => {
    // A crescent closes on the lit side (sweep opposite to the limb); a gibbous moon on the dark side.
    expect(terminator(moonLitPath(0.2, true, 40)).terminatorSweep).toBe(0);
    expect(terminator(moonLitPath(0.8, true, 40)).terminatorSweep).toBe(1);
    expect(terminator(moonLitPath(0.2, false, 40)).terminatorSweep).toBe(1);
    expect(terminator(moonLitPath(0.8, false, 40)).terminatorSweep).toBe(0);
  });

  it('is a straight terminator at first and last quarter, and a full disc at full moon', () => {
    expect(terminator(moonLitPath(0.5, true, 40)).rx).toBe(0);
    expect(terminator(moonLitPath(1, true, 40)).rx).toBe(40);
  });

  it('clamps the illumination to 0…1', () => {
    expect(moonLitPath(-1, true, 40)).toBe(moonLitPath(0, true, 40));
    expect(moonLitPath(2, true, 40)).toBe(moonLitPath(1, true, 40));
  });
});

describe('MoonPhaseDisc', () => {
  it('renders the SVG disc as an image with its lit part', async () => {
    const view = await renderUi(<MoonPhaseDisc illumination={0.2} waxing />);
    expect(view.getByTestId('moon-phase-disc')).toBeOnTheScreen();
    expect(view.getByTestId('moon-phase-disc').props.accessibilityRole).toBe('image');
    expect(view.getByTestId('moon-phase-disc-lit').props.d).toBe(moonLitPath(0.2, true, 42));
  });
});
