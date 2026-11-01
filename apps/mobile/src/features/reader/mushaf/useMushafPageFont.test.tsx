import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { getNetworkStateAsync } from 'expo-network';
import { Pressable, Text } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';
import { resetNetworkStateForTests, useNetworkStatus } from '@/core/network/network-state';
import { ONLINE_DEBOUNCE_MS } from '@/core/network/useOnline';

import { ensurePageFont } from './fonts';
import { useMushafPageFont } from './useMushafPageFont';

jest.mock('./fonts', () => ({ ensurePageFont: jest.fn() }));

const ensure = jest.mocked(ensurePageFont);

// Reads the hook into text and a retry control, so the test asserts what the placeholder would offer.
function Probe({ page }: { page: number }) {
  const font = useMushafPageFont(page);
  return (
    <>
      <Text>{font.status === 'ready' ? `ready ${font.fontFamily}` : font.status}</Text>
      {font.status === 'error' ? (
        <Pressable accessibilityRole="button" onPress={font.retry}>
          <Text>retry</Text>
        </Pressable>
      ) : null}
    </>
  );
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

beforeEach(() => {
  ensure.mockReset();
  resetNetworkStateForTests();
  // Keep the first network read pending, so only the test changes the connection state.
  jest.mocked(getNetworkStateAsync).mockReturnValue(new Promise(() => undefined));
  useNetworkStatus.setState({ online: true });
});

afterEach(() => {
  resetNetworkStateForTests();
  jest.mocked(getNetworkStateAsync).mockResolvedValue({ isConnected: true, isInternetReachable: true, type: 'WIFI' } as never);
});

describe('useMushafPageFont', () => {
  it('is ready once the page font loads', async () => {
    ensure.mockResolvedValue('qcf-v2-p1');

    const view = await renderUi(<Probe page={1} />);

    await waitFor(() => {
      expect(view.getByText('ready qcf-v2-p1')).toBeOnTheScreen();
    });
  });

  it('is in error with a retry when the font fails, and loads the font again when retried', async () => {
    ensure.mockRejectedValueOnce(new Error('offline'));
    const view = await renderUi(<Probe page={2} />);
    await waitFor(() => {
      expect(view.getByText('error')).toBeOnTheScreen();
    });

    ensure.mockResolvedValueOnce('qcf-v2-p2');
    await fireEvent.press(view.getByText('retry'));

    await waitFor(() => {
      expect(view.getByText('ready qcf-v2-p2')).toBeOnTheScreen();
    });
    expect(ensure).toHaveBeenCalledTimes(2);
  });

  it('tries again by itself when the connection comes back while the font is failing', async () => {
    ensure.mockRejectedValueOnce(new Error('offline'));
    const view = await renderUi(<Probe page={3} />);
    await waitFor(() => {
      expect(view.getByText('error')).toBeOnTheScreen();
    });

    ensure.mockResolvedValueOnce('qcf-v2-p3');
    await act(async () => {
      useNetworkStatus.setState({ online: false });
    });
    await act(async () => {
      await pause(ONLINE_DEBOUNCE_MS + 100);
    });
    await act(async () => {
      useNetworkStatus.setState({ online: true });
    });

    await waitFor(
      () => {
        expect(view.getByText('ready qcf-v2-p3')).toBeOnTheScreen();
      },
      { timeout: ONLINE_DEBOUNCE_MS + 3000 },
    );
    expect(ensure).toHaveBeenCalledTimes(2);
  });

  it('does not loop on a failing font while the device stays online', async () => {
    ensure.mockRejectedValue(new Error('server'));
    const view = await renderUi(<Probe page={4} />);
    await waitFor(() => {
      expect(view.getByText('error')).toBeOnTheScreen();
    });

    await act(async () => {
      await pause(50);
    });

    expect(ensure).toHaveBeenCalledTimes(1);
  });
});
