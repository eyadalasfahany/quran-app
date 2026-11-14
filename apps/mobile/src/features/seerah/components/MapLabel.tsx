import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, arabicTextDirection } from '@/shared/ui';

export type MapLabelEmphasis = 'place' | 'city';

/**
 * A place name or an event title beside its pin, with a soft halo in the page colour so it reads over the art. It is
 * never a touch target and is hidden from screen readers: the pin carries the label. Arabic text stays right to left
 * in the English UI. `side` is the screen side of the pin (the map is not mirrored).
 */
export function MapLabel({
  title,
  subtitle,
  side = 'end',
  emphasis = 'place',
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
        style={[arabicTextDirection, halo, { textAlign: side === 'end' ? 'left' : 'right' }, emphasis === 'city' ? { fontSize: 20, lineHeight: 26 } : { fontSize: 17, lineHeight: 22 }]}
        variant="displaySm"
      >
        {title}
      </UiText>
      {subtitle ? (
        <UiText numberOfLines={1} scale="bar" style={[halo, { textAlign: side === 'end' ? 'left' : 'right' }]} tone="muted" variant="label" weight={400}>
          {subtitle}
        </UiText>
      ) : null}
    </View>
  );
}
