import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { arabizeDigits } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui/UiText';

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

/**
 * The static face of the qibla instrument: bezel, ornament, tick rings, the gold arc, cardinals, numerals and the Kaaba
 * marker parked at `bearing`. These are laid out in the 336 geometry; the compass scales the whole instrument about its
 * centre. Memoised on `bearing`: a heading change re-renders only the needle. Theme and locale arrive through context,
 * which re-renders this component on their own, so the dial is never stale.
 */
function QiblaDialFace({ bearing }: { bearing: number }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();

  // Gold arc from north to the bearing: 2π·130·(bearing/360) of the r=130 ring.
  const ringLength = 2 * Math.PI * MARKER_ORBIT;
  const arcLength = ringLength * (bearing / 360);

  return (
    <>
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
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${bearing}deg` }] }]} testID="qibla-compass-marker">
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
    </>
  );
}

export const QiblaDial = memo(QiblaDialFace);
