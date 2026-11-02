import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { ConfirmDialog } from '@/shared/ui';

const PERMISSION_ICON = { ios: 'bell.slash', android: 'notifications_off' } as const;

/**
 * The notice when the system has turned notifications off for Taybah. It offers the device's settings, as the daily reminder
 * and the Azkar sheet do. Shared by every reminder in the hub.
 */
export function ReminderPermissionDialog({
  visible,
  onClose,
  testID = 'reminder-permission-dialog',
}: {
  visible: boolean;
  onClose: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      cancelLabel={t('common.cancel')}
      confirmLabel={t('common.openSettings')}
      icon={PERMISSION_ICON}
      message={t('settings.reminders.permissionDeniedBody')}
      onCancel={onClose}
      onConfirm={() => {
        onClose();
        void Linking.openSettings();
      }}
      testID={testID}
      title={t('settings.reminders.permissionDeniedTitle')}
      visible={visible}
    />
  );
}
