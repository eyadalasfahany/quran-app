import { useLocale } from '@/core/i18n/useLocale';
import { UiText } from '@/shared/ui';

import { formatHadithNumber } from '../format';

const SEPARATOR = ' · ';
const LABEL_SEPARATOR = ', ';

/** One muted line: collection, book and number. A null book or number leaves its segment out. */
export function HadithMeta({
  collectionTitle,
  bookTitle,
  hadithNumber,
  testID = 'hadith-meta',
}: {
  collectionTitle: string;
  bookTitle: string | null;
  hadithNumber: string | null;
  testID?: string;
}) {
  const locale = useLocale();
  const segments = [
    collectionTitle,
    bookTitle,
    hadithNumber === null ? null : formatHadithNumber(hadithNumber, locale),
  ].filter((segment): segment is string => segment !== null && segment !== '');

  return (
    <UiText
      accessibilityLabel={segments.join(LABEL_SEPARATOR)}
      numberOfLines={2}
      testID={testID}
      tone="muted"
      variant="caption"
    >
      {segments.join(SEPARATOR)}
    </UiText>
  );
}
