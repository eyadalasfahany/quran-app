import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { locales, renderUi } from '../../../../jest/render-ui';

import { DiscoverProgressBar } from './DiscoverProgressBar';

describe('DiscoverProgressBar', () => {
  it('exposes the progress as a progressbar with Arabic digits', async () => {
    const view = await renderUi(<DiscoverProgressBar done={3} total={13} testID="bar" />, { locale: 'ar' });
    const bar = view.getByTestId('bar');
    expect(bar.props.accessibilityRole).toBe('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 13, now: 3 });
    expect(view.getByText('٣ من ١٣')).toBeOnTheScreen();
  });

  it('uses Latin digits under English', async () => {
    const view = await renderUi(<DiscoverProgressBar done={3} total={13} />, { locale: 'en' });
    expect(view.getByText('3 of 13')).toBeOnTheScreen();
  });

  it('keeps a zero total from dividing by zero', async () => {
    const view = await renderUi(<DiscoverProgressBar done={0} total={0} testID="bar" />);
    expect(view.getByTestId('bar').props.accessibilityValue).toEqual({ min: 0, max: 0, now: 0 });
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<DiscoverProgressBar done={1} total={2} />, { locale });
    expect(view.toJSON()).not.toBeNull();
  });

  it('has no raw colour literals', () => {
    const source = readFileSync(join(__dirname, 'DiscoverProgressBar.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
