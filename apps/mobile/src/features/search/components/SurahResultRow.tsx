import { useTranslation } from 'react-i18next';

import { SurahRow } from '@/features/library/components/SurahRow';
import type { ChapterRecord } from '@/features/reader/data/chapters';

export function SurahResultRow({
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

  return (
    <SurahRow
      chapter={chapter}
      onPress={onPress}
      separator={separator}
      subtitle={t('search.surahResultHint', { count: chapter.versesCount })}
      testID={testID}
      variant="result"
    />
  );
}
