import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { ExactAlarmDialog } from './ExactAlarmDialog';

const TITLE_AR = 'اجعل الأذان في وقته';
const BODY_AR = 'اسمح لطيبة بضبط المنبّهات حتى يصل تنبيه الصلاة في وقته تمامًا.';

describe('ExactAlarmDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the title, body and both actions when visible', async () => {
    const view = await renderUi(<ExactAlarmDialog onClose={jest.fn()} onConfirm={jest.fn()} visible />);

    expect(view.getByText(TITLE_AR)).toBeOnTheScreen();
    expect(view.getByText(BODY_AR)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'فتح الإعدادات' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'إلغاء' })).toBeOnTheScreen();
  });

  it('draws the alarm badge for both platforms', async () => {
    const view = await renderUi(<ExactAlarmDialog onClose={jest.fn()} onConfirm={jest.fn()} visible />);

    expect(view.getByTestId('exact-alarm-dialog-icon-glyph', { includeHiddenElements: true }).props.children.props.name).toEqual({
      ios: 'bell.badge',
      android: 'alarm',
    });
  });

  it('calls onConfirm when the Settings action is pressed', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const view = await renderUi(<ExactAlarmDialog onClose={onClose} onConfirm={onConfirm} visible />);

    fireEvent.press(view.getByRole('button', { name: 'فتح الإعدادات' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose without confirming when cancelled', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const view = await renderUi(<ExactAlarmDialog onClose={onClose} onConfirm={onConfirm} visible />);

    fireEvent.press(view.getByRole('button', { name: 'إلغاء' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders no dialog while closed', async () => {
    const view = await renderUi(<ExactAlarmDialog onClose={jest.fn()} onConfirm={jest.fn()} visible={false} />);

    expect(view.queryByText(TITLE_AR)).toBeNull();
  });

  it.each([
    ['ar', TITLE_AR, 'فتح الإعدادات'],
    ['en', 'Keep the adhan on time', 'Open Settings'],
  ] as const)('renders the copy in %s, with the dialog test id', async (locale, title, action) => {
    const view = await renderUi(<ExactAlarmDialog onClose={jest.fn()} onConfirm={jest.fn()} visible />, { locale });

    expect(view.getByTestId('exact-alarm-dialog')).toBeOnTheScreen();
    expect(view.getByText(title)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: action })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/salah/components/ExactAlarmDialog.tsx')).toEqual([]);
  });
});
