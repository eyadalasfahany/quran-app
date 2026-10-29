import { processColor } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { MiniPlayerChevron } from './MiniPlayerChevron';

const colors = themes.light.colors;

// The chevron's stroke, found by walking down from its wrapper to the drawn path.
function findPath(node: { props: Record<string, unknown>; children: unknown[] }): { props: Record<string, unknown> } {
  if (node.props.d !== undefined) {
    return node;
  }
  for (const child of node.children) {
    if (typeof child === 'object' && child !== null && 'children' in child) {
      try {
        return findPath(child as Parameters<typeof findPath>[0]);
      } catch {
        // Not under this child; keep looking.
      }
    }
  }
  throw new Error('No chevron path found.');
}

describe('MiniPlayerChevron', () => {
  it.each(locales)('sits at the top centre, 16 by 8, in %s', async (locale) => {
    const view = await renderUi(<MiniPlayerChevron />, { locale });
    const box = flatStyle(view.getByTestId('mini-player-chevron', { includeHiddenElements: true }).props.style);

    expect(box).toMatchObject({ left: 0, opacity: 0.7, position: 'absolute', right: 0, top: 5 });
    expect(box.alignItems).toBe('center');
  });

  it('draws the stroke in the muted ink token', async () => {
    const view = await renderUi(<MiniPlayerChevron />);
    const path = findPath(view.getByTestId('mini-player-chevron', { includeHiddenElements: true }));

    expect(path.props.stroke).toEqual({ payload: processColor(colors.inkMuted), type: 0 });
    expect(path.props.strokeWidth).toBe(1.75);
  });

  it('is decorative and takes no touches', async () => {
    const view = await renderUi(<MiniPlayerChevron />);
    const chevron = view.getByTestId('mini-player-chevron', { includeHiddenElements: true });

    expect(chevron.props.pointerEvents).toBe('none');
    expect(chevron.props.accessibilityElementsHidden).toBe(true);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/MiniPlayerChevron.tsx')).toEqual([]);
  });
});
