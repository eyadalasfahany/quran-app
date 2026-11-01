import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { sibhaBeadPosition, SibhaRingBead } from './SibhaRingBead';

describe('sibhaBeadPosition', () => {
  it('places the bead at the top when progress is zero', () => {
    const beadSize = 13;
    const size = 280;
    const stroke = 10;
    const { left, top } = sibhaBeadPosition(size, stroke, 0, beadSize);

    expect(left).toBeCloseTo(size / 2 - beadSize / 2, 5);
    expect(top).toBeCloseTo(stroke / 2 - beadSize / 2, 5);
  });

  it('places the bead on the right at a quarter turn', () => {
    const beadSize = 13;
    const size = 280;
    const stroke = 10;
    const radius = (size - stroke) / 2;
    const { left, top } = sibhaBeadPosition(size, stroke, 0.25, beadSize);

    expect(left).toBeCloseTo(size / 2 + radius - beadSize / 2, 5);
    expect(top).toBeCloseTo(size / 2 - beadSize / 2, 5);
  });
});

describe('SibhaRingBead', () => {
  it('renders on the ring at the current fraction', async () => {
    const view = await renderUi(<SibhaRingBead fraction={0.5} size={280} />);

    const style = flatStyle(view.getByTestId('sibha-counter-bead').props.style);
    expect(style.width).toBeGreaterThanOrEqual(12);
    expect(style.backgroundColor).toBeDefined();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/sibha/components/SibhaRingBead.tsx')).toEqual([]);
  });
});
