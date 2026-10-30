import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { clearLocalUserData } from '@/core/db/user/clear';
import { ListRow, UiText } from '@/shared/ui';

import { SettingsGroup } from './SettingsGroup';

export function AboutSection({
  onPressSources,
  onClearData,
  testID = 'about-section',
}: {
  onPressSources?: () => void;
  onClearData?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  const handleClearData = () => {
    Alert.alert(
      t('settings.about.clearDataTitle'),
      t('settings.about.clearDataMessage'),
      [
        { text: t('settings.about.cancel'), style: 'cancel' },
        {
          text: t('settings.about.clearDataConfirm'),
          style: 'destructive',
          onPress: () => {
            if (onClearData) {
              onClearData();
            } else {
              clearLocalUserData();
            }
          },
        },
      ],
    );
  };

  return (
    <SettingsGroup testID={testID} title={t('settings.sections.about')}>
      <ListRow
        onPress={onPressSources}
        separator="line"
        testID="about-sources-row"
        title={t('settings.about.sources')}
        trailing={
          <UiText tone="muted" variant="caption">
            {t('settings.about.sourcesValue')}
          </UiText>
        }
      />
      <ListRow
        chevron={false}
        onPress={handleClearData}
        testID="about-clear-data-row"
        title={t('settings.about.clearData')}
        titleTone="danger"
      />
    </SettingsGroup>
  );
}
