import type { SharedValue } from 'react-native-reanimated';

import { beginPlayerDrag, followPlayerDrag, type PlayerDrag } from './player-motion';

function value(initial: number): SharedValue<number> {
  return { value: initial } as SharedValue<number>;
}

function dragAt(offset: number): PlayerDrag {
  return { anchor: value(0), anchorY: value(0), offset: value(offset) };
}

describe('player drag', () => {
  it('follows a downward drag from where the pan activated, without jumping', () => {
    const drag = dragAt(0);
    beginPlayerDrag(drag, 10);
    followPlayerDrag(drag, 70, false);
    expect(drag.offset.value).toBe(60);
  });

  it('holds still while the touch scrolls the content, and rebases so it does not jump after', () => {
    const drag = dragAt(0);
    beginPlayerDrag(drag, 0);
    followPlayerDrag(drag, 80, true);
    expect(drag.offset.value).toBe(0);

    followPlayerDrag(drag, 110, false);
    expect(drag.offset.value).toBe(30);
  });

  it('holds at the top for an upward drag', () => {
    const drag = dragAt(40);
    beginPlayerDrag(drag, 0);
    followPlayerDrag(drag, -200, false);
    expect(drag.offset.value).toBe(0);
  });
});
