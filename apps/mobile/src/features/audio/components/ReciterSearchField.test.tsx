import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { ReciterSearchField } from './ReciterSearchField';

describe('ReciterSearchField', () => {
  it('is a 46 pt pill with a 1 pt line border and the placeholder as its label', async () => {
    const view = await renderUi(
      <ReciterSearchField onChangeText={() => undefined} placeholder="ابحث عن قارئ" testID="search" value="" />,
    );
    const field = view.getByRole('search', { name: 'ابحث عن قارئ' });

    expect(field.props.placeholder).toBe('ابحث عن قارئ');
    expect(flatStyle(view.getByTestId('search').props.style)).toMatchObject({ minHeight: 46, borderWidth: 1 });
  });

  it('reports each change of the query', async () => {
    const onChangeText = jest.fn();
    const view = await renderUi(
      <ReciterSearchField onChangeText={onChangeText} placeholder="Search" testID="search" value="" />,
      { locale: 'en' },
    );

    await fireEvent.changeText(view.getByRole('search', { name: 'Search' }), 'Husary');

    expect(onChangeText).toHaveBeenCalledWith('Husary');
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(
      <ReciterSearchField onChangeText={() => undefined} placeholder="placeholder" testID="search" value="x" />,
      { locale },
    );

    expect(view.getByRole('search')).toHaveProp('value', 'x');
  });

  it.each([
    ['en', 'left'],
    ['ar', undefined],
  ] as const)('aligns the typed text as %s expects (textAlign %s)', async (locale, textAlign) => {
    const view = await renderUi(
      <ReciterSearchField onChangeText={() => undefined} placeholder="placeholder" testID="search" value="" />,
      { locale },
    );

    expect(flatStyle(view.getByRole('search').props.style).textAlign).toBe(textAlign);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/components/ReciterSearchField.tsx')).toEqual([]);
  });
});
