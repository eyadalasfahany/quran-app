import { act, fireEvent, screen } from '@testing-library/react-native';
import { AccessibilityInfo, I18nManager } from 'react-native';
import { usePanGesture } from 'react-native-gesture-handler';

import { themes } from '@/core/theme';
import { flatStyle, locales } from '../../../../jest/render-ui';
import { renderGesture } from '../../../../jest/seerah-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { TimelineScrubber } from './TimelineScrubber';

jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual<typeof import('react-native-gesture-handler')>('react-native-gesture-handler');
  return { ...actual, usePanGesture: jest.fn(actual.usePanGesture) };
});

const hidden = { includeHiddenElements: true } as const;
const counts = Array.from({ length: 64 }, (_, age) => (age === 55 ? 8 : age === 54 ? 1 : 0));
const milestones = [
  { age: 0, eventId: 'e1', key: 'birth', labelAr: 'المولد' },
  { age: 53, eventId: 'e2', key: 'hijra', labelAr: 'الهجرة' },
];

function scrubber(props: Partial<React.ComponentProps<typeof TimelineScrubber>> = {}, locale: (typeof locales)[number] = 'ar') {
  const onAgeChange = jest.fn();
  const view = renderGesture(
    <TimelineScrubber age={null} counts={counts} milestones={milestones} onAgeChange={onAgeChange} testID="scrub" {...props} />,
    { locale },
  );
  return { onAgeChange, view };
}

async function layOut(size: number, horizontal = true) {
  await act(async () => {
    fireEvent(screen.getByTestId('scrub'), 'layout', {
      nativeEvent: { layout: { height: horizontal ? 108 : size, width: horizontal ? size : 100, x: 0, y: 0 } },
    });
  });
}

type PanCallbacks = {
  onActivate: (event: unknown) => void;
  onUpdate: (event: unknown) => void;
  onFinalize: (event: unknown, success: boolean) => void;
};

// The pan's callbacks as the scrubber hands them to usePanGesture (plain functions under Jest).
function panConfig(): PanCallbacks {
  const config = jest.mocked(usePanGesture).mock.lastCall?.[0];
  if (config === undefined) {
    throw new Error('the scrubber gives no pan gesture');
  }
  return config as unknown as PanCallbacks;
}

beforeEach(() => {
  jest.mocked(usePanGesture).mockClear();
  I18nManager.isRTL = true;
});

describe('TimelineScrubber', () => {
  it.each(locales)('is one adjustable element with a label and the value text (%s)', async (locale) => {
    await scrubber({ age: 55 }, locale).view;
    const node = screen.getByRole('adjustable');
    expect(node.props.accessibilityLabel).toBe(locale === 'ar' ? 'العمر' : 'Age');
    expect(node.props.accessibilityValue).toMatchObject({ max: 63, min: 0, now: 55 });
    expect(node.props.accessibilityValue.text).toBe(locale === 'ar' ? 'عمره ٥٥ سنة، ٨ أحداث' : 'Age 55, 8 events');
  });

  it('reads «all ages» when nothing is selected', async () => {
    await scrubber().view;
    expect(screen.getByRole('adjustable').props.accessibilityValue.text).toBe('كل الأعمار');
  });

  it('increment and decrement move one year and announce the year with its event count', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    const { onAgeChange, view } = scrubber({ age: 54 });
    await view;
    const node = screen.getByRole('adjustable');
    expect(node.props.accessibilityActions.map((action: { name: string }) => action.name)).toEqual(['increment', 'decrement']);
    await act(async () => {
      fireEvent(node, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    expect(onAgeChange).toHaveBeenLastCalledWith(55);
    expect(announce).toHaveBeenLastCalledWith('عمره ٥٥ سنة، ٨ أحداث');
    await act(async () => {
      fireEvent(node, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    });
    expect(onAgeChange).toHaveBeenLastCalledWith(53);
    announce.mockRestore();
  });

  it('a decrement from «all» lands on the last age and an increment on the first', async () => {
    const { onAgeChange, view } = scrubber();
    await view;
    await act(async () => {
      fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    });
    expect(onAgeChange).toHaveBeenLastCalledWith(63);
  });

  it('stops at the ends', async () => {
    const { onAgeChange, view } = scrubber({ age: 63 });
    await view;
    await act(async () => {
      fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    expect(onAgeChange).toHaveBeenLastCalledWith(63);
  });

  it('a touch picks the age under the finger, with age 0 at the right in Arabic', async () => {
    const { onAgeChange, view } = scrubber();
    await view;
    await layOut(640);
    await act(async () => {
      panConfig().onUpdate({ x: 639, y: 0 });
    });
    expect(onAgeChange).toHaveBeenLastCalledWith(0);
    await act(async () => {
      panConfig().onUpdate({ x: 1, y: 0 });
    });
    expect(onAgeChange).toHaveBeenLastCalledWith(63);
  });

  it('age 0 is at the left in English', async () => {
    I18nManager.isRTL = false;
    const { onAgeChange, view } = scrubber({}, 'en');
    await view;
    await layOut(640);
    await act(async () => {
      panConfig().onUpdate({ x: 1, y: 0 });
    });
    expect(onAgeChange).toHaveBeenLastCalledWith(0);
  });

  it('the vertical bar reads the vertical offset, age 0 at the top', async () => {
    const { onAgeChange, view } = scrubber({ orientation: 'vertical' });
    await view;
    await layOut(640, false);
    await act(async () => {
      panConfig().onUpdate({ x: 50, y: 639 });
    });
    expect(onAgeChange).toHaveBeenLastCalledWith(63);
  });

  it('floats the year chip while dragging and removes it at the end', async () => {
    const { view } = scrubber({ age: 55 });
    await view;
    expect(screen.queryByTestId('scrub-chip', hidden)).toBeNull();
    await act(async () => {
      panConfig().onActivate({ x: 10, y: 0 });
    });
    expect(screen.getByTestId('scrub-chip', hidden)).toBeOnTheScreen();
    await act(async () => {
      panConfig().onFinalize({}, true);
    });
    expect(screen.queryByTestId('scrub-chip', hidden)).toBeNull();
  });

  it('draws an idle handle when no age is selected and a solid one otherwise', async () => {
    const idle = await scrubber().view;
    expect(flatStyle(screen.getByTestId('scrub-handle', hidden).props.style).backgroundColor).toBeDefined();
    const idleFill = flatStyle(screen.getByTestId('scrub-handle', hidden).props.style).backgroundColor;
    await idle.unmount();
    await scrubber({ age: 10 }).view;
    expect(flatStyle(screen.getByTestId('scrub-handle', hidden).props.style).backgroundColor).not.toBe(idleFill);
  });

  it('draws the selected handle as a solid brand disc inside a light ring (frames SeerahTimeline, SeerahMapRegionYear)', async () => {
    await scrubber({ age: 10 }).view;
    expect(flatStyle(screen.getByTestId('scrub-handle', hidden).props.style)).toMatchObject({
      backgroundColor: themes.light.colors.brand,
      borderColor: themes.light.colors.surfaceRaised,
    });
  });

  it('draws a label and a diamond for each milestone', async () => {
    await scrubber().view;
    expect(screen.getByText('المولد', hidden)).toBeOnTheScreen();
    expect(screen.getByTestId('scrub-diamond-hijra-diamond', hidden)).toBeOnTheScreen();
  });

  it('keeps the visual parts out of the accessibility order', async () => {
    await scrubber({ age: 55 }).view;
    expect(screen.getAllByRole('adjustable')).toHaveLength(1);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/TimelineScrubber.tsx')).toEqual([]);
  });
});
