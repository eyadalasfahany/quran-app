import { useTranslation } from 'react-i18next';

import { formatNumber, type Locale } from '@/core/i18n';
import { SheetHeader } from '@/shared/ui';

export function PanelHeader({
  surahName,
  verseNumber,
  page,
  juz,
  onClose,
  closeLabel,
  testID = 'panel-header',
}: {
  // The surah's Arabic name, a Quranic word.
  surahName: string;
  verseNumber: number;
  page: number | null;
  juz: number | null;
  // The side panel has its own close; sheets pass one here.
  onClose?: () => void;
  closeLabel?: string;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const ayah = t('reader.ayahPanel.ayah', { number: formatNumber(verseNumber, locale) });
  const place =
    page === null || juz === null
      ? null
      : t('reader.toolbar.place', { juz: formatNumber(juz, locale), page: formatNumber(page, locale) });

  return (
    <SheetHeader
      closeLabel={closeLabel ?? t('reader.sheet.close')}
      onClose={onClose}
      size="compact"
      subtitle={place}
      testID={testID}
      title={`${surahName} · ${ayah}`}
    />
  );
}
