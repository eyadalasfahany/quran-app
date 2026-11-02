import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { arabizeDigits } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui/UiText';

import { dialAnchor, dialPlacement } from '../data/dial-placement';

import { KaabaGlyph } from './KaabaGlyph';
import { QiblaUpright } from './QiblaUpright';

// The instrument's fixed geometry (quran-app-screens.html, #Qibla): a 336 px dial whose
// ring, ticks, cardinals and numerals never move on the face. The face turns as a whole (QiblaCompass).
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
 * The face of the qibla instrument: bezel, ornament, tick rings, the gold arc, cardinals, numerals and the Kaaba marker
 * parked at `bearing`. These are laid out unrotated in the 336 geometry. QiblaCompass turns the whole face by −turn, so ش
 * points to real north and the marker to Makkah's real direction. The cardinals, numerals and the Kaaba glyph
 * counter-rotate by +turn (QiblaUpright), so they stay readable.
 *
 * Every absolute layer is placed with a translate (dialPlacement), never with `left` or `right`: React Native swaps those
 * in RTL, which mirrored the labels. The QiblaUpright layers sit inside their placed box and keep their own transform.
 *
 * Memoised on `bearing` and `turn` (a stable SharedValue): a heading change does not re-render the face, only the
 * animated transforms move. Theme and locale arrive through context, which re-renders this component on their own.
 */
function QiblaDialFace({ bearing, turn }: { bearing: number; turn: SharedValue<number> }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const isRTL = I18nManager.isRTL;

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
        style={{ ...dialPlacement(ORNAMENT_OFFSET, ORNAMENT_OFFSET, 228, 228, isRTL), opacity: 0.06 }}
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
      <Svg height={DIAL} style={dialAnchor(DIAL, DIAL)} width={DIAL}>
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

      {/* Cardinals and degree numerals, at the frame's exact positions, upright on screen. */}
      {CARDINALS.map((cardinal) => (
        <View
          key={cardinal.key}
          pointerEvents="none"
          style={dialPlacement(cardinal.x - 20, cardinal.y - 11, 40, 22, isRTL)}
          testID={`qibla-dial-label-${cardinal.key}`}
        >
          <QiblaUpright
            style={{ alignItems: 'center', height: 22, width: 40 }}
            testID={`qibla-dial-label-${cardinal.key}-upright`}
            turn={turn}
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
          </QiblaUpright>
        </View>
      ))}
      {NUMERALS.map((numeral) => (
        <View
          key={numeral.degrees}
          pointerEvents="none"
          style={dialPlacement(numeral.x - 20, numeral.y - 7, 40, 14, isRTL)}
          testID={`qibla-dial-numeral-${numeral.degrees}`}
        >
          <QiblaUpright
            style={{ alignItems: 'center', height: 14, width: 40 }}
            testID={`qibla-dial-numeral-${numeral.degrees}-upright`}
            turn={turn}
          >
            <UiText style={{ color: theme.colors.playerMuted, fontSize: 11, lineHeight: 14 }} variant="label" weight={400}>
              {locale === 'ar' ? arabizeDigits(String(numeral.degrees)) : String(numeral.degrees)}
            </UiText>
          </QiblaUpright>
        </View>
      ))}

      {/* The Kaaba marker, parked on the arc at the bearing. Inside the marker the glyph is counter-rotated by −bearing,
          so it is upright within the face; QiblaUpright adds +turn, so it is upright on screen too. */}
      <View
        pointerEvents="none"
        style={{ ...dialAnchor(DIAL, DIAL), transform: [{ rotate: `${bearing}deg` }] }}
        testID="qibla-compass-marker"
      >
        <View style={dialPlacement(CENTER - 32, CENTER - MARKER_ORBIT - 32, 64, 64, isRTL)}>
          <QiblaUpright style={{ height: 64, width: 64 }} testID="qibla-compass-marker-upright" turn={turn}>
            <View
              style={{
                ...dialAnchor(64, 64),
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ rotate: `${-bearing}deg` }],
              }}
              testID="qibla-compass-marker-glyph"
            >
              <Svg height={64} style={dialAnchor(64, 64)} width={64}>
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
          </QiblaUpright>
        </View>
      </View>
    </>
  );
}

export const QiblaDial = memo(QiblaDialFace);
