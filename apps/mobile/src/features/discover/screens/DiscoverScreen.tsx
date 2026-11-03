import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useLocale } from '@/core/i18n';
import { formatNumber } from '@/core/i18n/numbers';
import { useTheme } from '@/core/theme';
import { BackButton, Screen, ScreenHeader } from '@/shared/ui';

import { DiscoverGroup } from '../components/DiscoverGroup';
import { DiscoverProgressBar } from '../components/DiscoverProgressBar';
import { DiscoverRow } from '../components/DiscoverRow';
import { DiscoverWidgetSheet } from '../components/DiscoverWidgetSheet';
import { useDiscoverProgress, useDiscoverState } from '../hooks/useDiscover';
import { startTourAt } from '../open';
import type { DiscoverRowState } from '../progress';
import { DISCOVER_GROUPS } from '../registry';
import { markDiscovered, skipTourStep } from '../store';

/**
 * The full checklist (quran-app-screens.html, #DiscoverScreen; ADR 0053). Five groups of rows; a row starts the guided
 * tour at that step, and a row ticks when its step is done. The tour's widget step opens the widget sheet here: reading
 * it completes the step, closing it skips. `openSheet` opens the sheet on arrival.
 */
export function DiscoverScreen({ openSheet = false }: { openSheet?: boolean }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const progress = useDiscoverProgress();
  const { tourStep } = useDiscoverState();
  const [sheetOpen, setSheetOpen] = useState(openSheet);
  // The tour's widget step shows the sheet for as long as the tour is on it.
  const onWidgetStep = tourStep === 'app.widget';

  const onOpenRow = (row: DiscoverRowState) => {
    startTourAt(row.entry);
  };

  return (
    <Screen testID="screen-discover">
      <ScrollView contentContainerStyle={{ gap: theme.space[5], padding: theme.space[4] }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: theme.space[3] }}>
          <BackButton onPress={() => router.back()} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <ScreenHeader
              hint={t('discover.progressSummary', {
                done: formatNumber(progress.doneCount, locale),
                total: formatNumber(progress.total, locale),
              })}
              title={t('discover.title')}
            />
          </View>
        </View>
        <DiscoverProgressBar done={progress.doneCount} total={progress.total} />
        {DISCOVER_GROUPS.map((group) => {
          const rows = progress.rows.filter((row) => row.entry.group === group);
          if (rows.length === 0) {
            return null;
          }
          return (
            <DiscoverGroup key={group} testID={`discover-group-${group}`} title={t(`discover.groups.${group}`)}>
              {rows.map((row) => (
                <DiscoverRow
                  done={row.done}
                  isNew={row.isNew}
                  key={row.entry.id}
                  onPress={() => onOpenRow(row)}
                  testID={`discover-row-${row.entry.id}`}
                  title={t(row.entry.titleKey)}
                />
              ))}
            </DiscoverGroup>
          );
        })}
      </ScrollView>
      <DiscoverWidgetSheet
        onClose={() => {
          setSheetOpen(false);
          if (onWidgetStep) {
            skipTourStep();
          }
        }}
        onRead={() => {
          markDiscovered('app.widget');
          setSheetOpen(false);
        }}
        visible={sheetOpen || onWidgetStep}
      />
    </Screen>
  );
}
