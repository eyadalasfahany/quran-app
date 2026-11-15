import type { ReactNode } from 'react';
import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { SheetHost } from '@/features/reader/components/SheetHost';
import { useSheet } from '@/features/reader/components/sheet-context';

export type SeerahSheetDetent = 'medium' | 'large';

/**
 * A Seerah sheet (frames SeerahClusterSheet, SeerahMapKey): the app's sheet host (ADR 0013, 0020) in a transparent modal
 * over the whole screen, timeline included, so it behaves like every other sheet: it opens at the mid detent (`medium`) or
 * full (`large`), drags between them by its grabber or its list, slides down to close, closes on a scrim tap, and fades
 * under Reduce Motion. The card is the frames' full-width sheet: the page surface, 28 pt top corners and a 36 pt grabber.
 * Its content scrolls in a `SheetScrollView` and closes through `useSeerahSheetClose`, so the close button slides it down.
 */
export function SeerahSheet({
  visible,
  onClose,
  detent = 'medium',
  children,
  testID = 'seerah-sheet',
}: {
  visible: boolean;
  /** Runs once the sheet has slid away (scrim, drag, close button). */
  onClose: () => void;
  detent?: SeerahSheetDetent;
  children: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible>
      <SheetHost initialDetent={detent === 'large' ? 'full' : 'mid'} onClosed={onClose} testID={testID}>
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            boxShadow: theme.shadows.glass,
            flex: 1,
            overflow: 'hidden',
          }}
          testID={`${testID}-card`}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              alignSelf: 'center',
              backgroundColor: theme.colors.lineStrong,
              borderRadius: theme.size.grabberRadius,
              height: theme.size.grabberHeight,
              marginTop: 6,
              width: theme.size.grabberWidthCompact,
            }}
            testID={`${testID}-grabber`}
          />
          {children}
        </View>
      </SheetHost>
    </Modal>
  );
}

/** The close for a Seerah sheet's own button: slides the hosting sheet down, or calls `fallback` outside a sheet. */
export function useSeerahSheetClose(fallback: () => void): () => void {
  return useSheet()?.close ?? fallback;
}

/** The bottom padding a sheet's list needs to clear the home indicator. */
export function useSheetBottomPadding(): number {
  const theme = useTheme();
  return useSafeAreaInsets().bottom + theme.space[4];
}
