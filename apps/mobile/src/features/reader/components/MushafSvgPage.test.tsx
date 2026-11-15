import { readFileSync } from 'fs';
import { join } from 'path';
import { i18n } from '@/core/i18n';
import type { WordBox } from '@/core/mushaf-pack';
import { themes } from '@/core/theme';
import { act, fireEvent, screen } from '@testing-library/react-native';
import type { SkPicture } from '@shopify/react-native-skia';
import { useReducedMotion } from 'react-native-reanimated';
import { useScreenReaderEnabled } from '@/shared/useScreenReaderEnabled';
import { resetSkiaCalls, skiaCalls } from '../../../../jest/skia-mock';
import { renderUi } from '../../../../jest/render-ui';
import { buildRegionGeometry, type PageRegionGeometry } from '../mushaf-svg/region-geometry';
import type { SvgPageModel } from '../mushaf-svg/svg-page-model';
import { MushafSvgPage, type MushafSvgPageProps } from './MushafSvgPage';

jest.mock('@shopify/react-native-skia', () => jest.requireActual('../../../../jest/skia-mock'));

jest.mock('@/shared/useScreenReaderEnabled', () => ({ useScreenReaderEnabled: jest.fn(() => false) }));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

// Placeholder rectangles in page units (345 × 550); no artwork and no Quran text.
const RECT = (x0: number, y0: number, x1: number, y1: number) => `M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${y1} L ${x0} ${y1} Z`;
const regions = buildRegionGeometry([
  { ayah: 1, labelX: 1, labelY: 1, polygon: RECT(0, 0, 100, 10), surah: 1 },
  { ayah: 2, labelX: 1, labelY: 1, polygon: RECT(0, 20, 100, 30), surah: 1 },
]);
const model: SvgPageModel = {
  origin: { x: 0, y: 0 },
  pieces: [{ d: 'M 0 0 Z', matrix: [1, 0, 0, 1, 0, 0] }],
  viewBox: { height: 550, width: 345 },
};
const boxes: WordBox[] = [
  { ayah: 1, line: 1, position: 1, surah: 1, x0: 10, x1: 20, y0: 2, y1: 8 },
  { ayah: 1, line: 1, position: 2, surah: 1, x0: 30, x1: 40, y0: 2, y1: 8 },
];

function pictureOf(colour: string): SkPicture {
  return { color: colour, id: colour.length, kind: 'picture' } as unknown as SkPicture;
}

const colours = themes.light.colors;

function page(overrides: Partial<MushafSvgPageProps> = {}) {
  return (
    <MushafSvgPage
      ayahLabel={(region: PageRegionGeometry) => `label ${region.verseKey}`}
      model={model}
      onOpenAyahActions={jest.fn()}
      onSelectVerseKey={jest.fn()}
      page={50}
      pictureOf={pictureOf}
      regions={regions}
      testID="page"
      width={345}
      wordBoxes={boxes}
      {...overrides}
    />
  );
}

// Each event is awaited inside act: bare events in a row leave React's act scope open and break the next render.
async function fire(element: Parameters<typeof fireEvent>[0], name: string, payload?: object) {
  await act(async () => {
    fireEvent(element, name, payload);
  });
}

const drawnOps = () => skiaCalls.filter((call) => ['Path', 'RoundedRect', 'Picture', 'Group'].includes(call.op as string));

beforeEach(() => {
  resetSkiaCalls();
  jest.mocked(useScreenReaderEnabled).mockReturnValue(false);
  jest.mocked(useReducedMotion).mockReturnValue(false);
});

describe('MushafSvgPage', () => {
  it('builds each wash from the parsed points, so a point-list polygon (pages 1–2) draws instead of throwing', async () => {
    const pointList = buildRegionGeometry([{ ayah: 1, labelX: 1, labelY: 1, polygon: '100,10 0,10 0,0 100,0', surah: 1 }], { x: -10, y: -20 });
    await renderUi(page({ regions: pointList }));

    expect(skiaCalls.filter((call) => call.op === 'addPoly')).toEqual([{ close: true, op: 'addPoly', points: 4 }]);
    expect(skiaCalls.some((call) => call.op === 'fromSvg' && call.d === '100,10 0,10 0,0 100,0')).toBe(false);
  });

  it('draws the canvas when the model and the ink picture are ready', async () => {
    await renderUi(page());
    expect(screen.getByTestId('page-press')).toBeTruthy();
    expect(screen.queryByTestId('page-skeleton')).toBeNull();
  });

  it('draws the skeleton while there is no model, and while the picture is not recorded', async () => {
    await renderUi(page({ model: null }));
    expect(screen.getByTestId('page-skeleton')).toBeTruthy();
    await renderUi(page({ pictureOf: () => null }));
    expect(screen.getAllByTestId('page-skeleton').length).toBeGreaterThan(0);
  });

  it('layers the reader colour, then the recited wash, then the pill, the artwork and the light word', async () => {
    await renderUi(
      page({
        highlightByVerseKey: new Map([['1:2', 'green']]),
        recitedVerseKey: '1:1',
        recitedWord: 1,
      }),
    );
    const ops = drawnOps();
    const index = (predicate: (call: (typeof ops)[number]) => boolean) => ops.findIndex(predicate);
    const colourPath = index((call) => call.op === 'Path' && call.color === colours.highlightGreen);
    const washPath = index((call) => call.op === 'Path' && call.color === colours.highlightActive);
    const pill = index((call) => call.op === 'RoundedRect');
    const artwork = index((call) => call.op === 'Picture' && call.pictureColor === colours.ink);
    const lightGroup = index((call) => call.op === 'Group' && call.clip === 'object');
    expect(colourPath).toBeGreaterThanOrEqual(0);
    expect(washPath).toBeGreaterThan(colourPath);
    expect(pill).toBeGreaterThan(washPath);
    expect(artwork).toBeGreaterThan(pill);
    expect(lightGroup).toBeGreaterThan(artwork);
  });

  it('lets the ayah colour win over the recited wash', async () => {
    await renderUi(page({ highlightByVerseKey: new Map([['1:1', 'rose']]), recitedVerseKey: '1:1', recitedWord: null }));
    const paths = drawnOps().filter((call) => call.op === 'Path').map((call) => call.color);
    expect(paths).toEqual([colours.highlightRose]);
  });

  it('draws no pill without a word box, and none when no word is recited', async () => {
    await renderUi(page({ recitedVerseKey: '1:1', recitedWord: 9 }));
    expect(drawnOps().some((call) => call.op === 'RoundedRect')).toBe(false);
    resetSkiaCalls();
    await renderUi(page({ recitedVerseKey: '1:1', recitedWord: null }));
    expect(drawnOps().some((call) => call.op === 'RoundedRect')).toBe(false);
    resetSkiaCalls();
    await renderUi(page({ recitedVerseKey: '1:1', recitedWord: 1, wordBoxes: [] }));
    expect(drawnOps().some((call) => call.op === 'RoundedRect')).toBe(false);
  });

  it('a tap inside a polygon selects its ayah; a tap outside does nothing; a long press opens the actions', async () => {
    const onSelectVerseKey = jest.fn();
    const onOpenAyahActions = jest.fn();
    await renderUi(page({ onOpenAyahActions, onSelectVerseKey }));
    const target = screen.getByTestId('page-press');
    await fire(target, 'press', { nativeEvent: { locationX: 50, locationY: 25 } });
    expect(onSelectVerseKey).toHaveBeenLastCalledWith('1:2');
    await fire(target, 'press', { nativeEvent: { locationX: 300, locationY: 300 } });
    expect(onSelectVerseKey).toHaveBeenCalledTimes(1);
    await fire(target, 'longPress', { nativeEvent: { locationX: 50, locationY: 5 } });
    expect(onOpenAyahActions).toHaveBeenCalledWith('1:1');
  });

  it('with a screen reader, every ayah is a button with its label, its selected state and its hint', async () => {
    jest.mocked(useScreenReaderEnabled).mockReturnValue(true);
    const onSelectVerseKey = jest.fn();
    await renderUi(
      page({
        highlightByVerseKey: new Map([['1:2', 'blue']]),
        onSelectVerseKey,
        recitedVerseKey: '1:1',
        recitedWord: 1,
      }),
    );
    const first = screen.getByLabelText('label 1:1');
    expect(first.props.accessibilityRole).toBe('button');
    expect(first.props.accessibilityState).toEqual({ selected: true });
    expect(first.props.accessibilityHint).toBeTruthy();
    const second = screen.getByLabelText(`label 1:2 ${i18n.t('ui.highlight.blue')}`);
    expect(second.props.accessibilityState).toEqual({ selected: false });
    expect(second.props.accessibilityHint).toBeUndefined();
    await act(async () => {
      fireEvent.press(second);
    });
    expect(onSelectVerseKey).toHaveBeenCalledWith('1:2');
  });

  it('without a screen reader, no ayah buttons are mounted', async () => {
    await renderUi(page());
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('keeps the same canvas transform in Arabic and in English (page units are not mirrored)', async () => {
    const rootTransform = () => skiaCalls.find((call) => call.op === 'Group' && call.transform !== undefined)?.transform;
    resetSkiaCalls();
    await renderUi(page({ recitedVerseKey: '1:1', recitedWord: 1 }), { locale: 'ar' });
    const arabic = rootTransform();
    resetSkiaCalls();
    await renderUi(page({ recitedVerseKey: '1:1', recitedWord: 1 }), { locale: 'en' });
    expect(arabic).toBe('[{"scale":1}]');
    expect(rootTransform()).toBe(arabic);
  });

  it('asks for the ink picture in the current theme colour, and no raw colour is written in the component', async () => {
    const seen: string[] = [];
    const recording = (colour: string) => {
      seen.push(colour);
      return pictureOf(colour);
    };
    await renderUi(page({ pictureOf: recording }), { theme: 'light' });
    await renderUi(page({ pictureOf: recording }), { theme: 'dark' });
    expect(seen).toContain(themes.light.colors.ink);
    expect(seen).toContain(themes.dark.colors.ink);
    expect(themes.light.colors.ink).not.toBe(themes.dark.colors.ink);
    const source = readFileSync(join(__dirname, 'MushafSvgPage.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
