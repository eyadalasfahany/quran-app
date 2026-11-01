import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useLocale } from '@/core/i18n';
import { useAzkarAvailable, useSessionCategoryProgress } from '@/features/azkar/data';
import { azkarHref } from '@/features/azkar/routes';
import { useActivePlan } from '@/features/khatma/data';
import { SheetHost } from '@/features/reader/components/SheetHost';
import { useSheet } from '@/features/reader/components/sheet-context';
import { DailyReminderRow } from '@/features/settings/components/DailyReminderRow';
import { ToggleRow } from '@/shared/ui';

import { DailyGoalsSheet } from '../components/DailyGoalsSheet';
import { GoalLinkRow } from '../components/GoalLinkRow';
import { GoalRowWithBell } from '../components/GoalRowWithBell';
import { GoalsListCard } from '../components/GoalsListCard';
import { MisbahaTargetStepper } from '../components/MisbahaTargetStepper';
import { MISBAHA_GOAL_DEFAULT, setMisbahaGoalOn, setSessionGoal, setWirdGoal, stepMisbahaGoal } from '../data/goals';
import { useDailyGoals } from '../hooks/useDailyGoals';

/**
 * The «أهدافي اليومية» sheet (ADR 0034), opened from Home's progress card. It is hosted in a SheetHost like every other
 * sheet, so it slides up and drags between detents, and Reduce Motion fades it.
 */
export function DailyGoalsScreen() {
  return (
    <SheetHost testID="daily-goals-sheet">
      <DailyGoalsCard />
    </SheetHost>
  );
}

/**
 * The goals card inside the sheet. The wird toggle appears only with an active plan (otherwise «ابدأ ختمة»), the Azkar
 * sessions only with Azkar content, each with a bell to its reminder sheet. Every change is saved at once. Composition
 * and wiring only.
 */
function DailyGoalsCard() {
  const { t } = useTranslation();
  const locale = useLocale();
  const sheet = useSheet();
  const { goals, update } = useDailyGoals();
  const plan = useActivePlan().data[0] ?? null;
  const azkarAvailable = useAzkarAvailable();
  const sessions = useSessionCategoryProgress(locale);
  const close = () => sheet?.close();

  return (
    <DailyGoalsSheet note={t('dailyGoals.note')} onClose={close} title={t('dailyGoals.title')}>
      <GoalsListCard>
        {plan === null ? (
          <GoalLinkRow
            onPress={() => router.push('/khatma' as Href)}
            subtitle={t('dailyGoals.wird')}
            testID="goal-start-khatma"
            title={t('dailyGoals.startKhatma')}
          />
        ) : (
          <ToggleRow
            onValueChange={(on) => update(setWirdGoal(goals, on))}
            testID="goal-wird"
            title={t('dailyGoals.wird')}
            value={goals.wird}
          />
        )}
        {azkarAvailable
          ? sessions.map((session) => (
              <GoalRowWithBell
                key={session.id}
                onBellPress={() => router.push(azkarHref.reminders({ category: session.id }))}
                onValueChange={(on) => update(setSessionGoal(goals, session.id, on))}
                testID={`goal-session-${session.id}`}
                title={session.title}
                value={goals.sessions.includes(session.id)}
              />
            ))
          : null}
        <ToggleRow
          onValueChange={(on) => update(setMisbahaGoalOn(goals, on))}
          testID="goal-misbaha"
          title={t('dailyGoals.misbaha')}
          value={goals.misbahaTarget !== null}
        />
        {goals.misbahaTarget !== null ? (
          <MisbahaTargetStepper
            label={t('dailyGoals.misbahaCount')}
            onDecrease={() => update(stepMisbahaGoal(goals, -1))}
            onIncrease={() => update(stepMisbahaGoal(goals, 1))}
            value={goals.misbahaTarget ?? MISBAHA_GOAL_DEFAULT}
          />
        ) : null}
        <GoalLinkRow
          onPress={() => router.push('/sibha' as Href)}
          testID="goal-open-sibha"
          title={t('dailyGoals.openSibha')}
        />
        <DailyReminderRow />
        <GoalLinkRow
          onPress={() => router.push('/salah' as Href)}
          testID="goal-prayer-notifications"
          title={t('dailyGoals.prayerNotifications')}
        />
      </GoalsListCard>
    </DailyGoalsSheet>
  );
}
