import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Divider, UiText } from '@/shared/ui';

/**
 * One block of the details: a muted title, the body, and an optional source caption. Renders nothing without a body,
 * so an empty field never shows as a heading on its own.
 */
export function AzkarDetailsSection({
  title,
  body,
  caption,
  testID = 'azkar-details-section',
}: {
  title: string;
  body: string | null;
  caption?: string | null;
  testID?: string;
}) {
  const theme = useTheme();

  if (body === null || body.trim().length === 0) {
    return null;
  }

  return (
    <View style={{ gap: theme.space[2], paddingVertical: theme.space[3] }} testID={testID}>
      <UiText tone="muted" variant="caption" weight={600}>
        {title}
      </UiText>
      <UiText variant="body">{body}</UiText>
      {caption ? (
        <UiText tone="muted" variant="caption">
          {caption}
        </UiText>
      ) : null}
      <Divider />
    </View>
  );
}
