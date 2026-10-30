import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { ReciterPageActions } from './ReciterPageActions';

describe('ReciterPageActions', () => {
  it('always offers «تنزيل الكل»', async () => {
    const view = await renderUi(<ReciterPageActions onDeleteAll={() => undefined} onDownloadAll={() => undefined} showDelete={false} />);

    expect(view.getByRole('button', { name: 'تنزيل الكل' })).toBeOnTheScreen();
  });

  it('hides «حذف التنزيلات» when nothing is downloaded', async () => {
    const view = await renderUi(<ReciterPageActions onDeleteAll={() => undefined} onDownloadAll={() => undefined} showDelete={false} />);

    expect(view.queryByRole('button', { name: 'حذف التنزيلات' })).toBeNull();
  });

  it('shows «حذف التنزيلات» when something is downloaded', async () => {
    const view = await renderUi(<ReciterPageActions onDeleteAll={() => undefined} onDownloadAll={() => undefined} showDelete />);

    expect(view.getByRole('button', { name: 'حذف التنزيلات' })).toBeOnTheScreen();
  });

  it('calls onDownloadAll and onDeleteAll from their own buttons', async () => {
    const onDownloadAll = jest.fn();
    const onDeleteAll = jest.fn();
    const view = await renderUi(<ReciterPageActions onDeleteAll={onDeleteAll} onDownloadAll={onDownloadAll} showDelete />);

    await fireEvent.press(view.getByRole('button', { name: 'تنزيل الكل' }));
    await fireEvent.press(view.getByRole('button', { name: 'حذف التنزيلات' }));

    expect(onDownloadAll).toHaveBeenCalledTimes(1);
    expect(onDeleteAll).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders both actions under %s', async (locale) => {
    const view = await renderUi(
      <ReciterPageActions onDeleteAll={() => undefined} onDownloadAll={() => undefined} showDelete />,
      { locale },
    );

    expect(view.getByRole('button', { name: locale === 'en' ? 'Download all' : 'تنزيل الكل' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: locale === 'en' ? 'Delete downloads' : 'حذف التنزيلات' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/components/ReciterPageActions.tsx')).toEqual([]);
  });
});
