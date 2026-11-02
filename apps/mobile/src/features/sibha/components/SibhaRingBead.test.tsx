import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { SIBHA_RING_STROKE } from '../data/ring-layout';

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

  describe('physical placement (regression: the bead was mirrored away from the arc in Arabic)', () => {
    const size = 280;
    const fraction = 0.08;

    it.each([
      ['ar', true],
      ['en', false],
    ] as const)('places the bead on the arc tip in %s: translateX is left − (size − bead) in RTL, left in LTR', async (locale, rtl) => {
      const view = await renderUi(<SibhaRingBead fraction={fraction} size={size} />, { locale });
      const style = flatStyle(view.getByTestId('sibha-counter-bead').props.style);
      const bead = style.width as number;
      const { left, top } = sibhaBeadPosition(size, SIBHA_RING_STROKE, fraction, bead);
      const translateX = (style.transform as Record<string, number>[]).find((t) => 'translateX' in t)?.translateX ?? NaN;
      // The physical x the bead is drawn at: RN's `left: 0` anchor is the right edge in RTL, so the box starts at size − bead.
      const physicalLeft = (rtl ? size - bead : 0) + translateX;

      expect(physicalLeft).toBeCloseTo(left, 5);
      expect((style.transform as Record<string, number>[]).find((t) => 'translateY' in t)?.translateY).toBeCloseTo(top, 5);
    });

    it('renders with a translate, never a left offset, so RTL cannot mirror it', async () => {
      const view = await renderUi(<SibhaRingBead fraction={fraction} size={size} />, { locale: 'ar' });
      const style = flatStyle(view.getByTestId('sibha-counter-bead').props.style);

      expect(style.left).toBe(0);
      expect((style.transform as Record<string, number>[]).some((t) => 'translateX' in t)).toBe(true);
    });
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/sibha/components/SibhaRingBead.tsx')).toEqual([]);
  });
});
