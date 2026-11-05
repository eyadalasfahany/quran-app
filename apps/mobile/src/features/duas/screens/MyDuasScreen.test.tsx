import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { renderUi } from '../../../../jest/render-ui';
import { useMyDuas } from '../data/hooks';
import { MyDuasScreen } from './MyDuasScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: jest.fn(() => ({ bottom: 0, left: 0, right: 0, top: 0 })),
  };
});

jest.mock('../data/hooks', () => ({
  useMyDuas: jest.fn(),
}));

// The row is stubbed: its bell press is exposed as a press on the stub.
jest.mock('../components/MyDuaRow', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    MyDuaRow: ({ onBellPress }: { onBellPress: () => void }) => (
      <Text onPress={onBellPress} testID="my-dua-row">
        row
      </Text>
    ),
  };
});

const ROW = {
  id: 'dua-1',
  title: null,
  body: 'FIXTURE text 1 — not a dua',
  textSearch: 'fixture',
  createdAt: 1,
  updatedAt: 1,
};

describe('MyDuasScreen', () => {
  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    jest.mocked(useSafeAreaInsets).mockReturnValue({ bottom: 0, left: 0, right: 0, top: 0 });
  });

  it('shows the empty state, with no intro line', async () => {
    jest.mocked(useMyDuas).mockReturnValue([]);
    await renderUi(<MyDuasScreen />);
    expect(screen.getByTestId('my-duas-empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('my-duas-intro')).toBeNull();
  });

  it('lists rows, with the intro line and the add pill', async () => {
    jest.mocked(useMyDuas).mockReturnValue([ROW]);
    await renderUi(<MyDuasScreen />);
    expect(screen.getByTestId('my-dua-row')).toBeOnTheScreen();
    expect(screen.getByTestId('my-duas-intro')).toHaveTextContent('هذه الأدعية من كتابتك، وتبقى على جهازك فقط.');
    expect(screen.getByTestId('my-duas-add')).toBeOnTheScreen();
  });

  it('keeps the add pill clear of the home indicator', async () => {
    jest.mocked(useMyDuas).mockReturnValue([ROW]);
    jest.mocked(useSafeAreaInsets).mockReturnValue({ bottom: 34, left: 0, right: 0, top: 0 });
    await renderUi(<MyDuasScreen />);
    const padding = StyleSheet.flatten(screen.getByTestId('my-duas-footer').props.style).paddingBottom;
    expect(padding).toBeGreaterThanOrEqual(34);
  });

  it('opens the editor with its reminder row expanded from the bell', async () => {
    jest.mocked(useMyDuas).mockReturnValue([ROW]);
    await renderUi(<MyDuasScreen />);
    fireEvent.press(screen.getByTestId('my-dua-row'));
    expect(router.push).toHaveBeenCalledWith('/duas/mine/edit?id=dua-1&reminder=1');
  });
});
