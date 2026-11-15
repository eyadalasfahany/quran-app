import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

export type ListSectionVariant = 'stage' | 'age' | 'unspecified';

/**
 * A heading in the list view. `stage` is a life stage with its range («الكهولة · من ٤٠ إلى ٦٣ سنة»), `age` is the small gold
 * «عمره ٦١ سنة» above that year's events, `unspecified` is «غير محدد» with its event count and the note that these events
 * are in book order. Headings are real headings for screen readers.
 */
export function ListSectionHeader({
  variant,
  title,
  detail,
  note,
  testID,
}: {
  variant: ListSectionVariant;
  title: string;
  /** The range of a stage, or the event count of the bucket. */
  detail?: string;
  /** The line under the bucket's heading. */
  note?: string;
  testID?: string;
}) {
  const theme = useTheme();

  if (variant === 'age') {
    return (
      <UiText accessibilityRole="header" tone="goldInk" variant="caption" weight={600} testID={testID}>
        {title}
      </UiText>
    );
  }

  return (
    <View style={{ gap: theme.space[1] }} testID={testID}>
      <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: theme.space[2] }}>
        <UiText accessibilityRole="header" variant="displaySm">
          {title}
        </UiText>
        {detail ? (
          <UiText tone="muted" variant="caption">
            {detail}
          </UiText>
        ) : null}
      </View>
      {note ? (
        <UiText tone="muted" variant="caption">
          {note}
        </UiText>
      ) : null}
    </View>
  );
}
