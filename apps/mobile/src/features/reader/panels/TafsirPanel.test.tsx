import { fireEvent } from '@testing-library/react-native';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { TafsirPanel, type TafsirOption } from './TafsirPanel';

const AYAH_1_2 = 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ';
const HTML = '<p>الحمد لله: الثناء على الله بصفاته <b>التي كلها أوصاف كمال</b>.</p><p>وبنعمه الظاهرة والباطنة.</p>';

const tafsirs: TafsirOption[] = [
  { authorName: 'نخبة من العلماء', lengthTag: 'مختصر', name: 'التفسير الميسر', resourceId: 16, direction: 'rtl' },
  { authorName: 'ابن كثير', lengthTag: 'مفصّل', name: 'ابن كثير', resourceId: 14 },
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
    expect(screen.getByRole('radio', { name: 'التفسير الميسر, مختصر' }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByRole('radio', { name: 'ابن كثير, مفصّل' }).props.accessibilityState).toEqual({ checked: false });
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

  it('hides the coverage caption for a single-ayah passage', async () => {
    const screen = await renderPanel().view;
    expect(screen.queryByTestId('tafsir-panel-coverage')).toBeNull();
  });

  it.each([
    ['ar', 'يغطي هذا المقطع الآيات ٣–٥'],
    ['en', 'This passage covers ayahs 3–5'],
  ] as const)('shows the range caption in %s', async (locale, caption) => {
    const screen = await renderPanel({ coverage: { from: 3, to: 5 } }, locale).view;
    expect(screen.getByTestId('tafsir-panel-coverage')).toHaveTextContent(caption);
  });

  it('moves to the previous and next ayah', async () => {
    const { props, view } = renderPanel({}, 'en');
    const screen = await view;

    await fireEvent.press(screen.getByRole('button', { name: 'Previous ayah' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Next ayah' }));

    expect(props.onPrevious).toHaveBeenCalledTimes(1);
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });

  it('disables previous at the first ayah', async () => {
    const { view } = renderPanel({ onPrevious: undefined }, 'en');
    const screen = await view;

    expect(screen.getByRole('button', { name: 'Previous ayah' }).props.accessibilityState).toEqual({ disabled: true });
    expect(screen.getByRole('button', { name: 'Next ayah' }).props.accessibilityState).toEqual({ disabled: false });
  });

  it('says so when the tafsir has no passage for this ayah', async () => {
    const screen = await renderPanel({ html: null }, 'en').view;

    expect(screen.getByTestId('tafsir-panel-no-entry')).toHaveTextContent('This tafsir has no passage for this ayah.');
  });

  it('shows the empty state with a download action when nothing is installed', async () => {
    const { props, view } = renderPanel({ downloadTafsirId: 16, tafsirs: [] }, 'en');
    const screen = await view;

    expect(screen.getByText('No tafsir downloaded')).toBeOnTheScreen();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);

    await fireEvent.press(screen.getByRole('button', { name: 'Download this tafsir for offline reading' }));

    expect(props.onDownload).toHaveBeenCalledWith(16);
  });

  it('hides the download action when no tafsir is known to download', async () => {
    const screen = await renderPanel({ downloadTafsirId: null, tafsirs: [] }).view;

    expect(screen.getByText('لا يوجد تفسير محمّل')).toBeOnTheScreen();
    expect(screen.queryByTestId('tafsir-panel-empty-action')).toBeNull();
  });

  it('labels the ayah card for screen readers', async () => {
    const screen = await renderPanel({ ayahLabel: 'الحمد لله رب العالمين الآية ٢' }).view;

    expect(screen.getByTestId('tafsir-panel-ayah').props.accessibilityLabel).toBe('الحمد لله رب العالمين الآية ٢');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/panels/TafsirPanel.tsx')).toEqual([]);
  });
});
