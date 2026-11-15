/** Two pins closer than this many points merge into one cluster; at exactly this distance they stay apart. */
export const CLUSTER_DISTANCE = 44;

export type ScreenPin = {
  id: string;
  x: number;
  y: number;
  count: number;
  /** Book order, the tie-break that keeps the result stable. */
  order: number;
  /** A city with its own map: the tree roll-up already made it one pin, so it never joins a distance cluster. */
  anchor?: boolean;
  /** The place's own marker is drawn in the art here (`art_landmark`): it leads the cluster it joins. */
  landmark?: boolean;
};

export type PinCluster = {
  /** The id of the member the cluster grew from (the one with most events). */
  id: string;
  /** The anchor member's position in screen space. */
  x: number;
  y: number;
  count: number;
  memberIds: string[];
};

/**
 * Greedy, deterministic screen-space clustering. Pins are visited by event count (most first), then book order, then
 * id; a pin joins the first cluster whose anchor is closer than `distance`, else it starts one. Tree roll-up happens
 * before this (a city is already one pin); this is the second step. A city (`anchor`) stays its own pin with its own
 * count and map (frame SeerahMapRegion): the pins and clusters that would sit closer than `distance` to it merge into one
 * cluster drawn `distance` straight below it, clear of the city's label at its side.
 */
export function clusterPins(pins: readonly ScreenPin[], distance = CLUSTER_DISTANCE): PinCluster[] {
  const anchors = pins.filter((pin) => pin.anchor === true);
  const free = groupByDistance(
    pins.filter((pin) => pin.anchor !== true),
    distance,
  );
  const satellites = new Map<string, PinCluster[]>();
  const clear: PinCluster[] = [];
  for (const cluster of free) {
    const near = anchors
      .map((anchor) => ({ anchor, gap: Math.hypot(cluster.x - anchor.x, cluster.y - anchor.y) }))
      .filter(({ gap }) => gap < distance)
      .sort((a, b) => a.gap - b.gap || a.anchor.id.localeCompare(b.anchor.id))[0];
    if (near === undefined) {
      clear.push(cluster);
    } else {
      satellites.set(near.anchor.id, [...(satellites.get(near.anchor.id) ?? []), cluster]);
    }
  }
  const below = anchors.flatMap((anchor) => {
    const parts = satellites.get(anchor.id);
    if (parts === undefined) {
      return [];
    }
    const [first] = parts;
    return first === undefined
      ? []
      : [
          {
            count: parts.reduce((sum, part) => sum + part.count, 0),
            id: first.id,
            memberIds: parts.flatMap((part) => part.memberIds),
            x: anchor.x,
            y: anchor.y + distance,
          },
        ];
  });
  return [...anchors.map((pin) => ({ count: pin.count, id: pin.id, memberIds: [pin.id], x: pin.x, y: pin.y })), ...clear, ...below];
}

function groupByDistance(pins: readonly ScreenPin[], distance: number): PinCluster[] {
  // The anchor (the first visited) is a place the art draws, then the one with most events, then book order, then id.
  const ordered = [...pins].sort(
    (a, b) => Number(b.landmark === true) - Number(a.landmark === true) || b.count - a.count || a.order - b.order || a.id.localeCompare(b.id),
  );
  const groups: { anchor: ScreenPin; members: ScreenPin[] }[] = [];
  for (const pin of ordered) {
    const home = groups.find((group) => Math.hypot(group.anchor.x - pin.x, group.anchor.y - pin.y) < distance);
    if (home === undefined) {
      groups.push({ anchor: pin, members: [pin] });
    } else {
      home.members.push(pin);
    }
  }
  // Drawn at its anchor, a real place (an art landmark first, then most events, book order, id), never at a centroid
  // between places that matches none of them.
  return groups.map(({ anchor, members }) => ({
    id: anchor.id,
    x: anchor.x,
    y: anchor.y,
    count: members.reduce((sum, member) => sum + member.count, 0),
    memberIds: members.map((member) => member.id),
  }));
}
