import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { locales, renderUi } from '../../../../jest/render-ui';

import { WidgetsEntryRow } from './WidgetsEntryRow';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('WidgetsEntryRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(locales)('opens the help screen in %s', async (locale) => {
    const view = await renderUi(<WidgetsEntryRow testID="entry" />, { locale });
    fireEvent.press(view.getByTestId('entry'));
    expect(router.push).toHaveBeenCalledWith('/settings/widgets');
  });
});
