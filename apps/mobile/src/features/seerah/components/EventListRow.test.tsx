import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { EventListRow } from './EventListRow';

describe('EventListRow', () => {
  it.each(locales)('shows the heading and the detail (%s)', async (locale) => {
    await renderUi(<EventListRow onPress={jest.fn()} subtitle="المدينة" title="[عنوان الفصل في الكتاب]" />, { locale });
    expect(screen.getByText('[عنوان الفصل في الكتاب]')).toBeOnTheScreen();
    expect(screen.getByText('المدينة')).toBeOnTheScreen();
  });

  it('is one button that reads «heading, detail»', async () => {
    await renderUi(<EventListRow onPress={jest.fn()} subtitle="المدينة" title="عنوان" />);
    expect(screen.getByRole('button', { name: 'عنوان, المدينة' })).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<EventListRow onPress={onPress} subtitle="x" title="عنوان" />);
    await press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is at least 44 pt tall, with a hairline only when asked', async () => {
    await renderUi(<EventListRow onPress={jest.fn()} separator subtitle="x" testID="row" title="عنوان" />);
    const style = flatStyle(screen.getByTestId('row').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(style.borderBottomWidth).toBe(1);
  });

  it('has no hairline by default and no raw colour literal', async () => {
    await renderUi(<EventListRow onPress={jest.fn()} subtitle="x" testID="row" title="عنوان" />);
    expect(flatStyle(screen.getByTestId('row').props.style).borderBottomWidth).toBeUndefined();
    expect(rawColorLiteralsInFeature('src/features/seerah/components/EventListRow.tsx')).toEqual([]);
  });
});
