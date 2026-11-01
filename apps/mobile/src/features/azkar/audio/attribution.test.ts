import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { azkarAttribution } from './attribution';

describe('azkarAttribution', () => {
  it('uses the Arabic line in Arabic and the English line in English', () => {
    const recording = makeRecording({ attributionAr: 'سطر عربي تجريبي', attributionEn: 'FIXTURE english line' });
    expect(azkarAttribution(recording, 'ar').text).toBe('سطر عربي تجريبي');
    expect(azkarAttribution(recording, 'en').text).toBe('FIXTURE english line');
  });

  it('falls back to the English line in Arabic when the Arabic line is empty, and never translates it', () => {
    const recording = makeRecording({ attributionAr: null, attributionEn: 'FIXTURE english line' });
    expect(azkarAttribution(recording, 'ar').text).toBe('FIXTURE english line');
  });

  it('treats a blank Arabic line as empty', () => {
    const recording = makeRecording({ attributionAr: '   ', attributionEn: 'FIXTURE english line' });
    expect(azkarAttribution(recording, 'ar').text).toBe('FIXTURE english line');
  });

  it('falls back to the Arabic line in English when the English line is empty', () => {
    const recording = makeRecording({ attributionAr: 'سطر عربي تجريبي', attributionEn: '' });
    expect(azkarAttribution(recording, 'en').text).toBe('سطر عربي تجريبي');
  });

  it('is null when neither line is present', () => {
    const recording = makeRecording({ attributionAr: null, attributionEn: null });
    expect(azkarAttribution(recording, 'ar').text).toBeNull();
    expect(azkarAttribution(recording, 'en').text).toBeNull();
  });

  it('trims the line it returns', () => {
    const recording = makeRecording({ attributionEn: '  FIXTURE english line  ' });
    expect(azkarAttribution(recording, 'en').text).toBe('FIXTURE english line');
  });

  it('returns the licence name and URL, with a blank URL as none', () => {
    expect(azkarAttribution(makeRecording(), 'ar')).toEqual({
      text: 'سطر نسبة تجريبي — ليس ذكرًا',
      licence: 'FIXTURE licence',
      licenceUrl: 'https://fixture.invalid/licence',
    });
    expect(azkarAttribution(makeRecording({ licenceUrl: '  ' }), 'ar').licenceUrl).toBeNull();
    expect(azkarAttribution(makeRecording({ licenceUrl: null }), 'ar').licenceUrl).toBeNull();
  });
});
