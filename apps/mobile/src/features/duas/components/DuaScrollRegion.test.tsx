import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';
import { DuaScrollRegion } from './DuaScrollRegion';

describe('DuaScrollRegion', () => {
  it('renders its children inside the region', async () => {
    await renderUi(
      <DuaScrollRegion>
        <Text>FIXTURE text — not a dua</Text>
      </DuaScrollRegion>,
    );

    expect(screen.getByTestId('dua-scroll-region')).toBeOnTheScreen();
    expect(screen.getByText('FIXTURE text — not a dua')).toBeOnTheScreen();
  });

  it('draws a fade at the top and one at the bottom, so scrolled text fades out', async () => {
    await renderUi(
      <DuaScrollRegion>
        <Text>FIXTURE text — not a dua</Text>
      </DuaScrollRegion>,
    );

    expect(screen.getByTestId('dua-scroll-fade-top', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId('dua-scroll-fade-bottom', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('takes a content style for its scrolled content', async () => {
    await renderUi(
      <DuaScrollRegion contentContainerStyle={{ justifyContent: 'center' }}>
        <Text>FIXTURE text — not a dua</Text>
      </DuaScrollRegion>,
    );

    expect(screen.getByText('FIXTURE text — not a dua')).toBeOnTheScreen();
  });
});
