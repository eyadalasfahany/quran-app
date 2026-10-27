import { highContrast } from '@quran/design-tokens';
import { waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { SearchMessage } from './SearchMessage';

describe('SearchMessage', () => {
  beforeEach(() => {
    jest.mocked(AccessibilityInfo.isDarkerSystemColorsEnabled).mockResolvedValue(false);
  });

  it('renders the message as muted body text', async () => {
    const view = await renderUi(<SearchMessage message="لا توجد نتائج" testID="message" />);
    const text = view.getByTestId('message');

    expect(text).toHaveTextContent('لا توجد نتائج');
    expect(flatStyle(text.props.style)).toMatchObject({
      ...themes.light.text.body,
      color: themes.light.colors.inkMuted,
    });
    expect(text.props.dynamicTypeRamp).toBe('body');
  });

  it('uses the high-contrast muted ink when Increase Contrast is on', async () => {
    jest.mocked(AccessibilityInfo.isDarkerSystemColorsEnabled).mockResolvedValue(true);
    const view = await renderUi(<SearchMessage message="m" testID="message" />, { theme: 'dark' });

    await waitFor(() =>
      expect(flatStyle(view.getByTestId('message').props.style).color).toBe(highContrast.dark.inkMuted),
    );
  });

  it('is read as plain text, not a control', async () => {
    const view = await renderUi(<SearchMessage message="No results" />);

    expect(view.queryByRole('button')).toBeNull();
    expect(view.getByText('No results')).toBeOnTheScreen();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const message = locale === 'ar' ? 'ابدأ بالكتابة للبحث في القرآن' : 'Type to search the Quran';
    const view = await renderUi(<SearchMessage message={message} />, { locale });

    expect(view.getByText(message)).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/search/components/SearchMessage.tsx')).toEqual([]);
  });
});
