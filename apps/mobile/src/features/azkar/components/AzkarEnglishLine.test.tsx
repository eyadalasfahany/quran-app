import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarEnglishLine } from './AzkarEnglishLine';

describe('AzkarEnglishLine', () => {
  it('renders the English text under the dhikr', async () => {
    await renderUi(<AzkarEnglishLine text="FIXTURE text 1 — not a dhikr" />, { locale: 'en' });
    expect(screen.getByText('FIXTURE text 1 — not a dhikr')).toBeTruthy();
  });

  it('renders nothing without English', async () => {
    await renderUi(<AzkarEnglishLine text={null} />, { locale: 'en' });
    expect(screen.queryByTestId('azkar-english-line')).toBeNull();
  });

  it('renders nothing for blank text', async () => {
    await renderUi(<AzkarEnglishLine text="   " />, { locale: 'en' });
    expect(screen.queryByTestId('azkar-english-line')).toBeNull();
  });

  it('keeps the English line in the Arabic interface when a caller passes it', async () => {
    await renderUi(<AzkarEnglishLine text="FIXTURE text 2 — not a dhikr" />);
    expect(screen.getByText('FIXTURE text 2 — not a dhikr')).toBeTruthy();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarEnglishLine.tsx')).toEqual([]);
  });
});
