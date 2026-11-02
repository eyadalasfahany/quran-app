import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/shared/ui';

/** The notice when the pending-notification pool is full and a reminder cannot be turned on (ADR 0031 §7). */
export function ReminderLimitDialog({
  visible,
  onClose,
  testID = 'reminder-limit-dialog',
}: {
  visible: boolean;
  onClose: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      confirmLabel={t('common.done')}
      onCancel={onClose}
      onConfirm={onClose}
      testID={testID}
      title={t('azkar.reminders.limitReached')}
      visible={visible}
    />
  );
}
