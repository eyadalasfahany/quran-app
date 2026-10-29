import type { SharedValue } from 'react-native-reanimated';

import { sheetDetents, type Detent, type SheetDetents } from '../form-sheet';
import { beginDrag, followDrag, type SheetMotion } from './sheet-motion';

function value<T>(initial: T): SharedValue<T> {
  return { value: initial } as SharedValue<T>;
}

const detents = sheetDetents(844, 47);

function motionAt(detent: Detent, options: { scrollOffset?: number; scrollTouched?: boolean } = {}): SheetMotion {
  return {
    activationTop: value(detents[detent]),
    anchorTop: value(detents[detent]),
    anchorY: value(0),
    detent: value(detent),
    dragged: value(false),
    fade: value(1),
    positions: value<SheetDetents>(detents),
    scrollOffset: value(options.scrollOffset ?? 0),
    scrollTouched: value(options.scrollTouched ?? false),
    top: value(detents[detent]),
  };
}

describe('sheet drag', () => {
  it('follows the finger at mid in both directions', () => {
    const motion = motionAt('mid');
    beginDrag(motion, 0);
    followDrag(motion, -100);
    expect(motion.top.value).toBe(detents.mid - 100);
    followDrag(motion, 60);
    expect(motion.top.value).toBe(detents.mid + 60);
    expect(motion.dragged.value).toBe(true);
  });

  it('never moves the card above full or below closed', () => {
    const motion = motionAt('mid');
    beginDrag(motion, 0);
    followDrag(motion, -2000);
    expect(motion.top.value).toBe(detents.full);
    followDrag(motion, 2000);
    expect(motion.top.value).toBe(detents.closed);
  });

  it('lets scrolled content scroll at full instead of moving the card', () => {
    const motion = motionAt('full', { scrollOffset: 120, scrollTouched: true });
    beginDrag(motion, 0);
    followDrag(motion, 80);
    expect(motion.top.value).toBe(detents.full);
    expect(motion.dragged.value).toBe(false);
  });

  it('moves the card once the content is back at its top, without a jump', () => {
    const motion = motionAt('full', { scrollOffset: 120, scrollTouched: true });
    beginDrag(motion, 0);
    followDrag(motion, 80);
    motion.scrollOffset.value = 0;
    followDrag(motion, 110);
    expect(motion.top.value).toBe(detents.full + 30);
  });

  it('always moves the card from the grabber or header at full, even with the content scrolled', () => {
    const motion = motionAt('full', { scrollOffset: 120, scrollTouched: false });
    beginDrag(motion, 0);
    followDrag(motion, 80);
    expect(motion.top.value).toBe(detents.full + 80);
    expect(motion.dragged.value).toBe(true);
  });
});
