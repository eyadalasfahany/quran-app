import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';

import { DiscoverDoneState } from './DiscoverDoneState';

describe('DiscoverDoneState', () => {
  it('shows «أحسنت», the full progress and the «تم» action', async () => {
    const view = await renderUi(<DiscoverDoneState done={13} onFinish={() => undefined} total={13} />, { locale: 'ar' });
    expect(view.getByRole('header', { name: 'أحسنت' })).toBeOnTheScreen();
    expect(view.getByText('١٣ من ١٣')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تم' })).toBeOnTheScreen();
  });

  it('acknowledges the set when «تم» is pressed', async () => {
    const onFinish = jest.fn();
    const view = await renderUi(<DiscoverDoneState done={13} onFinish={onFinish} total={13} />, { locale: 'ar' });
    fireEvent.press(view.getByRole('button', { name: 'تم' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<DiscoverDoneState done={13} onFinish={() => undefined} total={13} />, { locale });
    expect(view.getByTestId('discover-done-state')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    const source = readFileSync(join(__dirname, 'DiscoverDoneState.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
