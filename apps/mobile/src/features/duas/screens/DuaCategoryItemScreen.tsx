import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';
import { AzkarReaderTopBar } from '@/features/azkar/components/AzkarReaderTopBar';

import { categoryPager } from '../data/category-pager';
import { categoryName } from '../data/category-labels';
import { useDuaCategories, useDuaCategoryItems } from '../data/hooks';
import { duasHref, goBackOr } from '../routes';
import { DuaHadithDetailScreen } from './DuaHadithDetailScreen';
import { DuaHisnDetailScreen } from './DuaHisnDetailScreen';
import { DuaQuranDetailScreen } from './DuaQuranDetailScreen';

/**
 * One dua opened from a Duas category (`app/duas/category/[id]/[index]`). It resolves the category's item at `index` and
 * shows the detail for its kind, paged within the category, so «n من N» counts the category's own items (ADR 0091 §3).
 * An index with no item shows the empty reader shell.
 */
export function DuaCategoryItemScreen({
  categoryId,
  index,
  testID = 'screen-dua-category-item',
}: {
  categoryId: string;
  index: number;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const categories = useDuaCategories();
  const category = categories.find((candidate) => candidate.id === categoryId);
  const items = useDuaCategoryItems(categoryId);
  const item = index >= 0 ? items[index] : undefined;
  const title = category === undefined ? t('duas.home.title') : categoryName(category, t, locale);

  if (item === undefined || item.kind === 'hadith-entry') {
    return (
      <Screen testID={testID}>
        <ContentColumn gutter={theme.size.gutterHome}>
          <View style={{ flex: 1 }}>
            <AzkarReaderTopBar fraction={0} onClose={() => goBackOr(duasHref.home)} progressText="" title={title} />
          </View>
        </ContentColumn>
      </Screen>
    );
  }

  const pager = categoryPager(categoryId, items.length, index);

  switch (item.kind) {
    case 'hadith':
      return <DuaHadithDetailScreen duaKey={item.duaKey} pager={pager} title={title} />;
    case 'quran':
      return <DuaQuranDetailScreen duaKey={item.duaKey} pager={pager} title={title} />;
    case 'hisn':
      return <DuaHisnDetailScreen entryKey={item.entryKey} pager={pager} title={title} />;
  }
}
