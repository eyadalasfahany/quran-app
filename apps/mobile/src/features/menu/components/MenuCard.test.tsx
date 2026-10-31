import { fireEvent, screen } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, renderUi } from '../../../../jest/render-ui';

import { MenuCard } from './MenuCard';

const ICON = { ios: 'book', android: 'menu_book' } as const;

describe('MenuCard', () => {
  it('shows the caption, the title and the preview line', async () => {
    await renderUi(
      <MenuCard caption="القراءة" icon={ICON} onPress={jest.fn()} preview="القراءة بالصفحة والسورة" testID="card" title="المصحف" />,
    );

    expect(screen.getByText('القراءة')).toBeOnTheScreen();
    expect(screen.getByText('المصحف')).toBeOnTheScreen();
    expect(screen.getByTestId('card-preview')).toHaveTextContent('القراءة بالصفحة والسورة');
  });

  it('draws no preview line without one', async () => {
    await renderUi(<MenuCard caption="البحث" icon={ICON} onPress={jest.fn()} testID="card" title="البحث" />);

    expect(screen.queryByTestId('card-preview')).toBeNull();
  });

  it('draws no progress bar without a progress value', async () => {
    await renderUi(<MenuCard caption="c" icon={ICON} onPress={jest.fn()} testID="card" title="t" />);

    expect(screen.queryByTestId('card-progress')).toBeNull();
  });

  it('sets the bar to the progress share', async () => {
    await renderUi(<MenuCard caption="c" icon={ICON} onPress={jest.fn()} progress={0.5} testID="card" title="t" />);

    expect(flatStyle(screen.getByTestId('card-progress').props.style).width).toBe('50%');
  });

  it('clamps the bar between empty and full', async () => {
    await renderUi(<MenuCard caption="c" icon={ICON} onPress={jest.fn()} progress={3} testID="card" title="t" />);

    expect(flatStyle(screen.getByTestId('card-progress').props.style).width).toBe('100%');
  });

  it('is one button whose label joins the caption, title and preview, with a hint naming the title', async () => {
    await renderUi(
      <MenuCard caption="الصلاة القادمة" icon={ICON} onPress={jest.fn()} preview="٣:١٥ م" testID="card" title="العصر" />,
    );

    const card = screen.getByRole('button', { name: 'الصلاة القادمة, العصر, ٣:١٥ م' });
    expect(card.props.accessibilityHint).toBe('افتح العصر');
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await renderUi(<MenuCard caption="c" icon={ICON} onPress={onPress} testID="card" title="t" />);

    fireEvent.press(screen.getByTestId('card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('labels the card in English with an English hint', async () => {
    await renderUi(
      <MenuCard caption="Reading" icon={ICON} onPress={jest.fn()} preview="Read by page" testID="card" title="Mushaf" />,
      { locale: 'en' },
    );

    const card = screen.getByRole('button', { name: 'Reading, Mushaf, Read by page' });
    expect(card.props.accessibilityHint).toBe('Opens Mushaf');
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/menu/components/MenuCard.tsx')).toEqual([]);
  });
});
