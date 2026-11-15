import { screen } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { YearChip } from './YearChip';

const hidden = { includeHiddenElements: true } as const;

describe('YearChip', () => {
  it.each(locales)('shows the age in the language digits and the stage (%s)', async (locale) => {
    await renderUi(<YearChip age={55} stageName="stage" />, { locale });
    expect(screen.getByText(locale === 'ar' ? '٥٥' : '55', hidden)).toBeOnTheScreen();
    expect(screen.getByText('stage', hidden)).toBeOnTheScreen();
  });

  it('omits the stage line when there is none', async () => {
    await renderUi(<YearChip age={5} stageName={null} />);
    expect(screen.queryByText('stage', hidden)).toBeNull();
  });

  it('is an echo for sighted users: hidden from screen readers and ignores touches', async () => {
    await renderUi(<YearChip age={5} stageName="s" testID="chip" />);
    const chip = screen.getByTestId('chip', hidden);
    expect(chip.props.accessibilityElementsHidden).toBe(true);
    expect(chip.props.pointerEvents).toBe('none');
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/YearChip.tsx')).toEqual([]);
  });
});
