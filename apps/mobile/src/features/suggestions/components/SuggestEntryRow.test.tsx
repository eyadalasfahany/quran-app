import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { locales, renderUi } from '../../../../jest/render-ui';

import { SuggestEntryRow } from './SuggestEntryRow';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('SuggestEntryRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(locales)('is a labelled button with its title and hint in %s', async (locale) => {
    const view = await renderUi(<SuggestEntryRow />, { locale });

    expect(view.getByRole('button', { name: locale === 'ar' ? 'اقترح فكرة, شاركنا فكرة لتحسين طيبة' : 'Suggest an idea, Share an idea to improve Taybah' })).toBeOnTheScreen();
  });

  it('opens the suggestion sheet', async () => {
    const view = await renderUi(<SuggestEntryRow testID="entry" />);

    fireEvent.press(view.getByTestId('entry'));

    expect(router.push).toHaveBeenCalledWith('/settings/suggest');
  });
});
