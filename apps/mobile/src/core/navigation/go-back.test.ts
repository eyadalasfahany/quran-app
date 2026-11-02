import { router } from 'expo-router';

import { goBackOr, HOME_TAB, MENU_TAB } from './go-back';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(), replace: jest.fn() },
}));

const canGoBack = jest.mocked(router.canGoBack);
const back = jest.mocked(router.back);
const replace = jest.mocked(router.replace);

describe('goBackOr', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pops the stack when there is history', () => {
    canGoBack.mockReturnValue(true);

    goBackOr(MENU_TAB);

    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('replaces the screen with its parent when nothing is under it', () => {
    canGoBack.mockReturnValue(false);

    goBackOr(MENU_TAB);

    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith(MENU_TAB);
  });

  it('names the Menu and Home tabs as the parents', () => {
    expect(MENU_TAB).toBe('/(main)/(menu)');
    expect(HOME_TAB).toBe('/(main)/(home)');
  });
});
