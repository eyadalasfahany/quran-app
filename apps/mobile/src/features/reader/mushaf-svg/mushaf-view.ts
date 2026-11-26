// Which Mushaf view shows (ADR 0090 amendment, 26 Nov 2026, item 9). Pure.
export type MushafView = 'svg' | 'flowed';

/**
 * The printed pages whenever the riwayah's pack shows, at every zoom. The flowed Tanzil Hafs text is only the fallback
 * while no pack is available (a first launch offline). It no longer grows with the text size: zoom re-wraps the pages.
 */
export function mushafView(input: { svgShown: boolean }): MushafView {
  return input.svgShown ? 'svg' : 'flowed';
}
