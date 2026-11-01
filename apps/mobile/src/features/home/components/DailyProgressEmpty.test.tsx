import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { DailyProgressEmpty } from './DailyProgressEmpty';

describe('DailyProgressEmpty', () => {
  it('prompts the user to set goals, and says what they can track', async () => {
    const view = await renderUi(<DailyProgressEmpty onSetGoals={jest.fn()} />);

    expect(view.getByRole('header', { name: 'حدّد أهدافك اليومية' })).toBeOnTheScreen();
    expect(view.getByText('اختر ما تريد متابعته كل يوم: الورد والأذكار والمسبحة.')).toBeOnTheScreen();
  });

  it('opens the goals sheet from its button', async () => {
    const onSetGoals = jest.fn();
    const view = await renderUi(<DailyProgressEmpty onSetGoals={onSetGoals} />);

    await fireEvent.press(view.getByRole('button', { name: 'أهدافي اليومية' }));

    expect(onSetGoals).toHaveBeenCalledTimes(1);
  });

  it('reads in English', async () => {
    const view = await renderUi(<DailyProgressEmpty onSetGoals={jest.fn()} />, { locale: 'en' });

    expect(view.getByRole('header', { name: 'Set your daily goals' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'My daily goals' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/home/components/DailyProgressEmpty.tsx')).toEqual([]);
  });
});
