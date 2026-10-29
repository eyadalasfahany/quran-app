import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { RecentListensSection, type RecentListensItem } from './RecentListensSection';

const items = (onPlay: (key: string) => void = () => undefined): RecentListensItem[] => [
  { key: '100', letter: 'ع', name: 'مشاري راشد العفاسي', onPlay: () => onPlay('100'), playLabel: 'تشغيل سورة الكهف', subtitle: 'سورة الكهف · مرتّل' },
  { key: '200', letter: 'ص', name: 'عبد الباسط عبد الصمد', onPlay: () => onPlay('200'), playLabel: 'تشغيل سورة يس', subtitle: 'سورة يس · مجوّد' },
];

describe('RecentListensSection', () => {
  it('draws the heading and one row per item, the first row filled', async () => {
    const view = await renderUi(<RecentListensSection heading="آخر ما استمعت إليه" items={items()} />);

    expect(view.getByRole('header', { name: 'آخر ما استمعت إليه' })).toBeOnTheScreen();
    expect(view.getByText('مشاري راشد العفاسي')).toBeOnTheScreen();
    expect(view.getByText('عبد الباسط عبد الصمد')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تشغيل سورة الكهف' }).props.style).toBeDefined();
  });

  it('renders nothing when there are no items', async () => {
    const view = await renderUi(<RecentListensSection heading="آخر ما استمعت إليه" items={[]} />);

    expect(view.queryByTestId('home-recent-listens')).toBeNull();
    expect(view.queryByRole('header')).toBeNull();
  });

  it('calls the play handler of the row that was pressed', async () => {
    const onPlay = jest.fn();
    const view = await renderUi(<RecentListensSection heading="آخر ما استمعت إليه" items={items(onPlay)} />);

    await fireEvent.press(view.getByRole('button', { name: 'تشغيل سورة يس' }));

    expect(onPlay).toHaveBeenCalledWith('200');
  });

  it.each(locales)('is labelled in %s', async (locale) => {
    const view = await renderUi(<RecentListensSection heading="Recently listened" items={items()} />, { locale });

    expect(view.getByRole('header', { name: 'Recently listened' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/home/components/RecentListensSection.tsx')).toEqual([]);
  });
});
