import { useTranslation } from 'react-i18next';

import { ToggleRow } from '@/shared/ui';

import { type ReminderStatus, reminderStatusKey } from '../data/hub-status';

/**
 * One reminder in the reminders hub (the hub frame): a switch, and under the title a subtitle that reads the detail (a time
 * or a prayer offset, when there is one) and the status. A row with `onPress` also opens the reminder's own sheet; the
 * switch turns it on or off without opening anything.
 */
export function ReminderRow({
  title,
  detail,
  status,
  value,
  onValueChange,
  onPress,
  testID,
}: {
  title: string;
  /** The time or the prayer offset, when the reminder has one. */
  detail?: string;
  status: ReminderStatus;
  value: boolean;
  onValueChange: (on: boolean) => void;
  onPress?: () => void;
  testID: string;
}) {
  const { t } = useTranslation();
  const subtitle = [detail, t(reminderStatusKey(status))].filter((part): part is string => Boolean(part)).join(' · ');

  return (
    <ToggleRow
      onPress={onPress}
      onValueChange={onValueChange}
      subtitle={subtitle}
      testID={testID}
      title={title}
      value={value}
    />
  );
}
