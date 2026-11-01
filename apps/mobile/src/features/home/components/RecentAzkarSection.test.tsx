import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { RecentAzkarSection, type RecentAzkarListItem } from './RecentAzkarSection';

const items: RecentAzkarListItem[] = [
  { href: '/azkar/read/morning' as RecentAzkarListItem['href'], key: 'category:morning', meta: '١٢ من ٢٤', title: 'أذكار الصباح' },
  { href: '/azkar/entry/fixture-entry' as RecentAzkarListItem['href'], key: 'entry:fixture-entry', meta: '٠ من ٣', title: 'الذكر' },
];

describe('RecentAzkarSection', () => {
  it('heads the list and shows each recent scope, newest first', async () => {
    const view = await renderUi(<RecentAzkarSection items={items} onOpen={jest.fn()} />);

    expect(view.getByRole('header', { name: 'آخر الأذكار' })).toBeOnTheScreen();
    expect(view.getByTestId('home-recent-azkar').children.length).toBe(3);
    expect(view.getByText('أذكار الصباح')).toBeOnTheScreen();
    expect(view.getByText('٠ من ٣')).toBeOnTheScreen();
  });

  it('opens the scope it was given, where the user left off', async () => {
    const onOpen = jest.fn();
    const view = await renderUi(<RecentAzkarSection items={items} onOpen={onOpen} />);

    await fireEvent.press(view.getByRole('button', { name: 'أذكار الصباح, ١٢ من ٢٤' }));

    expect(onOpen).toHaveBeenCalledWith('/azkar/read/morning');
  });

  it('is hidden when nothing has been opened', async () => {
    const view = await renderUi(<RecentAzkarSection items={[]} onOpen={jest.fn()} />);

    expect(view.queryByTestId('home-recent-azkar')).toBeNull();
    expect(view.queryByRole('header', { name: 'آخر الأذكار' })).toBeNull();
  });

  it('reads in English', async () => {
    const view = await renderUi(<RecentAzkarSection items={items} onOpen={jest.fn()} />, { locale: 'en' });

    expect(view.getByRole('header', { name: 'Recent Azkar' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/home/components/RecentAzkarSection.tsx')).toEqual([]);
  });
});
