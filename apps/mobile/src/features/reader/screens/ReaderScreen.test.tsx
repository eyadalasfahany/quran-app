import { act, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useSegments } from 'expo-router';
import { Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { formatNumber } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { themes } from '@/core/theme';
import { usePlayerStore } from '@/features/audio/playerStore';
import { pageForVerse } from '@/features/reader/anchor/page';
import { verseKeyToId } from '../data/verses';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { resetReaderSelection } from '../selection';
import { resetReaderSettingsStore, useReaderSettings } from '../settings';
import { ReaderScreen } from './ReaderScreen';

// Only the tests that need content open it, so the others keep rendering the reader shell alone.
let mockExecutor: SqlExecutor | undefined;

// The user database is not open under Jest, so the screen's highlight hook is stubbed here.
let mockHighlights: ReadonlyMap<number, 'gold' | 'green' | 'blue' | 'rose'> = new Map();
jest.mock('@/features/library/data/hooks', () => ({
  ...jest.requireActual<typeof import('@/features/library/data/hooks')>('@/features/library/data/hooks'),
  useHighlightsByVerseId: () => mockHighlights,
}));

jest.mock('@/features/khatma/data', () => ({
  ...jest.requireActual<typeof import('@/features/khatma/data')>('@/features/khatma/data'),
  useActivePlan: () => ({ data: [] }),
  useKhatmaMarkerVerseId: () => null,
}));

// The Mushaf list stands in for FlashList, which doesn't report visible pages under Jest; a test reports
// them through the props it was given.
let mockMushafProps:
  | {
      anchorVerseKey: string;
      contentBottomInset?: number;
      highlightsByVerseId?: ReadonlyMap<number, string>;
      onVisiblePage?: (page: number, verseKey: string) => void;
      onUserScrollStart?: () => void;
    }
  | undefined;
jest.mock('../HafsMushafList', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HafsMushafList: (props: { anchorVerseKey: string; contentBottomInset?: number; testID?: string; topInset?: number }) => {
      mockMushafProps = props;
      return createElement(View, { style: { paddingTop: props.topInset }, testID: props.testID });
    },
  };
});
// The reading list stands in for FlashList's scroll-to-anchor, which Jest can't run; the props it was given are checked.
let mockReadingProps:
  | {
      anchorVerseKey?: string;
      contentBottomInset?: number;
      onUserScrollStart?: () => void;
      onVisibleVerseKey?: (verseKey: string) => void;
      testID?: string;
    }
  | undefined;
jest.mock('../ReadingList', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ReadingList: (props: NonNullable<typeof mockReadingProps>) => {
      mockReadingProps = props;
      return createElement(View, { testID: props.testID });
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

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useSegments: jest.fn(() => []),
}));

// The app root provides the insets; the toolbar clears the top inset itself, so the screen adds none.
const metrics = { frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 34, left: 0, right: 0, top: 59 } };

function reader(verseKey = '2:255') {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <ReaderScreen verseKey={verseKey} />
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

  it('passes the saved highlights to the Mushaf list', async () => {
    const { executor } = await openReaderTestContent();
    mockExecutor = executor;
    mockHighlights = new Map([[1, 'green']]);
    useReaderSettings.getState().setMode('mushaf');

    await renderUi(reader());

    expect(mockMushafProps?.highlightsByVerseId).toBe(mockHighlights);
    mockHighlights = new Map();
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

  it('ticks light in Mushaf only when the top page starts a surah', async () => {
    mockExecutor = (await openReaderTestContent()).executor;
    useReaderSettings.getState().setMode('mushaf');
    await renderUi(reader());
    jest.mocked(Haptics.impactAsync).mockClear();

    // Page 2 sets the baseline, page 3 holds no surah start, page 50 starts Al Imran.
    await act(async () => {
      mockMushafProps?.onVisiblePage?.(2, '2:1');
      mockMushafProps?.onVisiblePage?.(3, '2:6');
    });
    expect(Haptics.impactAsync).not.toHaveBeenCalled();

    await act(async () => {
      mockMushafProps?.onVisiblePage?.(50, '3:1');
    });
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it.each(locales)('puts the Quran on the page surface, as the design does, in %s', async (locale) => {
    const view = await renderUi(reader(), { locale });

    expect(flatStyle(view.getByTestId('reader-screen').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surfacePage,
      flex: 1,
      paddingTop: 0,
    });
  });

  describe('mini player', () => {
    // The bar's footprint above the safe area: 28 + 68 + 12.
    const footprint = 108;

    function setWindowWidth(width: number) {
      Dimensions.set({
        screen: { fontScale: 1, height: 844, scale: 1, width },
        window: { fontScale: 1, height: 844, scale: 1, width },
      });
    }

    function startPlayback() {
      const store = usePlayerStore.getState();
      store.beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
      store.markPlaying();
    }

    beforeEach(() => {
      setWindowWidth(390);
      usePlayerStore.getState().reset();
    });

    afterEach(() => {
      setWindowWidth(390);
      usePlayerStore.getState().reset();
    });

    it.each(['reading', 'mushaf'] as const)('shows the bar in %s mode and lifts the list past it', async (mode) => {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode(mode);
      startPlayback();

      const view = await renderUi(reader());

      expect(view.getByTestId('mini-player-reader')).toBeOnTheScreen();
      if (mode === 'mushaf') {
        expect(mockMushafProps?.contentBottomInset).toBe(footprint);
      } else {
        expect(mockReadingProps?.contentBottomInset).toBe(footprint);
      }
    });

    it('draws no bar in Focus mode, and the lists keep no inset there', async () => {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode('focus');
      startPlayback();

      const view = await renderUi(reader());

      expect(view.queryByTestId('mini-player-reader')).toBeNull();
      expect(view.queryByTestId('reader-mini-player-dock')).toBeNull();
    });

    it('draws no bar on an expanded window, where the expanded placement takes over', async () => {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode('mushaf');
      setWindowWidth(1000);
      startPlayback();

      const view = await renderUi(reader());

      expect(view.queryByTestId('mini-player-reader')).toBeNull();
      expect(mockMushafProps?.contentBottomInset).toBe(0);
    });

    it('draws no bar while the player is idle, and the list keeps no inset', async () => {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode('mushaf');

      const view = await renderUi(reader());

      expect(view.queryByTestId('mini-player-reader')).toBeNull();
      expect(mockMushafProps?.contentBottomInset).toBe(0);
    });
  });

  describe('recitation follow', () => {
    beforeEach(() => {
      usePlayerStore.getState().reset();
    });

    afterEach(() => {
      usePlayerStore.getState().reset();
    });

    // Plays surah 2 with the given ayah recited, in Mushaf mode unless another mode is given.
    async function playingAt(verseKey: string, mode: 'mushaf' | 'reading' = 'mushaf') {
      const { executor } = await openReaderTestContent();
      mockExecutor = executor;
      useReaderSettings.getState().setMode(mode);
      usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 2, positionMs: 0, durationMs: 48_000 });
      usePlayerStore.getState().markPlaying();
      usePlayerStore.setState({ activeVerseId: verseKeyToId(executor, verseKey) ?? null });
    }

    it('turns the Mushaf to the recited ayah when that ayah is the one opened', async () => {
      await playingAt('2:256');
      await renderUi(reader('2:256'));
      expect(mockMushafProps?.anchorVerseKey).toBe('2:256');
    });

    it('opens the chosen ayah while another ayah is playing, and the pill returns to the recitation', async () => {
      await playingAt('2:256');
      const view = await renderUi(reader());

      expect(mockMushafProps?.anchorVerseKey).toBe('2:255');
      expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('2:256');
      expect(view.getByTestId('reader-resume')).toBeOnTheScreen();

      await act(async () => {
        fireEvent.press(view.getByRole('button', { name: 'العودة إلى الآية الحالية' }));
      });
      expect(mockMushafProps?.anchorVerseKey).toBe('2:256');
    });

    it('a drag stops the follow and shows the pill; the pill resumes at once', async () => {
      await playingAt('2:256');
      const view = await renderUi(reader('2:256'));

      await act(async () => {
        mockMushafProps?.onUserScrollStart?.();
      });
      expect(mockMushafProps?.anchorVerseKey).toBe('2:256');
      expect(view.getByTestId('reader-resume')).toBeOnTheScreen();

      await act(async () => {
        fireEvent.press(view.getByRole('button', { name: 'العودة إلى الآية الحالية' }));
      });
      expect(mockMushafProps?.anchorVerseKey).toBe('2:256');
    });

    it('a paused player does not move the reader', async () => {
      await playingAt('2:256');
      usePlayerStore.getState().markPaused();
      const view = await renderUi(reader());
      expect(mockMushafProps?.anchorVerseKey).toBe('2:255');
      expect(view.getByTestId('reader-screen').props.accessibilityLabel).toBe('2:255');
    });

    it('the saved place is the recited ayah while following, in Mushaf', async () => {
      await playingAt('2:256');
      const view = await renderUi(reader('2:256'));
      expect(view.getByTestId('reader-screen').props.accessibilityLabel).toBe('2:256');
      expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('2:256');
    });

    it('the saved place is the recited ayah while following, in Reading', async () => {
      await playingAt('2:256', 'reading');
      const view = await renderUi(reader('2:256'));
      expect(mockReadingProps?.anchorVerseKey).toBe('2:256');
      expect(view.getByTestId('reader-screen').props.accessibilityLabel).toBe('2:256');
    });

    it('while playing, scrolling does not overwrite the saved place (Reading)', async () => {
      await playingAt('2:256', 'reading');
      const view = await renderUi(reader('2:256'));
      await act(async () => {
        mockReadingProps?.onUserScrollStart?.();
      });
      await act(async () => {
        mockReadingProps?.onVisibleVerseKey?.('2:250');
      });
      expect(view.getByTestId('reader-screen').props.accessibilityLabel).toBe('2:256');
      expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('2:256');
    });

    it('while playing, scrolling does not overwrite the saved place (Mushaf)', async () => {
      await playingAt('2:256');
      const { executor } = await openReaderTestContent();
      const view = await renderUi(reader('2:256'));
      await act(async () => {
        mockMushafProps?.onUserScrollStart?.();
      });
      await act(async () => {
        mockMushafProps?.onVisiblePage?.(pageForVerse(executor, '2:250')!, '2:250');
      });
      expect(view.getByTestId('reader-screen').props.accessibilityLabel).toBe('2:256');
      expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('2:256');
    });
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/screens/ReaderScreen.tsx')).toEqual([]);
  });
});
