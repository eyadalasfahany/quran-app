import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { HadithPaneLayout } from './HadithPaneLayout';

const TEST_ID = 'hadith-pane-layout';

describe('HadithPaneLayout', () => {
  it('renders start and end side by side', async () => {
    await renderUi(<HadithPaneLayout end={<Text>END</Text>} start={<Text>START</Text>} />);
    expect(screen.getByText('START')).toBeOnTheScreen();
    expect(screen.getByText('END')).toBeOnTheScreen();
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).toMatchObject({ flexDirection: 'row' });
  });

  it('start is 340 wide and side is 300 wide', async () => {
    await renderUi(<HadithPaneLayout end={<Text>END</Text>} side={<Text>SIDE</Text>} start={<Text>START</Text>} />);
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-start`).props.style)).toMatchObject({ width: 340 });
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-side`).props.style)).toMatchObject({ width: 300 });
  });

  it('omits the start pane when none is given', async () => {
    await renderUi(<HadithPaneLayout end={<Text>END</Text>} />);
    expect(screen.queryByTestId(`${TEST_ID}-start`)).toBeNull();
    expect(screen.getByText('END')).toBeOnTheScreen();
  });

  it('omits the side pane when none is given', async () => {
    await renderUi(<HadithPaneLayout end={<Text>END</Text>} start={<Text>START</Text>} />);
    expect(screen.queryByTestId(`${TEST_ID}-side`)).toBeNull();
  });

  it('uses start and end, never left and right', async () => {
    await renderUi(<HadithPaneLayout end={<Text>END</Text>} side={<Text>SIDE</Text>} start={<Text>START</Text>} />);
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
    expect(physicalSides(flatStyle(screen.getByTestId(`${TEST_ID}-end`).props.style))).toEqual([]);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithPaneLayout.tsx')).toEqual([]);
  });
});
