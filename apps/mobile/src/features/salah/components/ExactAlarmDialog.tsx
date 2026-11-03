import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/shared/ui';

const EXACT_ALARM_ICON = { ios: 'bell.badge', android: 'alarm' } as const;

/**
 * Asks for exact-alarm access on Android 14+, so a prayer notification arrives on its minute instead of late. It is
 * shown after a bell turns on and the system has denied exact alarms. The bell stays on either way; the dialog only
 * offers the Settings screen. Shared ConfirmDialog, so it follows the app theme and reading direction (ADR 0034).
 */
export function ExactAlarmDialog({
  visible,
  onClose,
  onConfirm,
  testID = 'exact-alarm-dialog',
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      cancelLabel={t('common.cancel')}
      confirmLabel={t('common.openSettings')}
      icon={EXACT_ALARM_ICON}
      message={t('salah.exactAlarm.body')}
      onCancel={onClose}
      onConfirm={onConfirm}
      testID={testID}
      title={t('salah.exactAlarm.title')}
      visible={visible}
    />
  );
}
