import { useTranslation } from 'react-i18next';

import { useLocale } from '@/core/i18n';
import { useAzkarAvailable, useSessionCategoryProgress } from '@/features/azkar/data';
import { azkarHref, goBackOr } from '@/features/azkar/routes';
import { useActivePlan } from '@/features/khatma/data';
import { ToggleRow } from '@/shared/ui';

import { DailyGoalsSheet } from '../components/DailyGoalsSheet';
import { GoalsListCard } from '../components/GoalsListCard';
import { MisbahaTargetStepper } from '../components/MisbahaTargetStepper';
import { MISBAHA_GOAL_DEFAULT, setMisbahaGoalOn, setSessionGoal, setWirdGoal, stepMisbahaGoal } from '../data/goals';
import { useDailyGoals } from '../hooks/useDailyGoals';

/**
 * The «أهدافي اليومية» sheet (ADR 0034 §5), opened from Home's progress card. The wird appears only with an active
 * plan, and the Azkar goals only with Azkar content. Each change is saved at once. Composition only.
 */
export function DailyGoalsScreen() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { goals, update } = useDailyGoals();
  const plan = useActivePlan().data[0] ?? null;
  const azkarAvailable = useAzkarAvailable();
  const sessions = useSessionCategoryProgress(locale);
  const close = () => goBackOr(azkarHref.homeTab);

  return (
    <DailyGoalsSheet note={t('dailyGoals.note')} onClose={close} title={t('dailyGoals.title')}>
      <GoalsListCard>
        {plan === null ? null : (
          <ToggleRow
            onValueChange={(on) => update(setWirdGoal(goals, on))}
            separator="line"
            testID="goal-wird"
            title={t('dailyGoals.wird')}
            value={goals.wird}
          />
        )}
        {azkarAvailable
          ? sessions.map((session) => (
              <ToggleRow
                key={session.id}
                onValueChange={(on) => update(setSessionGoal(goals, session.id, on))}
                separator="line"
                testID={`goal-session-${session.id}`}
                title={session.title}
                value={goals.sessions.includes(session.id)}
              />
            ))
          : null}
        <ToggleRow
          onValueChange={(on) => update(setMisbahaGoalOn(goals, on))}
          separator={goals.misbahaTarget === null ? undefined : 'line'}
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
      </GoalsListCard>
    </DailyGoalsSheet>
  );
}
