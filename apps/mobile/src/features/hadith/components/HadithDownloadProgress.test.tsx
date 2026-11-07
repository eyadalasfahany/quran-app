import { fireEvent, screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { HadithDownloadProgress } from './HadithDownloadProgress';

const TEST_ID = 'hadith-download-progress';

describe('HadithDownloadProgress', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithDownloadProgress onCancel={jest.fn()} percent={0.6} />, { locale });
    expect(screen.getByTestId(`${TEST_ID}-text`)).toHaveTextContent(locale === 'ar' ? 'جارٍ التنزيل · ٦٠٪' : 'Downloading · 60%');
  });

  it('shows the percent with Arabic digits in Arabic', async () => {
    await renderUi(<HadithDownloadProgress onCancel={jest.fn()} percent={0.6} />);
    expect(screen.getByTestId(`${TEST_ID}-text`)).toHaveTextContent('جارٍ التنزيل · ٦٠٪');
  });

  it('draws a 4 pt bar at the given percent with progressbar role', async () => {
    await renderUi(<HadithDownloadProgress onCancel={jest.fn()} percent={0.6} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 60 });
    expect(flatStyle(bar.props.style)).toMatchObject({ height: 4 });
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-fill`).props.style)).toMatchObject({ width: '60%' });
  });

  it('clamps the percent to 0 to 1', async () => {
    await renderUi(<HadithDownloadProgress onCancel={jest.fn()} percent={1.7} />);
    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 100 });
  });

  it('clamps a negative percent to 0', async () => {
    await renderUi(<HadithDownloadProgress onCancel={jest.fn()} percent={-0.3} />);
    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 0 });
  });

  it('calls onCancel from a 44 pt text button', async () => {
    const onCancel = jest.fn();
    await renderUi(<HadithDownloadProgress onCancel={onCancel} percent={0.2} />);
    const button = screen.getByRole('button', { name: 'إلغاء' });
    expect(flatStyle(button.props.style)).toMatchObject({ minHeight: 44 });
    await press(button);
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.press(button);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithDownloadProgress.tsx')).toEqual([]);
  });
});
