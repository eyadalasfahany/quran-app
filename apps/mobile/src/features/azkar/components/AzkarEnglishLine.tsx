import { UiText } from '@/shared/ui';

/** OpenDua's English under a dhikr, shown in the English interface only. Hidden when there is no English. */
export function AzkarEnglishLine({ text, testID = 'azkar-english-line' }: { text: string | null; testID?: string }) {
  if (text === null || text.trim().length === 0) {
    return null;
  }

  return (
    <UiText align="center" testID={testID} tone="muted" variant="body">
      {text}
    </UiText>
  );
}
