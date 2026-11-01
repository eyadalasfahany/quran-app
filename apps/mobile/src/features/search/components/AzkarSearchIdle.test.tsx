import { fireEvent } from '@testing-library/react-native';

import { featureComponentLiterals } from '../../../../jest/ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';
import { AzkarSearchIdle } from './AzkarSearchIdle';

const noop = () => undefined;

describe('AzkarSearchIdle', () => {
  it.each(locales)('shows the idle line below the recent searches in %s', async (locale) => {
    const hint =
      locale === 'ar'
        ? 'ابحث بالكلمة أو بجزء منها، وستظهر الأبواب والأذكار التي تطابقها.'
        : 'Search by a word or part of one. Matching chapters and azkar appear here.';
    const view = await renderUi(
      <AzkarSearchIdle onClear={noop} onRemove={noop} onSelect={noop} queries={['الصباح']} />,
      { locale },
    );

    expect(view.getByTestId('search-azkar-idle-hint')).toHaveTextContent(hint);
    expect(view.getByTestId('search-azkar-idle-recent-0')).toBeOnTheScreen();
  });

  it('shows only the idle line when there are no recent searches', async () => {
    const view = await renderUi(<AzkarSearchIdle onClear={noop} onRemove={noop} onSelect={noop} queries={[]} />);

    expect(view.getByTestId('search-azkar-idle-hint')).toBeOnTheScreen();
    expect(view.queryByTestId('search-azkar-idle-recent-0')).toBeNull();
  });

  it('runs a recent search when it is picked', async () => {
    const onSelect = jest.fn();
    const view = await renderUi(
      <AzkarSearchIdle onClear={noop} onRemove={noop} onSelect={onSelect} queries={['الصباح', 'المساء']} />,
    );

    await fireEvent.press(view.getByTestId('search-azkar-idle-recent-1'));

    expect(onSelect).toHaveBeenCalledWith('المساء');
  });

  it('removes one recent search, and clears them all, through labelled buttons', async () => {
    const onRemove = jest.fn();
    const onClear = jest.fn();
    const view = await renderUi(
      <AzkarSearchIdle onClear={onClear} onRemove={onRemove} onSelect={noop} queries={['الصباح']} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'إزالة الصباح' }));
    await fireEvent.press(view.getByRole('button', { name: 'مسح السجل' }));

    expect(onRemove).toHaveBeenCalledWith('الصباح');
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('draws its colours from the theme, with no literal colour in the component', () => {
    expect(featureComponentLiterals('features/search/components/AzkarSearchIdle.tsx')).toEqual([]);
  });
});
