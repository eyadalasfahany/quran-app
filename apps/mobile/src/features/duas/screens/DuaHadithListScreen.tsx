import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { EmptyState, Screen } from '@/shared/ui';
import { AzkarListCard } from '@/features/azkar/components/AzkarListCard';
import { AzkarScreenHeader } from '@/features/azkar/components/AzkarScreenHeader';
import { AzkarSectionTitle } from '@/features/azkar/components/AzkarSectionTitle';

import { DuasSourceRow } from '../components/DuasSourceRow';
import { usePropheticDuaSections } from '../data/hooks';
import { duasHref, goBackOr } from '../routes';

/** Prophetic duas grouped by HadeethEnc category (quran-app-screens.html, list companion to #DuaHadithDetail). */
export function DuaHadithListScreen({ testID = 'screen-dua-hadith-list' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const sections = usePropheticDuaSections();
  const totalItems = sections.reduce((count, section) => count + section.items.length, 0);

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <AzkarScreenHeader onBack={() => goBackOr(duasHref.home)} title={t('duas.hadith.listTitle')} />
        {totalItems === 0 ? (
          <EmptyState body={t('duas.hadith.emptyBody')} testID="dua-hadith-list-empty" title={t('duas.hadith.emptyTitle')} />
        ) : (
          <ScrollView contentContainerStyle={{ gap: theme.space[5], paddingBottom: theme.space[8] }}>
            {sections.map((section) => (
              <View key={section.groupId ?? 'ungrouped'} style={{ gap: theme.space[3] }}>
                {section.title ? <AzkarSectionTitle title={section.title} testID={`dua-hadith-group-${section.groupId}`} /> : null}
                <AzkarListCard>
                  {section.items.map((item, index) => (
                    <DuasSourceRow
                      detail={t('duas.hadith.rowDetail')}
                      key={item.duaKey}
                      onPress={() => router.push(duasHref.hadithDetail(item.duaKey))}
                      separator={index < section.items.length - 1}
                      testID={`dua-hadith-row-${item.duaKey}`}
                      title={item.title}
                    />
                  ))}
                </AzkarListCard>
              </View>
            ))}
          </ScrollView>
        )}
      </ContentColumn>
    </Screen>
  );
}
