import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { PrayerBell } from './PrayerBell';

describe('PrayerBell', () => {
  beforeEach(() => {
    storage.remove(storageKeys.salah.bellFajr);
  });

  it('starts muted and unselected, labelled «تنبيه الفجر»', async () => {
    const view = await renderUi(<PrayerBell prayer="fajr" testID="bell" />);

    const bell = view.getByTestId('bell');
    expect(bell.props.accessibilityLabel).toBe('تنبيه الفجر');
    expect(bell.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('toggles on, persists to MMKV, and marks itself selected', async () => {
    const view = await renderUi(<PrayerBell prayer="fajr" testID="bell" />);

    await fireEvent.press(view.getByTestId('bell'));

    expect(storage.getBoolean(storageKeys.salah.bellFajr)).toBe(true);
    expect(view.getByTestId('bell').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('toggles back off', async () => {
    storage.set(storageKeys.salah.bellFajr, true);
    const view = await renderUi(<PrayerBell prayer="fajr" testID="bell" />);

    await fireEvent.press(view.getByTestId('bell'));

    expect(storage.getBoolean(storageKeys.salah.bellFajr)).toBe(false);
  });

  it('labels each prayer in English too', async () => {
    const view = await renderUi(<PrayerBell prayer="maghrib" testID="bell" />, { locale: 'en' });

    expect(view.getByTestId('bell').props.accessibilityLabel).toBe('Maghrib reminder');
  });
});
