import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn, useWindowClass } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { EmptyState, IconButton, Screen } from '@/shared/ui';
import { AzkarScreenHeader } from '@/features/azkar/components/AzkarScreenHeader';

import { DuasCategoryGrid, type DuasCategoryGridItem } from '../components/DuasCategoryGrid';
import { DuasHomeSkeleton } from '../components/DuasHomeSkeleton';
import { DuasMineCard } from '../components/DuasMineCard';
import { categoryCountText } from '../data/category-labels';
import { duaHomeTiles } from '../data/home-tiles';
import { useDuaCategories, useDuaTopics, useMyDuas } from '../data/hooks';
import { duasHref, goBackOr } from '../routes';

const BOOKMARK = { ios: 'bookmark', android: 'bookmark' } as const;
const SEARCH = { ios: 'magnifyingglass', android: 'search' } as const;
const UNAVAILABLE_ICON = { ios: 'book.closed', android: 'book' } as const;

/** Tiles shown before «عرض الكل» expands the grid in place (screens/, #DuasHomeCategories). */
export const DUAS_HOME_CATEGORY_LIMIT = 8;

/** The content column's width in the expanded window (screens/, #DuasHomeCategoriesExpanded). */
export const DUAS_HOME_EXPANDED_WIDTH = 640;

/**
 * Duas home (screens/, #DuasHomeCategories, #DuasHomeCategoriesExpanded, #DuasLoading, #DuasUnavailable): the Azkar header
 * (back, search, favourites), the «أدعيتي» card, and the «التصنيفات» grid of Azkar topic tiles: the Quranic duas, the five
 * hadith dua books, the HadeethEnc groups, then the topics. The first eight show, «عرض الكل N» expands the grid in place.
 * Loading shows the skeleton; with no content, the unavailable state replaces the grid and the mine card (the frame).
 * Sources are not shown here (developer, 15 Nov 2026). The expanded window keeps the two columns in a 640 pt column.
 */
export function DuasHomeScreen({ testID = 'screen-duas-home' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const windowClass = useWindowClass();
  const { ready } = useContentDb();
  const myDuas = useMyDuas();
  const categories = useDuaCategories();
  const topics = useDuaTopics();
  const [expanded, setExpanded] = useState(false);

  const tiles = useMemo(() => duaHomeTiles(categories, topics, t, locale), [categories, topics, t, locale]);
  const available = tiles.length > 0;
  const wide = windowClass === 'expanded';

  const gridItems = useMemo<DuasCategoryGridItem[]>(
    () =>
      (expanded ? tiles : tiles.slice(0, DUAS_HOME_CATEGORY_LIMIT)).map((tile) => ({
        id: tile.id,
        name: tile.name,
        countText: categoryCountText(tile.count, locale, t),
        onPress: () => router.push(duasHref.category(tile.id)),
      })),
    [expanded, locale, t, tiles],
  );

  const body = ready && available;

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={wide ? theme.space[6] : theme.size.gutterHome}>
        <View
          testID="duas-home-column"
          style={{
            alignSelf: 'center',
            flex: 1,
            gap: theme.space[5],
            maxWidth: wide ? DUAS_HOME_EXPANDED_WIDTH : undefined,
            paddingTop: theme.space[2],
            width: '100%',
          }}
        >
          <AzkarScreenHeader
            onBack={() => goBackOr(duasHref.homeTab)}
            testID="duas-home-header"
            title={t('duas.home.title')}
            trailing={
              !ready || available ? (
                <>
                  <IconButton
                    icon={SEARCH}
                    label={t('ui.search')}
                    onPress={() => router.push(duasHref.search)}
                    testID="duas-home-search"
                    variant="raised"
                  />
                  <IconButton
                    icon={BOOKMARK}
                    label={t('duas.home.favourites')}
                    onPress={() => router.push(duasHref.favorites)}
                    testID="duas-home-favorites"
                    variant="raised"
                  />
                </>
              ) : undefined
            }
          />
          {!ready ? <DuasHomeSkeleton /> : null}
          {ready && !available ? (
            <EmptyState
              body={t('duas.home.unavailableBody')}
              icon={UNAVAILABLE_ICON}
              testID="duas-unavailable"
              title={t('duas.home.unavailableTitle')}
            />
          ) : null}
          {body ? (
            <ScrollView contentContainerStyle={{ gap: theme.space[5], paddingBottom: theme.space[8] }}>
              <DuasMineCard count={myDuas.length} onPress={() => router.push(duasHref.mine)} />
              <DuasCategoryGrid
                heading={t('duas.home.categoriesHeading')}
                items={gridItems}
                testID="duas-categories"
                toggle={
                  tiles.length > DUAS_HOME_CATEGORY_LIMIT
                    ? {
                        expanded,
                        label: expanded
                          ? t('duas.home.showLess')
                          : t('duas.home.showAll', { number: formatNumber(tiles.length, locale) }),
                        onPress: () => setExpanded((value) => !value),
                      }
                    : undefined
                }
              />
            </ScrollView>
          ) : null}
        </View>
      </ContentColumn>
    </Screen>
  );
}
