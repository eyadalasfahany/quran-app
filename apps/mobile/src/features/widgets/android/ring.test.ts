import { clampPercent, ringSvg } from './ring';

describe('ringSvg', () => {
  const base = { fill: '#1f4d40', size: 92, stroke: 8, track: '#efe8d8' };

  it('draws a track and a fill arc whose dash is the given share of the circle', () => {
    const svg = ringSvg({ ...base, percent: 50 });
    const radius = 46 - 4;
    const circumference = 2 * Math.PI * radius;
    expect(svg).toContain(`stroke-dasharray="${circumference / 2} ${circumference}"`);
    expect(svg).toContain('stroke="#efe8d8"');
    expect(svg).toContain('rotate(-90 46 46)');
  });

  it('clamps out-of-range and non-finite percents', () => {
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(Number.NaN)).toBe(0);
  });

  it('draws an empty arc at zero', () => {
    expect(ringSvg({ ...base, percent: 0 })).toContain('stroke-dasharray="0 ');
  });
});
