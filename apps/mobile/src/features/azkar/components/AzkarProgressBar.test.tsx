import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarProgressBar } from './AzkarProgressBar';

describe('AzkarProgressBar', () => {
  it('renders a progressbar with its percentage and a fill of the same width', async () => {
    await renderUi(<AzkarProgressBar fraction={0.5} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ max: 100, min: 0, now: 50 });
    expect(screen.getByTestId('azkar-progress-bar-fill').props.style).toEqual(expect.objectContaining({ width: '50%' }));
  });

  it('clamps the fraction to the 0–100 range', async () => {
    await renderUi(<AzkarProgressBar fraction={1.7} />);
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(100);
  });

  it('shows no fill at zero', async () => {
    await renderUi(<AzkarProgressBar fraction={-1} />);
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(0);
  });

  it('renders the same in English', async () => {
    await renderUi(<AzkarProgressBar fraction={0.25} />, { locale: 'en' });
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(25);
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarProgressBar.tsx')).toEqual([]);
  });
});
