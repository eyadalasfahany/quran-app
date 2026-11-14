export type LabelCandidate = {
  id: string;
  /** The pin's screen position. */
  x: number;
  y: number;
  /** Text size in points, to estimate the label box. */
  width: number;
  height: number;
  side: 'start' | 'end';
  priority: number;
  count: number;
  order: number;
};

export type LabelRect = { left: number; top: number; right: number; bottom: number };

/** The gap between a pin's edge and its label, and the pin's drawn radius used for «labels never overlap a pin». */
export const LABEL_GAP = 6;
export const PIN_RADIUS = 22;

export function labelRect(candidate: LabelCandidate): LabelRect {
  const top = candidate.y - candidate.height / 2;
  // `end` is the right of the pin and `start` the left: the map is not mirrored.
  return candidate.side === 'end'
    ? { left: candidate.x + PIN_RADIUS + LABEL_GAP, top, right: candidate.x + PIN_RADIUS + LABEL_GAP + candidate.width, bottom: top + candidate.height }
    : { left: candidate.x - PIN_RADIUS - LABEL_GAP - candidate.width, top, right: candidate.x - PIN_RADIUS - LABEL_GAP, bottom: top + candidate.height };
}

function overlaps(a: LabelRect, b: LabelRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function pinRect(pin: { x: number; y: number }): LabelRect {
  return { left: pin.x - PIN_RADIUS, top: pin.y - PIN_RADIUS, right: pin.x + PIN_RADIUS, bottom: pin.y + PIN_RADIUS };
}

/** A rough text width: Arabic runs about half an em per letter. Good enough for a collision pass, never for layout. */
export function estimateLabelWidth(text: string, fontSize: number): number {
  return Math.ceil([...text].length * fontSize * 0.55);
}

/**
 * Greedy label placement in screen space. Candidates are taken by `priority`, then event count, then book order, then
 * id (so the result is deterministic). A label is shown when its box overlaps no label already shown and no pin;
 * otherwise it is hidden until a deeper zoom spreads the pins. Run when a gesture ends, never per frame.
 */
export function placeLabels(
  candidates: readonly LabelCandidate[],
  pins: readonly { x: number; y: number }[] = candidates,
): { visible: string[]; hidden: string[] } {
  const ordered = [...candidates].sort(
    (a, b) => b.priority - a.priority || b.count - a.count || a.order - b.order || a.id.localeCompare(b.id),
  );
  const shown: LabelRect[] = [];
  const visible: string[] = [];
  const hidden: string[] = [];
  for (const candidate of ordered) {
    const rect = labelRect(candidate);
    const ownPin = candidate;
    const blockedByPin = pins.some((pin) => pin !== ownPin && !(pin.x === ownPin.x && pin.y === ownPin.y) && overlaps(rect, pinRect(pin)));
    if (blockedByPin || shown.some((other) => overlaps(rect, other))) {
      hidden.push(candidate.id);
    } else {
      shown.push(rect);
      visible.push(candidate.id);
    }
  }
  return { visible, hidden };
}
