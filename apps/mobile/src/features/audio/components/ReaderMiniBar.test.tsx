import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { ReaderMiniBar } from './ReaderMiniBar';

// The switch-in spring runs on mount and outlives a test; these tests check structure, so the styles are static.
jest.mock('../hooks/useMiniEnter', () => ({ useMiniEnter: () => ({ container: {}, content: {} }) }));

// Let each test's pending frames and callbacks settle before the next test renders.
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
});

function bar(props: Partial<Parameters<typeof ReaderMiniBar>[0]> = {}) {
  const handlers = { onCollapse: jest.fn(), onOpen: jest.fn(), onToggle: jest.fn() };
  const element = (
    <GestureHandlerRootView>
      <ReaderMiniBar
        fraction={0.25}
        idle={false}
        playing
        reciterName="مشاري راشد العفاسي"
        subtitle="الفاتحة · الآية ٣"
        {...handlers}
        {...props}
      />
    </GestureHandlerRootView>
  );
  return { element, handlers };
}

describe('ReaderMiniBar', () => {
  it('draws the 68 pt glass bar at the frame padding', async () => {
    const { element } = bar();
    const view = await renderUi(element);

    expect(flatStyle(view.getByTestId('mini-player-reader').props.style)).toMatchObject({
      minHeight: 68,
      paddingEnd: 10,
      paddingStart: 12,
    });
  });

  it('grows by the 18 pt notice line and draws the line under the subtitle (ADR 0062)', async () => {
    const { element } = bar({ notice: 'تخطّي الصافات · غير متوفرة بصوت إسلام صبحي' });
    const view = await renderUi(element);

    expect(flatStyle(view.getByTestId('mini-player-reader').props.style)).toMatchObject({ minHeight: 86 });
    expect(view.getByTestId('mini-player-notice')).toBeOnTheScreen();
    expect(view.getByRole('status').props.children).toBe('تخطّي الصافات · غير متوفرة بصوت إسلام صبحي');
  });

  it('draws no notice line when none is given', async () => {
    const view = await renderUi(bar().element);

    expect(view.queryByTestId('mini-player-notice')).toBeNull();
  });

  it('shows the gold progress line while playing', async () => {
    const view = await renderUi(bar().element);

    expect(view.getByTestId('mini-player-progress', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('shows no progress line while idle', async () => {
    const view = await renderUi(bar({ idle: true, playing: false }).element);

    expect(view.queryByTestId('mini-player-progress', { includeHiddenElements: true })).toBeNull();
  });

  it('shows the play glyph while idle', async () => {
    const view = await renderUi(bar({ idle: true, playing: false }).element, { locale: 'en' });

    expect(view.getByRole('button', { name: 'Play' })).toBeOnTheScreen();
  });

  it.each(locales)('keeps the play triangle on the toggle unflipped in %s', async (locale) => {
    const view = await renderUi(bar({ idle: true, playing: false }).element, { locale });

    expect(flatStyle(view.getByTestId('mini-player-toggle-icon', { includeHiddenElements: true }).props.style).transform).toBeUndefined();
  });

  it('shows the pause label while playing', async () => {
    const view = await renderUi(bar().element, { locale: 'en' });

    expect(view.getByRole('button', { name: 'Pause' })).toBeOnTheScreen();
  });

  it.each(locales)('names the row with its hint in %s', async (locale) => {
    const view = await renderUi(bar().element, { locale });
    const row = view.getByTestId('mini-player-open');

    expect(row.props.accessibilityHint).toBe(locale === 'ar' ? 'يفتح المشغّل' : 'Opens the player');
  });

  it('gives the row only the collapse action (the capsule expands)', async () => {
    const view = await renderUi(bar().element, { locale: 'en' });

    expect(view.getByTestId('mini-player-open').props.accessibilityActions).toEqual([
      { label: 'Minimize player', name: 'collapse' },
    ]);
  });

  it('keeps the chevron decorative in the top centre', async () => {
    const view = await renderUi(bar().element);

    expect(view.getByTestId('mini-player-chevron', { includeHiddenElements: true }).props.pointerEvents).toBe('none');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/ReaderMiniBar.tsx')).toEqual([]);
  });

  it('opens the player from the row', async () => {
    const { element, handlers } = bar();
    const view = await renderUi(element);

    fireEvent.press(view.getByRole('button', { name: 'مشاري راشد العفاسي، الفاتحة · الآية ٣' }));
    expect(handlers.onOpen).toHaveBeenCalledTimes(1);
  });

  // Last: the collapse runs a spring whose callback outlives the test, so it cannot run before the others.
  it('collapses from the collapse action', async () => {
    const { element, handlers } = bar();
    const view = await renderUi(element, { locale: 'en' });

    fireEvent(view.getByTestId('mini-player-open'), 'accessibilityAction', { nativeEvent: { actionName: 'collapse' } });
    await waitFor(() => expect(handlers.onCollapse).toHaveBeenCalledTimes(1));
  });
});
