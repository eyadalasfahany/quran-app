import { amiriNaturalLeading } from '@quran/design-tokens';
import { useTranslation } from 'react-i18next';
import { Pressable, View, type PressableStateCallbackType, type ViewStyle } from 'react-native';

import { formatPercent, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { MUSHAF_ZOOM_MAX, MUSHAF_ZOOM_MIN } from '../../settings-model';
import { stepMushafZoom } from '../../mushaf-svg/mushaf-zoom';

/** The glyph sizes of the zoom stepper: the same as the text-size stepper's (screens/, Reader settings). */
export const ZOOM_GLYPH_SMALL = 16;
export const ZOOM_GLYPH_LARGE = 20;
/** Minimum width of the percent label (frame: min-width 52px). */
export const ZOOM_PERCENT_MIN_WIDTH = 52;
/** Inner padding of the track (frame: padding 2px). */
const TRACK_PADDING = 2;

function glyphStyle(size: number): { fontSize: number; lineHeight: number } {
  return { fontSize: size, lineHeight: Math.round(size * amiriNaturalLeading) };
}

/**
 * The Mushaf page zoom (ADR 0090 amendment, items 9 and 15): 100% to 300% in 25% steps. Shows the zoom as a percentage. `disabled`
 * is the riwayah without word data: both steps are off and the row's hint says why.
 */
export function MushafZoomStepper({
  value,
  onChange,
  disabled = false,
  testID = 'reader-mushaf-zoom',
}: {
  value: number;
  onChange: (mushafZoom: number) => void;
  disabled?: boolean;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const percentLabel = formatPercent(Math.round(value * 100), locale);
  const atMin = disabled || value <= MUSHAF_ZOOM_MIN;
  const atMax = disabled || value >= MUSHAF_ZOOM_MAX;

  const stepStyle =
    (off: boolean) =>
    ({ pressed }: PressableStateCallbackType): ViewStyle => ({
      alignItems: 'center',
      backgroundColor: pressed ? theme.colors.glassSelected : 'transparent',
      borderRadius: theme.radius.pill,
      height: theme.size.touchTarget,
      justifyContent: 'center',
      opacity: off ? theme.opacity.disabled : 1,
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
        accessibilityLabel={t('reader.settings.zoomOut')}
        accessibilityRole="button"
        accessibilityState={{ disabled: atMin }}
        disabled={atMin}
        onPress={() => onChange(stepMushafZoom(value, -1))}
        style={stepStyle(atMin)}
        testID={`${testID}-decrease`}
      >
        <UiText style={glyphStyle(ZOOM_GLYPH_SMALL)} variant="displaySm" weight={400}>
          {t('reader.settings.decreaseGlyph')}
        </UiText>
      </Pressable>
      <UiText
        accessibilityLabel={percentLabel}
        align="center"
        style={{ minWidth: ZOOM_PERCENT_MIN_WIDTH, writingDirection: locale === 'ar' ? 'rtl' : 'ltr' }}
        testID={`${testID}-percent`}
        variant="subhead"
        weight={600}
      >
        {percentLabel}
      </UiText>
      <Pressable
        accessibilityLabel={t('reader.settings.zoomIn')}
        accessibilityRole="button"
        accessibilityState={{ disabled: atMax }}
        disabled={atMax}
        onPress={() => onChange(stepMushafZoom(value, 1))}
        style={stepStyle(atMax)}
        testID={`${testID}-increase`}
      >
        <UiText style={glyphStyle(ZOOM_GLYPH_LARGE)} variant="displaySm" weight={400}>
          {t('reader.settings.increaseGlyph')}
        </UiText>
      </Pressable>
    </View>
  );
}
