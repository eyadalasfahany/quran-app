import { AzkarWidget } from './AzkarWidget';
import { widgetContext } from './context';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { ofKind, textsOf } from './test-tree';

const now = new Date(2026, 10, 2, 12, 0);
const ctx = (snapshot = fullSnapshot()) => widgetContext({ mode: 'light', now, scheme: 'taybah', snapshot });

describe('AzkarWidget', () => {
  it('shows each session title with a progress ring', () => {
    const texts = textsOf(AzkarWidget(ctx()));
    expect(texts).toEqual(expect.arrayContaining(['SESSION one', 'SESSION two']));
    expect(texts).not.toContain('6 / 24');
    expect(ofKind(AzkarWidget(ctx()), 'SvgWidget').length).toBeGreaterThanOrEqual(2);
  });

  it('shows only the open-the-app text when no Azkar content is stored', () => {
    expect(textsOf(AzkarWidget(ctx(fullSnapshot({ azkar: null }))))).toEqual(['LABEL azkarTitle', 'LABEL azkarEmpty']);
  });

  it('writes the first session last in Arabic so it sits on the right', () => {
    const snapshot = fullSnapshot({
      azkar: {
        sessions: [
          { complete: false, done: 0, id: 'a', title: 'SESSION A', total: 1 },
          { complete: false, done: 0, id: 'b', title: 'SESSION B', total: 1 },
          { complete: false, done: 0, id: 'c', title: 'SESSION C', total: 1 },
        ],
      },
      locale: 'ar',
    });
    const titles = textsOf(AzkarWidget(ctx(snapshot))).filter((text) => text.startsWith('SESSION '));
    expect(titles).toEqual(['SESSION C', 'SESSION B', 'SESSION A']);
  });
});
