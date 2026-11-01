import { screen } from '@testing-library/react-native';

import { makeDownloadEntry } from '../../../../jest/azkar-audio-fixtures';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { AzkarDownloadRow } from './AzkarDownloadRow';

function renderRow(entry: Parameters<typeof makeDownloadEntry>[0] = {}, extra: Partial<Parameters<typeof AzkarDownloadRow>[0]> = {}) {
  const handlers = { onCancel: jest.fn(), onRemove: jest.fn(), onRetry: jest.fn() };
  const ui = <AzkarDownloadRow entry={makeDownloadEntry({ title: 'FIXTURE recording', ...entry })} {...handlers} {...extra} />;
  return { ui, handlers };
}

describe('AzkarDownloadRow', () => {
  it('shows a done recording with its size, and removes it on press', async () => {
    const { ui, handlers } = renderRow({ state: 'done', bytes: 4_404_019, recordingKey: 'fixture:recording-001' });
    await renderUi(ui);

    expect(screen.getByText('FIXTURE recording')).toBeOnTheScreen();
    expect(screen.getByText('٤٫٢ م.ب · تم التنزيل')).toBeOnTheScreen();
    await press(screen.getByRole('button', { name: 'حذف التسجيل FIXTURE recording' }));
    expect(handlers.onRemove).toHaveBeenCalledWith('fixture:recording-001');
  });

  it('shows the done state without a size when the size is unknown', async () => {
    const { ui } = renderRow({ state: 'done', bytes: null });
    await renderUi(ui);
    expect(screen.getByText('تم التنزيل')).toBeOnTheScreen();
  });

  it('shows a downloading recording with a progress bar and a cancel action', async () => {
    const { ui, handlers } = renderRow({ state: 'downloading', progress: 0.6, bytes: null, recordingKey: 'fixture:recording-002' });
    await renderUi(ui);

    expect(screen.getByRole('progressbar', { name: 'FIXTURE recording' })).toHaveProp('accessibilityValue', {
      min: 0,
      max: 100,
      now: 60,
    });
    expect(screen.getByText('جارٍ التنزيل · ٦٠٪')).toBeOnTheScreen();
    await press(screen.getByRole('button', { name: 'إلغاء التنزيل FIXTURE recording' }));
    expect(handlers.onCancel).toHaveBeenCalledWith('fixture:recording-002');
  });

  it('shows a failed recording with a retry action that passes the entry back', async () => {
    const entry = makeDownloadEntry({ state: 'failed', progress: 0, bytes: null });
    const { ui, handlers } = renderRow(entry);
    await renderUi(ui);

    expect(screen.getByText('تعذّر التنزيل')).toBeOnTheScreen();
    await press(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(handlers.onRetry).toHaveBeenCalledWith(expect.objectContaining({ recordingKey: entry.recordingKey, state: 'failed' }));
  });

  it('draws the divider only when asked', async () => {
    const { ui } = renderRow({}, { showDivider: true, testID: 'row-with-divider' });
    await renderUi(ui);
    expect(screen.getByTestId('row-with-divider')).toBeOnTheScreen();
  });

  it('labels the rows in English', async () => {
    const { ui } = renderRow({ state: 'done', bytes: 4_404_019 });
    await renderUi(ui, { locale: 'en' });
    expect(screen.getByText('4.2 MB · Downloaded')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Delete recording FIXTURE recording' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarDownloadRow.tsx')).toEqual([]);
  });
});
