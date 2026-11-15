import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { MapLabel } from './MapLabel';

const hidden = { includeHiddenElements: true } as const;

describe('MapLabel', () => {
  it.each(locales)('renders the title and the subtitle (%s)', async (locale) => {
    await renderUi(<MapLabel subtitle="عمره ٥٤ سنة" title="[عنوان]" />, { locale });
    expect(screen.getByText('[عنوان]', hidden)).toBeOnTheScreen();
    expect(screen.getByText('عمره ٥٤ سنة', hidden)).toBeOnTheScreen();
  });

  it('draws no subtitle when there is none', async () => {
    await renderUi(<MapLabel title="[عنوان]" />);
    expect(screen.queryByText('عمره ٥٤ سنة', hidden)).toBeNull();
  });

  it('is not interactive and is hidden from screen readers (the pin carries the label)', async () => {
    await renderUi(<MapLabel testID="label" title="[عنوان]" />);
    const label = screen.getByTestId('label', hidden);
    expect(label.props.pointerEvents).toBe('none');
    expect(label.props.accessibilityElementsHidden).toBe(true);
    expect(label.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('aligns by the screen side of the pin', async () => {
    const end = await renderUi(<MapLabel testID="label" title="[عنوان]" />);
    expect(flatStyle(screen.getByTestId('label', hidden).props.style).alignItems).toBe('flex-start');
    await end.unmount();
    await renderUi(<MapLabel side="start" testID="label" title="[عنوان]" />);
    expect(flatStyle(screen.getByTestId('label', hidden).props.style).alignItems).toBe('flex-end');
  });

  it('a city label is larger than a place label', async () => {
    const place = await renderUi(<MapLabel title="[عنوان]" />);
    const placeSize = flatStyle(screen.getByText('[عنوان]', hidden).props.style).fontSize as number;
    await place.unmount();
    await renderUi(<MapLabel emphasis="city" title="[عنوان]" />);
    expect(flatStyle(screen.getByText('[عنوان]', hidden).props.style).fontSize as number).toBeGreaterThan(placeSize);
  });

  it('wears a halo in the page colour, and fades when dimmed', async () => {
    await renderUi(<MapLabel dimmed testID="label" title="[عنوان]" />);
    expect(flatStyle(screen.getByText('[عنوان]', hidden).props.style).textShadowColor).toBe(themes.light.colors.surfacePage);
    expect(flatStyle(screen.getByTestId('label', hidden).props.style).opacity).toBe(themes.light.opacity.disabled);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/MapLabel.tsx')).toEqual([]);
  });
});
