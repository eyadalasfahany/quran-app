import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { MushafPageSkeleton } from './MushafPageSkeleton';

const hidden = { includeHiddenElements: true } as const;

describe('MushafPageSkeleton', () => {
  it('draws fifteen 14 pt Mushaf lines, 18 apart', async () => {
    const view = await renderUi(<MushafPageSkeleton testID="page" />);

    expect(flatStyle(view.getByTestId('page', hidden).props.style).gap).toBe(18);
    for (let index = 0; index < 15; index += 1) {
      expect(flatStyle(view.getByTestId(`page-line-${index}`, hidden).props.style).height).toBe(14);
    }
    expect(view.queryByTestId('page-line-15', hidden)).toBeNull();
  });

  it('makes the first fourteen lines full width and the last 58%, centred', async () => {
    const view = await renderUi(<MushafPageSkeleton testID="page" />);

    expect(flatStyle(view.getByTestId('page-line-0', hidden).props.style).width).toBe('100%');
    expect(flatStyle(view.getByTestId('page-line-13', hidden).props.style).width).toBe('100%');
    expect(flatStyle(view.getByTestId('page-line-14', hidden).props.style)).toMatchObject({ alignSelf: 'center', width: '58%' });
  });

  it.each(locales)('is hidden from screen readers in %s', async (locale) => {
    const view = await renderUi(<MushafPageSkeleton testID="page" />, { locale });

    expect(view.getByTestId('page-line-0', hidden).props.accessibilityElementsHidden).toBe(true);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/reader/components/MushafPageSkeleton.tsx')).toEqual([]);
  });
});
