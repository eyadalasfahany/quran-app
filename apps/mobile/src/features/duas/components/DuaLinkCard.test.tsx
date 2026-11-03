import { screen } from '@testing-library/react-native';

import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { DuaLinkCard } from './DuaLinkCard';

jest.mock('@/features/azkar/data', () => ({
  useAzkarAvailable: jest.fn(() => false),
}));

describe('DuaLinkCard', () => {
  it('renders nothing when Azkar is unavailable', async () => {
    await renderUi(
      <DuaLinkCard links={[{ kind: 'hisn', entryKey: 'fixture-entry' }]} />,
    );
    expect(screen.queryByTestId('dua-link-card')).toBeNull();
  });

  it('uses props only in source', () => {
    expect(featureComponentLiterals('features/duas/components/DuaLinkCard.tsx')).toEqual([]);
  });
});
