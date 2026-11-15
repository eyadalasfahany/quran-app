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

import { pageHeightFor, scaleFor, toPage, toScreen } from '../mushaf-svg/page-layout';
import { regionAt, type PageRegionGeometry } from '../mushaf-svg/region-geometry';
import type { SvgPageModel } from '../mushaf-svg/svg-page-model';
import { pillMove, pillRectFor } from '../mushaf-svg/word-pill-rect';
import { MushafPageSkeleton } from './MushafPageSkeleton';

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
  highlightByVerseKey?: ReadonlyMap<string, HighlightColor>;
  placeVerseKey?: string | null;
  recitedVerseKey?: string | null;
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
  highlightByVerseKey,
  placeVerseKey = null,
  recitedVerseKey = null,
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
  const height = pageHeightFor(width);
  const scale = scaleFor(width);
  const corner = theme.radius.sm / scale;

  const ink = model === null ? null : pictureOf(colors.ink);
  const recitedBox = useMemo(
    () =>
      recitedVerseKey === null || recitedWord === null
        ? null
        : (wordBoxes.find((box) => `${box.surah}:${box.ayah}` === recitedVerseKey && box.position === recitedWord) ??
          null),
    [recitedVerseKey, recitedWord, wordBoxes],
  );
  // The light word is only drawn while a pill is; without boxes there is no pill and no light picture.
  const light = recitedBox === null ? null : pictureOf(colors.onBrandSurface);

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
    ownColour(verseKey) ?? (khatmaMarkerVerseKey === verseKey && recitedVerseKey !== verseKey ? colors.highlightGold : undefined);
  const washFill = (verseKey: string) =>
    ownColour(verseKey) === undefined && (verseKey === recitedVerseKey || verseKey === placeVerseKey)
      ? colors.highlightActive
      : undefined;

  const appear = useSharedValue(reduceMotion ? 1 : 0);
  useLayoutEffect(() => {
    if (!reduceMotion && model !== null) {
      appear.value = withTiming(1, timing('fast'));
    }
  }, [appear, model, reduceMotion]);
  const appearStyle = useAnimatedStyle(() => ({ opacity: appear.value }));

  const pressAt = (event: GestureResponderEvent) => {
    const point = toPage({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }, width);
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
        <Canvas accessible={false} importantForAccessibility="no" style={{ height, width }}>
          <Group transform={[{ scale }]}>
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
              <RoundedRect color={colors.brandSurface} height={pillH} r={corner} width={pillW} x={pillX} y={pillY} />
            )}
            <Picture picture={ink} />
            {recitedBox !== null && light !== null ? (
              <Group clip={pillClip}>
                <Picture picture={light} />
              </Group>
            ) : null}
          </Group>
        </Canvas>
        {screenReader
          ? regions.map((region) => {
              const isRecited = region.verseKey === recitedVerseKey;
              const colour = highlightByVerseKey?.get(region.verseKey);
              const label = colour === undefined ? ayahLabel(region) : `${ayahLabel(region)} ${t(`ui.highlight.${colour}`)}`;
              const box = toScreen(region.bounds, width);
              return (
                <Pressable
                  accessibilityHint={isRecited ? t('player.nowPlaying') : undefined}
                  accessibilityLabel={label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isRecited }}
                  key={`ayah-${region.verseKey}`}
                  onLongPress={() => onOpenAyahActions?.(region.verseKey)}
                  onPress={() => onSelectVerseKey?.(region.verseKey)}
                  style={{ height: box.y1 - box.y0, left: box.x0, position: 'absolute', top: box.y0, width: box.x1 - box.x0 }}
                  testID={testID ? `${testID}-ayah-${region.verseKey}` : undefined}
                />
              );
            })
          : null}
      </Pressable>
    </Animated.View>
  );
}
