import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { EmptyState } from './EmptyState';

const colors = themes.light.colors;
const body = 'اضغط مطوّلًا على أي آية ثم اختر «حفظ»، وستجدها هنا لتعود إليها بسرعة.';

describe('EmptyState', () => {
  it('renders a header title and a muted body with no action', async () => {
    const view = await renderUi(<EmptyState body={body} title="لا توجد علامات بعد" />);

    expect(view.getByRole('header', { name: 'لا توجد علامات بعد' })).toBeOnTheScreen();
    expect(flatStyle(view.getByText('لا توجد علامات بعد').props.style)).toMatchObject(themes.light.text.title);
    expect(flatStyle(view.getByText(body).props.style).color).toBe(colors.inkMuted);
    expect(view.queryByRole('button')).toBeNull();
  });

  it('renders the action as a 44 pt brand button and calls it', async () => {
    const onPress = jest.fn();
    const view = await renderUi(
      <EmptyState
        action={{ label: 'افتح المصحف', onPress }}
        body={body}
        testID="empty"
        title="لا توجد علامات بعد"
      />,
    );
    const button = view.getByRole('button', { name: 'افتح المصحف' });

    expect(flatStyle(view.getByTestId('empty-action').props.style)).toMatchObject({
      alignSelf: 'center',
      backgroundColor: colors.brand,
      borderRadius: themes.light.radius.pill,
      minHeight: themes.light.size.touchTarget,
      opacity: 1,
    });
    expect(flatStyle(view.getByText('افتح المصحف').props.style)).toMatchObject({
      ...themes.light.text.headline,
      color: colors.onBrand,
    });

    await fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders an optional icon', async () => {
    const view = await renderUi(
      <EmptyState body="b" icon={{ ios: 'bookmark', android: 'bookmark' }} testID="empty" title="t" />,
    );

    expect(view.getByTestId('empty').children).toHaveLength(3);
  });

  it.each(locales)('centres its text in %s', async (locale) => {
    const view = await renderUi(<EmptyState body="body" title="title" />, { locale });

    expect(flatStyle(view.getByText('title').props.style).textAlign).toBe('center');
    expect(flatStyle(view.getByText('body').props.style).textAlign).toBe('center');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('EmptyState.tsx')).toEqual([]);
  });
});
