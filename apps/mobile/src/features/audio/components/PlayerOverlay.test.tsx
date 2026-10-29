import { act } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';

import { PlayerHostContext, type PlayerHostValue } from './player-host-context';
import { PlayerOverlay } from './PlayerOverlay';

function hostWith(setOverlay: PlayerHostValue['setOverlay']): PlayerHostValue {
  return { close: jest.fn(), panGesture: {} as PlayerHostValue['panGesture'], scrollOffset: { value: 0 } as PlayerHostValue['scrollOffset'], scrollTouched: { value: false } as PlayerHostValue['scrollTouched'], setOverlay };
}

describe('PlayerOverlay', () => {
  it('renders its children in place outside a player host', async () => {
    const view = await renderUi(
      <PlayerOverlay>
        <Text>قائمة</Text>
      </PlayerOverlay>,
    );

    expect(view.getByText('قائمة')).toBeOnTheScreen();
  });

  it('hands its children to the host overlay instead of rendering them, and clears it on unmount', async () => {
    const setOverlay = jest.fn();
    const view = await renderUi(
      <PlayerHostContext.Provider value={hostWith(setOverlay)}>
        <PlayerOverlay>
          <Text>قائمة</Text>
        </PlayerOverlay>
      </PlayerHostContext.Provider>,
    );

    expect(view.queryByText('قائمة')).toBeNull();
    expect(setOverlay).toHaveBeenCalledWith(expect.anything());
    await act(async () => {
      view.unmount();
    });
    expect(setOverlay).toHaveBeenLastCalledWith(null);
  });
});
