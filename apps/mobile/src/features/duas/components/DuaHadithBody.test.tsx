import { screen } from '@testing-library/react-native';

import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { DuaHadithBody } from './DuaHadithBody';

const FIXTURE_TEXT = 'FIXTURE text 1 — not a dua';
const FIXTURE_ATTR = 'FIXTURE attribution — not a dua';

describe('DuaHadithBody', () => {
  it('renders text and attribution', async () => {
    await renderUi(<DuaHadithBody attribution={FIXTURE_ATTR} text={FIXTURE_TEXT} />);
    expect(screen.getByTestId('dua-hadith-body')).toBeOnTheScreen();
    expect(screen.getByText(FIXTURE_TEXT)).toBeOnTheScreen();
    expect(screen.getByText(FIXTURE_ATTR)).toBeOnTheScreen();
  });

  it('renders in English layout', async () => {
    await renderUi(<DuaHadithBody attribution={FIXTURE_ATTR} text={FIXTURE_TEXT} />, { locale: 'en' });
    expect(screen.getByText(FIXTURE_TEXT)).toBeOnTheScreen();
  });

  it('uses fixture and i18n only in source', () => {
    expect(featureComponentLiterals('features/duas/components/DuaHadithBody.tsx')).toEqual([]);
  });
});
