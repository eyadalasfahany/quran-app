import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import * as duasHooks from '../data/hooks';
import { DuasHomeScreen } from './DuasHomeScreen';

const mockedDuasHooks = duasHooks as jest.Mocked<typeof duasHooks>;

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('../data/hooks', () => ({
  useMyDuas: jest.fn(),
  usePropheticDuaSections: jest.fn(),
  useQuranicDuasAvailable: jest.fn(),
  useQuranicDuasList: jest.fn(),
}));

describe('DuasHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDuasHooks.useMyDuas.mockReturnValue([]);
    mockedDuasHooks.useQuranicDuasAvailable.mockReturnValue(false);
    mockedDuasHooks.useQuranicDuasList.mockReturnValue([]);
    mockedDuasHooks.usePropheticDuaSections.mockReturnValue([]);
  });

  it('always shows the mine card', async () => {
    await renderUi(<DuasHomeScreen />);
    expect(screen.getByTestId('duas-mine-card')).toBeOnTheScreen();
  });

  it('always shows the add-mine button at the bottom of the scroll', async () => {
    await renderUi(<DuasHomeScreen />);
    expect(screen.getByTestId('duas-home-add-mine')).toBeOnTheScreen();
  });

  it('hides quran and sunnah sections when no content exists', async () => {
    await renderUi(<DuasHomeScreen />);
    expect(screen.queryByTestId('duas-categories-heading')).toBeNull();
    expect(screen.queryByTestId('duas-quran-section')).toBeNull();
    expect(screen.queryByTestId('duas-sunnah-section')).toBeNull();
    expect(screen.queryByTestId('duas-source-hisn')).toBeNull();
    expect(screen.queryByTestId('duas-source-hadith')).toBeNull();
    expect(screen.queryByTestId('duas-source-hadith-pending')).toBeNull();
    expect(screen.queryByTestId('duas-hisn-topics-heading')).toBeNull();
    expect(screen.queryByTestId('duas-attribution-line')).toBeNull();
  });

  it('shows the quran section alone when only Quranic duas exist', async () => {
    mockedDuasHooks.useQuranicDuasAvailable.mockReturnValue(true);
    mockedDuasHooks.useQuranicDuasList.mockReturnValue([
      { duaKey: 'quran:1:1', position: 1, surah: 1, verseFrom: 1, verseTo: null },
    ]);
    await renderUi(<DuasHomeScreen />);
    expect(screen.getByTestId('duas-quran-section')).toBeOnTheScreen();
    expect(screen.getByTestId('duas-category-quran')).toBeOnTheScreen();
    expect(screen.queryByTestId('duas-sunnah-section')).toBeNull();
  });

  it('shows prophetic topic tiles from sections with items and a group id', async () => {
    mockedDuasHooks.usePropheticDuaSections.mockReturnValue([
      {
        groupId: 2,
        title: 'FIXTURE category title',
        items: [{ duaKey: 'hadeethenc:1', position: 1, groupId: 2, title: 'FIXTURE row title' }],
      },
      {
        groupId: 3,
        title: 'FIXTURE empty group',
        items: [],
      },
      {
        groupId: null,
        title: 'FIXTURE ungrouped',
        items: [{ duaKey: 'hadeethenc:2', position: 2, groupId: null, title: 'FIXTURE row title 2' }],
      },
    ]);
    await renderUi(<DuasHomeScreen />);
    expect(screen.getByTestId('duas-sunnah-section')).toBeOnTheScreen();
    expect(screen.getByTestId('duas-category-hadith-2')).toBeOnTheScreen();
    expect(screen.queryByTestId('duas-category-hadith-3')).toBeNull();
    expect(screen.getByText('FIXTURE category title')).toBeOnTheScreen();
    expect(screen.queryByTestId('duas-quran-section')).toBeNull();
  });
});
