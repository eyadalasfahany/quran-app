import { type Href, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { syncDailyReminder } from '@/features/notifications/reminder-service';
import { useLastReadVerseKey } from '@/features/reader/anchor/useLastReadVerseKey';
import { getChapter } from '@/features/reader/data/chapters';
import { getVerseByKey, idToVerseKey } from '@/features/reader/data/verses';
import { Button, ConfirmDialog, IconButton, Screen, UiText } from '@/shared/ui';

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
const END_PLAN_ICON = { ios: 'stop.circle', android: 'stop_circle' } as const;

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
  const [endOpen, setEndOpen] = useState(false);
  // The footer CTA sits below the scroll view, so the scroll content gets the footer's height as its bottom padding:
  // the last card can scroll fully clear of the CTA (on a landscape phone it otherwise hides under it).
  const [footerHeight, setFooterHeight] = useState(0);
  const onFooterLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setFooterHeight((previous) => (previous === height ? previous : height));
  }, []);

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
    setEndOpen(true);
  };

  const showLastRead = content?.lastRead?.id !== 1;

  return (
    <Screen testID={testID} topInset={false}>
      {/* The plan is one centred column, capped at 720 like the reading column, so a wide window does not stretch it (ADR 0036). */}
      <ContentColumn gutter={theme.space[4]} testID="khatma-column">
      <ScrollView
        contentContainerStyle={{
          gap: theme.space[4],
          paddingBottom: footerHeight,
          paddingTop: insets.top + theme.space[4],
        }}
        style={{ flex: 1 }}
        testID="khatma-scroll"
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

      <View onLayout={onFooterLayout} style={{ paddingBottom: insets.bottom + theme.space[4] }} testID="khatma-footer">
        <Button
          label={saveMode ? t('khatma.savePlan') : t('home.continueReading')}
          onPress={onPrimary}
          stretch
          testID="khatma-primary-cta"
          variant="primary"
        />
      </View>
      </ContentColumn>
      <ConfirmDialog
        cancelLabel={t('khatma.endPlan.cancel')}
        confirmLabel={t('khatma.endPlan.confirm')}
        destructive
        icon={END_PLAN_ICON}
        message={t('khatma.endPlan.message')}
        onCancel={() => setEndOpen(false)}
        onConfirm={() => {
          setEndOpen(false);
          if (plan !== null) {
            endPlan(plan.id, 'abandoned');
          }
        }}
        testID="khatma-end-dialog"
        title={t('khatma.endPlan.title')}
        visible={endOpen}
      />
    </Screen>
  );
}
