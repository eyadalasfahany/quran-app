import { highContrast } from '@quran/design-tokens';
import { waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { maxFontScale } from './textStyles';
import { TitlePill } from './TitlePill';

describe('TitlePill', () => {
  beforeEach(() => {
    jest.mocked(AccessibilityInfo.isDarkerSystemColorsEnabled).mockResolvedValue(false);
  });

  it('renders the title in Amiri Bold and the subtitle as a caption', async () => {
    const view = await renderUi(<TitlePill subtitle="صفحة ١ · الجزء ١" title="الفاتحة" />);
    const title = flatStyle(view.getByText('الفاتحة').props.style);
    const subtitle = flatStyle(view.getByText('صفحة ١ · الجزء ١').props.style);

    expect(title).toMatchObject({ color: themes.light.colors.ink, fontFamily: 'Amiri-Bold' });
    expect(title.fontWeight).toBeUndefined();
    expect(subtitle).toMatchObject({ ...themes.light.text.caption, color: themes.light.colors.inkMuted });
  });

  it('renders without a subtitle', async () => {
    const view = await renderUi(<TitlePill title="البقرة" />);

    expect(view.getByRole('header', { name: 'البقرة' })).toBeOnTheScreen();
  });

  it('reads as one header with both lines', async () => {
    const view = await renderUi(<TitlePill subtitle="Page 2" title="Al-Baqarah" />, { locale: 'en' });

    expect(view.getByRole('header', { name: 'Al-Baqarah, Page 2' })).toBeOnTheScreen();
  });

  it('lets touches through to the page and caps text growth for a floating bar', async () => {
    const view = await renderUi(<TitlePill subtitle="sub" testID="title" title="title" />);

    expect(flatStyle(view.getByTestId('title').props.style).pointerEvents).toBe('none');
    expect(view.getByText('title').props.maxFontSizeMultiplier).toBe(maxFontScale.bar);
    expect(view.getByText('sub').props.dynamicTypeRamp).toBe('footnote');
  });

  it('uses the high-contrast muted ink when Increase Contrast is on', async () => {
    jest.mocked(AccessibilityInfo.isDarkerSystemColorsEnabled).mockResolvedValue(true);
    const view = await renderUi(<TitlePill subtitle="sub" title="title" />, { theme: 'sepia' });

    await waitFor(() =>
      expect(flatStyle(view.getByText('sub').props.style).color).toBe(highContrast.sepia.inkMuted),
    );
  });

  it.each(locales)('centres its text in %s', async (locale) => {
    const view = await renderUi(<TitlePill testID="title" title="title" />, { locale });

    expect(flatStyle(view.getByTestId('title').props.style).alignItems).toBe('center');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('TitlePill.tsx')).toEqual([]);
  });
});
