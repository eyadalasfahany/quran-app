import { ActivityIndicator, Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

// The frame's submit button is 52 pt tall: taller than the shared Button's 44 pt touch target.
const BUTTON_HEIGHT = 52;
// The frame draws the busy button at 70% opacity, so it reads as dimmed while the request is in flight.
const BUSY_OPACITY = 0.7;

/**
 * The sheet's primary button (screens/, #SuggestSheetSending). While the request is in flight it is
 * dimmed, reads as busy to screen readers, and shows a spinner after its label. It takes no presses while busy.
 */
export function SuggestSubmitButton({
  label,
  onPress,
  busy = false,
  testID = 'suggest-submit',
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.brand,
        borderRadius: theme.radius.pill,
        flexDirection: 'row',
        gap: theme.space[2],
        justifyContent: 'center',
        minHeight: BUTTON_HEIGHT,
        opacity: busy ? BUSY_OPACITY : pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: theme.space[5],
      })}
      testID={testID}
    >
      <UiText testID={`${testID}-label`} tone="onBrand" variant="headline" weight={600}>
        {label}
      </UiText>
      {busy ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <ActivityIndicator color={colors.onBrand} size="small" testID={`${testID}-spinner`} />
        </View>
      ) : null}
    </Pressable>
  );
}
