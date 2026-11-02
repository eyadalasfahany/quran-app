import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { useLocale } from '@/core/i18n/useLocale';
import { useOnline } from '@/core/network/useOnline';
import { ContentColumn, useTabContentBottom } from '@/core/layout';
import { ConfirmDialog, EmptyState, Screen, SkeletonGroup } from '@/shared/ui';
import { SurahRowSkeleton } from '@/features/library/components/SurahRowSkeleton';

import { ReciterPageActions } from '../components/ReciterPageActions';
import { ReciterPageHeader } from '../components/ReciterPageHeader';
import { ReciterSurahRow } from '../components/ReciterSurahRow';
import { needsVerification, useReciterDownloads as useReciterDownloadRows } from '../data/downloads';
import { cancel, enqueueAll, enqueueSurah, remove, removeReciter } from '../downloads/manager';
import { useDownloadProgress } from '../downloads/store';
import { useReciterCatalogue } from '../hooks/useReciterCatalogue';
import { useReciterSurahs } from '../hooks/useReciterSurahs';
import { recitationStyleKey } from '../player-view';
import { playSurahFromReciter } from '../reciter-playback';
import { downloadReciterPack, useReciterDownloads as usePackDownloads } from '../reciter-downloads';
import { reciterDisplayName } from '../reciter-list';

// The frame's 16 pt gutter.
const FRAME_GUTTER = 16;
const DELETE_ICON = { ios: 'trash', android: 'delete' } as const;
// While the pack installs, the surah list's place holds eight rows, each with its own name length.
const INSTALL_SKELETON_WIDTHS = ['58%', '46%', '64%', '52%', '60%', '44%', '56%', '50%'] as const;

// One reciter's page: the name, the count, the bulk actions and a row per surah (no frame; see
// ReciterPageHeader). It composes the components and wires the download manager and the player.
export function ReciterDownloadsScreen({ resourceId }: { resourceId: number }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const online = useOnline();
  const { ready } = useContentDb();
  const { reciters } = useReciterCatalogue(ready);
  const bottom = useTabContentBottom();
  const reciter = reciters.find((item) => item.resourceId === resourceId);
  const known = reciter !== undefined;
  const installed = reciter?.installed === true;
  const pack = usePackDownloads((state) => state.byId[resourceId]);
  const { surahs, total } = useReciterSurahs(resourceId, ready, installed);
  const { data: rows = [] } = useReciterDownloadRows(resourceId);
  const progressById = useDownloadProgress((state) => state.byId);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // The surah list comes from the reciter's pack, so the pack installs first. The effect runs once per reciter;
  // a failed install waits for «إعادة المحاولة» rather than retrying on every render.
  useEffect(() => {
    if (ready && known && !installed) {
      void downloadReciterPack(resourceId);
    }
  }, [ready, known, installed, resourceId]);

  const rowByChapter = new Map(rows.map((row) => [row.chapterId, row]));
  const downloaded = rows.filter((row) => row.status === 'done').length;
  const name = reciterDisplayName(reciter ?? { name: null, nameAr: null }, locale, t('listen.unnamed'));
  const styleKey = recitationStyleKey(reciter?.style ?? null);

  const back = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(main)/(listen)' as Href);
  };

  const confirmDeleteAll = () => {
    setDeleteOpen(true);
  };

  const retryInstall = () => {
    void downloadReciterPack(resourceId);
  };

  // While the pack installs, or when it could not, the list says so. A reciter that is not in the catalogue
  // says that instead.
  const emptyState = (() => {
    if (!ready) {
      return null;
    }
    if (!known) {
      return <EmptyState testID="reciter-not-found" title={t('listen.reciter.notFound')} />;
    }
    if (!installed) {
      return pack?.status === 'failed' ? (
        <EmptyState
          action={{ label: t('listen.reciter.retry'), onPress: retryInstall }}
          testID="reciter-install-failed"
          title={t('listen.reciter.installFailed')}
        />
      ) : (
        <SkeletonGroup testID="reciter-installing">
          {INSTALL_SKELETON_WIDTHS.map((width) => (
            <SurahRowSkeleton key={width} medallion={false} nameWidth={width} />
          ))}
        </SkeletonGroup>
      );
    }
    return null;
  })();

  const header = (
    <View style={{ gap: 12, paddingBottom: 12 }}>
      <ReciterPageHeader
        downloaded={downloaded}
        name={name}
        onBack={back}
        styleLabel={styleKey === null ? null : t(styleKey)}
        total={total}
      />
      {installed ? (
        <ReciterPageActions
          onDeleteAll={confirmDeleteAll}
          onDownloadAll={() => {
            enqueueAll(resourceId);
          }}
          showDelete={downloaded > 0}
        />
      ) : null}
    </View>
  );

  return (
    <Screen testID="screen-reciter">
      <ContentColumn gutter={FRAME_GUTTER}>
        <FlatList
          contentContainerStyle={{ paddingBottom: bottom }}
          data={installed ? surahs : []}
          keyExtractor={(chapter) => String(chapter.id)}
          ListEmptyComponent={emptyState ?? undefined}
          ListHeaderComponent={header}
          renderItem={({ item, index }) => {
            const row = rowByChapter.get(item.id);
            return (
              <ReciterSurahRow
                onCancel={() => {
                  if (row !== undefined) {
                    cancel(row.audioFileId);
                  }
                }}
                onDelete={() => {
                  if (row !== undefined) {
                    remove(row.audioFileId);
                  }
                }}
                onDownload={() => {
                  enqueueSurah(resourceId, item.id);
                }}
                onPlay={() => {
                  void playSurahFromReciter(resourceId, item.id);
                }}
                offline={!online}
                progress={row === undefined ? 0 : (progressById[row.audioFileId] ?? row.progress)}
                showDivider={index < surahs.length - 1}
                sizeBytes={row?.sizeBytes ?? null}
                status={row?.status}
                verifyNeeded={row !== undefined && needsVerification(row)}
                testID={`surah-row-${item.id}`}
                title={locale === 'ar' ? item.nameArabic : item.nameSimple}
              />
            );
          }}
          style={{ flex: 1 }}
          testID="reciter-downloads-list"
        />
      </ContentColumn>
      <ConfirmDialog
        cancelLabel={t('listen.reciter.cancel')}
        confirmLabel={t('listen.reciter.deleteConfirm')}
        destructive
        icon={DELETE_ICON}
        message={t('listen.reciter.deleteBody')}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          removeReciter(resourceId);
        }}
        testID="reciter-delete-dialog"
        title={t('listen.reciter.deleteTitle')}
        visible={deleteOpen}
      />
    </Screen>
  );
}
