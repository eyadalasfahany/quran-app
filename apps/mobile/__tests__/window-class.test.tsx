import { act, render } from '@testing-library/react-native';
import { Dimensions, Text } from 'react-native';

import { useWindowClass } from '@/core/layout';
import { nextWindowClass, type WindowClass } from '@/core/layout/window-class';

function setWidth(width: number): void {
  Dimensions.set({
    screen: { fontScale: 1, height: 800, scale: 1, width },
    window: { fontScale: 1, height: 800, scale: 1, width },
  });
}

function Probe() {
  return <Text testID="window-class">{useWindowClass()}</Text>;
}

describe('window class boundaries', () => {
  it.each<[number, WindowClass, WindowClass]>([
    [583, 'medium', 'compact'],
    [584, 'medium', 'medium'],
    [599, 'medium', 'medium'],
    [616, 'compact', 'medium'],
    [823, 'expanded', 'medium'],
    [824, 'expanded', 'expanded'],
    [856, 'medium', 'expanded'],
  ])('at %i, coming from %s, resolves to %s', (width, previous, expected) => {
    expect(nextWindowClass(width, previous)).toBe(expected);
  });

  it('takes the new class when a resize jumps both boundaries', () => {
    expect(nextWindowClass(900, 'compact')).toBe('expanded');
    expect(nextWindowClass(400, 'expanded')).toBe('compact');
  });
});

describe('useWindowClass', () => {
  afterEach(() => {
    act(() => {
      setWidth(390);
    });
  });

  it('walks the boundary widths up and back down', async () => {
    setWidth(583);
    const view = await render(<Probe />);
    const read = () => view.getByTestId('window-class').props.children as string;

    expect(read()).toBe('compact');

    for (const [width, expected] of [
      [584, 'compact'],
      [599, 'compact'],
      [616, 'medium'],
      [823, 'medium'],
      [824, 'medium'],
      [856, 'expanded'],
      [824, 'expanded'],
      [823, 'medium'],
      [599, 'medium'],
      [584, 'medium'],
      [583, 'compact'],
    ] as const) {
      await act(async () => {
        setWidth(width);
      });
      expect(read()).toBe(expected);
    }

    view.unmount();
  });
});
