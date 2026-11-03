import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Share, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { formatNumber } from '@/core/i18n';
import { useLocale } from '@/core/i18n/useLocale';
import { ContentColumn, useIsShortWindow, useWindowClass } from '@/core/layout';
import { useCatalogVersion } from '@/core/sync/catalog-version';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';

import { useAzkarPlayerStore, currentAzkarItem } from '../audio/azkarPlayerStore';
import { audioAvailability, isPlayableAvailability } from '../audio/availability';
import { azkarDownloadPort } from '../audio/port';
import { useIsDownloaded, useOnline } from '../audio/hooks';
import { claimAzkarPlay, pauseAzkarPlayback, resumeAzkarPlayback, stopAzkarPlayback } from '../audio/playback';
import { recordingForUnit } from '../audio/recording-for-unit';
import { buildAzkarQueue, queueStartIndex } from '../audio/queue';
import { startAzkarPlayback } from '../audio/start';
import { AzkarOfflinePill } from '../components/AzkarOfflinePill';
import { AzkarCompletion } from '../components/AzkarCompletion';
import { AzkarCounter } from '../components/AzkarCounter';
import { AzkarDetailsPanel } from '../components/AzkarDetailsPanel';
import { AzkarEnglishLine } from '../components/AzkarEnglishLine';
import { AzkarMarkCompleteButton } from '../components/AzkarMarkCompleteButton';
import { AzkarReaderActions } from '../components/AzkarReaderActions';
import { AzkarReaderControls } from '../components/AzkarReaderControls';
import { AzkarReaderTopBar } from '../components/AzkarReaderTopBar';
import { AzkarSourceLine } from '../components/AzkarSourceLine';
import { AzkarStepNote } from '../components/AzkarStepNote';
import { AzkarTapSurface } from '../components/AzkarTapSurface';
import { AzkarTextSizeControl } from '../components/AzkarTextSizeControl';
import { AzkarUnitMotion, type UnitDirection } from '../components/AzkarUnitMotion';
import { AzkarVariationSwitch } from '../components/AzkarVariationSwitch';
import { DhikrText } from '../components/DhikrText';
import { useAzkarFontScale, useCategoryUnits, useEntry, useScopeProgress, useVariationChoices } from '../data/hooks';
import { getCategory, getEntry, listRecordingsForItems } from '../data/content-repository';
import { quranSegmentKey, resolveQuranVerses } from '../data/quran-segments';
import { recordRecentScope } from '../data/recent-scopes';
import { periodKey, scopeKeyForCategory, scopeKeyForEntry, SESSION_UNIT_KEY } from '../data/progress';
import { markSessionComplete, recordTap, resetScope, resetUnit } from '../data/progress-repository';
import { azkarShareText } from '../data/share-text';
import { buildReaderUnits, type ReaderUnit } from '../data/reader-units';
import type { AzkarCategory, AzkarEntryDetail, AzkarRecording, AzkarSegment } from '../data/model';
import { markDiscovered } from '@/features/discover/store';

import { completeHaptic, tapHaptic } from '../haptics';
import { azkarHref, goBackOr } from '../routes';
import {
  allUnitsDone,
  completedUnitKeys,
  moveDirection,
  nextUnitIndex,
  readerProgress,
  referenceNumber,
  resolveReaderPosition,
  showsCounter,
  type ReaderView,
} from '../reader-model';

/** The category or single entry the reader walks through. */
export type AzkarReaderScope = { kind: 'category'; categoryId: string } | { kind: 'entry'; entryKey: string };

const PANEL_WIDTH = 340;
/**
 * The pause after a unit completes before the reader moves on, so the success haptic and the full ring are seen.
 * No motion token fits (the longest is 350 ms); Reduce Motion skips the pause.
 */
export const AUTO_ADVANCE_DELAY_MS = 600;

const AUDIO_PORT = azkarDownloadPort;

function safeCategory(db: SqlExecutor, categoryId: string): AzkarCategory | undefined {
  try {
    return categoryId.length === 0 ? undefined : getCategory(db, categoryId);
  } catch {
    return undefined;
  }
}

function safeEntry(db: SqlExecutor, entryKey: string): AzkarEntryDetail | undefined {
  try {
    return entryKey.length === 0 ? undefined : getEntry(db, entryKey);
  } catch {
    return undefined;
  }
}

function safeRecordings(db: SqlExecutor, itemIds: readonly number[]): AzkarRecording[] {
  try {
    return listRecordingsForItems(db, itemIds);
  } catch {
    return [];
  }
}

/** The repeat count of a unit whose body is one repeat group, or null. A count of 1 is not a repetition to show. */
function repeatCountFor(unit: ReaderUnit): number | null {
  const grouped = unit.body.length > 0 && unit.body.every((item) => item.repeatGroup !== null);
  return grouped && showsCounter(unit.requiredCount) ? unit.requiredCount : null;
}

/**
 * The Azkar reader (ADR 0031). It walks a category or one entry unit by unit, resumes at the first incomplete unit,
 * and records each accepted tap in user.db. The last unit leads to the completion screen. Play and pause sit in the
 * actions row; the reader follows the player to each dhikr (ADR 0031 §8, ADR 0047).
 */
export function AzkarReaderScreen({ scope, startUnitKey }: { scope: AzkarReaderScope; startUnitKey?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  // The catalogue revision: a catalogue write or pack import re-resolves the unit's Quran (see `quranVerses`).
  const catalogRevision = useCatalogVersion((state) => state.version);
  const windowClass = useWindowClass();
  // A short window (a landscape phone) gets the smaller counter, so the dhikr keeps room to read.
  const shortWindow = useIsShortWindow();
  const insets = useSafeAreaInsets();
  const { executor } = openContentDb();
  const { choices, choose } = useVariationChoices();
  const [fontScale, setFontScale] = useAzkarFontScale();
  const [textSizeOpen, setTextSizeOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [view, setView] = useState<ReaderView>(null);

  const categoryId = scope.kind === 'category' ? scope.categoryId : '';
  const entryKey = scope.kind === 'entry' ? scope.entryKey : '';

  const categoryUnits = useCategoryUnits(categoryId, locale, choices);
  const entry = useEntry(entryKey, choices);
  const entryUnits = useMemo(
    () =>
      entry === undefined
        ? []
        : buildReaderUnits(entry.entry.entryKey, entry.items, locale, {
            variations: entry.variations,
            activeVariation: entry.activeVariation,
          }),
    [entry, locale],
  );
  const units = scope.kind === 'category' ? categoryUnits : entryUnits;

  // Every recording of the scope's units, read in one query. A unit's recording is the first one on its body items.
  const scopeItemIds = useMemo(
    () => units.flatMap((unit) => [...unit.preface, ...unit.body, ...unit.afterword].map((item) => item.id)),
    [units],
  );
  const scopeRecordings = useMemo(
    () => safeRecordings(executor, scopeItemIds),
    // The catalogue revision re-reads the recordings after an import.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [executor, scopeItemIds, catalogRevision],
  );
  const recordingOf = useCallback(
    (unit: ReaderUnit) => recordingForUnit(scopeRecordings, unit.body.map((item) => item.id)),
    [scopeRecordings],
  );
  // The units that have a recording, in reader order: what the player plays and the reader follows.
  const queue = useMemo(() => buildAzkarQueue(units, recordingOf), [units, recordingOf]);

  const category = useMemo(() => safeCategory(executor, categoryId), [executor, categoryId]);
  const title =
    scope.kind === 'category'
      ? t(`azkar.categories.${categoryId}` as never)
      : entry?.entry.occasion
        ? t(`azkar.occasions.${entry.entry.occasion}` as never)
        : t('azkar.reader.entryTitle');

  const scopeKey = scope.kind === 'category' ? scopeKeyForCategory(categoryId) : scopeKeyForEntry(entryKey);
  const period = periodKey(category?.progressPeriod ?? 'session', new Date());
  const { data: rows } = useScopeProgress(scopeKey, period);
  const completed = useMemo(() => completedUnitKeys(rows), [rows]);
  const sessionMarked = rows.some((row) => row.itemKey === SESSION_UNIT_KEY && row.completedAt !== null);
  const sessionDone = allUnitsDone(units, completed);

  const startIndex = startUnitKey === undefined ? -1 : units.findIndex((unit) => unit.unitKey === startUnitKey);
  const position = resolveReaderPosition(view ?? (startIndex >= 0 ? startIndex : null), units, completed, sessionMarked);
  const total = units.length;
  const reduceMotion = useReducedMotion();

  // The player. Its state is read by selector, so a tick of the position re-renders only what shows it.
  const playerScope = useAzkarPlayerStore((state) => state.scope);
  const playerQueue = useAzkarPlayerStore((state) => state.queue);
  const playerIndex = useAzkarPlayerStore((state) => state.index);
  const playerStatus = useAzkarPlayerStore((state) => state.status);
  const engineOn = playerScope?.scopeKey === scopeKey && playerStatus !== 'idle';
  const playingItem = engineOn ? currentAzkarItem({ queue: playerQueue, index: playerIndex }) : null;

  // The pending auto-advance. Cancelled by any manual move, on blur and on unmount, so it never moves the reader later.
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The direction of the latest move, so the dhikr content slides the way the reader moved (AzkarUnitMotion). State, so
  // the slide reads it on the render that changes the unit.
  const [direction, setDirection] = useState<UnitDirection>(1);
  const cancelAdvance = useCallback(() => {
    if (advanceTimer.current !== undefined) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = undefined;
    }
  }, []);
  useEffect(() => cancelAdvance, [cancelAdvance]);
  // Opening a scope records it for Home's «آخر الأذكار» (capped at 10, newest first; ADR 0034 §3).
  useEffect(() => {
    recordRecentScope(scopeKey);
  }, [scopeKey]);
  // Leaving the reader (blur) cancels the pending move. Playback is not stopped by a blur: the full player is a sheet
  // over this reader, and a blur on its way up must not stop the audio.
  useFocusEffect(
    useCallback(
      () => () => {
        cancelAdvance();
      },
      [cancelAdvance],
    ),
  );
  // Leaving the reader for good (unmount) stops this scope's playback, so no audio plays from a screen the person left.
  useEffect(
    () => () => {
      if (useAzkarPlayerStore.getState().scope?.scopeKey === scopeKey) {
        stopAzkarPlayback();
      }
    },
    [scopeKey],
  );

  // The player moves the reader: when its dhikr changes (auto-advance or full-player skip), the reader follows
  // with the same transition as an auto-advance. A move the person makes in the reader does not move the player.
  const playingUnitKey = playingItem?.unitKey ?? null;
  // Applied during render when the player moves on, so the reader follows once per change and never loops.
  const [followedKey, setFollowedKey] = useState<string | null>(null);
  if (playingUnitKey !== followedKey) {
    setFollowedKey(playingUnitKey);
    const target = playingUnitKey === null ? -1 : units.findIndex((candidate) => candidate.unitKey === playingUnitKey);
    if (target !== -1) {
      setDirection(moveDirection(position.index, target));
      setView(target);
    }
  }

  const unit = position.finished ? undefined : units[position.index];
  const progress = readerProgress(position, total);
  const progressText = t('azkar.reader.progress', {
    current: formatNumber(progress.current, locale),
    total: formatNumber(total, locale),
  });

  const row = unit === undefined ? undefined : rows.find((candidate) => candidate.itemKey === unit.unitKey);
  const currentCount = row?.currentCount ?? 0;
  const unitDone = row !== undefined && row.completedAt !== null;

  const unitEntryKey = unit?.entryKey ?? '';
  const unitEntry = useMemo(() => safeEntry(executor, unitEntryKey), [executor, unitEntryKey]);
  // The unit's licensed recording, when one exists (ADR 0031 §8). Its download is in the actions row.
  const recording = unit === undefined ? null : recordingOf(unit);
  const reference = unitEntry?.entry.sourceReference.trim() ?? '';
  const sourceLine = t('azkar.share.source', { number: referenceNumber(reference, locale) });

  const online = useOnline();
  const downloaded = useIsDownloaded(recording, AUDIO_PORT);
  const availability = audioAvailability(recording, { online, downloaded });
  const showOffline = !engineOn && availability === 'stream_offline';

  function onPlayerToggle() {
    if (engineOn) {
      if (playerStatus === 'playing' || playerStatus === 'loading') {
        pauseAzkarPlayback();
      } else {
        resumeAzkarPlayback();
      }
      return;
    }
    const index = queueStartIndex(queue, position.index);
    if (index < 0) {
      return;
    }
    startAzkarPlayback({
      scope: { scopeKey, periodKey: period, title },
      queue,
      index,
      port: AUDIO_PORT,
    });
  }

  const playControl =
    recording !== null && (engineOn || isPlayableAvailability(availability))
      ? {
          playing: engineOn && playerStatus === 'playing',
          loading: engineOn && playerStatus === 'loading',
          onToggle: onPlayerToggle,
        }
      : null;

  // The unit's Quran, resolved from `verses` once per unit (and per locale and catalogue revision), never during render.
  // The share text and the dhikr blocks read these resolved verses, so a tap re-renders without SQL.
  const quranVerses = useMemo(
    () =>
      resolveQuranVerses(
        executor,
        unit === undefined ? [] : [...unit.preface, ...unit.body, ...unit.afterword],
      ),
    // Keyed on the unit and the locale: the unit's text changes only with them (and with the catalogue, below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [executor, unit?.unitKey, locale, catalogRevision],
  );
  const resolveVerses = (segment: AzkarSegment) => quranVerses.get(quranSegmentKey(segment)) ?? [];

  const onTap = () => {
    if (unit === undefined) {
      return;
    }
    const result = recordTap(scopeKey, period, unit.unitKey, unit.requiredCount);
    if (!result.accepted) {
      return;
    }
    // A tap that counts a repetition claims the play running for this dhikr, so the play's end does not count it again.
    claimAzkarPlay(unit.unitKey);
    // Pin the unit being read, so completing it does not move the reader on to the next incomplete one.
    setView(position.index);
    tapHaptic();
    // The first counted repetition ticks «الأذكار» (ADR 0053).
    markDiscovered('worship.azkar');
    if (result.completedNow) {
      completeHaptic();
      // Auto-advance to the next unit that is not done yet. When every unit is done, the reader moves to the last one,
      // where the mark-complete action shows. The live rows may not include this tap yet, so it is counted here.
      const done = new Set(completed);
      done.add(unit.unitKey);
      const target = nextUnitIndex(units, done, position.index);
      if (target !== position.index) {
        cancelAdvance();
        setDirection(moveDirection(position.index, target));
        if (reduceMotion) {
          setView(target);
        } else {
          advanceTimer.current = setTimeout(() => {
            advanceTimer.current = undefined;
            setView(target);
          }, AUTO_ADVANCE_DELAY_MS);
        }
      }
    }
  };

  const onReset = () => {
    if (unit !== undefined) {
      resetUnit(scopeKey, period, unit.unitKey);
    }
  };

  const restart = () => {
    cancelAdvance();
    resetScope(scopeKey, period);
    setDirection(1);
    setView(0);
  };

  const onMarkComplete = () => {
    cancelAdvance();
    markSessionComplete(scopeKey, period);
  };

  const moveTo = (index: number) => {
    cancelAdvance();
    setDirection(moveDirection(position.index, index));
    setView(index);
  };

  const onShare = () => {
    if (unit === undefined) {
      return;
    }
    void Share.share({ message: azkarShareText(unit, resolveVerses, sourceLine) });
  };

  const openDetails = () => {
    if (unit === undefined) {
      return;
    }
    if (windowClass === 'expanded') {
      setPanelOpen(true);
      return;
    }
    router.push(`/azkar/details/${encodeURIComponent(unit.entryKey)}` as Href);
  };

  const showPanel = windowClass === 'expanded' && panelOpen && unit !== undefined;
  // The completion screen and a reader with no unit ignore taps.
  const tapDisabled = unitDone || position.finished || unit === undefined;

  // The dhikr content slides in when the unit changes (AzkarUnitMotion). The key is the unit, so a move within it does not.
  // The tap surface sits inside the ScrollView, never around it: a Pressable that wraps a ScrollView takes the touch, so
  // a long dhikr on a short screen could not scroll. Inside it, a press that turns into a scroll is cancelled.
  const body =
    unit === undefined ? null : (
      <AzkarUnitMotion direction={direction} style={{ flex: 1 }} unitKey={unit.unitKey}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} testID="azkar-reader-scroll">
          <AzkarTapSurface
            disabled={tapDisabled}
            onTap={onTap}
            style={{ flexGrow: 1, gap: theme.space[5], justifyContent: 'center', paddingVertical: theme.space[5] }}
          >
            <View style={{ gap: theme.space[5] }}>
              <AzkarStepNote items={unit.preface} testID="azkar-preface" />
              {unit.variations.length > 1 ? (
                <AzkarVariationSwitch
                  activeVariation={unit.activeVariation}
                  onChange={(key) => choose(unit.entryKey, key)}
                  variations={unit.variations}
                />
              ) : null}
              <AzkarStepNote items={[]} repeatCount={repeatCountFor(unit)} testID="azkar-repeat" />
              {unit.body.map((item) => (
                <View key={item.itemKey} style={{ gap: theme.space[2] }}>
                  <DhikrText fontScale={fontScale} quranVerses={quranVerses} segments={item.segments} />
                  <AzkarEnglishLine text={locale === 'en' ? item.textEn : null} />
                </View>
              ))}
              <AzkarStepNote items={unit.afterword} testID="azkar-afterword" />
              {reference.length > 0 ? <AzkarSourceLine onPressDetails={openDetails} reference={reference} /> : null}
            </View>
            <AzkarReaderActions
              entryKey={unit.entryKey}
              onShare={onShare}
              onTextSize={() => setTextSizeOpen((open) => !open)}
              playControl={playControl}
              recording={recording}
              textSizeOpen={textSizeOpen}
            />
            {textSizeOpen ? <AzkarTextSizeControl onChange={setFontScale} value={fontScale} /> : null}
          </AzkarTapSurface>
        </ScrollView>
      </AzkarUnitMotion>
    );

  const reader = (
    // Every pixel of the reader that is not a button counts a tap: the top bar, the dhikr content (inside its ScrollView)
    // and the controls each have a tap surface.
    <View style={{ flex: 1 }}>
      <AzkarTapSurface disabled={tapDisabled} onTap={onTap} testID="azkar-tap-surface-top">
        <AzkarReaderTopBar fraction={progress.fraction} onClose={() => goBackOr(azkarHref.home)} progressText={progressText} title={title} />
      </AzkarTapSurface>
      {position.finished ? (
        <AzkarCompletion onBack={() => goBackOr(azkarHref.home)} onRestart={restart} progressText={progressText} title={title} />
      ) : (
        body
      )}
      {unit === undefined ? null : (
        <AzkarTapSurface
          disabled={tapDisabled}
          onTap={onTap}
          style={{ gap: theme.space[2], paddingBottom: insets.bottom + theme.space[4], paddingTop: theme.space[3] }}
          testID="azkar-tap-surface-controls"
        >
          {showOffline ? <AzkarOfflinePill /> : null}
          <AzkarReaderControls
            canNext={position.index < total - 1}
            canPrevious={position.finished || position.index > 0}
            onNext={() => moveTo(Math.min(position.index + 1, total - 1))}
            onPrevious={() => moveTo(position.finished ? total - 1 : Math.max(0, position.index - 1))}
          >
            {sessionDone && position.index === total - 1 ? (
              <AzkarMarkCompleteButton onPress={onMarkComplete} />
            ) : (
              // Every unit has the ring: a sourced count, a count of 1 (one tap completes it), or the single variant
              // for no sourced count (ADR 0031 §6).
              <AzkarCounter
                compact={shortWindow}
                completed={unitDone}
                onReset={onReset}
                onTap={onTap}
                position={position.index + 1}
                requiredCount={unit.requiredCount}
                value={currentCount}
              />
            )}
          </AzkarReaderControls>
        </AzkarTapSurface>
      )}
    </View>
  );

  return (
    <Screen surface="surfacePage" testID="azkar-reader-screen">
      <View style={{ flex: 1, flexDirection: 'row', gap: theme.space[4] }}>
        {showPanel && unit !== undefined ? (
          <View style={{ paddingVertical: theme.space[4], width: PANEL_WIDTH }}>
            <AzkarDetailsPanel entryKey={unit.entryKey} onClose={() => setPanelOpen(false)} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <ContentColumn>{reader}</ContentColumn>
        </View>
      </View>
    </Screen>
  );
}
