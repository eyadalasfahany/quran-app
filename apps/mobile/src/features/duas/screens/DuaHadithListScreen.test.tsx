import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import * as duasHooks from '../data/hooks';
import { DuaHadithListScreen } from './DuaHadithListScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('../data/hooks', () => ({
  usePropheticDuaSections: jest.fn(),
}));

const mocked = duasHooks as jest.Mocked<typeof duasHooks>;

describe('DuaHadithListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.usePropheticDuaSections.mockReturnValue([]);
  });

  it('shows the empty state with no rows', async () => {
    await renderUi(<DuaHadithListScreen />);
    expect(screen.getByTestId('dua-hadith-list-empty')).toBeOnTheScreen();
  });

  it('lists grouped rows', async () => {
    mocked.usePropheticDuaSections.mockReturnValue([
      {
        groupId: 1,
        title: 'FIXTURE group title',
        items: [{ duaKey: 'hadeethenc:1', position: 1, groupId: 1, title: 'FIXTURE row title' }],
      },
    ]);
    await renderUi(<DuaHadithListScreen />);
    expect(screen.getByText('FIXTURE group title')).toBeOnTheScreen();
    expect(screen.getByTestId('dua-hadith-row-hadeethenc:1')).toBeOnTheScreen();
  });
});
