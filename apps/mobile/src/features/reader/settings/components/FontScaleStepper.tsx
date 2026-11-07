import { amiriNaturalLeading } from '@quran/design-tokens';
import { useTranslation } from 'react-i18next';
import { Pressable, View, type PressableStateCallbackType, type ViewStyle } from 'react-native';

import { formatPercent, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { FONT_SCALE_MAX, FONT_SCALE_MIN, FONT_SCALE_STEP } from '../../settings-model';

/** The "أ−" and "أ+" glyph sizes on screens/ (Reader settings). The glyphs themselves come from i18n. */
export const STEP_GLYPH_SMALL = 16;
export const STEP_GLYPH_LARGE = 20;
/** Minimum width of the percent label (frame: min-width 52px). */
export const PERCENT_MIN_WIDTH = 52;
/** Inner padding of the track (frame: padding 2px). */
const TRACK_PADDING = 2;

function glyphStyle(size: number): { fontSize: number; lineHeight: number } {
  return { fontSize: size, lineHeight: Math.round(size * amiriNaturalLeading) };
}

export function FontScaleStepper({
  value,
  onChange,
  testID = 'reader-font-scale',
}: {
  value: number;
  onChange: (fontScale: number) => void;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const percent = Math.round(value * 100);
  const percentLabel = formatPercent(percent, locale);
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
      backgroundColor: pressed ? theme.colors.glassSelected : 'transparent',
      borderRadius: theme.radius.pill,
      height: theme.size.touchTarget,
      justifyContent: 'center',
      opacity: disabled ? theme.opacity.disabled : 1,
      width: theme.size.touchTarget,
    });

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.fillTrack,
        borderRadius: theme.radius.pill,
        flexDirection: 'row',
        gap: theme.space[1],
        padding: TRACK_PADDING,
      }}
      testID={testID}
    >
      <Pressable
        accessibilityLabel={t('reader.settings.decreaseFont')}
        accessibilityRole="button"
        accessibilityState={{ disabled: atMin }}
        disabled={atMin}
        onPress={() => step(-1)}
        style={stepStyle(atMin)}
        testID="reader-font-decrease"
      >
        <UiText style={glyphStyle(STEP_GLYPH_SMALL)} variant="displaySm" weight={400}>
          {t('reader.settings.decreaseGlyph')}
        </UiText>
      </Pressable>
      <UiText
        accessibilityLabel={percentLabel}
        align="center"
        style={{ minWidth: PERCENT_MIN_WIDTH, writingDirection: locale === 'ar' ? 'rtl' : 'ltr' }}
        testID="reader-font-percent"
        variant="subhead"
        weight={600}
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
        <UiText style={glyphStyle(STEP_GLYPH_LARGE)} variant="displaySm" weight={400}>
          {t('reader.settings.increaseGlyph')}
        </UiText>
      </Pressable>
    </View>
  );
}
