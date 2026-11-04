import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openContentDb } from '@/core/db/content/open';
import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';
import { AzkarReaderControls } from '@/features/azkar/components/AzkarReaderControls';
import { AzkarReaderTopBar } from '@/features/azkar/components/AzkarReaderTopBar';
import { getChapter } from '@/features/reader/data/chapters';

import { DuaOpenInMushafButton } from '../components/DuaOpenInMushafButton';
import { DuaQuranText } from '../components/DuaQuranText';
import { getQuranicDuaVerses, neighbourQuranicDuas } from '../data/content-repository';
import { useQuranicDua } from '../data/hooks';
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

/** Quranic dua detail (quran-app-screens.html, #DuaQuranDetail). */
export function DuaQuranDetailScreen({ duaKey, testID = 'screen-dua-quran-detail' }: { duaKey: string; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const dua = useQuranicDua(duaKey);

  const verses = useMemo(() => {
    if (dua === undefined) {
      return [];
    }

    try {
      const { executor } = openContentDb();

      return getQuranicDuaVerses(executor, dua).map((verse) => verse.textUthmani);
    } catch {
      return [];
    }
  }, [dua]);

  const neighbours = useMemo(() => {
    if (dua === undefined) {
      return { previous: null, next: null };
    }

    try {
      const { executor } = openContentDb();

      return neighbourQuranicDuas(executor, dua.position);
    } catch {
      return { previous: null, next: null };
    }
  }, [dua]);

  if (dua === undefined) {
    return (
      <Screen testID={testID}>
        <ContentColumn gutter={theme.size.gutterHome}>
          <AzkarReaderTopBar fraction={0} onClose={() => goBackOr(duasHref.quranList)} progressText="" title={t('duas.quran.detailTitle')} />
        </ContentColumn>
      </Screen>
    );
  }

  const progressText = t('duas.quran.progress', {
    current: formatNumber(dua.position, locale),
    total: formatNumber(dua.total, locale),
  });
  const fraction = dua.total === 0 ? 0 : dua.position / dua.total;
  const title = chapterName(dua.surah, locale);

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>
          <AzkarReaderTopBar fraction={fraction} onClose={() => goBackOr(duasHref.quranList)} progressText={progressText} title={title} />
          <ScrollView contentContainerStyle={{ flexGrow: 1, gap: theme.space[5], paddingBottom: theme.space[6], paddingTop: theme.space[4] }}>
            <DuaQuranText verses={verses} />
            <View style={{ paddingHorizontal: theme.space[2] }}>
              <DuaOpenInMushafButton label={t('duas.quran.openInMushaf')} surah={dua.surah} verseFrom={dua.verseFrom} />
            </View>
          </ScrollView>
          <AzkarReaderControls
            canNext={neighbours.next !== null}
            canPrevious={neighbours.previous !== null}
            onNext={() => neighbours.next !== null && router.replace(duasHref.quranDetail(neighbours.next))}
            onPrevious={() => neighbours.previous !== null && router.replace(duasHref.quranDetail(neighbours.previous))}
          >
            <View />
          </AzkarReaderControls>
        </View>
      </ContentColumn>
    </Screen>
  );
}
