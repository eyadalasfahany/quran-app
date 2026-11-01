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

  it('closes from done, from save and from the dimmed screen', async () => {
    const onClose = jest.fn();
    const view = await renderUi(
      <DailyGoalsSheet note="n" onClose={onClose} title="أهدافي اليومية">
        <Text>x</Text>
      </DailyGoalsSheet>,
    );

    await fireEvent.press(view.getByRole('button', { name: 'تم' }));
    await fireEvent.press(view.getByRole('button', { name: 'حفظ' }));
    // The dimmed scrim sits behind the modal card, so it is hidden from accessibility queries by design; a sighted tap reaches it.
    await fireEvent.press(view.getByTestId('daily-goals-sheet-scrim', { includeHiddenElements: true }));

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('is labelled as a modal view', async () => {
    const view = await renderUi(
      <DailyGoalsSheet note="n" onClose={jest.fn()} title="أهدافي اليومية">
        <Text>x</Text>
      </DailyGoalsSheet>,
    );

    expect(view.getByLabelText('أهدافي اليومية').props.accessibilityViewIsModal).toBe(true);
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
