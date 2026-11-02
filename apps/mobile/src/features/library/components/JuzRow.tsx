import { useTranslation } from 'react-i18next';

import { useLocale } from '@/core/i18n/useLocale';
import type { JuzStart } from '@/features/library/data/juz';
import { chapterDisplayName } from '@/features/reader/data/chapters';
import { ListRow } from '@/shared/ui';

export function JuzRow({
  juz,
  onPress,
  separator,
  testID,
}: {
  juz: JuzStart;
  onPress: () => void;
  separator?: 'line' | 'strong';
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const surah = chapterDisplayName({ nameArabic: juz.chapterNameArabic, nameSimple: juz.chapterNameSimple }, locale);

  return (
    <ListRow
      density="index"
      onPress={onPress}
      separator={separator}
      subtitle={t('library.juz.startVerse', { surah, ayah: juz.verseNumber })}
      testID={testID}
      title={t('library.juz.title', { number: juz.juz })}
    />
  );
}
