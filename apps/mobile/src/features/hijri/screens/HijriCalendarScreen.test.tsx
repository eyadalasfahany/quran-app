import { act, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { renderUi } from '../../../../jest/render-ui';
import { LANDSCAPE_PHONE, resetWindowSize, setWindowSize } from '../../../../jest/window-size';
import * as hijriData from '../data/hijri-date';

import { HijriCalendarScreen } from './HijriCalendarScreen';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

// 2 November 2026 is 22 Jumada I 1448 in the Umm al-Qura calendar (Node ICU; ADR 0048 H2). The screen takes `now`.
const NOW = new Date(2026, 10, 2, 9, 0, 0, 0);

describe('HijriCalendarScreen', () => {
  beforeEach(() => {
    storage.remove(storageKeys.hijriAdjustDays);
    jest.clearAllMocks();
    resetWindowSize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetWindowSize();
  });

  it('shows the current Hijri month, today marked, and the occasions', async () => {
    const view = await renderUi(<HijriCalendarScreen now={NOW} />);

    expect(view.getByTestId('hijri-month-header-title')).toHaveTextContent('جمادى الأولى ١٤٤٨');
    expect(view.getByLabelText(/^اليوم، /)).toBeOnTheScreen();
    expect(view.getByRole('header', { name: 'المناسبات القادمة' })).toBeOnTheScreen();
  });

  it('moves to the next month, and returns to today from there', async () => {
    const view = await renderUi(<HijriCalendarScreen now={NOW} />);

    await act(async () => {
      await fireEvent.press(view.getByTestId('hijri-month-header-next'));
    });
    expect(view.getByTestId('hijri-month-header-title')).toHaveTextContent('جمادى الآخرة ١٤٤٨');

    await act(async () => {
      await fireEvent.press(view.getByTestId('hijri-month-header-today'));
    });
    expect(view.getByTestId('hijri-month-header-title')).toHaveTextContent('جمادى الأولى ١٤٤٨');
  });

  it('moves to the previous month', async () => {
    const view = await renderUi(<HijriCalendarScreen now={NOW} />);

    await act(async () => {
      await fireEvent.press(view.getByTestId('hijri-month-header-previous'));
    });

    expect(view.getByTestId('hijri-month-header-title')).toHaveTextContent('ربيع الآخر ١٤٤٨');
  });

  it('shows the saved adjustment in the row and keeps the month the adjusted date is in', async () => {
    storage.set(storageKeys.hijriAdjustDays, 2);
    const view = await renderUi(<HijriCalendarScreen now={NOW} />);

    // 2 November shifted by +2 is 4 November: 24 Jumada I, still the same month.
    expect(view.getByTestId('hijri-adjust-row-value')).toHaveTextContent('+٢ يوم');
    expect(view.getByTestId('hijri-month-header-title')).toHaveTextContent('جمادى الأولى ١٤٤٨');
  });

  it('opens the adjust sheet from the header and from the row', async () => {
    const view = await renderUi(<HijriCalendarScreen now={NOW} />);

    await fireEvent.press(view.getByTestId('hijri-adjust-button'));
    expect(router.push).toHaveBeenLastCalledWith('/hijri/adjust');

    await fireEvent.press(view.getByTestId('hijri-adjust-row-press'));
    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it('puts the grid and the occasions side by side in a short window', async () => {
    setWindowSize(LANDSCAPE_PHONE.width, LANDSCAPE_PHONE.height);
    const view = await renderUi(<HijriCalendarScreen now={NOW} />);

    expect(view.getByTestId('hijri-month-grid')).toBeOnTheScreen();
    expect(view.getByTestId('occasion-list')).toBeOnTheScreen();
  });

  it('says so when the platform has no Umm al-Qura calendar, and offers no month', async () => {
    const spy = jest.spyOn(hijriData, 'isHijriCalendarAvailable').mockReturnValue(false);
    const view = await renderUi(<HijriCalendarScreen now={NOW} />);

    expect(view.getByTestId('hijri-unavailable')).toBeOnTheScreen();
    expect(view.queryByTestId('hijri-month-grid')).toBeNull();
    expect(view.queryByTestId('hijri-month-header-next')).toBeNull();
    spy.mockRestore();
  });

  it('renders in English with Sunday first and the English title', async () => {
    const view = await renderUi(<HijriCalendarScreen now={NOW} />, { locale: 'en' });

    expect(view.getByTestId('hijri-month-header-title')).toHaveTextContent('Jumada I 1448');
    expect(view.getByTestId('hijri-weekday-row-0', { includeHiddenElements: true })).toHaveTextContent('S');
  });
});
