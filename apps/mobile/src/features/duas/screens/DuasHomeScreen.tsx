import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { IconButton, Screen, SearchButton } from '@/shared/ui';

import { DuasCategoryGrid, type DuasCategoryGridItem } from '../components/DuasCategoryGrid';
import { DuasCategoryHeader } from '../components/DuasCategoryHeader';
import { DuasMineCard } from '../components/DuasMineCard';
import { categoryCountText, categoryName } from '../data/category-labels';
import { useDuaCategories, useMyDuas } from '../data/hooks';
import { duasHref, goBackOr } from '../routes';

const BOOKMARK = { ios: 'bookmark', android: 'bookmark' } as const;

/** Categories shown before «عرض الكل» expands the grid in place (screens/, #DuasHomeCategories). */
export const DUAS_HOME_CATEGORY_LIMIT = 8;

/**
 * Duas home (screens/, #DuasHomeCategories): the header, the «أدعيتي» card, the «التصنيفات» grid of the first eight
 * categories with «عرض الكل N» to expand it in place. Sources are not shown here (developer, 15 Nov 2026). The header
 * trails search, then favourites, as Azkar's does (ADR 0091 part 6). The gutter is Azkar's (`gutterHome`).
 */
export function DuasHomeScreen({ testID = 'screen-duas-home' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const myDuas = useMyDuas();
  const categories = useDuaCategories();
  const [expanded, setExpanded] = useState(false);

  const tiles = useMemo<DuasCategoryGridItem[]>(
    () =>
      (expanded ? categories : categories.slice(0, DUAS_HOME_CATEGORY_LIMIT)).map((category) => ({
        id: category.id,
        name: categoryName(category, t, locale),
        caption: categoryCountText(category.count, locale, t),
        onPress: () => router.push(duasHref.category(category.id)),
      })),
    [categories, expanded, locale, t],
  );

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.size.blockGap, paddingTop: theme.space[2] }}>
          <DuasCategoryHeader
            onBack={() => goBackOr(duasHref.homeTab)}
            title={t('duas.home.title')}
            trailing={
              <>
                <SearchButton onPress={() => router.push(duasHref.search)} testID="duas-home-search" />
                <IconButton
                  icon={BOOKMARK}
                  label={t('duas.home.favourites')}
                  onPress={() => router.push(duasHref.favorites)}
                  testID="duas-home-favorites"
                  variant="raised"
                />
              </>
            }
          />
          <ScrollView contentContainerStyle={{ gap: theme.size.blockGap, paddingBottom: theme.space[8] }}>
            <DuasMineCard count={myDuas.length} onPress={() => router.push(duasHref.mine)} />
            {categories.length > 0 ? (
              <DuasCategoryGrid
                heading={t('duas.home.categoriesHeading')}
                items={tiles}
                testID="duas-categories"
                toggle={
                  categories.length > DUAS_HOME_CATEGORY_LIMIT
                    ? {
                        expanded,
                        label: expanded
                          ? t('duas.home.showLess')
                          : t('duas.home.showAll', { number: formatNumber(categories.length, locale) }),
                        onPress: () => setExpanded((value) => !value),
                      }
                    : undefined
                }
              />
            ) : null}
          </ScrollView>
        </View>
      </ContentColumn>
    </Screen>
  );
}
