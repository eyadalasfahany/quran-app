import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

import { useForceUpdate } from '../use-force-update';

const ICON = { ios: 'arrow.down.app', android: 'system_update' } as const;

/**
 * The blocking update pop-up (ADR 0060). It shows the one-button notice from ConfirmDialog while this install is below
 * the API's minimum version. It has no cancel: the scrim and Android back do nothing, so the only way forward is the store.
 */
export function ForceUpdateGate() {
  const { t } = useTranslation();
  const storeUrl = useForceUpdate();

  return (
    <ConfirmDialog
      confirmLabel={t('forceUpdate.action')}
      icon={ICON}
      message={t('forceUpdate.message')}
      onCancel={() => undefined} // The update is required: the scrim and Android back do nothing.
      onConfirm={() => {
        if (storeUrl) {
          void Linking.openURL(storeUrl).catch(() => undefined);
        }
      }}
      testID="force-update-dialog"
      title={t('forceUpdate.title')}
      visible={storeUrl !== null}
    />
  );
}
