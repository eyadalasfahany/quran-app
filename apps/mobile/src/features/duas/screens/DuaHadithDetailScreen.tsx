import { Share, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openContentDb } from '@/core/db/content/open';
import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';
import { AzkarReaderTopBar } from '@/features/azkar/components/AzkarReaderTopBar';
import { AzkarTextSizeControl } from '@/features/azkar/components/AzkarTextSizeControl';
import { useAzkarFontScale } from '@/features/azkar/data/hooks';

import { DuaHadithBody } from '../components/DuaHadithBody';
import { DuaHadithNotes } from '../components/DuaHadithNotes';
import { DuaPagerControls } from '../components/DuaPagerControls';
import { DuaReaderActions } from '../components/DuaReaderActions';
import { DuaScrollRegion } from '../components/DuaScrollRegion';
import { type DuaPager } from '../data/category-pager';
import { neighbourPropheticDuas } from '../data/content-repository';
import { usePropheticDua } from '../data/hooks';
import type { PropheticDuaDetail } from '../data/model';
import { duaHadithShareText } from '../data/share-text';
import { duasHref, goBackOr } from '../routes';

/** The pager of a prophetic dua opened outside a category (search, favourites): the whole list, by its neighbours. */
function listPager(dua: PropheticDuaDetail): DuaPager {
  let neighbours: { previous: string | null; next: string | null } = { previous: null, next: null };
  try {
    const { executor } = openContentDb();
    neighbours = neighbourPropheticDuas(executor, dua.position);
  } catch {
    // No content database: the pager has no neighbours.
  }
  return {
    position: dua.index,
    total: dua.total,
    previousHref: neighbours.previous === null ? null : duasHref.hadithDetail(neighbours.previous),
    nextHref: neighbours.next === null ? null : duasHref.hadithDetail(neighbours.next),
  };
}

/**
 * Prophetic dua detail (screens/, #DuaHadithDetail). Text-only; no audio (ADR 0055 §3). Opened from a Duas category, it
 * pages within that category (`pager`, ADR 0091 decision 11) and is titled with the category's name. Opened from search
 * or favourites, it pages through the whole list.
 */
export function DuaHadithDetailScreen({
  duaKey,
  pager,
  title,
  testID = 'screen-dua-hadith-detail',
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
  const dua = usePropheticDua(duaKey);
  const [fontScale, setFontScale] = useAzkarFontScale();
  const [textSizeOpen, setTextSizeOpen] = useState(false);

  const readingPager = useMemo<DuaPager | null>(() => {
    if (pager !== undefined) {
      return pager;
    }
    return dua === undefined ? null : listPager(dua);
  }, [pager, dua]);

  const listTitle = title ?? t('duas.hadith.listTitle');
  const closeFallback = pager === undefined ? duasHref.hadithList : duasHref.home;

  if (dua === undefined || readingPager === null) {
    return (
      <Screen testID={testID}>
        <ContentColumn gutter={theme.size.gutterHome}>
          <AzkarReaderTopBar fraction={0} onClose={() => goBackOr(closeFallback)} progressText="" title={listTitle} />
        </ContentColumn>
      </Screen>
    );
  }

  const progressText = t('duas.hadith.progress', {
    current: formatNumber(readingPager.position, locale),
    total: formatNumber(readingPager.total, locale),
  });
  const fraction = readingPager.total === 0 ? 0 : readingPager.position / readingPager.total;
  // Each benefit is its own paragraph; the elements themselves are shown unchanged.
  const hints = dua.hints.length === 0 ? null : dua.hints.join('\n\n');

  // The share text keeps its credit lines, as before; this change touches the screen only.
  const credit = t('duas.hadith.credit', {
    number: formatNumber(Number(dua.duaKey.replace(/^hadeethenc:/, '')), locale),
  });
  const onShare = () => {
    void Share.share({
      message: duaHadithShareText({ hadeeth: dua.hadeeth, attribution: dua.attribution, credit, url: dua.sourceUrl }),
    });
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
          <DuaScrollRegion>
            <DuaHadithBody fontScale={fontScale} text={dua.hadeeth} />
            {/* Meaning and benefits only: the reference, the grade, the narrator line and every source credit are
                not shown (developer, 15 Nov 2026). The data stays in content.db and the share text. */}
            <DuaHadithNotes explanation={dua.explanation} hints={hints} />
          </DuaScrollRegion>
          <DuaReaderActions
            duaKey={dua.duaKey}
            onShare={onShare}
            onTextSize={() => setTextSizeOpen((open) => !open)}
            textSizeOpen={textSizeOpen}
          />
          {textSizeOpen ? <AzkarTextSizeControl onChange={setFontScale} value={fontScale} /> : null}
          <DuaPagerControls pager={readingPager} />
        </View>
      </ContentColumn>
    </Screen>
  );
}
