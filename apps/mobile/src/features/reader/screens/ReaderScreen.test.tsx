import { act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { resetReaderSelection } from '../selection';
import { resetReaderSettingsStore, useReaderSettings } from '../settings';
import { ReaderScreen } from './ReaderScreen';

// The app root provides the insets; the toolbar clears the top inset itself, so the screen adds none.
const metrics = { frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 34, left: 0, right: 0, top: 59 } };

function reader() {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <ReaderScreen verseKey="2:255" />
    </SafeAreaProvider>
  );
}

describe('ReaderScreen', () => {
  beforeEach(() => {
    storage.remove(storageKeys.readerSettings);
    storage.remove(storageKeys.readerLastVerseKey);
    storage.remove(storageKeys.readerLastPage);
    storage.remove(storageKeys.readerMode);
    resetReaderSettingsStore();
    resetReaderSelection();
  });

  it('keeps the anchor ayah when the reading mode changes', async () => {
    const view = await renderUi(reader());
    expect(view.getByTestId('reader-screen').props.accessibilityLabel).toBe('2:255');

    await act(async () => {
      useReaderSettings.getState().setMode('focus');
    });

    expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('2:255');
    expect(storage.getString(storageKeys.readerMode)).toBe('focus');
    expect(view.getByTestId('reader-screen').props.accessibilityLabel).toBe('2:255');
  });

  it('keeps the reader toolbar in Focus, so Back and the other modes stay in reach, and drops the resume pill', async () => {
    const view = await renderUi(reader());

    await act(async () => {
      useReaderSettings.getState().setMode('focus');
    });

    expect(view.getByTestId('reader-back')).toBeOnTheScreen();
    expect(view.getByTestId('reader-tools')).toBeOnTheScreen();
    expect(view.queryByTestId('reader-resume-slot')).toBeNull();
  });

  it.each(locales)('puts the Quran on the page surface, as the design does, in %s', async (locale) => {
    const view = await renderUi(reader(), { locale });

    expect(flatStyle(view.getByTestId('reader-screen').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surfacePage,
      flex: 1,
      paddingTop: 0,
    });
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/screens/ReaderScreen.tsx')).toEqual([]);
  });
});
