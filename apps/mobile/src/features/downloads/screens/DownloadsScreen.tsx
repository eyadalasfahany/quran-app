import type { Href } from 'expo-router';
import { inArray } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { openUserDb } from '@/core/db/user/open';
import { downloads as downloadsTable } from '@/core/db/user/schema';
import { ContentColumn } from '@/core/layout';
import { useLocale } from '@/core/i18n/useLocale';
import { goBackOr } from '@/core/navigation/go-back';
import { useTheme } from '@/core/theme';
import { cancelReciter, enqueueAll } from '@/features/audio/downloads/manager';
import { useDownloadProgress } from '@/features/audio/downloads/store';
import { useReciterCatalogue } from '@/features/audio/hooks/useReciterCatalogue';
import { reciterDisplayName } from '@/features/audio/reciter-list';
import { BackButton, Screen, UiText, useContrastColors } from '@/shared/ui';

import { DownloadsFooterNote } from '../components/DownloadsFooterNote';
import { MushafsTextSection } from '../components/MushafsTextSection';
import { ReciterStorageRow } from '../components/ReciterStorageRow';
import { StorageCard } from '../components/StorageCard';
import { useAudioStorageSummary } from '../hooks/useAudioStorageSummary';
import { useFontStorageBytes } from '../hooks/useFontStorageBytes';
import { useTafsirStorageSummary } from '../hooks/useTafsirStorageSummary';

export function DownloadsScreen({ testID = 'screen-downloads' }: { testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const colors = useContrastColors();
  const { ready } = useContentDb();
  const { reciters } = useReciterCatalogue(ready);

  const audio = useAudioStorageSummary();
  const { bytes: fontBytes, loading } = useFontStorageBytes();
  const tafsir = useTafsirStorageSummary();
  const totalBytes = audio.totalBytes + fontBytes + tafsir.totalBytes;

  const { db } = openUserDb();
  const { data: inProgressRows } = useLiveQuery(
    db
      .selectDistinct({ reciterResourceId: downloadsTable.reciterResourceId })
      .from(downloadsTable)
      .where(inArray(downloadsTable.status, ['queued', 'downloading', 'paused', 'waiting_wifi'])),
  );
  const activeReciterIds = new Set((inProgressRows ?? []).map((r) => r.reciterResourceId));

  const progressById = useDownloadProgress((s) => s.byId);
  const downloadingProgress = Object.values(progressById)[0] ?? 0;

  const reciterRows = audio.perReciter.map((r) => {
    const catalog = reciters.find((c) => c.resourceId === r.reciterResourceId);
    return {
      reciterResourceId: r.reciterResourceId,
      name: reciterDisplayName(catalog ?? { name: null, nameAr: null }, locale, t('listen.unnamed')),
      surahCount: r.surahCount,
      bytes: r.bytes,
    };
  });

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.space[4]}>
        <ScrollView contentContainerStyle={{ gap: theme.space[4], paddingBottom: theme.space[8] }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }}>
            <BackButton onPress={() => goBackOr('/settings' as Href)} />
            <UiText accessibilityRole="header" variant="displayMd">
              {t('settings.listening.downloads')}
            </UiText>
          </View>

          <StorageCard
            audioBytes={audio.totalBytes}
            fontBytes={fontBytes}
            loading={loading}
            tafsirBytes={tafsir.totalBytes}
            totalBytes={totalBytes}
            testID="downloads-storage-card"
          />

          {reciterRows.length > 0 ? (
            <View style={{ gap: theme.space[1] + 2 }}>
              <UiText
                accessibilityRole="header"
                style={{ marginHorizontal: theme.space[1] + 2 }}
                tone="muted"
                variant="caption"
                weight={600}
              >
                {t('downloads.screen.reciters')}
              </UiText>
              <View
                style={{
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: colors.line,
                  borderRadius: theme.radius.lg,
                  borderWidth: theme.stroke.hairline,
                  overflow: 'hidden',
                }}
              >
                {reciterRows.map((row, index) => (
                  <ReciterStorageRow
                    bytes={row.bytes}
                    downloadProgress={activeReciterIds.has(row.reciterResourceId) ? downloadingProgress : 0}
                    isDownloading={activeReciterIds.has(row.reciterResourceId)}
                    key={row.reciterResourceId}
                    name={row.name}
                    onDownloadAll={() => enqueueAll(row.reciterResourceId)}
                    onStop={() => cancelReciter(row.reciterResourceId)}
                    showDivider={index < reciterRows.length - 1}
                    surahCount={row.surahCount}
                    testID={`reciter-storage-row-${row.reciterResourceId}`}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <MushafsTextSection tafsirs={tafsir.perTafsir} testID="downloads-mushaf-section" />

          <DownloadsFooterNote testID="downloads-footer-note" />
        </ScrollView>
      </ContentColumn>
    </Screen>
  );
}
