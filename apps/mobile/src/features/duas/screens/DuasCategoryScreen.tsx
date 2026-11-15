import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useLocale, type Locale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';
import { azkarHref } from '@/features/azkar/routes';

import { DuasCategoryCard, type DuasCategoryCardProps } from '../components/DuasCategoryCard';
import { DuasCategoryHeader } from '../components/DuasCategoryHeader';
import { categoryCaption, categoryName, hisnCardCaption } from '../data/category-labels';
import { useDuaCategories, useDuaCategoryItems } from '../data/hooks';
import type { DuaCategoryItem } from '../data/model';
import { duasHref, goBackOr } from '../routes';

/**
 * One Duas category (screens/, #DuasCategory): the header with the name and «١٠ أدعية · حصن المسلم», then one card per
 * dua. A Hisn card opens its Azkar entry (ADR 0091 §3); a HadeethEnc card and a Quranic card open their own details.
 */
export function DuasCategoryScreen({ categoryId, testID = 'screen-duas-category' }: { categoryId: string; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const categories = useDuaCategories();
  const category = categories.find((candidate) => candidate.id === categoryId);
  const items = useDuaCategoryItems(categoryId);

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterList}>
        <View style={{ flex: 1, gap: theme.size.blockGap, paddingTop: theme.space[2] }}>
          <DuasCategoryHeader
            onBack={() => goBackOr(duasHref.home)}
            subtitle={category ? categoryCaption(category, locale, t) : undefined}
            title={category ? categoryName(category, t) : t('duas.home.title')}
          />
          <ScrollView contentContainerStyle={{ gap: theme.size.homeTileGridGap, paddingBottom: theme.space[8] }}>
            {items.map((item, index) => {
              const number = index + 1;
              return (
                <DuasCategoryCard
                  key={cardKey(item)}
                  {...cardFor(item, number, locale, t)}
                  testID={`duas-category-card-${number}`}
                />
              );
            })}
          </ScrollView>
        </View>
      </ContentColumn>
    </Screen>
  );
}

function cardKey(item: DuaCategoryItem): string {
  return item.kind === 'hisn' ? `hisn:${item.entryKey}` : `${item.kind}:${item.duaKey}`;
}

/** Maps one category item to the card that shows it, with the route the card opens. */
function cardFor(item: DuaCategoryItem, number: number, locale: Locale, t: TFunction): DuasCategoryCardProps {
  switch (item.kind) {
    case 'hisn':
      return {
        kind: 'hisn',
        number,
        caption: hisnCardCaption(item.bookNumber, locale, t),
        chapterTitle: item.chapterTitle,
        preview: item.preview,
        onPress: () => router.push(azkarHref.entry(item.entryKey)),
      };
    case 'hadith':
      return {
        kind: 'hadith',
        number,
        preview: item.preview,
        onPress: () => router.push(duasHref.hadithDetail(item.duaKey)),
      };
    case 'quran':
      return {
        kind: 'quran',
        number,
        reference: item.quranReference ?? t('duas.categories.quran'),
        onPress: () => router.push(duasHref.quranDetail(item.duaKey)),
      };
  }
}
