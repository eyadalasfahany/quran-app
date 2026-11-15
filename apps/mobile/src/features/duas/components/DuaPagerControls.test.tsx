import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Text } from 'react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import type { DuaPager } from '../data/category-pager';
import { DuaPagerControls } from './DuaPagerControls';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

// Fixture hrefs only: no dua is written here.
const MIDDLE: DuaPager = {
  position: 2,
  total: 3,
  previousHref: '/duas/category/quran/0',
  nextHref: '/duas/category/quran/2',
};

describe('DuaPagerControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the previous and next chips with their labels', async () => {
    await renderUi(<DuaPagerControls pager={MIDDLE} />);

    expect(screen.getByRole('button', { name: 'السابق' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'التالي' })).toBeOnTheScreen();
  });

  it('replaces the route with the previous and next items of the pager', async () => {
    await renderUi(<DuaPagerControls pager={MIDDLE} />);

    await press(screen.getByRole('button', { name: 'السابق' }));
    expect(router.replace).toHaveBeenLastCalledWith('/duas/category/quran/0');

    await press(screen.getByRole('button', { name: 'التالي' }));
    expect(router.replace).toHaveBeenLastCalledWith('/duas/category/quran/2');
  });

  it('disables the previous chip on the first item but keeps it on screen', async () => {
    await renderUi(<DuaPagerControls pager={{ ...MIDDLE, position: 1, previousHref: null }} />);

    const previous = screen.getByRole('button', { name: 'السابق' });
    expect(previous).toBeOnTheScreen();
    expect(previous.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    await press(previous);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('disables the next chip on the last item', async () => {
    await renderUi(<DuaPagerControls pager={{ ...MIDDLE, position: 3, nextHref: null }} />);

    const next = screen.getByRole('button', { name: 'التالي' });
    expect(next.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    await press(next);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('draws the centre slot between the chips', async () => {
    await renderUi(
      <DuaPagerControls pager={MIDDLE}>
        <Text>FIXTURE centre — not a dua</Text>
      </DuaPagerControls>,
    );

    expect(screen.getByText('FIXTURE centre — not a dua')).toBeOnTheScreen();
  });

  it('renders the English labels', async () => {
    await renderUi(<DuaPagerControls pager={MIDDLE} />, { locale: 'en' });

    expect(screen.getByRole('button', { name: 'Previous' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Next' })).toBeOnTheScreen();
  });
});
