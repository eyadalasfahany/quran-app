import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderUi } from '../../../../jest/render-ui';
import { initialAzkarPlayerState, useAzkarPlayerStore } from '../audio/azkarPlayerStore';
import { buildAzkarQueue } from '../audio/queue';
import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { makeUnit } from '../../../../jest/azkar-ui-fixtures';

import { AzkarPlayerScreen } from './AzkarPlayerScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
  Stack: { Screen: () => null },
}));

jest.mock('@/features/reader/components/SheetHost', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SheetHost: ({ children, testID }: { children: React.ReactNode; testID?: string }) =>
      React.createElement(RNView, { testID }, children),
  };
});

jest.mock('../components/AzkarPlayerBody', () => ({
  AzkarPlayerBody: () => {
    const { Text: RNText } = jest.requireActual<typeof import('react-native')>('react-native');
    return <RNText>FIXTURE body</RNText>;
  },
}));

const mockBack = router.back as jest.Mock;

function playing() {
  const queue = buildAzkarQueue([makeUnit({ unitKey: 'u1', entryKey: 'fixture:e1' })], () => makeRecording());
  useAzkarPlayerStore.setState({
    ...initialAzkarPlayerState,
    scope: { scopeKey: 'category:fixture', periodKey: 'session', title: 'FIXTURE' },
    queue,
    index: 0,
    status: 'playing',
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  useAzkarPlayerStore.setState(initialAzkarPlayerState);
});

describe('AzkarPlayerScreen', () => {
  it('opens the sheet over the reader while a scope is playing', async () => {
    playing();
    await renderUi(<AzkarPlayerScreen />);
    expect(screen.getByTestId('azkar-player-sheet')).toBeTruthy();
    expect(screen.getByText('FIXTURE body')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('leaves the route, and draws nothing, when nothing is queued', async () => {
    await renderUi(<AzkarPlayerScreen />);
    expect(screen.queryByTestId('azkar-player-sheet')).toBeNull();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
