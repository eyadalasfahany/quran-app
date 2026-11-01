/** The ring's frame size (quran-app-screens.html, #Sibha). The counter is never drawn larger. */
export const SIBHA_RING_SIZE = 280;
/** Progress ring stroke width on #Sibha. */
export const SIBHA_RING_STROKE = 10;
/** The smallest ring a short or cramped window draws (ADR 0036). */
export const SIBHA_RING_MIN = 160;

/** The ring's side for the space it is given: min(280, available), never under 160. Unmeasured (0) draws the frame size. */
export function sibhaRingSize(available: number): number {
  if (available <= 0) {
    return SIBHA_RING_SIZE;
  }
  return Math.round(Math.max(SIBHA_RING_MIN, Math.min(SIBHA_RING_SIZE, available)));
}
