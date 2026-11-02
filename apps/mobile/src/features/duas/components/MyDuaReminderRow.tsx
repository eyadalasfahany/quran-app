import { AzkarReminderRow } from '@/features/azkar/components/AzkarReminderRow';

/** Reminder row for one «أدعيتي» entry (`target_type` `my_dua`). */
export function MyDuaReminderRow({
  duaId,
  testID = 'my-dua-reminder-row',
}: {
  duaId: string;
  testID?: string;
}) {
  return <AzkarReminderRow targetKey={duaId} targetType="my_dua" testID={testID} />;
}
