// Where the followed word's line sits on screen, for the word follow-scroll (developer, 29 Oct 2026). Pure: each
// list measures the followed Text inside its own row (or page, or scroll content, where no scroll view sits between
// them) and reports that offset; these functions put the content coordinates together. All offsets are in the same
// space the list's scrollToOffset uses (the raw scroll content offset), so no measurement crosses a scroll view.

/**
 * A row's top in the list's content. FlashList's getLayout(i).y is measured from the first item, so the first item
 * offset (a header or top padding in the list) is added back. See FlashList's useRecyclerViewController: the scroll to
 * an index adds the same first item offset to the layout y.
 */
export function rowContentTop(layoutY: number, firstItemOffset: number): number {
  return layoutY + firstItemOffset;
}

/**
 * The top of the followed Text on screen: its row's top in content, plus its offset inside that row, minus the
 * list's scroll offset (the content offset that scrollToOffset takes).
 */
export function followedTextScreenTop(input: { rowTop: number; textTopInRow: number; scrollOffset: number }): number {
  return input.rowTop + input.textTopInRow - input.scrollOffset;
}

/**
 * Whether an on-screen top is plausible for a viewport of `viewportHeight`: within one viewport above the top edge
 * and one below the bottom edge. Anything further is a stale measurement, and the word scroll skips it.
 */
export function isPlausibleScreenTop(top: number, viewportHeight: number): boolean {
  return top >= -viewportHeight && top <= 2 * viewportHeight;
}

/** One word scroll moves at most one viewport height, in either direction. */
export function capWordScrollStep(delta: number, viewportHeight: number): number {
  return Math.max(-viewportHeight, Math.min(viewportHeight, delta));
}
