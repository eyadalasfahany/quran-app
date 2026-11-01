import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { OfflineStripMotion } from '@/core/network/useOfflineStrip';
import { useTheme } from '@/core/theme';

import { Icon, type IconName } from './Icon';
import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

const OFFLINE_ICON = { ios: 'wifi.slash', android: 'wifi_off' } as const satisfies IconName;
// The frame's measures: a 20 pt glyph and 14 pt side padding, with a 10 pt gap between glyph and text.
const ICON_SIZE = 20;
const PADDING_X = 14;
const GAP = 10;

/**
 * The app-wide offline notice. The frame (quran-app-screens.html, Offline) floats a glass pill over the content. The app
 * draws a slim strip in flow instead, directly under the top safe area, so it never covers a screen title (ADR 0037).
 * MainShell positions it and pushes the content down by its height; `motion` carries that height and the fade.
 *
 * The strip is always mounted so it can animate out. `visible` is the target state: while it is false the strip is
 * closed and hidden from accessibility. It never takes a press.
 */
export function OfflineBanner({
  visible,
  motion,
  testID = 'offline-banner',
}: {
  visible: boolean;
  motion: OfflineStripMotion;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const message = t('network.offlineBanner');

  const frameStyle = useAnimatedStyle(() => ({ height: motion.layout.value * motion.natural.value }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: motion.fade.value }));

  return (
    <Animated.View
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[{ overflow: 'hidden' }, frameStyle]}
      testID={testID}
    >
      {/* One accessible status line: its label is the message, and the glyph is decorative. The strip's height is this
          line's measured height, so a longer message in a larger type size grows the strip rather than clipping it. */}
      <Animated.View
        accessibilityLabel={message}
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        accessible
        onLayout={(event) => {
          motion.natural.value = event.nativeEvent.layout.height;
        }}
        style={[
          {
            alignItems: 'center',
            backgroundColor: theme.colors.fillSecondary,
            flexDirection: 'row',
            gap: GAP,
            paddingHorizontal: PADDING_X,
            paddingVertical: theme.space[2],
          },
          fadeStyle,
        ]}
      >
        <Icon color={colors.inkMuted} name={OFFLINE_ICON} size={ICON_SIZE} testID={`${testID}-icon`} />
        <UiText style={{ flexShrink: 1 }} tone="muted" variant="caption">
          {message}
        </UiText>
      </Animated.View>
    </Animated.View>
  );
}
