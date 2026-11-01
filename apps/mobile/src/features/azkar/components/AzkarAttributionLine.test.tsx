import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { AzkarAttributionLine } from './AzkarAttributionLine';

describe('AzkarAttributionLine', () => {
  it('shows the Arabic attribution and the licence in Arabic', async () => {
    await renderUi(<AzkarAttributionLine recording={makeRecording()} />);
    expect(screen.getByText('سطر نسبة تجريبي — ليس ذكرًا')).toBeOnTheScreen();
    expect(screen.getByText('الترخيص: FIXTURE licence')).toBeOnTheScreen();
  });

  it('shows the English attribution and the licence in English', async () => {
    await renderUi(<AzkarAttributionLine recording={makeRecording()} />, { locale: 'en' });
    expect(screen.getByText('FIXTURE attribution line')).toBeOnTheScreen();
    expect(screen.getByText('Licence: FIXTURE licence')).toBeOnTheScreen();
  });

  it('falls back to the English attribution when the Arabic one is empty, and never translates it', async () => {
    await renderUi(<AzkarAttributionLine recording={makeRecording({ attributionAr: null })} />);
    expect(screen.getByText('FIXTURE attribution line')).toBeOnTheScreen();
  });

  it('falls back to the Arabic attribution in English when the English one is blank', async () => {
    await renderUi(<AzkarAttributionLine recording={makeRecording({ attributionEn: '   ' })} />, { locale: 'en' });
    expect(screen.getByText('سطر نسبة تجريبي — ليس ذكرًا')).toBeOnTheScreen();
  });

  it('draws no attribution text when neither language has one, but keeps the licence', async () => {
    await renderUi(<AzkarAttributionLine recording={makeRecording({ attributionAr: null, attributionEn: null })} />);
    expect(screen.queryByTestId('azkar-attribution-text')).toBeNull();
    expect(screen.getByText('الترخيص: FIXTURE licence')).toBeOnTheScreen();
  });

  it('opens the licence URL from a link with the licence as its label', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderUi(<AzkarAttributionLine recording={makeRecording()} />);
    fireEvent.press(screen.getByRole('link', { name: 'الترخيص: FIXTURE licence' }));
    expect(openURL).toHaveBeenCalledWith('https://fixture.invalid/licence');
    openURL.mockRestore();
  });

  it('draws the licence as plain text when there is no licence URL', async () => {
    await renderUi(<AzkarAttributionLine recording={makeRecording({ licenceUrl: null })} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('الترخيص: FIXTURE licence')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarAttributionLine.tsx')).toEqual([]);
  });
});
