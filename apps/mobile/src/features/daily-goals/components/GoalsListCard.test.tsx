import { Text } from 'react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';

import { GoalsListCard } from './GoalsListCard';

// The divider wrapper around each row is the host view the card renders for it.
function bottomBorder(node: unknown): number | undefined {
  return flatStyle((node as { props: { style: unknown } }).props.style).borderBottomWidth;
}

describe('GoalsListCard', () => {
  it('draws a divider under every row but the last', async () => {
    const view = await renderUi(
      <GoalsListCard>
        <Text>الصف الأول</Text>
        <Text>الصف الثاني</Text>
        <Text>الصف الثالث</Text>
      </GoalsListCard>,
    );
    const [first, second, last] = view.getByTestId('goals-list').children;

    expect(bottomBorder(first)).toBe(themes.light.stroke.hairline);
    expect(bottomBorder(second)).toBe(themes.light.stroke.hairline);
    expect(bottomBorder(last)).toBeUndefined();
  });

  it('holds its rows in order', async () => {
    const view = await renderUi(
      <GoalsListCard>
        <Text>الصف الأول</Text>
        <Text>الصف الثاني</Text>
      </GoalsListCard>,
    );

    expect(view.getByTestId('goals-list').children.length).toBe(2);
    expect(view.getByText('الصف الثاني')).toBeOnTheScreen();
  });

  it('renders with no rows', async () => {
    const view = await renderUi(<GoalsListCard>{null}</GoalsListCard>);

    expect(view.getByTestId('goals-list')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/daily-goals/components/GoalsListCard.tsx')).toEqual([]);
  });
});
