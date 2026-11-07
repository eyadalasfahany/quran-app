import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

import { FULL_SHEET_RADIUS, SHEET_MARGIN, SHEET_RADIUS, type SheetShape } from '../form-sheet';
import { useSheet } from './sheet-context';

/** Grabber top padding on the ayah and settings frames (screens/: padding-top 10px). */
export const GRABBER_TOP = 10;

export type GrabberTone = 'strong' | 'compact' | 'muted';

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
   * `strong`: 40 pt, lineStrong, opaque (Ayah actions, Delete account).
   * `compact`: 36 pt, lineStrong, opaque (Tafsir, whose frame draws the narrower bar).
   * `muted`: 36 pt, inkMuted at 40% (Reader settings).
   */
  grabber?: GrabberTone;
  testID?: string;
}) {
  const card = shape === 'card';
  const theme = useTheme();
  const colors = useContrastColors();
  const { t } = useTranslation();
  const sheet = useSheet();
  // Inside a sheet the grabber is a button that expands and collapses it. Outside one it is decoration.
  const grabberAccessibility =
    sheet === null
      ? {}
      : {
          accessible: true,
          accessibilityActions: [
            { label: t('reader.sheet.expand'), name: 'expand' },
            { label: t('reader.sheet.collapse'), name: 'collapse' },
          ],
          accessibilityLabel: t('reader.sheet.grabber'),
          accessibilityRole: 'button' as const,
          onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => {
            if (event.nativeEvent.actionName === 'expand') {
              sheet.expand();
              AccessibilityInfo.announceForAccessibility(t('reader.sheet.expanded'));
            } else if (event.nativeEvent.actionName === 'collapse') {
              sheet.collapse();
              AccessibilityInfo.announceForAccessibility(t('reader.sheet.collapsed'));
            }
          },
        };
  const grabberStyle =
    grabber === 'muted'
      ? { backgroundColor: colors.inkMuted, opacity: theme.opacity.grabber, width: theme.size.grabberWidthCompact }
      : grabber === 'compact'
        ? { backgroundColor: colors.lineStrong, opacity: 1, width: theme.size.grabberWidthCompact }
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
          {...grabberAccessibility}
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
