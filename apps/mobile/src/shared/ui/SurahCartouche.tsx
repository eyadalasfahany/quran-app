import { useId, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type HostInstance, type LayoutChangeEvent } from 'react-native';
import Svg, { ClipPath, Defs, G, Rect } from 'react-native-svg';

import { useTheme } from '@/core/theme';

import { DrawnPath } from './DrawnPath';
import { circle, joinOutlines, path, type Outline, type Point } from './svg-path';
import { UiText } from './UiText';
import { useDrawOnView } from './useDrawOnView';

export type CartoucheVariant = 'full' | 'compact';

// View heights (ADR 0049): the full header is the band plus a rosette above and below it; the compact one is the band alone.
const HEIGHT = { compact: 52, full: 112 } as const;
// Stroke centres of the outer rule, top and bottom. The full band sits in the middle of its taller view.
const BAND = {
  compact: { top: 2.75, bottom: 49.25 },
  full: { top: 29.75, bottom: 82.25 },
} as const;
// The inner rule sits this far inside the outer one.
const INNER_INSET = 4.5;
// Each pointed end takes this much width; the name clears it plus a space step.
const END_WIDTH = 46;
// The rosette's radius; its centre is the full view's middle.
const ROSETTE_RADIUS = 50;
// The rosette is clipped to the space above and below the band, so its middle never shows through.
const CLIP = {
  top: 29,
  bottomStart: 83,
  bottomHeight: HEIGHT.full - 83,
} as const;

type Stroke = { outline: Outline; width: number };
type StrokeTokens = {
  frame: number;
  frameRule: number;
  rosettePetal: number;
  rosetteDetail: number;
};

export function SurahCartouche({
  name,
  testID,
  variant = 'compact',
}: {
  name: string;
  testID?: string;
  variant?: CartoucheVariant;
}) {
  const theme = useTheme();
  const ref = useRef<HostInstance>(null);
  const clipId = `surah-rosette-${useId().replace(/:/g, '')}`;
  const [size, setSize] = useState({ height: 0, width: 0 });
  const progress = useDrawOnView(ref, name);
  const strokes = useMemo(
    () => (size.width > 0 ? cartoucheStrokes(size.width, variant, theme.stroke) : []),
    [size.width, variant, theme.stroke],
  );

  const onLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    setSize((current) =>
      current.width === layout.width && current.height === layout.height
        ? current
        : { height: layout.height, width: layout.width },
    );
  };

  const drawStroke = (stroke: Stroke, index: number) => (
    <DrawnPath
      key={index}
      outline={stroke.outline}
      progress={progress}
      stroke={theme.colors.gold}
      strokeWidth={stroke.width}
      testID={testID ? `${testID}-stroke-${index}` : undefined}
    />
  );

  // The band is strokes 0 and 1; the rosette, when there is one, is 2 to 4 and sits inside the clip.
  // The drawing keeps its design height; a taller name (Dynamic Type) centres it in the view.
  const offset = Math.max(0, (size.height - HEIGHT[variant]) / 2);
  const band = strokes.slice(0, 2);
  const rosette = strokes.slice(2);

  return (
    <View
      accessibilityLabel={name}
      accessibilityRole="header"
      accessible
      onLayout={onLayout}
      ref={ref}
      style={{
        alignItems: 'center',
        alignSelf: 'stretch',
        justifyContent: 'center',
        minHeight: HEIGHT[variant],
        paddingHorizontal: END_WIDTH + theme.space[3],
      }}
      testID={testID}
    >
      {strokes.length > 0 ? (
        <Svg
          accessibilityElementsHidden
          height={size.height}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          testID={testID ? `${testID}-frame` : undefined}
          width={size.width}
        >
          <G transform={`translate(0 ${offset})`}>
            {band.map(drawStroke)}
            {rosette.length > 0 ? (
              <>
                <Defs>
                  <ClipPath id={clipId}>
                    <Rect
                      height={CLIP.top}
                      testID={testID ? `${testID}-clip-0` : undefined}
                      width={size.width}
                      x={0}
                      y={0}
                    />
                    <Rect
                      height={CLIP.bottomHeight}
                      testID={testID ? `${testID}-clip-1` : undefined}
                      width={size.width}
                      x={0}
                      y={CLIP.bottomStart}
                    />
                  </ClipPath>
                </Defs>
                <G clipPath={`url(#${clipId})`} testID={testID ? `${testID}-rosette` : undefined}>
                  {rosette.map((stroke, index) => drawStroke(stroke, index + band.length))}
                </G>
              </>
            ) : null}
          </G>
        </Svg>
      ) : null}
      <UiText align="center" style={{ writingDirection: 'rtl' }} variant="displaySm">
        {name}
      </UiText>
    </View>
  );
}

function cartoucheStrokes(width: number, variant: CartoucheVariant, stroke: StrokeTokens): Stroke[] {
  const { top, bottom } = BAND[variant];
  const strokes: Stroke[] = [
    { outline: bandOutline(width, top, bottom, 0), width: stroke.frame },
    {
      outline: bandOutline(width, top, bottom, INNER_INSET),
      width: stroke.frameRule,
    },
  ];
  if (variant === 'full') {
    strokes.push(...rosetteStrokes(width / 2, HEIGHT.full / 2, stroke));
  }
  return strokes;
}

// One closed band: flat top and bottom, a stepped notch at each corner, and a concave sweep to a point at each end.
// Only the straight run stretches with the width; the ends keep their shape.
function bandOutline(width: number, top: number, bottom: number, inset: number): Outline {
  const t = top + inset;
  const b = bottom - inset;
  const m = (top + bottom) / 2;
  const h = (b - t) / 2;
  const tip = 2 + 1.6 * inset;
  const sx = tip + 1.15 * h;
  const sy = 0.42 * h;
  const n = Math.max(3, 6 - 0.4 * inset);
  const k = sx + 2 * n;
  const W = width;

  return path([
    ['M', [k, t]],
    ['L', [W - k, t]],
    ['L', [W - k, t + n]],
    ['L', [W - sx, t + n]],
    ['L', [W - sx, m - sy]],
    ['Q', [W - sx - 2, m - 2], [W - tip, m]],
    ['Q', [W - sx - 2, m + 2], [W - sx, m + sy]],
    ['L', [W - sx, b - n]],
    ['L', [W - k, b - n]],
    ['L', [W - k, b]],
    ['L', [k, b]],
    ['L', [k, b - n]],
    ['L', [sx, b - n]],
    ['L', [sx, m + sy]],
    ['Q', [sx + 2, m + 2], [tip, m]],
    ['Q', [sx + 2, m - 2], [sx, m - sy]],
    ['L', [sx, t + n]],
    ['L', [k, t + n]],
    ['Z'],
  ]);
}

// Twelve ogee petals with an inner rule, a bead past each tip and three dots inside; twelve pointed leaves between them; a ring.
function rosetteStrokes(cx: number, cy: number, stroke: StrokeTokens): Stroke[] {
  const R = ROSETTE_RADIUS;
  const step = (2 * Math.PI) / 12;
  const w = step / 2;
  const r0 = R * 0.6;
  const pol = (r: number, a: number): Point => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const dot = (r: number, a: number, radius: number) => {
    const [x, y] = pol(r, a);
    return circle(x, y, radius);
  };
  const petals: Outline[] = [];
  const details: Outline[] = [];
  const leaves: Outline[] = [];

  for (let k = 0; k < 12; k += 1) {
    const a = k * step;
    petals.push(
      path([
        ['M', pol(r0, a - w)],
        ['C', pol(R * 0.86, a - w * 1.05), pol(R * 0.9, a - w * 0.08), pol(R, a)],
        ['C', pol(R * 0.9, a + w * 0.08), pol(R * 0.86, a + w * 1.05), pol(r0, a + w)],
      ]),
    );
    details.push(
      path([
        ['M', pol(r0 + 3, a - w * 0.62)],
        ['C', pol(R * 0.8, a - w * 0.66), pol(R * 0.84, a - w * 0.06), pol(R - 8, a)],
        ['C', pol(R * 0.84, a + w * 0.06), pol(R * 0.8, a + w * 0.66), pol(r0 + 3, a + w * 0.62)],
      ]),
      dot(R + 4, a, 1.6),
      dot(R * 0.74, a, 0.6),
      dot(R * 0.68, a - w * 0.28, 0.6),
      dot(R * 0.68, a + w * 0.28, 0.6),
    );
    const c = a + step / 2;
    const lw = step * 0.3;
    const l0 = R * 0.38;
    const l1 = R * 0.66;
    leaves.push(
      path([
        ['M', pol(l0, c - lw)],
        ['Q', pol(l1 * 0.95, c - lw * 0.9), pol(l1, c)],
        ['Q', pol(l1 * 0.95, c + lw * 0.9), pol(l0, c + lw)],
      ]),
    );
  }
  leaves.push(circle(cx, cy, R * 0.38));

  return [
    { outline: joinOutlines(petals), width: stroke.rosettePetal },
    { outline: joinOutlines(details), width: stroke.rosetteDetail },
    { outline: joinOutlines(leaves), width: stroke.frameRule },
  ];
}
