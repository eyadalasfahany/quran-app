import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';

import { bookTitle, collectionTitle } from '../titles';
import { hadithNumberText } from '../number-text';
import { isUnavailableHadith } from '../source-credit';
import type { HadithReaderData } from '../types';

import { HadithPager } from './HadithPager';
import { HadithReaderCard } from './HadithReaderCard';
import { HadithReaderHeader } from './HadithReaderHeader';

/**
 * The reading column of one hadith: the header (optional), the card with the text and its source line, and the pager.
 * Shared by the phone reader and the expanded reader pane. No grade is read or drawn.
 */
export function HadithReaderContent({
  data,
  totalHadith,
  saved,
  onToggleSave,
  onCopy,
  onShare,
  onPrevious,
  onNext,
  onBack,
  showHeader,
  fontScale,
  testID = 'hadith-reader-content',
}: {
  data: HadithReaderData;
  totalHadith: number | null;
  saved: boolean;
  onToggleSave: () => void;
  onCopy: () => void;
  onShare: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onBack: () => void;
  showHeader: boolean;
  fontScale?: number;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const { hadith, previous, next } = data;
  const numberText = hadithNumberText(hadith);
  const unavailable = isUnavailableHadith(hadith.sourceCode);

  return (
    <View style={{ flex: 1, gap: theme.space[4] }} testID={testID}>
      {showHeader ? (
        <HadithReaderHeader
          bookTitle={bookTitle(hadith.book, locale, t)}
          collectionTitle={collectionTitle(hadith.collection, locale, t)}
          onBack={onBack}
          onCopy={onCopy}
          onShare={onShare}
          onToggleSave={onToggleSave}
          saved={saved}
          shareable={!unavailable}
        />
      ) : null}
      <ScrollView contentContainerStyle={{ gap: theme.space[4], paddingBottom: theme.space[4] }}>
        <HadithReaderCard
          attribution={hadith.collection.attributionAr || null}
          chainEnd={null}
          fontScale={fontScale}
          hadithNumber={numberText}
          sourceCode={hadith.sourceCode ?? null}
          sourceUrl={hadith.sourceUrl}
          text={hadith.textAr}
          unavailable={unavailable}
          testID={`${testID}-card`}
        />
      </ScrollView>
      <HadithPager
        hasNext={next !== null}
        hasPrevious={previous !== null}
        onNext={onNext}
        onPrevious={onPrevious}
        position={numberText}
        testID={`${testID}-pager`}
        total={totalHadith}
      />
    </View>
  );
}
