import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';

import { DiscoverRow } from './DiscoverRow';

describe('DiscoverRow', () => {
  it('is a button whose label carries the done state', async () => {
    const view = await renderUi(<DiscoverRow done={false} isNew={false} onPress={() => undefined} testID="row" title="عرض المصحف" />);
    const row = view.getByRole('button', { name: 'عرض المصحف, لم يتم' });
    expect(row.props.accessibilityState).toEqual({ checked: false });
  });

  it('reports done in the label and state', async () => {
    const view = await renderUi(<DiscoverRow done isNew={false} onPress={() => undefined} title="البحث" />);
    expect(view.getByRole('button', { name: 'البحث, تم' }).props.accessibilityState).toEqual({ checked: true });
  });

  it('marks a new row in its label and shows the badge', async () => {
    const view = await renderUi(<DiscoverRow done={false} isNew onPress={() => undefined} title="أضف الودجت" />);
    expect(view.getByRole('button', { name: 'أضف الودجت, لم يتم, جديد' })).toBeOnTheScreen();
    expect(view.getByText('جديد')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<DiscoverRow done={false} isNew={false} onPress={onPress} title="الإعدادات" />);
    fireEvent.press(view.getByRole('button', { name: 'الإعدادات, لم يتم' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<DiscoverRow done={false} isNew onPress={() => undefined} title="Title" />, { locale });
    expect(view.getByRole('button')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    const source = readFileSync(join(__dirname, 'DiscoverRow.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
