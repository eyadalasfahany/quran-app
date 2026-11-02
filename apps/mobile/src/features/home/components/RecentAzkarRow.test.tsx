import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { RecentAzkarRow } from './RecentAzkarRow';

describe('RecentAzkarRow', () => {
  it('shows the scope and its progress line', async () => {
    const view = await renderUi(<RecentAzkarRow meta="١٢ من ٢٤" onPress={jest.fn()} title="أذكار الصباح" />);

    expect(view.getByText('أذكار الصباح')).toBeOnTheScreen();
    expect(view.getByText('١٢ من ٢٤')).toBeOnTheScreen();
  });

  it('opens the reader on press, with the title and progress as its label', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<RecentAzkarRow meta="٦ من ٦ · مكتملة" onPress={onPress} title="أذكار بعد الصلاة" />);

    await fireEvent.press(view.getByRole('button', { name: 'أذكار بعد الصلاة، ٦ من ٦ · مكتملة' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reads in English', async () => {
    const view = await renderUi(<RecentAzkarRow meta="0 of 9" onPress={jest.fn()} title="Sleep Azkar" />, { locale: 'en' });

    expect(view.getByRole('button', { name: 'Sleep Azkar, 0 of 9' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/home/components/RecentAzkarRow.tsx')).toEqual([]);
  });
});
