import { act } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { formatRemaining } from '../data/time-format';
import { NextPrayerCountdown } from './NextPrayerCountdown';

const NOW = new Date(2026, 9, 31, 10, 0, 0, 0);
const at = (hour: number, minute = 0) => new Date(2026, 9, 31, hour, minute, 0, 0);

const props = {
  nextTime: at(12, 0),
  previousTime: at(8, 0),
  prayerName: 'الظهر',
  sourceLabel: 'تلقائي',
  time: '١٢:٠٠',
};

describe('NextPrayerCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the next prayer hero with the time remaining to it', async () => {
    const view = await renderUi(<NextPrayerCountdown {...props} />);

    expect(view.getByTestId('salah-hero-name')).toHaveTextContent('الظهر');
    expect(view.getByLabelText(new RegExp(formatRemaining(2 * 60 * 60 * 1000, 'ar')))).toBeOnTheScreen();
  });

  it('ticks on its own: the remaining time falls every second without the parent re-rendering', async () => {
    const view = await renderUi(<NextPrayerCountdown {...props} />);

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(view.getByLabelText(new RegExp(formatRemaining(2 * 60 * 60 * 1000 - 60_000, 'ar')))).toBeOnTheScreen();
  });

  it('shows the city only when one is given', async () => {
    const view = await renderUi(<NextPrayerCountdown {...props} city="مكة المكرمة" />);

    expect(view.getByText(/مكة المكرمة/)).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/NextPrayerCountdown.tsx')).toEqual([]);
  });
});
