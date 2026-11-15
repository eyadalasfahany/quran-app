import { ListRow } from '@/shared/ui';

/**
 * One event in a list: the book's heading and a muted line («المدينة» or «مكة · العمر غير محدد»). The whole row is a
 * button with a chevron at the end; it reads «heading, detail». The shared ListRow already measures 52 pt and up.
 */
export function EventListRow({
  title,
  subtitle,
  onPress,
  separator = false,
  testID,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  /** A hairline under the row; the last row of a card has none. */
  separator?: boolean;
  testID?: string;
}) {
  return <ListRow onPress={onPress} separator={separator ? 'line' : undefined} subtitle={subtitle} testID={testID} title={title} titleVariant="body" />;
}
