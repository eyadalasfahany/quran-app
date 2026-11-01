import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { clearLocalUserData } from '@/core/db/user/clear';
import { ConfirmDialog, ListRow, UiText } from '@/shared/ui';

import { SettingsGroup } from './SettingsGroup';

const CLEAR_DATA_ICON = { ios: 'trash', android: 'delete_forever' } as const;

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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const confirmClearData = () => {
    setConfirmOpen(false);
    if (onClearData) {
      onClearData();
    } else {
      clearLocalUserData();
    }
  };

  return (
    <>
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
          onPress={() => setConfirmOpen(true)}
          testID="about-clear-data-row"
          title={t('settings.about.clearData')}
          titleTone="danger"
        />
      </SettingsGroup>
      <ConfirmDialog
        cancelLabel={t('settings.about.cancel')}
        confirmLabel={t('settings.about.clearDataConfirm')}
        destructive
        icon={CLEAR_DATA_ICON}
        message={t('settings.about.clearDataMessage')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmClearData}
        testID="about-clear-data-dialog"
        title={t('settings.about.clearDataTitle')}
        visible={confirmOpen}
      />
    </>
  );
}
