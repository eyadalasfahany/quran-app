import { screen } from '@testing-library/react-native';

import { makeDownloadEntry, makeFakeDownloadPort, makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { AzkarDownloadButton } from './AzkarDownloadButton';

const DOWNLOADABLE = makeRecording({ downloadAllowed: true, recordingKey: 'fixture:recording-001' });

describe('AzkarDownloadButton', () => {
  it('renders nothing without a recording', async () => {
    await renderUi(<AzkarDownloadButton recording={null} />);
    expect(screen.queryByTestId('azkar-download-button')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders nothing when downloading is not allowed, so no disabled button is drawn', async () => {
    await renderUi(<AzkarDownloadButton recording={makeRecording({ downloadAllowed: false })} />);
    expect(screen.queryByTestId('azkar-download-button')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders nothing when the rights are not verified, even if downloading is allowed', async () => {
    await renderUi(<AzkarDownloadButton recording={makeRecording({ downloadAllowed: true, rightsVerifiedAt: null })} />);
    expect(screen.queryByTestId('azkar-download-button')).toBeNull();
  });

  it('is idle until queued, and queues the recording on press', async () => {
    const port = makeFakeDownloadPort();
    const enqueue = jest.spyOn(port, 'enqueue');
    await renderUi(<AzkarDownloadButton port={port} recording={DOWNLOADABLE} />);

    await press(screen.getByRole('button', { name: 'تنزيل التسجيل' }));
    expect(enqueue).toHaveBeenCalledWith(DOWNLOADABLE);
    expect(screen.getByRole('button', { name: 'إلغاء التنزيل' })).toBeOnTheScreen();
  });

  it('shows the progress as a hint while downloading, and cancels on press', async () => {
    const port = makeFakeDownloadPort([makeDownloadEntry({ recordingKey: 'fixture:recording-001', state: 'downloading', progress: 0.6, bytes: null })]);
    await renderUi(<AzkarDownloadButton port={port} recording={DOWNLOADABLE} />);

    const cancel = screen.getByRole('button', { name: 'إلغاء التنزيل' });
    expect(cancel.props.accessibilityHint).toBe('جارٍ التنزيل · ٦٠٪');

    await press(cancel);
    expect(port.entries).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'تنزيل التسجيل' })).toBeOnTheScreen();
  });

  it('offers removal once done', async () => {
    const port = makeFakeDownloadPort([makeDownloadEntry({ recordingKey: 'fixture:recording-001', state: 'done' })]);
    await renderUi(<AzkarDownloadButton port={port} recording={DOWNLOADABLE} />);

    await press(screen.getByRole('button', { name: 'حذف التسجيل' }));
    expect(port.entries).toHaveLength(0);
  });

  it('retries a failed download', async () => {
    const port = makeFakeDownloadPort([makeDownloadEntry({ recordingKey: 'fixture:recording-001', state: 'failed', progress: 0, bytes: null })]);
    const enqueue = jest.spyOn(port, 'enqueue');
    await renderUi(<AzkarDownloadButton port={port} recording={DOWNLOADABLE} />);

    await press(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(enqueue).toHaveBeenCalledWith(DOWNLOADABLE);
    expect(port.entries[0]?.state).toBe('downloading');
  });

  it('labels the states in English', async () => {
    await renderUi(<AzkarDownloadButton recording={DOWNLOADABLE} />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Download recording' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarDownloadButton.tsx')).toEqual([]);
  });
});
