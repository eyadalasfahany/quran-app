import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { TafsirTextSkeleton } from './TafsirTextSkeleton';

const hidden = { includeHiddenElements: true } as const;
const WIDTHS = ['100%', '96%', '98%', '91%', '100%', '94%', '62%'];

describe('TafsirTextSkeleton', () => {
  it('draws seven 10 pt lines at the frame widths, 12 apart', async () => {
    const view = await renderUi(<TafsirTextSkeleton testID="text" />);

    expect(flatStyle(view.getByTestId('text', hidden).props.style).gap).toBe(12);
    WIDTHS.forEach((width, index) => {
      expect(flatStyle(view.getByTestId(`text-line-${index}`, hidden).props.style)).toMatchObject({ height: 10, width });
    });
    expect(view.queryByTestId('text-line-7', hidden)).toBeNull();
  });

  it.each(locales)('is hidden from screen readers in %s', async (locale) => {
    const view = await renderUi(<TafsirTextSkeleton testID="text" />, { locale });

    expect(view.getByTestId('text-line-0', hidden).props.accessibilityElementsHidden).toBe(true);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/reader/panels/TafsirTextSkeleton.tsx')).toEqual([]);
  });
});
