import { screen } from '@testing-library/react-native';

import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { MyDuaReminderRow } from './MyDuaReminderRow';

jest.mock('@/features/azkar/components/AzkarReminderRow', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AzkarReminderRow: ({ targetType, targetKey }: { targetType: string; targetKey: string }) => (
      <Text testID="azkar-reminder-row">{`${targetType}:${targetKey}`}</Text>
    ),
  };
});

describe('MyDuaReminderRow', () => {
  it('targets my_dua', async () => {
    await renderUi(<MyDuaReminderRow duaId="dua-1" />);
    expect(screen.getByText('my_dua:dua-1')).toBeOnTheScreen();
  });

  it('uses i18n only', () => {
    expect(featureComponentLiterals('features/duas/components/MyDuaReminderRow.tsx')).toEqual([]);
  });
});
