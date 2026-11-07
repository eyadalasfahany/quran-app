import type { RenderResult } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { colors, themeNames, type ColorTokens, type ThemeName } from '@quran/design-tokens';
import { Text } from 'react-native';

import { i18n, type Locale } from '@/core/i18n';
import { displayFontFamilies, themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { CollectionCover } from './CollectionCover';
import { coverGrounds, coverMetrics, coverOrnaments, coverSlugs, type CoverSize } from './collection-cover';

// Placeholder titles only: no real collection name and no religious text.
const ARABIC_TITLE = 'نص تجريبي — ليس اسم مجموعة';
const ENGLISH_TITLE = 'FIXTURE title — not a collection name';
// The ornament and the inner parts are hidden from screen readers, so queries have to look past that.
const HIDDEN = { includeHiddenElements: true };

const light = themes.light.colors;

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

// The rings are two circles; the star and the diamond are one path and one circle.
function firstOfType(view: RenderResult, type: unknown) {
  const [node] = nodesOfType(view, type);
  if (!node) throw new Error('no node of that type is rendered');
  return node;
}

function drawnShape(view: RenderResult) {
  const circles = nodesOfType(view, 'RNSVGCircle').length;
  const paths = nodesOfType(view, 'RNSVGPath').length;
  if (circles === 2 && paths === 0) return 'rings';
  if (circles === 1 && paths === 1) return 'path-and-circle';
  return 'unknown';
}

// WCAG relative-luminance contrast ratio of two #rrggbb colours.
function luminance(hex: string) {
  const linear = (start: number) => {
    const c = parseInt(hex.slice(start, start + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(1) + 0.7152 * linear(3) + 0.0722 * linear(5);
}

function contrastRatio(hexA: string, hexB: string) {
  const [a, b] = [luminance(hexA), luminance(hexB)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('CollectionCover', () => {
  it.each(coverSlugs)('draws %s on its tone with its ornament', async (slug) => {
    const view = await renderUi(<CollectionCover slug={slug} testID="cover" title={ARABIC_TITLE} />);

    expect(flatStyle(view.getByTestId('cover').props.style).backgroundColor).toBe(light[coverGrounds[slug]]);
    expect(drawnShape(view)).toBe(coverOrnaments[slug] === 'rings' ? 'rings' : 'path-and-circle');
  });

  it('draws the fallback on the neutral ground for a null and an unknown slug', async () => {
    for (const slug of [null, 'unknown']) {
      const view = await renderUi(<CollectionCover slug={slug} testID="cover" title={ARABIC_TITLE} />);

      expect(flatStyle(view.getByTestId('cover').props.style).backgroundColor).toBe(light.coverNeutral);
      expect(drawnShape(view)).toBe('path-and-circle');
    }
  });

  it('draws the title in the cream colour, Amiri Bold, centred', async () => {
    const view = await renderUi(<CollectionCover slug="bukhari" testID="cover" title={ARABIC_TITLE} />);
    const title = view.getByText(ARABIC_TITLE);

    expect(title.props.numberOfLines).toBe(2);
    expect(title.props.maxFontSizeMultiplier).toBe(1.2);
    expect(flatStyle(title.props.style)).toMatchObject({
      color: light.coverTitle,
      fontFamily: 'Amiri-Bold',
      textAlign: 'center',
    });
    expect(displayFontFamilies[700]).toBe('Amiri-Bold');
  });

  it('draws no title text when the title is null', async () => {
    const view = await renderUi(<CollectionCover slug="muslim" testID="cover" title={null} />);

    expect(nodesOfType(view, Text)).toHaveLength(0);
    expect(view.getByTestId('cover-ornament', HIDDEN)).toBeOnTheScreen();
  });

  it('draws no title text at the compact size, the title being printed beside it', async () => {
    const view = await renderUi(<CollectionCover size="compact" slug="bukhari" testID="cover" title={ARABIC_TITLE} />);

    expect(nodesOfType(view, Text)).toHaveLength(0);
    expect(view.queryByText(ARABIC_TITLE)).toBeNull();
    expect(view.getByTestId('cover-ornament', HIDDEN)).toBeOnTheScreen();
  });

  it.each<CoverSize>(['list', 'header'])('keeps the title at the %s size', async (size) => {
    const view = await renderUi(<CollectionCover size={size} slug="bukhari" testID="cover" title={ARABIC_TITLE} />);

    expect(view.getByText(ARABIC_TITLE)).toBeOnTheScreen();
  });

  it('draws no title text for an empty title', async () => {
    const view = await renderUi(<CollectionCover slug="muslim" testID="cover" title="" />);

    expect(nodesOfType(view, Text)).toHaveLength(0);
  });

  it('never shows the English name in the Arabic UI', async () => {
    const view = await renderUi(<CollectionCover slug="muslim" testID="cover" title={null} />, { locale: 'ar' });

    expect(nodesOfType(view, Text)).toHaveLength(0);
    expect(view.queryByText(ENGLISH_TITLE)).toBeNull();
  });

  it.each<CoverSize>(['list', 'header', 'compact'])('renders the %s size at the frame dimensions', async (size) => {
    const view = await renderUi(<CollectionCover size={size} slug="nasai" testID="cover" title={ARABIC_TITLE} />);
    const metrics = coverMetrics[size];

    expect(flatStyle(view.getByTestId('cover').props.style)).toMatchObject({ height: metrics.height, width: metrics.width });
    expect(flatStyle(view.getByTestId('cover-spine', HIDDEN).props.style)).toMatchObject({ width: metrics.spineWidth });
    expect(flatStyle(view.getByTestId('cover-page-edge', HIDDEN).props.style)).toMatchObject({ width: metrics.pageEdgeWidth });
    expect(flatStyle(view.getByTestId('cover-ornament', HIDDEN).props.style)).toMatchObject({
      height: metrics.ornamentSize,
      width: metrics.ornamentSize,
    });
    expect(firstOfType(view, 'RNSVGSvgView').props).toMatchObject({ width: metrics.ornamentSize, height: metrics.ornamentSize });
  });

  it('draws the spine, the page edge and the gold frame line', async () => {
    const view = await renderUi(<CollectionCover slug="tirmidhi" testID="cover" title={ARABIC_TITLE} />);

    expect(flatStyle(view.getByTestId('cover-spine', HIDDEN).props.style)).toMatchObject({
      backgroundColor: light.coverSpine,
      start: 0,
      top: 0,
      bottom: 0,
    });
    expect(flatStyle(view.getByTestId('cover-page-edge', HIDDEN).props.style)).toMatchObject({
      backgroundColor: light.coverPageEdge,
      end: 0,
    });
    expect(flatStyle(view.getByTestId('cover-frame', HIDDEN).props.style)).toMatchObject({
      borderColor: light.coverFrameLine,
      borderWidth: themes.light.stroke.hairline,
    });
  });

  it.each(themeNames)('uses the same ground in %s', async (theme: ThemeName) => {
    const view = await renderUi(<CollectionCover slug="bukhari" testID="cover" title={ARABIC_TITLE} />, { theme });

    expect(flatStyle(view.getByTestId('cover').props.style).backgroundColor).toBe(themes[theme].colors.coverGreen);
  });

  it.each(locales)('renders under %s', async (locale: Locale) => {
    const view = await renderUi(<CollectionCover slug="nasai" testID="cover" title={ARABIC_TITLE} />, { locale });

    expect(view.getByTestId('cover')).toBeOnTheScreen();
    // The spine sits on the start side, so it mirrors with the layout direction.
    expect(flatStyle(view.getByTestId('cover-spine', HIDDEN).props.style)).toMatchObject({ start: 0 });
  });

  it.each(locales)('exposes an image role with a label from the title in %s', async (locale: Locale) => {
    const title = locale === 'ar' ? ARABIC_TITLE : ENGLISH_TITLE;
    const view = await renderUi(<CollectionCover slug="malik" title={title} />, { locale });
    const expected = i18n.getFixedT(locale)('ui.collectionCover.titled', { title });

    expect(expected).toContain(title);
    expect(view.getByRole('image', { name: expected })).toBeOnTheScreen();
  });

  it.each(locales)('labels an untitled cover without a title in %s', async (locale: Locale) => {
    const view = await renderUi(<CollectionCover slug="malik" title={null} />, { locale });
    const expected = i18n.getFixedT(locale)('ui.collectionCover.untitled');

    expect(view.getByRole('image', { name: expected })).toBeOnTheScreen();
  });

  it('lets the caller override the label', async () => {
    const view = await renderUi(<CollectionCover accessibilityLabel="ملصق مخصص" slug="malik" title={ARABIC_TITLE} />);

    expect(view.getByRole('image', { name: 'ملصق مخصص' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('CollectionCover.tsx')).toEqual([]);
  });

  describe('title contrast', () => {
    const grounds = ['coverGreen', 'coverMaroon', 'coverNavy', 'coverBrown', 'coverNeutral'] as const;
    const cases = themeNames.flatMap((theme) => grounds.map((ground) => [theme, ground] as const));

    it.each(cases)('title on %s %s is at least 4.5 : 1', (theme, ground) => {
      expect(contrastRatio(colors[theme].coverTitle, colors[theme][ground])).toBeGreaterThanOrEqual(4.5);
    });

    it('matches the contrast values drawn in the approved frames', () => {
      const expected = { coverGreen: 8.64, coverMaroon: 9.45, coverNavy: 10.18, coverBrown: 8.41, coverNeutral: 6.57 };
      for (const ground of grounds) {
        expect(contrastRatio(colors.light.coverTitle, colors.light[ground])).toBeCloseTo(expected[ground], 1);
      }
    });

    it('has the same cover tokens in every theme', () => {
      const keys = (Object.keys(colors.light) as (keyof ColorTokens)[]).filter((key) => key.startsWith('cover'));

      expect(keys).toHaveLength(13);
      for (const key of keys) {
        expect(colors.sepia[key]).toBe(colors.light[key]);
        expect(colors.dark[key]).toBe(colors.light[key]);
      }
    });

    it('has the frame token values', () => {
      expect(colors.light).toMatchObject({
        coverGreen: '#1f4d40',
        coverMaroon: '#6b2a34',
        coverNavy: '#243b5e',
        coverBrown: '#5c4130',
        coverNeutral: '#4a5a55',
        coverTitle: '#f7f3ea',
        coverOrnament: '#c9a961',
        coverFrameLine: 'rgba(201, 169, 97, 0.7)',
        coverSpine: 'rgba(0, 0, 0, 0.28)',
        coverSpineEdge: 'rgba(201, 169, 97, 0.45)',
        coverPageEdge: '#efe6d2',
        coverShadow: 'rgba(19, 35, 31, 0.28)',
        coverShadowSoft: 'rgba(19, 35, 31, 0.14)',
      });
    });
  });
});
