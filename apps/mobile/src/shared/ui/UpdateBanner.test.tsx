import { fireEvent } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { UpdateBanner } from './UpdateBanner';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const mockReduceMotion = useReducedMotion as unknown as jest.Mock;

const arabic = {
  message: 'تحديث جديد جاهز',
  subtitle: 'أعد التشغيل لتطبيق التحسينات',
  update: 'تحديث',
  hint: 'يعيد تشغيل التطبيق، وسيتوقف التشغيل الصوتي إن كان يعمل.',
};
const english = {
  message: 'A new update is ready',
  subtitle: 'Restart to apply the improvements',
  update: 'Update',
  hint: 'Restarts the app; any playing audio stops.',
};

describe('UpdateBanner', () => {
  beforeEach(() => {
    mockReduceMotion.mockReturnValue(false);
  });

  it('shows the title and subtitle as one polite status line when visible', async () => {
    const view = await renderUi(<UpdateBanner onUpdate={() => undefined} visible />);

    const status = view.getByLabelText(`${arabic.message}. ${arabic.subtitle}`);
    expect(status.props.accessibilityRole).toBe('text');
    expect(status.props.accessibilityLiveRegion).toBe('polite');
    expect(view.getByText(arabic.message)).toBeOnTheScreen();
    expect(view.getByText(arabic.subtitle)).toBeOnTheScreen();
  });

  it('shows the update control with its label and the restart hint, and no dismiss control', async () => {
    const view = await renderUi(<UpdateBanner onUpdate={() => undefined} visible />);

    expect(view.getByRole('button', { name: arabic.update }).props.accessibilityHint).toBe(arabic.hint);
    expect(view.getAllByRole('button')).toHaveLength(1);
    expect(view.queryByTestId('update-banner-dismiss', { includeHiddenElements: true })).toBeNull();
  });

  it('calls onUpdate when the update button is pressed', async () => {
    const onUpdate = jest.fn();
    const view = await renderUi(<UpdateBanner onUpdate={onUpdate} visible />);

    fireEvent.press(view.getByRole('button', { name: arabic.update }));

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('passes the given testID through to the card and its update control', async () => {
    const view = await renderUi(<UpdateBanner onUpdate={() => undefined} testID="update-banner" visible />);

    expect(view.getByTestId('update-banner')).toBeOnTheScreen();
    expect(view.getByTestId('update-banner-update')).toBeOnTheScreen();
    expect(view.queryByTestId('update-banner-dismiss', { includeHiddenElements: true })).toBeNull();
  });

  it('draws nothing once it is hidden under Reduce Motion', async () => {
    mockReduceMotion.mockReturnValue(true);
    const view = await renderUi(<UpdateBanner onUpdate={() => undefined} visible={false} />);

    expect(view.queryByTestId('update-banner', { includeHiddenElements: true })).toBeNull();
    expect(view.queryByLabelText(arabic.message)).toBeNull();
  });

  it.each(locales)('shows its message and update control under %s', async (locale) => {
    const copy = locale === 'ar' ? arabic : english;
    const view = await renderUi(<UpdateBanner onUpdate={() => undefined} visible />, { locale });

    expect(view.getByLabelText(`${copy.message}. ${copy.subtitle}`)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: copy.update })).toBeOnTheScreen();
  });

  it('uses theme tokens only', () => {
    expect(rawColorLiterals('UpdateBanner.tsx')).toEqual([]);
  });
});
