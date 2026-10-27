import { useWindowDimensions } from 'react-native';

/** Phone frames in quran-app-screens.html are 390×844. */
const PHONE_FRAME_HEIGHT = 844;

/** Side and bottom inset of the sheet card on those frames. */
export const SHEET_MARGIN = 8;

/** Card radius on the ayah and reader-settings frames. */
export const SHEET_RADIUS = 36;

/** Distance from the top of the phone frame to the top of the card. */
export const SETTINGS_SHEET_TOP = 170;
export const AYAH_SHEET_TOP = 330;
export const TAFSIR_SHEET_TOP = 170;

/**
 * A form sheet scales and pushes the screen behind it. A transparent modal
 * slides the card up and leaves that screen where it is.
 */
export const sheetScreenOptions = {
  animation: 'slide_from_bottom' as const,
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
