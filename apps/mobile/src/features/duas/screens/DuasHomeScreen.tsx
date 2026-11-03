import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { IconButton, Screen } from '@/shared/ui';
import { AzkarListCard } from '@/features/azkar/components/AzkarListCard';
import { AzkarScreenHeader } from '@/features/azkar/components/AzkarScreenHeader';
import { AzkarSectionTitle } from '@/features/azkar/components/AzkarSectionTitle';
import { AzkarTopicTile } from '@/features/azkar/components/AzkarTopicTile';
import { useAzkarAvailable, useAzkarCategories } from '@/features/azkar/data';

import { usePropheticDuasAvailable, useQuranicDuasAvailable } from '../data/hooks';
import type { AzkarCategoryListItem } from '@/features/azkar/data/model';
import { azkarHref } from '@/features/azkar/routes';

import { DuasAttributionLine } from '../components/DuasAttributionLine';
import { DuasMineCard } from '../components/DuasMineCard';
import { DuasSourceRow } from '../components/DuasSourceRow';
import { duasHref, goBackOr } from '../routes';

const BOOKMARK = { ios: 'bookmark', android: 'bookmark' } as const;

function pairs<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }
  return rows;
}

/** Duas home (quran-app-screens.html, #DuasHome): «أدعيتي», Hisn when Azkar is installed. */
export function DuasHomeScreen({ testID = 'screen-duas-home' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const azkarAvailable = useAzkarAvailable();
  const quranAvailable = useQuranicDuasAvailable();
  const hadithAvailable = usePropheticDuasAvailable();
  const categories = useAzkarCategories(locale);
  const browse = categories.filter((category: AzkarCategoryListItem) => category.kind === 'browse');
  const showSources = quranAvailable || hadithAvailable || azkarAvailable;

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.space[5], paddingTop: theme.space[2] }}>
          <AzkarScreenHeader
            onBack={() => goBackOr(duasHref.homeTab)}
            title={t('duas.home.title')}
            trailing={
              <IconButton
                icon={BOOKMARK}
                label={t('duas.home.favourites')}
                onPress={() => router.push(duasHref.favorites)}
                testID="duas-home-favorites"
                variant="raised"
              />
            }
          />
          <ScrollView contentContainerStyle={{ gap: theme.space[5], paddingBottom: theme.space[8] }}>
            <DuasMineCard onPress={() => router.push(duasHref.mine)} />
            {showSources ? (
              <>
                <AzkarSectionTitle title={t('duas.home.sourcesHeading')} testID="duas-sources-heading" />
                <AzkarListCard>
                  {quranAvailable ? (
                    <DuasSourceRow
                      detail={t('duas.home.quranDetail')}
                      onPress={() => router.push(duasHref.quranList)}
                      separator={hadithAvailable || azkarAvailable}
                      testID="duas-source-quran"
                      title={t('duas.home.quranTitle')}
                    />
                  ) : null}
                  {hadithAvailable ? (
                    <DuasSourceRow
                      detail={t('duas.home.hadithDetail')}
                      onPress={() => router.push(duasHref.hadithList)}
                      separator={azkarAvailable}
                      testID="duas-source-hadith"
                      title={t('duas.home.hadithTitle')}
                    />
                  ) : null}
                  {azkarAvailable ? (
                    <DuasSourceRow
                      detail={t('duas.home.hisnDetail')}
                      onPress={() => router.push(azkarHref.home)}
                      separator={false}
                      testID="duas-source-hisn"
                      title={t('duas.home.hisnTitle')}
                    />
                  ) : null}
                </AzkarListCard>
                <DuasAttributionLine />
              </>
            ) : null}
            {azkarAvailable ? (
              <>
                <AzkarSectionTitle title={t('duas.home.topicsHeading')} testID="duas-topics-heading" />
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
                          testID={`duas-topic-${category.id}`}
                          title={t(`azkar.categories.${category.id}` as never)}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </ContentColumn>
    </Screen>
  );
}
