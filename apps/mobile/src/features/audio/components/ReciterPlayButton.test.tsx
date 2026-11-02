import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { ReciterPlayButton } from './ReciterPlayButton';

// Every value of one prop anywhere in the rendered tree, in render order.
function propValues(node: unknown, key: string): unknown[] {
  if (node === null || typeof node !== 'object') {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap((child) => propValues(child, key));
  }
  const record = node as { props?: Record<string, unknown>; children?: unknown };
  const own = record.props !== undefined && key in record.props ? [record.props[key]] : [];
  return [...own, ...propValues(record.children, key)];
}

describe('ReciterPlayButton', () => {
  it('is a 44 pt round button labelled with the reciter', async () => {
    const view = await renderUi(<ReciterPlayButton label="تشغيل مشاري" onPress={() => undefined} progress={null} />);
    const button = view.getByRole('button', { name: 'تشغيل مشاري' });

    expect(flatStyle(button.props.style)).toMatchObject({ height: 44, width: 44, borderRadius: 22, borderWidth: 1 });
    expect(button.props.accessibilityState).toEqual({ busy: false });
  });

  it('draws no progress ring when no pack is downloading', async () => {
    const view = await renderUi(
      <ReciterPlayButton label="تشغيل" onPress={() => undefined} progress={null} testID="play" />,
    );

    expect(view.queryByTestId('play-ring')).toBeNull();
  });

  it('draws the buffering ring and the pause glyph while starting, and busy', async () => {
    const view = await renderUi(
      <ReciterPlayButton label="إيقاف مؤقت" onPress={() => undefined} progress={null} starting testID="play" />,
    );

    expect(await view.findByTestId('play-buffering', { includeHiddenElements: true })).toBeTruthy();
    expect(propValues(view.toJSON(), 'd')[0]).toBe('M6 5h4v14H6zM14 5h4v14h-4z');
    expect(view.getByRole('button', { name: 'إيقاف مؤقت' }).props.accessibilityState).toEqual({ busy: true });
  });

  it('ignores a second tap while the reciter starts', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<ReciterPlayButton label="إيقاف مؤقت" onPress={onPress} progress={null} starting />);

    fireEvent.press(view.getByRole('button', { name: 'إيقاف مؤقت' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('gives the download ring precedence over the buffering ring while a pack downloads', async () => {
    const view = await renderUi(
      <ReciterPlayButton label="تشغيل" onPress={() => undefined} progress={0.4} starting testID="play" />,
    );

    expect(view.queryByTestId('play-buffering', { includeHiddenElements: true })).toBeNull();
    expect(view.getByTestId('play-ring')).toBeTruthy();
  });

  it('draws a determinate ring while downloading and marks the button busy', async () => {
    const view = await renderUi(
      <ReciterPlayButton hint="جارٍ التنزيل" label="تشغيل" onPress={() => undefined} progress={0.5} testID="play" />,
    );
    const button = view.getByRole('button', { name: 'تشغيل' });

    expect(view.getByTestId('play-ring')).toBeOnTheScreen();
    expect(button.props.accessibilityState).toEqual({ busy: true });
    expect(button.props.accessibilityHint).toBe('جارٍ التنزيل');
  });

  it('clamps the ring progress to the 0 to 1 range', async () => {
    const view = await renderUi(<ReciterPlayButton label="تشغيل" onPress={() => undefined} progress={3} testID="play" />);

    // A zero offset is dropped from the serialized SVG props, so a missing value means a full ring.
    expect(propValues(view.toJSON(), 'strokeDashoffset').at(-1) ?? 0).toBe(0);
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<ReciterPlayButton label="تشغيل" onPress={onPress} progress={null} />);

    await fireEvent.press(view.getByRole('button', { name: 'تشغيل' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('never mirrors the play triangle, and draws a pause glyph while playing (%s)', async (locale) => {
    const paused = await renderUi(
      <ReciterPlayButton label="تشغيل" onPress={() => undefined} progress={null} testID="play" />,
      { locale },
    );
    expect(flatStyle(paused.getByTestId('play-glyph').props.style).transform).toBeUndefined();

    const playing = await renderUi(
      <ReciterPlayButton label="إيقاف مؤقت" onPress={() => undefined} playing progress={null} testID="play" />,
      { locale },
    );
    expect(flatStyle(playing.getByTestId('play-glyph').props.style).transform).toBeUndefined();
    expect(propValues(playing.toJSON(), 'd')).toEqual(['M6 5h4v14H6zM14 5h4v14h-4z']);
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<ReciterPlayButton label="Play" onPress={() => undefined} progress={null} />, {
      locale,
    });

    expect(view.getByRole('button', { name: 'Play' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/components/ReciterPlayButton.tsx')).toEqual([]);
  });
});
