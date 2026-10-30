import { type Href, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { syncDailyReminder } from '@/features/notifications/reminder-service';
import { useLastReadVerseKey } from '@/features/reader/anchor/useLastReadVerseKey';
import { getChapter } from '@/features/reader/data/chapters';
import { getVerseByKey, idToVerseKey } from '@/features/reader/data/verses';
import { Button, IconButton, Screen, UiText } from '@/shared/ui';

import { DailyWirdCard } from '../components/DailyWirdCard';
import { KhatmaDurationPicker } from '../components/KhatmaDurationPicker';
import { KhatmaProgressGrid } from '../components/KhatmaProgressGrid';
import { KhatmaStartOptions, type KhatmaStartChoice } from '../components/KhatmaStartOptions';
import { DEFAULT_KHATMA_DURATION, type KhatmaDurationDays } from '../constants';
import {
  createPlan,
  dailyTarget,
  endPlan,
  planProgress,
  toLocalDateString,
  useActivePlan,
  useKhatmaMarkerVerseId,
  usePlanLogs,
} from '../data';
import { resolvePlanBounds } from '../plan-bounds';

const BACK_ICON = { ios: 'chevron.left', android: 'chevron_left' } as const;

export function KhatmaScreen({ testID = 'screen-khatma' }: { testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready } = useContentDb();
  const lastReadVerseKey = useLastReadVerseKey();
  const activePlanQuery = useActivePlan();
  const plan = activePlanQuery.data[0] ?? null;
  const logsQuery = usePlanLogs(plan?.id);
  const markerVerseId = useKhatmaMarkerVerseId(plan?.id);
  const today = toLocalDateString(new Date());

  const [durationDays, setDurationDays] = useState<KhatmaDurationDays>(DEFAULT_KHATMA_DURATION);
  const [startChoice, setStartChoice] = useState<KhatmaStartChoice>('lastRead');
  const [durationTouched, setDurationTouched] = useState(false);
  const [startTouched, setStartTouched] = useState(false);
  const [syncedPlanId, setSyncedPlanId] = useState<string | null>(null);

  const content = useMemo(() => {
    if (!ready) {
      return null;
    }
    try {
      const executor = openContentDb().executor;
      const lastRead = getVerseByKey(executor, lastReadVerseKey);
      const lastReadChapter = lastRead === undefined ? undefined : getChapter(executor, lastRead.chapterId);
      return { executor, lastRead, lastReadChapter };
    } catch {
      return null;
    }
  }, [lastReadVerseKey, ready]);

  const planId = plan?.id ?? null;
  if (planId !== syncedPlanId) {
    setSyncedPlanId(planId);
    setDurationTouched(false);
    setStartTouched(false);
    if (plan !== null) {
      setDurationDays(plan.durationDays as KhatmaDurationDays);
      if (plan.startVerseId === 1) {
        setStartChoice('beginning');
      } else if (content?.lastRead?.id === plan.startVerseId) {
        setStartChoice('lastRead');
      } else {
        setStartChoice('lastRead');
      }
    }
  }

  const selectedStartVerseId = useMemo(() => {
    if (startChoice === 'beginning' || content?.lastRead?.id === 1) {
      return 1;
    }
    return content?.lastRead?.id ?? 1;
  }, [content?.lastRead?.id, startChoice]);

  const planBounds = useMemo(() => {
    if (content === null) {
      return null;
    }
    if (plan !== null) {
      return resolvePlanBounds(content.executor, plan.startVerseId);
    }
    return resolvePlanBounds(content.executor, selectedStartVerseId);
  }, [content, plan, selectedStartVerseId]);

  const progress = useMemo(() => {
    if (plan === null || planBounds === null) {
      return null;
    }
    return planProgress(plan, logsQuery.data, today, planBounds.pagesTotal);
  }, [logsQuery.data, plan, planBounds, today]);

  const previewBounds = useMemo(() => {
    if (content === null) {
      return null;
    }
    return resolvePlanBounds(content.executor, selectedStartVerseId);
  }, [content, selectedStartVerseId]);

  const editingActivePlan =
    plan !== null &&
    ((durationTouched && durationDays !== plan.durationDays) ||
      (startTouched && selectedStartVerseId !== plan.startVerseId));
  const saveMode = plan === null || editingActivePlan;

  const pagesPerDay = useMemo(() => {
    if (saveMode) {
      if (previewBounds === null) {
        return 0;
      }
      return dailyTarget(previewBounds.pagesTotal, durationDays);
    }
    return progress?.todayTarget ?? 0;
  }, [durationDays, previewBounds, progress?.todayTarget, saveMode]);

  const juzApprox = Math.max(1, Math.round(pagesPerDay / 20));

  const lastReadLabel = useMemo(() => {
    if (content?.lastRead === undefined || content.lastReadChapter === undefined) {
      return '';
    }
    return t('khatma.lastReadPlace', {
      ayah: formatNumber(content.lastRead.verseNumber, locale),
      surah: content.lastReadChapter.nameArabic,
    });
  }, [content, locale, t]);

  const loggedDates = useMemo(() => {
    if (progress === null) {
      return new Set<string>();
    }
    return progress.loggedDates;
  }, [progress]);

  const continueVerseKey = useMemo(() => {
    if (content === null || plan === null) {
      return null;
    }
    const verseId = markerVerseId ?? plan.startVerseId;
    return idToVerseKey(content.executor, verseId) ?? null;
  }, [content, markerVerseId, plan]);

  const onPrimary = () => {
    if (saveMode) {
      createPlan({ durationDays, startVerseId: selectedStartVerseId });
      // Reschedule so tomorrow's reminder body carries the new plan's wird (spec §13).
      void syncDailyReminder();
      return;
    }
    if (continueVerseKey !== null) {
      router.push(`/read/${continueVerseKey}` as Href);
    }
  };

  const onEndPlan = () => {
    if (plan === null) {
      return;
    }
    Alert.alert(t('khatma.endPlan.title'), t('khatma.endPlan.message'), [
      { style: 'cancel', text: t('khatma.endPlan.cancel') },
      {
        style: 'destructive',
        text: t('khatma.endPlan.confirm'),
        onPress: () => {
          endPlan(plan.id, 'abandoned');
        },
      },
    ]);
  };

  const showLastRead = content?.lastRead?.id !== 1;

  return (
    <Screen testID={testID} topInset={false}>
      <ScrollView
        contentContainerStyle={{
          gap: theme.space[4],
          paddingBottom: insets.bottom + theme.space[8] + theme.size.touchTarget,
          paddingHorizontal: theme.space[4],
          paddingTop: insets.top + theme.space[4],
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }}>
          <IconButton
            icon={BACK_ICON}
            label={t('settings.back')}
            mirrorInRtl
            onPress={() => router.back()}
            testID="khatma-back"
            variant="raised"
          />
          <UiText accessibilityRole="header" style={{ flex: 1, fontSize: 26, lineHeight: 36 }} variant="displayMd">
            {t('khatma.title')}
          </UiText>
        </View>

        <KhatmaDurationPicker
          onChange={(days) => {
            setDurationTouched(true);
            setDurationDays(days);
          }}
          value={durationDays}
        />

        <DailyWirdCard juzApprox={juzApprox} pagesPerDay={pagesPerDay} />

        <KhatmaStartOptions
          lastReadLabel={lastReadLabel}
          onChange={(choice) => {
            setStartTouched(true);
            setStartChoice(choice);
          }}
          showLastRead={showLastRead}
          value={startChoice}
        />

        {plan !== null && progress !== null && !saveMode ? (
          <>
            <KhatmaProgressGrid
              dayIndex={progress.dayIndex}
              durationDays={plan.durationDays}
              loggedDates={loggedDates}
              startDate={plan.startDate}
              today={today}
            />
            <Button
              label={t('khatma.endPlan.action')}
              onPress={onEndPlan}
              size="small"
              testID="khatma-end-plan"
              variant="danger"
            />
          </>
        ) : null}
      </ScrollView>

      <View
        style={{
          bottom: insets.bottom + theme.space[4],
          left: theme.space[4],
          position: 'absolute',
          right: theme.space[4],
        }}
      >
        <Button
          label={saveMode ? t('khatma.savePlan') : t('home.continueReading')}
          onPress={onPrimary}
          stretch
          testID="khatma-primary-cta"
          variant="primary"
        />
      </View>
    </Screen>
  );
}
