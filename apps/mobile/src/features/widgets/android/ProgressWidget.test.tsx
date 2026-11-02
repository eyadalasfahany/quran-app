import { ProgressWidget } from './ProgressWidget';
import { widgetContext } from './context';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { ofKind, textsOf } from './test-tree';

const now = new Date(2026, 10, 2, 12, 0);
const ctx = (snapshot = fullSnapshot()) => widgetContext({ mode: 'light', now, scheme: 'taybah', snapshot });

describe('ProgressWidget', () => {
  it('shows the percent in the ring and each chosen goal row', () => {
    const texts = textsOf(ProgressWidget(ctx()));
    expect(texts).toEqual(expect.arrayContaining(['60%', 'ROW wird', 'VALUE 4 of 10', 'ROW misbaha', '✓']));
  });

  it('asks the user to choose goals when none are chosen', () => {
    const snapshot = fullSnapshot({ progress: { percent: 0, rows: [] } });
    expect(textsOf(ProgressWidget(ctx(snapshot)))).toContain('LABEL progressEmpty');
  });

  it('draws the ring as an SVG', () => {
    expect(ofKind(ProgressWidget(ctx()), 'SvgWidget')).toHaveLength(1);
  });

  it('opens the goals screen on tap', () => {
    const root = ProgressWidget(ctx()) as { props: Record<string, unknown> };
    expect(root.props.clickActionData).toEqual({ uri: 'taybah://daily-goals' });
  });
});
