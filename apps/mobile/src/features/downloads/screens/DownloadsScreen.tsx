import type { Href } from 'expo-router';
import { inArray, max } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { openUserDb } from '@/core/db/user/open';
import { downloads as downloadsTable } from '@/core/db/user/schema';
import { ContentColumn } from '@/core/layout';
import { useLocale } from '@/core/i18n/useLocale';
import { goBackOr } from '@/core/navigation/go-back';
import { useTheme } from '@/core/theme';
import { cancelReciter, enqueueAll } from '@/features/audio/downloads/manager';
import { useReciterCatalogue } from '@/features/audio/hooks/useReciterCatalogue';
import { reciterDisplayName } from '@/features/audio/reciter-list';
import { Screen } from '@/shared/ui';

import { DownloadsFooterNote } from '../components/DownloadsFooterNote';
import { DownloadsHeader } from '../components/DownloadsHeader';
import { MushafsTextSection } from '../components/MushafsTextSection';
import { RecitersStorageSection, type ReciterStorageItem } from '../components/RecitersStorageSection';
import { StorageCard } from '../components/StorageCard';
import { useAudioStorageSummary } from '../hooks/useAudioStorageSummary';
import { useFontStorageBytes } from '../hooks/useFontStorageBytes';
import { useTafsirStorageSummary } from '../hooks/useTafsirStorageSummary';

const ACTIVE_STATUSES = ['queued', 'downloading', 'paused', 'waiting_wifi'] as const;

export function DownloadsScreen({ testID = 'screen-downloads' }: { testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const { ready } = useContentDb();
  const { reciters } = useReciterCatalogue(ready);

  const audio = useAudioStorageSummary();
  const { bytes: fontBytes, loading } = useFontStorageBytes();
  const tafsir = useTafsirStorageSummary();
  const totalBytes = audio.totalBytes + fontBytes + tafsir.totalBytes;

  const { db } = openUserDb();
  const { data: activeRows } = useLiveQuery(
    db
      .select({
        reciterResourceId: downloadsTable.reciterResourceId,
        progress: max(downloadsTable.progress),
      })
      .from(downloadsTable)
      .where(inArray(downloadsTable.status, [...ACTIVE_STATUSES]))
      .groupBy(downloadsTable.reciterResourceId),
  );

  const activeByReciter = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of activeRows ?? []) {
      map.set(row.reciterResourceId, Number(row.progress ?? 0));
    }
    return map;
  }, [activeRows]);

  const reciterRows: ReciterStorageItem[] = useMemo(() => {
    const byId = new Map<number, ReciterStorageItem>();

    for (const row of audio.perReciter) {
      const catalog = reciters.find((c) => c.resourceId === row.reciterResourceId);
      byId.set(row.reciterResourceId, {
        reciterResourceId: row.reciterResourceId,
        name: reciterDisplayName(catalog ?? { name: null, nameAr: null }, locale, t('listen.unnamed')),
        surahCount: row.surahCount,
        bytes: row.bytes,
        isDownloading: activeByReciter.has(row.reciterResourceId),
        downloadProgress: activeByReciter.get(row.reciterResourceId) ?? 0,
      });
    }

    for (const [reciterResourceId, progress] of activeByReciter) {
      if (byId.has(reciterResourceId)) {
        continue;
      }
      const catalog = reciters.find((c) => c.resourceId === reciterResourceId);
      byId.set(reciterResourceId, {
        reciterResourceId,
        name: reciterDisplayName(catalog ?? { name: null, nameAr: null }, locale, t('listen.unnamed')),
        surahCount: 0,
        bytes: 0,
        isDownloading: true,
        downloadProgress: progress,
      });
    }

    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [activeByReciter, audio.perReciter, locale, reciters, t]);

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.space[4]}>
        <ScrollView contentContainerStyle={{ gap: theme.space[4], paddingBottom: theme.space[8] }}>
          <DownloadsHeader
            onBack={() => goBackOr('/settings' as Href)}
            title={t('settings.listening.downloads')}
          />

          <StorageCard
            audioBytes={audio.totalBytes}
            fontBytes={fontBytes}
            loading={loading}
            tafsirBytes={tafsir.totalBytes}
            totalBytes={totalBytes}
            testID="downloads-storage-card"
          />

          <RecitersStorageSection
            onDownloadAll={enqueueAll}
            onStop={cancelReciter}
            rows={reciterRows}
          />

          <MushafsTextSection tafsirs={tafsir.perTafsir} testID="downloads-mushaf-section" />

          <DownloadsFooterNote testID="downloads-footer-note" />
        </ScrollView>
      </ContentColumn>
    </Screen>
  );
}
