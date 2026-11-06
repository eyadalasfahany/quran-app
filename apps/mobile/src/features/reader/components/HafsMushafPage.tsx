import { Fragment, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View, type HostInstance } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { quranFonts, useQuranFont, useTheme } from '@/core/theme';
import {
  AyahEndMark,
  GoldFrame,
  highlightFill,
  QuranText,
  SurahCartouche,
  useContrastColors,
  type HighlightColor,
} from '@/shared/ui';

import type { ChapterRecord } from '../data/chapters';
import type { VerseRecord } from '../data/verses';
import { MUSHAF_WORD_SPACE, surahRuns } from '../mushaf-paragraph';
import type { WordFollow } from '../useWordFollow';
import { BismillahLine } from './BismillahLine';
import { RecitedWords } from './RecitedWords';

/** Padding inside the double gold frame, from the Mushaf phone frame. */
const FRAME_CONTENT = {
  gap: 18,
  paddingBottom: 26,
  paddingHorizontal: 18,
  paddingTop: 22,
} as const;

// A justified paragraph's short last line follows the layout direction, and the shared Quran style's 'ltr' would put it
// on the left on Android. Right-aligned text keeps 'ltr', because iOS mirrors textAlign 'right' under 'rtl'.
const JUSTIFIED_PARAGRAPH = { direction: 'rtl', width: '100%' } as const;
const START_PARAGRAPH = { width: '100%' } as const;

export function HafsMushafPage({
  verses,
  chapters,
  fontScale = 1,
  recitedVerseKey = null,
  recitedWord = null,
  highlightsByVerseId,
  khatmaMarkerVerseId = null,
  onPressVerse,
  onOpenActions,
  focusVerseKey = null,
  onFocusRunLayout,
  follow,
  followKey = null,
  testID,
}: {
  verses: readonly VerseRecord[];
  chapters: ReadonlyMap<number, ChapterRecord>;
  fontScale?: number;
  /** The ayah the player is reciting. Ayah level only: the Mushaf text is one paragraph per surah. */
  recitedVerseKey?: string | null;
  /** The recited word's 1-based position in that ayah, when its timings have word segments. */
  recitedWord?: number | null;
  /** The reader's saved highlight colour per verse id. */
  highlightsByVerseId?: ReadonlyMap<number, HighlightColor>;
  khatmaMarkerVerseId?: number | null;
  onPressVerse?: (verseKey: string) => void;
  onOpenActions?: (verseKey: string) => void;
  /** The ayah the reader opened at. The surah paragraph holding it reports its view once laid out. */
  focusVerseKey?: string | null;
  onFocusRunLayout?: (run: HostInstance | null) => void;
  /** The word follow-scroll: the paragraph holding `followKey` reports its lines to it. */
  follow?: WordFollow;
  followKey?: string | null;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const focusRunRef = useRef<HostInstance>(null);
  const theme = useTheme();
  const font = useQuranFont();
  const colors = useContrastColors();

  return (
    <GoldFrame contentStyle={{ alignItems: 'center', ...FRAME_CONTENT }} testID={testID} variant="page">
      {surahRuns(verses).map((run) => {
        const [first] = run;
        // The paragraph holding the followed ayah reports its lines to the word follow-scroll.
        const followed = follow !== undefined && followKey !== null && run.some((verse) => verse.verseKey === followKey);
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
                variant="compact"
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
              {...(followed ? follow.textProps(first.verseKey) : undefined)}
              align={quranFonts[font].mushafAlign}
              fontScale={fontScale}
              style={quranFonts[font].mushafAlign === 'justify' ? JUSTIFIED_PARAGRAPH : START_PARAGRAPH}
              testID={testID ? `${testID}-text-${first.verseKey}` : undefined}
              variant="quranMushaf"
            >
              {run.map((verse, index) => {
                const recited = recitedVerseKey === verse.verseKey;
                const marked = recited;
                const khatmaMarked = khatmaMarkerVerseId === verse.id && !marked;
                // The reader's highlight colour fills the ayah; the selection wash shows only without one (ADR 0012).
                const highlight = highlightsByVerseId?.get(verse.id) ?? null;
                const background = highlightFill(colors, highlight) ?? (marked ? colors.highlightActive : undefined);
                const ayahLabel = t('ui.ayahNumber', { number: formatNumber(verse.verseNumber, locale) });
                const accessibilityLabel =
                  highlight === null
                    ? `${verse.textUthmani} ${ayahLabel}`
                    : `${verse.textUthmani} ${ayahLabel} ${t(`ui.highlight.${highlight}`)}`;
                return (
                  <Fragment key={verse.id}>
                    {index > 0 ? MUSHAF_WORD_SPACE : null}
                    <Text
                      accessibilityHint={recited ? t('player.nowPlaying') : undefined}
                      accessibilityLabel={accessibilityLabel}
                      accessibilityState={{ selected: marked }}
                      onLongPress={onOpenActions ? () => onOpenActions(verse.verseKey) : undefined}
                      onPress={onPressVerse ? () => onPressVerse(verse.verseKey) : undefined}
                      style={background === undefined ? null : { backgroundColor: background }}
                      testID={testID ? `${testID}-ayah-${verse.verseKey}` : undefined}
                    >
                      {recited && recitedWord !== null ? (
                        <RecitedWords
                          activeWord={recitedWord}
                          testID={testID ? `${testID}-ayah-${verse.verseKey}` : undefined}
                          text={verse.textUthmani}
                        />
                      ) : (
                        verse.textUthmani
                      )}
                    </Text>
                    {MUSHAF_WORD_SPACE}
                    <AyahEndMark
                      active={marked}
                      khatmaMarked={khatmaMarked}
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
