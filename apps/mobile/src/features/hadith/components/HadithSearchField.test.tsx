import { fireEvent, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { HadithSearchField } from './HadithSearchField';

const TEST_ID = 'hadith-search-field';

function handlers() {
  return { onChangeText: jest.fn(), onSubmit: jest.fn(), onCancel: jest.fn() };
}

describe('HadithSearchField', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithSearchField {...handlers()} onChangeText={jest.fn()} value="" />, { locale });
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'إلغاء' : 'Cancel' })).toBeOnTheScreen();
    expect(screen.getByPlaceholderText(locale === 'ar' ? 'ابحث في الحديث' : 'Search hadith')).toBeOnTheScreen();
  });

  // The field is the shared SearchField, as in the Quran search. Arabic is explicitly right-aligned in an LTR node, so it stays right on an English phone.
  it.each([
    ['ar', { direction: 'ltr', textAlign: 'right', writingDirection: 'rtl' }],
    ['en', { textAlign: 'left' }],
  ] as const)('aligns the typed text as %s expects, as the Quran search does', async (locale, alignment) => {
    await renderUi(<HadithSearchField {...handlers()} value="" />, { locale });
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-field-input`).props.style)).toMatchObject(alignment);
  });

  it('on Android under RTL sets no alignment key, so the platform keeps its natural alignment', async () => {
    const platform = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await renderUi(<HadithSearchField {...handlers()} value="" />, { locale: 'ar' });
      const style = flatStyle(screen.getByTestId(`${TEST_ID}-field-input`).props.style);
      expect(style).not.toHaveProperty('textAlign');
      expect(style).not.toHaveProperty('direction');
      expect(style).not.toHaveProperty('writingDirection');
    } finally {
      platform.restore();
    }
  });

  it('shows the placeholder', async () => {
    await renderUi(<HadithSearchField {...handlers()} value="" />);
    expect(screen.getByPlaceholderText('ابحث في الحديث')).toBeOnTheScreen();
  });

  it('passes typing to onChangeText', async () => {
    const callbacks = handlers();
    await renderUi(<HadithSearchField {...callbacks} value="كلمة" />);
    fireEvent.changeText(screen.getByPlaceholderText('ابحث في الحديث'), 'كلمتان');
    expect(callbacks.onChangeText).toHaveBeenCalledWith('كلمتان');
  });

  it('passes submit to onSubmit', async () => {
    const callbacks = handlers();
    await renderUi(<HadithSearchField {...callbacks} value="كلمة" />);
    fireEvent(screen.getByPlaceholderText('ابحث في الحديث'), 'submitEditing');
    expect(callbacks.onSubmit).toHaveBeenCalledWith('كلمة');
  });

  it('hides the clear button when the field is empty', async () => {
    await renderUi(<HadithSearchField {...handlers()} value="" />);
    expect(screen.queryByTestId(`${TEST_ID}-field-clear`)).toBeNull();
  });

  it('shows the clear button when there is a value', async () => {
    await renderUi(<HadithSearchField {...handlers()} value="كلمة" />);
    expect(screen.getByTestId(`${TEST_ID}-field-clear`)).toBeOnTheScreen();
    expect(screen.getByLabelText('مسح البحث')).toBeOnTheScreen();
  });

  it('calls onCancel from the cancel text', async () => {
    const callbacks = handlers();
    await renderUi(<HadithSearchField {...callbacks} value="" />);
    await press(screen.getByRole('button', { name: 'إلغاء' }));
    expect(callbacks.onCancel).toHaveBeenCalledTimes(1);
  });

  it('the cancel target is at least 44 high', async () => {
    await renderUi(<HadithSearchField {...handlers()} value="" />);
    expect(flatStyle(screen.getByRole('button', { name: 'إلغاء' }).props.style).minHeight).toBe(44);
  });

  it('uses start and end, never left and right', async () => {
    await renderUi(<HadithSearchField {...handlers()} value="" />);
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
    expect(physicalSides(flatStyle(screen.getByRole('button', { name: 'إلغاء' }).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<HadithSearchField {...handlers()} value="" />, { theme });
    expect(flatStyle(screen.getByText('إلغاء').props.style).color).toBe(themes[theme].colors.brand);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithSearchField.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderUi(<HadithSearchField {...handlers()} value="" />);
    expect(screen.getByText('إلغاء').props.maxFontSizeMultiplier).toBe(maxFontScale.content);
  });
});
