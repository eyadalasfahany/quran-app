import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { arabizeDigits } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';

import { QiblaDial } from './QiblaDial';
import { QiblaHub } from './QiblaHub';
import { QiblaNeedle } from './QiblaNeedle';

// The instrument's fixed geometry (quran-app-screens.html, #Qibla): a 336 px dial. The whole instrument keeps this
// geometry and is scaled about its centre to the size it is given (ADR 0036).
const DIAL = 336;

/**
 * The qibla instrument (#Qibla): a fixed north-referenced dial with the Kaaba marker parked on the gold arc at `bearing`,
 * and a needle that springs to `bearing − heading`. The heading arrives as a SharedValue, so ten updates a second move
 * only the needle; the static face (QiblaDial) and the hub are memoised and do not re-render with it. `live = false`
 * (no compass yet, unsupported hardware) or Reduce Motion rests the needle on the marker (D6). `aligned` draws the halo.
 */
export function QiblaCompass({
  bearing,
  heading,
  live,
  aligned,
  reduceMotion,
  size = DIAL,
  testID = 'qibla-compass',
}: {
  /** Degrees from true north, 0…360. */
  bearing: number;
  /** The live true-north heading (a SharedValue, see useQiblaHeading). Read only while `live`. */
  heading: SharedValue<number>;
  /** Whether a compass heading is available and driving the needle. */
  live: boolean;
  aligned: boolean;
  reduceMotion: boolean;
  /** The side of the drawn dial. The 336 geometry is scaled about its centre to fit (ADR 0036). */
  size?: number;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={t('home.salah.qiblaScreen.a11yDial', {
        degrees: locale === 'ar' ? arabizeDigits(String(Math.round(bearing))) : String(Math.round(bearing)),
      })}
      accessibilityRole="image"
      style={{ height: size, width: size }}
      testID={testID}
    >
      {/* The whole instrument keeps its frame geometry and is scaled about its centre to `size`. */}
      <View
        style={{
          height: DIAL,
          left: (size - DIAL) / 2,
          position: 'absolute',
          top: (size - DIAL) / 2,
          transform: [{ scale: size / DIAL }],
          width: DIAL,
        }}
      >
        {aligned ? (
          // The aligned halo: a 384 px radial wash behind the dial (frame inset −24).
          <View pointerEvents="none" style={{ height: 384, left: -24, position: 'absolute', top: -24, width: 384 }} testID={`${testID}-aligned-halo`}>
            <Svg height={384} width={384}>
              <Defs>
                <RadialGradient id="qibla-aligned-halo" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={theme.colors.qiblaAlignedHalo} />
                  <Stop offset="62%" stopColor={theme.colors.qiblaAlignedHalo} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={192} cy={192} r={192} fill="url(#qibla-aligned-halo)" />
            </Svg>
          </View>
        ) : null}

        <QiblaDial bearing={bearing} />
        <QiblaNeedle bearing={bearing} following={live && !reduceMotion} heading={heading} testID={`${testID}-needle`} />
        <QiblaHub />
      </View>
    </View>
  );
}
