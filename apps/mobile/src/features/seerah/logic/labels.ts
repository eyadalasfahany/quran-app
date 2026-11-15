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
  /** From the pin's centre to the label's near edge; the default clears the 44 pt target. */
  offset?: number;
};

export type LabelRect = { left: number; top: number; right: number; bottom: number };

/** The gap between a pin's edge and its label, and the pin's drawn radius used for «labels never overlap a pin». */
export const LABEL_GAP = 6;
export const PIN_RADIUS = 22;

export function labelRect(candidate: LabelCandidate): LabelRect {
  const top = candidate.y - candidate.height / 2;
  const offset = candidate.offset ?? PIN_RADIUS + LABEL_GAP;
  // `end` is the right of the pin and `start` the left: the map is not mirrored.
  return candidate.side === 'end'
    ? { left: candidate.x + offset, top, right: candidate.x + offset + candidate.width, bottom: top + candidate.height }
    : { left: candidate.x - offset - candidate.width, top, right: candidate.x - offset, bottom: top + candidate.height };
}

/**
 * The side a label is drawn on: its own side, unless its box would leave the window (the Makkah label at the left edge),
 * then the other side when that one fits. Neither fits: its own side.
 */
export function fitLabelSide(candidate: LabelCandidate, viewport: { width: number }): 'start' | 'end' {
  const fits = (side: 'start' | 'end') => {
    const rect = labelRect({ ...candidate, side });
    return rect.left >= 0 && rect.right <= viewport.width;
  };
  if (fits(candidate.side)) {
    return candidate.side;
  }
  const other = candidate.side === 'start' ? 'end' : 'start';
  return fits(other) ? other : candidate.side;
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
): { visible: string[]; hidden: string[]; sides: Record<string, 'start' | 'end'> } {
  const ordered = [...candidates].sort(
    (a, b) => b.priority - a.priority || b.count - a.count || a.order - b.order || a.id.localeCompare(b.id),
  );
  const shown: LabelRect[] = [];
  const visible: string[] = [];
  const hidden: string[] = [];
  const sides: Record<string, 'start' | 'end'> = {};
  const free = (rect: LabelRect, own: { x: number; y: number }) =>
    !pins.some((pin) => !(pin.x === own.x && pin.y === own.y) && overlaps(rect, pinRect(pin))) && !shown.some((other) => overlaps(rect, other));
  for (const candidate of ordered) {
    // Its own side first, then the other side, before the label is hidden.
    const side = [candidate.side, candidate.side === 'end' ? 'start' : 'end'].find((option) =>
      free(labelRect({ ...candidate, side: option as 'start' | 'end' }), candidate),
    ) as 'start' | 'end' | undefined;
    if (side === undefined) {
      hidden.push(candidate.id);
    } else {
      shown.push(labelRect({ ...candidate, side }));
      visible.push(candidate.id);
      sides[candidate.id] = side;
    }
  }
  return { visible, hidden, sides };
}
