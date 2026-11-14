import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { SpotSheet } from './SpotSheet';

const rows = [
  { id: 'e1', subtitle: 'عمره ٣٥ سنة', title: 'عنوان ١' },
  { id: 'e2', subtitle: 'عمره ٤٣ سنة', title: 'عنوان ٢' },
];
const base = { eventsLabel: '١١ حدثًا', onClose: jest.fn(), onRowPress: jest.fn(), rows, title: 'الكعبة' };

describe('SpotSheet', () => {
  it.each(locales)('shows the place, the count line and the rows (%s)', async (locale) => {
    await renderUi(<SpotSheet {...base} eventsLabel={locale === 'ar' ? '١١ حدثًا' : '11 events'} />, { locale });
    expect(screen.getByRole('header')).toHaveTextContent('الكعبة');
    expect(screen.getByText(locale === 'ar' ? '١١ حدثًا في هذا الموضع · بترتيب العمر' : '11 events at this spot · by age')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: /عنوان/ })).toHaveLength(2);
  });

  it('closes', async () => {
    const onClose = jest.fn();
    await renderUi(<SpotSheet {...base} onClose={onClose} />);
    await press(screen.getByRole('button', { name: 'إغلاق' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reports the tapped event', async () => {
    const onRowPress = jest.fn();
    await renderUi(<SpotSheet {...base} onRowPress={onRowPress} />);
    await press(screen.getByRole('button', { name: 'عنوان ١, عمره ٣٥ سنة' }));
    expect(onRowPress).toHaveBeenCalledWith('e1');
  });

  it('draws a grabber for the sheet and hides it from screen readers', async () => {
    await renderUi(<SpotSheet {...base} />);
    const grabber = screen.getByTestId('seerah-spot-sheet-grabber', { includeHiddenElements: true });
    expect(grabber.props.accessibilityElementsHidden).toBe(true);
    expect(flatStyle(grabber.props.style)).toMatchObject({ height: 5, width: 40 });
  });

  it('rounds the top corners on the surface colour', async () => {
    await renderUi(<SpotSheet {...base} />);
    expect(flatStyle(screen.getByTestId('seerah-spot-sheet').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surface,
      borderTopLeftRadius: themes.light.radius.xl,
    });
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/SpotSheet.tsx')).toEqual([]);
  });
});
