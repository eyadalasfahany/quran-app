import { router } from 'expo-router';
import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { ContentColumn } from '@/core/layout';
import { useOnline } from '@/core/network/useOnline';
import { goBackOr } from '@/core/navigation/go-back';
import { runDeviceContentSync } from '@/core/sync';
import { useTheme } from '@/core/theme';
import { IconButton, Screen } from '@/shared/ui';

import { CollectionRow } from '../components/CollectionRow';
import { HadithListHeader } from '../components/HadithListHeader';
import { HadithStateView } from '../components/HadithStateView';
import { collectionRowDataFor, orderCatalogEntries } from '../collection-row-data';
import { downloadStateFor, useHadithDownloads } from '../downloads';
import { useEnsureHadithExplanations, useHadithCatalog, useInstalledHadithCollections } from '../hooks';
import { hadithHref } from '../routes';

const SEARCH = { ios: 'magnifyingglass', android: 'search' } as const;
const BOOKMARK = { ios: 'bookmark', android: 'bookmark' } as const;
const DOWNLOADS = { ios: 'arrow.down.to.line', android: 'download' } as const;

/** The hadith collections list (frame HadithCollList): installed rows open, the others download from the sheet. */
export function HadithCollectionsScreen({ testID = 'screen-hadith-collections' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { ready } = useContentDb();
  const entries = useHadithCatalog();
  const installed = useInstalledHadithCollections();
  const byId = useHadithDownloads((state) => state.byId);
  const online = useOnline();
  useEnsureHadithExplanations();

  const ordered = useMemo(() => orderCatalogEntries(entries), [entries]);
  const installedByResource = useMemo(() => new Map(installed.map((collection) => [collection.resourceId, collection])), [installed]);
  // The header's downloads button targets the running download, else the first not-installed row in list order.
  const notInstalled = ordered.filter((entry) => !entry.installed);
  const runningId = ordered.find((entry) => byId[entry.resourceId]?.status === 'downloading')?.resourceId;
  const downloadsTarget = runningId ?? notInstalled[0]?.resourceId;

  const trailing = (
    <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
      <IconButton icon={SEARCH} label={t('hadith.list.search')} onPress={() => router.push(hadithHref.search)} testID="hadith-list-search" variant="raised" />
      <IconButton icon={BOOKMARK} label={t('hadith.saved.title')} onPress={() => router.push(hadithHref.saved)} testID="hadith-list-saved" variant="raised" />
      {notInstalled.length > 0 && downloadsTarget !== undefined ? (
        <IconButton
          icon={DOWNLOADS}
          label={t('hadith.list.downloads')}
          onPress={() => router.push(hadithHref.downloads(downloadsTarget))}
          testID="hadith-list-downloads"
          variant="raised"
        />
      ) : null}
    </View>
  );

  let body: ReactElement;
  if (!ready) {
    body = <HadithStateView kind="loading" />;
  } else if (ordered.length === 0) {
    body = online ? (
      <HadithStateView kind="error" onAction={() => void runDeviceContentSync()} />
    ) : (
      <HadithStateView kind="offlineEmpty" />
    );
  } else {
    body = (
      <ScrollView contentContainerStyle={{ gap: theme.space[3], paddingBottom: theme.space[8] }}>
        {ordered.map((entry) => {
          const collection = collectionRowDataFor(entry, installedByResource.get(entry.resourceId));
          const state = downloadStateFor(entry.resourceId, entry.installed, entry.packSizeBytes, !online, byId);
          const id = entry.resourceId;
          return (
            <CollectionRow
              collection={collection}
              key={id}
              onCancel={() => useHadithDownloads.getState().cancel(id)}
              onDownload={() => router.push(hadithHref.downloads(id))}
              onPress={() => {
                if (state.kind === 'installed' && collection.slug !== null) {
                  router.push(hadithHref.collection(collection.slug));
                }
              }}
              onRetry={() => {
                void useHadithDownloads.getState().start(id);
              }}
              state={state}
              testID={`hadith-collection-row-${id}`}
            />
          );
        })}
      </ScrollView>
    );
  }

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterList}>
        <View style={{ flex: 1, gap: theme.space[4], paddingTop: theme.space[2] }}>
          <HadithListHeader onBack={() => goBackOr(hadithHref.homeTab)} title={t('hadith.title')} trailing={trailing} />
          {body}
        </View>
      </ContentColumn>
    </Screen>
  );
}
