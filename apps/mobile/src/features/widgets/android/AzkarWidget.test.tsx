import { AzkarWidget } from './AzkarWidget';
import { widgetContext } from './context';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { textsOf } from './test-tree';

const now = new Date(2026, 10, 2, 12, 0);
const ctx = (snapshot = fullSnapshot()) => widgetContext({ mode: 'light', now, scheme: 'taybah', snapshot });

describe('AzkarWidget', () => {
  it('shows each session with its done state', () => {
    const texts = textsOf(AzkarWidget(ctx()));
    expect(texts).toEqual(expect.arrayContaining(['SESSION one', 'LABEL complete', 'SESSION two', '6 / 24']));
  });

  it('shows only the open-the-app text when no Azkar content is stored', () => {
    expect(textsOf(AzkarWidget(ctx(fullSnapshot({ azkar: null }))))).toEqual(['LABEL azkarTitle', 'LABEL azkarEmpty']);
  });
});
