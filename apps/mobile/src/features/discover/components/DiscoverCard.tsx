import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, Card, UiText } from '@/shared/ui';

import { DISCOVER_CARD_ROW_COUNT, type DiscoverProgress, type DiscoverRowState } from '../progress';

import { DiscoverDoneState } from './DiscoverDoneState';
import { DiscoverProgressBar } from './DiscoverProgressBar';
import { DiscoverRow } from './DiscoverRow';

/**
 * The Home card (ADR 0053 §1): the title, the progress, the next rows, «عرض الكل» and «إخفاء». Once every row is done
 * it shows the «أحسنت» state. Presentational: the container wires the store and navigation.
 */
export function DiscoverCard({
  progress,
  onOpenRow,
  onViewAll,
  onHide,
  onFinish,
  testID = 'discover-card',
}: {
  progress: DiscoverProgress;
  onOpenRow: (row: DiscoverRowState) => void;
  onViewAll: () => void;
  onHide: () => void;
  onFinish: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (progress.mode === 'hidden') {
    return null;
  }

  if (progress.mode === 'done') {
    return (
      <Card padding={4} radius="lg" style={{ gap: theme.space[3] }} testID={testID}>
        <DiscoverDoneState done={progress.doneCount} onFinish={onFinish} total={progress.total} />
      </Card>
    );
  }

  const rows = progress.pending.slice(0, DISCOVER_CARD_ROW_COUNT);
  const hasNew = progress.pending.some((row) => row.isNew);

  return (
    <Card padding={4} radius="lg" style={{ gap: theme.space[3] }} testID={testID}>
      <View style={{ gap: theme.space[1] }}>
        <UiText accessibilityRole="header" variant="displaySm">
          {t('discover.title')}
        </UiText>
        {hasNew ? (
          <UiText tone="muted" variant="caption">
            {t('discover.newSubtitle')}
          </UiText>
        ) : null}
      </View>
      <DiscoverProgressBar done={progress.doneCount} total={progress.total} />
      <View>
        {rows.map((row) => (
          <DiscoverRow
            done={row.done}
            isNew={row.isNew}
            key={row.entry.id}
            onPress={() => onOpenRow(row)}
            testID={`discover-card-row-${row.entry.id}`}
            title={t(row.entry.titleKey)}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Button label={t('discover.hide')} onPress={onHide} testID="discover-hide" variant="ghost" size="small" />
        <Button
          accessibilityLabel={t('discover.viewAllLabel')}
          label={t('discover.viewAll')}
          onPress={onViewAll} testID="discover-view-all" variant="ghost" size="small" />
      </View>
    </Card>
  );
}
