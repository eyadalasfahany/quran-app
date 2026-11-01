import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { DailyGoalsSheet } from './DailyGoalsSheet';

describe('DailyGoalsSheet', () => {
  it('shows the title, the note and the goals it is given', async () => {
    const view = await renderUi(
      <DailyGoalsSheet note="تُحفظ الأهداف على هذا الجهاز" onClose={jest.fn()} title="أهدافي اليومية">
        <Text>هدف تجريبي</Text>
      </DailyGoalsSheet>,
    );

    expect(view.getByRole('header', { name: 'أهدافي اليومية' })).toBeOnTheScreen();
    expect(view.getByText('تُحفظ الأهداف على هذا الجهاز')).toBeOnTheScreen();
    expect(view.getByText('هدف تجريبي')).toBeOnTheScreen();
  });

  it('closes from done and from save', async () => {
    const onClose = jest.fn();
    const view = await renderUi(
      <DailyGoalsSheet note="n" onClose={onClose} title="أهدافي اليومية">
        <Text>x</Text>
      </DailyGoalsSheet>,
    );

    await fireEvent.press(view.getByRole('button', { name: 'تم' }));
    await fireEvent.press(view.getByRole('button', { name: 'حفظ' }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('reads in English', async () => {
    const view = await renderUi(
      <DailyGoalsSheet note="Saved on this device" onClose={jest.fn()} title="My daily goals">
        <Text>x</Text>
      </DailyGoalsSheet>,
      { locale: 'en' },
    );

    expect(view.getByRole('header', { name: 'My daily goals' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'Done' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'Save' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/daily-goals/components/DailyGoalsSheet.tsx')).toEqual([]);
  });
});
