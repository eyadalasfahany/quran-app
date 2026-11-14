import { estimateLabelWidth, labelRect, placeLabels, type LabelCandidate } from './labels';

const label = (id: string, x: number, priority: number, extra: Partial<LabelCandidate> = {}): LabelCandidate => ({
  id,
  x,
  y: 100,
  width: 80,
  height: 20,
  side: 'end',
  priority,
  count: 1,
  order: 1,
  ...extra,
});

describe('placeLabels', () => {
  it('keeps both labels when they do not collide', () => {
    const result = placeLabels([label('a', 0, 10), label('b', 400, 10)]);
    expect(result.visible.sort()).toEqual(['a', 'b']);
    expect(result.hidden).toEqual([]);
  });

  it('hides the lower priority label of a collision', () => {
    // Pins 50 apart: the first label (right of a) runs into pin b.
    const result = placeLabels([label('low', 0, 10), label('high', 50, 90)]);
    expect(result.visible).toContain('high');
    expect(result.hidden).toContain('low');
  });

  it('breaks a priority tie by event count, then book order, then id', () => {
    const a = label('a', 0, 50, { count: 1, order: 2 });
    const b = label('b', 50, 50, { count: 4, order: 3 });
    expect(placeLabels([a, b], []).visible).toEqual(['b']);

    const c = label('c', 0, 50, { order: 5, y: 100 });
    const d = label('d', 50, 50, { order: 4, y: 100 });
    expect(placeLabels([c, d], []).visible).toEqual(['d']);

    const e = label('e', 0, 50);
    const f = label('f', 50, 50);
    expect(placeLabels([e, f], []).visible).toEqual(['e']);
  });

  it('is deterministic whatever the input order', () => {
    const items = [label('a', 0, 10), label('b', 50, 10), label('c', 100, 10), label('d', 150, 70)];
    expect(placeLabels([...items].reverse())).toEqual(placeLabels(items));
  });

  it('never draws a label over another pin, even a pin without a label', () => {
    const result = placeLabels([label('a', 0, 10)], [{ x: 0, y: 100 }, { x: 80, y: 100 }]);
    expect(result.hidden).toEqual(['a']);
  });

  it('places a start-side label to the left of its pin', () => {
    const left = labelRect(label('a', 200, 1, { side: 'start' }));
    const right = labelRect(label('a', 200, 1, { side: 'end' }));
    expect(left.right).toBeLessThan(200);
    expect(right.left).toBeGreaterThan(200);
  });

  it('estimates a width that grows with the text', () => {
    expect(estimateLabelWidth('مكة', 17)).toBeLessThan(estimateLabelWidth('غزوة بدر الكبرى', 17));
  });
});
