import { Linking } from 'react-native';
import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { DuaSourceLink } from './DuaSourceLink';

const URL = 'https://example.test/hadith/1';

describe('DuaSourceLink', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders a link with the open-source label', async () => {
    await renderUi(<DuaSourceLink url={URL} />);
    expect(screen.getByRole('link', { name: 'فتح على HadeethEnc.com' })).toBeOnTheScreen();
  });

  it('opens its url on press', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderUi(<DuaSourceLink url={URL} />);
    await press(screen.getByRole('link', { name: 'فتح على HadeethEnc.com' }));
    expect(openURL).toHaveBeenCalledWith(URL);
  });

  it('renders the English label', async () => {
    await renderUi(<DuaSourceLink url={URL} />, { locale: 'en' });
    expect(screen.getByRole('link', { name: 'Open on HadeethEnc.com' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/DuaSourceLink.tsx')).toEqual([]);
  });
});
