import { makeMutable } from 'react-native-reanimated';

import { panValues, pinchValues, readView, writeView, type ViewValues } from './map-view-values';

const content = { height: 2400, width: 1644 };
const viewport = { height: 844, width: 390 };
const zoom = { max: 2.4, min: 0.32 };

function values(scale = 0.6, tx = -300, ty = -400): ViewValues {
  return { scale: makeMutable(scale), tx: makeMutable(tx), ty: makeMutable(ty) };
}

describe('map view values', () => {
  it('writes and reads the three values', () => {
    const v = values();
    writeView(v, { scale: 1, tx: 5, ty: 6 });
    expect(readView(v)).toEqual({ scale: 1, tx: 5, ty: 6 });
  });

  it('a pan moves by the change', () => {
    const v = values();
    panValues(v, { x: -30, y: 20 }, content, viewport);
    expect(readView(v)).toEqual({ scale: 0.6, tx: -330, ty: -380 });
  });

  it('a pan cannot leave a gap at the edge', () => {
    const v = values(0.6, -2, -2);
    panValues(v, { x: 500, y: 500 }, content, viewport);
    expect(readView(v)).toMatchObject({ tx: 0, ty: 0 });
  });

  it('a pinch changes the scale around the focal point and stops at the bounds', () => {
    const v = values();
    pinchValues(v, 2, { x: 195, y: 422 }, zoom, content, viewport);
    expect(readView(v).scale).toBeCloseTo(1.2);
    pinchValues(v, 100, { x: 195, y: 422 }, zoom, content, viewport);
    expect(readView(v).scale).toBe(2.4);
  });
});
