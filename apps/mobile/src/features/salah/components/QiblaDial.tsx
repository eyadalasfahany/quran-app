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

import { QiblaLabelClearance } from './QiblaLabelClearance';

// The instrument's fixed geometry (screens/, #Qibla): a 336 px dial. The face never turns (ADR 0049): the
// ring, ticks, cardinals and numerals are a fixed reference ring. The Kaaba marker is fixed at the top; only the needle
// moves (QiblaKaabaMarker, QiblaNeedle).
const DIAL = 336;
const CENTER = DIAL / 2; // 168
const TICK_RING = 148;

// The ornament is drawn in a 100×100 box and shown at the frame's 228 px, centered.
const ORNAMENT_OFFSET = CENTER - 114; // 54

// Cardinals (frame: ش 16 px at 600; ج غ ق 15 px at 500 — the nearest type steps, size set inline).
const CARDINALS = [
  { key: 'cardinalNorth', degrees: 0, x: 168, y: 56, size: 16, weight: 600, bright: true },
  { key: 'cardinalSouth', degrees: 180, x: 168, y: 280, size: 15, weight: 500, bright: false },
  { key: 'cardinalWest', degrees: 270, x: 56, y: 168, size: 15, weight: 500, bright: false },
  { key: 'cardinalEast', degrees: 90, x: 280, y: 168, size: 15, weight: 500, bright: false },
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
 * The static face of the qibla instrument: bezel, ornament, tick rings, cardinals and degree numerals. It takes no props
 * and never turns, so ش and the numerals are a fixed reference ring around the dial. The Kaaba marker sits fixed at the
 * top above it (QiblaKaabaMarker); the needle turns above both (QiblaNeedle).
 *
 * Every absolute layer is placed with a translate (dialPlacement), never with `left` or `right`: React Native swaps those
 * in RTL, which mirrored the labels.
 *
 * The labels fade where the fixed Kaaba marker covers them (QiblaLabelClearance), from `angle` on the UI thread (0 at the
 * top). It is a stable SharedValue, so the memoised face still does not re-render with the compass. Theme and locale arrive through context, which
 * re-renders it on their own.
 */
function QiblaDialFace({ angle }: { angle?: SharedValue<number> }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <>
      {/* Bezel: radial face, player line edge. The frame's 0 24px 48px black shadow reads through the glass shadow token. */}
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

      {/* Tick rings. */}
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
      </Svg>

      {/* Cardinals and degree numerals, at the frame's exact positions. */}
      {CARDINALS.map((cardinal) => (
        <QiblaLabelClearance
          angle={angle}
          degrees={cardinal.degrees}
          key={cardinal.key}
          style={dialPlacement(cardinal.x - 20, cardinal.y - 11, 40, 22, isRTL)}
          testID={`qibla-dial-label-${cardinal.key}`}
        >
          <View style={{ alignItems: 'center', height: 22, width: 40 }}>
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
        </QiblaLabelClearance>
      ))}
      {NUMERALS.map((numeral) => (
        <QiblaLabelClearance
          angle={angle}
          degrees={numeral.degrees}
          key={numeral.degrees}
          style={dialPlacement(numeral.x - 20, numeral.y - 7, 40, 14, isRTL)}
          testID={`qibla-dial-numeral-${numeral.degrees}`}
        >
          <View style={{ alignItems: 'center', height: 14, width: 40 }}>
            <UiText style={{ color: theme.colors.playerMuted, fontSize: 11, lineHeight: 14 }} variant="label" weight={400}>
              {locale === 'ar' ? arabizeDigits(String(numeral.degrees)) : String(numeral.degrees)}
            </UiText>
          </View>
        </QiblaLabelClearance>
      ))}
    </>
  );
}

export const QiblaDial = memo(QiblaDialFace);
