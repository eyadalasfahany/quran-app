import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { locales, renderUi } from '../../../../jest/render-ui';

import { DiscoverNewBadge } from './DiscoverNewBadge';

describe('DiscoverNewBadge', () => {
  it('shows «جديد» in Arabic', async () => {
    const view = await renderUi(<DiscoverNewBadge testID="badge" />, { locale: 'ar' });
    expect(view.getByText('جديد')).toBeOnTheScreen();
    expect(view.getByTestId('badge')).toBeOnTheScreen();
  });

  it('shows the English label under English', async () => {
    const view = await renderUi(<DiscoverNewBadge />, { locale: 'en' });
    expect(view.getByText('New')).toBeOnTheScreen();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<DiscoverNewBadge />, { locale });
    expect(view.toJSON()).not.toBeNull();
  });

  it('has no raw colour literals', () => {
    const source = readFileSync(join(__dirname, 'DiscoverNewBadge.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
