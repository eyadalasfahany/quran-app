import { router } from 'expo-router';
import { fireEvent } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { themes } from '@/core/theme';
import { MINI_PLAYER_TABS_FOOTPRINT } from '@/features/audio/mini-player-metrics';
import { usePlayerStore } from '@/features/audio/playerStore';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { IndexScreen } from './IndexScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 59 }) };
});

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

let mockExecutor: SqlExecutor | undefined;
// Flipped to false to show the content database still opening.
const mockContentDb: { ready: boolean } = { ready: true };

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => {
    if (mockExecutor === undefined) {
      throw new Error('openContentDb is unavailable under Jest.');
    }
    return { db: {}, executor: mockExecutor };
  },
  useContentDb: () => ({ error: null, ready: mockContentDb.ready }),
}));

let seeded: SqlExecutor;

beforeAll(async () => {
  seeded = (await openReaderTestContent()).executor;
});

beforeEach(() => {
  mockExecutor = seeded;
  jest.mocked(router.push).mockClear();
});

describe('IndexScreen', () => {
  it('renders the screen surface below the status bar with the title as a header', async () => {
    const view = await renderUi(<IndexScreen />);

    expect(flatStyle(view.getByTestId('screen-index').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surface,
      paddingTop: 59,
    });
    expect(view.getByRole('header', { name: 'الفهرس' })).toBeOnTheScreen();
    expect(view.getByTestId('index-segment')).toBeOnTheScreen();
  });

  it.each([
    ['ar', 'بحث'],
    ['en', 'Search'],
  ] as const)('puts the search button in the header and opens the search screen (%s)', async (locale, label) => {
    const view = await renderUi(<IndexScreen />, { locale });

    await fireEvent.press(view.getByRole('button', { name: label }));

    expect(router.push).toHaveBeenCalledWith('/search');
  });

  it('lists the surahs and opens the first ayah of a surah', async () => {
    const view = await renderUi(<IndexScreen />);

    await fireEvent.press(view.getByTestId('surah-row-1'));

    expect(router.push).toHaveBeenCalledWith('/read/1:1');
  });

  it('switches to the juz list', async () => {
    const view = await renderUi(<IndexScreen />);

    await fireEvent.press(view.getByTestId('index-segment-juz'));
    await fireEvent.press(view.getByTestId('juz-row-1'));

    expect(view.queryByTestId('surah-row-1')).toBeNull();
    expect(router.push).toHaveBeenCalledWith('/read/1:1');
  });

  it('offers to continue from the reading anchor', async () => {
    const view = await renderUi(<IndexScreen />);

    expect(view.getByTestId('index-continue-reading')).toBeOnTheScreen();
  });

  it('renders the header without rows when the content database is unavailable', async () => {
    mockExecutor = undefined;
    const view = await renderUi(<IndexScreen />);

    expect(view.getByRole('header', { name: 'الفهرس' })).toBeOnTheScreen();
    expect(view.queryByTestId('surah-row-1')).toBeNull();
    expect(view.queryByTestId('index-continue-reading')).toBeNull();
  });

  it('shows ten surah row skeletons in a loading region while the content database opens', async () => {
    mockContentDb.ready = false;
    try {
      const view = await renderUi(<IndexScreen />);

      const loading = view.getByTestId('index-loading');
      expect(loading.props.accessibilityLabel).toBe('جارٍ التحميل');
      expect(loading.props.accessibilityState).toEqual({ busy: true });
      expect(view.getByRole('header', { name: 'الفهرس' })).toBeOnTheScreen();
    } finally {
      mockContentDb.ready = true;
    }
  });

  it.each(locales)('renders the title in %s', async (locale) => {
    const view = await renderUi(<IndexScreen />, { locale });

    expect(view.getByRole('header', { name: locale === 'ar' ? 'الفهرس' : 'Index' })).toBeOnTheScreen();
  });

  describe('above the tabs mini bar', () => {
    beforeEach(() => {
      Dimensions.set({
        screen: { fontScale: 1, height: 844, scale: 1, width: 390 },
        window: { fontScale: 1, height: 844, scale: 1, width: 390 },
      });
      usePlayerStore.getState().reset();
    });

    it('pads the bottom of the list by the bar footprint while the bar shows, so the last row clears it', async () => {
      const store = usePlayerStore.getState();
      store.beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
      store.markPlaying();
      const view = await renderUi(<IndexScreen />);

      expect(flatStyle(view.getByTestId('index-list').props.contentContainerStyle).paddingBottom).toBe(MINI_PLAYER_TABS_FOOTPRINT);
    });

    it('adds no bottom padding while the player is idle', async () => {
      const view = await renderUi(<IndexScreen />);

      expect(flatStyle(view.getByTestId('index-list').props.contentContainerStyle).paddingBottom).toBe(0);
    });
  });
});
