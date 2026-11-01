import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, renderUi } from '../../../../jest/render-ui';

import { SibhaRoundsBadge } from './SibhaRoundsBadge';

describe('SibhaRoundsBadge', () => {
  it('renders nothing while there are no rounds', async () => {
    const view = await renderUi(<SibhaRoundsBadge rounds={0} />);

    expect(view.queryByTestId('sibha-rounds')).toBeNull();
    expect(view.queryByText(/الدورة/)).toBeNull();
  });

  it('shows the round in Arabic digits once a round is complete', async () => {
    const view = await renderUi(<SibhaRoundsBadge rounds={2} />);

    expect(view.getByTestId('sibha-rounds')).toBeOnTheScreen();
    expect(view.getByText('الدورة ٢')).toBeOnTheScreen();
  });

  it('shows the round in English with Western digits', async () => {
    const view = await renderUi(<SibhaRoundsBadge rounds={12} />, { locale: 'en' });

    expect(view.getByText('Round 12')).toBeOnTheScreen();
  });

  it('is a read-out: it is hidden from screen readers and is not a control', async () => {
    const view = await renderUi(<SibhaRoundsBadge rounds={1} />);

    expect(view.getByTestId('sibha-rounds').props.importantForAccessibility).toBe('no');
    expect(view.queryByRole('button')).toBeNull();
  });

  it('uses the fill and hairline tokens for the pill', async () => {
    const view = await renderUi(<SibhaRoundsBadge rounds={1} />, { theme: 'dark' });

    const style = flatStyle(view.getByTestId('sibha-rounds').props.style);
    expect(style.backgroundColor).toBe('#24342f');
    expect(style.borderRadius).toBe(999);
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/sibha/components/SibhaRoundsBadge.tsx')).toEqual([]);
  });
});
