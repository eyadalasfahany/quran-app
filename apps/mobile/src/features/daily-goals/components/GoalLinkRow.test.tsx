import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';
import { GoalLinkRow } from './GoalLinkRow';

describe('GoalLinkRow', () => {
  it('renders its title as a button with a chevron', async () => {
    const view = await renderUi(<GoalLinkRow onPress={jest.fn()} testID="goal-link" title="ابدأ ختمة" />);

    expect(view.getByRole('button', { name: 'ابدأ ختمة' })).toBeOnTheScreen();
    // The chevron is decoration, hidden from accessibility.
    expect(view.getByTestId('list-row-chevron', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('includes the subtitle in its label', async () => {
    const view = await renderUi(
      <GoalLinkRow onPress={jest.fn()} subtitle="وردك اليومي (الختمة)" title="ابدأ ختمة" />,
    );

    expect(view.getByRole('button', { name: 'ابدأ ختمة, وردك اليومي (الختمة)' })).toBeOnTheScreen();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<GoalLinkRow onPress={onPress} title="فتح المسبحة" />);

    await fireEvent.press(view.getByRole('button', { name: 'فتح المسبحة' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<GoalLinkRow onPress={jest.fn()} title="Open misbaha" />, { locale });

    expect(view.getByRole('button', { name: 'Open misbaha' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/daily-goals/components/GoalLinkRow.tsx')).toEqual([]);
  });
});
