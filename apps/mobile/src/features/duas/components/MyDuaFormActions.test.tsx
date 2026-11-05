import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';
import { MyDuaFormActions } from './MyDuaFormActions';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 34, left: 0, right: 0, top: 0 }) };
});

describe('MyDuaFormActions', () => {
  it('disables save when the body is empty', async () => {
    await renderUi(<MyDuaFormActions canDelete={false} onDelete={jest.fn()} onSave={jest.fn()} saveDisabled />);
    expect(screen.getByTestId('my-dua-form-save')).toBeDisabled();
  });

  it('calls onSave when enabled and pressed', async () => {
    const onSave = jest.fn();
    await renderUi(<MyDuaFormActions canDelete={false} onDelete={jest.fn()} onSave={onSave} saveDisabled={false} />);
    await press(screen.getByTestId('my-dua-form-save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('keeps clear of the home indicator', async () => {
    await renderUi(<MyDuaFormActions canDelete={false} onDelete={jest.fn()} onSave={jest.fn()} saveDisabled={false} />);
    const padding = StyleSheet.flatten(screen.getByTestId('my-dua-form-actions').props.style).paddingBottom;
    expect(padding).toBeGreaterThanOrEqual(34);
  });

  it('shows no delete button for a dua that is not saved yet', async () => {
    await renderUi(<MyDuaFormActions canDelete={false} onDelete={jest.fn()} onSave={jest.fn()} saveDisabled={false} />);
    expect(screen.queryByTestId('my-dua-form-delete')).toBeNull();
  });

  it('draws delete as plain red text, with no border', async () => {
    await renderUi(<MyDuaFormActions canDelete onDelete={jest.fn()} onSave={jest.fn()} saveDisabled={false} />);
    const label = StyleSheet.flatten(screen.getByText('حذف الدعاء').props.style);
    expect(label.color).toBe(themes.light.colors.danger);
    expect(StyleSheet.flatten(screen.getByTestId('my-dua-form-delete').props.style).borderColor).toBe('transparent');
  });

  it('asks before deleting, and deletes only when confirmed', async () => {
    const onDelete = jest.fn();
    await renderUi(<MyDuaFormActions canDelete onDelete={onDelete} onSave={jest.fn()} saveDisabled={false} />);

    await press(screen.getByTestId('my-dua-form-delete'));
    expect(onDelete).not.toHaveBeenCalled();
    await press(screen.getByRole('button', { name: 'حذف' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('keeps the dua when the delete is cancelled', async () => {
    const onDelete = jest.fn();
    await renderUi(<MyDuaFormActions canDelete onDelete={onDelete} onSave={jest.fn()} saveDisabled={false} />);

    await press(screen.getByTestId('my-dua-form-delete'));
    fireEvent.press(screen.getByRole('button', { name: 'إلغاء' }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('uses i18n only', () => {
    expect(featureComponentLiterals('features/duas/components/MyDuaFormActions.tsx')).toEqual([]);
  });
});
