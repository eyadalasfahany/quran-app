import { useTranslation } from 'react-i18next';

import type { JuzStart } from '@/features/library/data/juz';
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

  return (
    <ListRow
      onPress={onPress}
      separator={separator}
      subtitle={t('library.juz.startVerse', { verseKey: juz.verseKey })}
      testID={testID}
      title={t('library.juz.title', { number: juz.juz })}
    />
  );
}
