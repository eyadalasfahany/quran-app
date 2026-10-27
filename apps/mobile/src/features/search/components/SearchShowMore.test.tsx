import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { SearchShowMore } from './SearchShowMore';

describe('SearchShowMore', () => {
  it('renders the show-more label', async () => {
    const view = await renderUi(<SearchShowMore onPress={() => undefined} />);

    expect(view.getByText(/Show more|عرض المزيد/)).toBeOnTheScreen();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<SearchShowMore onPress={onPress} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('uses brand colour for the label (%s)', async (locale) => {
    const view = await renderUi(<SearchShowMore onPress={() => undefined} />, { locale });

    const label = view.getByText(/Show more|عرض المزيد/);
    expect(flatStyle(label.props.style).color).toBeDefined();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/search/components/SearchShowMore.tsx')).toEqual([]);
  });
});
