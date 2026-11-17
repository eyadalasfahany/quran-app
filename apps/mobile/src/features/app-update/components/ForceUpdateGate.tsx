import * as Updates from 'expo-updates';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

import { useForceUpdate } from '../use-force-update';

const ICON = { ios: 'arrow.down.app', android: 'system_update' } as const;

/**
 * The blocking update pop-up (ADR 0060, 0094). It shows the one-button notice from ConfirmDialog while this install is
 * below the API's minimum version (the action opens the store), or while an OTA update has downloaded (the action
 * restarts the app into it). It has no cancel: the scrim and Android back do nothing, so the only way forward is the update.
 */
export function ForceUpdateGate() {
  const { t } = useTranslation();
  const update = useForceUpdate();
  const ota = update?.kind === 'ota';

  return (
    <ConfirmDialog
      confirmLabel={t(ota ? 'forceUpdate.ota.action' : 'forceUpdate.action')}
      icon={ICON}
      message={t(ota ? 'forceUpdate.ota.message' : 'forceUpdate.message')}
      onCancel={() => undefined} // The update is required: the scrim and Android back do nothing.
      onConfirm={() => {
        if (update === null) {
          return;
        }
        if (update.kind === 'ota') {
          Updates.reloadAsync().catch(() => undefined);
          return;
        }
        void Linking.openURL(update.storeUrl).catch(() => undefined);
      }}
      testID="force-update-dialog"
      title={t(ota ? 'forceUpdate.ota.title' : 'forceUpdate.title')}
      visible={update !== null}
    />
  );
}
