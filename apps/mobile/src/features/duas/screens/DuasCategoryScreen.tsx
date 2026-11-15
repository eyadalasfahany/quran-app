import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useLocale, type Locale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';
import { hadithHref } from '@/features/hadith/routes';

import { DuasCategoryCard, type DuasCategoryCardProps } from '../components/DuasCategoryCard';
import { DuasCategoryHeader } from '../components/DuasCategoryHeader';
import { categoryCountText, categoryName } from '../data/category-labels';
import { useDuaCategories, useDuaCategoryItems } from '../data/hooks';
import type { DuaCategoryItem } from '../data/model';
import { duasHref, goBackOr } from '../routes';

/**
 * One Duas category (screens/, #DuasCategory): the header with the name and the count («١٠ أدعية»), then one card per
 * dua. No sources on the screen (developer, 15 Nov 2026). Hisn, HadeethEnc and Quranic cards open their Duas detail,
 * paged within this category (ADR 0091 decision 11). A hadith-book card opens the hadith reader (ADR 0091 part 4).
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
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.size.blockGap, paddingTop: theme.space[2] }}>
          <DuasCategoryHeader
            onBack={() => goBackOr(duasHref.home)}
            subtitle={category ? categoryCountText(category.count, locale, t) : undefined}
            title={category ? categoryName(category, t, locale) : t('duas.home.title')}
          />
          <ScrollView contentContainerStyle={{ gap: theme.size.homeTileGridGap, paddingBottom: theme.space[8] }}>
            {items.map((item, index) => (
              <DuasCategoryCard
                key={cardKey(item)}
                {...cardFor(item, index, categoryId, locale, t)}
                testID={`duas-category-card-${index + 1}`}
              />
            ))}
          </ScrollView>
        </View>
      </ContentColumn>
    </Screen>
  );
}

function cardKey(item: DuaCategoryItem): string {
  switch (item.kind) {
    case 'hisn':
      return `hisn:${item.entryKey}`;
    case 'hadith-entry':
      return `hadith-entry:${item.slug}:${item.hadithNumber}`;
    case 'hadith':
    case 'quran':
      return `${item.kind}:${item.duaKey}`;
  }
}

/** Maps one category item (at `index`, 0-based) to the card that shows it, with the route the card opens. */
function cardFor(item: DuaCategoryItem, index: number, categoryId: string, locale: Locale, t: TFunction): DuasCategoryCardProps {
  const number = index + 1;
  const openInCategory = () => router.push(duasHref.categoryItem(categoryId, index));

  switch (item.kind) {
    case 'hisn':
      return { kind: 'hisn', number, preview: item.preview, onPress: openInCategory };
    case 'hadith':
      return { kind: 'hadith', number, preview: item.preview, onPress: openInCategory };
    case 'quran':
      return {
        kind: 'quran',
        number,
        text: item.text,
        reference: item.quranReference ?? t('duas.categories.quran'),
        onPress: openInCategory,
      };
    case 'hadith-entry':
      // A hadith from a hadith book opens the hadith reader (ADR 0091 part 4); its text is shown as stored.
      return {
        kind: 'hadith',
        number,
        preview: item.preview,
        onPress: () => router.push(hadithHref.reader(item.slug, item.hadithNumber)),
      };
  }
}
