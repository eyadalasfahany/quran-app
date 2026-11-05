import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openContentDb } from '@/core/db/content/open';
import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';
import { AzkarDetailsSection } from '@/features/azkar/components/AzkarDetailsSection';
import { AzkarReaderControls } from '@/features/azkar/components/AzkarReaderControls';
import { AzkarReaderTopBar } from '@/features/azkar/components/AzkarReaderTopBar';
import { AzkarTextSizeControl } from '@/features/azkar/components/AzkarTextSizeControl';
import { useAzkarFontScale } from '@/features/azkar/data/hooks';

import { DuaHadithBody } from '../components/DuaHadithBody';
import { DuaReaderActions } from '../components/DuaReaderActions';
import { DuaSourceLink } from '../components/DuaSourceLink';
import { neighbourPropheticDuas } from '../data/content-repository';
import { usePropheticDua } from '../data/hooks';
import { duaHadithShareText } from '../data/share-text';
import { duasHref, goBackOr } from '../routes';

/** Prophetic dua detail (quran-app-screens.html, #DuaHadithDetail). Text-only; no audio (ADR 0055 §3). */
export function DuaHadithDetailScreen({ duaKey, testID = 'screen-dua-hadith-detail' }: { duaKey: string; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const dua = usePropheticDua(duaKey);
  const [fontScale, setFontScale] = useAzkarFontScale();
  const [textSizeOpen, setTextSizeOpen] = useState(false);

  const neighbours = useMemo(() => {
    if (dua === undefined) {
      return { previous: null, next: null };
    }

    try {
      const { executor } = openContentDb();

      return neighbourPropheticDuas(executor, dua.position);
    } catch {
      return { previous: null, next: null };
    }
  }, [dua]);

  if (dua === undefined) {
    return (
      <Screen testID={testID}>
        <ContentColumn gutter={theme.size.gutterHome}>
          <AzkarReaderTopBar fraction={0} onClose={() => goBackOr(duasHref.hadithList)} progressText="" title={t('duas.hadith.listTitle')} />
        </ContentColumn>
      </Screen>
    );
  }

  const progressText = t('duas.hadith.progress', {
    current: formatNumber(dua.index, locale),
    total: formatNumber(dua.total, locale),
  });
  const fraction = dua.total === 0 ? 0 : dua.index / dua.total;
  // The HadeethEnc number is the part of the key after `hadeethenc:`.
  const credit = t('duas.hadith.credit', {
    number: formatNumber(Number(dua.duaKey.replace(/^hadeethenc:/, '')), locale),
  });
  // Each benefit is its own paragraph; the elements themselves are shown unchanged.
  const hints = dua.hints.length === 0 ? null : dua.hints.join('\n\n');

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
            onClose={() => goBackOr(duasHref.hadithList)}
            progressText={progressText}
            title={t('duas.hadith.listTitle')}
          />
          <ScrollView contentContainerStyle={{ flexGrow: 1, gap: theme.size.sectionGap, paddingBottom: theme.space[6], paddingTop: theme.space[4] }}>
            <DuaHadithBody attribution={dua.attribution} fontScale={fontScale} text={dua.hadeeth} />
            <View style={{ paddingHorizontal: theme.space[2] }}>
              <AzkarDetailsSection body={dua.explanation} caption={credit} title={t('duas.hadith.explanation')} />
              <AzkarDetailsSection body={dua.reference} caption={credit} title={t('duas.hadith.reference')} />
              <AzkarDetailsSection body={dua.grade} caption={credit} title={t('duas.hadith.grade')} />
              <AzkarDetailsSection body={hints} caption={credit} title={t('duas.hadith.hints')} />
              <DuaSourceLink url={dua.sourceUrl} />
            </View>
          </ScrollView>
          <DuaReaderActions
            duaKey={dua.duaKey}
            onShare={onShare}
            onTextSize={() => setTextSizeOpen((open) => !open)}
            textSizeOpen={textSizeOpen}
          />
          {textSizeOpen ? <AzkarTextSizeControl onChange={setFontScale} value={fontScale} /> : null}
          <AzkarReaderControls
            canNext={neighbours.next !== null}
            canPrevious={neighbours.previous !== null}
            onNext={() => neighbours.next !== null && router.replace(duasHref.hadithDetail(neighbours.next))}
            onPrevious={() => neighbours.previous !== null && router.replace(duasHref.hadithDetail(neighbours.previous))}
          >
            <View />
          </AzkarReaderControls>
        </View>
      </ContentColumn>
    </Screen>
  );
}
