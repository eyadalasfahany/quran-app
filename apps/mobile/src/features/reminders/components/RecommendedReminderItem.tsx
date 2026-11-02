import { ListRow } from '@/shared/ui';

/** One item of the recommended set, as a plain row: it describes what the set turns on and has no switch of its own. */
export function RecommendedReminderItem({ label, testID }: { label: string; testID: string }) {
  return <ListRow chevron={false} separator="line" testID={testID} title={label} />;
}
