import { fireEvent } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { ReaderMiniUnavailable } from './ReaderMiniUnavailable';

// Placeholder surah and reciter names only; the notice's copy comes from the locale files.
const MESSAGE = 'سورة نموذج غير متوفرة بصوت قارئ نموذج';

function notice(props: Partial<Parameters<typeof ReaderMiniUnavailable>[0]> = {}) {
  const handlers = { onChangeReciter: jest.fn(), onCollapse: jest.fn() };
  const element = (
    <GestureHandlerRootView>
      <ReaderMiniUnavailable message={MESSAGE} {...handlers} {...props} />
    </GestureHandlerRootView>
  );
  return { element, handlers };
}

describe('ReaderMiniUnavailable', () => {
  it('renders the message and the change-reciter button', async () => {
    const { element } = notice();
    const view = await renderUi(element);

    expect(view.getByText(MESSAGE)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تغيير القارئ' })).toBeOnTheScreen();
  });

  it('draws the glass container at the frame padding: 24 on top, 12 elsewhere', async () => {
    const { element } = notice();
    const view = await renderUi(element);

    expect(flatStyle(view.getByTestId('mini-player-reader-unavailable').props.style)).toMatchObject({
      gap: 10,
      paddingBottom: 12,
      paddingEnd: 12,
      paddingStart: 12,
      paddingTop: 24,
    });
  });

  it('shows the info glyph in a 46 pt tile', async () => {
    const { element } = notice();
    const view = await renderUi(element);

    expect(flatStyle(view.getByTestId('mini-player-unavailable-tile', { includeHiddenElements: true }).props.style)).toMatchObject({
      borderRadius: 12,
      height: 46,
      width: 46,
    });
    expect(view.getByTestId('mini-player-unavailable-icon', { includeHiddenElements: true })).toBeTruthy();
  });

  it('has no play button and no progress line: the notice is the whole bar', async () => {
    const { element } = notice();
    const view = await renderUi(element);

    expect(view.queryByTestId('mini-player-toggle', { includeHiddenElements: true })).toBeNull();
    expect(view.queryByTestId('mini-player-progress', { includeHiddenElements: true })).toBeNull();
    expect(view.queryByRole('button', { name: 'تشغيل' })).toBeNull();
  });

  it('gives the message role status and a polite live region', async () => {
    const { element } = notice();
    const view = await renderUi(element);
    const status = view.getByRole('status');

    expect(status.props.children).toBe(MESSAGE);
    expect(status.props.accessibilityLiveRegion).toBe('polite');
  });

  it('gives the change-reciter button role button, its label, and a 44 pt minimum height', async () => {
    const { element } = notice();
    const view = await renderUi(element);
    const button = view.getByRole('button', { name: 'تغيير القارئ' });

    expect(button.props.accessibilityLabel).toBe('تغيير القارئ');
    expect(flatStyle(button.props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('calls onChangeReciter when the button is pressed', async () => {
    const { element, handlers } = notice();
    const view = await renderUi(element);

    fireEvent.press(view.getByRole('button', { name: 'تغيير القارئ' }));

    expect(handlers.onChangeReciter).toHaveBeenCalledTimes(1);
    expect(handlers.onCollapse).not.toHaveBeenCalled();
  });

  it('collapses when the chevron row is tapped', async () => {
    const { element, handlers } = notice();
    const view = await renderUi(element, { locale: 'en' });

    fireEvent.press(view.getByRole('button', { name: 'Minimize player' }));

    expect(handlers.onCollapse).toHaveBeenCalledTimes(1);
    expect(handlers.onChangeReciter).not.toHaveBeenCalled();
  });

  it('offers the collapse as an accessibility action', async () => {
    const { element, handlers } = notice();
    const view = await renderUi(element, { locale: 'en' });
    const row = view.getByRole('button', { name: 'Minimize player' });

    expect(row.props.accessibilityActions).toEqual([{ label: 'Minimize player', name: 'collapse' }]);
    fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'collapse' } });
    expect(handlers.onCollapse).toHaveBeenCalledTimes(1);
  });

  it('keeps the chevron row at 44 pt with its slop', async () => {
    const { element } = notice();
    const view = await renderUi(element, { locale: 'en' });
    const row = view.getByRole('button', { name: 'Minimize player' });

    expect(flatStyle(row.props.style).height).toBe(24);
    expect(row.props.hitSlop).toEqual({ bottom: 10, top: 10 });
  });

  it.each(locales)('renders the notice and the button in %s', async (locale) => {
    const { element } = notice();
    const view = await renderUi(element, { locale });

    expect(view.getByText(MESSAGE)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: locale === 'ar' ? 'تغيير القارئ' : 'Change reciter' })).toBeOnTheScreen();
  });

  it('uses the English change-reciter label in English', async () => {
    const { element } = notice();
    const view = await renderUi(element, { locale: 'en' });

    expect(view.getByRole('button', { name: 'Change reciter' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/ReaderMiniUnavailable.tsx')).toEqual([]);
  });
});
