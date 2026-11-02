import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { maxFontScale } from '@/shared/ui/textStyles';

import { MoonTimeRow } from './MoonTimeRow';

describe('MoonTimeRow', () => {
  it('renders the label and the value in Arabic', async () => {
    const view = await renderUi(<MoonTimeRow label="غروب الشمس" testID="row" value="٥:٤٠ م" />);
    expect(view.getByText('غروب الشمس')).toBeOnTheScreen();
    expect(view.getByText('٥:٤٠ م')).toBeOnTheScreen();
  });

  it('renders the label and the value in English', async () => {
    const view = await renderUi(<MoonTimeRow label="Sunset" testID="row" value="5:40 PM" />, { locale: 'en' });
    expect(view.getByText('Sunset')).toBeOnTheScreen();
    expect(view.getByText('5:40 PM')).toBeOnTheScreen();
  });

  it('runs the value left to right so the day stays before the time in Arabic', async () => {
    const view = await renderUi(<MoonTimeRow label="الاقتران (المحاق)" testID="row" value="٩ نوفمبر · ١٠:٠٢ ص" />);
    expect(flatStyle(view.getByText('٩ نوفمبر · ١٠:٠٢ ص').props.style).writingDirection).toBe('ltr');
  });

  it('caps Dynamic Type on the label and value at the content scale', async () => {
    const view = await renderUi(<MoonTimeRow label="Sunset" testID="row" value="5:40 PM" />, { locale: 'en' });
    expect(view.getByText('Sunset').props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(view.getByText('5:40 PM').props.maxFontSizeMultiplier).toBe(maxFontScale.content);
  });

  it('draws a hairline under every row but the last', async () => {
    const middle = await renderUi(<MoonTimeRow label="Sunset" testID="row" value="5:40 PM" />, { locale: 'en' });
    expect(flatStyle(middle.getByTestId('row').props.style).borderBottomWidth).toBe(1);
    const last = await renderUi(<MoonTimeRow last label="Sunset" testID="row" value="5:40 PM" />, { locale: 'en' });
    expect(flatStyle(last.getByTestId('row').props.style).borderBottomWidth).toBe(0);
  });
});
