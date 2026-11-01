import { memo, type ReactNode } from 'react';
import { View, type ImageSourcePropType } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { ScenePhoto } from './ScenePhoto';

// The frames veil each scene photo with a top-heavier wash of the raised surface, lighter on the
// active row and the last one (quran-app-screens.html, #Salah and #SalahDark). RN has no gradients,
// so each row stacks a full veil (the frames' bottom alpha) and a top-half veil that brings the
// top to the frames' alpha. The hex suffixes are those alphas.
const SCRIM = {
  light: { base: '8F', top: '69', lastBase: '8A', lastTop: '64', activeBase: '75', activeTop: '4D', activeTint: '0D' },
  dark: { base: '70', top: '4A', lastBase: '66', lastTop: '45', activeBase: '5C', activeTop: '40', activeTint: '12' },
} as const;

/**
 * One line of the times card: the prayer's name and time over its scene photo, with the
 * reminder bell at the end. الشروق passes no `bell` and keeps an empty 44 pt slot, and the
 * active prayer draws the 3 pt brand bar on its start edge.
 */
function PrayerTimeRowView({
  name,
  time,
  scene,
  focusY,
  active = false,
  muted = false,
  bell,
  last = false,
  testID,
}: {
  name: string;
  /** Formatted time («٥:١٠»). */
  time: string;
  scene: ImageSourcePropType;
  focusY: number;
  /** The prayer the hero counts down to: brand text and the start-edge bar. */
  active?: boolean;
  /** الشروق's name sits in muted ink — a marker, not a صلاة. */
  muted?: boolean;
  /** The reminder control (PrayerBell); الشروق passes nothing and keeps an empty 44 pt slot. */
  bell?: ReactNode;
  /** The card's last row draws no separator. */
  last?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const scrim = theme.name === 'dark' ? SCRIM.dark : SCRIM.light;
  const base = active ? scrim.activeBase : last ? scrim.lastBase : scrim.base;
  const top = active ? scrim.activeTop : last ? scrim.lastTop : scrim.top;
  const nameColor = active ? 'brand' : muted ? 'muted' : 'ink';

  return (
    <View
      style={{
        alignItems: 'center',
        borderBottomColor: theme.colors.line,
        borderBottomWidth: last ? 0 : theme.stroke.hairline,
        flexDirection: 'row',
        justifyContent: 'space-between',
        // The frames' row pitch (quran-app-screens.html, #Salah: min-height 56, padding 4 16 4 8).
        minHeight: 56,
        overflow: 'hidden',
        paddingEnd: theme.space[2],
        paddingStart: theme.space[4],
        paddingVertical: theme.space[1],
      }}
      testID={testID}
    >
      <ScenePhoto focusY={focusY} source={scene} testID={testID ? `${testID}-photo` : undefined} />
      <View
        pointerEvents="none"
        style={{ backgroundColor: `${theme.colors.surfaceRaised}${base}`, bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
        testID={testID ? `${testID}-scrim` : undefined}
      />
      <View pointerEvents="none" style={{ backgroundColor: `${theme.colors.surfaceRaised}${top}`, height: '50%', left: 0, position: 'absolute', right: 0, top: 0 }} />
      {active ? (
        <View
          pointerEvents="none"
          style={{ backgroundColor: `${theme.colors.brand}${scrim.activeTint}`, bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
          testID={testID ? `${testID}-active-tint` : undefined}
        />
      ) : null}
      {active ? (
        <View
          style={{ backgroundColor: theme.colors.brand, bottom: 0, position: 'absolute', start: 0, top: 0, width: 3 }}
          testID={testID ? `${testID}-active-bar` : undefined}
        />
      ) : null}
      <UiText tone={nameColor} variant="body" weight={active ? 600 : 400}>
        {name}
      </UiText>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[1] }}>
        <UiText tone={nameColor} variant="headline" weight={active ? 700 : 600}>
          {time}
        </UiText>
        {bell ?? (
          <View style={{ height: theme.size.touchTarget, width: theme.size.touchTarget }} testID={testID ? `${testID}-bell-slot` : undefined} />
        )}
      </View>
    </View>
  );
}

/**
 * Memoised: the times card re-renders when the prayer state changes, and a row whose name, time, bell and active state
 * did not change keeps its photo and its scrim.
 */
export const PrayerTimeRow = memo(PrayerTimeRowView);
