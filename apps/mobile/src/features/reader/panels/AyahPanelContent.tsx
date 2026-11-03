import { useMemo, useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { openUserDb } from '@/core/db/user/open';
import { formatNumber, type Locale } from '@/core/i18n';
import { runDeviceContentSync } from '@/core/sync';
import { useTheme } from '@/core/theme';
import { markDiscovered } from '@/features/discover/store';
import type { UserStore } from '@/features/library/data';
import { type DownloadRowState, UiText } from '@/shared/ui';

import type { PanelTab } from '../selection';
import { useReaderSettings } from '../settings';
import { AyahActionsPanel } from './AyahActionsPanel';
import { LiveAyahActionsPanel } from './LiveAyahActionsPanel';
import { PanelHeader } from './PanelHeader';
import {
  type CatalogTafsirOption,
  loadAyahPanelData,
  loadCatalogTafsirOptions,
  loadTafsirPassage,
  readAyahUserState,
} from './panel-data';
import { tafsirAuthorName, tafsirDisplayName, tafsirRowSubtitle } from './panel-text';
import type { TafsirDownloadItem } from './TafsirDownloadList';
import { useTafsirDownloads } from './tafsir-downloads';
import { TafsirPanel, type TafsirPanelLayout } from './TafsirPanel';
import { chapterDisplayName } from '@/features/reader/data/chapters';

function openContentExecutor(): SqlExecutor | null {
  try {
    return openContentDb().executor;
  } catch {
    return null;
  }
}

function userDbAvailable(): boolean {
  try {
    openUserDb();
    return true;
  } catch {
    return false;
  }
}

// One panel body for the side panel and the sheets: the header, then the chosen tab.
export function AyahPanelContent({
  verseKey,
  tab,
  onTabChange,
  onVerseChange,
  onClose,
  executor: executorOverride,
  store,
  layout = 'panel',
  onKhatmaMarked,
  testID = 'ayah-panel-content',
}: {
  verseKey: string;
  tab: PanelTab;
  // Lets the actions grid open the tafsir tab.
  onTabChange?: (tab: PanelTab) => void;
  // Previous and next ayah in the tafsir tab.
  onVerseChange: (verseKey: string) => void;
  // Sheets close from the header; the side panel has its own close.
  onClose?: () => void;
  // Tests pass their own content and user databases.
  executor?: SqlExecutor | null;
  store?: UserStore;
  // The side panel (the default) or a phone sheet; the tafsir tab lays out differently in each.
  layout?: TafsirPanelLayout;
  onKhatmaMarked?: ComponentProps<typeof AyahActionsPanel>['onKhatmaMarked'];
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const fontScale = useReaderSettings((state) => state.fontScale);
  const savedTafsirId = useReaderSettings((state) => state.tafsirId);
  const setSavedTafsirId = useReaderSettings((state) => state.setTafsirId);
  // Session override until it is persisted via `setSavedTafsirId` (chip or «عرض»).
  const [pickedTafsirId, setPickedTafsirId] = useState<number | null>(null);
  const [opened, setOpened] = useState<ReadonlySet<number>>(() => new Set());
  const [reloads, setReloads] = useState(0);
  const downloads = useTafsirDownloads((state) => state.byId);
  const installedVersion = useTafsirDownloads((state) => state.installedVersion);
  const startDownload = useTafsirDownloads((state) => state.start);
  const cancelDownload = useTafsirDownloads((state) => state.cancel);

  const executor = useMemo(
    () => (executorOverride === undefined ? openContentExecutor() : executorOverride),
    [executorOverride],
  );
  const live = useMemo(() => store === undefined && userDbAvailable(), [store]);
  const data = useMemo(() => (executor === null ? null : loadAyahPanelData(executor, verseKey)), [executor, verseKey]);
  // Re-read after an install (installedVersion) and after a retry sync (reloads). Both are only
  // dependencies, not inputs: the query reads the database directly.
  const tafsirs = useMemo(
    () => (executor === null ? [] : loadCatalogTafsirOptions(executor)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [executor, installedVersion, reloads],
  );
  // Tafsirs installed when the panel opened are readable from the start. Later installs wait for «عرض».
  const [initiallyInstalled] = useState(
    () => new Set(tafsirs.filter((tafsir) => tafsir.installed).map((tafsir) => tafsir.resourceId)),
  );
  const readableIds = tafsirs
    .filter((tafsir) => tafsir.installed && (initiallyInstalled.has(tafsir.resourceId) || opened.has(tafsir.resourceId)))
    .map((tafsir) => tafsir.resourceId);
  const mode = tafsirs.length === 0 ? 'offline' : readableIds.length === 0 ? 'list' : 'reading';
  const tafsirIdInUse =
    (pickedTafsirId !== null && tafsirs.some((tafsir) => tafsir.resourceId === pickedTafsirId) ? pickedTafsirId : null) ??
    (savedTafsirId !== null && readableIds.includes(savedTafsirId) ? savedTafsirId : null) ??
    readableIds[0] ??
    tafsirs[0]?.resourceId ??
    null;
  const selectedReadable = tafsirIdInUse !== null && readableIds.includes(tafsirIdInUse);
  // The tafsir in use is downloading (an update or a re-download of an installed one): its passage place pulses.
  const selectedDownloading = tafsirIdInUse !== null && downloads[tafsirIdInUse]?.status === 'downloading';
  const passage = useMemo(
    () =>
      executor === null || data === null || tafsirIdInUse === null || !selectedReadable
        ? null
        : loadTafsirPassage(executor, tafsirIdInUse, data.verse),
    [data, executor, selectedReadable, tafsirIdInUse],
  );

  const selectTafsir = (resourceId: number) => {
    const tafsir = tafsirs.find((row) => row.resourceId === resourceId);
    setPickedTafsirId(resourceId);
    if (tafsir?.installed) {
      setOpened((current) => new Set(current).add(resourceId));
      setSavedTafsirId(resourceId);
      markDiscovered('reader.tafsir');
    }
  };

  const openTafsir = (resourceId: number) => {
    setOpened((current) => new Set(current).add(resourceId));
    selectTafsir(resourceId);
  };
  const retrySync = () => {
    runDeviceContentSync()
      .catch(() => {})
      .finally(() => {
        setReloads((count) => count + 1);
      });
  };

  if (executor === null || data === null) {
    return (
      <View testID={testID}>
        <UiText accessibilityRole="header" variant="headline">
          {verseKey}
        </UiText>
      </View>
    );
  }

  const { verse, chapter, previousKey, nextKey } = data;
  const ayahNumber = formatNumber(verse.verseNumber, locale);
  const reference = t('reader.ayahPanel.reference', {
    ayah: ayahNumber,
    surah: chapter === undefined ? verseKey : chapterDisplayName(chapter, locale),
  });
  const downloadItem = (tafsir: CatalogTafsirOption): TafsirDownloadItem => {
    const entry = downloads[tafsir.resourceId];
    const state: DownloadRowState =
      entry?.status === 'downloading' ? 'downloading' : tafsir.installed ? 'installed' : 'available';
    // A failed download that could not reach the network says so; the download action retries it.
    const needsNetwork = entry?.status === 'failed' && entry.reason === 'network';
    return {
      progress: entry?.progress ?? 0,
      resourceId: tafsir.resourceId,
      state,
      subtitle: needsNetwork
        ? t('network.needsInternet')
        : tafsirRowSubtitle(
            { author: tafsirAuthorName(tafsir, locale), packSizeBytes: tafsir.packSizeBytes, status: entry?.status },
            t,
            locale,
          ),
      title: tafsirDisplayName(tafsir, locale, t('reader.tafsir.fallbackName', { id: tafsir.resourceId })),
    };
  };
  const downloadItems = tafsirs.map(downloadItem);
  const selectedOption = tafsirs.find((tafsir) => tafsir.resourceId === tafsirIdInUse);
  const selectedDownload =
    mode === 'reading' && selectedOption !== undefined && !selectedReadable ? downloadItem(selectedOption) : null;
  const actionsProps = {
    onKhatmaMarked,
    onOpenTafsir: onTabChange ? () => onTabChange('tafsir') : undefined,
    page: verse.page,
    reference,
    testID: `${testID}-actions`,
    textUthmani: verse.textUthmani,
    verseId: verse.id,
    verseKey: verse.verseKey,
    verseNumber: verse.verseNumber,
  };

  return (
    <View style={{ flex: 1, gap: theme.space[4] }} testID={testID}>
      <PanelHeader
        juz={verse.juz}
        onClose={onClose}
        page={verse.page}
        surahName={chapter === undefined ? verseKey : chapterDisplayName(chapter, locale)}
        tafsirSheet={layout === 'sheet' && tab === 'tafsir'}
        testID={`${testID}-header`}
        verseNumber={verse.verseNumber}
      />
      <View style={{ flex: 1 }}>
        {tab === 'actions' ? (
          live ? (
            <LiveAyahActionsPanel key={verse.id} {...actionsProps} />
          ) : (
            <AyahActionsPanel key={verse.id} {...actionsProps} {...readAyahUserState(verse.id, store)} store={store} />
          )
        ) : null}
        {tab === 'tafsir' ? (
          <TafsirPanel
            ayahLabel={`${verse.textImlaei ?? verse.textUthmani} ${t('ui.ayahNumber', { number: ayahNumber })}`}
            coverage={passage?.coverage ?? null}
            downloadItems={downloadItems}
            fontScale={fontScale}
            html={passage?.html ?? null}
            layout={layout}
            loading={selectedDownloading}
            mode={mode}
            onCancelDownload={cancelDownload}
            onDownloadTafsir={startDownload}
            onNext={nextKey === undefined ? undefined : () => onVerseChange(nextKey)}
            onOpenTafsir={openTafsir}
            onPrevious={previousKey === undefined ? undefined : () => onVerseChange(previousKey)}
            onRetry={retrySync}
            onSelect={selectTafsir}
            selectedDownload={selectedDownload}
            selectedId={tafsirIdInUse}
            tafsirs={tafsirs}
            testID={`${testID}-tafsir`}
            textUthmani={verse.textUthmani}
            verseNumber={verse.verseNumber}
          />
        ) : null}
      </View>
    </View>
  );
}
