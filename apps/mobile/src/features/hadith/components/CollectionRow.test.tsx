import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import type { CollectionDownloadState } from './CollectionDownloadButton';
import { CollectionRow, type CollectionRowData } from './CollectionRow';

const TEST_ID = 'collection-row';
const TITLE = '[اسم المجموعة]';
const AUTHOR = '[اسم المؤلف]';

const DATA: CollectionRowData = {
  slug: 'bukhari',
  number: 1,
  titleAr: TITLE,
  titleEn: '[Collection name]',
  authorAr: AUTHOR,
  authorEn: '[Author name]',
  totalHadith: 5432,
  booksCount: 42,
  soleBook: false,
};

// 5432 and 42 are in the Arabic «many» plural band (11 to 99): «حديثًا» and «كتابًا».
const INSTALLED_COUNTS = '٥٤٣٢ حديثًا · ٤٢ كتابًا';
const DOWNLOAD_NAME = 'تنزيل [اسم المجموعة]';

async function renderRow(
  state: CollectionDownloadState,
  data: Partial<CollectionRowData> = {},
  options: { locale?: 'ar' | 'en'; theme?: 'light' | 'sepia' | 'dark' } = {},
) {
  const callbacks = { onPress: jest.fn(), onDownload: jest.fn(), onCancel: jest.fn(), onRetry: jest.fn() };
  await renderUi(<CollectionRow collection={{ ...DATA, ...data }} state={state} {...callbacks} />, options);
  return callbacks;
}

describe('CollectionRow', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderRow({ kind: 'installed' }, {}, { locale });
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent(locale === 'ar' ? TITLE : '[Collection name]');
  });

  it('installed: shows the cover, title, author, counts and a chevron', async () => {
    await renderRow({ kind: 'installed' });
    expect(screen.getByTestId(`${TEST_ID}-cover`)).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent(TITLE);
    expect(screen.getByTestId(`${TEST_ID}-author`)).toHaveTextContent(AUTHOR);
    expect(screen.getByTestId(`${TEST_ID}-status`)).toHaveTextContent(INSTALLED_COUNTS);
    expect(screen.getByTestId(`${TEST_ID}-chevron`, { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('installed single-book: shows «كتاب واحد» in the counts', async () => {
    await renderRow({ kind: 'installed' }, { soleBook: true, booksCount: 1 });
    expect(screen.getByTestId(`${TEST_ID}-status`)).toHaveTextContent(/كتاب واحد/);
  });

  it('hides the author line when null', async () => {
    await renderRow({ kind: 'installed' }, { authorAr: null });
    expect(screen.queryByTestId(`${TEST_ID}-author`)).toBeNull();
  });

  it('shows «مجموعة n» and an ornament-only cover when titleAr is null in Arabic', async () => {
    await renderRow({ kind: 'installed' }, { titleAr: null });
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent('مجموعة ١');
    expect(screen.getByRole('image', { name: 'غلاف مجموعة' })).toBeOnTheScreen();
  });

  it('shows "Collection n" when titleEn is null in English', async () => {
    await renderRow({ kind: 'installed' }, { titleEn: null }, { locale: 'en' });
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent('Collection 1');
  });

  it('available: shows the size and the download pill instead of the chevron', async () => {
    await renderRow({ kind: 'available', sizeBytes: 10276044, offline: false });
    expect(screen.getByTestId(`${TEST_ID}-status`)).toHaveTextContent('٩٫٨ م.ب');
    expect(screen.getByRole('button', { name: DOWNLOAD_NAME })).toBeEnabled();
    expect(screen.queryByTestId(`${TEST_ID}-chevron`, { includeHiddenElements: true })).toBeNull();
  });

  it('available offline: dims the row, shows the offline pill and a disabled button', async () => {
    await renderRow({ kind: 'available', sizeBytes: 1, offline: true });
    expect(screen.getByTestId(`${TEST_ID}-offline`)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: DOWNLOAD_NAME })).toBeDisabled();
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-body`).props.style).opacity).toBe(0.5);
  });

  it('downloading: shows a 4 pt bar at the given percent with progressbar role and a cancel button', async () => {
    await renderRow({ kind: 'downloading', progress: 0.6 });
    const bar = screen.getByRole('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 60 });
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-progress`).props.style).height).toBe(4);
    expect(screen.getByRole('button', { name: 'إيقاف التنزيل' })).toBeOnTheScreen();
  });

  it('failed: shows the failed text in the danger colour and the retry button inside the text column', async () => {
    await renderRow({ kind: 'failed' });
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-failed`).props.style).color).toBe(themes.light.colors.danger);
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeOnTheScreen();
  });

  it('row press and the trailing button are separate buttons, both reachable with getByRole', async () => {
    const callbacks = await renderRow({ kind: 'available', sizeBytes: 1, offline: false });
    await press(screen.getByRole('button', { name: `${TITLE}, ${AUTHOR}, ٠٫١ م.ب` }));
    expect(callbacks.onPress).toHaveBeenCalledTimes(1);
    await press(screen.getByRole('button', { name: DOWNLOAD_NAME }));
    expect(callbacks.onDownload).toHaveBeenCalledTimes(1);
  });

  it('uses the neutral cover when slug is null', async () => {
    await renderRow({ kind: 'installed' }, { slug: null });
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-cover`).props.style).backgroundColor).toBe(themes.light.colors.coverNeutral);
  });

  it('has no border', async () => {
    await renderRow({ kind: 'installed' });
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).borderWidth).toBeUndefined();
  });

  it('uses start and end, never left and right', async () => {
    await renderRow({ kind: 'installed' });
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderRow({ kind: 'installed' }, {}, { theme });
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).backgroundColor).toBe(themes[theme].colors.surfaceRaised);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/CollectionRow.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderRow({ kind: 'installed' });
    expect(screen.getByTestId(`${TEST_ID}-status`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).not.toHaveProperty('height');
  });

  it('waiting shows the Wi-Fi wait text in the muted tone, not the failed text', async () => {
    await renderRow({ kind: 'waiting' });
    expect(screen.getByTestId(`${TEST_ID}-status`)).toHaveTextContent('بانتظار شبكة Wi-Fi');
    expect(screen.queryByTestId(`${TEST_ID}-failed`)).toBeNull();
    expect(screen.queryByText('تعذّر التنزيل')).toBeNull();
  });

  it('waiting shows a cancel button that calls onCancel', async () => {
    const callbacks = await renderRow({ kind: 'waiting' });
    await press(screen.getByRole('button', { name: 'إيقاف التنزيل' }));
    expect(callbacks.onCancel).toHaveBeenCalledTimes(1);
  });
});
