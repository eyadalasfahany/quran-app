import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon, type IconName } from './Icon';
import { useContrastColors } from './useContrastColors';

/** The badge is a 52 pt circle at the top of the dialog card (quran-app-screens.html, SibhaResetDialog). */
export const CONFIRM_ICON_SIZE = 52;

// The badge's tint is its colour at 12% over the card. The design system has no tint token, so the opacity is set here.
const TINT_OPACITY = 0.12;

export type ConfirmDialogIconTone = 'brand' | 'destructive';

// Decorative: the dialog's title carries the meaning. A destructive dialog draws its badge in the danger colour.
export function ConfirmDialogIcon({
  icon,
  tone,
  testID,
}: {
  icon: IconName;
  tone: ConfirmDialogIconTone;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const tint = tone === 'destructive' ? colors.danger : colors.brand;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        alignItems: 'center',
        alignSelf: 'center',
        borderRadius: theme.radius.pill,
        height: CONFIRM_ICON_SIZE,
        justifyContent: 'center',
        overflow: 'hidden',
        width: CONFIRM_ICON_SIZE,
      }}
      testID={testID}
    >
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: TINT_OPACITY }]}
        testID={testID ? `${testID}-tint` : undefined}
      />
      <Icon color={tint} name={icon} size={theme.size.iconLg} testID={testID ? `${testID}-glyph` : undefined} />
    </View>
  );
}
