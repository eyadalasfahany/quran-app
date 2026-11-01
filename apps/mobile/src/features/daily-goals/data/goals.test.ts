import { storage, storageKeys } from '@/core/storage/mmkv';

import {
  MISBAHA_GOAL_DEFAULT,
  MISBAHA_GOAL_MAX,
  MISBAHA_GOAL_MIN,
  NO_DAILY_GOALS,
  parseDailyGoals,
  readDailyGoals,
  saveDailyGoals,
  setMisbahaGoalOn,
  setSessionGoal,
  setWirdGoal,
  stepMisbahaGoal,
} from './goals';

describe('parseDailyGoals', () => {
  it('has nothing on by default', () => {
    expect(parseDailyGoals(undefined)).toEqual(NO_DAILY_GOALS);
    expect(NO_DAILY_GOALS).toEqual({ misbahaTarget: null, sessions: [], wird: false });
  });

  it('keeps the valid fields of a damaged value and drops the rest', () => {
    expect(parseDailyGoals(JSON.stringify({ misbahaTarget: 100, sessions: ['morning', 3, 'morning'], wird: true }))).toEqual({
      misbahaTarget: 100,
      sessions: ['morning'],
      wird: true,
    });
    expect(parseDailyGoals(JSON.stringify({ misbahaTarget: 0, sessions: 'morning', wird: 'yes' }))).toEqual(NO_DAILY_GOALS);
    expect(parseDailyGoals('{broken')).toEqual(NO_DAILY_GOALS);
  });
});

describe('goal changes', () => {
  it('turns the wird on and off', () => {
    expect(setWirdGoal(NO_DAILY_GOALS, true).wird).toBe(true);
    expect(setWirdGoal({ ...NO_DAILY_GOALS, wird: true }, false).wird).toBe(false);
  });

  it('tracks a session once, and stops tracking it', () => {
    const on = setSessionGoal(setSessionGoal(NO_DAILY_GOALS, 'morning', true), 'morning', true);
    expect(on.sessions).toEqual(['morning']);

    expect(setSessionGoal(on, 'morning', false).sessions).toEqual([]);
    expect(setSessionGoal(on, 'evening', false).sessions).toEqual(['morning']);
  });

  it('switches the misbaha goal on at the default, keeps an earlier value, and switches it off', () => {
    expect(setMisbahaGoalOn(NO_DAILY_GOALS, true).misbahaTarget).toBe(MISBAHA_GOAL_DEFAULT);
    expect(setMisbahaGoalOn({ ...NO_DAILY_GOALS, misbahaTarget: 250 }, true).misbahaTarget).toBe(250);
    expect(setMisbahaGoalOn({ ...NO_DAILY_GOALS, misbahaTarget: 250 }, false).misbahaTarget).toBeNull();
  });

  it('steps the misbaha goal within its range', () => {
    const goal = { ...NO_DAILY_GOALS, misbahaTarget: 100 };
    expect(stepMisbahaGoal(goal, 1).misbahaTarget).toBe(101);
    expect(stepMisbahaGoal(goal, -1).misbahaTarget).toBe(99);
    expect(stepMisbahaGoal({ ...goal, misbahaTarget: MISBAHA_GOAL_MIN }, -1).misbahaTarget).toBe(MISBAHA_GOAL_MIN);
    expect(stepMisbahaGoal({ ...goal, misbahaTarget: MISBAHA_GOAL_MAX }, 1).misbahaTarget).toBe(MISBAHA_GOAL_MAX);
  });

  it('does not move a goal that is off', () => {
    expect(stepMisbahaGoal(NO_DAILY_GOALS, 1)).toEqual(NO_DAILY_GOALS);
  });
});

describe('daily goals storage', () => {
  beforeEach(() => {
    storage.remove(storageKeys.dailyGoals);
  });

  it('saves and reads back the goals', () => {
    saveDailyGoals({ misbahaTarget: 33, sessions: ['evening'], wird: true });

    expect(readDailyGoals()).toEqual({ misbahaTarget: 33, sessions: ['evening'], wird: true });
  });

  it('reads nothing on a fresh install', () => {
    expect(readDailyGoals()).toEqual(NO_DAILY_GOALS);
  });
});
