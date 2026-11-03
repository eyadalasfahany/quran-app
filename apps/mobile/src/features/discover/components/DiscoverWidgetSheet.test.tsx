import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';

import { DiscoverWidgetSheet } from './DiscoverWidgetSheet';

jest.mock('react-native-android-widget', () => ({
  getWidgetInfo: jest.fn(async () => []),
  requestPinWidget: jest.fn(async () => true),
}));

describe('DiscoverWidgetSheet', () => {
  it('shows the title, the iOS and Android steps from the widgets help, and «تم»', async () => {
    const view = await renderUi(<DiscoverWidgetSheet onClose={() => undefined} onRead={() => undefined} visible />, { locale: 'ar' });
    expect(view.getByRole('header', { name: 'أضف الودجت' })).toBeOnTheScreen();
    expect(view.getByText('آيفون')).toBeOnTheScreen();
    expect(view.getByText('أندرويد')).toBeOnTheScreen();
    expect(view.getByText('المس الشاشة الرئيسية، ثم «الودجات».')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تم' })).toBeOnTheScreen();
    expect(view.getByTestId('discover-widget-add')).toBeOnTheScreen();
  });

  it('reads the sheet with «تم»', async () => {
    const onRead = jest.fn();
    const view = await renderUi(<DiscoverWidgetSheet onClose={() => undefined} onRead={onRead} visible />, { locale: 'ar' });
    fireEvent.press(view.getByRole('button', { name: 'تم' }));
    expect(onRead).toHaveBeenCalledTimes(1);
  });

  it('closes without reading when the scrim is tapped', async () => {
    const onClose = jest.fn();
    const onRead = jest.fn();
    const view = await renderUi(<DiscoverWidgetSheet onClose={onClose} onRead={onRead} visible />, { locale: 'ar' });
    fireEvent.press(view.getByTestId('discover-widget-scrim'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRead).not.toHaveBeenCalled();
  });

  it('renders nothing while hidden', async () => {
    const view = await renderUi(<DiscoverWidgetSheet onClose={() => undefined} onRead={() => undefined} visible={false} />, { locale: 'ar' });
    expect(view.queryByRole('header', { name: 'أضف الودجت' })).toBeNull();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<DiscoverWidgetSheet onClose={() => undefined} onRead={() => undefined} visible />, { locale });
    expect(view.getByRole('button', { name: locale === 'ar' ? 'تم' : 'Done' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    const source = readFileSync(join(__dirname, 'DiscoverWidgetSheet.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
