import { router } from 'expo-router';
import { useCallback, useEffect, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useContentDb } from '@/core/db/content/open';
import { useLocale } from '@/core/i18n/useLocale';
import { useOnline } from '@/core/network/useOnline';
import { goBackOr } from '@/core/navigation/go-back';
import { useAudioSettings, setWifiOnlyDownloads } from '@/features/audio/settings';
import { SheetFrame } from '@/features/reader/components/SheetFrame';
import { SheetScrollView } from '@/features/reader/components/SheetScrollView';
import { useSheet } from '@/features/reader/components/sheet-context';
import { SheetHeader } from '@/shared/ui';

import { HadithDownloadSheet } from '../components/HadithDownloadSheet';
import { HadithStateView } from '../components/HadithStateView';
import { collectionRowDataFor } from '../collection-row-data';
import { downloadStateFor, useHadithDownloads } from '../downloads';
import { useHadithCatalog, useInstalledHadithCollections } from '../hooks';
import { hadithHref } from '../routes';
import { collectionTitle, coverTitle } from '../titles';

const SHEET_PADDING_H = 18;
const SHEET_PADDING_TOP = 14;
const SHEET_PADDING_BOTTOM = 20;
const SHEET_GAP = 14;

/**
 * The download sheet for one catalogue resource (frame HadithCollDownload). It starts nothing by itself: the sheet's
 * button starts the install. It closes when the collection becomes installed.
 */
export function HadithDownloadSheetScreen({
  resourceId,
  testID = 'screen-hadith-downloads',
}: {
  resourceId: number | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const sheet = useSheet();
  const { ready } = useContentDb();
  const entries = useHadithCatalog();
  const installed = useInstalledHadithCollections();
  const byId = useHadithDownloads((state) => state.byId);
  const wifiOnly = useAudioSettings((state) => state.wifiOnlyDownloads);
  const online = useOnline();

  const entry = resourceId === null ? undefined : entries.find((item) => item.resourceId === resourceId);
  const installedNow = entry?.installed === true;

  const close = useCallback(() => {
    if (sheet === null) {
      goBackOr(hadithHref.home);
    } else {
      sheet.close();
    }
  }, [sheet]);

  useEffect(() => {
    if (installedNow) {
      close();
    }
  }, [installedNow, close]);

  const closeHeader = (
    <SheetHeader
      closeLabel={t('hadith.download.close')}
      onClose={close}
      testID={`${testID}-header`}
      title={t('hadith.download.sheetTitle')}
    />
  );

  let content: ReactElement;
  if (!ready) {
    content = (
      <>
        {closeHeader}
        <HadithStateView kind="loading" />
      </>
    );
  } else if (entry === undefined) {
    content = (
      <>
        {closeHeader}
        <HadithStateView kind="notFound" onAction={() => router.replace(hadithHref.home)} />
      </>
    );
  } else {
    const row = collectionRowDataFor(entry, installed.find((collection) => collection.resourceId === entry.resourceId));
    content = (
      <HadithDownloadSheet
        coverTitle={coverTitle(row, locale)}
        onCancel={() => useHadithDownloads.getState().cancel(entry.resourceId)}
        onClose={close}
        onDownload={() => {
          void useHadithDownloads.getState().start(entry.resourceId);
        }}
        onRetry={() => {
          void useHadithDownloads.getState().start(entry.resourceId);
        }}
        onWifiOnlyChange={setWifiOnlyDownloads}
        sizeBytes={entry.packSizeBytes}
        slug={row.slug}
        state={downloadStateFor(entry.resourceId, entry.installed, entry.packSizeBytes, !online, byId)}
        title={collectionTitle(row, locale, t)}
        waitingForWifi={byId[entry.resourceId]?.reason === 'wifi'}
        wifiOnly={wifiOnly}
      />
    );
  }

  return (
    <SheetFrame grabber="muted" testID={testID}>
      <SheetScrollView
        contentContainerStyle={{
          gap: SHEET_GAP,
          paddingBottom: SHEET_PADDING_BOTTOM,
          paddingHorizontal: SHEET_PADDING_H,
          paddingTop: SHEET_PADDING_TOP,
        }}
        style={{ flex: 1 }}
      >
        {content}
      </SheetScrollView>
    </SheetFrame>
  );
}
