import { qiblaDialSize, qiblaGlowSize, QIBLA_DIAL_MAX, QIBLA_DIAL_MIN } from './qibla-layout';

describe('qiblaDialSize', () => {
  it('draws the 336 frame size when the space allows it', () => {
    expect(qiblaDialSize(400)).toBe(336);
    expect(qiblaDialSize(336)).toBe(336);
  });

  it('shrinks to the available space below 336', () => {
    expect(qiblaDialSize(300)).toBe(300);
    expect(qiblaDialSize(250.4)).toBe(250);
  });

  it('never draws under the 160 minimum', () => {
    expect(qiblaDialSize(120)).toBe(QIBLA_DIAL_MIN);
    expect(qiblaDialSize(1)).toBe(QIBLA_DIAL_MIN);
  });

  it('draws the frame size before the first layout (no measured area)', () => {
    expect(qiblaDialSize(0)).toBe(QIBLA_DIAL_MAX);
    expect(qiblaDialSize(-40)).toBe(QIBLA_DIAL_MAX);
  });
});

describe('qiblaGlowSize', () => {
  it('keeps the 480 to 336 proportion of the frame', () => {
    expect(qiblaGlowSize(336)).toBe(480);
    expect(qiblaGlowSize(168)).toBe(240);
  });
});
