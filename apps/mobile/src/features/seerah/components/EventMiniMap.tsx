import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { SvgXml } from 'react-native-svg';

import { useTheme } from '@/core/theme';
import { Icon, UiText, arabicTextDirection, useContrastColors } from '@/shared/ui';

import type { SeerahRouteKind } from '../types';

import { RouteLine } from './RouteLine';

const MAP = { ios: 'map', android: 'map' } as const;
const HEIGHT = 168;
const ZOOM = 0.9;

/**
 * The strip of map at the top of an event page (frame SeerahEvent): the level's art, centred on the event's place at a fixed
 * zoom, the place's pin and name, the journey if the event has one, and a gold double rule. The whole strip is one button that
 * shows the place on the map.
 */
export function EventMiniMap({
  art,
  viewbox,
  point,
  placeName,
  route = null,
  onPress,
  testID = 'seerah-event-minimap',
}: {
  art: string;
  viewbox: readonly [number, number, number, number];
  /** The place's position in viewbox units. */
  point: { x: number; y: number };
  placeName: string;
  route?: { d: string; kind: SeerahRouteKind } | null;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const [width, setWidth] = useState(0);
  const contentWidth = (viewbox[2] - viewbox[0]) * ZOOM;
  const contentHeight = (viewbox[3] - viewbox[1]) * ZOOM;
  const left = width / 2 - point.x * ZOOM;
  const top = HEIGHT / 2 - point.y * ZOOM;

  return (
    <Pressable
      accessibilityLabel={t('seerah.event.showOnMap', { place: placeName })}
      accessibilityRole="button"
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      onPress={onPress}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: colors.line,
        borderRadius: theme.radius.hero,
        borderWidth: theme.stroke.hairline,
        height: HEIGHT,
        overflow: 'hidden',
      }}
      testID={testID}
    >
      <View pointerEvents="none" style={{ height: contentHeight, left, position: 'absolute', top, width: contentWidth }} testID={`${testID}-art`}>
        <SvgXml height={contentHeight} width={contentWidth} xml={art} />
        {route === null ? null : (
          <Svg height={contentHeight} style={{ position: 'absolute' }} viewBox={`0 0 ${viewbox[2] - viewbox[0]} ${viewbox[3] - viewbox[1]}`} width={contentWidth}>
            <RouteLine d={route.d} kind={route.kind} scale={ZOOM} />
          </Svg>
        )}
      </View>
      <View pointerEvents="none" style={{ alignItems: 'center', height: 0, justifyContent: 'center', left: width / 2, position: 'absolute', top: HEIGHT / 2, width: 0 }}>
        <View
          style={{ backgroundColor: theme.colors.highlightActive, borderColor: theme.colors.brand, borderRadius: 28, borderWidth: theme.stroke.focus, height: 56, position: 'absolute', width: 56 }}
          testID={`${testID}-halo`}
        />
        <View
          style={{ backgroundColor: theme.colors.brand, borderColor: theme.colors.surfaceRaised, borderRadius: 12, borderWidth: theme.size.selectedRingGap, height: 24, position: 'absolute', width: 24 }}
        />
        <View style={{ position: 'absolute', start: 34, width: 120 }}>
          <UiText numberOfLines={1} style={[arabicTextDirection, { textAlign: 'left', textShadowColor: theme.colors.surfacePage, textShadowOffset: { height: 0, width: 0 }, textShadowRadius: 5 }]} variant="displaySm">
            {placeName}
          </UiText>
        </View>
      </View>
      <View pointerEvents="none" style={{ borderColor: theme.colors.gold, borderRadius: theme.radius.hero - 6, borderWidth: theme.stroke.frame, bottom: 6, left: 6, position: 'absolute', right: 6, top: 6 }} />
      <View pointerEvents="none" style={{ borderColor: theme.colors.gold, borderRadius: theme.radius.hero - 10, borderWidth: theme.stroke.frameInner, bottom: 10, left: 10, position: 'absolute', right: 10, top: 10 }} />
      <View
        pointerEvents="none"
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.glassFill,
          borderRadius: theme.radius.md,
          bottom: theme.space[3] + 2,
          end: theme.space[4] + 2,
          flexDirection: 'row',
          gap: theme.space[1],
          paddingHorizontal: 10,
          paddingVertical: theme.space[1],
          position: 'absolute',
        }}
      >
        <Icon color={theme.colors.brand} name={MAP} size={14} />
        <UiText tone="brand" variant="label" weight={600}>
          {t('seerah.event.onMap')}
        </UiText>
      </View>
    </Pressable>
  );
}
