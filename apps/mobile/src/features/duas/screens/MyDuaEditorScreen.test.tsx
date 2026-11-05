import { act, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { renderUi } from '../../../../jest/render-ui';
import { createMyDua, deleteMyDua, getMyDua, updateMyDua } from '../data/my-duas-repository';
import { MyDuaEditorScreen } from './MyDuaEditorScreen';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn(),
    setParams: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

// The dua's reminder reads the user database, which is not open under Jest.
jest.mock('../components/MyDuaReminderRow', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { MyDuaReminderRow: () => createElement(Text, { testID: 'my-dua-reminder-row' }, 'تذكير') };
});

jest.mock('../data/my-duas-repository', () => ({
  createMyDua: jest.fn(() => ({ id: 'new-1', title: null, body: '' })),
  deleteMyDua: jest.fn(),
  getMyDua: jest.fn(() => null),
  updateMyDua: jest.fn(),
}));

/** Runs the card's close animation to its end, then lets the completion leave the route. */
async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
}

const EXISTING = {
  id: 'dua-1',
  title: 'نص تجريبي ١',
  body: 'نص تجريبي ٢ — ليس دعاءً',
  textSearch: '',
  createdAt: 0,
  updatedAt: 0,
};

describe('MyDuaEditorScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(router.back).mockClear();
    jest.mocked(router.replace).mockClear();
    jest.mocked(router.setParams).mockClear();
    jest.mocked(router.canGoBack).mockReturnValue(true);
    jest.mocked(createMyDua).mockClear();
    jest.mocked(updateMyDua).mockClear();
    jest.mocked(deleteMyDua).mockClear();
    jest.mocked(getMyDua).mockReturnValue(null);
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('closes the sheet from its X button, without saving', async () => {
    const view = await renderUi(<MyDuaEditorScreen duaId={null} />);

    await fireEvent.press(view.getByTestId('my-dua-editor-header-close'));
    await settle();

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(updateMyDua).not.toHaveBeenCalled();
    expect(createMyDua).not.toHaveBeenCalled();
  });

  it('saves an existing dua and closes the sheet', async () => {
    jest.mocked(getMyDua).mockReturnValue(EXISTING);
    const view = await renderUi(<MyDuaEditorScreen duaId={EXISTING.id} />);

    await fireEvent.press(view.getByTestId('my-dua-form-save'));
    await settle();

    expect(updateMyDua).toHaveBeenCalledWith(EXISTING.id, { title: EXISTING.title, body: EXISTING.body });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('creates a new dua and closes the sheet, as an edit does', async () => {
    const view = await renderUi(<MyDuaEditorScreen duaId={null} />);

    await fireEvent.changeText(view.getByTestId('my-dua-form-body-input'), 'نص تجريبي ٣ — ليس دعاءً');
    await fireEvent.press(view.getByTestId('my-dua-form-save'));
    await settle();

    expect(createMyDua).toHaveBeenCalledTimes(1);
    expect(createMyDua).toHaveBeenCalledWith({ title: null, body: 'نص تجريبي ٣ — ليس دعاءً' });
    expect(router.setParams).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('deletes the dua once confirmed, and closes the sheet', async () => {
    jest.mocked(getMyDua).mockReturnValue(EXISTING);
    const view = await renderUi(<MyDuaEditorScreen duaId={EXISTING.id} />);

    await fireEvent.press(view.getByTestId('my-dua-form-delete'));
    await fireEvent.press(view.getByRole('button', { name: 'حذف' }));
    await settle();

    expect(deleteMyDua).toHaveBeenCalledWith(EXISTING.id);
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
