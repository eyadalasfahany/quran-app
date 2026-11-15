import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { SpotSheet } from './SpotSheet';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 34, left: 0, right: 0, top: 47 }) };
});

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

  it('does not say «at this spot» for the events of several places', async () => {
    await renderUi(<SpotSheet {...base} nearby title="٣ مواضع متقاربة" />);
    expect(screen.getByText('١١ حدثًا · بترتيب العمر')).toBeOnTheScreen();
    expect(screen.queryByText(/في هذا الموضع/)).toBeNull();
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

  it('pads its list clear of the home indicator and scrolls it with the sheet', async () => {
    await renderUi(<SpotSheet {...base} />);
    const scroll = screen.getByTestId('seerah-spot-sheet-scroll');
    expect(Number(flatStyle(scroll.props.contentContainerStyle).paddingBottom)).toBeGreaterThanOrEqual(16);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/SpotSheet.tsx')).toEqual([]);
  });
});
