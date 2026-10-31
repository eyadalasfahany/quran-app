import { UiText } from '@/shared/ui';

/** A section label on Azkar screens («أذكار اليوم», «المواضيع»): a header in the muted headline style. */
export function AzkarSectionTitle({ title, testID = 'azkar-section-title' }: { title: string; testID?: string }) {
  return (
    <UiText accessibilityRole="header" testID={testID} tone="muted" variant="headline">
      {title}
    </UiText>
  );
}
