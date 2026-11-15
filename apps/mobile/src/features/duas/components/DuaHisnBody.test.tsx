import { screen } from '@testing-library/react-native';

import { makeItem, makeUnit, quranSegment, textSegment } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { DuaHisnBody } from './DuaHisnBody';

// Every text is a placeholder («نص تجريبي ... ليس ذكرًا»), never a dua.
const TEXT_1 = 'FIXTURE text 1 — not a dua';
const TEXT_2 = 'FIXTURE text 2 — not a dua';
const STEP = 'FIXTURE step — not a dua';
const ENGLISH = 'FIXTURE english line — not a dua';
const VERSE = 'FIXTURE verse — not a dua';

const QURAN = new Map<string, readonly string[]>([['1:2', [VERSE]]]);
const noop = jest.fn();

describe('DuaHisnBody', () => {
  beforeEach(() => {
    noop.mockClear();
  });

  it('renders the Arabic text of each body item, in order', async () => {
    const units = [
      makeUnit({
        body: [makeItem({ id: 1, segments: [textSegment(TEXT_1, 1, 1)] }), makeItem({ id: 2, segments: [textSegment(TEXT_2, 1, 2)] })],
      }),
    ];
    await renderUi(<DuaHisnBody quranVerses={new Map()} units={units} onChooseVariation={noop} />);

    expect(screen.getByText(TEXT_1)).toBeOnTheScreen();
    expect(screen.getByText(TEXT_2)).toBeOnTheScreen();
  });

  it('renders a Quran segment through the Quran text with its verses', async () => {
    const units = [makeUnit({ body: [makeItem({ id: 1, segments: [quranSegment(2, 2, 2, 1)] })] })];
    await renderUi(<DuaHisnBody quranVerses={QURAN} units={units} onChooseVariation={noop} />);

    expect(screen.getByText(`﴿${VERSE}﴾`)).toBeOnTheScreen();
  });

  it('renders the preface and afterword as steps around the body', async () => {
    const units = [
      makeUnit({
        preface: [makeItem({ id: 9, segments: [textSegment(STEP, 1, 9)] })],
        body: [makeItem({ id: 1, segments: [textSegment(TEXT_1, 1, 1)] })],
        afterword: [makeItem({ id: 8, segments: [textSegment(STEP, 1, 8)] })],
      }),
    ];
    await renderUi(<DuaHisnBody quranVerses={new Map()} units={units} onChooseVariation={noop} />);

    expect(screen.getAllByText(STEP)).toHaveLength(2);
  });

  it('hides the English line in the Arabic interface', async () => {
    const units = [makeUnit({ body: [makeItem({ id: 1, textEn: ENGLISH, segments: [textSegment(TEXT_1, 1, 1)] })] })];
    await renderUi(<DuaHisnBody quranVerses={new Map()} units={units} onChooseVariation={noop} />);

    expect(screen.queryByText(ENGLISH)).toBeNull();
  });

  it('shows the English line in the English interface', async () => {
    const units = [makeUnit({ body: [makeItem({ id: 1, textEn: ENGLISH, segments: [textSegment(TEXT_1, 1, 1)] })] })];
    await renderUi(<DuaHisnBody quranVerses={new Map()} units={units} onChooseVariation={noop} />, { locale: 'en' });

    expect(screen.getByText(ENGLISH)).toBeOnTheScreen();
  });

  it('shows the variation switch only for two or more alternatives, and reports a choice', async () => {
    const variations = [
      { key: 'v1', labelIndex: 1, labelEn: null },
      { key: 'v2', labelIndex: 2, labelEn: null },
    ];
    const units = [makeUnit({ variations, activeVariation: 'v1', body: [makeItem({ id: 1, segments: [textSegment(TEXT_1, 1, 1)] })] })];
    await renderUi(<DuaHisnBody quranVerses={new Map()} units={units} onChooseVariation={noop} />);

    expect(screen.getByTestId('azkar-variation-switch')).toBeOnTheScreen();
  });

  it('shows no variation switch for a single alternative', async () => {
    const units = [makeUnit({ variations: [{ key: 'v1', labelIndex: 1, labelEn: null }], body: [makeItem({ id: 1, segments: [textSegment(TEXT_1, 1, 1)] })] })];
    await renderUi(<DuaHisnBody quranVerses={new Map()} units={units} onChooseVariation={noop} />);

    expect(screen.queryByTestId('azkar-variation-switch')).toBeNull();
  });

  it('draws no counter and no repeat note', async () => {
    const units = [makeUnit({ requiredCount: 3, body: [makeItem({ id: 1, segments: [textSegment(TEXT_1, 1, 1)] })] })];
    await renderUi(<DuaHisnBody quranVerses={new Map()} units={units} onChooseVariation={noop} />);

    expect(screen.queryByTestId('azkar-counter')).toBeNull();
    expect(screen.queryByTestId('azkar-repeat')).toBeNull();
  });

  it('renders nothing for an empty entry', async () => {
    await renderUi(<DuaHisnBody quranVerses={new Map()} units={[]} onChooseVariation={noop} />);

    expect(screen.getByTestId('dua-hisn-body')).toBeOnTheScreen();
    expect(screen.queryByText(TEXT_1)).toBeNull();
  });

  it('is laid out with theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/DuaHisnBody.tsx')).toEqual([]);
  });
});
