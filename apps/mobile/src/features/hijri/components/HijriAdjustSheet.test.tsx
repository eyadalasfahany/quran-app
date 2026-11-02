import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { renderUi } from '../../../../jest/render-ui';

import { HijriAdjustSheet } from './HijriAdjustSheet';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

/** The sheet is pointer-disabled until its open animation has run (SheetHost), so the tests run it first. */
async function openSheet(view: { unmount: () => void }) {
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  return view;
}

describe('HijriAdjustSheet', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    storage.remove(storageKeys.hijriAdjustDays);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('offers −2 to +2 and starts from the saved value', async () => {
    storage.set(storageKeys.hijriAdjustDays, 1);
    const view = await renderUi(<HijriAdjustSheet onClose={jest.fn()} testID="sheet" />);
    await openSheet(view);

    expect(view.getByTestId('sheet-segment')).toBeOnTheScreen();
    expect(view.getByTestId('sheet-segment-1')).toBeOnTheScreen();
    expect(view.getByTestId('sheet-segment--2')).toBeOnTheScreen();
    expect(view.getByTestId('sheet-segment-0')).toBeOnTheScreen();
  });

  it('shows the Umm al-Qura date and the date after the draft change', async () => {
    const view = await renderUi(<HijriAdjustSheet onClose={jest.fn()} testID="sheet" />);
    await openSheet(view);

    expect(view.getByTestId('sheet-compare-before')).toBeOnTheScreen();
    await fireEvent.press(view.getByTestId('sheet-segment-2'));

    expect(view.getByTestId('sheet-compare-after')).toBeOnTheScreen();
  });

  it('saves the draft to MMKV and closes', async () => {
    const onClose = jest.fn();
    const view = await renderUi(<HijriAdjustSheet onClose={onClose} testID="sheet" />);
    await openSheet(view);

    await fireEvent.press(view.getByTestId('sheet-segment--1'));
    await fireEvent.press(view.getByTestId('sheet-save'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(storage.getNumber(storageKeys.hijriAdjustDays)).toBe(-1);
  });

  it('reset returns the draft to zero, and saving zero clears the stored value', async () => {
    storage.set(storageKeys.hijriAdjustDays, 2);
    const onClose = jest.fn();
    const view = await renderUi(<HijriAdjustSheet onClose={onClose} testID="sheet" />);
    await openSheet(view);

    await fireEvent.press(view.getByTestId('sheet-reset'));
    await fireEvent.press(view.getByTestId('sheet-save'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(storage.getNumber(storageKeys.hijriAdjustDays)).toBeUndefined();
  });

  it('closing without saving writes nothing', async () => {
    const onClose = jest.fn();
    const view = await renderUi(<HijriAdjustSheet onClose={onClose} testID="sheet" />);
    await openSheet(view);

    await fireEvent.press(view.getByTestId('sheet-segment-2'));
    await fireEvent.press(view.getByTestId('sheet-header-close'));

    expect(onClose).toHaveBeenCalled();
    expect(storage.getNumber(storageKeys.hijriAdjustDays)).toBeUndefined();
  });

  it('renders in English', async () => {
    const view = await renderUi(<HijriAdjustSheet onClose={jest.fn()} testID="sheet" />, { locale: 'en' });
    await openSheet(view);

    expect(view.getByTestId('sheet-save')).toBeOnTheScreen();
    expect(view.getByTestId('sheet-segment-1')).toBeOnTheScreen();
  });
});
