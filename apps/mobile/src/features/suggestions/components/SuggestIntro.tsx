import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/** The sentence under the sheet's title (screens/, #SuggestSheet): 15 pt on 22, muted. */
export function SuggestIntro({ text, testID = 'suggest-intro' }: { text: string; testID?: string }) {
  const theme = useTheme();

  return (
    <UiText style={{ marginHorizontal: theme.space[1] }} testID={testID} tone="muted" variant="subhead">
      {text}
    </UiText>
  );
}
