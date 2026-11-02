import { ListRow } from '@/shared/ui';

/** One catalog row: widget name and what it displays (no chevron). */
export function WidgetsHelpWidgetRow({
  title,
  subtitle,
  testID,
}: {
  title: string;
  subtitle: string;
  testID?: string;
}) {
  return <ListRow chevron={false} separator="line" subtitle={subtitle} testID={testID} title={title} />;
}
