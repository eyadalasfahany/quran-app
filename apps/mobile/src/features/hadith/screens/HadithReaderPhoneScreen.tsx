import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { View } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { ContentColumn } from '@/core/layout';
import { goBackOr } from '@/core/navigation/go-back';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';

import { HadithBrowseFallback } from '../components/HadithBrowseFallback';
import { HadithReaderContent } from '../components/HadithReaderContent';
import { useHadithCollection, useHadithReader } from '../hooks';
import { useHadithReaderActions } from '../reader-actions';
import { hadithHref } from '../routes';

export function HadithReaderPhoneScreen({
  slug,
  hadithNumber,
  testID = 'screen-hadith-reader',
}: {
  slug: string;
  hadithNumber: string;
  testID?: string;
}) {
  const theme = useTheme();
  const { ready } = useContentDb();
  const data = useHadithReader(slug, hadithNumber);
  const totalHadith = useHadithCollection(slug)?.totalHadith ?? null;
  const actions = useHadithReaderActions(slug, data, hadithNumber);

  const back = () => goBackOr(hadithHref.collection(slug));

  const go = (ref: { hadithNumber: string } | null) => {
    if (ref !== null) {
      router.replace(hadithHref.reader(slug, ref.hadithNumber));
    }
  };

  let body: ReactElement;
  if (!ready) {
    body = <HadithBrowseFallback kind="loading" onBack={back} />;
  } else if (data === undefined) {
    body = <HadithBrowseFallback kind="notFound" onBack={back} />;
  } else {
    body = (
      <HadithReaderContent
        data={data}
        onBack={back}
        onCopy={actions.onCopy}
        onNext={() => go(data.next)}
        onPrevious={() => go(data.previous)}
        onShare={actions.onShare}
        onToggleSave={actions.onToggleSave}
        saved={actions.saved}
        showHeader
        totalHadith={totalHadith}
      />
    );
  }

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterList}>
        <View style={{ flex: 1, paddingTop: theme.space[2] }}>{body}</View>
      </ContentColumn>
    </Screen>
  );
}
