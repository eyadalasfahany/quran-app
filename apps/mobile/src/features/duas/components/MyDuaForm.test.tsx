import { act, fireEvent, screen } from '@testing-library/react-native';

import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { MyDuaForm } from './MyDuaForm';

jest.mock('./MyDuaReminderRow', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    MyDuaReminderRow: () => <Text testID="my-dua-reminder-row">reminder</Text>,
  };
});

describe('MyDuaForm', () => {
  it('disables save when the body is empty', async () => {
    await renderUi(
      <MyDuaForm
        body=""
        canDelete={false}
        duaId={null}
        onBodyChange={jest.fn()}
        onDelete={jest.fn()}
        onSave={jest.fn()}
        onTitleChange={jest.fn()}
        title=""
      />,
    );

    expect(screen.getByTestId('my-dua-form-save')).toBeDisabled();
  });

  it('calls onSave when the body is filled', async () => {
    const onSave = jest.fn();
    await renderUi(
      <MyDuaForm
        body="FIXTURE text 1 — not a dua"
        canDelete
        duaId="dua-1"
        onBodyChange={jest.fn()}
        onDelete={jest.fn()}
        onSave={onSave}
        onTitleChange={jest.fn()}
        title=""
      />,
    );

    expect(screen.getByTestId('my-dua-reminder-row')).toBeOnTheScreen();
    await act(() => {
      fireEvent.press(screen.getByTestId('my-dua-form-save'));
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('uses i18n only', () => {
    expect(featureComponentLiterals('features/duas/components/MyDuaForm.tsx')).toEqual([]);
  });
});
