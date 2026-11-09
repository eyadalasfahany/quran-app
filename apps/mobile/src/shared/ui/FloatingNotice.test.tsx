import { act, fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { FloatingNotice } from './FloatingNotice';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const mockReduceMotion = useReducedMotion as unknown as jest.Mock;

// Liquid Glass is iOS 26 only, so the Android test draws the solid fallback.
jest.mock('expo-glass-effect', () => ({
  ...jest.requireActual('expo-glass-effect'),
  isLiquidGlassAvailable: () => false,
}));

const copy = {
  ar: { title: 'تحديث جديد جاهز', subtitle: 'أعد تشغيل طيبة لتطبيق أحدث التحسينات', action: 'تحديث' },
  en: {
    title: 'A new update is ready',
    subtitle: 'Restart Taybah to apply the latest improvements',
    action: 'Update',
  },
};

function Harness(props: Partial<ComponentProps<typeof FloatingNotice>> & { visible: boolean }) {
  return <FloatingNotice icon={{ ios: 'arrow.down.circle', android: 'system_update' }} testID="notice" title="Title" {...props} />;
}

describe('FloatingNotice', () => {
  let announce: jest.SpyInstance;

  beforeEach(() => {
    mockReduceMotion.mockReturnValue(false);
    announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  });

  afterEach(() => {
    announce.mockRestore();
  });

  it.each(locales)('renders the title, subtitle and action under %s', async (locale) => {
    const text = locale === 'ar' ? copy.ar : copy.en;
    const view = await renderUi(
      <FloatingNotice
        action={{ label: text.action, onPress: () => undefined }}
        icon={{ ios: 'arrow.down.circle', android: 'system_update' }}
        subtitle={text.subtitle}
        testID="notice"
        title={text.title}
        visible
      />,
      { locale },
    );

    expect(view.getByText(text.title)).toBeOnTheScreen();
    expect(view.getByText(text.subtitle)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: text.action })).toBeOnTheScreen();
  });

  it('exposes the title and subtitle as one polite text element', async () => {
    const view = await renderUi(<Harness subtitle="Sub" visible />);

    const status = view.getByLabelText('Title. Sub');
    expect(status.props.accessibilityRole).toBe('text');
    expect(status.props.accessibilityLiveRegion).toBe('polite');
  });

  it('renders no button when no action is given', async () => {
    const view = await renderUi(<Harness visible />);

    expect(view.queryByRole('button')).toBeNull();
  });

  it('calls the action when its button is pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<Harness action={{ label: 'Go', onPress }} visible />);

    fireEvent.press(view.getByRole('button', { name: 'Go' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('passes the action hint to its button', async () => {
    const view = await renderUi(<Harness action={{ label: 'Go', onPress: () => undefined, accessibilityHint: 'Hint' }} visible />);

    expect(view.getByRole('button', { name: 'Go' }).props.accessibilityHint).toBe('Hint');
  });

  it('announces the title once when it is shown', async () => {
    const view = await renderUi(<Harness visible />);

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Title');

    view.rerender(<Harness visible />);
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('does not announce when announce is false', async () => {
    await renderUi(<Harness announce={false} visible />);

    expect(announce).not.toHaveBeenCalled();
  });

  it('unmounts once its slide-out ends, so a hidden notice takes no space or touches', async () => {
    const view = await renderUi(<Harness visible />);
    await act(async () => {
      view.rerender(<Harness visible={false} />);
    });

    // Jest runs the spring to its end at once, so the slide-out has finished and the card is gone.
    expect(view.queryByTestId('notice', { includeHiddenElements: true })).toBeNull();
  });

  it('draws nothing under Reduce Motion once closed, so it never slides', async () => {
    mockReduceMotion.mockReturnValue(true);
    const view = await renderUi(<Harness visible={false} />);

    expect(view.queryByTestId('notice', { includeHiddenElements: true })).toBeNull();
  });

  it('shows at once under Reduce Motion', async () => {
    mockReduceMotion.mockReturnValue(true);
    const view = await renderUi(<Harness visible />);

    expect(view.getByTestId('notice')).toBeOnTheScreen();
    expect(view.getByText('Title')).toBeOnTheScreen();
  });

  it('draws the solid glass fallback with the shadow on Android, and its controls still work', async () => {
    const onPress = jest.fn();
    const replacement = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      const view = await renderUi(<Harness action={{ label: 'Go', onPress }} visible />);

      // No native glass on Android: the surface is the solid fallback, with the shadow token.
      expect(view.queryByTestId('notice-surface-glass')).toBeNull();
      expect(view.getByTestId('notice-surface')).toHaveStyle({ backgroundColor: themes.light.colors.glassFallback });
      expect(view.getByTestId('notice-surface')).toHaveStyle({ boxShadow: themes.light.shadows.glass });

      fireEvent.press(view.getByRole('button', { name: 'Go' }));
      expect(onPress).toHaveBeenCalledTimes(1);
    } finally {
      replacement.restore();
    }
  });

  it('uses theme tokens only', () => {
    expect(rawColorLiterals('FloatingNotice.tsx')).toEqual([]);
  });
});
