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
import { ContentColumn, useWindowClass } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';

import { useAzkarAutoplay } from '../audio/hooks';
import { recordingForUnit } from '../audio/recording-for-unit';
import { stopAzkarRecording } from '../audio/playback';
import { AzkarAudioPlayer } from '../components/AzkarAudioPlayer';
import { AzkarCompletion } from '../components/AzkarCompletion';
import { AzkarCounter } from '../components/AzkarCounter';
import { AzkarDetailsPanel } from '../components/AzkarDetailsPanel';
import { AzkarDoneButton } from '../components/AzkarDoneButton';
import { AzkarEnglishLine } from '../components/AzkarEnglishLine';
import { AzkarMarkCompleteButton } from '../components/AzkarMarkCompleteButton';
import { AzkarReaderActions } from '../components/AzkarReaderActions';
import { AzkarReaderControls } from '../components/AzkarReaderControls';
import { AzkarReaderTopBar } from '../components/AzkarReaderTopBar';
import { AzkarSourceLine } from '../components/AzkarSourceLine';
import { AzkarStepNote } from '../components/AzkarStepNote';
import { AzkarTapSurface } from '../components/AzkarTapSurface';
import { AzkarTextSizeControl } from '../components/AzkarTextSizeControl';
import { AzkarVariationSwitch } from '../components/AzkarVariationSwitch';
import { DhikrText } from '../components/DhikrText';
import { useAzkarFontScale, useCategoryUnits, useEntry, useScopeProgress, useVariationChoices } from '../data/hooks';
import { getCategory, getEntry, getQuranSegmentVerses } from '../data/content-repository';
import { recordRecentScope } from '../data/recent-scopes';
import { periodKey, scopeKeyForCategory, scopeKeyForEntry, SESSION_UNIT_KEY } from '../data/progress';
import { markSessionComplete, recordTap, resetScope, resetUnit } from '../data/progress-repository';
import { azkarShareText } from '../data/share-text';
import { buildReaderUnits, type ReaderUnit } from '../data/reader-units';
import type { AzkarCategory, AzkarEntryDetail } from '../data/model';
import { completeHaptic, tapHaptic } from '../haptics';
import { azkarHref, goBackOr } from '../routes';
import {
  allUnitsDone,
  completedUnitKeys,
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

/** The repeat count of a unit whose body is one repeat group, or null. A count of 1 is not a repetition to show. */
function repeatCountFor(unit: ReaderUnit): number | null {
  const grouped = unit.body.length > 0 && unit.body.every((item) => item.repeatGroup !== null);
  return grouped && showsCounter(unit.requiredCount) ? unit.requiredCount : null;
}

/**
 * The Azkar reader (ADR 0031). It walks a category or one entry unit by unit, resumes at the first incomplete unit,
 * and records each accepted tap in user.db. The last unit leads to the completion screen.
 */
export function AzkarReaderScreen({ scope, startUnitKey }: { scope: AzkarReaderScope; startUnitKey?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const windowClass = useWindowClass();
  const insets = useSafeAreaInsets();
  const { executor } = openContentDb();
  const { choices, choose } = useVariationChoices();
  const [fontScale, setFontScale] = useAzkarFontScale();
  const [textSizeOpen, setTextSizeOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [view, setView] = useState<ReaderView>(null);
  const [autoplay, setAutoplay] = useAzkarAutoplay();
  // Set when the reader advanced from a unit whose recording ended with «تشغيل تلقائي» on; the next unit starts its own.
  const [autoStartAudio, setAutoStartAudio] = useState(false);
  const clearAutoStart = useCallback(() => setAutoStartAudio(false), []);

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

  // The pending auto-advance. Cancelled by any manual move, on blur and on unmount, so it never moves the reader later.
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
  // Leaving the reader (blur) cancels the pending move and stops any recording it started.
  useFocusEffect(
    useCallback(
      () => () => {
        cancelAdvance();
        stopAzkarRecording();
      },
      [cancelAdvance],
    ),
  );
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
  // The unit's licensed recording, when one exists (none today; ADR 0031 §8).
  const recording = unit === undefined ? null : recordingForUnit(unitEntry?.recordings ?? [], unit.body.map((item) => item.id));
  // A recording that ends moves the reader on only with «تشغيل تلقائي» on. The playback module holds a stable callback,
  // so this ref keeps it pointed at the latest position and preference. It never counts a tap.
  const advanceFromAudio = useRef<() => void>(() => undefined);
  useEffect(() => {
    advanceFromAudio.current = () => {
      if (!autoplay || position.index >= total - 1) {
        return;
      }
      cancelAdvance();
      setAutoStartAudio(true);
      setView(position.index + 1);
    };
  });
  const onAudioEnded = useCallback(() => advanceFromAudio.current(), []);
  useEffect(() => {
    if (recording === null) {
      setAutoStartAudio(false);
    }
  }, [recording]);
  const reference = unitEntry?.entry.sourceReference.trim() ?? '';
  const sourceLine = t('azkar.share.source', { number: referenceNumber(reference, locale) });

  const resolveVerses = (segment: Parameters<typeof getQuranSegmentVerses>[1]) =>
    getQuranSegmentVerses(executor, segment).map((verse) => verse.textUthmani);

  const onTap = () => {
    if (unit === undefined) {
      return;
    }
    const result = recordTap(scopeKey, period, unit.unitKey, unit.requiredCount);
    if (!result.accepted) {
      return;
    }
    // Pin the unit being read, so completing it does not move the reader on to the next incomplete one.
    setView(position.index);
    tapHaptic();
    if (result.completedNow) {
      completeHaptic();
      // Auto-advance to the next unit; the last unit stays put with the «إتمام» action.
      if (position.index < total - 1) {
        cancelAdvance();
        const next = position.index + 1;
        if (reduceMotion) {
          setView(next);
        } else {
          advanceTimer.current = setTimeout(() => {
            advanceTimer.current = undefined;
            setView(next);
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
    setView(0);
  };

  const onMarkComplete = () => {
    cancelAdvance();
    markSessionComplete(scopeKey, period);
  };

  const moveTo = (index: number) => {
    cancelAdvance();
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

  // A sourced count of 1 is one recitation: «تم», never «١ من ١» (ADR 0031 §6). Only a count above 1 gets the counter.
  const counted = unit !== undefined && showsCounter(unit.requiredCount);
  const showPanel = windowClass === 'expanded' && panelOpen && unit !== undefined;

  const body =
    unit === undefined ? null : (
      <ScrollView contentContainerStyle={{ flexGrow: 1, gap: theme.space[5], justifyContent: 'center', paddingVertical: theme.space[5] }}>
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
              <DhikrText fontScale={fontScale} resolveQuran={(segment) => resolveVerses(segment).join(' ')} segments={item.segments} />
              <AzkarEnglishLine text={locale === 'en' ? item.textEn : null} />
            </View>
          ))}
          <AzkarStepNote items={unit.afterword} testID="azkar-afterword" />
          {reference.length > 0 ? <AzkarSourceLine onPressDetails={openDetails} reference={reference} /> : null}
        </View>
        <AzkarReaderActions
          entryKey={unit.entryKey}
          onAudioEnded={onAudioEnded}
          onShare={onShare}
          onTextSize={() => setTextSizeOpen((open) => !open)}
          recording={recording}
          textSizeOpen={textSizeOpen}
          unitKey={unit.unitKey}
        />
        {recording === null ? null : (
          <AzkarAudioPlayer
            autoStart={autoStartAudio}
            autoplay={autoplay}
            key={unit.unitKey}
            onAutoStarted={clearAutoStart}
            onAutoplayChange={setAutoplay}
            onEnded={onAudioEnded}
            recording={recording}
            unitKey={unit.unitKey}
          />
        )}
        {textSizeOpen ? <AzkarTextSizeControl onChange={setFontScale} value={fontScale} /> : null}
      </ScrollView>
    );

  const reader = (
    // Every pixel of the reader that is not a button counts a tap (the surface wraps the whole column). The completion
    // screen and a reader with no unit are disabled.
    <AzkarTapSurface disabled={unitDone || position.finished || unit === undefined} onTap={onTap} style={{ flex: 1 }}>
      <AzkarReaderTopBar fraction={progress.fraction} onClose={() => goBackOr(azkarHref.home)} progressText={progressText} title={title} />
      {position.finished ? (
        <AzkarCompletion onBack={() => goBackOr(azkarHref.home)} onRestart={restart} progressText={progressText} title={title} />
      ) : (
        body
      )}
      {unit === undefined ? null : (
        <View style={{ paddingBottom: insets.bottom + theme.space[4], paddingTop: theme.space[3] }}>
          <AzkarReaderControls
            canNext={position.index < total - 1}
            canPrevious={position.finished || position.index > 0}
            onNext={() => moveTo(Math.min(position.index + 1, total - 1))}
            onPrevious={() => moveTo(position.finished ? total - 1 : Math.max(0, position.index - 1))}
          >
            {sessionDone && position.index === total - 1 ? (
              <AzkarMarkCompleteButton onPress={onMarkComplete} />
            ) : counted ? (
              <AzkarCounter
                onReset={onReset}
                onTap={onTap}
                position={position.index + 1}
                requiredCount={unit.requiredCount ?? 0}
                value={currentCount}
              />
            ) : (
              <AzkarDoneButton completed={unitDone} onPress={onTap} />
            )}
          </AzkarReaderControls>
        </View>
      )}
    </AzkarTapSurface>
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
