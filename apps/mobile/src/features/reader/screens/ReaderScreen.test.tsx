import { act, fireEvent } from '@testing-library/react-native';
import { useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { formatNumber } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { themes } from '@/core/theme';
import { pageForVerse } from '@/features/reader/anchor/page';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { resetReaderSelection } from '../selection';
import { resetReaderSettingsStore, useReaderSettings } from '../settings';
import { ReaderScreen } from './ReaderScreen';

// Only the tests that need content open it, so the others keep rendering the reader shell alone.
let mockExecutor: SqlExecutor | undefined;

// The Mushaf list stands in for FlashList, which doesn't report visible pages under Jest; a test reports
// them through the props it was given.
let mockMushafProps: { anchorVerseKey: string; onVisiblePage?: (page: number, verseKey: string) => void } | undefined;
jest.mock('../HafsMushafList', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HafsMushafList: (props: { anchorVerseKey: string; testID?: string; topInset?: number }) => {
      mockMushafProps = props;
      return createElement(View, { style: { paddingTop: props.topInset }, testID: props.testID });
    },
  };
});
jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => {
    if (mockExecutor === undefined) {
      throw new Error('openContentDb is unavailable under Jest.');
    }
    return { db: {}, executor: mockExecutor };
  },
}));

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useSegments: jest.fn(() => []),
}));

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
    jest.mocked(useSegments).mockReturnValue([] as unknown as ReturnType<typeof useSegments>);
    mockExecutor = undefined;
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

  it('draws only the Focus chrome in Focus, with the position of the Focus ayah, and drops the resume pill', async () => {
    mockExecutor = (await openReaderTestContent()).executor;
    useReaderSettings.getState().setMode('mushaf');
    const view = await renderUi(reader());

    await act(async () => {
      useReaderSettings.getState().setMode('focus');
    });

    expect(view.getByTestId('focus-exit')).toBeOnTheScreen();
    expect(view.getByTestId('focus-position')).toHaveTextContent(new RegExp(formatNumber(255, 'ar')));
    expect(view.queryByTestId('reader-back')).toBeNull();
    expect(view.queryByTestId('reader-tools')).toBeNull();
    expect(view.queryByTestId('reader-resume-slot')).toBeNull();
  });

  it('exits Focus back to the mode it was entered from', async () => {
    mockExecutor = (await openReaderTestContent()).executor;
    useReaderSettings.getState().setMode('mushaf');
    const view = await renderUi(reader());

    await act(async () => {
      useReaderSettings.getState().setMode('focus');
    });
    await fireEvent.press(view.getByTestId('focus-exit'));

    expect(useReaderSettings.getState().mode).toBe('mushaf');
    expect(view.getByTestId('reader-back')).toBeOnTheScreen();
  });

  it.each(['ayah', 'tafsir', 'reader-settings'])('leaves the page and toolbar as they were under the %s sheet', async (sheet) => {
    mockExecutor = (await openReaderTestContent()).executor;
    useReaderSettings.getState().setMode('mushaf');
    const closed = await renderUi(reader());
    const inset = flatStyle(closed.getByTestId('reader-mushaf').props.style).paddingTop;
    await closed.unmount();

    jest.mocked(useSegments).mockReturnValue([sheet] as unknown as ReturnType<typeof useSegments>);
    const open = await renderUi(reader());

    expect(flatStyle(open.getByTestId('reader-mushaf').props.style).paddingTop).toBe(inset);
    expect(open.getByTestId('reader-back')).toBeOnTheScreen();
    expect(open.getByTestId('reader-tools')).toBeOnTheScreen();
  });

  it('saves and shows the page the Mushaf scrolls to after an ayah was turned in Focus', async () => {
    const { executor } = await openReaderTestContent();
    mockExecutor = executor;
    useReaderSettings.getState().setMode('focus');
    const view = await renderUi(reader());

    await fireEvent.press(view.getByTestId('focus-transport-next'));
    expect(view.getByTestId('reader-screen').props.accessibilityLabel).toBe('2:256');

    await act(async () => {
      useReaderSettings.getState().setMode('mushaf');
    });
    expect(mockMushafProps?.anchorVerseKey).toBe('2:256');

    const page = pageForVerse(executor, '3:1')!;
    await act(async () => {
      mockMushafProps?.onVisiblePage?.(page, '3:1');
    });

    expect(view.getByTestId('reader-screen').props.accessibilityLabel).toBe('3:1');
    expect(view.getByTestId('reader-title')).toHaveTextContent(new RegExp(formatNumber(page, 'ar')));

    // Saves are batched to one a second; leaving the reader writes the last one.
    await view.unmount();
    expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('3:1');
    expect(storage.getString(storageKeys.readerLastPage)).toBe(String(page));
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
