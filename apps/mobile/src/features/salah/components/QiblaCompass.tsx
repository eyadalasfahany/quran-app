import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, View } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { arabizeDigits } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { dialAnchor, dialPlacement } from '../data/dial-placement';
import { needleAngleFor } from '../data/qibla-math';
import { useFollowTarget } from '../hooks/useFollowTarget';

import { QiblaArc } from './QiblaArc';
import { QiblaDial } from './QiblaDial';
import { QiblaHub } from './QiblaHub';
import { QiblaKaabaMarker } from './QiblaKaabaMarker';
import { QiblaLubber } from './QiblaLubber';
import { QiblaNeedle } from './QiblaNeedle';

// The instrument's fixed geometry (quran-app-screens.html, #Qibla): a 336 px dial. The whole instrument keeps this
// geometry and is scaled about its centre to the size it is given (ADR 0036).
const DIAL = 336;

/**
 * The qibla instrument (#Qibla) as a real compass. The face stays fixed on screen (ADR 0049): the cardinals, numerals and
 * ticks are a reference ring, and only the three moving layers turn. They all read one qibla angle, computed here once:
 *
 * - While live, the angle is `bearing − heading` (the shortest turn), so the Kaaba marker (with its halo), the gold arc
 *   and the needle show the qibla relative to where the phone points. When the phone faces the qibla, the marker sits at
 *   the top under the fixed lubber mark.
 * - When not live (no compass yet, unsupported hardware, Reduce Motion) the angle is the `bearing`, so the marker rests
 *   at the bearing on the north-up dial, as before.
 *
 * The heading arrives as a SharedValue, so ten updates a second move only animated transforms: the face (QiblaDial) and
 * the hub are memoised and do not re-render with it. `aligned` draws the halo.
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

  // The bearing is read on the UI thread too: it is the angle's rest target while not following.
  const bearingValue = useSharedValue(bearing);
  useEffect(() => {
    bearingValue.value = bearing;
  }, [bearing, bearingValue]);

  // The one qibla angle, shared by the marker, the arc and the needle so they can never drift apart.
  const angle = useFollowTarget(following, bearing, [bearingValue, heading], (follow, [target, live]) => {
    'worklet';
    return follow ? needleAngleFor(target, live) : target;
  });

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

        {/* The fixed face: it takes no transform and never turns. */}
        <View pointerEvents="none" style={dialAnchor(DIAL, DIAL)} testID={`${testID}-dial`}>
          <QiblaDial angle={angle} />
        </View>
        <QiblaArc angle={angle} following={following} />
        <QiblaKaabaMarker angle={angle} />
        <QiblaLubber testID={`${testID}-lubber`} />
        <QiblaNeedle angle={angle} testID={`${testID}-needle`} />
        <QiblaHub />
      </View>
    </View>
  );
}
