import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { DuaQuranSourceLine } from './DuaQuranSourceLine';

const FIXTURE = 'FIXTURE surah · FIXTURE range';

describe('DuaQuranSourceLine', () => {
  it('renders the source line text', async () => {
    await renderUi(<DuaQuranSourceLine text={FIXTURE} />);
    expect(screen.getByTestId('dua-quran-source-line')).toHaveTextContent(FIXTURE);
  });

  it('renders in English layout', async () => {
    await renderUi(<DuaQuranSourceLine text={FIXTURE} />, { locale: 'en' });
    expect(screen.getByText(FIXTURE)).toBeOnTheScreen();
  });
});
