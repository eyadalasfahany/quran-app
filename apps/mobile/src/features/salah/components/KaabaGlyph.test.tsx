import { render } from '@testing-library/react-native';

import { KaabaGlyph } from './KaabaGlyph';

// The glyph's face and band colours are documented SVG artwork constants, so this
// component is exempt from the no-raw-colour-literals assertion.
describe('KaabaGlyph', () => {
  it('renders the six isometric faces at the requested size', async () => {
    // The glyph is accessibility-hidden, so queries must opt into hidden elements.
    const { getByTestId, toJSON } = await render(<KaabaGlyph size={42} testID="kaaba" />);

    const svg = getByTestId('kaaba', { includeHiddenElements: true });
    expect(svg.props.width).toBe(42);
    expect(svg.props.height).toBe(42);
    // Top, left and right faces, the two gold bands and the door.
    expect(JSON.stringify(toJSON()).match(/"fill"/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it('is decorative: hidden from accessibility', async () => {
    const { getByTestId } = await render(<KaabaGlyph testID="kaaba" />);

    const svg = getByTestId('kaaba', { includeHiddenElements: true });
    expect(svg.props.accessibilityElementsHidden).toBe(true);
    expect(svg.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
