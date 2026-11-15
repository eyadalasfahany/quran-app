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

  it('sums the counts and is drawn at its anchor, the member with most events, not at a centroid', () => {
    const [cluster] = clusterPins([pin('a', 0, 0, 3), pin('b', 40, 0, 1)]);
    expect(cluster?.count).toBe(4);
    expect(cluster).toMatchObject({ id: 'a', x: 0, y: 0 });
    expect(cluster?.memberIds.sort()).toEqual(['a', 'b']);
  });

  it('anchors on the place the art draws (art_landmark) even when another member has more events', () => {
    // Madinah: بيت عائشة has 2 events, مسجده الشريف 1; the mosque's square is drawn at (800, 760).
    const aisha = pin('madinah.aisha-house', 809.8, 757.3, 2, 30);
    const masjid = { ...pin('madinah.masjid', 800, 760, 1, 20), landmark: true };
    const ayyub = pin('madinah.abu-ayyub', 816.7, 767.8, 1, 25);
    const [cluster] = clusterPins([aisha, ayyub, masjid]);
    expect(cluster).toMatchObject({ count: 4, id: 'madinah.masjid', x: 800, y: 760 });
    expect(cluster?.memberIds.sort()).toEqual(['madinah.abu-ayyub', 'madinah.aisha-house', 'madinah.masjid']);
  });

  it('without a landmark falls back to most events, then book order, then id', () => {
    const aisha = pin('madinah.aisha-house', 809.8, 757.3, 2, 30);
    const masjid = pin('madinah.masjid', 800, 760, 1, 20);
    expect(clusterPins([masjid, aisha])[0]).toMatchObject({ id: 'madinah.aisha-house', x: 809.8, y: 757.3 });
    const [tie] = clusterPins([pin('b', 10, 0, 1, 2), pin('a', 0, 0, 1, 2), pin('c', 5, 0, 1, 1)]);
    expect(tie).toMatchObject({ id: 'c', x: 5 });
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

  it('never merges a city: it keeps its own count, and the pins close to it merge into one cluster 44 pt below it', () => {
    const city = { ...pin('madinah', 100, 100, 44), anchor: true };
    const clusters = clusterPins([city, pin('buwat', 130, 100, 1), pin('ghaba', 70, 110, 2), pin('far', 300, 300, 2)]);
    expect(clusters.find((cluster) => cluster.id === 'madinah')).toEqual({ count: 44, id: 'madinah', memberIds: ['madinah'], x: 100, y: 100 });
    const near = clusters.find((cluster) => cluster.memberIds.includes('buwat'));
    expect(near?.memberIds.sort()).toEqual(['buwat', 'ghaba']);
    expect(near).toMatchObject({ count: 3, x: 100, y: 100 + CLUSTER_DISTANCE });
    expect(clusters.find((cluster) => cluster.id === 'far')).toMatchObject({ x: 300, y: 300 });
  });

  it('keeps two cities apart even when they are close', () => {
    expect(clusterPins([{ ...pin('a', 0, 0, 5), anchor: true }, { ...pin('b', 10, 0, 5), anchor: true }])).toHaveLength(2);
  });
});
