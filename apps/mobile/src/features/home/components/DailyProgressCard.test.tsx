import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { DailyProgressCard } from './DailyProgressCard';

const lines = [
  { done: false, key: 'wird', label: 'وردك اليومي', value: '٤ من ٢١ صفحة' },
  { done: true, key: 'session:morning', label: 'أذكار الصباح', value: 'مكتمل' },
  { done: false, key: 'misbaha', label: 'المسبحة', value: '٥٠ من ١٠٠' },
];

describe('DailyProgressCard', () => {
  it('shows the title, today’s ring and one row per chosen goal', async () => {
    const view = await renderUi(<DailyProgressCard lines={lines} onOpenGoals={jest.fn()} percent={60} />);

    expect(view.getByRole('header', { name: 'تقدّم اليوم' })).toBeOnTheScreen();
    expect(view.getByTestId('daily-progress-ring-label', { includeHiddenElements: true })).toHaveTextContent('٦٠٪');
    expect(view.getByText('وردك اليومي')).toBeOnTheScreen();
    expect(view.getByText('٤ من ٢١ صفحة')).toBeOnTheScreen();
    expect(view.getByText('مكتمل')).toBeOnTheScreen();
    expect(view.getByText('٥٠ من ١٠٠')).toBeOnTheScreen();
  });

  it('opens the goals sheet from «تعديل»', async () => {
    const onOpenGoals = jest.fn();
    const view = await renderUi(<DailyProgressCard lines={lines} onOpenGoals={onOpenGoals} percent={60} />);

    await fireEvent.press(view.getByRole('button', { name: 'تعديل' }));

    expect(onOpenGoals).toHaveBeenCalledTimes(1);
  });

  it('shows the prompt, and no ring or edit link, when nothing is chosen', async () => {
    const onOpenGoals = jest.fn();
    const view = await renderUi(<DailyProgressCard lines={[]} onOpenGoals={onOpenGoals} percent={0} />);

    expect(view.getByTestId('home-daily-progress-empty')).toBeOnTheScreen();
    expect(view.queryByTestId('daily-progress-ring')).toBeNull();
    expect(view.queryByRole('button', { name: 'تعديل' })).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'أهدافي اليومية' }));
    expect(onOpenGoals).toHaveBeenCalledTimes(1);
  });

  it('reads in English', async () => {
    const view = await renderUi(
      <DailyProgressCard
        lines={[{ done: true, key: 'misbaha', label: 'Misbaha', value: 'Complete' }]}
        onOpenGoals={jest.fn()}
        percent={100}
      />,
      { locale: 'en' },
    );

    expect(view.getByRole('header', { name: "Today's progress" })).toBeOnTheScreen();
    expect(view.getByTestId('daily-progress-ring-label', { includeHiddenElements: true })).toHaveTextContent('100%');
    expect(view.getByRole('button', { name: 'Edit' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/home/components/DailyProgressCard.tsx')).toEqual([]);
  });
});
