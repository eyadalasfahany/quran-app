import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';

import { CollectionDownloadButton, type CollectionDownloadState } from './CollectionDownloadButton';

const TITLE = '[اسم المجموعة]';

async function renderButton(state: CollectionDownloadState, locale: 'ar' | 'en' = 'ar', theme: 'light' | 'sepia' | 'dark' = 'light') {
  const callbacks = { onDownload: jest.fn(), onCancel: jest.fn(), onRetry: jest.fn() };
  await renderUi(<CollectionDownloadButton collectionTitle={TITLE} state={state} {...callbacks} />, { locale, theme });
  return callbacks;
}

describe('CollectionDownloadButton', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderButton({ kind: 'available', sizeBytes: 1, offline: false }, locale);
    expect(screen.getByRole('button', { name: locale === 'ar' ? `تنزيل ${TITLE}` : `Download ${TITLE}` })).toBeOnTheScreen();
  });

  it('renders nothing when installed', async () => {
    await renderButton({ kind: 'installed' });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the download pill when available', async () => {
    await renderButton({ kind: 'available', sizeBytes: 10276044, offline: false });
    expect(screen.getByRole('button', { name: `تنزيل ${TITLE}` })).toBeEnabled();
  });

  it('disables the pill while offline and does not call onDownload', async () => {
    const callbacks = await renderButton({ kind: 'available', sizeBytes: 1, offline: true });
    expect(screen.getByRole('button', { name: `تنزيل ${TITLE}` })).toBeDisabled();
    await press(screen.getByRole('button', { name: `تنزيل ${TITLE}` }));
    expect(callbacks.onDownload).not.toHaveBeenCalled();
  });

  it('shows the cancel button with the percent as its hint while downloading', async () => {
    await renderButton({ kind: 'downloading', progress: 0.6 });
    expect(screen.getByRole('button', { name: 'إيقاف التنزيل' }).props.accessibilityHint).toBe('جارٍ التنزيل · ٦٠٪');
  });

  it('calls onCancel', async () => {
    const callbacks = await renderButton({ kind: 'downloading', progress: 0.2 });
    await press(screen.getByRole('button', { name: 'إيقاف التنزيل' }));
    expect(callbacks.onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows the retry pill when failed and calls onRetry', async () => {
    const callbacks = await renderButton({ kind: 'failed' });
    await press(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(callbacks.onRetry).toHaveBeenCalledTimes(1);
  });

  it('clamps progress to 0 to 1', async () => {
    await renderButton({ kind: 'downloading', progress: 1.7 });
    expect(screen.getByRole('button', { name: 'إيقاف التنزيل' }).props.accessibilityHint).toBe('جارٍ التنزيل · ١٠٠٪');
    await renderButton({ kind: 'downloading', progress: -0.4 });
    expect(screen.getByRole('button', { name: 'إيقاف التنزيل' }).props.accessibilityHint).toBe('جارٍ التنزيل · ٠٪');
  });

  it('uses start and end, never left and right', async () => {
    await renderButton({ kind: 'failed' });
    expect(physicalSides(flatStyle(screen.getByRole('button').props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderButton({ kind: 'available', sizeBytes: 1, offline: true }, 'ar', theme);
    expect(flatStyle(screen.getByRole('button').props.style).backgroundColor).toBe(themes[theme].colors.fillSecondary);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/CollectionDownloadButton.tsx')).toEqual([]);
  });

  it('keeps the button at least 44 high at the largest size', async () => {
    await renderButton({ kind: 'failed' });
    expect(flatStyle(screen.getByRole('button').props.style).minHeight).toBe(44);
  });
});
