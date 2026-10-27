import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { RecentSearches } from './RecentSearches';

describe('RecentSearches', () => {
  it('renders nothing when there are no queries', async () => {
    const view = await renderUi(
      <RecentSearches onRemove={() => undefined} onSelect={() => undefined} queries={[]} testID="recent" />,
    );

    expect(view.queryByTestId('recent')).toBeNull();
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

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(
      <RecentSearches onRemove={() => undefined} onSelect={() => undefined} queries={['الرحمن']} />,
      { locale },
    );

    expect(view.getByText('الرحمن')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/search/components/RecentSearches.tsx')).toEqual([]);
  });
});
