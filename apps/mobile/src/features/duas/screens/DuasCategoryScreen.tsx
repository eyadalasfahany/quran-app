import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';
import { AzkarItemCard } from '@/features/azkar/components/AzkarItemCard';
import { AzkarScreenHeader } from '@/features/azkar/components/AzkarScreenHeader';
import { hadithHref } from '@/features/hadith/routes';

import { categoryCountText } from '../data/category-labels';
import { duaCategoryHeading } from '../data/home-tiles';
import { useDuaCategories, useDuaCategoryItems, useDuaTopics } from '../data/hooks';
import type { DuaCategoryItem } from '../data/model';
import { duasHref, goBackOr } from '../routes';

/** The card props a dua of a category maps to (`AzkarItemCard`, badge `ring`). */
type CardProps = {
  preview: string | null;
  quranText?: string | null;
  quranReference?: string | null;
  onPress: () => void;
};

/**
 * One Duas category (screens/, #DuasCategory, #DuasCategoryQuran): the Azkar header with the name and the count («٢٨ دعاءً»),
 * then one Azkar item card per dua, with the gold ring as its number. No sources on the screen (developer, 15 Nov 2026).
 * Hisn, HadeethEnc and Quranic cards open their Duas detail, paged within this category (ADR 0091 decision 11). A hadith
 * card opens the hadith reader (ADR 0091 part 4), and a hadith chapter in a topic opens its chapter (ADR 0092 decision 10).
 */
export function DuasCategoryScreen({ categoryId, testID = 'screen-duas-category' }: { categoryId: string; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const categories = useDuaCategories();
  const topics = useDuaTopics();
  const heading = duaCategoryHeading(categoryId, categories, topics, t, locale);
  const items = useDuaCategoryItems(categoryId);

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.space[5], paddingTop: theme.space[2] }}>
          <AzkarScreenHeader
            onBack={() => goBackOr(duasHref.home)}
            subtitle={heading ? categoryCountText(heading.count, locale, t) : undefined}
            testID="duas-category-header"
            title={heading?.title ?? t('duas.home.title')}
          />
          <ScrollView contentContainerStyle={{ gap: theme.space[3], paddingBottom: theme.space[8] }}>
            {items.map((item, index) => (
              <AzkarItemCard
                badge="ring"
                key={cardKey(item)}
                number={index + 1}
                requiredCount={null}
                testID={`duas-category-card-${index + 1}`}
                {...cardFor(item, index, categoryId, t)}
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
    case 'hadith-chapter':
      return `hadith-chapter:${item.slug}:${item.bookNumber}:${item.chapterNumber}`;
    case 'hadith':
    case 'quran':
      return `${item.kind}:${item.duaKey}`;
  }
}

/** Maps one category item (at `index`, 0-based) to the card that shows it, with the route the card opens. */
function cardFor(item: DuaCategoryItem, index: number, categoryId: string, t: TFunction): CardProps {
  const openInCategory = () => router.push(duasHref.categoryItem(categoryId, index));

  switch (item.kind) {
    case 'hisn':
      return { preview: item.preview, onPress: openInCategory };
    case 'hadith':
      return { preview: item.preview, onPress: openInCategory };
    case 'quran':
      return {
        preview: null,
        quranText: item.text,
        quranReference: item.quranReference ?? t('duas.categories.quran'),
        onPress: openInCategory,
      };
    case 'hadith-chapter':
      // A dua-book chapter in a topic opens its chapter in the hadith reader (ADR 0092 decision 10).
      return {
        preview: item.title,
        onPress: () => router.push(hadithHref.chapter(item.slug, item.bookId, item.chapterId)),
      };
    case 'hadith-entry':
      // A hadith from a hadith book opens the hadith reader (ADR 0091 part 4); its text is shown as stored.
      return {
        preview: item.preview,
        onPress: () => router.push(hadithHref.reader(item.slug, item.hadithNumber)),
      };
  }
}
