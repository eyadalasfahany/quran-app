import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { HadithReaderHeader } from './HadithReaderHeader';

const TEST_ID = 'hadith-reader-header';

function renderHeader(over: { saved?: boolean; locale?: 'ar' | 'en' } = {}) {
  const callbacks = { onBack: jest.fn(), onToggleSave: jest.fn(), onCopy: jest.fn(), onShare: jest.fn() };
  return renderUi(
    <HadithReaderHeader
      bookTitle="[اسم الكتاب]"
      collectionTitle="[اسم المجموعة]"
      onBack={callbacks.onBack}
      onCopy={callbacks.onCopy}
      onShare={callbacks.onShare}
      onToggleSave={callbacks.onToggleSave}
      saved={over.saved ?? false}
    />,
    { locale: over.locale ?? 'ar' },
  ).then(() => callbacks);
}

describe('HadithReaderHeader', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderHeader({ locale });
    expect(screen.getByTestId(`${TEST_ID}-breadcrumb`)).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-back`)).toBeOnTheScreen();
  });

  it('shows the back button, the breadcrumb and the toolbar', async () => {
    await renderHeader();
    expect(screen.getByRole('button', { name: 'رجوع' })).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-breadcrumb`)).toHaveTextContent(/\[اسم المجموعة\]/);
    expect(screen.getByTestId(`${TEST_ID}-toolbar`)).toBeOnTheScreen();
  });

  it('calls onBack, onToggleSave, onCopy and onShare', async () => {
    const callbacks = await renderHeader();
    await press(screen.getByRole('button', { name: 'رجوع' }));
    await press(screen.getByRole('button', { name: 'حفظ الحديث' }));
    await press(screen.getByRole('button', { name: 'نسخ' }));
    await press(screen.getByRole('button', { name: 'مشاركة' }));
    expect(callbacks.onBack).toHaveBeenCalledTimes(1);
    expect(callbacks.onToggleSave).toHaveBeenCalledTimes(1);
    expect(callbacks.onCopy).toHaveBeenCalledTimes(1);
    expect(callbacks.onShare).toHaveBeenCalledTimes(1);
  });

  it('mirrors the back chevron in Arabic', async () => {
    await renderHeader();
    expect(screen.getByTestId(`${TEST_ID}-back`)).toBeOnTheScreen();
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-back`).props.style)).toBeDefined();
  });

  it('shows the saved state on the bookmark button', async () => {
    await renderHeader({ saved: true });
    expect(screen.getByRole('button', { name: 'إزالة من المحفوظات' })).toBeOnTheScreen();
  });

  it('has no raw colour literal and no physical side keys', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithReaderHeader.tsx')).toEqual([]);
    expect(physicalSides({})).toEqual([]);
  });
});
