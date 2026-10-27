import { Fragment, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View, type HostInstance } from 'react-native';

import { useTheme } from '@/core/theme';
import { AyahEndMark, GoldFrame, QuranText, SurahCartouche, useContrastColors } from '@/shared/ui';

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

// Separates an ayah from its end mark and from the next ayah. Kept outside the stored ayah text.
const WORD_SPACE = ' ';

export function HafsMushafPage({
  verses,
  chapters,
  fontScale = 1,
  selectedVerseKey = null,
  onPressVerse,
  onOpenActions,
  focusVerseKey = null,
  onFocusRunLayout,
  testID,
}: {
  verses: readonly VerseRecord[];
  chapters: ReadonlyMap<number, ChapterRecord>;
  fontScale?: number;
  selectedVerseKey?: string | null;
  onPressVerse?: (verseKey: string) => void;
  onOpenActions?: (verseKey: string) => void;
  /** The ayah the reader opened at. The surah paragraph holding it reports its view once laid out. */
  focusVerseKey?: string | null;
  onFocusRunLayout?: (run: HostInstance | null) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const focusRunRef = useRef<HostInstance>(null);
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <GoldFrame contentStyle={{ alignItems: 'center', ...FRAME_CONTENT }} testID={testID} variant="page">
      {surahRuns(verses).map((run) => {
        const [first] = run;
        const chapter = first.verseNumber === 1 ? chapters.get(first.chapterId) : undefined;
        const showBismillah = chapter !== undefined && chapter.bismillahPre === 1 && chapter.id !== 1;
        const holdsFocus = focusVerseKey !== null && run.some((verse) => verse.verseKey === focusVerseKey);
        return (
          <View
            key={first.id}
            onLayout={holdsFocus ? () => onFocusRunLayout?.(focusRunRef.current) : undefined}
            ref={holdsFocus ? focusRunRef : undefined}
            style={{ alignItems: 'center', gap: theme.space[3], width: '100%' }}
            testID={testID && holdsFocus ? `${testID}-focus-run` : undefined}
          >
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
            <QuranText
              align="center"
              fontScale={fontScale}
              style={{ width: '100%' }}
              testID={testID ? `${testID}-text-${first.verseKey}` : undefined}
              variant="quranMushaf"
            >
              {run.map((verse, index) => {
                const selected = selectedVerseKey === verse.verseKey;
                return (
                  <Fragment key={verse.id}>
                    {index > 0 ? WORD_SPACE : null}
                    <Text
                      onLongPress={onOpenActions ? () => onOpenActions(verse.verseKey) : undefined}
                      onPress={onPressVerse ? () => onPressVerse(verse.verseKey) : undefined}
                      style={selected ? { backgroundColor: colors.highlightActive } : null}
                      testID={testID ? `${testID}-ayah-${verse.verseKey}` : undefined}
                    >
                      {verse.textUthmani}
                    </Text>
                    {WORD_SPACE}
                    <AyahEndMark
                      active={selected}
                      number={verse.verseNumber}
                      onPress={onOpenActions ? () => onOpenActions(verse.verseKey) : undefined}
                      testID={testID ? `${testID}-marker-${verse.verseKey}` : undefined}
                    />
                  </Fragment>
                );
              })}
            </QuranText>
          </View>
        );
      })}
    </GoldFrame>
  );
}

// Splits a page's verses where a surah starts, so each surah's ayahs flow as one paragraph under its cartouche.
type SurahRun = [VerseRecord, ...VerseRecord[]];

function surahRuns(verses: readonly VerseRecord[]): SurahRun[] {
  const runs: SurahRun[] = [];
  for (const verse of verses) {
    const current = runs.at(-1);
    if (current === undefined || verse.verseNumber === 1) {
      runs.push([verse]);
    } else {
      current.push(verse);
    }
  }
  return runs;
}
