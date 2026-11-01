import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { ConfirmDialog } from '@/shared/ui';

const PERMISSION_ICON = { ios: 'bell.slash', android: 'notifications_off' } as const;

/**
 * The refusal notice for a prayer bell: the same copy and Settings link as the daily reminder (ADR 0030 §3). It is the
 * shared ConfirmDialog, so it follows the app theme and reading direction, unlike the system alert it replaces (ADR 0034).
 */
export function PrayerPermissionDialog({
  visible,
  onClose,
  testID = 'prayer-permission-dialog',
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
