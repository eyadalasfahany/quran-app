import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';

import { bookTitle, collectionTitle } from '../titles';
import { hadithNumberText } from '../number-text';
import { isUnavailableHadith } from '../source-credit';
import type { HadithReaderData } from '../types';

import { HadithExplanationCard, type HadithExplanationView } from './HadithExplanationCard';
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
  explanations = [],
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
  /** The explanations of this hadith, one card each under the hadith card. Hidden for an unavailable hadith. */
  explanations?: HadithExplanationView[];
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
      <ScrollView contentContainerStyle={{ gap: theme.space[3], paddingBottom: theme.space[4] }}>
        <HadithReaderCard
          chainEnd={null}
          fontScale={fontScale}
          hadithNumber={numberText}
          text={hadith.textAr}
          unavailable={unavailable}
          testID={`${testID}-card`}
        />
        {unavailable
          ? null
          : explanations.map((explanation, index) => (
              <HadithExplanationCard key={index} {...explanation} testID={`${testID}-explanation-${index}`} />
            ))}
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
