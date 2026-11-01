import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/core/theme';

import { UiText, type TextTone } from './UiText';
import { useContrastColors } from './useContrastColors';

/** The dialog's buttons are 48 pt tall, above the 44 pt touch target (quran-app-screens.html, ConfirmDialog). */
export const CONFIRM_BUTTON_HEIGHT = 48;

// neutral is the cancel action: a tonal fill with ink text. brand and destructive are the filled confirm actions.
export type ConfirmDialogButtonTone = 'neutral' | 'brand' | 'destructive';

export function ConfirmDialogButton({
  label,
  onPress,
  tone,
  style,
  testID,
}: {
  label: string;
  onPress: () => void;
  tone: ConfirmDialogButtonTone;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const fill = {
    neutral: colors.fillSecondary,
    brand: colors.brand,
    destructive: colors.danger,
  }[tone];
  // onBrand reads on the danger fill in every theme (about 6:1 on light, 9:1 on dark), so one text colour serves both.
  const textTone: TextTone = tone === 'neutral' ? 'ink' : 'onBrand';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          backgroundColor: fill,
          borderRadius: theme.radius.pill,
          justifyContent: 'center',
          minHeight: CONFIRM_BUTTON_HEIGHT,
          opacity: pressed ? theme.opacity.pressed : 1,
          paddingHorizontal: theme.space[4],
        },
        style,
      ]}
      testID={testID}
    >
      <UiText align="center" tone={textTone} variant="headline" weight={600}>
        {label}
      </UiText>
    </Pressable>
  );
}
