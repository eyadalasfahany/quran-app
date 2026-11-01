import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { AzkarTapSurface } from './AzkarTapSurface';

const SURFACE = 'azkar-tap-surface';
const DHIKR_TEXT = 'نص تجريبي ١ — ليس ذكرًا';

/**
 * The surface with a child text and a child button, the way the reader places the details link inside it. The child
 * button is a plain Text with its own press handler, so the nearest handler of a press on it is its own.
 */
function renderSurface({ disabled = false, onTap = jest.fn(), onDetails = jest.fn() } = {}) {
  const ui = (
    <AzkarTapSurface disabled={disabled} onTap={onTap}>
      <Text>{DHIKR_TEXT}</Text>
      <Text accessibilityRole="button" onPress={onDetails} testID="fixture-child-button">
        FIXTURE child button
      </Text>
    </AzkarTapSurface>
  );
  return { onTap, onDetails, ui };
}

describe('AzkarTapSurface', () => {
  it('renders its children', async () => {
    const { ui } = renderSurface();
    await renderUi(ui);

    expect(screen.getByTestId(SURFACE)).toBeTruthy();
    expect(screen.getByText(DHIKR_TEXT)).toBeTruthy();
  });

  it('calls onTap once for a press on its content', async () => {
    const { ui, onTap } = renderSurface();
    await renderUi(ui);
    await press(screen.getByText(DHIKR_TEXT));

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('ignores presses while disabled, as for a completed unit', async () => {
    const { ui, onTap } = renderSurface({ disabled: true });
    await renderUi(ui);
    await press(screen.getByText(DHIKR_TEXT));

    expect(onTap).not.toHaveBeenCalled();
  });

  it('is hidden from accessibility: not an accessibility element, and no importance for TalkBack', async () => {
    const { ui } = renderSurface();
    await renderUi(ui);
    const surface = screen.getByTestId(SURFACE);

    expect(surface.props.accessible).toBe(false);
    expect(surface.props.importantForAccessibility).toBe('no');
    expect(surface.props.accessibilityRole).toBeUndefined();
  });

  it('keeps a child button reachable and pressable on its own, without calling onTap', async () => {
    const { ui, onTap, onDetails } = renderSurface();
    await renderUi(ui);
    const child = screen.getByRole('button', { name: 'FIXTURE child button' });
    expect(child.props.accessible).not.toBe(false);

    await press(child);
    expect(onDetails).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
  });

  // A press that turns into a scroll is not counted: Pressable cancels its press when a ScrollView takes the gesture
  // (native responder handling, which Jest does not run). Verified on the iPhone 17 simulator, not in Jest.

  it('gives no pressed opacity while a press is held: the counter and haptics are the feedback', async () => {
    const { ui } = renderSurface();
    await renderUi(ui);
    const surface = screen.getByTestId(SURFACE);

    fireEvent(surface, 'pressIn');
    expect(flatStyle(surface.props.style).opacity).toBeUndefined();
    fireEvent(surface, 'pressOut');
    expect(flatStyle(surface.props.style).opacity).toBeUndefined();
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarTapSurface.tsx')).toEqual([]);
  });

  it('renders the same children in English', async () => {
    const { ui } = renderSurface();
    await renderUi(ui, { locale: 'en' });

    expect(screen.getByText('FIXTURE child button')).toBeTruthy();
  });
});
