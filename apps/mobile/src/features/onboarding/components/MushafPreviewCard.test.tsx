import { screen } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { MushafPreviewCard } from './MushafPreviewCard';

describe('MushafPreviewCard', () => {
  it('draws the Hafs preview picture at the artwork ratio, inside a page card', async () => {
    const view = await renderUi(<MushafPreviewCard />);

    expect(view.getByTestId('onboarding-mushaf-preview')).toBeOnTheScreen();
    expect(view.getByTestId('onboarding-mushaf-preview-image').props.style).toMatchObject({
      aspectRatio: 1074 / 571,
      width: '100%',
    });
  });

  it('tints the picture with the primary ink, so it follows light and dark mode', async () => {
    const light = await renderUi(<MushafPreviewCard />, { theme: 'light' });
    expect(light.getByTestId('onboarding-mushaf-preview-image').props.tintColor).toBe(themes.light.colors.ink);

    const dark = await renderUi(<MushafPreviewCard />, { theme: 'dark' });
    expect(dark.getByTestId('onboarding-mushaf-preview-image').props.tintColor).toBe(themes.dark.colors.ink);
  });

  it('is decorative: hidden from screen readers and carrying no label', async () => {
    await renderUi(<MushafPreviewCard />);

    expect(screen.getByTestId('onboarding-mushaf-preview-image').props.accessible).toBe(false);
    expect(screen.queryByRole('image')).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/onboarding/components/MushafPreviewCard.tsx')).toEqual([]);
  });
});
