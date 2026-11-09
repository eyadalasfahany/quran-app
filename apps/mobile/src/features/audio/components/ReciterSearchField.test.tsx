import { fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { arabicTextDirection } from '@/shared/ui/textStyles';

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
    ['en', { textAlign: 'left' }],
    ['ar', arabicTextDirection],
  ] as const)('aligns the typed text as %s expects', async (locale, alignment) => {
    const view = await renderUi(
      <ReciterSearchField onChangeText={() => undefined} placeholder="placeholder" testID="search" value="" />,
      { locale },
    );

    expect(flatStyle(view.getByRole('search').props.style)).toMatchObject(alignment);
  });

  it('keeps an Arabic field on the right on an English phone: LTR node, right-aligned, RTL writing', async () => {
    const view = await renderUi(
      <ReciterSearchField onChangeText={() => undefined} placeholder="placeholder" testID="search" value="" />,
      { locale: 'ar' },
    );

    expect(flatStyle(view.getByRole('search').props.style)).toMatchObject({
      direction: 'ltr',
      textAlign: 'right',
      writingDirection: 'rtl',
    });
  });

  it('on Android under RTL sets no alignment key, so the platform keeps its natural alignment', async () => {
    const platform = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      const view = await renderUi(
        <ReciterSearchField onChangeText={() => undefined} placeholder="placeholder" testID="search" value="" />,
        { locale: 'ar' },
      );
      const style = flatStyle(view.getByRole('search').props.style);
      expect(style).not.toHaveProperty('textAlign');
      expect(style).not.toHaveProperty('direction');
      expect(style).not.toHaveProperty('writingDirection');
    } finally {
      platform.restore();
    }
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/components/ReciterSearchField.tsx')).toEqual([]);
  });
});
