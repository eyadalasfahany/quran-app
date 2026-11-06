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
import type { Bookmark } from '@/features/library/data';
import * as repository from '@/features/library/data/repository';
import { verseKeyToId } from '../data/verses';
import * as readingAnchor from '../anchor/reading-anchor';
import { resetReaderSelection, useReaderSelection } from '../selection';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { resetReaderSettingsStore, useReaderSettings } from '../settings';
import { ReaderScreen } from './ReaderScreen';

// Only the tests that need content open it, so the others keep rendering the reader shell alone.
let mockExecutor: SqlExecutor | undefined;

// The user database is not open under Jest, so the screen's highlight and bookmark hooks are stubbed here.
let mockBookmarks: Bookmark[] = [];
let mockHighlights: ReadonlyMap<number, 'gold' | 'green' | 'blue' | 'rose'> = new Map();
jest.mock('@/features/library/data/hooks', () => ({
  ...jest.requireActual<typeof import('@/features/library/data/hooks')>('@/features/library/data/hooks'),
  useHighlightsByVerseId: () => mockHighlights,
  useBookmarks: () => ({ data: mockBookmarks }),
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
      onOpenAyahActions?: (verseKey: string) => void;
      onSelectVerseKey?: (verseKey: string) => void;
      placeVerseKey?: string | null;
      topInset?: number;
      onVisiblePage?: (page: number, verseKey: string) => void;
      onUserScrollStart?: () => void;
    }
  | undefined;
jest.mock('../HafsMushafList', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HafsMushafList: (props: NonNullable<typeof mockMushafProps> & { testID?: string; topInset?: number }) => {
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
      onOpenAyahActions?: (verseKey: string) => void;
      onOpenTafsir?: (verseKey: string) => void;
      onSelectVerseKey?: (verseKey: string) => void;
      onUserScrollStart?: () => void;
      onVisibleVerseKey?: (verseKey: string) => void;
      showInlineTafsir?: boolean;
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

const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useSegments: jest.fn(() => []),
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: (...args: unknown[]) => mockRouterPush(...args),
    replace: jest.fn(),
  },
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
    mockRouterPush.mockClear();
    mockBookmarks = [];
    mockHighlights = new Map();
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

  it('toggles inline tafsir in reading mode without opening the tafsir sheet', async () => {
    mockExecutor = (await openReaderTestContent()).executor;
    useReaderSettings.getState().setMode('reading');
    await renderUi(reader());

    expect(useReaderSelection.getState().inlineTafsirOpen).toBe(false);
    expect(mockReadingProps?.showInlineTafsir).toBe(false);

    await act(async () => {
      mockReadingProps?.onOpenTafsir?.('2:255');
    });

    expect(useReaderSelection.getState().inlineTafsirOpen).toBe(true);
    expect(useReaderSelection.getState().verseKey).toBe('2:255');
    expect(mockRouterPush).not.toHaveBeenCalledWith('/tafsir/2:255');
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

  describe('ADR 0037 follow and tap', () => {
    let writeAnchor: jest.SpiedFunction<typeof readingAnchor.writeReadingAnchor>;

    beforeEach(() => {
      jest.useFakeTimers();
      usePlayerStore.getState().reset();
      writeAnchor = jest.spyOn(readingAnchor, 'writeReadingAnchor').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.useRealTimers();
      usePlayerStore.getState().reset();
      writeAnchor.mockRestore();
    });

    async function playingAt(verseKey: string, mode: 'mushaf' | 'reading' | 'focus') {
      const { executor } = await openReaderTestContent();
      mockExecutor = executor;
      useReaderSettings.getState().setMode(mode);
      usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 2, positionMs: 0, durationMs: 48_000 });
      usePlayerStore.getState().markPlaying();
      usePlayerStore.setState({ activeVerseId: verseKeyToId(executor, verseKey) ?? null });
      return { executor, verseKey };
    }

    async function scrollAwayFromRecitation(mode: 'mushaf' | 'reading', executor: SqlExecutor) {
      await act(async () => {
        if (mode === 'mushaf') {
          mockMushafProps?.onUserScrollStart?.();
          mockMushafProps?.onVisiblePage?.(pageForVerse(executor, '2:250')!, '2:250');
        } else {
          mockReadingProps?.onUserScrollStart?.();
          mockReadingProps?.onVisibleVerseKey?.('2:250');
        }
      });
    }

    it.each(['mushaf', 'reading'] as const)(
      'in %s, a drag pauses following and it stays paused after 10 s with no jump back',
      async (mode) => {
        const { executor } = await playingAt('2:256', mode);
        await renderUi(reader('2:256'));
        const anchorBefore = mode === 'mushaf' ? mockMushafProps?.anchorVerseKey : mockReadingProps?.anchorVerseKey;

        await scrollAwayFromRecitation(mode, executor);
        await act(async () => {
          jest.advanceTimersByTime(10_000);
        });

        if (mode === 'mushaf') {
          expect(mockMushafProps?.anchorVerseKey).toBe(anchorBefore);
        } else {
          expect(mockReadingProps?.anchorVerseKey).toBe(anchorBefore);
        }
      },
    );

    it.each(['mushaf', 'reading'] as const)(
      'in %s, the resume pill appears off the recited ayah and resumes following',
      async (mode) => {
        const { executor } = await playingAt('2:256', mode);
        const view = await renderUi(reader('2:256'));
        await scrollAwayFromRecitation(mode, executor);

        expect(view.getByTestId('reader-resume')).toBeOnTheScreen();
        await act(async () => {
          fireEvent.press(view.getByRole('button', { name: 'العودة إلى الآية الحالية' }));
        });

        if (mode === 'mushaf') {
          expect(mockMushafProps?.anchorVerseKey).toBe('2:256');
        } else {
          expect(mockReadingProps?.anchorVerseKey).toBe('2:256');
        }
      },
    );

    it.each(['mushaf', 'reading'] as const)(
      'in %s, a play command resumes following but an automatic ayah advance does not',
      async (mode) => {
        const { executor } = await playingAt('2:256', mode);
        await renderUi(reader('2:256'));
        await scrollAwayFromRecitation(mode, executor);

        await act(async () => {
          usePlayerStore.getState().bumpPlayCommand();
        });
        if (mode === 'mushaf') {
          expect(mockMushafProps?.anchorVerseKey).toBe('2:256');
        } else {
          expect(mockReadingProps?.anchorVerseKey).toBe('2:256');
        }

        await scrollAwayFromRecitation(mode, executor);
        const anchorPaused = mode === 'mushaf' ? mockMushafProps?.anchorVerseKey : mockReadingProps?.anchorVerseKey;

        await act(async () => {
          usePlayerStore.setState({ activeVerseId: verseKeyToId(executor, '2:257') ?? null });
        });

        if (mode === 'mushaf') {
          expect(mockMushafProps?.anchorVerseKey).toBe(anchorPaused);
        } else {
          expect(mockReadingProps?.anchorVerseKey).toBe(anchorPaused);
        }
      },
    );

    it.each(['mushaf', 'reading'] as const)(
      'in %s, tapping an ayah opens selection without a highlight write, anchor write or player change',
      async (mode) => {
        mockExecutor = (await openReaderTestContent()).executor;
        useReaderSettings.getState().setMode(mode);
        const playerBefore = usePlayerStore.getState();
        await renderUi(reader('2:255'));

        writeAnchor.mockClear();
        await act(async () => {
          if (mode === 'mushaf') {
            mockMushafProps?.onSelectVerseKey?.('2:250');
          } else {
            mockReadingProps?.onSelectVerseKey?.('2:250');
          }
        });

        expect(useReaderSelection.getState().verseKey).toBe('2:250');
        expect(writeAnchor).not.toHaveBeenCalled();
        expect(usePlayerStore.getState()).toMatchObject({
          chapterId: playerBefore.chapterId,
          status: playerBefore.status,
          activeVerseId: playerBefore.activeVerseId,
        });
        expect(mockMushafProps).not.toHaveProperty('selectedVerseKey');
        expect(mockReadingProps).not.toHaveProperty('selectedVerseKey');
      },
    );

    it('in mushaf, the toolbar ayah actions button opens selection without adding a highlight', async () => {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode('mushaf');
      const view = await renderUi(reader('2:255'));

      await act(async () => {
        fireEvent.press(view.getByRole('button', { name: 'خيارات الآية' }));
      });

      expect(useReaderSelection.getState().verseKey).not.toBeNull();
    });

    it.each(['mushaf', 'reading'] as const)(
      'in %s, no resume pill after tapping an ayah and scrolling away while idle',
      async (mode) => {
        mockExecutor = (await openReaderTestContent()).executor;
        useReaderSettings.getState().setMode(mode);
        const view = await renderUi(reader('2:255'));

        await act(async () => {
          if (mode === 'mushaf') {
            mockMushafProps?.onSelectVerseKey?.('2:250');
            mockMushafProps?.onVisiblePage?.(pageForVerse(mockExecutor!, '2:252')!, '2:252');
          } else {
            mockReadingProps?.onSelectVerseKey?.('2:250');
            mockReadingProps?.onVisibleVerseKey?.('2:252');
          }
        });

        expect(view.queryByTestId('reader-resume')).toBeNull();
      },
    );

    it('in focus, shows the resume pill off the recited ayah and returns on press', async () => {
      await playingAt('2:256', 'focus');
      const view = await renderUi(reader('2:255'));

      expect(view.getByTestId('reader-resume')).toBeOnTheScreen();
      await act(async () => {
        fireEvent.press(view.getByRole('button', { name: 'العودة إلى الآية الحالية' }));
      });
      expect(view.getByTestId('reader-screen').props.accessibilityLabel).toBe('2:256');
    });

    it('in focus, tapping opens selection without writing the anchor', async () => {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode('focus');
      const view = await renderUi(reader('1:1'));
      writeAnchor.mockClear();

      await fireEvent.press(view.getByTestId('focus-stage-marker'));

      expect(useReaderSelection.getState().verseKey).toBe('1:1');
      expect(writeAnchor).not.toHaveBeenCalled();
    });
  });

  describe('ADR 0072 a tap only opens options', () => {
    let setHighlight: jest.SpiedFunction<typeof repository.setHighlight>;

    beforeEach(() => {
      setHighlight = jest.spyOn(repository, 'setHighlight').mockImplementation(() => null);
    });

    afterEach(() => {
      setHighlight.mockRestore();
    });

    it.each([
      ['mushaf', 'onSelectVerseKey'],
      ['mushaf', 'onOpenAyahActions'],
      ['reading', 'onSelectVerseKey'],
      ['reading', 'onOpenAyahActions'],
    ] as const)('in %s, %s sets the selection and never writes a highlight', async (mode, handler) => {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode(mode);
      await renderUi(reader('2:255'));

      await act(async () => {
        if (mode === 'mushaf') {
          mockMushafProps?.[handler]?.('2:250');
        } else {
          mockReadingProps?.[handler]?.('2:250');
        }
      });

      expect(useReaderSelection.getState().verseKey).toBe('2:250');
      expect(setHighlight).not.toHaveBeenCalled();
    });

    it('in focus, pressing the ayah marker sets the selection and never writes a highlight', async () => {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode('focus');
      const view = await renderUi(reader('1:1'));

      await fireEvent.press(view.getByTestId('focus-stage-marker'));

      expect(useReaderSelection.getState().verseKey).toBe('1:1');
      expect(setHighlight).not.toHaveBeenCalled();
    });
  });

  describe('ADR 0070 saved wash and place wash', () => {
    it('in mushaf, a verse bookmark is washed green in the highlights the list draws', async () => {
      const { executor } = await openReaderTestContent();
      mockExecutor = executor;
      useReaderSettings.getState().setMode('mushaf');
      const savedId = verseKeyToId(executor, '2:250')!;
      mockBookmarks = [{ id: 'bookmark-1', verseId: savedId, kind: 'verse', page: null, clientUpdatedAt: 1 }];

      await renderUi(reader('2:255'));

      expect(mockMushafProps?.highlightsByVerseId?.get(savedId)).toBe('green');
    });

    it('in mushaf, a saved ayah with its own colour is drawn green', async () => {
      const { executor } = await openReaderTestContent();
      mockExecutor = executor;
      useReaderSettings.getState().setMode('mushaf');
      const savedId = verseKeyToId(executor, '2:250')!;
      mockBookmarks = [{ id: 'bookmark-1', verseId: savedId, kind: 'verse', page: null, clientUpdatedAt: 1 }];
      mockHighlights = new Map([[savedId, 'rose']]);

      await renderUi(reader('2:255'));

      expect(mockMushafProps?.highlightsByVerseId?.get(savedId)).toBe('green');
    });

    it('in mushaf, a page bookmark adds no wash', async () => {
      const { executor } = await openReaderTestContent();
      mockExecutor = executor;
      useReaderSettings.getState().setMode('mushaf');
      const verseId = verseKeyToId(executor, '2:250')!;
      mockBookmarks = [{ id: 'bookmark-1', verseId, kind: 'page', page: 50, clientUpdatedAt: 1 }];

      await renderUi(reader('2:255'));

      expect(mockMushafProps?.highlightsByVerseId?.has(verseId)).toBe(false);
    });

    it('in mushaf, a continue-reading open washes the opened ayah as the place', async () => {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode('mushaf');

      await renderUi(
        <SafeAreaProvider initialMetrics={metrics}>
          <ReaderScreen markPlace verseKey="2:255" />
        </SafeAreaProvider>,
      );

      expect(mockMushafProps?.placeVerseKey).toBe('2:255');
    });

    it('in mushaf, the place wash ends at the first drag', async () => {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode('mushaf');
      await renderUi(
        <SafeAreaProvider initialMetrics={metrics}>
          <ReaderScreen markPlace verseKey="2:255" />
        </SafeAreaProvider>,
      );

      await act(async () => {
        mockMushafProps?.onUserScrollStart?.();
      });

      expect(mockMushafProps?.placeVerseKey).toBeNull();
    });

    it('in mushaf, the place wash ends at a mode change', async () => {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode('mushaf');
      await renderUi(
        <SafeAreaProvider initialMetrics={metrics}>
          <ReaderScreen markPlace verseKey="2:255" />
        </SafeAreaProvider>,
      );

      await act(async () => {
        useReaderSettings.getState().setMode('reading');
      });
      await act(async () => {
        useReaderSettings.getState().setMode('mushaf');
      });

      expect(mockMushafProps?.placeVerseKey).toBeNull();
    });

    it('without markPlace, the Mushaf list gets no place wash', async () => {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode('mushaf');

      await renderUi(reader('2:255'));

      expect(mockMushafProps?.placeVerseKey ?? null).toBeNull();
    });
  });

  describe('ADR 0071 Mushaf full screen', () => {
    beforeEach(() => {
      Dimensions.set({
        screen: { fontScale: 1, height: 844, scale: 1, width: 390 },
        window: { fontScale: 1, height: 844, scale: 1, width: 390 },
      });
      usePlayerStore.getState().reset();
    });

    afterEach(() => {
      usePlayerStore.getState().reset();
    });

    async function playingMushaf() {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode('mushaf');
      const store = usePlayerStore.getState();
      store.beginLoad({ reciterId: 30, chapterId: 2, positionMs: 0, durationMs: 48_000 });
      store.markPlaying();
    }

    it('hides the toolbar and the player bar, shows the exit, and lifts the Mushaf list to the top and bottom', async () => {
      await playingMushaf();
      const view = await renderUi(reader('2:255'));
      expect(mockMushafProps?.contentBottomInset).toBe(108);
      const statusBefore = usePlayerStore.getState().status;

      await act(async () => {
        fireEvent.press(view.getByRole('button', { name: 'ملء الشاشة' }));
      });

      expect(view.queryByTestId('reader-toolbar')).toBeNull();
      expect(view.queryByTestId('mini-player-reader')).toBeNull();
      expect(view.getByRole('button', { name: 'الخروج من ملء الشاشة' })).toBeOnTheScreen();
      expect(mockMushafProps?.topInset).toBe(0);
      expect(mockMushafProps?.contentBottomInset).toBe(0);
      expect(usePlayerStore.getState().status).toBe(statusBefore);
    });

    it('exit restores the toolbar, the player bar and the list insets', async () => {
      await playingMushaf();
      const view = await renderUi(reader('2:255'));
      await act(async () => {
        fireEvent.press(view.getByRole('button', { name: 'ملء الشاشة' }));
      });

      await act(async () => {
        fireEvent.press(view.getByRole('button', { name: 'الخروج من ملء الشاشة' }));
      });

      expect(view.getByTestId('reader-toolbar')).toBeOnTheScreen();
      expect(view.getByTestId('mini-player-reader')).toBeOnTheScreen();
      expect(mockMushafProps?.topInset).toBeGreaterThan(0);
      expect(mockMushafProps?.contentBottomInset).toBe(108);
    });

    it('closes an open side panel when full screen starts', async () => {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode('mushaf');
      useReaderSelection.getState().setPanelOpen(true);
      const view = await renderUi(reader('2:255'));

      await act(async () => {
        fireEvent.press(view.getByRole('button', { name: 'ملء الشاشة' }));
      });

      expect(useReaderSelection.getState().panelOpen).toBe(false);
    });

    it('draws no full screen button in Reading mode', async () => {
      mockExecutor = (await openReaderTestContent()).executor;
      useReaderSettings.getState().setMode('reading');
      const view = await renderUi(reader('2:255'));

      expect(view.queryByRole('button', { name: 'ملء الشاشة' })).toBeNull();
    });
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/screens/ReaderScreen.tsx')).toEqual([]);
  });
});
