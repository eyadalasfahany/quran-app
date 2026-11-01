import { Text } from 'react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { GoalsListCard } from './GoalsListCard';

describe('GoalsListCard', () => {
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
