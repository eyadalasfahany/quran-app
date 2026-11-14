import { CLUSTER_DISTANCE, clusterPins, type ScreenPin } from './cluster';

const pin = (id: string, x: number, y = 0, count = 1, order = 1): ScreenPin => ({ id, x, y, count, order });

describe('clusterPins', () => {
  it.each([
    [43, 1],
    [43.9, 1],
    [44, 2],
    [45, 2],
    [200, 2],
  ])('two pins %d pt apart make %i cluster(s)', (distance, clusters) => {
    expect(clusterPins([pin('a', 0), pin('b', distance)])).toHaveLength(clusters);
  });

  it('uses 44 pt and measures in both axes', () => {
    expect(CLUSTER_DISTANCE).toBe(44);
    expect(clusterPins([pin('a', 0, 0), pin('b', 30, 30)])).toHaveLength(1);
    expect(clusterPins([pin('a', 0, 0), pin('b', 32, 32)])).toHaveLength(2);
  });

  it('sums counts and weights the centre by count', () => {
    const [cluster] = clusterPins([pin('a', 0, 0, 3), pin('b', 40, 0, 1)]);
    expect(cluster?.count).toBe(4);
    expect(cluster?.x).toBeCloseTo(10);
    expect(cluster?.memberIds.sort()).toEqual(['a', 'b']);
    expect(cluster?.id).toBe('a');
  });

  it('is deterministic whatever the input order', () => {
    const pins = [pin('a', 0, 0, 2, 2), pin('b', 30, 0, 2, 1), pin('c', 60, 0, 1, 3), pin('d', 300, 0, 5, 4)];
    const forward = clusterPins(pins);
    const backward = clusterPins([...pins].reverse());
    expect(backward).toEqual(forward);
  });

  it('does not chain: a pin joins only a cluster whose anchor is close', () => {
    const clusters = clusterPins([pin('a', 0, 0, 5), pin('b', 40, 0, 1), pin('c', 80, 0, 1)]);
    expect(clusters.map((cluster) => cluster.memberIds.sort())).toEqual([['a', 'b'], ['c']]);
  });

  it('returns nothing for no pins and keeps a lone pin as it is', () => {
    expect(clusterPins([])).toEqual([]);
    expect(clusterPins([pin('a', 5, 6, 0)])).toEqual([{ id: 'a', x: 5, y: 6, count: 0, memberIds: ['a'] }]);
  });
});
