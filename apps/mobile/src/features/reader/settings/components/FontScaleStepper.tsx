import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { quranText, uiTextProps } from '@/shared/ui';

import { FONT_SCALE_MAX, FONT_SCALE_MIN, FONT_SCALE_STEP } from '../../settings-model';

export function FontScaleStepper({
  value,
  onChange,
  previewText,
  testID = 'reader-font-scale',
}: {
  value: number;
  onChange: (fontScale: number) => void;
  previewText?: string;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const percent = Math.round(value * 100);
  const percentLabel = `${formatNumber(percent, locale)}${locale === 'ar' ? '٪' : '%'}`;
  const atMin = value <= FONT_SCALE_MIN;
  const atMax = value >= FONT_SCALE_MAX;

  const step = (direction: -1 | 1) => {
    const next = Math.round((value + direction * FONT_SCALE_STEP) * 10) / 10;
    onChange(next);
  };

  return (
    <View style={{ gap: theme.space[3] }} testID={testID}>
      <Text {...uiTextProps('headline')} style={[theme.text.headline, { color: theme.colors.ink }]}>
        {t('reader.settings.fontScale')}
      </Text>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
        <Pressable
          accessibilityLabel={t('reader.settings.decreaseFont')}
          accessibilityRole="button"
          accessibilityState={{ disabled: atMin }}
          disabled={atMin}
          onPress={() => step(-1)}
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.fillSecondary,
            borderRadius: theme.radius.pill,
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}
          testID="reader-font-decrease"
        >
          <Text {...uiTextProps('headline')} style={[theme.text.headline, { color: theme.colors.ink }]}>
            أ−
          </Text>
        </Pressable>
        <Text
          {...uiTextProps('body')}
          accessibilityLabel={percentLabel}
          style={[theme.text.body, { color: theme.colors.ink, minWidth: 64, textAlign: 'center' }]}
          testID="reader-font-percent"
        >
          {percentLabel}
        </Text>
        <Pressable
          accessibilityLabel={t('reader.settings.increaseFont')}
          accessibilityRole="button"
          accessibilityState={{ disabled: atMax }}
          disabled={atMax}
          onPress={() => step(1)}
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.fillSecondary,
            borderRadius: theme.radius.pill,
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}
          testID="reader-font-increase"
        >
          <Text {...uiTextProps('headline')} style={[theme.text.headline, { color: theme.colors.ink }]}>
            أ+
          </Text>
        </Pressable>
      </View>
      {previewText ? (
        <Text
          allowFontScaling={false}
          style={[quranText('quranReading', value), { color: theme.colors.ink, textAlign: 'center' }]}
          testID="reader-font-preview"
        >
          {previewText}
        </Text>
      ) : null}
    </View>
  );
}
