import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { ReciterPageHeader } from './ReciterPageHeader';

const base = { name: 'مشاري راشد العفاسي', styleLabel: 'مرتّل', downloaded: 3, total: 114, onBack: () => undefined };

describe('ReciterPageHeader', () => {
  it('shows the reciter name as the large title and the style with the count under it', async () => {
    const view = await renderUi(<ReciterPageHeader {...base} />);

    expect(view.getByRole('header', { name: 'مشاري راشد العفاسي' })).toBeOnTheScreen();
    expect(view.getByText('مرتّل · ٣ من ١١٤ محمّلة')).toBeOnTheScreen();
  });

  it('leaves out the style when the reciter has none', async () => {
    const view = await renderUi(<ReciterPageHeader {...base} styleLabel={null} />);

    expect(view.getByText('٣ من ١١٤ محمّلة')).toBeOnTheScreen();
  });

  it('shows zero downloads without a plural', async () => {
    const view = await renderUi(<ReciterPageHeader {...base} downloaded={0} />);

    expect(view.getByText('مرتّل · ٠ من ١١٤ محمّلة')).toBeOnTheScreen();
  });

  it('calls onBack from the 44 pt back button, labelled for screen readers', async () => {
    const onBack = jest.fn();
    const view = await renderUi(<ReciterPageHeader {...base} onBack={onBack} />);
    const back = view.getByRole('button', { name: 'رجوع' });

    expect(flatStyle(back.props.style).height).toBeGreaterThanOrEqual(44);
    expect(flatStyle(back.props.style).width).toBeGreaterThanOrEqual(44);
    await fireEvent.press(back);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders the name and the count under %s', async (locale) => {
    const en = locale === 'en';
    const view = await renderUi(
      <ReciterPageHeader
        {...base}
        downloaded={1}
        name={en ? 'Mishari' : 'مشاري'}
        styleLabel={en ? 'Murattal' : 'مرتّل'}
        total={114}
      />,
      { locale },
    );

    expect(view.getByRole('header', { name: en ? 'Mishari' : 'مشاري' })).toBeOnTheScreen();
    expect(view.getByText(locale === 'en' ? 'Murattal · 1 of 114 downloaded' : 'مرتّل · ١ من ١١٤ محمّلة')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: locale === 'en' ? 'Back' : 'رجوع' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/components/ReciterPageHeader.tsx')).toEqual([]);
  });
});
