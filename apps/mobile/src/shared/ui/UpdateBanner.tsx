import { useTranslation } from 'react-i18next';

import { FloatingNotice } from './FloatingNotice';
import { type IconName } from './Icon';

const UPDATE_ICON = { ios: 'arrow.down.circle', android: 'system_update' } as const satisfies IconName;

/**
 * The OTA update notice (core/updates): a floating glass card under the status bar (ADR 0085). «تحديث» reloads the app
 * and is its only control; the card has no dismiss. It never pushes the screens down.
 */
export function UpdateBanner({
  visible,
  onUpdate,
  testID = 'update-banner',
}: {
  visible: boolean;
  onUpdate: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <FloatingNotice
      action={{ label: t('updates.banner.update'), onPress: onUpdate, accessibilityHint: t('updates.banner.hint') }}
      icon={UPDATE_ICON}
      subtitle={t('updates.banner.subtitle')}
      testID={testID}
      title={t('updates.banner.message')}
      visible={visible}
    />
  );
}
