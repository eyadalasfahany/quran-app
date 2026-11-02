import { screen } from '@testing-library/react-native';

import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { makeItem, makeUnit, textSegment, press, fire } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { initialAzkarPlayerState, useAzkarPlayerStore } from '../audio/azkarPlayerStore';
import { pauseAzkarPlayback, resumeAzkarPlayback, seekAzkarPlayback, setAzkarRepeatMode, setAzkarSpeed, skipAzkarPlayback } from '../audio/playback';
import { buildAzkarQueue } from '../audio/queue';
import { chooseAzkarSleep } from '../audio/sleep-timer';

import { AzkarPlayerBody } from './AzkarPlayerBody';

jest.mock('../audio/playback', () => ({
  pauseAzkarPlayback: jest.fn(),
  resumeAzkarPlayback: jest.fn(),
  seekAzkarPlayback: jest.fn(),
  setAzkarRepeatMode: jest.fn(),
  setAzkarSpeed: jest.fn(),
  skipAzkarPlayback: jest.fn(),
}));

jest.mock('../audio/sleep-timer', () => ({
  chooseAzkarSleep: jest.fn(),
  azkarSleepRemainingMinutes: jest.fn(() => 15),
}));

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({ executor: {} }),
}));

jest.mock('../data/quran-segments', () => ({
  quranSegmentKey: () => '',
  resolveQuranVerses: () => new Map(),
}));

const unit = makeUnit({
  unitKey: 'entry-1:u',
  requiredCount: 3,
  body: [makeItem({ id: 1, requiredCount: 3, segments: [textSegment('FIXTURE text 1 — not a dhikr')] })],
});

function loadScope(overrides: Partial<ReturnType<typeof useAzkarPlayerStore.getState>> = {}, queueLength = 2) {
  const queue = buildAzkarQueue(
    Array.from({ length: queueLength }, (_, i) => ({ ...unit, unitKey: `entry-${i + 1}:u`, entryKey: `entry-${i + 1}` })),
    (candidate) => makeRecording({ recordingKey: candidate.unitKey }),
  );
  useAzkarPlayerStore.setState({
    ...initialAzkarPlayerState,
    scope: { scopeKey: 'category:fixture', periodKey: 'session', title: 'FIXTURE category' },
    queue,
    index: 0,
    status: 'playing',
    positionMs: 10_000,
    durationMs: 65_000,
    playsDone: 1,
    countAtStart: 0,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  useAzkarPlayerStore.setState(initialAzkarPlayerState);
});

describe('AzkarPlayerBody', () => {
  it('draws nothing when no scope is playing', async () => {
    await renderUi(<AzkarPlayerBody />);
    expect(screen.queryByTestId('azkar-player-body')).toBeNull();
  });

  it('shows the scope title, the queue position, the dhikr, and the repetition', async () => {
    loadScope();
    await renderUi(<AzkarPlayerBody />);
    expect(screen.getByText('FIXTURE category')).toBeTruthy();
    expect(screen.getByText('الذكر ١ من ٢')).toBeTruthy();
    expect(screen.getByText('FIXTURE text 1 — not a dhikr')).toBeTruthy();
    // One repetition has ended, so the next is the second of three.
    expect(screen.getByText('٢ من ٣')).toBeTruthy();
  });

  it('labels the control pause while playing, and resumes when paused', async () => {
    loadScope({ status: 'playing' });
    await renderUi(<AzkarPlayerBody />);
    await press(screen.getByRole('button', { name: 'إيقاف التسجيل مؤقتًا' }));
    expect(pauseAzkarPlayback).toHaveBeenCalledTimes(1);
  });

  it('resumes from a pause', async () => {
    loadScope({ status: 'paused' });
    await renderUi(<AzkarPlayerBody />);
    await press(screen.getByRole('button', { name: 'تشغيل التسجيل' }));
    expect(resumeAzkarPlayback).toHaveBeenCalledTimes(1);
  });

  it('moves to the previous and next dhikr through the engine', async () => {
    loadScope();
    await renderUi(<AzkarPlayerBody />);
    await press(screen.getByRole('button', { name: 'الذكر السابق' }));
    await press(screen.getByRole('button', { name: 'الذكر التالي' }));
    expect(skipAzkarPlayback).toHaveBeenNthCalledWith(1, -1);
    expect(skipAzkarPlayback).toHaveBeenNthCalledWith(2, 1);
  });

  it('disables next on the last dhikr', async () => {
    loadScope({ index: 1 });
    await renderUi(<AzkarPlayerBody />);
    expect(screen.getByRole('button', { name: 'الذكر التالي' }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('seeks through the progress control', async () => {
    loadScope();
    await renderUi(<AzkarPlayerBody />);
    await fire(screen.getByRole('adjustable', { name: 'موضع التشغيل' }), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(seekAzkarPlayback).toHaveBeenCalledWith(20_000);
  });

  it('opens the repeat choices, and applies the one chosen', async () => {
    loadScope();
    await renderUi(<AzkarPlayerBody />);
    await press(screen.getByRole('button', { name: 'التكرار' }));
    await press(screen.getByRole('radio', { name: 'مرة واحدة' }));
    expect(setAzkarRepeatMode).toHaveBeenCalledWith('once');
    expect(screen.queryByTestId('azkar-player-body-repeat-choices')).toBeNull();
  });

  it('opens the speed choices, and applies the rate chosen', async () => {
    loadScope();
    await renderUi(<AzkarPlayerBody />);
    await press(screen.getByRole('button', { name: 'السرعة ١×' }));
    await press(screen.getByTestId('azkar-player-body-speed-choices-1.5'));
    expect(setAzkarSpeed).toHaveBeenCalledWith(1.5);
  });

  it('opens the sleep choices, and arms the one chosen', async () => {
    loadScope();
    await renderUi(<AzkarPlayerBody />);
    await press(screen.getByRole('button', { name: 'مؤقت النوم' }));
    await press(screen.getByRole('radio', { name: 'نهاية الذكر' }));
    expect(chooseAzkarSleep).toHaveBeenCalledWith('endOfUnit');
  });

  it('shows the attribution line with its licence link, and the download control only when allowed', async () => {
    loadScope();
    await renderUi(<AzkarPlayerBody />);
    expect(screen.getByTestId('azkar-player-body-attribution')).toBeTruthy();
    expect(screen.queryByTestId('azkar-download-button')).toBeNull();
  });

  it('shows the offline message when the playback stopped offline', async () => {
    loadScope({ status: 'error', error: 'offline' });
    await renderUi(<AzkarPlayerBody />);
    expect(screen.getByTestId('azkar-player-body-error').props.children).toBe('غير متاح دون اتصال');
  });

  it('shows the load failure message, not a red box', async () => {
    loadScope({ status: 'error', error: 'load-failed' });
    await renderUi(<AzkarPlayerBody />);
    expect(screen.getByTestId('azkar-player-body-error').props.children).toBe('تعذّر تشغيل الملف الصوتي. حاول مرة أخرى.');
  });

  it('shows the finished message when the scope has ended', async () => {
    loadScope({ status: 'finished' });
    await renderUi(<AzkarPlayerBody />);
    expect(screen.getByText('انتهت التسجيلات في هذا القسم')).toBeTruthy();
  });
});
