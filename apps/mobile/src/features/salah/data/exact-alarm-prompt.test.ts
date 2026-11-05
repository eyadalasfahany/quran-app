import {
  dismissExactAlarmPrompt,
  isExactAlarmPromptVisible,
  showExactAlarmPrompt,
  subscribeExactAlarmPrompt,
} from './exact-alarm-prompt';

describe('exact-alarm prompt state', () => {
  beforeEach(() => {
    dismissExactAlarmPrompt();
  });

  it('is hidden by default', () => {
    expect(isExactAlarmPromptVisible()).toBe(false);
  });

  it('shows and dismisses', () => {
    showExactAlarmPrompt();
    expect(isExactAlarmPromptVisible()).toBe(true);

    dismissExactAlarmPrompt();
    expect(isExactAlarmPromptVisible()).toBe(false);
  });

  it('notifies a subscriber on each real change, and not on a repeat', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeExactAlarmPrompt(listener);

    showExactAlarmPrompt();
    showExactAlarmPrompt();
    dismissExactAlarmPrompt();
    dismissExactAlarmPrompt();

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('stops notifying after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeExactAlarmPrompt(listener);
    unsubscribe();

    showExactAlarmPrompt();

    expect(listener).not.toHaveBeenCalled();
    expect(isExactAlarmPromptVisible()).toBe(true);
  });
});
