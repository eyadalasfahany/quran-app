import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import type { MyDua } from '../data/my-duas-repository';
import { MyDuaRow } from './MyDuaRow';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/features/azkar/reminders/hooks', () => ({
  useAzkarReminder: jest.fn(() => null),
}));

const dua: MyDua = {
  id: 'dua-1',
  title: 'FIXTURE title 1 — not a dua',
  body: 'FIXTURE text 1 — not a dua',
  textSearch: 'fixture',
  createdAt: 1,
  updatedAt: 1,
};

describe('MyDuaRow', () => {
  it('shows the preview, caption and reminder button', async () => {
    const onBell = jest.fn();
    await renderUi(<MyDuaRow dua={dua} index={0} onBellPress={onBell} />);

    expect(screen.getByText('FIXTURE title 1 — not a dua')).toBeOnTheScreen();
    expect(screen.getByText('من كتابتك')).toBeOnTheScreen();
    await press(screen.getByTestId('my-dua-row-bell'));
    expect(onBell).toHaveBeenCalledTimes(1);
  });

  it('renders in English', async () => {
    await renderUi(<MyDuaRow dua={dua} index={0} onBellPress={jest.fn()} />, { locale: 'en' });
    expect(screen.getByText('Written by you')).toBeOnTheScreen();
  });

  it('uses i18n only', () => {
    expect(featureComponentLiterals('features/duas/components/MyDuaRow.tsx')).toEqual([]);
  });
});
