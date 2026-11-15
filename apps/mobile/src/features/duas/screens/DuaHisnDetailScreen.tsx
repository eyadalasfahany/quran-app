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
import {
  buildReaderUnits,
  quranSegmentKey,
  resolveQuranVerses,
  useAzkarFontScale,
  useEntry,
  useVariationChoices,
} from '@/features/azkar/data';
import type { AzkarSegment } from '@/features/azkar/data/model';

import { DuaHisnBody } from '../components/DuaHisnBody';
import { DuaHisnReaderActions } from '../components/DuaHisnReaderActions';
import { DuaPagerControls } from '../components/DuaPagerControls';
import { DuaScrollRegion } from '../components/DuaScrollRegion';
import type { DuaPager } from '../data/category-pager';
import { duaHisnShareText } from '../data/share-text';
import { duasHref, goBackOr } from '../routes';

/**
 * A Hisn dua in Duas (screens/, #DuaHadithDetail; ADR 0091 decision 11). It shows the Azkar entry's text the way the
 * Azkar reader does, with the same layout as the prophetic dua: no counter, no source line, no details link, no audio.
 * It pages within its Duas category (`pager`). The favourite is the Azkar favourite of the entry.
 */
export function DuaHisnDetailScreen({
  entryKey,
  pager,
  title,
  testID = 'screen-dua-hisn-detail',
}: {
  entryKey: string;
  pager: DuaPager;
  title: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const { choices, choose } = useVariationChoices();
  const entry = useEntry(entryKey, choices);
  const [fontScale, setFontScale] = useAzkarFontScale();
  const [textSizeOpen, setTextSizeOpen] = useState(false);

  const units = useMemo(
    () =>
      entry === undefined
        ? []
        : buildReaderUnits(entry.entry.entryKey, entry.items, locale, {
            variations: entry.variations,
            activeVariation: entry.activeVariation,
          }),
    [entry, locale],
  );

  // Quran segments resolve from `verses` once per entry, as the Azkar reader does; nothing here reads SQL per render.
  const quranVerses = useMemo<ReadonlyMap<string, readonly string[]>>(() => {
    try {
      const { executor } = openContentDb();
      return resolveQuranVerses(
        executor,
        units.flatMap((unit) => [...unit.preface, ...unit.body, ...unit.afterword]),
      );
    } catch {
      return new Map();
    }
  }, [units]);

  if (entry === undefined) {
    return (
      <Screen testID={testID}>
        <ContentColumn gutter={theme.size.gutterHome}>
          <AzkarReaderTopBar fraction={0} onClose={() => goBackOr(duasHref.home)} progressText="" title={title} />
        </ContentColumn>
      </Screen>
    );
  }

  const progressText = t('duas.detail.progress', {
    current: formatNumber(pager.position, locale),
    total: formatNumber(pager.total, locale),
  });
  const fraction = pager.total === 0 ? 0 : pager.position / pager.total;

  const onShare = () => {
    const resolveQuran = (segment: AzkarSegment) => quranVerses.get(quranSegmentKey(segment)) ?? [];
    const items = units.flatMap((unit) => [...unit.preface, ...unit.body, ...unit.afterword]);
    void Share.share({ message: duaHisnShareText(items, resolveQuran) });
  };

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>
          <AzkarReaderTopBar
            fraction={fraction}
            onClose={() => goBackOr(duasHref.home)}
            progressText={progressText}
            title={title}
          />
          <DuaScrollRegion>
            <DuaHisnBody
              fontScale={fontScale}
              onChooseVariation={(variationKey) => choose(entryKey, variationKey)}
              quranVerses={quranVerses}
              units={units}
            />
          </DuaScrollRegion>
          <DuaHisnReaderActions
            entryKey={entryKey}
            onShare={onShare}
            onTextSize={() => setTextSizeOpen((open) => !open)}
            textSizeOpen={textSizeOpen}
          />
          {textSizeOpen ? <AzkarTextSizeControl onChange={setFontScale} value={fontScale} /> : null}
          <DuaPagerControls pager={pager} />
        </View>
      </ContentColumn>
    </Screen>
  );
}
