import { fireEvent, screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';


import { HadithBookmarkButton } from './HadithBookmarkButton';

const TEST_ID = 'hadith-bookmark-button';

describe('HadithBookmarkButton', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithBookmarkButton onToggle={jest.fn()} saved={false} />, { locale });
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'حفظ الحديث' : 'Save hadith' })).toBeOnTheScreen();
  });

  it('shows the outline and the save label when not saved', async () => {
    await renderUi(<HadithBookmarkButton onToggle={jest.fn()} saved={false} />);
    expect(screen.getByRole('button', { name: 'حفظ الحديث' })).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-icon`, { includeHiddenElements: true }).props.style).toBeDefined();
  });

  it('shows the filled glyph and the remove label when saved', async () => {
    await renderUi(<HadithBookmarkButton onToggle={jest.fn()} saved />);
    expect(screen.getByRole('button', { name: 'إزالة من المحفوظات' })).toBeOnTheScreen();
  });

  it('reports selected state', async () => {
    const view = await renderUi(<HadithBookmarkButton onToggle={jest.fn()} saved />);
    expect(screen.getByRole('button', { name: 'إزالة من المحفوظات', selected: true })).toBeOnTheScreen();
    await view.unmount();
    await renderUi(<HadithBookmarkButton onToggle={jest.fn()} saved={false} />);
    expect(screen.getByRole('button', { name: 'حفظ الحديث', selected: false })).toBeOnTheScreen();
  });

  it('calls onToggle', async () => {
    const onToggle = jest.fn();
    await renderUi(<HadithBookmarkButton onToggle={onToggle} saved={false} />);
    await press(screen.getByRole('button', { name: 'حفظ الحديث' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('uses the glass variant when asked', async () => {
    await renderUi(<HadithBookmarkButton onToggle={jest.fn()} saved={false} testID={TEST_ID} variant="glass" />);
    expect(screen.getByTestId(`${TEST_ID}-glass`, { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('is at least 44 by 44', async () => {
    await renderUi(<HadithBookmarkButton onToggle={jest.fn()} saved={false} />);
    const style = flatStyle(screen.getByRole('button', { name: 'حفظ الحديث' }).props.style);
    expect(style).toMatchObject({ height: 44, width: 44 });
  });

  it('is pressable by a native tap on the button', async () => {
    const onToggle = jest.fn();
    await renderUi(<HadithBookmarkButton onToggle={onToggle} saved />);
    fireEvent.press(screen.getByRole('button', { name: 'إزالة من المحفوظات' }));
    expect(onToggle).toHaveBeenCalled();
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithBookmarkButton.tsx')).toEqual([]);
  });

  it('keeps the 44 point minimum with no text to scale', async () => {
    await renderUi(<HadithBookmarkButton onToggle={jest.fn()} saved={false} />);
    const style = flatStyle(screen.getByRole('button', { name: 'حفظ الحديث' }).props.style);
    expect(style.height).toBe(44);
    expect(screen.queryByRole('text')).toBeNull();
  });
});
