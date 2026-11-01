import { act, waitFor } from '@testing-library/react-native';
import { getNetworkStateAsync } from 'expo-network';
import { Text } from 'react-native';

import { renderUi } from '../../../jest/render-ui';

import { resetNetworkStateForTests, useNetworkStatus } from './network-state';
import { useOnline } from './useOnline';

// A short debounce keeps these tests on real timers.
const DEBOUNCE_MS = 60;

// Reads the hook into text, so the test asserts what a screen would draw.
function Probe() {
  const online = useOnline(DEBOUNCE_MS);
  return <Text>{online ? 'online' : 'offline'}</Text>;
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function setNetwork(online: boolean): Promise<void> {
  await act(async () => {
    useNetworkStatus.setState({ online });
  });
}

beforeEach(() => {
  resetNetworkStateForTests();
  // The first network read would answer «connected» after the test has set the state; keep it pending.
  jest.mocked(getNetworkStateAsync).mockReturnValue(new Promise(() => undefined));
});

afterEach(() => {
  resetNetworkStateForTests();
  jest.mocked(getNetworkStateAsync).mockResolvedValue({ isConnected: true, isInternetReachable: true, type: 'WIFI' } as never);
});

describe('useOnline', () => {
  it('starts online until the device says otherwise', async () => {
    const view = await renderUi(<Probe />);

    expect(view.getByText('online')).toBeOnTheScreen();
  });

  it('follows an offline change only after the debounce', async () => {
    const view = await renderUi(<Probe />);

    await setNetwork(false);
    expect(view.getByText('online')).toBeOnTheScreen();

    await waitFor(() => {
      expect(view.getByText('offline')).toBeOnTheScreen();
    });
  });

  it('does not flicker: a drop that returns inside the debounce is never shown', async () => {
    const view = await renderUi(<Probe />);

    await setNetwork(false);
    await setNetwork(true);
    await act(async () => {
      await pause(DEBOUNCE_MS * 3);
    });

    expect(view.getByText('online')).toBeOnTheScreen();
    expect(view.queryByText('offline')).toBeNull();
  });

  it('returns to online after the debounce once the connection is back', async () => {
    await setNetwork(false);
    const view = await renderUi(<Probe />);
    await waitFor(() => {
      expect(view.getByText('offline')).toBeOnTheScreen();
    });

    await setNetwork(true);

    await waitFor(() => {
      expect(view.getByText('online')).toBeOnTheScreen();
    });
  });
});
