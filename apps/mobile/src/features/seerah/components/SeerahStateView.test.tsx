import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { SeerahStateView } from './SeerahStateView';

describe('SeerahStateView', () => {
  it.each(locales)('download: title, body, size line and the download button (%s)', async (locale) => {
    await renderUi(<SeerahStateView kind="download" onAction={jest.fn()} sizeLabel={locale === 'ar' ? '٢٫٤ م.ب' : '2.4 MB'} />, { locale });
    expect(screen.getByRole('header')).toHaveTextContent(locale === 'ar' ? 'السيرة على الخريطة' : 'Seerah on the map');
    expect(screen.getByText(locale === 'ar' ? '٢٫٤ م.ب · يعمل دون إنترنت بعد التنزيل' : '2.4 MB · works offline after the download')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'تنزيل السيرة' : 'Download Seerah' })).toBeOnTheScreen();
  });

  it('download calls onAction', async () => {
    const onAction = jest.fn();
    await renderUi(<SeerahStateView kind="download" onAction={onAction} sizeLabel="٢٫٤ م.ب" />);
    await press(screen.getByRole('button', { name: 'تنزيل السيرة' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('downloading: a progress bar with its value, the done-of-total line and cancel', async () => {
    const onAction = jest.fn();
    await renderUi(<SeerahStateView doneLabel="١٫٤ م.ب" kind="downloading" onAction={onAction} progress={0.58} sizeLabel="٢٫٤ م.ب" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.props.accessibilityValue).toMatchObject({ max: 100, min: 0, now: 58 });
    expect(flatStyle(screen.getByTestId('seerah-state-view-progress-fill').props.style).width).toBe('58%');
    expect(screen.getByText('١٫٤ م.ب من ٢٫٤ م.ب · يمكنك مغادرة الشاشة، ويكتمل التنزيل.')).toBeOnTheScreen();
    await press(screen.getByRole('button', { name: 'إلغاء التنزيل' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('downloading clamps the progress to 0..100', async () => {
    await renderUi(<SeerahStateView kind="downloading" progress={3} sizeLabel="x" />);
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(100);
  });

  it.each(locales)('offline: needs a connection once, with retry (%s)', async (locale) => {
    await renderUi(<SeerahStateView kind="offline" onAction={jest.fn()} />, { locale });
    expect(screen.getByText(locale === 'ar' ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'إعادة المحاولة' : 'Try again' })).toBeOnTheScreen();
  });

  it('error: says the file is incomplete with its size and offers to download again', async () => {
    await renderUi(<SeerahStateView kind="error" onAction={jest.fn()} sizeLabel="٢٫٤ م.ب" />);
    expect(screen.getByText('ملف السيرة على جهازك ناقص. أعد تنزيله (٢٫٤ م.ب).')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'إعادة التنزيل' })).toBeOnTheScreen();
  });

  it('draws no button without onAction', async () => {
    await renderUi(<SeerahStateView kind="offline" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it.each(locales)('empty year: says no events at the age and offers the nearest (%s)', async (locale) => {
    const onAction = jest.fn();
    await renderUi(<SeerahStateView age={30} kind="emptyYear" nearestAge={35} onAction={onAction} />, { locale });
    expect(screen.getByText(locale === 'ar' ? 'لا أحداث في هذا العمر' : 'No events at this age')).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? 'لا يذكر الكتاب حدثًا وعمره ٣٠ سنة.' : 'The book gives no event at age 30.')).toBeOnTheScreen();
    await press(screen.getByRole('button', { name: locale === 'ar' ? 'أقرب عمر: ٣٥' : 'Nearest age: 35' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('empty year has no button when there is no nearest age', async () => {
    await renderUi(<SeerahStateView age={30} kind="emptyYear" nearestAge={null} onAction={jest.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is a raised card on the theme colours and a summary for screen readers when empty', async () => {
    await renderUi(<SeerahStateView kind="emptyYear" age={1} />, { theme: 'dark' });
    expect(screen.getByTestId('seerah-state-view').props.accessibilityRole).toBe('summary');
    expect(flatStyle(screen.getByTestId('seerah-state-view').props.style).backgroundColor).toBe(themes.dark.colors.surfaceRaised);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/SeerahStateView.tsx')).toEqual([]);
  });
});
