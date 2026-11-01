import { router } from 'expo-router';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { LANDSCAPE_PHONE, resetWindowSize, setWindowSize } from '../../../../jest/window-size';
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

function stored(count: number, target: number | null, label = '', rounds = 0) {
  storage.set(storageKeys.sibha.state, JSON.stringify({ count, label, rounds, target }));
}

// The dialog's buttons, by their test IDs: its confirm label is the same as the top row's reset label.
const RESET_CONFIRM = 'sibha-reset-dialog-confirm';
const RESET_CANCEL = 'sibha-reset-dialog-cancel';

describe('SibhaScreen', () => {
  beforeEach(() => {
    storage.remove(storageKeys.sibha.state);
    storage.remove(storageKeys.sibha.today);
    jest.useFakeTimers({ now });
    jest.mocked(router.back).mockClear();
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

  it('completes a round at the target, shows it, and keeps counting from zero', async () => {
    stored(32, 33);
    const view = await renderUi(<SibhaScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'العداد' }));

    expect(readSibhaState()).toMatchObject({ count: 0, rounds: 1, target: 33 });
    expect(view.getByText('الدورة ١')).toBeOnTheScreen();
    expect(view.getByTestId('sibha-counter-count')).toHaveTextContent('٠');

    jest.advanceTimersByTime(150); // past the 120 ms double-tap window
    await fireEvent.press(view.getByRole('button', { name: 'العداد' }));
    expect(readSibhaState()).toMatchObject({ count: 1, rounds: 1 });
    expect(readSibhaTodayTotal(now)).toBe(2);
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

  it('sets no limit from the «بلا حد» chip: the count keeps growing and no round is shown', async () => {
    stored(0, 33, '', 2);
    const view = await renderUi(<SibhaScreen />);

    await fireEvent.press(view.getByRole('radio', { name: 'بلا حد' }));
    expect(readSibhaState()).toMatchObject({ rounds: 0, target: null });
    expect(view.getByRole('radio', { name: 'بلا حد' }).props.accessibilityState).toEqual({ checked: true });

    for (let i = 0; i < 3; i += 1) {
      jest.advanceTimersByTime(150); // past the 120 ms double-tap window
      await fireEvent.press(view.getByTestId('sibha-tap-surface'));
    }
    expect(readSibhaState()).toMatchObject({ count: 3, rounds: 0, target: null });
    expect(view.queryByTestId('sibha-counter-rounds')).toBeNull();
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

  it('asks before resetting in the shared dialog, and does not reset until confirmed', async () => {
    stored(12, 33, '', 2);
    const view = await renderUi(<SibhaScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'إعادة الضبط' }));

    expect(view.getByText('إعادة ضبط العداد؟')).toBeOnTheScreen();
    expect(view.getByText('يعود العداد والدورات إلى صفر. لا يتأثر مجموع اليوم.')).toBeOnTheScreen();
    expect(view.getByTestId('sibha-reset-dialog-icon-glyph', { includeHiddenElements: true }).props.children.props.name).toEqual({
      ios: 'arrow.counterclockwise',
      android: 'restart_alt',
    });
    expect(readSibhaState().count).toBe(12);
  });

  it('resets the count and the rounds when confirmed, keeps the target, and keeps today’s total', async () => {
    stored(12, 33, '', 2);
    const view = await renderUi(<SibhaScreen />);
    await fireEvent.press(view.getByRole('button', { name: 'العداد' }));
    expect(readSibhaTodayTotal(now)).toBe(1);

    await fireEvent.press(view.getByRole('button', { name: 'إعادة الضبط' }));
    await fireEvent.press(view.getByTestId(RESET_CONFIRM));

    expect(readSibhaState()).toMatchObject({ count: 0, rounds: 0, target: 33 });
    expect(readSibhaTodayTotal(now)).toBe(1);
    await waitFor(() => expect(view.queryByText('إعادة ضبط العداد؟')).toBeNull());
  });

  it('closes the reset dialog without resetting when cancelled', async () => {
    stored(12, 33, '', 2);
    const view = await renderUi(<SibhaScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'إعادة الضبط' }));
    await fireEvent.press(view.getByTestId(RESET_CANCEL));

    expect(readSibhaState()).toMatchObject({ count: 12, rounds: 2 });
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

describe('SibhaScreen layout (ADR 0036)', () => {
  beforeEach(() => {
    storage.remove(storageKeys.sibha.state);
    jest.useFakeTimers({ now });
  });

  afterEach(() => {
    resetWindowSize();
  });

  it('keeps the chips and hint under the counter in a tall window', async () => {
    const view = await renderUi(<SibhaScreen />);

    expect(view.getByTestId('sibha-counter-area')).toBeOnTheScreen();
    expect(view.queryByTestId('sibha-row')).toBeNull();
  });

  it('places the chips beside the counter in a short window', async () => {
    setWindowSize(LANDSCAPE_PHONE.width, LANDSCAPE_PHONE.height);
    const view = await renderUi(<SibhaScreen />);

    expect(view.getByTestId('sibha-row')).toBeOnTheScreen();
    expect(view.getByTestId('sibha-counter-area')).toBeOnTheScreen();
    expect(view.getByTestId('sibha-target-chips')).toBeOnTheScreen();
  });

  it('sizes the ring to the counter area it is given, at most 280', async () => {
    const view = await renderUi(<SibhaScreen />);

    await act(async () => {
      fireEvent(view.getByTestId('sibha-counter-area'), 'layout', {
        nativeEvent: { layout: { height: 230, width: 358, x: 0, y: 0 } },
      });
    });

    expect(flatStyle(view.getByTestId('sibha-counter').props.style).width).toBe(230);
  });

  it('keeps the ring at least 160 in a cramped window', async () => {
    const view = await renderUi(<SibhaScreen />);

    await act(async () => {
      fireEvent(view.getByTestId('sibha-counter-area'), 'layout', {
        nativeEvent: { layout: { height: 90, width: 358, x: 0, y: 0 } },
      });
    });

    expect(flatStyle(view.getByTestId('sibha-counter').props.style).width).toBe(160);
  });
});
