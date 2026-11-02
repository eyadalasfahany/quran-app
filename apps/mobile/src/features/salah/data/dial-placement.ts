/** The dial's face in its frame geometry (quran-app-screens.html, #Qibla): 336 px. */
const FACE = 336;

/**
 * The translate that puts a box `physicalLeft` px from the left edge of its container, for a box anchored with `left: 0`.
 * React Native swaps left and right in RTL, so there the anchor is the container's right edge and the box is measured
 * back from it: translateX = x − (container − box).
 */
export function dialTranslateX(physicalLeft: number, containerWidth: number, boxWidth: number, isRTL: boolean): number {
  return isRTL ? physicalLeft - (containerWidth - boxWidth) : physicalLeft;
}

export type DialPlacement = {
  height: number;
  left: 0;
  position: 'absolute';
  top: 0;
  transform: ({ translateX: number } | { translateY: number })[];
  width: number;
};

/**
 * An absolutely positioned box at a physical offset on the dial, placed with a translate and never with `left` or
 * `right`. Those are swapped in RTL, which mirrored the cardinals (ق landed on the west side) and the numerals
 * (30 and 330 traded places). Transforms are not swapped, so the box lands where the frame draws it in both directions.
 */
export function dialPlacement(
  left: number,
  top: number,
  width: number,
  height: number,
  isRTL: boolean,
  containerWidth: number = FACE,
): DialPlacement {
  return {
    height,
    left: 0,
    position: 'absolute',
    top: 0,
    transform: [{ translateX: dialTranslateX(left, containerWidth, width, isRTL) }, { translateY: top }],
    width,
  };
}

/**
 * A box that fills its container at zero offset: the face, the rotating layers and the marker's frame. The anchor is
 * the whole container in both directions, so `left: 0` needs no translate and is the same in RTL.
 */
export function dialAnchor(width: number, height: number) {
  return { height, left: 0, position: 'absolute', top: 0, width } as const;
}
