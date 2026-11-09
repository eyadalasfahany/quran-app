import { useTranslation } from 'react-i18next';

import { FloatingNotice } from './FloatingNotice';
import { type IconName } from './Icon';

const OFFLINE_ICON = { ios: 'wifi.slash', android: 'wifi_off' } as const satisfies IconName;

/**
 * The app-wide offline notice (ADR 0085): the floating glass card of its frame (screens/, Offline). It has no button and
 * hides itself when the device is back online. It never takes a press and never pushes the screens down.
 */
export function OfflineBanner({ visible, testID = 'offline-banner' }: { visible: boolean; testID?: string }) {
  const { t } = useTranslation();

  return <FloatingNotice icon={OFFLINE_ICON} testID={testID} title={t('network.offlineBanner')} visible={visible} />;
}
