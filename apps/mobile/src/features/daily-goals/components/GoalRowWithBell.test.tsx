import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';
import { GoalRowWithBell } from './GoalRowWithBell';

describe('GoalRowWithBell', () => {
  it('renders the goal as a labelled switch with its state, and a bell beside it', async () => {
    const view = await renderUi(
      <GoalRowWithBell onBellPress={jest.fn()} onValueChange={jest.fn()} testID="goal-session-morning" title="أذكار الصباح" value />,
    );
    const toggle = view.getByRole('switch', { name: 'أذكار الصباح' });

    expect(toggle.props.accessibilityState).toEqual({ checked: true });
    expect(view.getByRole('button', { name: 'تذكير أذكار الصباح' })).toBeOnTheScreen();
  });

  it('reports a change of the switch', async () => {
    const onValueChange = jest.fn();
    const view = await renderUi(
      <GoalRowWithBell
        onBellPress={jest.fn()}
        onValueChange={onValueChange}
        testID="goal-session-morning"
        title="أذكار الصباح"
        value={false}
      />,
    );

    await fireEvent(view.getByTestId('goal-session-morning'), 'valueChange', true);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('calls onBellPress from the bell and not from the switch', async () => {
    const onBellPress = jest.fn();
    const onValueChange = jest.fn();
    const view = await renderUi(
      <GoalRowWithBell
        onBellPress={onBellPress}
        onValueChange={onValueChange}
        testID="goal-session-morning"
        title="أذكار الصباح"
        value={false}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'تذكير أذكار الصباح' }));

    expect(onBellPress).toHaveBeenCalledTimes(1);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it.each(locales)('labels the bell with the session name under %s', async (locale) => {
    const view = await renderUi(
      <GoalRowWithBell
        onBellPress={jest.fn()}
        onValueChange={jest.fn()}
        testID="goal-session-evening"
        title={locale === 'en' ? 'Evening azkar' : 'أذكار المساء'}
        value={false}
      />,
      { locale },
    );

    expect(view.getByRole('button', { name: locale === 'en' ? 'Reminder Evening azkar' : 'تذكير أذكار المساء' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/daily-goals/components/GoalRowWithBell.tsx')).toEqual([]);
  });
});
