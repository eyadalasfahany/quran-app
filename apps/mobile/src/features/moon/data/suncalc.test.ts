import SunCalc, { getTimes } from './suncalc';
import { buildMoonEvening } from './evening';
import { moonStateAt } from './moon-state';

describe('suncalc Metro interop', () => {
  it('default export exposes getTimes (not undefined from CJS default interop)', () => {
    expect(SunCalc).toBeDefined();
    expect(typeof SunCalc.getTimes).toBe('function');
    expect(typeof getTimes).toBe('function');
  });

  it('returns sunset for a known anchor', () => {
    const anchor = new Date('2026-11-10T12:00:00');
    const sun = SunCalc.getTimes(anchor, 21.4225, 39.8262, 0, 180);
    expect(sun.sunset).toBeInstanceOf(Date);
  });

  it('moonStateAt and buildMoonEvening run without SunCalc undefined errors', () => {
    const at = new Date('2026-11-10T12:00:00Z');
    expect(moonStateAt(at).illumination).toBeGreaterThanOrEqual(0);
    expect(buildMoonEvening(at, 21.4225, 39.8262, 0)).not.toBeNull();
  });
});
