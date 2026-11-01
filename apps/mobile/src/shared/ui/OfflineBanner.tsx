import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './Icon';
import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

const OFFLINE_ICON = { ios: 'wifi.slash', android: 'wifi_off' } as const satisfies IconName;
// The frame's measures: a 20 pt glyph, a 48 pt minimum height, 14 pt side padding and a 10 pt gap.
const ICON_SIZE = 20;
const MIN_HEIGHT = 48;
const PADDING_X = 14;
const GAP = 10;

/**
 * The app-wide offline notice (quran-app-screens.html, frame Offline): a glass pill with a wifi-off glyph and one
 * line of text. It floats over the top of the content and is drawn only while `visible`. It never blocks a tap.
 */
export function OfflineBanner({ visible, testID = 'offline-banner' }: { visible: boolean; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  if (!visible) {
    return null;
  }

  const message = t('network.offlineBanner');

  return (
    <GlassSurface
      radius="hero"
      style={{
        minHeight: MIN_HEIGHT,
        paddingHorizontal: PADDING_X,
        paddingVertical: theme.space[1],
      }}
      testID={testID}
    >
      {/* One accessible status line: its label is the message, and the glyph is decorative. */}
      <View
        accessibilityLabel={message}
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        accessible
        style={{ alignItems: 'center', flexDirection: 'row', gap: GAP, minHeight: MIN_HEIGHT - theme.space[1] * 2 }}
      >
        <Icon color={colors.inkMuted} name={OFFLINE_ICON} size={ICON_SIZE} testID={`${testID}-icon`} />
        <UiText style={{ flexShrink: 1 }} tone="muted" variant="caption">
          {message}
        </UiText>
      </View>
    </GlassSurface>
  );
}
