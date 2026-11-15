import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { GlassSurface, UiText } from '@/shared/ui';

/**
 * The chip that floats over the handle while an age is dragged: the age in large digits and its life stage under it
 * (frame SeerahTimeline). It is a visual echo; the timeline's adjustable value carries the same text for screen readers.
 */
export function YearChip({ age, stageName, testID }: { age: number; stageName: string | null; testID?: string }) {
  const theme = useTheme();
  const locale = useLocale();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      testID={testID}
    >
      <GlassSurface
        colorScheme={theme.name === 'dark' ? 'dark' : 'light'} radius="lg" style={{ alignItems: 'center', minWidth: 72, paddingHorizontal: theme.space[3], paddingVertical: theme.space[2] }}>
        <UiText scale="bar" style={{ color: theme.colors.brand }} variant="title" weight={700}>
          {formatNumber(age, locale)}
        </UiText>
        {stageName === null ? null : (
          <UiText scale="bar" tone="muted" variant="label" weight={400}>
            {stageName}
          </UiText>
        )}
      </GlassSurface>
    </View>
  );
}
