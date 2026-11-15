import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, arabicTextDirection } from '@/shared/ui';

export type MapLabelEmphasis = 'event' | 'place' | 'city' | 'landmark';

/** The gap from a pin's centre to its label's near edge, per kind (frames SeerahMapRegion, SeerahMapMakkah). */
export const LABEL_OFFSET: Record<MapLabelEmphasis, number> = { city: 24, event: 14, landmark: 10, place: 20 };

/**
 * A place name or an event title beside its pin, with a soft halo in the page colour so it reads over the art. It is
 * never a touch target and is hidden from screen readers: the pin carries the label. Arabic text stays right to left
 * in the English UI. `side` is the screen side of the pin (the map is not mirrored). Frames: an event title or a place is
 * 13 at weight 600 with its age line at 12; a city is Amiri 20 bold; a landmark with no events is 12, muted.
 */
const TITLE = {
  city: null,
  event: { fontSize: 13, lineHeight: 17 },
  landmark: { fontSize: 12, lineHeight: 17 },
  place: { fontSize: 13, lineHeight: 17 },
} as const;

export function MapLabel({
  title,
  subtitle,
  side = 'end',
  emphasis = 'event',
  dimmed = false,
  testID,
}: {
  title: string;
  subtitle?: string | null;
  side?: 'start' | 'end';
  emphasis?: MapLabelEmphasis;
  dimmed?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const halo = {
    textShadowColor: theme.colors.surfacePage,
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 5,
  } as const;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{
        alignItems: side === 'end' ? 'flex-start' : 'flex-end',
        opacity: dimmed ? theme.opacity.disabled : 1,
      }}
      testID={testID}
    >
      <UiText
        numberOfLines={2}
        scale="bar"
        style={[arabicTextDirection, halo, { textAlign: side === 'end' ? 'left' : 'right' }, TITLE[emphasis]]}
        tone={emphasis === 'landmark' ? 'muted' : 'ink'}
        variant={emphasis === 'city' ? 'displaySm' : 'caption'}
        weight={emphasis === 'city' ? 700 : emphasis === 'landmark' ? 500 : 600}
      >
        {title}
      </UiText>
      {subtitle ? (
        <UiText
          numberOfLines={1}
          scale="bar"
          style={[halo, { lineHeight: 15, textAlign: side === 'end' ? 'left' : 'right' }]}
          tone="muted"
          variant="label"
          weight={500}
        >
          {subtitle}
        </UiText>
      ) : null}
    </View>
  );
}
