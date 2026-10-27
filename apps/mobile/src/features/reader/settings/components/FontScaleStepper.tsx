import { useTranslation } from 'react-i18next';
import { Pressable, View, type PressableStateCallbackType, type ViewStyle } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { QuranText, UiText } from '@/shared/ui';

import { FONT_SCALE_MAX, FONT_SCALE_MIN, FONT_SCALE_STEP } from '../../settings-model';

const PERCENT_MIN_WIDTH = 64;

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

  const stepStyle =
    (disabled: boolean) =>
    ({ pressed }: PressableStateCallbackType): ViewStyle => ({
      alignItems: 'center',
      backgroundColor: pressed ? theme.colors.glassSelected : theme.colors.fillSecondary,
      borderRadius: theme.radius.pill,
      height: theme.size.touchTarget,
      justifyContent: 'center',
      opacity: disabled ? theme.opacity.disabled : 1,
      width: theme.size.touchTarget,
    });

  return (
    <View style={{ gap: theme.space[3] }} testID={testID}>
      <UiText variant="headline">{t('reader.settings.fontScale')}</UiText>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
        <Pressable
          accessibilityLabel={t('reader.settings.decreaseFont')}
          accessibilityRole="button"
          accessibilityState={{ disabled: atMin }}
          disabled={atMin}
          onPress={() => step(-1)}
          style={stepStyle(atMin)}
          testID="reader-font-decrease"
        >
          <UiText variant="headline">أ−</UiText>
        </Pressable>
        <UiText
          accessibilityLabel={percentLabel}
          align="center"
          style={{ minWidth: PERCENT_MIN_WIDTH }}
          testID="reader-font-percent"
        >
          {percentLabel}
        </UiText>
        <Pressable
          accessibilityLabel={t('reader.settings.increaseFont')}
          accessibilityRole="button"
          accessibilityState={{ disabled: atMax }}
          disabled={atMax}
          onPress={() => step(1)}
          style={stepStyle(atMax)}
          testID="reader-font-increase"
        >
          <UiText variant="headline">أ+</UiText>
        </Pressable>
      </View>
      {previewText ? (
        <QuranText align="center" fontScale={value} testID="reader-font-preview" variant="quranReading">
          {previewText}
        </QuranText>
      ) : null}
    </View>
  );
}
