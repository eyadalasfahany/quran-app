import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { ScreenHeader } from './ScreenHeader';

describe('ScreenHeader', () => {
  it('renders the title as a header in the title style', async () => {
    const view = await renderUi(<ScreenHeader title="الفهرس" />);

    expect(view.getByRole('header', { name: 'الفهرس' })).toBeOnTheScreen();
    expect(flatStyle(view.getByText('الفهرس').props.style)).toMatchObject(themes.light.text.title);
  });

  it('renders children, then a muted hint, and a trailing control', async () => {
    const view = await renderUi(
      <ScreenHeader hint="ابحث بالآية" testID="header" title="البحث" trailing={<Text>زر</Text>}>
        <Text>حقل</Text>
      </ScreenHeader>,
    );

    expect(view.getByText('زر')).toBeOnTheScreen();
    expect(view.getByText('حقل')).toBeOnTheScreen();
    expect(flatStyle(view.getByText('ابحث بالآية').props.style).color).toBe(themes.light.colors.inkMuted);
  });

  it('can leave the title out when a field is the header', async () => {
    const view = await renderUi(
      <ScreenHeader>
        <Text>حقل</Text>
      </ScreenHeader>,
    );

    expect(view.queryByRole('header')).toBeNull();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<ScreenHeader title="title" />, { locale });

    expect(view.getByText('title')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('ScreenHeader.tsx')).toEqual([]);
  });
});
