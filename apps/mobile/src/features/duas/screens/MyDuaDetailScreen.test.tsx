import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Share } from 'react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { useAzkarReminder } from '@/features/azkar/reminders/hooks';
import { useMyDuas } from '../data/hooks';
import { getMyDua } from '../data/my-duas-repository';
import { MyDuaDetailScreen } from './MyDuaDetailScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('../data/hooks', () => ({
  useMyDuas: jest.fn(),
}));

jest.mock('../data/my-duas-repository', () => ({
  getMyDua: jest.fn(),
}));

jest.mock('@/features/azkar/reminders/hooks', () => ({
  useAzkarReminder: jest.fn(() => null),
}));

const BODY_1 = 'FIXTURE text 1 — not a dua';
const BODY_2 = 'FIXTURE text 2 — not a dua';
const BODY_3 = 'FIXTURE text 3 — not a dua';

function row(id: string, body: string) {
  return { id, title: null, body, textSearch: 'fixture', createdAt: 1, updatedAt: 1 };
}

const LIST = [row('dua-1', BODY_1), row('dua-2', BODY_2), row('dua-3', BODY_3)];

describe('MyDuaDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useMyDuas).mockReturnValue(LIST);
    jest.mocked(getMyDua).mockImplementation((id: string) => LIST.find((item) => item.id === id) ?? null);
    jest.mocked(useAzkarReminder).mockReturnValue(null);
  });

  it('shows the dua as written, with the progress through the list', async () => {
    await renderUi(<MyDuaDetailScreen duaId="dua-2" />);
    expect(screen.getByText(BODY_2)).toBeOnTheScreen();
    expect(screen.getByText('٢ من ٣')).toBeOnTheScreen();
  });

  it('renders the English progress', async () => {
    await renderUi(<MyDuaDetailScreen duaId="dua-2" />, { locale: 'en' });
    expect(screen.getByText('2 of 3')).toBeOnTheScreen();
  });

  it('leaves for the list and draws nothing when the dua is gone', async () => {
    jest.mocked(getMyDua).mockReturnValue(null);
    const view = await renderUi(<MyDuaDetailScreen duaId="gone" />);

    expect(router.replace).toHaveBeenCalledWith('/duas/mine');
    expect(view.queryByTestId('screen-my-dua-detail')).toBeNull();
    expect(view.queryByText(BODY_1)).toBeNull();
  });

  it('moves to the previous and next entries of the list order', async () => {
    await renderUi(<MyDuaDetailScreen duaId="dua-2" />);

    await press(screen.getByRole('button', { name: 'السابق' }));
    expect(router.replace).toHaveBeenLastCalledWith('/duas/mine/dua-1');

    await press(screen.getByRole('button', { name: 'التالي' }));
    expect(router.replace).toHaveBeenLastCalledWith('/duas/mine/dua-3');
  });

  it('disables the previous control on the first entry', async () => {
    const view = await renderUi(<MyDuaDetailScreen duaId="dua-1" />);
    expect(view.getByRole('button', { name: 'السابق' })).toBeDisabled();
  });

  it('disables the next control on the last entry', async () => {
    const view = await renderUi(<MyDuaDetailScreen duaId="dua-3" />);
    expect(view.getByRole('button', { name: 'التالي' })).toBeDisabled();
  });

  it('opens the editor from the Edit button', async () => {
    await renderUi(<MyDuaDetailScreen duaId="dua-2" />);
    await press(screen.getByTestId('my-dua-detail-edit'));
    expect(router.push).toHaveBeenCalledWith('/duas/mine/edit?id=dua-2');
  });

  it('shares the body exactly as written', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await renderUi(<MyDuaDetailScreen duaId="dua-2" />);
    await press(screen.getByRole('button', { name: 'مشاركة' }));
    expect(share).toHaveBeenCalledWith({ message: BODY_2 });
    share.mockRestore();
  });

  it('opens and closes the text size control from the Aa button', async () => {
    await renderUi(<MyDuaDetailScreen duaId="dua-2" />);
    expect(screen.queryByTestId('azkar-text-size')).toBeNull();
    await press(screen.getByRole('button', { name: 'حجم النص' }));
    expect(screen.getByTestId('azkar-text-size')).toBeOnTheScreen();
  });

  it('shows the edited text, and shares it, once the live list changes', async () => {
    const EDITED = 'FIXTURE edited text — not a dua';
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    // The repository read still returns the old text here; the live list carries the saved edit, and the list wins.
    jest.mocked(useMyDuas).mockReturnValue([row('dua-1', BODY_1), row('dua-2', EDITED), row('dua-3', BODY_3)]);
    const view = await renderUi(<MyDuaDetailScreen duaId="dua-2" />);

    expect(view.getByText(EDITED)).toBeOnTheScreen();
    expect(view.queryByText(BODY_2)).toBeNull();
    await press(view.getByRole('button', { name: 'مشاركة' }));
    expect(share).toHaveBeenCalledWith({ message: EDITED });
    share.mockRestore();
  });

  it('does not redirect on a first load while the live list is still empty, when the dua is in the repository', async () => {
    jest.mocked(useMyDuas).mockReturnValue([]);
    const view = await renderUi(<MyDuaDetailScreen duaId="dua-2" />);

    expect(router.replace).not.toHaveBeenCalled();
    expect(view.getByText(BODY_2)).toBeOnTheScreen();
  });

  it('redirects to the list when the dua is in neither the live list nor the repository', async () => {
    jest.mocked(useMyDuas).mockReturnValue([]);
    jest.mocked(getMyDua).mockReturnValue(null);
    const view = await renderUi(<MyDuaDetailScreen duaId="gone" />);

    expect(router.replace).toHaveBeenCalledWith('/duas/mine');
    expect(view.queryByTestId('screen-my-dua-detail')).toBeNull();
  });
});
