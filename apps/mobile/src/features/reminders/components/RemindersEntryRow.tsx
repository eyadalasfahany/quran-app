import { router, type Href } from 'expo-router';

import { ListRow } from '@/shared/ui';

/** The link to the reminders hub (`/reminders`), from Settings, the Menu and the daily goals sheet (ADR 0034). */
export function RemindersEntryRow({
  title,
  subtitle,
  testID = 'reminders-entry',
}: {
  title: string;
  subtitle: string;
  testID?: string;
}) {
  return <ListRow onPress={() => router.push('/reminders' as Href)} subtitle={subtitle} testID={testID} title={title} />;
}
