import { readFileSync } from 'fs';
import { join } from 'path';

import { act, fireEvent, screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { MushafDownloadCard } from './MushafDownloadCard';

// Placeholder name and size only; the riwayah name comes from the test, not from the catalogue.
const base = {
  error: null,
  mushafName: 'نص تجريبي',
  onCancel: jest.fn(),
  onDownload: jest.fn(),
  onDownloadWithData: jest.fn(),
  onReadNow: jest.fn(),
  progress: 0,
  sizeBytes: 63_000_000,
  status: 'absent' as const,
};

function card(overrides: Partial<React.ComponentProps<typeof MushafDownloadCard>> = {}) {
  return <MushafDownloadCard {...base} {...overrides} />;
}

beforeEach(() => jest.clearAllMocks());

// Each press is awaited inside act: two bare presses in a row leave React's act scope open and break the next render.
async function press(name: string) {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
}

describe('MushafDownloadCard', () => {
  it('idle: shows the size and the download action, and reads now', async () => {
    await renderUi(card());
    expect(screen.getByText('تنزيل المصحف')).toBeTruthy();
    expect(screen.getByText('مصحف نص تجريبي · ٦٣ ميغابايت')).toBeTruthy();
    expect(screen.queryByLabelText('تقدم التنزيل')).toBeNull();
    await press('تنزيل');
    expect(base.onDownload).toHaveBeenCalledTimes(1);
    await press('القراءة الآن');
    expect(base.onReadNow).toHaveBeenCalledTimes(1);
  });

  it('omits the size when it is not known', async () => {
    await renderUi(card({ sizeBytes: null }));
    expect(screen.getByText('مصحف نص تجريبي')).toBeTruthy();
  });

  it('downloading: a progressbar with its value, and a cancel that calls onCancel', async () => {
    await renderUi(card({ progress: 0.42, status: 'downloading' }));
    const bar = screen.getByLabelText('تقدم التنزيل');
    expect(bar.props.accessibilityValue).toEqual({ max: 100, min: 0, now: 42 });
    expect(screen.getByText('٤٢٪')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'تنزيل' })).toBeNull();
    await press('إلغاء التنزيل');
    expect(base.onCancel).toHaveBeenCalledTimes(1);
  });

  it('verifying: the progress at the verifying value, and the cancel stays while it verifies', async () => {
    await renderUi(card({ progress: 0.95, status: 'verifying' }));
    expect(screen.getByLabelText('تقدم التنزيل').props.accessibilityValue.now).toBe(95);
    expect(screen.getByRole('button', { name: 'إلغاء التنزيل' })).toBeTruthy();
  });

  it('waiting for Wi-Fi: the note, and the mobile-data action', async () => {
    await renderUi(card({ status: 'waiting_wifi' }));
    expect(screen.getByText('التنزيل ينتظر شبكة Wi-Fi.')).toBeTruthy();
    await press('تنزيل بالبيانات');
    expect(base.onDownloadWithData).toHaveBeenCalledTimes(1);
  });

  it('failed: the error string, and retry', async () => {
    await renderUi(card({ error: 'checksum', status: 'failed' }));
    expect(screen.getByText('الملف تالف. أعد التنزيل.')).toBeTruthy();
    await press('إعادة المحاولة');
    expect(base.onDownload).toHaveBeenCalledTimes(1);
  });

  it('cancelled: back to the idle state with a download action', async () => {
    await renderUi(card({ status: 'cancelled' }));
    expect(screen.getByRole('button', { name: 'تنزيل' })).toBeTruthy();
    expect(screen.queryByLabelText('تقدم التنزيل')).toBeNull();
  });

  it('renders in English with the English copy', async () => {
    await renderUi(card({ mushafName: 'Test name' }), { locale: 'en' });
    expect(screen.getByText('Download the Mushaf')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Read now' })).toBeTruthy();
  });

  it('has no raw colour literal in its source', () => {
    const source = readFileSync(join(__dirname, 'MushafDownloadCard.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
