import { UiText } from '@/shared/ui';

// The muted line search shows before typing and when nothing matches.
export function SearchMessage({ message, testID }: { message: string; testID?: string }) {
  return (
    <UiText testID={testID} tone="muted" variant="body">
      {message}
    </UiText>
  );
}
