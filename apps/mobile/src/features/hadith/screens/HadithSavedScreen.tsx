import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { goBackOr } from '@/core/navigation/go-back';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';

import { HadithListHeader } from '../components/HadithListHeader';
import { SavedHadithList } from '../components/SavedHadithList';
import { useSavedHadithItems } from '../personal';
import { savedItemHref } from '../saved-row-data';
import { hadithHref } from '../routes';

/** Saved hadith, newest first (frames HadithCollSaved, HadithCollSavedEmpty, HadithCollSavedUnverified). */
export function HadithSavedScreen({ testID = 'screen-hadith-saved' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const hasItems = useSavedHadithItems().length > 0;

  const list = (
    <SavedHadithList
      onEmptyAction={() => router.replace(hadithHref.home)}
      onOpen={(item) => router.push(savedItemHref(item))}
      testID={testID}
    />
  );

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterList}>
        <View style={{ flex: 1, gap: theme.space[4], paddingTop: theme.space[2] }}>
          <HadithListHeader onBack={() => goBackOr(hadithHref.home)} title={t('hadith.saved.title')} />
          {/* The empty state is centred outside the scroll view; the list scrolls. */}
          {hasItems ? (
            <ScrollView contentContainerStyle={{ gap: theme.space[3], paddingBottom: theme.space[8] }}>{list}</ScrollView>
          ) : (
            list
          )}
        </View>
      </ContentColumn>
    </Screen>
  );
}
