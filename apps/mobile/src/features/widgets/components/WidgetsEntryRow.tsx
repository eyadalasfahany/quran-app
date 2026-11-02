import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ListRow } from '@/shared/ui';

/** Settings row that opens the widgets and watch help screen (`/settings/widgets`, ADR 0035 decision 7). */
export function WidgetsEntryRow({ testID = 'widgets-entry' }: { testID?: string }) {
  const { t } = useTranslation();

  return (
    <ListRow
      chevron
      onPress={() => router.push('/settings/widgets' as Href)}
      subtitle={t('widgetsHelp.entryHint')}
      testID={testID}
      title={t('widgetsHelp.entryTitle')}
    />
  );
}
