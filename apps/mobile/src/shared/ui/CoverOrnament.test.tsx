import type { RenderResult } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import { renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { CoverOrnament } from './CoverOrnament';

const gold = themes.light.colors.coverOrnament;
// The ornament is hidden from screen readers, so queries have to look past that.
const HIDDEN = { includeHiddenElements: true };

// Every rendered node of one host type (react-native-svg draws RNSVGPath, RNSVGCircle and RNSVGSvgView),
// for SVG shapes that the accessibility queries do not reach.
function nodesOfType(view: RenderResult, type: unknown) {
  const found: ReactTestInstance[] = [];
  const walk = (node: ReactTestInstance | string) => {
    if (typeof node === 'string') return;
    if (node.type === type) found.push(node);
    node.children.forEach(walk);
  };
  walk(view.container as unknown as ReactTestInstance);
  return found;
}

function firstOfType(view: RenderResult, type: unknown) {
  const [node] = nodesOfType(view, type);
  if (!node) throw new Error('no node of that type is rendered');
  return node;
}

describe('CoverOrnament', () => {
  it('draws the star as one path and one circle', async () => {
    const view = await renderUi(<CoverOrnament color={gold} shape="star" size={19} testID="ornament" />);

    expect(nodesOfType(view, 'RNSVGPath')).toHaveLength(1);
    expect(nodesOfType(view, 'RNSVGCircle')).toHaveLength(1);
    expect(firstOfType(view, 'RNSVGPath').props.d).toBe('M50 4l13 33 33 13-33 13-13 33-13-33L4 50l33-13z');
  });

  it('draws the rings as two circles', async () => {
    const view = await renderUi(<CoverOrnament color={gold} shape="rings" size={19} testID="ornament" />);

    expect(nodesOfType(view, 'RNSVGPath')).toHaveLength(0);
    expect(nodesOfType(view, 'RNSVGCircle')).toHaveLength(2);
  });

  it('draws the diamond as one path and one circle', async () => {
    const view = await renderUi(<CoverOrnament color={gold} shape="diamond" size={19} testID="ornament" />);

    expect(nodesOfType(view, 'RNSVGPath')).toHaveLength(1);
    expect(firstOfType(view, 'RNSVGPath').props.d).toBe('M50 14 L86 50 L50 86 L14 50 Z');
    expect(nodesOfType(view, 'RNSVGCircle')).toHaveLength(1);
  });

  it('strokes with the colour it is given at width 2.2', async () => {
    const view = await renderUi(<CoverOrnament color={gold} shape="star" size={33} testID="ornament" />);
    const svg = firstOfType(view, 'RNSVGSvgView');

    expect(svg.props).toMatchObject({ fill: 'none', stroke: gold, strokeWidth: 2.2, width: 33, height: 33 });
    expect(view.getByTestId('ornament', HIDDEN).props.style).toMatchObject({ height: 33, width: 33, opacity: 0.8 });
  });

  it('is hidden from screen readers', async () => {
    const view = await renderUi(<CoverOrnament color={gold} shape="star" size={19} testID="ornament" />);
    const node = view.getByTestId('ornament', HIDDEN);

    expect(node.props.accessibilityElementsHidden).toBe(true);
    expect(node.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(node.props.pointerEvents).toBe('none');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('CoverOrnament.tsx')).toEqual([]);
  });
});
