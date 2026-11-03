import { router } from 'expo-router';
import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { storage } from '@/core/storage/mmkv';
import { readDiscoverState } from '../store';

import { DiscoverHomeCard } from './DiscoverHomeCard';

jest.mock('expo-router', () => ({
  ...jest.requireActual<typeof import('expo-router')>('expo-router'),
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn() },
}));

beforeEach(() => {
  storage.clearAll();
  jest.clearAllMocks();
});

describe('DiscoverHomeCard', () => {
  it('shows the card to a new person with the first rows', async () => {
    const view = await renderUi(<DiscoverHomeCard />, { locale: 'ar' });
    expect(view.getByTestId('discover-card')).toBeOnTheScreen();
    expect(view.getByText('٠ من ١٣')).toBeOnTheScreen();
  });

  it('starts the guided tour at the tapped row', async () => {
    const view = await renderUi(<DiscoverHomeCard />, { locale: 'ar' });
    await fireEvent.press(view.getByTestId('discover-card-row-reader.mushaf'));
    expect(readDiscoverState().tourStep).toBe('reader.mushaf');
  });

  it('goes to the full list with «عرض الكل»', async () => {
    const view = await renderUi(<DiscoverHomeCard />, { locale: 'ar' });
    await fireEvent.press(view.getByTestId('discover-view-all'));
    expect(router.push).toHaveBeenCalledWith('/discover');
  });

  it('hides the card with «إخفاء»', async () => {
    const view = await renderUi(<DiscoverHomeCard />, { locale: 'ar' });
    await fireEvent.press(view.getByTestId('discover-hide'));
    expect(view.queryByTestId('discover-card')).toBeNull();
  });

  it('goes to the full screen with «عرض الكل»', async () => {
    const view = await renderUi(<DiscoverHomeCard />, { locale: 'ar' });
    await fireEvent.press(view.getByTestId('discover-view-all'));
    expect(router.push).toHaveBeenCalledWith('/discover');
  });
});
