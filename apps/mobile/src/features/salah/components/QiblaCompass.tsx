import { useTranslation } from 'react-i18next';
import { I18nManager, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { arabizeDigits } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { dialAnchor, dialPlacement } from '../data/dial-placement';
import { useDialTurn, dialRotationFor } from '../hooks/useDialTurn';

import { QiblaDial } from './QiblaDial';
import { QiblaHub } from './QiblaHub';
import { QiblaLubber } from './QiblaLubber';
import { QiblaNeedle } from './QiblaNeedle';

// The instrument's fixed geometry (quran-app-screens.html, #Qibla): a 336 px dial. The whole instrument keeps this
// geometry and is scaled about its centre to the size it is given (ADR 0036).
const DIAL = 336;

/**
 * The qibla instrument (#Qibla) as a real compass. While live, the whole dial face turns by −heading on the UI thread, so
 * ش points to true north and the Kaaba marker to Makkah's real direction on screen. The cardinals, numerals and the
 * Kaaba glyph stay upright. A fixed lubber mark at the top shows the phone's facing direction, and the needle springs
 * to `bearing − heading`, so it lines up with the marker when the phone faces the qibla.
 *
 * The heading arrives as a SharedValue, so ten updates a second move only animated transforms: the face (QiblaDial)
 * and the hub are memoised and do not re-render with it. When not live (no compass yet, unsupported hardware, Reduce
 * Motion) the dial is the static north-up instrument and the needle rests on the marker (D6). `aligned` draws the halo.
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
  /** Whether a compass heading is available and driving the instrument. */
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

  const following = live && !reduceMotion;
  // The dial's turn follows the heading with the needle's spring; it stays at 0 (north-up) when not following.
  const turn = useDialTurn(heading, following);
  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${dialRotationFor(turn.value)}deg` }],
  }));
  const isRTL = I18nManager.isRTL;
  // The scaled instrument is centred in the `size` box by a translate, not `left` (see dialPlacement).
  const instrument = dialPlacement((size - DIAL) / 2, (size - DIAL) / 2, DIAL, DIAL, isRTL, size);

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
      <View style={{ ...instrument, transform: [...instrument.transform, { scale: size / DIAL }] }}>
        {aligned ? (
          // The aligned halo: a 384 px radial wash behind the dial (frame inset −24). It is rotation-free, so it stays put.
          <View pointerEvents="none" style={dialPlacement(-24, -24, 384, 384, isRTL)} testID={`${testID}-aligned-halo`}>
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

        <Animated.View pointerEvents="none" style={[dialAnchor(DIAL, DIAL), dialStyle]} testID={`${testID}-dial`}>
          <QiblaDial bearing={bearing} turn={turn} />
        </Animated.View>
        <QiblaLubber testID={`${testID}-lubber`} />
        <QiblaNeedle bearing={bearing} following={following} heading={heading} testID={`${testID}-needle`} />
        <QiblaHub />
      </View>
    </View>
  );
}
