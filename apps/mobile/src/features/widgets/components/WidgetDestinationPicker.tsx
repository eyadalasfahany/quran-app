import { Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme';
import { SegmentedControl, UiText } from '@/shared/ui';

import type { WidgetAddDestination } from '../data/add-prefs';

const OPTIONS: { key: WidgetAddDestination; labelKey: 'destinationHome' | 'destinationLock' }[] = [
  { key: 'home', labelKey: 'destinationHome' },
  { key: 'lock', labelKey: 'destinationLock' },
];

/**
 * Home vs lock destination for the add confirm dialog (ADR 0054). The lock segment is disabled when `lockEnabled` is
 * false.
 */
export function WidgetDestinationPicker({
  value,
  onChange,
  lockEnabled,
  testID = 'widget-destination-picker',
}: {
  value: WidgetAddDestination;
  onChange: (destination: WidgetAddDestination) => void;
  lockEnabled: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <SegmentedControl<WidgetAddDestination>
        label={t('widgetsHelp.addConfirm.destinationA11y')}
        onChange={onChange}
        options={OPTIONS.map(({ key, labelKey }) => ({
          disabled: key === 'lock' && !lockEnabled,
          key,
          label: t(`widgetsHelp.addConfirm.${labelKey}`),
        }))}
        testID={`${testID}-segment`}
        value={lockEnabled ? value : 'home'}
      />
      {Platform.OS === 'android' && lockEnabled && value === 'lock' ? (
        <UiText align="center" testID={`${testID}-lock-hint`} tone="muted" variant="caption">
          {t('widgetsHelp.addConfirm.androidLockGalleryNote')}
        </UiText>
      ) : null}
    </View>
  );
}
