import { OpenAppWidget } from './OpenAppWidget';
import { widgetContext } from './context';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { textsOf } from './test-tree';

describe('OpenAppWidget', () => {
  it('shows the open-the-app label and opens the app on tap', () => {
    const ctx = widgetContext({ mode: 'dark', now: new Date(2026, 10, 2), scheme: 'taybah', snapshot: fullSnapshot() });
    const tree = OpenAppWidget(ctx) as unknown as { props: Record<string, unknown> };
    expect(textsOf(tree as never)).toEqual(['LABEL openApp']);
    expect(tree.props.clickAction).toBe('OPEN_APP');
  });
});
