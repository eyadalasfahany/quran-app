import {
  Canvas,
  CornerPathEffect,
  Group,
  Path,
  Picture,
  RoundedRect,
  Skia,
  type SkPath,
  type SkPicture,
} from '@shopify/react-native-skia';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { WordBox } from '@/core/mushaf-pack';
import { timing, useTheme } from '@/core/theme';
import { highlightFill, useContrastColors, type HighlightColor } from '@/shared/ui';
import { useScreenReaderEnabled } from '@/shared/useScreenReaderEnabled';

import { PAGE_VIEWBOX, pageHeightFor, scaleFor, toPage, toScreen } from '../mushaf-svg/page-layout';
import { regionAt, type PageRegionGeometry } from '../mushaf-svg/region-geometry';
import type { PageLayout } from '../mushaf-svg/rewrap-layout';
import type { SvgPageModel } from '../mushaf-svg/svg-page-model';
import { pillMove, pillRectFor } from '../mushaf-svg/word-pill-rect';
import { MushafPageSkeleton } from './MushafPageSkeleton';

/**
 * The tallest canvas, in points. One Skia canvas is one GPU texture, and Metal refuses a texture over 8192 px on the
 * simulator (16384 on devices); a page zoomed to 200% outgrew it and aborted the app. Taller pages draw as stacked slices.
 * 2048 pt stays under 8192 px at 3× screens.
 */
export const CANVAS_SLICE_MAX = 2048;

export type MushafSvgPageProps = {
  page: number;
  /** Page width in screen units (pageWidthFor). */
  width: number;
  /** The inflated, parsed page; null draws the skeleton. */
  model: SvgPageModel | null;
  regions: readonly PageRegionGeometry[];
  wordBoxes: readonly WordBox[];
  /** The page's pictures for one colour (PagePictureCache, through the loader). Null until recorded. */
  pictureOf: (color: string) => SkPicture | null;
  /**
   * The zoomed page (rewrap-layout.ts): its layout, whose size replaces the printed 345 × 550, and its picture for one
   * colour. Null draws the printed page at 100%.
   */
  zoomed?: { layout: PageLayout; picture: (color: string) => SkPicture | null } | null;
  highlightByVerseKey?: ReadonlyMap<string, HighlightColor>;
  placeVerseKey?: string | null;
  recitedVerseKey?: string | null;
  /** The ayah the reader has open in a sheet or the side panel (pressedVerseKey). */
  pressedVerseKey?: string | null;
  recitedWord?: number | null;
  khatmaMarkerVerseKey?: string | null;
  ayahLabel: (region: PageRegionGeometry) => string;
  onSelectVerseKey?: (verseKey: string) => void;
  onOpenAyahActions?: (verseKey: string) => void;
  testID?: string;
};

/**
 * One Madinah page drawn in Skia (ADR 0090 decisions 8 and 10). Layers, bottom to top: the reader's colour, the place
 * and audio washes, the recited word's pill, the artwork, and the light word (the pill's clip over a second picture).
 * Taps hit the ayah polygons. With a screen reader on, every ayah is also its own accessible button.
 */
export function MushafSvgPage({
  page,
  width,
  model,
  regions,
  wordBoxes,
  pictureOf,
  zoomed = null,
  highlightByVerseKey,
  placeVerseKey = null,
  recitedVerseKey = null,
  pressedVerseKey = null,
  recitedWord = null,
  khatmaMarkerVerseKey = null,
  ayahLabel,
  onSelectVerseKey,
  onOpenAyahActions,
  testID,
}: MushafSvgPageProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const reduceMotion = useReducedMotion();
  const screenReader = useScreenReaderEnabled();
  // A zoomed page is laid out in its own units (rewrap-layout.ts); at 100% the units are the printed page's.
  const unitsWidth = zoomed === null ? PAGE_VIEWBOX.width : zoomed.layout.unitsWidth;
  const unitsHeight = zoomed === null ? PAGE_VIEWBOX.height : zoomed.layout.unitsHeight;
  const height = pageHeightFor(width, unitsWidth, unitsHeight);
  const scale = scaleFor(width, unitsWidth);
  const corner = theme.radius.sm / scale;
  const slices = Math.max(1, Math.ceil(height / CANVAS_SLICE_MAX));
  const sliceHeight = height / slices;

  const ink = model === null ? null : zoomed === null ? pictureOf(colors.ink) : zoomed.picture(colors.ink);
  const recitedBox = useMemo(
    () =>
      recitedVerseKey === null || recitedWord === null
        ? null
        : (wordBoxes.find((box) => `${box.surah}:${box.ayah}` === recitedVerseKey && box.position === recitedWord) ??
          null),
    [recitedVerseKey, recitedWord, wordBoxes],
  );
  // The light word is only drawn while a pill is; without boxes there is no pill and no light picture.
  const light =
    recitedBox === null
      ? null
      : zoomed === null
        ? pictureOf(colors.onBrandSurface)
        : zoomed.picture(colors.onBrandSurface);

  // The pill's rectangle lives in shared values, so the pill and the light word's clip read the same numbers.
  const pillX = useSharedValue(0);
  const pillY = useSharedValue(0);
  const pillW = useSharedValue(0);
  const pillH = useSharedValue(0);
  const last = useRef<{ page: number; box: WordBox | null }>({ box: null, page });
  useLayoutEffect(() => {
    const previous = last.current;
    last.current = { box: recitedBox, page };
    if (recitedBox === null) {
      return;
    }
    const target = pillRectFor(recitedBox);
    const sameSpot = previous.page === page ? previous.box : null;
    const slide = !reduceMotion && pillMove(sameSpot, recitedBox) === 'slide';
    const move = (value: number) => (slide ? withTiming(value, timing('fast')) : value);
    pillX.value = move(target.x);
    pillY.value = move(target.y);
    pillW.value = move(target.w);
    pillH.value = move(target.h);
  }, [page, recitedBox, reduceMotion, pillX, pillY, pillW, pillH]);
  const pillClip = useDerivedValue(() => Skia.XYWHRect(pillX.value, pillY.value, pillW.value, pillH.value));

  // The page's paths for the washes, one per ayah polygon, built once per page from the parsed points: they carry the
  // origin shift of pages 1–2, and Skia cannot read those pages' point-list polygons (it throws).
  const shapes = useMemo(
    () =>
      regions.flatMap((region) => {
        if (region.subpaths.length === 0) {
          return [];
        }
        const builder = Skia.PathBuilder.Make();
        for (const points of region.subpaths) {
          builder.addPoly(points.map(([x, y]) => ({ x, y })), true);
        }
        return [{ path: builder.build() as SkPath, region }];
      }),
    [regions],
  );

  // The reader's colour (or the saved green) wins; without it, the khatma marker (not on the recited ayah) and then
  // the place and audio washes, which sit above it.
  const ownColour = (verseKey: string) => highlightFill(colors, highlightByVerseKey?.get(verseKey) ?? null);
  const baseFill = (verseKey: string) =>
    ownColour(verseKey) ??
    (khatmaMarkerVerseKey === verseKey && recitedVerseKey !== verseKey ? colors.highlightGold : undefined);
  const washFill = (verseKey: string) =>
    ownColour(verseKey) === undefined &&
    (verseKey === recitedVerseKey || verseKey === placeVerseKey || verseKey === pressedVerseKey)
      ? colors.highlightActive
      : undefined;

  // Only a row that showed the skeleton fades in; a row mounted with its page ready draws at once (no blank during a fling).
  const appear = useSharedValue(reduceMotion || model !== null ? 1 : 0);
  useLayoutEffect(() => {
    if (!reduceMotion && model !== null) {
      appear.value = withTiming(1, timing('fast'));
    }
  }, [appear, model, reduceMotion]);
  const appearStyle = useAnimatedStyle(() => ({ opacity: appear.value }));

  const pressAt = (event: GestureResponderEvent) => {
    const point = toPage({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }, width, unitsWidth);
    return regionAt(regions, point.x, point.y);
  };

  if (model === null || ink === null) {
    return (
      <View style={{ height, width }} testID={testID}>
        <MushafPageSkeleton testID={testID ? `${testID}-skeleton` : undefined} />
      </View>
    );
  }

  return (
    <Animated.View style={[{ height, width }, appearStyle]} testID={testID}>
      <Pressable
        accessible={false}
        onLongPress={(event) => {
          const hit = pressAt(event);
          if (hit !== null) {
            onOpenAyahActions?.(hit.verseKey);
          }
        }}
        onPress={(event) => {
          const hit = pressAt(event);
          if (hit !== null) {
            onSelectVerseKey?.(hit.verseKey);
          }
        }}
        style={{ height, width }}
        testID={testID ? `${testID}-press` : undefined}
      >
        {/* No touches on the slices: the press location stays relative to the whole page. */}
        <View pointerEvents="none" style={{ height, width }}>
          {Array.from({ length: slices }, (_, slice) => (
            <Canvas
              accessible={false}
              importantForAccessibility="no"
              key={slice}
              style={{ height: sliceHeight, width }}
              testID={testID ? `${testID}-slice-${slice}` : undefined}
            >
              <Group transform={[{ translateY: -slice * sliceHeight }, { scale }]}>
                {shapes.map(({ region, path }) => {
                  const fill = baseFill(region.verseKey);
                  return fill === undefined ? null : (
                    <Path color={fill} key={`base-${region.verseKey}`} path={path}>
                      <CornerPathEffect r={corner} />
                    </Path>
                  );
                })}
                {shapes.map(({ region, path }) => {
                  const fill = washFill(region.verseKey);
                  return fill === undefined ? null : (
                    <Path color={fill} key={`wash-${region.verseKey}`} path={path}>
                      <CornerPathEffect r={corner} />
                    </Path>
                  );
                })}
                {recitedBox === null ? null : (
                  <RoundedRect
                    color={colors.brandSurface}
                    height={pillH}
                    r={corner}
                    width={pillW}
                    x={pillX}
                    y={pillY}
                  />
                )}
                <Picture picture={ink} />
                {recitedBox !== null && light !== null ? (
                  <Group clip={pillClip}>
                    <Picture picture={light} />
                  </Group>
                ) : null}
              </Group>
            </Canvas>
          ))}
        </View>
        {screenReader
          ? regions.map((region) => {
              const isRecited = region.verseKey === recitedVerseKey;
              const isPressed = region.verseKey === pressedVerseKey;
              const colour = highlightByVerseKey?.get(region.verseKey);
              const label =
                colour === undefined ? ayahLabel(region) : `${ayahLabel(region)} ${t(`ui.highlight.${colour}`)}`;
              const box = toScreen(region.bounds, width, unitsWidth);
              return (
                <Pressable
                  accessibilityHint={isRecited ? t('player.nowPlaying') : undefined}
                  accessibilityLabel={label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isRecited || isPressed }}
                  key={`ayah-${region.verseKey}`}
                  onLongPress={() => onOpenAyahActions?.(region.verseKey)}
                  onPress={() => onSelectVerseKey?.(region.verseKey)}
                  style={{
                    height: box.y1 - box.y0,
                    left: box.x0,
                    position: 'absolute',
                    top: box.y0,
                    width: box.x1 - box.x0,
                  }}
                  testID={testID ? `${testID}-ayah-${region.verseKey}` : undefined}
                />
              );
            })
          : null}
      </Pressable>
    </Animated.View>
  );
}
