import { UiText } from '@/shared/ui';

/** The calculated-calendar note under the grid (screens/, #HijriCalendar): a muted caption. */
export function HijriNote({ text, testID = 'hijri-note' }: { text: string; testID?: string }) {
  return (
    <UiText testID={testID} tone="muted" variant="caption">
      {text}
    </UiText>
  );
}
