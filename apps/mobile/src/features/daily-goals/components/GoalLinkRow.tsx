import { ListRow } from '@/shared/ui';

/**
 * A goal row that opens another screen rather than switching a goal: «ابدأ ختمة», «فتح المسبحة», «إشعارات الصلاة».
 * It is a list row with a chevron, so it reads as a link.
 */
export function GoalLinkRow({
  title,
  subtitle,
  onPress,
  testID,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  testID?: string;
}) {
  return <ListRow onPress={onPress} subtitle={subtitle} testID={testID} title={title} />;
}
