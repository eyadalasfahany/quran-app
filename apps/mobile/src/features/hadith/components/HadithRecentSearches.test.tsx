import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';

import { HadithRecentSearches } from './HadithRecentSearches';

const TEST_ID = 'hadith-recent-searches';
const QUERIES = ['FIXTURE one', 'FIXTURE two'];

function renderList(queries: readonly string[] = QUERIES, locale: 'ar' | 'en' = 'ar') {
  const handlers = { onClear: jest.fn(), onRemove: jest.fn(), onSelect: jest.fn() };
  return { ...handlers, view: renderUi(<HadithRecentSearches queries={queries} {...handlers} />, { locale }) };
}

describe('HadithRecentSearches', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    const { view } = renderList(QUERIES, locale);
    await view;
    expect(screen.getByTestId(TEST_ID)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'مسح السجل' : 'Clear history' })).toBeOnTheScreen();
  });

  it('renders nothing for an empty list', async () => {
    await renderUi(<HadithRecentSearches onClear={jest.fn()} onRemove={jest.fn()} onSelect={jest.fn()} queries={[]} />);
    expect(screen.queryByTestId(TEST_ID)).toBeNull();
  });

  it('selecting a row calls onSelect with the query', async () => {
    const { onSelect, view } = renderList();
    await view;
    await press(screen.getByRole('button', { name: 'FIXTURE two' }));
    expect(onSelect).toHaveBeenCalledWith('FIXTURE two');
  });

  it('the remove button calls onRemove for that query only', async () => {
    const { onRemove, onSelect, view } = renderList();
    await view;
    await press(screen.getByRole('button', { name: 'إزالة FIXTURE one' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('FIXTURE one');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('the clear button calls onClear', async () => {
    const { onClear, view } = renderList();
    await view;
    await press(screen.getByRole('button', { name: 'مسح السجل' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('rows show the query in the Amiri font', async () => {
    await renderList().view;
    const query = screen.getByText('FIXTURE one');
    expect(flatStyle(query.props.style).fontFamily).toBe('Amiri-Regular');
  });

  it('buttons have roles and labels', async () => {
    await renderList().view;
    expect(screen.getByRole('header', { name: 'عمليات البحث الأخيرة' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'FIXTURE one' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'إزالة FIXTURE two' })).toBeOnTheScreen();
  });

  it('uses start and end, never left or right', async () => {
    await renderList().view;
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
    expect(physicalSides(flatStyle(screen.getByTestId(`${TEST_ID}-row-FIXTURE one`).props.style))).toEqual([]);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithRecentSearches.tsx')).toEqual([]);
  });
});
