import { UiText } from '@/shared/ui';

/** The one-line hint on an empty search query, the same caption on every scope (screens/frames/azkar/AzkarSearchEmpty). */
export function SearchIdleHint({ text, testID }: { text: string; testID?: string }) {
  return (
    <UiText testID={testID} tone="muted" variant="caption">
      {text}
    </UiText>
  );
}
