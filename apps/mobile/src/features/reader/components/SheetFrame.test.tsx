import { Text } from 'react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { SHEET_MARGIN, SHEET_RADIUS } from '../form-sheet';
import { SheetFrame } from './SheetFrame';

describe('SheetFrame', () => {
  it('insets the card like the phone frames and rounds every corner', async () => {
    const view = await renderUi(
      <SheetFrame testID="sheet-frame">
        <Text>إعدادات القراءة</Text>
      </SheetFrame>,
    );

    expect(flatStyle(view.getByTestId('sheet-frame').props.style)).toMatchObject({
      paddingBottom: SHEET_MARGIN,
      paddingHorizontal: SHEET_MARGIN,
    });
    expect(flatStyle(view.getByTestId('sheet-frame-card').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surfaceRaised,
      borderRadius: SHEET_RADIUS,
    });
    expect(flatStyle(view.getByTestId('sheet-frame-grabber').props.style).width).toBe(36);
    expect(view.getByText('إعدادات القراءة')).toBeOnTheScreen();
  });

  it('uses the raised surface in the dark theme', async () => {
    const view = await renderUi(
      <SheetFrame testID="sheet-frame">
        <Text>إعدادات</Text>
      </SheetFrame>,
      { theme: 'dark' },
    );

    expect(flatStyle(view.getByTestId('sheet-frame-card').props.style).backgroundColor).toBe(
      themes.dark.colors.surfaceRaised,
    );
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/SheetFrame.tsx')).toEqual([]);
  });
});
