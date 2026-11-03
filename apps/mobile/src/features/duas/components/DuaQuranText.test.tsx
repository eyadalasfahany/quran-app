import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { DuaQuranText } from './DuaQuranText';

const FIXTURE = 'FIXTURE VERSE 1 — not a dua';

describe('DuaQuranText', () => {
  it('renders joined verse text in the Quran face', async () => {
    await renderUi(<DuaQuranText verses={[FIXTURE]} />);
    expect(screen.getByTestId('dua-quran-text')).toBeOnTheScreen();
  });

  it('renders nothing when verses are empty', async () => {
    await renderUi(<DuaQuranText verses={[]} />);
    expect(screen.queryByTestId('dua-quran-text')).toBeNull();
  });
});
