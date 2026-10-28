import { quranTypeScale } from '@quran/design-tokens';
import { fireEvent } from '@testing-library/react-native';

import { quranFontFamily, themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { TafsirPanel, type TafsirOption } from './TafsirPanel';

const AYAH_1_2 = 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ';
const HTML = '<p>الحمد لله: الثناء على الله بصفاته <b>التي كلها أوصاف كمال</b>.</p><p>وبنعمه الظاهرة والباطنة.</p>';

const tafsirs: TafsirOption[] = [
  {
    authorName: 'نخبة من العلماء',
    name: 'Al-Muyassar',
    nameAr: 'التفسير الميسر',
    resourceId: 16,
    direction: 'rtl',
  },
  { authorName: 'ابن كثير', name: 'Ibn Kathir', nameAr: 'ابن كثير', resourceId: 14 },
];

type TextNode = string | { children: readonly TextNode[] };

function textContent(node: TextNode): string {
  if (typeof node === 'string') {
    return node;
  }
  return node.children.map(textContent).join('');
}

function htmlTextContent(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function renderPanel(overrides: Partial<Parameters<typeof TafsirPanel>[0]> = {}, locale: 'ar' | 'en' = 'ar') {
  const props: Parameters<typeof TafsirPanel>[0] = {
    coverage: null,
    downloadTafsirId: null,
    html: HTML,
    onDownload: jest.fn(),
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    onSelect: jest.fn(),
    selectedId: 16,
    tafsirs,
    textUthmani: AYAH_1_2,
    verseNumber: 2,
    ...overrides,
  };
  return { props, view: renderUi(<TafsirPanel {...props} />, { locale }) };
}

describe('TafsirPanel', () => {
  it('renders the picker as a radio group with the selected tafsir checked', async () => {
    const { view } = renderPanel();
    const screen = await view;

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'التفسير الميسر' }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByRole('radio', { name: 'ابن كثير' }).props.accessibilityState).toEqual({ checked: false });
  });

  it('calls onSelect with the resource id', async () => {
    const { props, view } = renderPanel();
    const screen = await view;

    await fireEvent.press(screen.getByTestId('tafsir-panel-option-14'));

    expect(props.onSelect).toHaveBeenCalledWith(14);
  });

  it('renders the tafsir HTML without altering its text', async () => {
    const { view } = renderPanel();
    const screen = await view;

    expect(textContent(screen.getByTestId('tafsir-panel-body'))).toBe(htmlTextContent(HTML));
  });

  it('keeps the Uthmani ayah exactly as stored with its marker', async () => {
    const { view } = renderPanel();
    const screen = await view;

    expect(screen.getByTestId('tafsir-panel-ayah-text').props.children).toBe(AYAH_1_2);
    expect(textContent(screen.getByTestId('tafsir-panel-ayah-block'))).toBe(`${AYAH_1_2} ﴿٢﴾`);
  });

  it('draws the ayah in a page-toned card with the frame radius, in the Quran font at the reader scale', async () => {
    const screen = await renderPanel({ fontScale: 1.2 }).view;
    const block = screen.getByTestId('tafsir-panel-ayah-block');

    expect(flatStyle(screen.getByTestId('tafsir-panel-ayah').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surfacePage,
      borderColor: themes.light.colors.line,
      borderRadius: themes.light.radius.card,
      paddingVertical: themes.light.space[3],
    });
    expect(block.props.allowFontScaling).toBe(false);
    expect(flatStyle(block.props.style)).toMatchObject({
      fontFamily: quranFontFamily,
      fontSize: quranTypeScale.quranPanel.size * 1.2,
    });
  });

  it.each(locales)('sets the ayah block right to left and right-aligned in %s', async (locale) => {
    const { view } = renderPanel({}, locale);
    const screen = await view;

    expect(flatStyle(screen.getByTestId('tafsir-panel-ayah-block').props.style)).toMatchObject({
      textAlign: 'right',
      writingDirection: 'rtl',
    });
  });

  it.each(locales)('shows the source caption in %s', async (locale) => {
    const { view } = renderPanel({}, locale);
    const screen = await view;

    expect(screen.getByTestId('tafsir-panel-source')).toHaveTextContent(
      locale === 'ar' ? 'المصدر: نخبة من العلماء · عبر Quran Foundation' : 'Source: نخبة من العلماء · via Quran Foundation',
    );
  });

  it.each([
    ['ar', 'يغطي هذا المقطع الآية ٢'],
    ['en', 'This passage covers ayah 2'],
  ] as const)('names the single ayah the passage covers in %s', async (locale, caption) => {
    const screen = await renderPanel({}, locale).view;
    expect(screen.getByTestId('tafsir-panel-coverage')).toHaveTextContent(caption);
  });

  it('hides the coverage caption when the tafsir has no passage for this ayah', async () => {
    const screen = await renderPanel({ html: null }, 'en').view;
    expect(screen.queryByTestId('tafsir-panel-coverage')).toBeNull();
  });

  it('scrolls the tafsir picker in a sheet', async () => {
    const screen = await renderPanel({ layout: 'sheet' }, 'en').view;

    expect(screen.getByLabelText('Choose a tafsir').props.horizontal).toBe(true);
  });

  it('wraps the tafsir picker in the side panel', async () => {
    const screen = await renderPanel({ layout: 'panel' }, 'en').view;

    expect(screen.getByLabelText('Choose a tafsir').props.horizontal).toBeUndefined();
  });

  it('floats the previous and next bar over a sheet', async () => {
    const screen = await renderPanel({ layout: 'sheet' }, 'en').view;

    expect(screen.getByTestId('tafsir-panel-steps-pill')).toBeOnTheScreen();
  });

  it('sets the previous and next buttons at the foot of the side panel', async () => {
    const screen = await renderPanel({ layout: 'panel' }, 'en').view;

    expect(screen.queryByTestId('tafsir-panel-steps-pill')).toBeNull();
    expect(screen.getByTestId('tafsir-panel-steps')).toBeOnTheScreen();
  });

  it.each([
    ['sheet', 12],
    ['panel', 13],
  ] as const)('sets the source credit at %s pt in the %s layout', async (layout, size) => {
    const screen = await renderPanel({ layout }, 'en').view;

    expect(flatStyle(screen.getByTestId('tafsir-panel-source').props.style).fontSize).toBe(size);
  });

  it('leaves the frame gap between the passage and its credit', async () => {
    const screen = await renderPanel({}, 'en').view;
    const column = screen.getByTestId('tafsir-panel-body').parent;

    expect(flatStyle(column?.props.style).gap).toBe(themes.light.size.bodyCreditGap);
  });

  it.each([
    ['ar', 'التفسير الميسر', 'ابن كثير'],
    ['en', 'Al-Muyassar', 'Ibn Kathir'],
  ] as const)('shows the %s name on the chips and in the name row', async (locale, selectedName, otherName) => {
    const screen = await renderPanel({}, locale).view;

    expect(screen.getByRole('radio', { name: selectedName })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: otherName })).toBeOnTheScreen();
    expect(screen.getByTestId('tafsir-panel-name')).toHaveTextContent(selectedName);
  });

  it('falls back to the other name, then to the numbered placeholder, when a name is missing', async () => {
    const onlyEnglish = await renderPanel(
      { tafsirs: [{ authorName: null, name: 'Al-Muyassar', nameAr: null, resourceId: 16 }] },
      'ar',
    ).view;
    expect(onlyEnglish.getByTestId('tafsir-panel-name')).toHaveTextContent('Al-Muyassar');

    const unnamed = await renderPanel({ tafsirs: [{ authorName: null, name: null, nameAr: null, resourceId: 16 }] }, 'ar').view;
    expect(unnamed.getByTestId('tafsir-panel-name')).toHaveTextContent('تفسير 16');
    expect(unnamed.getByTestId('tafsir-panel-source')).toHaveTextContent('المصدر: تفسير 16 · عبر Quran Foundation');
  });

  it('credits the display name when the tafsir has no author', async () => {
    const screen = await renderPanel(
      { tafsirs: [{ authorName: null, name: 'Al-Muyassar', nameAr: 'التفسير الميسر', resourceId: 16 }] },
      'en',
    ).view;

    expect(screen.getByTestId('tafsir-panel-source')).toHaveTextContent('Source: Al-Muyassar · via Quran Foundation');
  });

  it('sets the passage direction from the tafsir', async () => {
    const screen = await renderPanel(
      { tafsirs: [{ authorName: null, direction: 'ltr', name: 'Ibn Kathir', nameAr: null, resourceId: 14 }], selectedId: 14 },
      'en',
    ).view;

    expect(flatStyle(screen.getByTestId('tafsir-panel-body').props.style)).toMatchObject({ direction: 'ltr' });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/panels/TafsirPanel.tsx')).toEqual([]);
  });
});
