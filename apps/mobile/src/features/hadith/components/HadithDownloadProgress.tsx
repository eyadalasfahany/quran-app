import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatPercent } from '@/core/i18n';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

// The cancel target is at least 44 high (HIG).
const CANCEL_MIN_HEIGHT = 44;

/** The sheet's progress block: the percent, a 4 point bar, and a cancel text button. `percent` is 0 to 1. */
export function HadithDownloadProgress({
  percent,
  onCancel,
  testID = 'hadith-download-progress',
}: {
  percent: number;
  onCancel: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const colors = useContrastColors();
  const value = Math.round(Math.min(1, Math.max(0, percent)) * 100);
  const label = t('hadith.download.progress', { percent: formatPercent(value, locale) });

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <UiText testID={`${testID}-text`} variant="subhead">
        {label}
      </UiText>
      <View
        accessibilityLabel={label}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: value }}
        accessible
        style={{ backgroundColor: colors.line, borderRadius: theme.radius.progress, height: theme.size.progressHeight, overflow: 'hidden' }}
        testID={`${testID}-bar`}
      >
        <View
          style={{
            backgroundColor: theme.colors.brand,
            borderRadius: theme.radius.progress,
            height: theme.size.progressHeight,
            width: `${value}%`,
          }}
          testID={`${testID}-fill`}
        />
      </View>
      <Pressable
        accessibilityLabel={t('hadith.download.cancel')}
        accessibilityRole="button"
        onPress={onCancel}
        style={({ pressed }) => ({
          alignSelf: 'flex-start',
          justifyContent: 'center',
          minHeight: CANCEL_MIN_HEIGHT,
          opacity: pressed ? theme.opacity.pressed : 1,
        })}
        testID={`${testID}-cancel`}
      >
        <UiText tone="brand" variant="body" weight={600}>
          {t('hadith.download.cancel')}
        </UiText>
      </Pressable>
    </View>
  );
}
