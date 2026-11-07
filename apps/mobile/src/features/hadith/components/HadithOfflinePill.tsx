import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors } from '@/shared/ui';

const WIFI_OFF = { ios: 'wifi.slash', android: 'wifi_off' } as const;
// The gap between the glyph and the text (theme.space[2] is 8; the frame uses 6).
const GAP = 6;
const ICON_SIZE = 14;

/** «غير متاح دون اتصال»: a non-interactive pill on a row that is not installed while offline. */
export function HadithOfflinePill({ testID = 'hadith-offline-pill' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const text = t('hadith.download.offlineUnavailable');

  return (
    <View
      accessibilityLabel={text}
      accessibilityRole="text"
      style={{
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.fillSecondary,
        borderRadius: 12,
        flexDirection: 'row',
        gap: GAP,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
      testID={testID}
    >
      <Icon color={colors.inkMuted} name={WIFI_OFF} size={ICON_SIZE} testID={`${testID}-icon`} />
      <UiText testID={`${testID}-text`} tone="muted" variant="caption" weight={600}>
        {text}
      </UiText>
    </View>
  );
}
