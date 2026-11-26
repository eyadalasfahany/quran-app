import { act, screen } from '@testing-library/react-native';

import { themes } from '@/core/theme';
import { MUSHAF_KEYS } from '@/features/reader/mushafs';

import { renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { MushafPreviewCard } from './MushafPreviewCard';

const RATIO = 1074 / 571;

// Before the first measurement the picture is 0 pt, and the query treats a zero-size view as hidden; the tests look past that.
const byId = (id: string) => screen.getByTestId(id, { includeHiddenElements: true });

/** Reports the frame's inner width, as the device does after it measures the card. */
async function measure(width: number) {
  const frame = byId('onboarding-mushaf-preview-frame');
  await act(async () => {
    (frame.props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { height: 0, width, x: 0, y: 0 } } });
  });
}

describe('MushafPreviewCard', () => {
  it('draws the picture inside a page card', async () => {
    await renderUi(<MushafPreviewCard mushaf="hafs" />);

    expect(screen.getByTestId('onboarding-mushaf-preview')).toBeOnTheScreen();
    expect(byId('onboarding-mushaf-preview-image')).toBeOnTheScreen();
  });

  it('shows a different picture for each riwayah', async () => {
    await renderUi(
      <>
        {MUSHAF_KEYS.map((key) => (
          <MushafPreviewCard key={key} mushaf={key} testID={`card-${key}`} />
        ))}
      </>,
    );

    const sources = MUSHAF_KEYS.map((key) => screen.getByTestId(`card-${key}-image`).props.source);
    expect(new Set(sources).size).toBe(MUSHAF_KEYS.length);
  });

  it('fills the card inner width exactly, with the height from the artwork ratio', async () => {
    await renderUi(<MushafPreviewCard mushaf="warsh" />);
    await measure(300);

    expect(byId('onboarding-mushaf-preview-image').props.style).toMatchObject({
      height: 300 / RATIO,
      width: 300,
    });
  });

  it('caps the height on a wide window, keeps the ratio, and centres the picture', async () => {
    await renderUi(<MushafPreviewCard mushaf="hafs" />);
    await measure(720);

    const style = byId('onboarding-mushaf-preview-image').props.style;
    expect(style.height).toBe(220);
    expect(style.width).toBeCloseTo(220 * RATIO);
    expect(byId('onboarding-mushaf-preview-frame').props.style).toMatchObject({ alignItems: 'center' });
  });

  it.each(['light', 'dark'] as const)('tints the picture with the primary ink in %s mode', async (theme) => {
    await renderUi(<MushafPreviewCard mushaf="hafs" />, { theme });
    await measure(300);

    expect(byId('onboarding-mushaf-preview-image').props.tintColor).toBe(themes[theme].colors.ink);
  });

  it('is decorative: hidden from screen readers and carrying no label', async () => {
    await renderUi(<MushafPreviewCard mushaf="hafs" />);
    await measure(300);

    expect(byId('onboarding-mushaf-preview-image').props.accessible).toBe(false);
    expect(screen.queryByRole('image')).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/onboarding/components/MushafPreviewCard.tsx')).toEqual([]);
  });
});
