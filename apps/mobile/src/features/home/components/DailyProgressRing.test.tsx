import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { DailyProgressRing } from './DailyProgressRing';

const circumference = 2 * Math.PI * ((64 - 5) / 2);

describe('DailyProgressRing', () => {
  it('shows its label in the centre', async () => {
    const view = await renderUi(<DailyProgressRing label="٦٠٪" percent={60} />);

    expect(view.getByTestId('daily-progress-ring-label', { includeHiddenElements: true })).toHaveTextContent('٦٠٪');
  });

  it('draws the arc to the percent', async () => {
    const view = await renderUi(<DailyProgressRing label="٥٠٪" percent={50} />);

    expect(view.getByTestId('daily-progress-ring-arc', { includeHiddenElements: true }).props.strokeDashoffset).toBeCloseTo(circumference / 2, 5);
  });

  it('draws an empty ring at zero and a full ring at one hundred, and clamps beyond', async () => {
    const empty = await renderUi(<DailyProgressRing label="٠٪" percent={0} />);
    expect(empty.getByTestId('daily-progress-ring-arc', { includeHiddenElements: true }).props.strokeDashoffset).toBeCloseTo(circumference, 5);

    const full = await renderUi(<DailyProgressRing label="١٠٠٪" percent={140} />);
    // The host drops a zero dash offset, so a full ring reads as no offset.
    expect(Number(full.getByTestId('daily-progress-ring-arc', { includeHiddenElements: true }).props.strokeDashoffset ?? 0)).toBe(0);
  });

  it('is hidden from screen readers, because the card speaks for it', async () => {
    const view = await renderUi(<DailyProgressRing label="٦٠٪" percent={60} />);

    expect(view.getByTestId('daily-progress-ring', { includeHiddenElements: true }).props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/home/components/DailyProgressRing.tsx')).toEqual([]);
  });
});
