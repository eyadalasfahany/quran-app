import { needleAngleFor, normalize180, shortestTurn } from './qibla-math';

describe('normalize180', () => {
  it('maps any angle into −180…180', () => {
    expect(normalize180(0)).toBe(0);
    expect(normalize180(370)).toBe(10);
    expect(normalize180(-10)).toBe(-10);
    expect(normalize180(190)).toBe(-170);
    expect(normalize180(-190)).toBe(170);
    expect(normalize180(360)).toBe(0);
  });
});

describe('shortestTurn', () => {
  it('never swings through 0° for a 350° change', () => {
    expect(shortestTurn(10, 20)).toBe(10);
    expect(shortestTurn(350, 10)).toBe(20);
    expect(shortestTurn(10, 350)).toBe(-20);
  });
});

describe('needleAngleFor', () => {
  it('is bearing − heading, normalized to −180…180', () => {
    expect(needleAngleFor(244, 14)).toBe(-130); // 230°, written the shortest way round
    expect(needleAngleFor(244, 0)).toBe(-116);
    expect(needleAngleFor(10, 350)).toBe(20);
    expect(needleAngleFor(350, 10)).toBe(-20);
    expect(needleAngleFor(244, 244)).toBe(0);
  });
});
