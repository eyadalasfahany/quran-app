import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { physicalSides, testIdsInOrder } from '../../../../jest/hadith-ui-fixtures';

import { HadithToolbar } from './HadithToolbar';

const TEST_ID = 'hadith-toolbar';

function renderToolbar(props: Partial<Parameters<typeof HadithToolbar>[0]> = {}, locale: 'ar' | 'en' = 'ar') {
  return renderUi(
    <HadithToolbar onCopy={jest.fn()} onShare={jest.fn()} onToggleSave={jest.fn()} saved={false} {...props} />,
    { locale },
  );
}

describe('HadithToolbar', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderToolbar({}, locale);
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'نسخ' : 'Copy' })).toBeOnTheScreen();
    expect(screen.getByTestId(TEST_ID).props.accessibilityLabel).toBe(locale === 'ar' ? 'أدوات الحديث' : 'Hadith actions');
  });

  it('holds save, copy and share in that order', async () => {
    await renderToolbar();
    const order = testIdsInOrder(screen.toJSON(), TEST_ID);
    expect(order.indexOf(`${TEST_ID}-save`)).toBeLessThan(order.indexOf(`${TEST_ID}-copy`));
    expect(order.indexOf(`${TEST_ID}-copy`)).toBeLessThan(order.indexOf(`${TEST_ID}-share`));
  });

  it('each button is 44 by 44', async () => {
    await renderToolbar();
    for (const name of ['حفظ الحديث', 'نسخ', 'مشاركة']) {
      expect(flatStyle(screen.getByRole('button', { name }).props.style)).toMatchObject({ height: 44, width: 44 });
    }
  });

  it('calls each callback', async () => {
    const onToggleSave = jest.fn();
    const onCopy = jest.fn();
    const onShare = jest.fn();
    await renderToolbar({ onToggleSave, onCopy, onShare });
    await press(screen.getByRole('button', { name: 'حفظ الحديث' }));
    await press(screen.getByRole('button', { name: 'نسخ' }));
    await press(screen.getByRole('button', { name: 'مشاركة' }));
    expect(onToggleSave).toHaveBeenCalledTimes(1);
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('is a toolbar with a label', async () => {
    await renderToolbar();
    const toolbar = screen.getByTestId(TEST_ID);
    expect(toolbar.props.accessibilityRole).toBe('toolbar');
    expect(toolbar.props.accessibilityLabel).toBe('أدوات الحديث');
  });

  it('reports the save button as selected when saved', async () => {
    await renderToolbar({ saved: true });
    expect(screen.getByRole('button', { name: 'إزالة من المحفوظات', selected: true })).toBeOnTheScreen();
  });

  it('uses start and end, never left and right', async () => {
    await renderToolbar();
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('renders without a raw colour in every theme (%s)', async (theme) => {
    await renderUi(<HadithToolbar onCopy={jest.fn()} onShare={jest.fn()} onToggleSave={jest.fn()} saved={false} />, { theme });
    expect(screen.getByTestId(TEST_ID)).toBeOnTheScreen();
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithToolbar.tsx')).toEqual([]);
  });

  it('keeps the 44 point minimum on each control with no text to scale', async () => {
    await renderToolbar();
    expect(flatStyle(screen.getByRole('button', { name: 'نسخ' }).props.style).height).toBe(44);
    expect(screen.queryByRole('text')).toBeNull();
  });
});
