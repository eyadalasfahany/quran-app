import { cleanup, fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { featureComponentLiterals } from '../../../../../jest/ui-source';
import { flatStyle, locales, renderUi } from '../../../../../jest/render-ui';

import { MushafZoomStepper } from './MushafZoomStepper';

// The props of the host element with a test ID, read from the rendered JSON (a disabled step is not found by RNTL's queries here).
type Node = { props?: Record<string, unknown>; children?: Node[] | null } | Node[] | string | null;
function hostProps(view: { toJSON: () => Node }, testID: string): Record<string, any> {
  const walk = (node: Node): Record<string, unknown> | null => {
    if (node === null || typeof node === 'string') {
      return null;
    }
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = walk(child);
        if (found !== null) {
          return found;
        }
      }
      return null;
    }
    if (node.props?.testID === testID) {
      return node.props;
    }
    for (const child of node.children ?? []) {
      const found = walk(child);
      if (found !== null) {
        return found;
      }
    }
    return null;
  };
  const props = walk(view.toJSON());
  if (props === null) {
    throw new Error(`no element ${testID}`);
  }
  return props;
}
const stepProps = (view: { toJSON: () => Node }, step: 'increase' | 'decrease') => hostProps(view, `reader-mushaf-zoom-${step}`);

describe('MushafZoomStepper', () => {
  afterEach(() => {
    cleanup();
  });

  it.each(locales)('shows the zoom as a percentage in %s', async (locale) => {
    const view = await renderUi(<MushafZoomStepper onChange={() => undefined} value={1.5} />, { locale });

    expect(view.getByTestId('reader-mushaf-zoom-percent')).toHaveTextContent(locale === 'ar' ? '١٥٠٪' : '150%');
    expect(view.getByTestId('reader-mushaf-zoom-decrease')).toHaveTextContent(locale === 'ar' ? 'أ−' : 'A−');
    expect(view.getByTestId('reader-mushaf-zoom-increase')).toHaveTextContent(locale === 'ar' ? 'أ+' : 'A+');
  });

  it.each(locales)('labels the two steps in %s', async (locale) => {
    const view = await renderUi(<MushafZoomStepper onChange={() => undefined} value={1} />, { locale });

    expect(view.getByLabelText(locale === 'ar' ? 'تصغير الصفحة' : 'Zoom out')).toBeOnTheScreen();
    expect(view.getByLabelText(locale === 'ar' ? 'تكبير الصفحة' : 'Zoom in')).toBeOnTheScreen();
  });

  it('disables the increase step at 300%', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<MushafZoomStepper onChange={onChange} value={3} />);
    expect(stepProps(view, 'increase').accessibilityState).toMatchObject({ disabled: true });
    expect(stepProps(view, 'decrease').accessibilityState).toMatchObject({ disabled: false });
    fireEvent.press(view.getByTestId('reader-mushaf-zoom-increase'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables the decrease step at 100%', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<MushafZoomStepper onChange={onChange} value={1} />);
    expect(stepProps(view, 'decrease').accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(view.getByTestId('reader-mushaf-zoom-decrease'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('turns both steps off when the riwayah has no word data', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<MushafZoomStepper disabled onChange={onChange} value={1} />);

    expect(stepProps(view, 'increase').accessibilityState).toMatchObject({ disabled: true });
    expect(stepProps(view, 'decrease').accessibilityState).toMatchObject({ disabled: true });
    expect(flatStyle(view.getByTestId('reader-mushaf-zoom-increase').props.style)).toMatchObject({
      opacity: themes.light.opacity.disabled,
    });
    fireEvent.press(view.getByTestId('reader-mushaf-zoom-increase'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reads its steps as buttons, with the percentage as the label of the value', async () => {
    const view = await renderUi(<MushafZoomStepper onChange={() => undefined} value={1.75} />, { locale: 'en' });
    expect(stepProps(view, 'increase').accessibilityRole).toBe('button');
    expect(stepProps(view, 'increase').accessibilityLabel).toBe('Zoom in');
    expect(view.getByTestId('reader-mushaf-zoom-percent')).toHaveTextContent('175%');
  });

  it('steps by 25% in both directions', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<MushafZoomStepper onChange={onChange} value={1.25} />);

    fireEvent.press(view.getByTestId('reader-mushaf-zoom-increase'));
    expect(onChange).toHaveBeenLastCalledWith(1.5);

    fireEvent.press(view.getByTestId('reader-mushaf-zoom-decrease'));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('uses no raw colours', () => {
    expect(featureComponentLiterals('features/reader/settings/components/MushafZoomStepper.tsx')).toEqual([]);
  });
});
