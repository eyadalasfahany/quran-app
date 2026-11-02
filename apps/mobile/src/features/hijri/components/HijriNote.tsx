import { UiText } from '@/shared/ui';

/** The calculated-calendar note under the grid (quran-app-screens.html, #HijriCalendar): a muted caption. */
export function HijriNote({ text, testID = 'hijri-note' }: { text: string; testID?: string }) {
  return (
    <UiText testID={testID} tone="muted" variant="caption">
      {text}
    </UiText>
  );
}
