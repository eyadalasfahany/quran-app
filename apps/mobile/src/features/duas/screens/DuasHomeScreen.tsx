import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Button, IconButton, Screen } from '@/shared/ui';
import { AzkarListCard } from '@/features/azkar/components/AzkarListCard';
import { AzkarScreenHeader } from '@/features/azkar/components/AzkarScreenHeader';
import { AzkarTopicTile } from '@/features/azkar/components/AzkarTopicTile';

import type { PropheticDuaSection } from '../data/model';
import { useMyDuas, usePropheticDuaSections, useQuranicDuasAvailable, useQuranicDuasList } from '../data/hooks';
import { DuasMineCard } from '../components/DuasMineCard';
import { DuasSection } from '../components/DuasSection';
import { DuasSourceRow } from '../components/DuasSourceRow';
import { duasHref, goBackOr } from '../routes';

const BOOKMARK = { ios: 'bookmark', android: 'bookmark' } as const;

/** Chunks prophetic groups into rows of two, as Azkar home lays out browse topics. */
function pairs<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }
  return rows;
}

/** Duas home (screens/, #DuasHome): «أدعيتي», Quranic list row, prophetic topic tiles. */
export function DuasHomeScreen({ testID = 'screen-duas-home' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const quranAvailable = useQuranicDuasAvailable();
  const quranItems = useQuranicDuasList();
  const myDuas = useMyDuas();
  const sections = usePropheticDuaSections();
  const propheticGroups = useMemo(
    () =>
      sections.filter(
        (section): section is PropheticDuaSection & { groupId: number } =>
          section.items.length > 0 && section.groupId !== null,
      ),
    [sections],
  );

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.size.sectionGap, paddingTop: theme.space[2] }}>
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
          <ScrollView contentContainerStyle={{ gap: theme.size.sectionGap, paddingBottom: theme.space[8] }}>
            <DuasMineCard count={myDuas.length} onPress={() => router.push(duasHref.mine)} />
            {quranAvailable ? (
              <DuasSection
                caption={t('duas.home.quranSectionCaption')}
                testID="duas-quran-section"
                title={t('duas.home.quranSectionHeading')}
              >
                <AzkarListCard>
                  <DuasSourceRow
                    detail={t('duas.home.categoryCount', {
                      count: quranItems.length,
                      number: formatNumber(quranItems.length, locale),
                    })}
                    onPress={() => router.push(duasHref.quranList)}
                    separator={false}
                    testID="duas-category-quran"
                    title={t('duas.home.quranTitle')}
                  />
                </AzkarListCard>
              </DuasSection>
            ) : null}
            {propheticGroups.length > 0 ? (
              <DuasSection
                caption={t('duas.home.sunnahSectionCaption')}
                testID="duas-sunnah-section"
                title={t('duas.home.sunnahSectionHeading')}
              >
                <View style={{ gap: theme.space[3] }}>
                  {pairs(propheticGroups).map((row, rowIndex) => (
                    <View key={rowIndex} style={{ flexDirection: 'row', gap: theme.space[3] }}>
                      {row.map((section) => (
                        <AzkarTopicTile
                          countText={t('duas.home.categoryCount', {
                            count: section.items.length,
                            number: formatNumber(section.items.length, locale),
                          })}
                          key={section.groupId}
                          onPress={() => router.push(duasHref.hadithGroup(section.groupId))}
                          testID={`duas-category-hadith-${section.groupId}`}
                          title={section.title ?? t('duas.hadith.listTitle')}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </DuasSection>
            ) : null}
            <Button
              label={t('duas.mine.add')}
              onPress={() => router.push(duasHref.mineEdit())}
              stretch
              testID="duas-home-add-mine"
              variant="secondary"
            />
          </ScrollView>
        </View>
      </ContentColumn>
    </Screen>
  );
}
