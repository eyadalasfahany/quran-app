import { router } from 'expo-router';
import { fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { renderUi } from '../../../../jest/render-ui';
import { readSibhaState, readSibhaTodayTotal } from '../data/store';
import { SibhaScreen } from './SibhaScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() },
}));

jest.mock('@/features/azkar/haptics', () => ({
  completeHaptic: jest.fn(),
  tapHaptic: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

const now = new Date(2026, 10, 1, 12, 0, 0);

function stored(count: number, target: number | null, label = '') {
  storage.set(storageKeys.sibha.state, JSON.stringify({ count, label, target }));
}

describe('SibhaScreen', () => {
  beforeEach(() => {
    storage.remove(storageKeys.sibha.state);
    storage.remove(storageKeys.sibha.today);
    jest.useFakeTimers({ now });
    jest.mocked(router.back).mockClear();
    jest.spyOn(Alert, 'alert').mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows the stored count and target', async () => {
    stored(33, 100);
    const view = await renderUi(<SibhaScreen />);

    expect(view.getByTestId('screen-sibha')).toBeOnTheScreen();
    expect(view.getByTestId('sibha-counter-count')).toHaveTextContent('٣٣');
    expect(view.getByText('من ١٠٠')).toBeOnTheScreen();
  });

  it('counts a tap anywhere on the screen that is not a button', async () => {
    stored(0, 100);
    const view = await renderUi(<SibhaScreen />);

    await fireEvent.press(view.getByTestId('sibha-tap-surface'));

    expect(view.getByTestId('sibha-counter-count')).toHaveTextContent('١');
    expect(readSibhaState().count).toBe(1);
    expect(readSibhaTodayTotal(now)).toBe(1);
  });

  it('counts a tap on the counter itself once', async () => {
    stored(0, 100);
    const view = await renderUi(<SibhaScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'العداد' }));

    expect(readSibhaState().count).toBe(1);
  });

  it('sets a preset target from its chip, and clears it when the active chip is pressed again', async () => {
    stored(0, 100);
    const view = await renderUi(<SibhaScreen />);

    await fireEvent.press(view.getByRole('radio', { name: '٣٣' }));
    expect(readSibhaState().target).toBe(33);

    await fireEvent.press(view.getByRole('radio', { name: '٣٣' }));
    expect(readSibhaState().target).toBeNull();
    expect(view.queryByText(/من/)).toBeNull();
  });

  it('opens the custom sheet from the custom chip, and saves the number it is given', async () => {
    stored(5, 100);
    const view = await renderUi(<SibhaScreen />);

    await fireEvent.press(view.getByRole('radio', { name: 'مخصص' }));
    await fireEvent.changeText(view.getByLabelText('عدد التسبيحات'), '250');
    await fireEvent.press(view.getByRole('button', { name: 'حفظ' }));

    expect(readSibhaState().target).toBe(250);
    expect(view.getByText('من ٢٥٠')).toBeOnTheScreen();
  });

  it('asks before resetting, and resets only when confirmed', async () => {
    stored(12, 33);
    const alert = jest.spyOn(Alert, 'alert');
    const view = await renderUi(<SibhaScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'إعادة الضبط' }));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(readSibhaState().count).toBe(12);

    const buttons = alert.mock.calls[0]?.[2] ?? [];
    buttons.find((button) => button.style === 'destructive')?.onPress?.();
    expect(readSibhaState().count).toBe(0);
    expect(readSibhaState().target).toBe(33);
  });

  it('keeps the label the user typed', async () => {
    stored(0, 100);
    const view = await renderUi(<SibhaScreen />);

    await fireEvent.changeText(view.getByLabelText('تسمية اختيارية'), 'نص تجريبي ١');

    expect(readSibhaState().label).toBe('نص تجريبي ١');
  });

  it('closes back to where it was opened from', async () => {
    const view = await renderUi(<SibhaScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'إغلاق' }));

    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
