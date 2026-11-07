/** The dial's frame size (screens/, #Qibla). It is never drawn larger. */
export const QIBLA_DIAL_MAX = 336;
/** The smallest dial a short or cramped window draws (ADR 0036). */
export const QIBLA_DIAL_MIN = 160;
/** The ambient glow's frame size, drawn at the dial's scale. */
const QIBLA_GLOW_FRAME = 480;

/**
 * The dial's side for the space it has: min(336, available), never under 160. An unmeasured area (0 or less, before the
 * first layout) draws the frame size.
 */
export function qiblaDialSize(available: number): number {
  if (available <= 0) {
    return QIBLA_DIAL_MAX;
  }
  return Math.round(Math.max(QIBLA_DIAL_MIN, Math.min(QIBLA_DIAL_MAX, available)));
}

/** The glow's side, scaled with the dial so the wash keeps its proportion at every size. */
export function qiblaGlowSize(dialSize: number): number {
  return Math.round((dialSize * QIBLA_GLOW_FRAME) / QIBLA_DIAL_MAX);
}
