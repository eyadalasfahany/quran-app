import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { ReaderActionButtons } from './ReaderActionButtons';

function renderButtons(props: Partial<Parameters<typeof ReaderActionButtons>[0]> = {}) {
  const handlers = { onToggleFavorite: jest.fn(), onShare: jest.fn(), onTextSize: jest.fn() };
  const ui = <ReaderActionButtons favorite={false} textSizeOpen={false} {...handlers} {...props} />;
  return { ui, handlers };
}

describe('ReaderActionButtons', () => {
  it('renders the favourite, share and text size controls with their labels', async () => {
    const { ui } = renderButtons();
    await renderUi(ui);
    expect(screen.getByRole('button', { name: 'إضافة إلى المفضلة' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'مشاركة' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'حجم النص' })).toBeOnTheScreen();
  });

  it('labels a favourite with the remove action', async () => {
    const { ui } = renderButtons({ favorite: true });
    await renderUi(ui);
    expect(screen.getByRole('button', { name: 'إزالة من المفضلة' })).toBeOnTheScreen();
  });

  it('reports the text size toggle as expanded when its panel is open', async () => {
    const { ui } = renderButtons({ textSizeOpen: true });
    await renderUi(ui);
    expect(screen.getByRole('button', { name: 'حجم النص' }).props.accessibilityState).toEqual({ expanded: true });
  });

  it('calls the toggle, share and text size handlers', async () => {
    const { ui, handlers } = renderButtons();
    await renderUi(ui);
    await press(screen.getByRole('button', { name: 'إضافة إلى المفضلة' }));
    await press(screen.getByRole('button', { name: 'مشاركة' }));
    await press(screen.getByRole('button', { name: 'حجم النص' }));
    expect(handlers.onToggleFavorite).toHaveBeenCalledTimes(1);
    expect(handlers.onShare).toHaveBeenCalledTimes(1);
    expect(handlers.onTextSize).toHaveBeenCalledTimes(1);
  });

  it('orders the controls favourite, share, text size', async () => {
    const { ui } = renderButtons({ testID: 'fixture-actions' });
    await renderUi(ui);
    const row = screen.getByTestId('fixture-actions');
    const ids = row.children.map((child) => (typeof child === 'object' && child !== null && 'props' in child ? child.props.testID : null));
    expect(ids).toEqual(['azkar-favourite', 'azkar-share', 'azkar-text-size-toggle']);
  });

  it('renders the English labels', async () => {
    const { ui } = renderButtons();
    await renderUi(ui, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Share' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add to favourites' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/ReaderActionButtons.tsx')).toEqual([]);
  });
});
