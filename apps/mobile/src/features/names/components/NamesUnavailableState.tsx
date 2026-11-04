import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/shared/ui';

const ICON = { ios: 'square.grid.2x2', android: 'grid_view' } as const;

export function NamesUnavailableState({ testID = 'names-unavailable' }: { testID?: string }) {
  const { t } = useTranslation();

  return (
    <EmptyState
      body={t('names.list.unavailableBody')}
      icon={ICON}
      testID={testID}
      title={t('names.list.unavailableTitle')}
    />
  );
}
