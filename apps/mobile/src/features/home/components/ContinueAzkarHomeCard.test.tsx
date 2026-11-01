import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { ContinueAzkarHomeCard } from './ContinueAzkarHomeCard';

const resume = { caption: 'تابع الأذكار', preview: '٢ من ٣', progress: 2 / 3, title: 'أذكار الصباح' };

describe('ContinueAzkarHomeCard', () => {
  it('shows the caption, the scope in progress and its count', async () => {
    const view = await renderUi(<ContinueAzkarHomeCard onPress={jest.fn()} resume={resume} />);

    expect(view.getByText('تابع الأذكار')).toBeOnTheScreen();
    expect(view.getByTestId('home-continue-azkar-title')).toHaveTextContent('أذكار الصباح');
    expect(view.getByText('٢ من ٣')).toBeOnTheScreen();
  });

  it('draws the bar to the share in progress', async () => {
    const view = await renderUi(<ContinueAzkarHomeCard onPress={jest.fn()} resume={resume} />);

    expect(view.getByTestId('home-continue-azkar-progress').props.style).toEqual(expect.objectContaining({ width: '67%' }));
  });

  it('clamps the bar to the card width', async () => {
    const view = await renderUi(<ContinueAzkarHomeCard onPress={jest.fn()} resume={{ ...resume, progress: 3 }} />);

    expect(view.getByTestId('home-continue-azkar-progress').props.style).toEqual(expect.objectContaining({ width: '100%' }));
  });

  it('draws nothing when there is nothing to continue', async () => {
    const view = await renderUi(<ContinueAzkarHomeCard onPress={jest.fn()} resume={null} />);

    expect(view.queryByTestId('home-continue-azkar')).toBeNull();
  });

  it('resumes on press, with the scope and count in its label', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<ContinueAzkarHomeCard onPress={onPress} resume={resume} />);

    const card = view.getByRole('button', { name: 'تابع الأذكار, أذكار الصباح, ٢ من ٣' });
    await fireEvent.press(card);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/home/components/ContinueAzkarHomeCard.tsx')).toEqual([]);
  });
});
