import { useTranslation } from 'react-i18next';

import { setWifiOnlyDownloads, useAudioSettings } from '@/features/audio/settings';
import { ListRow, ToggleRow, UiText } from '@/shared/ui';

import { SettingsGroup } from './SettingsGroup';

export function ListeningSection({
  reciterName,
  onPressReciter,
  onPressDownloads,
  wifiOnly: controlledWifi,
  onWifiOnlyChange,
  testID = 'listening-section',
}: {
  reciterName?: string;
  onPressReciter?: () => void;
  onPressDownloads?: () => void;
  wifiOnly?: boolean;
  onWifiOnlyChange?: (value: boolean) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const storeWifi = useAudioSettings((s) => s.wifiOnlyDownloads);
  const isWifiOnly = controlledWifi ?? storeWifi;

  const handleWifiToggle = (val: boolean) => {
    if (onWifiOnlyChange) {
      onWifiOnlyChange(val);
    } else {
      setWifiOnlyDownloads(val);
    }
  };

  return (
    <SettingsGroup testID={testID} title={t('settings.sections.listening')}>
      <ListRow
        chevron
        onPress={onPressReciter}
        separator="line"
        testID="listening-reciter-row"
        title={t('settings.listening.defaultReciter')}
        trailing={
          <UiText tone="muted" variant="subhead">
            {reciterName || t('settings.listening.defaultReciterValue')}
          </UiText>
        }
      />
      <ToggleRow
        onValueChange={handleWifiToggle}
        separator="line"
        testID="listening-wifi-toggle"
        title={t('settings.listening.wifiOnly')}
        value={isWifiOnly}
      />
      <ListRow
        chevron={Boolean(onPressDownloads)}
        onPress={onPressDownloads}
        testID="listening-downloads-row"
        title={t('settings.listening.downloads')}
        trailing={
          <UiText tone="muted" variant="subhead">
            {t('settings.listening.downloadsValue')}
          </UiText>
        }
      />
    </SettingsGroup>
  );
}

