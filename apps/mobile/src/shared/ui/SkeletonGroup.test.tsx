import { act } from '@testing-library/react-native';
import { setUpTests, useReducedMotion } from 'react-native-reanimated';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { SkeletonBlock } from './SkeletonBlock';
import { SkeletonGroup } from './SkeletonGroup';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

setUpTests();

const reducedMotion = jest.mocked(useReducedMotion);
const hidden = { includeHiddenElements: true } as const;

function group(testID = 'group') {
  return (
    <SkeletonGroup testID={testID}>
      <SkeletonBlock height={10} testID="bar" width={80} />
    </SkeletonGroup>
  );
}

describe('SkeletonGroup', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    reducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each(locales)('is one busy accessibility element labelled as loading in %s', async (locale) => {
    const view = await renderUi(group(), { locale });
    const region = view.getByTestId('group');

    expect(region.props.accessible).toBe(true);
    expect(region.props.accessibilityState).toEqual({ busy: true });
    expect(region.props.accessibilityLabel).toBe(locale === 'ar' ? 'جارٍ التحميل' : 'Loading');
    expect(view.getByLabelText(locale === 'ar' ? 'جارٍ التحميل' : 'Loading')).toBe(region);
  });

  it('pulses its bars together between opacity 1 and 0.55 each way', async () => {
    const view = await renderUi(group());
    const bar = view.getByTestId('bar', hidden);

    expect(bar).toHaveAnimatedStyle({ opacity: 1 });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(bar).toHaveAnimatedStyle({ opacity: 0.55 });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(bar).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('stays still at opacity 1 with Reduce Motion on', async () => {
    reducedMotion.mockReturnValue(true);
    const view = await renderUi(group());
    const bar = view.getByTestId('bar', hidden);

    await act(async () => {
      jest.advanceTimersByTime(2500);
    });
    expect(bar).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('passes its style to the region', async () => {
    const view = await renderUi(
      <SkeletonGroup style={{ gap: 12 }} testID="group">
        <SkeletonBlock height={10} width={80} />
      </SkeletonGroup>,
    );

    expect(flatStyle(view.getByTestId('group').props.style)).toMatchObject({ gap: 12 });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('SkeletonGroup.tsx')).toEqual([]);
  });
});
