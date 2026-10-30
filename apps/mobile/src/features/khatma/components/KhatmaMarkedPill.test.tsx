import { duration } from '@quran/design-tokens';

import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { featureComponentLiterals } from '../../../../jest/ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';

import { KhatmaMarkedPill } from './KhatmaMarkedPill';

const VISIBLE_MS = duration.pulse * 2 + duration.slow + duration.standard;

describe('KhatmaMarkedPill', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each(locales)('announces the marked message in %s', async (locale) => {
    const onDone = jest.fn();
    const view = await renderUi(<KhatmaMarkedPill onDone={onDone} />, { locale });
    const label = locale === 'ar' ? 'تم تحديث موضع الختمة' : 'Khatma position updated';
    expect(view.getByLabelText(label)).toBeOnTheScreen();
    expect(view.getByTestId('khatma-marked-pill').props.accessibilityLiveRegion).toBe('polite');
  });

  it('uses a glass pill with bar typography and calls onDone after the motion token delay', async () => {
    const onDone = jest.fn();
    const view = await renderUi(<KhatmaMarkedPill onDone={onDone} />);
    expect(view.getByTestId('khatma-marked-pill-surface')).toBeOnTheScreen();
    const label = view.getByText('تم تحديث موضع الختمة');
    expect(label.props.maxFontSizeMultiplier).toBe(maxFontScale.bar);
    expect(flatStyle(label.props.style)).toMatchObject({
      color: themes.light.colors.ink,
      fontSize: themes.light.text.subhead.fontSize,
    });
    expect(onDone).not.toHaveBeenCalled();
    jest.advanceTimersByTime(VISIBLE_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not intercept touches', async () => {
    const view = await renderUi(<KhatmaMarkedPill onDone={() => undefined} />);
    expect(view.getByTestId('khatma-marked-pill').props.pointerEvents).toBe('none');
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/khatma/components/KhatmaMarkedPill.tsx')).toEqual([]);
  });
});
