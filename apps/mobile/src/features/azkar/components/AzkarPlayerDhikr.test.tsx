import { screen } from '@testing-library/react-native';

import { makeItem, makeUnit, textSegment } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';

import { AzkarPlayerDhikr } from './AzkarPlayerDhikr';

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({ executor: {} }),
}));

jest.mock('../data/quran-segments', () => ({
  quranSegmentKey: () => '',
  resolveQuranVerses: jest.fn(() => new Map()),
}));

const unit = makeUnit({
  unitKey: 'entry-1:u',
  body: [
    makeItem({ id: 1, itemKey: 'fixture:item-1', segments: [textSegment('FIXTURE text 1 — not a dhikr')], textEn: 'FIXTURE English 1' }),
    makeItem({ id: 2, itemKey: 'fixture:item-2', segments: [textSegment('FIXTURE text 2 — not a dhikr')], textEn: null }),
  ],
});

describe('AzkarPlayerDhikr', () => {
  it('renders every counted item of the unit, in order', async () => {
    await renderUi(<AzkarPlayerDhikr unit={unit} />);
    expect(screen.getByText('FIXTURE text 1 — not a dhikr')).toBeTruthy();
    expect(screen.getByText('FIXTURE text 2 — not a dhikr')).toBeTruthy();
  });

  it('shows the English line only in the English interface', async () => {
    await renderUi(<AzkarPlayerDhikr unit={unit} />);
    expect(screen.queryByText('FIXTURE English 1')).toBeNull();

    await renderUi(<AzkarPlayerDhikr unit={unit} />, { locale: 'en' });
    expect(screen.getByText('FIXTURE English 1')).toBeTruthy();
  });

  it('renders under English without changing the Arabic text', async () => {
    await renderUi(<AzkarPlayerDhikr testID="dhikr" unit={unit} />, { locale: 'en' });
    expect(screen.getByTestId('dhikr')).toBeTruthy();
    expect(screen.getByText('FIXTURE text 1 — not a dhikr')).toBeTruthy();
  });
});
