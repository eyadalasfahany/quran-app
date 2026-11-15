import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openContentDb } from '@/core/db/content/open';
import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';
import { AzkarReaderTopBar } from '@/features/azkar/components/AzkarReaderTopBar';
import { AzkarTextSizeControl } from '@/features/azkar/components/AzkarTextSizeControl';
import { useAzkarFontScale } from '@/features/azkar/data/hooks';
import { MiniPlayer } from '@/features/audio/components/MiniPlayer';
import { PlayerErrorNotice } from '@/features/audio/components/PlayerErrorNotice';
import { useRangePlayback } from '@/features/audio/hooks/useRangePlayback';
import { getChapter } from '@/features/reader/data/chapters';

import { DuaOpenInMushafButton } from '../components/DuaOpenInMushafButton';
import { DuaPagerControls } from '../components/DuaPagerControls';
import { DuaQuranPlayButton } from '../components/DuaQuranPlayButton';
import { DuaQuranSourceLine } from '../components/DuaQuranSourceLine';
import { DuaQuranText } from '../components/DuaQuranText';
import { DuaReaderActions } from '../components/DuaReaderActions';
import { DuaScrollRegion } from '../components/DuaScrollRegion';
import { type DuaPager } from '../data/category-pager';
import { getQuranicDuaVerses, neighbourQuranicDuas } from '../data/content-repository';
import { useQuranicDua } from '../data/hooks';
import type { QuranicDuaDetail } from '../data/model';
import { duaQuranShareText } from '../data/share-text';
import { verseRangeLabel } from '../data/verse-range';
import { duasHref, goBackOr } from '../routes';

function chapterName(surah: number, locale: 'ar' | 'en'): string {
  try {
    const { executor } = openContentDb();
    const chapter = getChapter(executor, surah);

    return chapter === undefined ? String(surah) : locale === 'ar' ? chapter.nameArabic : chapter.nameSimple;
  } catch {
    return String(surah);
  }
}

/** The pager of a Quranic dua opened outside a category (search, the list): the whole list, by its neighbours. */
function listPager(dua: QuranicDuaDetail): DuaPager {
  let neighbours: { previous: string | null; next: string | null } = { previous: null, next: null };
  try {
    const { executor } = openContentDb();
    neighbours = neighbourQuranicDuas(executor, dua.position);
  } catch {
    // No content database: the pager has no neighbours.
  }
  return {
    position: dua.position,
    total: dua.total,
    previousHref: neighbours.previous === null ? null : duasHref.quranDetail(neighbours.previous),
    nextHref: neighbours.next === null ? null : duasHref.quranDetail(neighbours.next),
  };
}

/**
 * Quranic dua detail (screens/, #DuaQuranDetail). Opened from a Duas category, it pages within that category
 * (`pager`, ADR 0091 decision 11) and is titled with the category's name. Opened from the list or search, it pages
 * through the whole list.
 */
export function DuaQuranDetailScreen({
  duaKey,
  pager,
  title,
  testID = 'screen-dua-quran-detail',
}: {
  duaKey: string;
  pager?: DuaPager;
  title?: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const dua = useQuranicDua(duaKey);
  const [fontScale, setFontScale] = useAzkarFontScale();
  const [textSizeOpen, setTextSizeOpen] = useState(false);
  // The dua's verse range, by its first and last verse key (ADR 0092 decision 3). Null until the dua is loaded.
  const play = useRangePlayback(
    dua === undefined ? null : `${dua.surah}:${dua.verseFrom}`,
    dua === undefined ? null : `${dua.surah}:${dua.verseTo ?? dua.verseFrom}`,
  );

  const verses = useMemo(() => {
    if (dua === undefined) {
      return [];
    }

    try {
      const { executor } = openContentDb();

      return getQuranicDuaVerses(executor, dua).map((verse) => ({ id: verse.id, textUthmani: verse.textUthmani }));
    } catch {
      return [];
    }
  }, [dua]);

  const readingPager = useMemo<DuaPager | null>(() => {
    if (pager !== undefined) {
      return pager;
    }
    return dua === undefined ? null : listPager(dua);
  }, [pager, dua]);

  const listTitle = title ?? t('duas.quran.listTitle');
  const closeFallback = pager === undefined ? duasHref.quranList : duasHref.home;

  if (dua === undefined || readingPager === null) {
    return (
      <Screen testID={testID}>
        <ContentColumn gutter={theme.size.gutterHome}>
          <AzkarReaderTopBar fraction={0} onClose={() => goBackOr(closeFallback)} progressText="" title={listTitle} />
        </ContentColumn>
      </Screen>
    );
  }

  const progressText = t('duas.quran.progress', {
    current: formatNumber(readingPager.position, locale),
    total: formatNumber(readingPager.total, locale),
  });
  const fraction = readingPager.total === 0 ? 0 : readingPager.position / readingPager.total;
  const surahName = chapterName(dua.surah, locale);
  const sourceLine = t('duas.quran.sourceLine', { surah: surahName, range: verseRangeLabel(dua.verseFrom, dua.verseTo, locale) });

  const onShare = () => {
    const source = t('duas.quran.shareSource', { surah: surahName, range: verseRangeLabel(dua.verseFrom, dua.verseTo, locale) });
    void Share.share({ message: duaQuranShareText(verses.map((verse) => verse.textUthmani), source) });
  };

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>
          <AzkarReaderTopBar
            fraction={fraction}
            onClose={() => goBackOr(closeFallback)}
            progressText={progressText}
            title={listTitle}
          />
          <DuaScrollRegion contentContainerStyle={{ justifyContent: 'center' }}>
            <DuaQuranText activeVerseId={play.activeVerseId} fontScale={fontScale} verses={verses} />
            <DuaQuranSourceLine text={sourceLine} />
          </DuaScrollRegion>
          {play.state === 'playing' ? <MiniPlayer variant="reader" /> : null}
          <DuaReaderActions
            duaKey={dua.duaKey}
            onShare={onShare}
            onTextSize={() => setTextSizeOpen((open) => !open)}
            play={<DuaQuranPlayButton onPress={play.toggle} state={play.state} />}
            textSizeOpen={textSizeOpen}
          />
          {play.errorCode === null ? null : <PlayerErrorNotice code={play.errorCode} />}
          {textSizeOpen ? <AzkarTextSizeControl onChange={setFontScale} value={fontScale} /> : null}
          <DuaPagerControls pager={readingPager}>
            <DuaOpenInMushafButton label={t('duas.quran.openInMushaf')} surah={dua.surah} verseFrom={dua.verseFrom} />
          </DuaPagerControls>
        </View>
      </ContentColumn>
    </Screen>
  );
}
