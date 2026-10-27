import { router } from 'expo-router';
import { fireEvent } from '@testing-library/react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { themes } from '@/core/theme';

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

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => {
    if (mockExecutor === undefined) {
      throw new Error('openContentDb is unavailable under Jest.');
    }
    return { db: {}, executor: mockExecutor };
  },
  useContentDb: () => ({ error: null, ready: true }),
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

  it.each(locales)('renders the title in %s', async (locale) => {
    const view = await renderUi(<IndexScreen />, { locale });

    expect(view.getByRole('header', { name: locale === 'ar' ? 'الفهرس' : 'Index' })).toBeOnTheScreen();
  });
});
