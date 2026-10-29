import { fireEvent } from '@testing-library/react-native';

import { featureComponentLiterals } from '../../../../jest/ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';

import type { ReciterFilterOption } from './ReciterFilterChips';
import { ReciterListHeader } from './ReciterListHeader';

type Value = 'all' | 'Murattal' | 'Muallim';

const options: ReciterFilterOption<Value>[] = [
  { value: 'all', label: 'All' },
  { value: 'Murattal', label: 'Murattal' },
  { value: 'Muallim', label: 'Muallim', disabled: true },
];

function header(overrides: Partial<Parameters<typeof ReciterListHeader<Value>>[0]> = {}) {
  return (
    <ReciterListHeader<Value>
      filter="all"
      filterLabel="Filter"
      filterOptions={options}
      onFilterChange={() => undefined}
      onQueryChange={() => undefined}
      query=""
      searchPlaceholder="Search reciters"
      title="Listen"
      {...overrides}
    />
  );
}

describe('ReciterListHeader', () => {
  it('renders the title as a header, the search field and the filter group', async () => {
    const view = await renderUi(header(), { locale: 'en' });

    expect(view.getByRole('header', { name: 'Listen' })).toBeOnTheScreen();
    expect(view.getByRole('search', { name: 'Search reciters' })).toBeOnTheScreen();
    expect(view.getByLabelText('Filter')).toBeOnTheScreen();
  });

  it('reports each change of the search text', async () => {
    const onQueryChange = jest.fn();
    const view = await renderUi(header({ onQueryChange }), { locale: 'en' });

    await fireEvent.changeText(view.getByRole('search'), 'Husary');

    expect(onQueryChange).toHaveBeenCalledWith('Husary');
  });

  it('reports the chosen filter and ignores a disabled one', async () => {
    const onFilterChange = jest.fn();
    const view = await renderUi(header({ onFilterChange }), { locale: 'en' });

    await fireEvent.press(view.getByRole('radio', { name: 'Murattal' }));
    await fireEvent.press(view.getByRole('radio', { name: 'Muallim' }));

    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onFilterChange).toHaveBeenCalledWith('Murattal');
  });

  it('marks the selected filter as checked', async () => {
    const view = await renderUi(header({ filter: 'Murattal' }), { locale: 'en' });

    expect(view.getByRole('radio', { name: 'Murattal' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(view.getByRole('radio', { name: 'All' }).props.accessibilityState).toMatchObject({ checked: false });
  });

  it.each(locales)('renders the title, search and filter under %s', async (locale) => {
    const view = await renderUi(header({ title: locale === 'ar' ? 'الاستماع' : 'Listen' }), { locale });

    expect(view.getByTestId('reciter-list-header')).toBeOnTheScreen();
    expect(view.getByRole('header')).toBeOnTheScreen();
    expect(view.getByRole('search')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/components/ReciterListHeader.tsx')).toEqual([]);
  });
});
