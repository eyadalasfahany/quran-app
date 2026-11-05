import { fireEvent, screen } from '@testing-library/react-native';

import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { MyDuaForm } from './MyDuaForm';

jest.mock('./MyDuaReminderRow', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    MyDuaReminderRow: ({ initiallyExpanded }: { initiallyExpanded?: boolean }) => (
      <Text testID="my-dua-reminder-row">{initiallyExpanded ? 'expanded' : 'collapsed'}</Text>
    ),
  };
});

const FIXTURE_BODY = 'FIXTURE text 1 — not a dua';

describe('MyDuaForm', () => {
  it('shows the title and body fields and the device-only note', async () => {
    await renderUi(
      <MyDuaForm body="" duaId={null} onBodyChange={jest.fn()} onTitleChange={jest.fn()} title="" />,
    );

    expect(screen.getByLabelText('العنوان (اختياري)')).toBeOnTheScreen();
    expect(screen.getByLabelText('نص الدعاء')).toBeOnTheScreen();
    expect(screen.getByTestId('my-dua-form-device-only')).toHaveTextContent('يُحفظ على جهازك فقط.');
  });

  it('reports body changes byte-for-byte', async () => {
    const onBodyChange = jest.fn();
    await renderUi(<MyDuaForm body="" duaId={null} onBodyChange={onBodyChange} onTitleChange={jest.fn()} title="" />);

    fireEvent.changeText(screen.getByTestId('my-dua-form-body-input'), FIXTURE_BODY);
    expect(onBodyChange).toHaveBeenCalledWith(FIXTURE_BODY);
  });

  it('hides the reminder row until the dua exists', async () => {
    await renderUi(<MyDuaForm body={FIXTURE_BODY} duaId={null} onBodyChange={jest.fn()} onTitleChange={jest.fn()} title="" />);
    expect(screen.queryByTestId('my-dua-reminder-row')).toBeNull();
  });

  it('shows the reminder row collapsed for a saved dua', async () => {
    await renderUi(<MyDuaForm body={FIXTURE_BODY} duaId="dua-1" onBodyChange={jest.fn()} onTitleChange={jest.fn()} title="" />);
    expect(screen.getByTestId('my-dua-reminder-row')).toHaveTextContent('collapsed');
  });

  it('opens the reminder row expanded when reminderOpen is set', async () => {
    await renderUi(
      <MyDuaForm body={FIXTURE_BODY} duaId="dua-1" onBodyChange={jest.fn()} onTitleChange={jest.fn()} reminderOpen title="" />,
    );
    expect(screen.getByTestId('my-dua-reminder-row')).toHaveTextContent('expanded');
  });

  it('leaves the save and delete actions to MyDuaFormActions', async () => {
    await renderUi(<MyDuaForm body={FIXTURE_BODY} duaId="dua-1" onBodyChange={jest.fn()} onTitleChange={jest.fn()} title="" />);
    expect(screen.queryByTestId('my-dua-form-save')).toBeNull();
    expect(screen.queryByTestId('my-dua-form-delete')).toBeNull();
  });

  it('uses i18n only', () => {
    expect(featureComponentLiterals('features/duas/components/MyDuaForm.tsx')).toEqual([]);
  });
});
