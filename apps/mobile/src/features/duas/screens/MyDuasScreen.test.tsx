import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { useMyDuas } from '../data/hooks';
import { MyDuasScreen } from './MyDuasScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('../data/hooks', () => ({
  useMyDuas: jest.fn(),
}));

jest.mock('../components/MyDuaRow', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    MyDuaRow: () => <Text testID="my-dua-row">row</Text>,
  };
});

describe('MyDuasScreen', () => {
  it('shows the empty state', async () => {
    jest.mocked(useMyDuas).mockReturnValue([]);
    await renderUi(<MyDuasScreen />);
    expect(screen.getByTestId('my-duas-empty')).toBeOnTheScreen();
  });

  it('lists rows and the add pill', async () => {
    jest.mocked(useMyDuas).mockReturnValue([
      {
        id: 'dua-1',
        title: null,
        body: 'FIXTURE text 1 — not a dua',
        textSearch: 'fixture',
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    await renderUi(<MyDuasScreen />);
    expect(screen.getByTestId('my-dua-row')).toBeOnTheScreen();
    expect(screen.getByTestId('my-duas-add')).toBeOnTheScreen();
  });
});
