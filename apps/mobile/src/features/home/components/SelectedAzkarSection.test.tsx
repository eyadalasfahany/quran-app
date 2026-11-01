import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { SelectedAzkarSection, type SelectedAzkarItem } from './SelectedAzkarSection';

const items: SelectedAzkarItem[] = [
  { fraction: 0.5, id: 'morning', progressText: '١٢ من ٢٤', title: 'أذكار الصباح' },
  { fraction: 0.2, id: 'evening', progressText: '٥ من ٢٤', title: 'أذكار المساء' },
];

describe('SelectedAzkarSection', () => {
  it('heads the row and lists each session with its progress', async () => {
    const view = await renderUi(<SelectedAzkarSection items={items} onOpen={jest.fn()} onSeeAll={jest.fn()} />);

    expect(view.getByRole('header', { name: 'أذكار مختارة' })).toBeOnTheScreen();
    expect(view.getByTestId('home-selected-azkar-morning')).toBeOnTheScreen();
    expect(view.getByTestId('home-selected-azkar-evening')).toBeOnTheScreen();
    expect(view.getByText('٥ من ٢٤')).toBeOnTheScreen();
  });

  it('opens the session that was pressed', async () => {
    const onOpen = jest.fn();
    const view = await renderUi(<SelectedAzkarSection items={items} onOpen={onOpen} onSeeAll={jest.fn()} />);

    await fireEvent.press(view.getByRole('button', { name: 'أذكار المساء, ٥ من ٢٤' }));

    expect(onOpen).toHaveBeenCalledWith('evening');
  });

  it('opens the Azkar home from «عرض الكل»', async () => {
    const onSeeAll = jest.fn();
    const view = await renderUi(<SelectedAzkarSection items={items} onOpen={jest.fn()} onSeeAll={onSeeAll} />);

    await fireEvent.press(view.getByRole('button', { name: 'عرض الكل' }));

    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  it('draws nothing without a session', async () => {
    const view = await renderUi(<SelectedAzkarSection items={[]} onOpen={jest.fn()} onSeeAll={jest.fn()} />);

    expect(view.queryByTestId('home-selected-azkar')).toBeNull();
    expect(view.queryByRole('header', { name: 'أذكار مختارة' })).toBeNull();
  });

  it('reads in English', async () => {
    const view = await renderUi(<SelectedAzkarSection items={items} onOpen={jest.fn()} onSeeAll={jest.fn()} />, {
      locale: 'en',
    });

    expect(view.getByRole('header', { name: 'Selected Azkar' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'See all' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/home/components/SelectedAzkarSection.tsx')).toEqual([]);
  });
});
