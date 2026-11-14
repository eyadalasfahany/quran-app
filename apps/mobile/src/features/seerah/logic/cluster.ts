/** Two pins closer than this many points merge into one cluster; at exactly this distance they stay apart. */
export const CLUSTER_DISTANCE = 44;

export type ScreenPin = {
  id: string;
  x: number;
  y: number;
  count: number;
  /** Book order, the tie-break that keeps the result stable. */
  order: number;
};

export type PinCluster = {
  /** The id of the member the cluster grew from (the one with most events). */
  id: string;
  /** Count-weighted centre in screen space. */
  x: number;
  y: number;
  count: number;
  memberIds: string[];
};

/**
 * Greedy, deterministic screen-space clustering. Pins are visited by event count (most first), then book order, then
 * id; a pin joins the first cluster whose anchor is closer than `distance`, else it starts one. Tree roll-up happens
 * before this (a city is already one pin); this is the second step.
 */
export function clusterPins(pins: readonly ScreenPin[], distance = CLUSTER_DISTANCE): PinCluster[] {
  const ordered = [...pins].sort((a, b) => b.count - a.count || a.order - b.order || a.id.localeCompare(b.id));
  const groups: { anchor: ScreenPin; members: ScreenPin[] }[] = [];
  for (const pin of ordered) {
    const home = groups.find((group) => Math.hypot(group.anchor.x - pin.x, group.anchor.y - pin.y) < distance);
    if (home === undefined) {
      groups.push({ anchor: pin, members: [pin] });
    } else {
      home.members.push(pin);
    }
  }
  return groups.map(({ anchor, members }) => {
    const count = members.reduce((sum, member) => sum + member.count, 0);
    const weight = members.reduce((sum, member) => sum + Math.max(member.count, 1), 0);
    return {
      id: anchor.id,
      x: members.reduce((sum, member) => sum + member.x * Math.max(member.count, 1), 0) / weight,
      y: members.reduce((sum, member) => sum + member.y * Math.max(member.count, 1), 0) / weight,
      count,
      memberIds: members.map((member) => member.id),
    };
  });
}
