import { Text } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { BufferingRing } from './BufferingRing';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const mockReduceMotion = useReducedMotion as unknown as jest.Mock;

// The ring is hidden from screen readers on purpose, so the query includes hidden elements.
function ringOf(view: { getByTestId: (id: string, options?: object) => unknown }) {
  return view.getByTestId('ring', { includeHiddenElements: true }) as { props: Record<string, unknown> };
}

// Every strokeWidth on the rendered ring, from the host tree.
function strokeWidths(node: unknown): unknown[] {
  if (node === null || typeof node !== 'object') {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap(strokeWidths);
  }
  const record = node as { props?: Record<string, unknown>; children?: unknown };
  const own = record.props !== undefined && 'strokeWidth' in record.props ? [record.props.strokeWidth] : [];
  return [...own, ...strokeWidths(record.children)];
}

function Button() {
  return <Text>تشغيل</Text>;
}

describe('BufferingRing', () => {
  beforeEach(() => {
    mockReduceMotion.mockReturnValue(false);
  });

  it('renders the child alone when inactive', async () => {
    const view = await renderUi(
      <BufferingRing active={false} color="#000000" size={44} testID="ring">
        <Button />
      </BufferingRing>,
    );

    expect(view.getByText('تشغيل')).toBeTruthy();
    expect(view.queryByTestId('ring')).toBeNull();
  });

  it('renders the child and a ring on top when active', async () => {
    const view = await renderUi(
      <BufferingRing active color="#000000" size={44} testID="ring">
        <Button />
      </BufferingRing>,
    );

    expect(view.getByText('تشغيل')).toBeTruthy();
    expect(ringOf(view)).toBeTruthy();
  });

  it('hides the ring from screen readers and lets touches pass through it', async () => {
    const view = await renderUi(
      <BufferingRing active color="#000000" size={44} testID="ring">
        <Button />
      </BufferingRing>,
    );
    const ring = ringOf(view);

    expect(ring.props.accessibilityElementsHidden).toBe(true);
    expect(ring.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(ring.props.pointerEvents).toBe('none');
  });

  it('keeps the same ring under Reduce Motion, with the pulse instead of the turn', async () => {
    mockReduceMotion.mockReturnValue(true);
    const view = await renderUi(
      <BufferingRing active color="#000000" size={44} testID="ring">
        <Button />
      </BufferingRing>,
    );

    expect(view.getByText('تشغيل')).toBeTruthy();
    expect(ringOf(view)).toBeTruthy();
  });

  it.each([
    [44, 2],
    [52, 2],
    [59, 2],
    [60, 3],
    [76, 3],
  ])('draws a %i pt ring with a %i pt stroke', async (size, stroke) => {
    const view = await renderUi(
      <BufferingRing active color="#000000" size={size} testID="ring">
        <Button />
      </BufferingRing>,
    );

    const widths = strokeWidths(view.toJSON());
    expect(widths.length).toBeGreaterThan(0);
    expect(widths.every((width) => width === stroke)).toBe(true);
  });

  it.each(locales)('renders the child and the ring in %s', async (locale) => {
    const view = await renderUi(
      <BufferingRing active color="#000000" size={44} testID="ring">
        <Button />
      </BufferingRing>,
      { locale },
    );

    expect(view.getByText('تشغيل')).toBeTruthy();
    expect(ringOf(view)).toBeTruthy();
  });

  it('takes its colours and stroke from the caller, with no raw colour literal in the component', () => {
    expect(rawColorLiterals('BufferingRing.tsx')).toEqual([]);
  });
});
