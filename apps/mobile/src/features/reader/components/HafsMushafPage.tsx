import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { AyahMarker, GoldFrame, QuranText, SurahCartouche } from '@/shared/ui';

import type { ChapterRecord } from '../data/chapters';
import type { VerseRecord } from '../data/verses';
import { BismillahLine } from './BismillahLine';

/** Padding inside the double gold frame, from the Mushaf phone frame. */
const FRAME_CONTENT = {
  gap: 18,
  paddingBottom: 26,
  paddingHorizontal: 18,
  paddingTop: 22,
} as const;

export function HafsMushafPage({
  verses,
  chapters,
  fontScale = 1,
  selectedVerseKey = null,
  onPressVerse,
  onOpenActions,
  testID,
}: {
  verses: readonly VerseRecord[];
  chapters: ReadonlyMap<number, ChapterRecord>;
  fontScale?: number;
  selectedVerseKey?: string | null;
  onPressVerse?: (verseKey: string) => void;
  onOpenActions?: (verseKey: string) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <GoldFrame contentStyle={{ alignItems: 'center', ...FRAME_CONTENT }} testID={testID} variant="page">
      {verses.map((verse) => {
        const chapter = verse.verseNumber === 1 ? chapters.get(verse.chapterId) : undefined;
        const showBismillah = chapter !== undefined && chapter.bismillahPre === 1 && chapter.id !== 1;
        return (
          <View key={verse.id} style={{ alignItems: 'center', gap: theme.space[3], width: '100%' }}>
            {chapter === undefined ? null : (
              <SurahCartouche
                name={t('reader.surahTitle', { name: chapter.nameArabic })}
                testID={testID ? `${testID}-surah-${chapter.id}` : undefined}
              />
            )}
            {showBismillah && chapter.bismillahText !== null ? (
              <BismillahLine
                fontScale={fontScale}
                testID={testID ? `${testID}-bismillah-${chapter.id}` : undefined}
                text={chapter.bismillahText}
                typeToken="quranMushaf"
              />
            ) : null}
            <View style={{ alignItems: 'center', width: '100%' }}>
              <QuranText
                align="center"
                fontScale={fontScale}
                onLongPress={onOpenActions ? () => onOpenActions(verse.verseKey) : undefined}
                onPress={onPressVerse ? () => onPressVerse(verse.verseKey) : undefined}
                style={{ width: '100%' }}
                testID={testID ? `${testID}-ayah-${verse.verseKey}` : undefined}
                variant="quranMushaf"
              >
                {verse.textUthmani}
              </QuranText>
              <AyahMarker
                active={selectedVerseKey === verse.verseKey}
                fontScale={fontScale}
                number={verse.verseNumber}
                onPress={onOpenActions ? () => onOpenActions(verse.verseKey) : undefined}
                testID={testID ? `${testID}-marker-${verse.verseKey}` : undefined}
              />
            </View>
          </View>
        );
      })}
    </GoldFrame>
  );
}
