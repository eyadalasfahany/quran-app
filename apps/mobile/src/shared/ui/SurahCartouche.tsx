import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type HostInstance, type LayoutChangeEvent } from 'react-native';
import Svg from 'react-native-svg';

import { useTheme } from '@/core/theme';

import { DrawnPath } from './DrawnPath';
import { circle, eightPointStar, polygon, type Outline } from './svg-path';
import { UiText } from './UiText';
import { useDrawOnView } from './useDrawOnView';

// The pointed double frame from the design's 300 × 52 cartouche; it stretches to the band's size.
const HEIGHT = 52;
const OUTER = { inset: 4, point: 16 } as const;
const INNER = { inset: 9, point: 12, side: 16 } as const;
// An eight-pointed star (۞) inside each pointed end, kept round at any width.
const STAR = { x: 44, radius: 10, core: 3.5 } as const;

type Stroke = { outline: Outline; width: number };

// The gold cartouche that opens each surah. Its outline draws in the first time it scrolls into view.
export function SurahCartouche({ name, testID }: { name: string; testID?: string }) {
  const theme = useTheme();
  const ref = useRef<HostInstance>(null);
  const [size, setSize] = useState({ height: 0, width: 0 });
  const progress = useDrawOnView(ref, name);
  const strokes = useMemo(
    () => (size.width > 0 ? cartoucheStrokes(size.width, size.height, theme.stroke) : []),
    [size, theme.stroke],
  );

  const onLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    setSize((current) =>
      current.width === layout.width && current.height === layout.height
        ? current
        : { height: layout.height, width: layout.width },
    );
  };

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
        minHeight: HEIGHT,
        paddingHorizontal: STAR.x + STAR.radius + theme.space[3],
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
          {strokes.map((stroke, index) => (
            <DrawnPath
              key={index}
              outline={stroke.outline}
              progress={progress}
              stroke={theme.colors.gold}
              strokeWidth={stroke.width}
              testID={testID ? `${testID}-stroke-${index}` : undefined}
            />
          ))}
        </Svg>
      ) : null}
      <UiText align="center" style={{ writingDirection: 'rtl' }} variant="displaySm">
        {name}
      </UiText>
    </View>
  );
}

function cartoucheStrokes(width: number, height: number, stroke: { hairline: number; frameInner: number }): Stroke[] {
  const middle = height / 2;
  const frame = (inset: number, point: number, side: number) =>
    polygon([
      [side + point, inset],
      [width - side - point, inset],
      [width - side, middle],
      [width - side - point, height - inset],
      [side + point, height - inset],
      [side, middle],
    ]);
  const stars = [STAR.x, width - STAR.x].flatMap((x) => [
    ...eightPointStar(x, middle, STAR.radius),
    circle(x, middle, STAR.core),
  ]);

  return [
    { outline: frame(OUTER.inset, OUTER.point, OUTER.inset), width: stroke.hairline },
    { outline: frame(INNER.inset, INNER.point, INNER.side), width: stroke.frameInner },
    ...stars.map((outline) => ({ outline, width: stroke.frameInner })),
  ];
}
