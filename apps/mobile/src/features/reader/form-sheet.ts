import { useWindowDimensions } from 'react-native';

import type { PanelTab } from './selection';

/** Phone frames in quran-app-screens.html are 390×844. */
const PHONE_FRAME_HEIGHT = 844;

/** Side and bottom inset of the sheet card on those frames. */
export const SHEET_MARGIN = 8;

/** Card radius on the ayah and reader-settings frames. */
export const SHEET_RADIUS = 36;

/** Top-corner radius of the full-width tafsir sheet. */
export const FULL_SHEET_RADIUS = 28;

/** Distance from the top of the phone frame to the top of the card. */
export const SETTINGS_SHEET_TOP = 170;
export const AYAH_SHEET_TOP = 330;
export const TAFSIR_SHEET_TOP = 52;

/** The ayah card floats inset over the page; reading tafsir or a translation takes the tall, full-width sheet. */
export type SheetShape = 'card' | 'full';

export function sheetShapeFor(tab: PanelTab): SheetShape {
  return tab === 'actions' ? 'card' : 'full';
}

export function sheetTopFor(tab: PanelTab): number {
  return tab === 'actions' ? AYAH_SHEET_TOP : TAFSIR_SHEET_TOP;
}

/**
 * A form sheet scales and pushes the screen behind it. A transparent modal
 * leaves that screen where it is. The modal fades, so the scrim fades in,
 * and SheetHost slides the card up.
 */
export const sheetScreenOptions = {
  animation: 'fade' as const,
  contentStyle: { backgroundColor: 'transparent' as const },
  gestureDirection: 'vertical' as const,
  gestureEnabled: true,
  headerShown: false,
  presentation: 'transparentModal' as const,
};

/** Height of the card, so the page above it stays put. */
export function sheetHeight(windowHeight: number, topGap: number): number {
  const height = windowHeight > topGap ? windowHeight : PHONE_FRAME_HEIGHT;
  return height - topGap;
}

export function useSheetHeight(topGap: number): number {
  const { height } = useWindowDimensions();
  return sheetHeight(height, topGap);
}
