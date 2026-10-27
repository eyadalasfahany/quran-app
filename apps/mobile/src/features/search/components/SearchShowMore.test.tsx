import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { SearchShowMore } from './SearchShowMore';

describe('SearchShowMore', () => {
  it('renders the show-more label', async () => {
    const view = await renderUi(<SearchShowMore onPress={() => undefined} />);

    expect(view.getByText(/Show more|عرض المزيد/)).toBeOnTheScreen();
  });

  it('is a full-width ghost button with a touch-sized target', async () => {
    const view = await renderUi(<SearchShowMore onPress={() => undefined} />);

    expect(flatStyle(view.getByTestId('search-show-more').props.style)).toMatchObject({
      alignSelf: 'stretch',
      backgroundColor: 'transparent',
      minHeight: themes.light.size.touchTarget,
      paddingVertical: themes.light.space[4],
    });
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<SearchShowMore onPress={onPress} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('labels the button and draws the label in brand (%s)', async (locale) => {
    const label = locale === 'ar' ? 'عرض المزيد' : 'Show more';
    const view = await renderUi(<SearchShowMore onPress={() => undefined} />, { locale });

    expect(view.getByRole('button', { name: label })).toBeOnTheScreen();
    expect(flatStyle(view.getByText(label).props.style)).toMatchObject({
      ...themes.light.text.headline,
      color: themes.light.colors.brand,
    });
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/search/components/SearchShowMore.tsx')).toEqual([]);
  });
});
