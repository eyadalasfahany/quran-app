import { act } from '@testing-library/react-native';
import { Text } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { renderUi } from '../../../../jest/render-ui';
import { setPrayerSoundValue } from '../data/adhan-sounds';

import { usePrayerSound } from './usePrayerSound';

function Probe() {
  return <Text testID="sound">{usePrayerSound()}</Text>;
}

describe('usePrayerSound', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('reads the default voice when nothing is stored', async () => {
    const view = await renderUi(<Probe />);

    expect(view.getByTestId('sound')).toHaveTextContent('allahu_akbar_short');
  });

  it('follows a change to the stored sound without a remount', async () => {
    const view = await renderUi(<Probe />);

    await act(async () => {
      setPrayerSoundValue('madinah');
    });

    expect(view.getByTestId('sound')).toHaveTextContent('madinah');
  });

  it('ignores writes to other keys', async () => {
    const view = await renderUi(<Probe />);

    await act(async () => {
      storage.set(storageKeys.salah.locationSource, 'manual');
    });

    expect(view.getByTestId('sound')).toHaveTextContent('allahu_akbar_short');
  });
});
