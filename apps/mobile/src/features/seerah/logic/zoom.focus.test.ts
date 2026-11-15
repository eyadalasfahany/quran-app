import { focusView, visibleContentRect, type MapView } from './zoom';

// The art: 1644 x 2400 units. The window: 390 x 844 points. Zoom bounds 0.32 to 2.4.
const content = { height: 2400, width: 1644 };
const size = { height: 844, width: 390 };
const zoom = { max: 2.4, min: 0.32 };
const visible = { height: 844 - 112 - 220, width: 390, x: 0, y: 112 };

describe('focusView', () => {
  it('centres the point in the visible rectangle, not the middle of the window', () => {
    const view = focusView({ x: 800, y: 1200 }, 1.5, visible, content, size, zoom);
    // Centre of the visible rectangle: x 195, y 112 + 512/2 = 368.
    expect(view.scale).toBe(1.5);
    expect(view.tx).toBeCloseTo(195 - 800 * 1.5);
    expect(view.ty).toBeCloseTo(368 - 1200 * 1.5);
  });

  it('offsets for a header and a timeline: the same point is 54 pt higher than the window centre would put it', () => {
    const plain = focusView({ x: 800, y: 1200 }, 1.5, { height: 844, width: 390, x: 0, y: 0 }, content, size, zoom);
    const framed = focusView({ x: 800, y: 1200 }, 1.5, visible, content, size, zoom);
    expect(plain.ty - framed.ty).toBeCloseTo(422 - 368);
    expect(plain.tx).toBeCloseTo(framed.tx);
  });

  it('caps the scale at the zoom maximum and floors it at the minimum', () => {
    expect(focusView({ x: 800, y: 1200 }, 9, visible, content, size, zoom).scale).toBe(2.4);
    expect(focusView({ x: 800, y: 1200 }, 0.01, visible, content, size, zoom).scale).toBe(0.32);
  });

  it('clamps at the left edge: no gap, the item stays on screen', () => {
    const view = focusView({ x: 10, y: 1200 }, 1.5, visible, content, size, zoom);
    expect(view.tx).toBe(0);
    expect(10 * view.scale + view.tx).toBeGreaterThanOrEqual(0);
  });

  it('clamps at the right edge', () => {
    const view = focusView({ x: 1630, y: 1200 }, 1.5, visible, content, size, zoom);
    expect(view.tx + content.width * view.scale).toBeCloseTo(size.width);
    expect(1630 * view.scale + view.tx).toBeLessThanOrEqual(size.width);
  });

  it('clamps at the top edge', () => {
    const view = focusView({ x: 800, y: 10 }, 1.5, visible, content, size, zoom);
    expect(view.ty).toBe(0);
  });

  it('clamps at the bottom edge', () => {
    const view = focusView({ x: 800, y: 2390 }, 1.5, visible, content, size, zoom);
    expect(view.ty + content.height * view.scale).toBeCloseTo(size.height);
  });
});

describe('visibleContentRect', () => {
  const at = (scale: number, tx: number, ty: number): MapView => ({ scale, tx, ty });

  it.each([0.32, 0.6, 1, 2.4])('at scale %s the rectangle is the window divided by the scale', (scale) => {
    const view = at(scale, -(content.width * scale - size.width) / 2, -(content.height * scale - size.height) / 2);
    const rect = visibleContentRect(view, size, content);
    expect(rect.width).toBeCloseTo(Math.min(size.width / scale, content.width));
    expect(rect.height).toBeCloseTo(Math.min(size.height / scale, content.height));
  });

  it('at scale 0.32 the whole height of the art is shown, centred across the width', () => {
    // 2400 x 0.32 = 768 is shorter than the window (844): the full height shows; the width is 390 / 0.32 units.
    const rect = visibleContentRect(at(0.32, (size.width - content.width * 0.32) / 2, 0), size, content);
    expect(rect.height).toBeCloseTo(2400);
    expect(rect.width).toBeCloseTo(390 / 0.32);
    expect(rect.x).toBeCloseTo((1644 - 390 / 0.32) / 2);
    expect(rect.y).toBeCloseTo(0);
  });

  it('at scale 1 from the top-left corner, the rectangle starts at the origin', () => {
    expect(visibleContentRect(at(1, 0, 0), size, content)).toEqual({ height: 844, width: 390, x: 0, y: 0 });
  });

  it('at scale 2.4 centred, the rectangle is a window-sized piece of the art', () => {
    const view = at(2.4, 195 - 800 * 2.4, 422 - 1200 * 2.4);
    const rect = visibleContentRect(view, size, content);
    expect(rect.x).toBeCloseTo(800 - 195 / 2.4);
    expect(rect.y).toBeCloseTo(1200 - 422 / 2.4);
    expect(rect.width).toBeCloseTo(390 / 2.4);
    expect(rect.height).toBeCloseTo(844 / 2.4);
  });

  it('clips at the right and bottom edges of the art', () => {
    const rect = visibleContentRect(at(1, -(1644 - 390), -(2400 - 844)), size, content);
    expect(rect.x + rect.width).toBeCloseTo(1644);
    expect(rect.y + rect.height).toBeCloseTo(2400);
  });
});
