import { MisbahaWidget } from './MisbahaWidget';
import { widgetContext } from './context';
import { MISBAHA_TAP_ACTION } from './names';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { ofKind, textsOf } from './test-tree';

const now = new Date(2026, 10, 2, 12, 0);
const ctx = (snapshot = fullSnapshot()) => widgetContext({ mode: 'light', now, scheme: 'taybah', snapshot });

describe('MisbahaWidget', () => {
  it('shows the count against the target', () => {
    expect(textsOf(MisbahaWidget(ctx()))).toEqual(expect.arrayContaining(['33', 'LABEL of 100']));
  });

  it('has a plus that sends the tap action, separate from the card tap', () => {
    const plus = ofKind(MisbahaWidget(ctx()), 'LinearLayoutWidget').find((el) => el.props.clickAction === MISBAHA_TAP_ACTION);
    expect(plus).toBeDefined();
    expect(plus?.props.accessibilityLabel).toBe('LABEL countAction');
  });

  it('opens the misbaha screen from the card', () => {
    const root = MisbahaWidget(ctx()) as { props: Record<string, unknown> };
    expect(root.props.clickActionData).toEqual({ uri: 'taybah://sibha' });
  });

  it('shows the no-target label when the target is off', () => {
    const snapshot = fullSnapshot({ misbaha: { count: 5, target: null, todayTotal: 5 } });
    expect(textsOf(MisbahaWidget(ctx(snapshot)))).toContain('LABEL misbahaNoTarget');
  });
});
