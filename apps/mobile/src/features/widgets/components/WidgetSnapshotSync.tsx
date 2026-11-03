import { useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useCatalogVersion } from '@/core/sync/catalog-version';
import { useLocale } from '@/core/i18n';
import { useAzkarProgressSummaries } from '@/features/azkar/data';
import { useDailyGoals } from '@/features/daily-goals/hooks/useDailyGoals';
import { coordsKey, localDay } from '@/features/notifications/sync-state';
import { useActivePlan, usePlanLogs } from '@/features/khatma/data';
import { useLastReadVerseKey } from '@/features/reader/anchor/useLastReadVerseKey';
import { usePrayerLocation } from '@/features/salah/hooks';

import { pushWatchApplicationContext, subscribeWatchUserInfo, intakeWatchMisbahaDeltas } from '@/features/watch/apple-watch';

import { mergeIosWidgetTapsOnForeground } from '../ios/merge-on-foreground';
import { gatherWidgetSnapshot } from '../snapshot/gather';
import { publishWidgetSnapshot } from '../snapshot/publish';
import { readWidgetSnapshotJson } from '../snapshot/store';
import { setAppearanceChangeListener } from '@/core/theme/appearance-change';

import { registerWidgetSyncSchedule, scheduleWidgetSync } from '../snapshot/appearance-sync';
import { createWidgetSync } from '../snapshot/sync';
import { activeWidgetWriters } from '../writers';

/**
 * Keeps the widget snapshot in step with the app's data (ADR 0035 §4). It renders nothing. It watches the same sources
 * Home reads (goals, the reading place, the Khatma plan and its logs, the Azkar progress, the location, the content
 * revision and the language), and asks for a rebuild, debounced, when one of them moves.
 *
 * Misbaha taps are not watched: a tap never triggers a write by itself. The counter is written when the app goes to the
 * background, and a widget «+» patches the stored snapshot itself (ADR 0035 §3.5). Each rebuild reads fresh values.
 */
export function WidgetSnapshotSync({ enabled }: { enabled: boolean }) {
  const { goals } = useDailyGoals();
  const lastReadVerseKey = useLastReadVerseKey();
  const location = usePrayerLocation();
  const plan = useActivePlan().data[0] ?? null;
  const logs = usePlanLogs(plan?.id).data;
  const summaries = useAzkarProgressSummaries();
  const revision = useCatalogVersion((state) => state.version);
  const locale = useLocale();

  // Everything the snapshot shows that these sources decide. The day is part of it, so a new day rebuilds on the next
  // render that comes after midnight, and the foreground check below covers the rest.
  const signature = JSON.stringify({
    coords: coordsKey(location.coords),
    day: localDay(new Date()),
    goals,
    locale,
    lastReadVerseKey,
    logs: logs.map((log) => [log.date, log.pagesRead]),
    plan: plan === null ? null : [plan.id, plan.startDate, plan.durationDays, plan.startVerseId, plan.status],
    revision,
    summaries,
  });

  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const sync = useMemo(
    () =>
      createWidgetSync({
        build: () => gatherWidgetSnapshot(new Date()),
        publish: async (snapshot) => {
          await publishWidgetSnapshot(snapshot, activeWidgetWriters(Platform.OS === 'android' ? 'android' : 'ios'));
          if (Platform.OS === 'ios') {
            const json = readWidgetSnapshotJson();
            if (json !== undefined) {
              pushWatchApplicationContext(json);
            }
          }
        },
        readStoredJson: readWidgetSnapshotJson,
      }),
    [],
  );

  useEffect(() => {
    if (enabled) {
      sync.schedule();
    }
  }, [enabled, signature, sync]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const unregisterSchedule = registerWidgetSyncSchedule(() => sync.schedule());
    setAppearanceChangeListener(() => scheduleWidgetSync());
    return () => {
      unregisterSchedule();
      setAppearanceChangeListener(null);
    };
  }, [enabled, sync]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (!enabledRef.current) {
        return;
      }
      if (state === 'background') {
        void sync.flush();
      } else if (state === 'active') {
        if (Platform.OS === 'ios') {
          mergeIosWidgetTapsOnForeground(new Date());
        }
        sync.schedule();
      }
    });
    return () => {
      subscription.remove();
      sync.cancel();
    };
  }, [sync]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !enabled) {
      return undefined;
    }
    return subscribeWatchUserInfo((payload) => {
      intakeWatchMisbahaDeltas(new Date(), [payload]);
    });
  }, [enabled]);

  return null;
}
