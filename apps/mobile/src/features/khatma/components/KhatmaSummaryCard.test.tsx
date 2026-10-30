import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { KhatmaSummaryCard } from './KhatmaSummaryCard';

const hidden = { includeHiddenElements: true };

describe('KhatmaSummaryCard', () => {
  it('draws the empty state with start action', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<KhatmaSummaryCard active={false} onPress={onPress} />);

    fireEvent.press(view.getByRole('button', { name: 'ابدأ ختمة' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('draws the active summary card', async () => {
    const view = await renderUi(
      <KhatmaSummaryCard
        active
        dayIndex={12}
        durationDays={30}
        onPress={jest.fn()}
        pagesLoggedToday={4}
        todayTarget={21}
      />,
    );

    expect(view.getByText('ختمة ٣٠ يومًا')).toBeOnTheScreen();
    expect(view.getByText('اليوم ١٢ من ٣٠')).toBeOnTheScreen();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<KhatmaSummaryCard active={false} onPress={jest.fn()} />, { locale });
    expect(view.getByTestId('khatma-summary-card-empty')).toBeOnTheScreen();
  });

  it.each(locales)('points the chevron forward in the reading direction (%s)', async (locale) => {
    const view = await renderUi(
      <KhatmaSummaryCard active dayIndex={12} durationDays={30} onPress={jest.fn()} />,
      { locale },
    );

    expect(flatStyle(view.getByTestId('khatma-summary-card-chevron', hidden).props.style).transform).toEqual(
      locale === 'ar' ? [{ scaleX: -1 }] : undefined,
    );
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/khatma/components/KhatmaSummaryCard.tsx')).toEqual([]);
  });
});
