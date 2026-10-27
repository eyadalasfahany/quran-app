import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { RecentSearches } from './RecentSearches';

describe('RecentSearches', () => {
  it('renders nothing when there are no queries', async () => {
    const view = await renderUi(
      <RecentSearches onRemove={() => undefined} onSelect={() => undefined} queries={[]} testID="recent" />,
    );

    expect(view.queryByTestId('recent')).toBeNull();
  });

  it('renders the section title and one row per query', async () => {
    const view = await renderUi(
      <RecentSearches onRemove={() => undefined} onSelect={() => undefined} queries={['الرحمن', 'الكهف']} />,
    );

    expect(flatStyle(view.getByText('عمليات البحث الأخيرة').props.style)).toMatchObject({
      ...themes.light.text.headline,
      color: themes.light.colors.ink,
    });
    expect(view.getByText('الرحمن')).toBeOnTheScreen();
    expect(view.getByText('الكهف')).toBeOnTheScreen();
  });

  it('calls onSelect when a query row is pressed', async () => {
    const onSelect = jest.fn();
    const view = await renderUi(
      <RecentSearches onRemove={() => undefined} onSelect={onSelect} queries={['الرحمن']} testID="recent" />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'الرحمن' }));

    expect(onSelect).toHaveBeenCalledWith('الرحمن');
  });

  it('calls onRemove from the trailing control', async () => {
    const onRemove = jest.fn();
    const view = await renderUi(
      <RecentSearches onRemove={onRemove} onSelect={() => undefined} queries={['الرحمن']} testID="recent" />,
    );

    await fireEvent.press(view.getByTestId('recent-remove-الرحمن'));

    expect(onRemove).toHaveBeenCalledWith('الرحمن');
  });

  it('draws the remove control as a labelled icon button with a touch-sized target', async () => {
    const view = await renderUi(
      <RecentSearches onRemove={() => undefined} onSelect={() => undefined} queries={['الرحمن']} testID="recent" />,
    );
    const remove = view.getByRole('button', { name: 'إزالة الرحمن' });

    expect(remove.props.testID).toBe('recent-remove-الرحمن');
    expect(flatStyle(remove.props.style)).toMatchObject({
      height: themes.light.size.touchTarget,
      width: themes.light.size.touchTarget,
    });
    expect(view.queryByText('×')).toBeNull();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(
      <RecentSearches onRemove={() => undefined} onSelect={() => undefined} queries={['الرحمن']} />,
      { locale },
    );

    expect(view.getByText('الرحمن')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: locale === 'ar' ? 'إزالة الرحمن' : 'Remove الرحمن' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/search/components/RecentSearches.tsx')).toEqual([]);
  });
});
