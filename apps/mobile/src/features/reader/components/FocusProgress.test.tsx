import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { focusDotCount, FocusProgress } from './FocusProgress';

const hidden = { includeHiddenElements: true } as const;

describe('FocusProgress', () => {
  it('marks the current ayah of a short surah', async () => {
    expect(focusDotCount(7, 5)).toEqual({ activeIndex: 4, count: 7, start: 1 });

    const view = await renderUi(<FocusProgress verseNumber={5} versesCount={7} />);
    expect(flatStyle(view.getByTestId('focus-progress-active', hidden).props.style)).toMatchObject({
      backgroundColor: themes.light.colors.brand,
      height: 18,
      width: 6,
    });
    expect(flatStyle(view.getByTestId('focus-progress-dot-4', hidden).props.style)).toMatchObject({
      backgroundColor: themes.light.colors.lineStrong,
      height: 6,
      width: 6,
    });
  });

  it('keeps a short window in a long surah', () => {
    expect(focusDotCount(286, 40).count).toBe(7);
    expect(focusDotCount(286, 1).activeIndex).toBe(0);
    expect(focusDotCount(286, 286).activeIndex).toBe(6);
  });

  it('opens the ayah of a tapped mark, but not the current one', async () => {
    const onSelect = jest.fn();
    const view = await renderUi(<FocusProgress onSelect={onSelect} verseNumber={5} versesCount={7} />);

    await fireEvent.press(view.getByTestId('focus-progress-page-2', hidden));
    await fireEvent.press(view.getByTestId('focus-progress-page-5', hidden));
    expect(onSelect.mock.calls).toEqual([[2]]);
  });

  it.each(locales)('sits on the trailing edge, 10 in from it, in %s', async (locale) => {
    const view = await renderUi(<FocusProgress verseNumber={5} versesCount={7} />, { locale });
    const style = flatStyle(view.getByTestId('focus-progress', hidden).props.style);

    expect(style).toMatchObject({ end: 10, position: 'absolute' });
    expect(style).not.toHaveProperty('left');
    expect(style).not.toHaveProperty('right');
  });

  it('spaces the marks 8 apart from one edge to the next', async () => {
    const view = await renderUi(<FocusProgress verseNumber={5} versesCount={7} />);

    expect(flatStyle(view.getByTestId('focus-progress', hidden).props.style)).toMatchObject({ gap: 8 });
    expect(flatStyle(view.getByTestId('focus-progress-page-5', hidden).props.style)).toMatchObject({ width: 6 });
  });

  it('is hidden from screen readers, which page with the transport instead', async () => {
    const view = await renderUi(<FocusProgress verseNumber={5} versesCount={7} />);

    expect(view.queryByTestId('focus-progress')).toBeNull();
    expect(view.getByTestId('focus-progress', hidden).props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/FocusProgress.tsx')).toEqual([]);
  });
});
