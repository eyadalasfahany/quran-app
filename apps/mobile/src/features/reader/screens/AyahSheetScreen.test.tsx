import { act, fireEvent } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { setUpTests } from 'react-native-reanimated';

import { locales, renderUi } from '../../../../jest/render-ui';
import { AyahSheetScreen } from './AyahSheetScreen';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 34, left: 0, right: 0, top: 47 }) };
});

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  // The mock is an ES module, so the default import (Animated) resolves.
  return { ...actual, __esModule: true, default: actual.default };
});

setUpTests();

// Every ayah sheet opens at the mid detent: half the window, the card's top edge.
const MID = Dimensions.get('window').height * 0.5;
// The full detent: the 47 pt safe area plus the 8 pt card margin.
const FULL = 47 + 8;

/** Runs the card's spring to its end. */
async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
}

describe('AyahSheetScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each(locales)('opens the actions card at the mid detent in %s', async (locale) => {
    const view = await renderUi(<AyahSheetScreen initialTab="actions" verseKey="1:2" />, { locale });
    await settle();

    expect(view.getByTestId('sheet-host')).toHaveAnimatedStyle({ top: MID });
  });

  it('expands to the full detent when the reader opens the tafsir (ADR 0050)', async () => {
    const view = await renderUi(<AyahSheetScreen initialTab="actions" verseKey="1:2" />, { locale: 'en' });
    await settle();

    await fireEvent.press(view.getByRole('tab', { name: 'Tafsir' }));
    await settle();

    expect(view.getByTestId('sheet-host')).toHaveAnimatedStyle({ top: FULL });
  });

  it('opens the tafsir route at the mid detent too', async () => {
    const view = await renderUi(<AyahSheetScreen initialTab="tafsir" verseKey="1:2" />, { locale: 'en' });
    await settle();

    expect(view.getByTestId('sheet-host')).toHaveAnimatedStyle({ top: MID });
  });
});
