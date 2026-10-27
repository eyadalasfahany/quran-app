import { fireEvent } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { AYAH_SHEET_TOP, TAFSIR_SHEET_TOP, sheetHeight } from '../form-sheet';
import { AyahSheetScreen } from './AyahSheetScreen';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

async function windowHeight(): Promise<number> {
  let height = 0;
  function Probe() {
    height = useWindowDimensions().height;
    return null;
  }
  await renderUi(<Probe />);
  return height;
}

describe('AyahSheetScreen', () => {
  it.each(locales)('opens the actions card low over the page in %s', async (locale) => {
    const height = await windowHeight();
    const view = await renderUi(<AyahSheetScreen initialTab="actions" verseKey="1:2" />, { locale });

    expect(flatStyle(view.getByTestId('sheet-host').props.style).height).toBe(sheetHeight(height, AYAH_SHEET_TOP));
  });

  it('grows to the tall sheet when the reader switches to tafsir', async () => {
    const height = await windowHeight();
    const view = await renderUi(<AyahSheetScreen initialTab="actions" verseKey="1:2" />, { locale: 'en' });

    await fireEvent.press(view.getByRole('tab', { name: 'Tafsir' }));

    expect(flatStyle(view.getByTestId('sheet-host').props.style).height).toBe(sheetHeight(height, TAFSIR_SHEET_TOP));
  });

  it('opens straight into the tall sheet from the tafsir route', async () => {
    const height = await windowHeight();
    const view = await renderUi(<AyahSheetScreen initialTab="tafsir" verseKey="1:2" />, { locale: 'en' });

    expect(flatStyle(view.getByTestId('sheet-host').props.style).height).toBe(sheetHeight(height, TAFSIR_SHEET_TOP));
  });
});
