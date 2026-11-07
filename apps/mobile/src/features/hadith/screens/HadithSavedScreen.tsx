import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { type ReactElement } from 'react';
import { ScrollView, View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { goBackOr } from '@/core/navigation/go-back';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';

import { HadithListHeader } from '../components/HadithListHeader';
import { HadithStateView } from '../components/HadithStateView';
import { SavedHadithRow } from '../components/SavedHadithRow';
import { UnverifiedNotice } from '../components/UnverifiedNotice';
import { useSavedHadithItems } from '../personal';
import { savedItemHref, toSavedRowData } from '../saved-row-data';
import { hadithHref } from '../routes';

/** Saved hadith, newest first (frames HadithCollSaved, HadithCollSavedEmpty, HadithCollSavedUnverified). */
export function HadithSavedScreen({ testID = 'screen-hadith-saved' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const items = useSavedHadithItems();
  const anyUnverified = items.some((item) => item.saved.unverified);

  let body: ReactElement;
  if (items.length === 0) {
    body = (
      <HadithStateView
        kind="savedEmpty"
        onAction={() => router.replace(hadithHref.home)}
        testID={`${testID}-empty`}
      />
    );
  } else {
    body = (
      <ScrollView contentContainerStyle={{ gap: theme.space[3], paddingBottom: theme.space[8] }}>
        {anyUnverified ? <UnverifiedNotice testID={`${testID}-notice`} /> : null}
        {items.map((item, index) => (
          <SavedHadithRow
            key={`${item.saved.collectionSlug}:${item.saved.hadithNumber}:${index}`}
            onPress={() => router.push(savedItemHref(item))}
            saved={toSavedRowData(item)}
            testID={`${testID}-row-${index}`}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.space[4], paddingTop: theme.space[2] }}>
          <HadithListHeader onBack={() => goBackOr(hadithHref.home)} title={t('hadith.saved.title')} />
          {body}
        </View>
      </ContentColumn>
    </Screen>
  );
}
