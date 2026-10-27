import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { IndexSegment } from './IndexSegment';

describe('IndexSegment', () => {
  it('renders both segments with surahs selected by default', async () => {
    const view = await renderUi(<IndexSegment onChange={() => undefined} testID="index-segment" value="surahs" />);

    expect(view.getByTestId('index-segment-surahs')).toBeOnTheScreen();
    expect(view.getByTestId('index-segment-juz')).toBeOnTheScreen();
  });

  it('calls onChange when juz is selected', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<IndexSegment onChange={onChange} testID="index-segment" value="surahs" />);

    await fireEvent.press(view.getByTestId('index-segment-juz'));

    expect(onChange).toHaveBeenCalledWith('juz');
  });

  it.each(locales)('exposes a tablist in %s', async (locale) => {
    const view = await renderUi(<IndexSegment onChange={() => undefined} value="surahs" />, { locale });

    expect(view.getByLabelText(locale === 'ar' ? 'عرض الفهرس' : 'Index view')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/library/components/IndexSegment.tsx')).toEqual([]);
  });
});
