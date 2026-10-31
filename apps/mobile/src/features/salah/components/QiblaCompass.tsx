import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { arabizeDigits } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { spring } from '@/core/theme/motion';
import { UiText } from '@/shared/ui/UiText';

import { needleAngleFor, normalize180, shortestTurn } from '../hooks/useQiblaHeading';
import { KaabaGlyph } from './KaabaGlyph';

// The instrument's fixed geometry (quran-app-screens.html, #Qibla): a 336 px dial whose
// ring, ticks, cardinals and numerals never move. Only the needle rotates.
const DIAL = 336;
const CENTER = DIAL / 2; // 168
const MARKER_ORBIT = 130;
const TICK_RING = 148;

// The ornament is drawn in a 100×100 box and shown at the frame's 228 px, centered.
const ORNAMENT_OFFSET = CENTER - 114; // 54

// Cardinals (frame: ش 16 px at 600; ج غ ق 15 px at 500 — the nearest type steps, size set inline).
const CARDINALS = [
  { key: 'cardinalNorth', x: 168, y: 56, size: 16, weight: 600, bright: true },
  { key: 'cardinalSouth', x: 168, y: 280, size: 15, weight: 500, bright: false },
  { key: 'cardinalWest', x: 56, y: 168, size: 15, weight: 500, bright: false },
  { key: 'cardinalEast', x: 280, y: 168, size: 15, weight: 500, bright: false },
] as const;

// Degree numerals at the frame's exact 11 px positions.
const NUMERALS = [
  { degrees: 30, x: 224, y: 71 },
  { degrees: 60, x: 265, y: 112 },
  { degrees: 120, x: 265, y: 224 },
  { degrees: 150, x: 224, y: 265 },
  { degrees: 210, x: 112, y: 265 },
  { degrees: 240, x: 71, y: 224 },
  { degrees: 300, x: 71, y: 112 },
  { degrees: 330, x: 112, y: 71 },
] as const;

// The tapered gold dart and its quiet counterweight, from the frame.
const DART_PATH = 'M168 64 L172.5 168 L168 177 L163.5 168 Z';
const COUNTERWEIGHT_PATH = 'M168 168 L165.4 204 L168 209 L170.6 204 Z';

/**
 * The qibla instrument (#Qibla): a fixed north-referenced dial with the Kaaba marker
 * parked on the gold arc at `bearing`, and a needle that springs to `bearing − heading`.
 * `heading = null` (no compass yet, Reduce Motion, or unsupported hardware) renders the
 * static dial: needle resting on the marker (D6). `aligned` draws the frame's halo.
 */
export function QiblaCompass({
  bearing,
  heading,
  aligned,
  reduceMotion,
  testID = 'qibla-compass',
}: {
  /** Degrees from true north, 0…360. */
  bearing: number;
  /** Live true-north heading, or null for the static dial. */
  heading: number | null;
  aligned: boolean;
  reduceMotion: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();

  const needleAngle = useSharedValue(bearing);

  useEffect(() => {
    if (heading === null || reduceMotion) {
      // Static dial: the needle rests on the marker, no animation (D6).
      needleAngle.value = bearing;
      return;
    }
    const target = needleAngleFor(bearing, heading);
    const delta = shortestTurn(normalize180(needleAngle.value), target);
    needleAngle.value = withSpring(needleAngle.value + delta, spring());
  }, [heading, bearing, reduceMotion, needleAngle]);

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needleAngle.value}deg` }],
  }));

  // Gold arc from north to the bearing: 2π·130·(bearing/360) of the r=130 ring.
  const ringLength = 2 * Math.PI * MARKER_ORBIT;
  const arcLength = ringLength * (bearing / 360);

  return (
    <View
      accessibilityLabel={t('home.salah.qiblaScreen.a11yDial', {
        degrees: locale === 'ar' ? arabizeDigits(String(Math.round(bearing))) : String(Math.round(bearing)),
      })}
      accessibilityRole="image"
      style={{ height: DIAL, width: DIAL }}
      testID={testID}
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

      {/* Bezel: radial face, player line edge. The frame's 0 24px 48px black shadow
          reads through the glass shadow token. */}
      <View
        style={{
          borderColor: theme.colors.playerLine,
          borderRadius: CENTER,
          borderWidth: 1,
          boxShadow: theme.shadows.glass,
          height: DIAL,
          overflow: 'hidden',
          width: DIAL,
        }}
      >
        <Svg height={DIAL} width={DIAL}>
          <Defs>
            <RadialGradient id="qibla-bezel" cx="50%" cy="40%" r="75%">
              <Stop offset="0%" stopColor={theme.colors.qiblaBezelFrom} />
              <Stop offset="100%" stopColor={theme.colors.qiblaBezelTo} />
            </RadialGradient>
          </Defs>
          <Circle cx={CENTER} cy={CENTER} r={CENTER} fill="url(#qibla-bezel)" />
        </Svg>
      </View>

      {/* The 8-point-star ornament, at the frame's 6% opacity. */}
      <Svg
        height={228}
        style={{ left: ORNAMENT_OFFSET, opacity: 0.06, position: 'absolute', top: ORNAMENT_OFFSET }}
        viewBox="0 0 100 100"
        width={228}
      >
        {/* stroke-width 0.8 in viewBox units scales to ~1.8 px on screen, as in the frame. */}
        <G fill="none" stroke={theme.colors.goldOnBrandSurface} strokeWidth={0.8}>
          <Path d="M50 4l13 33 33 13-33 13-13 33-13-33L4 50l33-13z" />
          <Rect height={56} transform="rotate(45 50 50)" width={56} x={22} y={22} />
          <Rect height={56} width={56} x={22} y={22} />
          <Circle cx={50} cy={50} r={12} />
        </G>
      </Svg>

      {/* Tick rings and the gold qibla arc. */}
      <Svg height={DIAL} style={StyleSheet.absoluteFill} width={DIAL}>
        <Circle
          cx={CENTER}
          cy={CENTER}
          fill="none"
          origin={`${CENTER}, ${CENTER}`}
          r={TICK_RING}
          rotation={-90}
          stroke={theme.colors.qiblaTickMinor}
          strokeDasharray="1.5 14.014"
          strokeWidth={8}
        />
        <Circle
          cx={CENTER}
          cy={CENTER}
          fill="none"
          origin={`${CENTER}, ${CENTER}`}
          r={TICK_RING}
          rotation={-90}
          stroke={theme.colors.qiblaTickMajor}
          strokeDasharray="2.5 74.962"
          strokeWidth={14}
        />
        <Circle
          cx={CENTER}
          cy={CENTER}
          fill="none"
          origin={`${CENTER}, ${CENTER}`}
          r={MARKER_ORBIT}
          rotation={-90}
          stroke={theme.colors.goldOnBrandSurface}
          strokeDasharray={`${arcLength} ${ringLength - arcLength}`}
          strokeLinecap="round"
          strokeWidth={3}
        />
      </Svg>

      {/* Cardinals and degree numerals, at the frame's exact positions. */}
      {CARDINALS.map((cardinal) => (
        <View
          key={cardinal.key}
          pointerEvents="none"
          style={{ alignItems: 'center', height: 22, left: cardinal.x - 20, position: 'absolute', top: cardinal.y - 11, width: 40 }}
        >
          <UiText
            style={{
              color: cardinal.bright ? theme.colors.playerInk : theme.colors.playerMuted,
              fontSize: cardinal.size,
              lineHeight: 22,
            }}
            variant="subhead"
            weight={cardinal.weight}
          >
            {t(`home.salah.qiblaScreen.${cardinal.key}`)}
          </UiText>
        </View>
      ))}
      {NUMERALS.map((numeral) => (
        <View
          key={numeral.degrees}
          pointerEvents="none"
          style={{ alignItems: 'center', height: 14, left: numeral.x - 20, position: 'absolute', top: numeral.y - 7, width: 40 }}
        >
          <UiText
            style={{ color: theme.colors.playerMuted, fontSize: 11, lineHeight: 14 }}
            variant="label"
            weight={400}
          >
            {locale === 'ar' ? arabizeDigits(String(numeral.degrees)) : String(numeral.degrees)}
          </UiText>
        </View>
      ))}

      {/* The Kaaba marker, parked on the arc at the bearing; counter-rotated upright. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${bearing}deg` }] }]} testID={`${testID}-marker`}>
        <View
          style={{
            alignItems: 'center',
            height: 64,
            justifyContent: 'center',
            left: CENTER - 32,
            position: 'absolute',
            top: CENTER - MARKER_ORBIT - 32,
            transform: [{ rotate: `${-bearing}deg` }],
            width: 64,
          }}
        >
          <Svg height={64} style={StyleSheet.absoluteFill} width={64}>
            <Defs>
              <RadialGradient id="qibla-marker-halo" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={theme.colors.qiblaGoldHalo} />
                <Stop offset="65%" stopColor={theme.colors.qiblaGoldHalo} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={32} cy={32} r={32} fill="url(#qibla-marker-halo)" />
          </Svg>
          <KaabaGlyph size={42} />
        </View>
      </View>

      {/* The needle: a tapered gold dart springing to bearing − heading. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, needleStyle]} testID={`${testID}-needle`}>
        <Svg height={DIAL} width={DIAL}>
          <Defs>
            <LinearGradient id="qibla-dart" x1="0" x2="0" y1="1" y2="0">
              <Stop offset="0%" stopColor={theme.colors.qiblaDartFrom} />
              <Stop offset="100%" stopColor={theme.colors.playerAccent} />
            </LinearGradient>
          </Defs>
          <Path d={COUNTERWEIGHT_PATH} fill={theme.colors.qiblaCounterweight} />
          {/* The frame's 6 px gold drop-shadow, drawn as a wide glow stroke under the dart. */}
          <Path d={DART_PATH} fill="none" stroke={theme.colors.qiblaDartGlow} strokeLinejoin="round" strokeWidth={12} />
          <Path d={DART_PATH} fill="url(#qibla-dart)" />
        </Svg>
      </Animated.View>

      {/* The hub: the user's position dot. A 5 px player-bg ring, then the gold glow,
          then the 52 px gradient disc with its faint ring and white dot. */}
      <View
        pointerEvents="none"
        style={{
          alignItems: 'center',
          borderColor: theme.colors.playerBg,
          borderRadius: 31,
          borderWidth: 5,
          boxShadow: `0 0 18px ${theme.colors.qiblaGoldHalo}`,
          height: 62,
          justifyContent: 'center',
          left: CENTER - 31,
          position: 'absolute',
          top: CENTER - 31,
          width: 62,
        }}
      >
        <View
          style={{
            borderColor: theme.colors.goldOnBrandSurface,
            borderRadius: 26,
            borderWidth: 1.5,
            height: 52,
            overflow: 'hidden',
            width: 52,
          }}
        >
          <Svg height={52} width={52}>
            <Defs>
              <RadialGradient id="qibla-hub" cx="50%" cy="32%" r="78%">
                <Stop offset="0%" stopColor={theme.colors.qiblaHubFrom} />
                <Stop offset="100%" stopColor={theme.colors.qiblaHubTo} />
              </RadialGradient>
            </Defs>
            <Circle cx={26} cy={26} r={26} fill="url(#qibla-hub)" />
            <Circle cx={26} cy={26} fill="none" r={11} stroke={theme.colors.qiblaHubRing} strokeWidth={1.5} />
            <Circle cx={26} cy={26} fill={theme.colors.playerInk} r={6} />
          </Svg>
        </View>
      </View>
    </View>
  );
}
