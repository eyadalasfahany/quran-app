import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/shared/ui';

const ICON = { ios: 'square.grid.2x2', android: 'grid_view' } as const;

export function NamesEmptyState({ testID = 'names-empty' }: { testID?: string }) {
  const { t } = useTranslation();

  return (
    <EmptyState body={t('names.list.emptyBody')} icon={ICON} testID={testID} title={t('names.list.emptyTitle')} />
  );
}
