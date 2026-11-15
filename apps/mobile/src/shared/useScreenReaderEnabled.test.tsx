import { act, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';

import { renderUi } from '../../jest/render-ui';

import { useScreenReaderEnabled } from './useScreenReaderEnabled';

function Probe() {
  const enabled = useScreenReaderEnabled();
  return <Text>{enabled ? 'on' : 'off'}</Text>;
}

describe('useScreenReaderEnabled', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reads the setting and follows its changes', async () => {
    let listener: ((enabled: boolean) => void) | undefined;
    const remove = jest.fn();
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_event, handler) => {
      listener = handler as (enabled: boolean) => void;
      return { remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>;
    });

    const view = await renderUi(<Probe />);
    await act(async () => undefined);
    expect(screen.getByText('off')).toBeTruthy();

    await act(async () => listener?.(true));
    expect(screen.getByText('on')).toBeTruthy();

    await act(async () => view.unmount());
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
