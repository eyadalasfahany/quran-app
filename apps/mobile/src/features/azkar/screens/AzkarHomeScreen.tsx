import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { EmptyState, IconButton, Screen } from '@/shared/ui';

import { AzkarHomeSkeleton } from '../components/AzkarHomeSkeleton';
import { AzkarListCard } from '../components/AzkarListCard';
import { AzkarScreenHeader } from '../components/AzkarScreenHeader';
import { AzkarSectionTitle } from '../components/AzkarSectionTitle';
import { AzkarSessionRow } from '../components/AzkarSessionRow';
import { AzkarTopicTile } from '../components/AzkarTopicTile';
import { ContinueAzkarCard, type ContinueAzkarResume } from '../components/ContinueAzkarCard';
import {
  completedUnitsIn,
  periodKey,
  scopeKeyForCategory,
  useAzkarAvailable,
  useAzkarCategories,
  useAzkarProgressSummaries,
  useContinueAzkar,
} from '../data';
import type { AzkarCategoryListItem } from '../data/model';
import { azkarHref } from '../routes';

const BOOKMARK = { ios: 'bookmark', android: 'bookmark' } as const;
const SEARCH = { ios: 'magnifyingglass', android: 'search' } as const;
const UNAVAILABLE_ICON = { ios: 'book.closed', android: 'book' } as const;

/** Chunks the browse topics into rows of two, as the frame lays them out. */
function pairs<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }
  return rows;
}

/**
 * Azkar home (quran-app-screens.html, #AzkarHome): the continue card, the session categories with their progress, and
 * the browse topics. Without Azkar content it shows the unavailable state (ADR 0017: no dead ends).
 */
export function AzkarHomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const { ready } = useContentDb();
  const available = useAzkarAvailable();
  const categories = useAzkarCategories(locale);
  const summaries = useAzkarProgressSummaries();
  const continueAzkar = useContinueAzkar(locale);
  const now = new Date();

  const sessions = categories.filter((category) => category.kind === 'session');
  const browse = categories.filter((category) => category.kind === 'browse');

  const resume: ContinueAzkarResume | null = continueAzkar && {
    title: continueAzkar.scope.categoryId
      ? t(`azkar.categories.${continueAzkar.scope.categoryId}` as never)
      : continueAzkar.scope.occasion
        ? t(`azkar.occasions.${continueAzkar.scope.occasion}` as never)
        : t('azkar.reader.entryTitle'),
    completed: continueAzkar.completed,
    total: continueAzkar.scope.total,
  };

  const openResume = () => {
    if (!continueAzkar) {
      return;
    }
    const { categoryId, entryKey } = continueAzkar.scope;
    if (categoryId) {
      router.push(azkarHref.read(categoryId));
    } else if (entryKey) {
      router.push(azkarHref.entry(entryKey));
    }
  };

  const progressOf = (category: AzkarCategoryListItem) => {
    const completed = completedUnitsIn(summaries, scopeKeyForCategory(category.id), periodKey(category.progressPeriod, now));
    return { completed: Math.min(completed, category.unitCount), total: category.unitCount };
  };

  const content = (
    <ScrollView contentContainerStyle={{ gap: theme.space[5], paddingBottom: theme.space[8] }}>
      <ContinueAzkarCard onPress={openResume} resume={resume} />
      <AzkarSectionTitle title={t('azkar.browse.sessionHeading')} testID="azkar-session-heading" />
      <AzkarListCard>
        {sessions.map((category, index) => {
          const { completed, total } = progressOf(category);
          return (
            <AzkarSessionRow
              completed={total > 0 && completed >= total}
              fraction={total === 0 ? 0 : completed / total}
              key={category.id}
              onPress={() => router.push(azkarHref.category(category.id))}
              progressText={t('azkar.reader.progress', {
                current: formatNumber(completed, locale),
                total: formatNumber(total, locale),
              })}
              separator={index < sessions.length - 1}
              testID={`azkar-session-${category.id}`}
              title={t(`azkar.categories.${category.id}` as never)}
            />
          );
        })}
      </AzkarListCard>
      <AzkarSectionTitle title={t('azkar.browse.topicsHeading')} testID="azkar-topics-heading" />
      <View style={{ gap: theme.space[3] }}>
        {pairs(browse).map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: 'row', gap: theme.space[3] }}>
            {row.map((category) => (
              <AzkarTopicTile
                countText={t('azkar.browse.topicCount', {
                  count: category.unitCount,
                  number: formatNumber(category.unitCount, locale),
                })}
                key={category.id}
                onPress={() => router.push(azkarHref.category(category.id))}
                testID={`azkar-topic-${category.id}`}
                title={t(`azkar.categories.${category.id}` as never)}
              />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <Screen testID="screen-azkar-home">
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.space[5], paddingTop: theme.space[2] }}>
          <AzkarScreenHeader
            onBack={() => router.back()}
            title={t('azkar.browse.title')}
            trailing={
              available ? (
                <>
                  <IconButton
                    icon={BOOKMARK}
                    label={t('azkar.browse.favourites')}
                    onPress={() => router.push(azkarHref.favorites)}
                    testID="azkar-home-favorites"
                    variant="raised"
                  />
                  <IconButton
                    icon={SEARCH}
                    label={t('ui.search')}
                    onPress={() => router.push(azkarHref.search)}
                    testID="azkar-home-search"
                    variant="raised"
                  />
                </>
              ) : undefined
            }
          />
          {!ready ? <AzkarHomeSkeleton /> : null}
          {ready && !available ? (
            <EmptyState body={t('azkar.unavailable.body')} icon={UNAVAILABLE_ICON} testID="azkar-unavailable" title={t('azkar.unavailable.title')} />
          ) : null}
          {ready && available ? content : null}
        </View>
      </ContentColumn>
    </Screen>
  );
}
