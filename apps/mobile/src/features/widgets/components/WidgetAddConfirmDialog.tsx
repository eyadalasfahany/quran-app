import { useEffect } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme';
import { ConfirmDialog } from '@/shared/ui';

import type { WidgetAddDestination } from '../data/add-prefs';
import type { WidgetAddCatalogEntry } from '../data/widget-add-catalog';
import { WidgetDestinationPicker } from './WidgetDestinationPicker';
import { WidgetPreviewMock } from './WidgetPreviewMock';

export type WidgetAddConfirmMode = 'add' | 'already';

/**
 * Add-widget preview and confirmation (ADR 0054, frames WidgetAddConfirm*). Android continues to pin; iOS continues to
 * manual steps after confirm (iOS home/lock; Android lock).
 */
export function WidgetAddConfirmDialog({
  visible,
  entry,
  mode,
  destination,
  onDestinationChange,
  onConfirm,
  onCancel,
  testID = 'widget-add-confirm',
}: {
  visible: boolean;
  entry: WidgetAddCatalogEntry;
  mode: WidgetAddConfirmMode;
  destination: WidgetAddDestination;
  onDestinationChange: (destination: WidgetAddDestination) => void;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const lockAllowed = entry.destinations.includes('lock');
  const effectiveDestination = lockAllowed ? destination : 'home';

  useEffect(() => {
    if (!lockAllowed && destination === 'lock') {
      onDestinationChange('home');
    }
  }, [destination, lockAllowed, onDestinationChange]);

  const title =
    mode === 'already'
      ? t('widgetsHelp.addConfirm.alreadyTitle')
      : t('widgetsHelp.addConfirm.title');
  const message =
    mode === 'already'
      ? t('widgetsHelp.addConfirm.alreadyMessage')
      : t('widgetsHelp.addConfirm.message');
  const confirmLabel =
    mode === 'already'
      ? t('widgetsHelp.addConfirm.addAnyway')
      : t('widgetsHelp.addConfirm.continue');
  const cancelLabel =
    mode === 'already' ? t('widgetsHelp.addConfirm.done') : t('widgetsHelp.addConfirm.cancel');

  return (
    <ConfirmDialog
      cancelLabel={cancelLabel}
      confirmLabel={confirmLabel}
      message={message}
      onCancel={onCancel}
      onConfirm={onConfirm}
      testID={testID}
      title={title}
      visible={visible}
    >
      <View style={{ gap: theme.space[4] }}>
        <WidgetPreviewMock testID={`${testID}-preview`} variant={entry.previewVariant} />
        {mode === 'add' && entry.destinations.length > 1 ? (
          <WidgetDestinationPicker
            lockEnabled={lockAllowed}
            onChange={onDestinationChange}
            testID={`${testID}-destination`}
            value={effectiveDestination}
          />
        ) : null}
      </View>
    </ConfirmDialog>
  );
}
