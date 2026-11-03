import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { openContentDb } from '@/core/db/content/open';
import { Screen, UiText } from '@/shared/ui';
import { AzkarDetailsSection } from '@/features/azkar/components/AzkarDetailsSection';
import { AzkarReaderControls } from '@/features/azkar/components/AzkarReaderControls';
import { AzkarReaderTopBar } from '@/features/azkar/components/AzkarReaderTopBar';

import { DuaHadithBody } from '../components/DuaHadithBody';
import { DuaLinkCard } from '../components/DuaLinkCard';
import { DuasAttributionLine } from '../components/DuasAttributionLine';
import { neighbourPropheticDuas } from '../data/content-repository';
import { usePropheticDua } from '../data/hooks';
import { duasHref, goBackOr } from '../routes';

/** Prophetic dua detail (quran-app-screens.html, #DuaHadithDetail). Text-only; no audio (ADR 0055 §3). */
export function DuaHadithDetailScreen({ duaKey, testID = 'screen-dua-hadith-detail' }: { duaKey: string; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const dua = usePropheticDua(duaKey);

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
          <AzkarReaderTopBar fraction={0} onClose={() => goBackOr(duasHref.hadithList)} progressText="" title={t('duas.hadith.detailTitle')} />
        </ContentColumn>
      </Screen>
    );
  }

  const progressText = t('duas.hadith.progress', {
    current: formatNumber(dua.index, locale),
    total: formatNumber(dua.total, locale),
  });
  const fraction = dua.total === 0 ? 0 : dua.index / dua.total;

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>
          <AzkarReaderTopBar fraction={fraction} onClose={() => goBackOr(duasHref.hadithList)} progressText={progressText} title={dua.title} />
          <ScrollView contentContainerStyle={{ flexGrow: 1, gap: theme.space[5], paddingBottom: theme.space[6], paddingTop: theme.space[4] }}>
            <DuaHadithBody attribution={dua.attribution} text={dua.hadeeth} />
            <View style={{ paddingHorizontal: theme.space[2] }}>
              <AzkarDetailsSection body={dua.grade} title={t('duas.hadith.grade')} />
              <AzkarDetailsSection body={dua.explanation} title={t('duas.hadith.explanation')} />
              <AzkarDetailsSection body={dua.reference} title={t('duas.hadith.reference')} />
              <AzkarDetailsSection body={dua.hints} title={t('duas.hadith.hints')} />
            </View>
            <DuaLinkCard links={dua.links} />
            <View style={{ gap: theme.space[2], paddingHorizontal: theme.space[2] }}>
              <DuasAttributionLine />
              <Pressable
                accessibilityLabel={t('duas.hadith.openSource')}
                accessibilityRole="link"
                onPress={() => void Linking.openURL(dua.sourceUrl)}
                testID="dua-hadith-open-source"
              >
                <UiText align="center" tone="brand" variant="caption" weight={600}>
                  {t('duas.hadith.openSource')}
                </UiText>
              </Pressable>
            </View>
          </ScrollView>
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
