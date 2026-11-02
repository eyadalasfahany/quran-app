import { arcPath, clampPercent, ringSvg } from './ring';

describe('ringSvg', () => {
  const base = { fill: '#1f4d40', size: 92, stroke: 8, track: '#efe8d8' };

  it('draws the track and a fill arc from 12 o’clock, clockwise', () => {
    const svg = ringSvg({ ...base, percent: 50 });
    expect(svg).toContain('stroke="#efe8d8"');
    // Starts at the top (46, 4), ends at the bottom (46, 88) for half the ring.
    expect(svg).toContain('<path d="M 46 4 A 42 42 0 0 1 46 88"');
    expect(svg).toContain('stroke-linecap="round"');
  });

  it('uses the large arc past half', () => {
    expect(arcPath(46, 42, 0.75)).toBe('M 46 4 A 42 42 0 1 1 4 46');
  });

  it('draws a quarter ending at 3 o’clock', () => {
    expect(arcPath(46, 42, 0.25)).toBe('M 46 4 A 42 42 0 0 1 88 46');
  });

  it('draws no fill at zero, so no round-cap dot shows', () => {
    const svg = ringSvg({ ...base, percent: 0 });
    expect(svg).not.toContain('<path');
    expect(svg).not.toContain('stroke="#1f4d40"');
  });

  it('draws a full fill circle at 100', () => {
    const svg = ringSvg({ ...base, percent: 100 });
    expect(svg).not.toContain('<path');
    expect(svg).toContain('stroke="#1f4d40"');
  });

  it('clamps out-of-range and non-finite percents', () => {
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(Number.NaN)).toBe(0);
  });
});
