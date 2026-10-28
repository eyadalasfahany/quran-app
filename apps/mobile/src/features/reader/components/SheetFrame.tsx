import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

import { FULL_SHEET_RADIUS, SHEET_MARGIN, SHEET_RADIUS, type SheetShape } from '../form-sheet';

/** Grabber top padding on the ayah and settings frames (quran-app-screens.html: padding-top 10px). */
export const GRABBER_TOP = 10;

export type GrabberTone = 'strong' | 'muted';

/**
 * The phone frames draw the ayah and settings sheets as a card: 8pt from the
 * sides and the bottom, 36pt corners. Tafsir is a full-width sheet with
 * rounded top corners only.
 */
export function SheetFrame({
  children,
  shape = 'card',
  grabber = 'strong',
  testID,
}: {
  children: ReactNode;
  shape?: SheetShape;
  /**
   * `strong`: 40 pt, lineStrong, opaque (Ayah actions, Tafsir, Delete account).
   * `muted`: 36 pt, inkMuted at 40% (Reader settings).
   */
  grabber?: GrabberTone;
  testID?: string;
}) {
  const card = shape === 'card';
  const theme = useTheme();
  const colors = useContrastColors();
  const grabberStyle =
    grabber === 'muted'
      ? { backgroundColor: colors.inkMuted, opacity: theme.opacity.grabber, width: theme.size.grabberWidthCompact }
      : { backgroundColor: colors.lineStrong, opacity: 1, width: theme.size.grabberWidth };

  return (
    <View
      style={{
        backgroundColor: 'transparent',
        flex: 1,
        paddingBottom: card ? SHEET_MARGIN : 0,
        paddingHorizontal: card ? SHEET_MARGIN : 0,
      }}
      testID={testID}
    >
      <View
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          ...(card
            ? { borderRadius: SHEET_RADIUS }
            : { borderTopLeftRadius: FULL_SHEET_RADIUS, borderTopRightRadius: FULL_SHEET_RADIUS }),
          flex: 1,
          overflow: 'hidden',
        }}
        testID={testID === undefined ? undefined : `${testID}-card`}
      >
        <View
          style={{ alignItems: 'center', paddingTop: GRABBER_TOP }}
          testID={testID === undefined ? undefined : `${testID}-grabber-area`}
        >
          <View
            style={{
              ...grabberStyle,
              borderRadius: theme.size.grabberRadius,
              height: theme.size.grabberHeight,
            }}
            testID={testID === undefined ? undefined : `${testID}-grabber`}
          />
        </View>
        {children}
      </View>
    </View>
  );
}
