import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Button, Screen } from '@/shared/ui';

import { AzkarCategoryHeader } from '../components/AzkarCategoryHeader';
import { AzkarItemCard } from '../components/AzkarItemCard';
import { AzkarStaggeredRow } from '../components/AzkarStaggeredRow';
import {
  buildCategoryCards,
  categoryProgress,
  periodKey,
  scopeKeyForCategory,
  useAzkarCategory,
  useCategoryUnits,
  useQuranReferenceLabel,
  useScopeProgress,
} from '../data';
import { completedUnitKeys } from '../reader-model';
import { azkarHref, goBackOr } from '../routes';

/**
 * One browse category (screens/, #AzkarCategory): its header with «١٢ من ٢٤», one card per dhikr, and the
 * pinned «ابدأ» / «تابع» button that opens the reader. A card opens the reader at its unit.
 */
export function AzkarCategoryScreen({ categoryId, testID = 'screen-azkar-category' }: { categoryId: string; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const category = useAzkarCategory(categoryId);
  const units = useCategoryUnits(categoryId, locale);
  const period = periodKey(category?.progressPeriod ?? 'session', new Date());
  const scopeKey = scopeKeyForCategory(categoryId);
  const { data: rows } = useScopeProgress(scopeKey, period);

  const completed = useMemo(() => completedUnitKeys(rows), [rows]);
  const cards = useMemo(() => buildCategoryCards(units, completed), [units, completed]);
  const quranReference = useQuranReferenceLabel(locale);
  const progress = categoryProgress(units, rows);
  const progressText = t('azkar.reader.progress', {
    current: formatNumber(progress.done, locale),
    total: formatNumber(progress.total, locale),
  });
  const sourceLine = t('azkar.browse.sourceLine', {
    count: progress.total,
    number: formatNumber(progress.total, locale),
  });
  const title = t(`azkar.categories.${categoryId}` as never);
  const fraction = progress.total === 0 ? 0 : progress.done / progress.total;

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.space[5], paddingTop: theme.space[2] }}>
          <AzkarCategoryHeader
            fraction={fraction}
            onBack={() => goBackOr(azkarHref.home)}
            onRemind={() => router.push(azkarHref.reminders({ category: categoryId }))}
            progressText={progressText}
            sourceLine={sourceLine}
            title={title}
          />
          <ScrollView contentContainerStyle={{ gap: theme.space[3], paddingBottom: theme.space[8] }}>
            {cards.map((card, index) => (
              <AzkarStaggeredRow index={index} key={card.entryKey} testID={`azkar-category-row-${index + 1}`}>
                <AzkarItemCard
                  done={card.done}
                  number={index + 1}
                  onPress={() => router.push(azkarHref.read(categoryId, card.unitKey))}
                  preview={card.preview}
                  quranReference={quranReference(card.quranRef)}
                  requiredCount={card.requiredCount}
                  testID={`azkar-category-card-${index + 1}`}
                />
              </AzkarStaggeredRow>
            ))}
          </ScrollView>
          <View style={{ paddingBottom: insets.bottom + theme.space[4] }}>
            <Button
              label={progress.done > 0 ? t('azkar.browse.continue') : t('azkar.browse.start')}
              onPress={() => router.push(azkarHref.read(categoryId))}
              stretch
              testID="azkar-category-start"
              variant="primary"
            />
          </View>
        </View>
      </ContentColumn>
    </Screen>
  );
}
