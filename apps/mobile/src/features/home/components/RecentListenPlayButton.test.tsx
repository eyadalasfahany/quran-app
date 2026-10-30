import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi, svgPaint } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { RecentListenPlayButton } from './RecentListenPlayButton';

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

const colors = themes.light.colors;

describe('RecentListenPlayButton', () => {
  it('is a 44 pt round button, filled brand with an onBrand glyph when filled', async () => {
    const view = await renderUi(<RecentListenPlayButton filled label="تشغيل سورة الكهف" onPress={() => undefined} />);
    const button = view.getByRole('button', { name: 'تشغيل سورة الكهف' });

    expect(flatStyle(button.props.style)).toMatchObject({
      backgroundColor: colors.brand,
      borderRadius: 22,
      height: 44,
      width: 44,
    });
    expect(flatStyle(button.props.style).borderWidth ?? 0).toBe(0);
    expect(propValues(view.toJSON(), 'fill')).toContainEqual(svgPaint(colors.onBrand));
  });

  it('is outlined with a line border and a brand glyph when not filled', async () => {
    const view = await renderUi(<RecentListenPlayButton filled={false} label="تشغيل سورة يس" onPress={() => undefined} />);
    const button = view.getByRole('button', { name: 'تشغيل سورة يس' });

    expect(flatStyle(button.props.style)).toMatchObject({
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.line,
      borderWidth: 1,
      height: 44,
      width: 44,
    });
    expect(propValues(view.toJSON(), 'fill')).toContainEqual(svgPaint(colors.brand));
    expect(propValues(view.toJSON(), 'fill')).not.toContainEqual(svgPaint(colors.onBrand));
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<RecentListenPlayButton filled={false} label="تشغيل" onPress={onPress} />);

    await fireEvent.press(view.getByRole('button', { name: 'تشغيل' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('is labelled as a button in %s', async (locale) => {
    const view = await renderUi(<RecentListenPlayButton filled label={locale === 'ar' ? 'تشغيل' : 'Play'} onPress={() => undefined} />, {
      locale,
    });

    expect(view.getByRole('button', { name: locale === 'ar' ? 'تشغيل' : 'Play' })).toBeOnTheScreen();
  });

  it.each(locales)('mirrors the play triangle in RTL, and draws a pause glyph unmirrored while playing (%s)', async (locale) => {
    const paused = await renderUi(
      <RecentListenPlayButton filled label="تشغيل" onPress={() => undefined} testID="play" />,
      { locale },
    );
    expect(flatStyle(paused.getByTestId('play-glyph').props.style).transform).toEqual(
      locale === 'ar' ? [{ scaleX: -1 }] : undefined,
    );

    const playing = await renderUi(
      <RecentListenPlayButton filled label="إيقاف مؤقت" onPress={() => undefined} playing testID="play" />,
      { locale },
    );
    expect(flatStyle(playing.getByTestId('play-glyph').props.style).transform).toBeUndefined();
    expect(JSON.stringify(playing.toJSON())).toContain('M6 5h4v14H6zM14 5h4v14h-4z');
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/home/components/RecentListenPlayButton.tsx')).toEqual([]);
  });
});
