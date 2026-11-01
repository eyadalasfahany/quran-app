import { act, render } from '@testing-library/react-native';
import { Dimensions, Text } from 'react-native';

import { useIsShortWindow, useWidthClass, useWindowClass } from './useWindowClass';
import type { WindowClass } from './window-class';

function setSize(width: number, height: number): void {
  Dimensions.set({
    screen: { fontScale: 1, height, scale: 1, width },
    window: { fontScale: 1, height, scale: 1, width },
  });
}

// All three hooks in one tree, so each case renders once.
function Probes() {
  return (
    <>
      <Text testID="layout">{useWindowClass()}</Text>
      <Text testID="width">{useWidthClass()}</Text>
      <Text testID="short">{String(useIsShortWindow())}</Text>
    </>
  );
}

function read(view: Awaited<ReturnType<typeof render>>, testID: string): string {
  return String(view.getByTestId(testID).props.children);
}

describe('useWindowClass (ADR 0036)', () => {
  afterEach(() => {
    setSize(390, 844);
  });

  it.each<[number, number, WindowClass, WindowClass]>([
    // [width, height, layout class, width class]
    [844, 390, 'compact', 'expanded'],
    [956, 440, 'compact', 'expanded'],
    [1024, 768, 'expanded', 'expanded'],
    [700, 1000, 'medium', 'medium'],
    [1024, 479, 'compact', 'expanded'],
    [1024, 480, 'expanded', 'expanded'],
  ])('at %i by %i the layout class is %s and the width class %s', async (width, height, layout, widthClass) => {
    setSize(width, height);
    const view = await render(<Probes />);

    expect(read(view, 'layout')).toBe(layout);
    expect(read(view, 'width')).toBe(widthClass);
    view.unmount();
  });

  it('reports a short window for a landscape phone', async () => {
    setSize(844, 390);
    const view = await render(<Probes />);

    expect(read(view, 'short')).toBe('true');
    view.unmount();
  });

  it('drops the sidebar when a wide window is rotated short, and brings it back when it is tall', async () => {
    setSize(1024, 768);
    const view = await render(<Probes />);

    expect(read(view, 'layout')).toBe('expanded');

    await act(async () => {
      setSize(1024, 400);
    });
    expect(read(view, 'layout')).toBe('compact');

    await act(async () => {
      setSize(1024, 768);
    });
    expect(read(view, 'layout')).toBe('expanded');
    view.unmount();
  });
});
