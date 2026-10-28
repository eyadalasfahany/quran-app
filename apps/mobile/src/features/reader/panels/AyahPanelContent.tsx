import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { openUserDb } from '@/core/db/user/open';
import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import type { UserStore } from '@/features/library/data';
import { UiText } from '@/shared/ui';

import type { PanelTab } from '../selection';
import { useReaderSettings } from '../settings';
import { AyahActionsPanel } from './AyahActionsPanel';
import { LiveAyahActionsPanel } from './LiveAyahActionsPanel';
import { PanelHeader } from './PanelHeader';
import { loadAyahPanelData, loadTafsirOptions, loadTafsirPassage, readAyahUserState } from './panel-data';
import { TafsirPanel, type TafsirPanelLayout } from './TafsirPanel';

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
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const fontScale = useReaderSettings((state) => state.fontScale);
  const savedTafsirId = useReaderSettings((state) => state.tafsirId);
  // Switching tafsir here is a reading choice, not a download choice, so it stays out of the settings.
  const [pickedTafsirId, setPickedTafsirId] = useState<number | null>(null);

  const executor = useMemo(
    () => (executorOverride === undefined ? openContentExecutor() : executorOverride),
    [executorOverride],
  );
  const live = useMemo(() => store === undefined && userDbAvailable(), [store]);
  const data = useMemo(() => (executor === null ? null : loadAyahPanelData(executor, verseKey)), [executor, verseKey]);
  const tafsirs = useMemo(
    () => (executor === null ? [] : loadTafsirOptions(executor, (id) => t('reader.tafsir.fallbackName', { id }))),
    [executor, t],
  );
  const installedTafsirIds = new Set(tafsirs.map((tafsir) => tafsir.resourceId));
  const tafsirIdInUse =
    (pickedTafsirId !== null && installedTafsirIds.has(pickedTafsirId) ? pickedTafsirId : null) ??
    (savedTafsirId !== null && installedTafsirIds.has(savedTafsirId) ? savedTafsirId : null) ??
    tafsirs[0]?.resourceId ??
    null;
  const passage = useMemo(
    () =>
      executor === null || data === null || tafsirIdInUse === null
        ? null
        : loadTafsirPassage(executor, tafsirIdInUse, data.verse),
    [data, executor, tafsirIdInUse],
  );

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
    surah: chapter === undefined ? verseKey : locale === 'ar' ? chapter.nameArabic : chapter.nameEn,
  });
  const actionsProps = {
    onOpenTafsir: onTabChange ? () => onTabChange('tafsir') : undefined,
    reference,
    testID: `${testID}-actions`,
    textUthmani: verse.textUthmani,
    verseId: verse.id,
    verseNumber: verse.verseNumber,
  };

  return (
    <View style={{ flex: 1, gap: theme.space[4] }} testID={testID}>
      <PanelHeader
        juz={verse.juz}
        onClose={onClose}
        page={verse.page}
        surahName={chapter?.nameArabic ?? verseKey}
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
            downloadTafsirId={savedTafsirId !== null && !installedTafsirIds.has(savedTafsirId) ? savedTafsirId : null}
            fontScale={fontScale}
            html={passage?.html ?? null}
            layout={layout}
            onDownload={(id) => useReaderSettings.getState().setTafsirId(id)}
            onNext={nextKey === undefined ? undefined : () => onVerseChange(nextKey)}
            onPrevious={previousKey === undefined ? undefined : () => onVerseChange(previousKey)}
            onSelect={setPickedTafsirId}
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
