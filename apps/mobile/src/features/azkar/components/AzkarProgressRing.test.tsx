import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarProgressRing } from './AzkarProgressRing';

describe('AzkarProgressRing', () => {
  it('draws a brand arc sized to the fraction over the track', async () => {
    const view = await renderUi(<AzkarProgressRing fraction={0.25} />);
    const arc = view.getByTestId('azkar-progress-ring-arc', { includeHiddenElements: true });
    const circumference = 2 * Math.PI * ((44 - 3) / 2);

    expect(view.getByTestId('azkar-progress-ring', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(Number(arc.props.strokeDashoffset)).toBeCloseTo(circumference * 0.75, 3);
  });

  it('draws no arc at zero and clamps fractions above one', async () => {
    const empty = await renderUi(<AzkarProgressRing fraction={0} />);
    expect(empty.queryByTestId('azkar-progress-ring-arc', { includeHiddenElements: true })).toBeNull();
    await empty.unmount();

    const full = await renderUi(<AzkarProgressRing fraction={3} />);
    expect(Number(full.getByTestId('azkar-progress-ring-arc', { includeHiddenElements: true }).props.strokeDashoffset)).toBe(0);
  });

  it('shows a check for a completed session and stays out of the accessibility tree', async () => {
    const view = await renderUi(<AzkarProgressRing completed fraction={1} />);

    expect(view.getByTestId('azkar-progress-ring-check', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(view.getByTestId('azkar-progress-ring', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarProgressRing.tsx')).toEqual([]);
  });
});
