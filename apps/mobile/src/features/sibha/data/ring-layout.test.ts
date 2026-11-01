import { sibhaRingSize, SIBHA_RING_MIN, SIBHA_RING_SIZE } from './ring-layout';

describe('sibhaRingSize', () => {
  it('draws the 280 frame size when the space allows it', () => {
    expect(sibhaRingSize(360)).toBe(SIBHA_RING_SIZE);
    expect(sibhaRingSize(280)).toBe(280);
  });

  it('shrinks to the space below 280', () => {
    expect(sibhaRingSize(230)).toBe(230);
    expect(sibhaRingSize(201.6)).toBe(202);
  });

  it('never draws under the 160 minimum', () => {
    expect(sibhaRingSize(120)).toBe(SIBHA_RING_MIN);
  });

  it('draws the frame size before the first layout', () => {
    expect(sibhaRingSize(0)).toBe(SIBHA_RING_SIZE);
  });
});
