import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { MiniPlayerProgressLine } from './MiniPlayerProgressLine';

const colors = themes.light.colors;

describe('MiniPlayerProgressLine', () => {
  it('fills the played share in the gold token, 3 pt high', async () => {
    const view = await renderUi(<MiniPlayerProgressLine fraction={0.4} />);
    const fill = flatStyle(view.getByTestId('mini-player-progress-fill', { includeHiddenElements: true }).props.style);

    expect(fill.width).toBe('40%');
    expect(fill.height).toBe(3);
    expect(fill.backgroundColor).toBe(colors.gold);
  });

  it('clamps the fraction between 0 and 1', async () => {
    const view = await renderUi(<MiniPlayerProgressLine fraction={1.7} />);

    expect(flatStyle(view.getByTestId('mini-player-progress-fill', { includeHiddenElements: true }).props.style).width).toBe('100%');
  });

  it.each(locales)('lays the track out as a row pinned to both start and end in %s, so the fill starts at the start edge', async (locale) => {
    const view = await renderUi(<MiniPlayerProgressLine fraction={0.5} />, { locale });
    const track = flatStyle(view.getByTestId('mini-player-progress', { includeHiddenElements: true }).props.style);

    expect(track).toMatchObject({ end: 0, flexDirection: 'row', position: 'absolute', start: 0, top: 0 });
  });

  it('is hidden from screen readers', async () => {
    const view = await renderUi(<MiniPlayerProgressLine fraction={0} />);

    expect(view.getByTestId('mini-player-progress', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/MiniPlayerProgressLine.tsx')).toEqual([]);
  });
});
