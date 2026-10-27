import { useTranslation } from 'react-i18next';

import { formatNumber, useLocale } from '@/core/i18n';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import { ListRow, NumberMedallion, UiText } from '@/shared/ui';

// The Surah index row: the number in a gold medallion, the Arabic name in Amiri, and the start page
// in place of a chevron.
export function SurahRow({
  chapter,
  onPress,
  separator,
  testID,
}: {
  chapter: ChapterRecord;
  onPress: () => void;
  separator?: 'line' | 'strong';
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const place = t(`library.surah.revelation.${chapter.revelationPlace}`);
  const meta = t('library.surah.meta', { count: chapter.versesCount, n: formatNumber(chapter.versesCount, locale), place });

  return (
    <ListRow
      chevron={false}
      leading={<NumberMedallion number={chapter.id} testID={testID ? `${testID}-number` : undefined} />}
      onPress={onPress}
      separator={separator}
      subtitle={meta}
      testID={testID}
      title={chapter.nameArabic}
      titleVariant="displaySm"
      trailing={
        <UiText tone="muted" variant="label">
          {t('library.surah.page', { page: formatNumber(chapter.pageStart, locale) })}
        </UiText>
      }
    />
  );
}
