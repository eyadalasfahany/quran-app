import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/**
 * A source line under a Duas list (screens/, #DuasHomeCategories): the sources in muted caption type, on the frame's
 * 19 pt line pitch.
 */
export function DuasSourceCredit({ text, testID = 'duas-source-credit' }: { text: string; testID?: string }) {
  const theme = useTheme();

  return (
    <UiText
      accessibilityRole="text"
      style={{ lineHeight: theme.size.homeTileLabelLineHeight, paddingHorizontal: theme.space[1] }}
      testID={testID}
      tone="muted"
      variant="caption"
    >
      {text}
    </UiText>
  );
}
