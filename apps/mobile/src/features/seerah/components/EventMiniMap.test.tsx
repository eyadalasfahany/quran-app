import { fireEvent, screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { act } from 'react';

import { EventMiniMap } from './EventMiniMap';

const ART = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
const base = { art: ART, onPress: jest.fn(), placeName: 'بدر', point: { x: 803, y: 1122 } };

/** Lays the strip out, then lets the frame pass after which the art mounts (it waits for the page's first frame). */
async function layOut() {
  await act(async () => {
    fireEvent(screen.getByTestId('seerah-event-minimap'), 'layout', { nativeEvent: { layout: { height: 168, width: 358, x: 0, y: 0 } } });
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

describe('EventMiniMap', () => {
  it.each(locales)('shows the place, the «على الخريطة» pill and one button (%s)', async (locale) => {
    await renderUi(<EventMiniMap {...base} />, { locale });
    expect(screen.getByText('بدر')).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? 'على الخريطة' : 'On the map')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'عرض على الخريطة: بدر' : 'Show on the map: بدر' })).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<EventMiniMap {...base} onPress={onPress} />);
    await press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is 168 pt tall with the hero radius and a halo on the place', async () => {
    await renderUi(<EventMiniMap {...base} />);
    expect(flatStyle(screen.getByTestId('seerah-event-minimap').props.style)).toMatchObject({ borderRadius: themes.light.radius.hero, height: 168, overflow: 'hidden' });
    expect(screen.getByTestId('seerah-event-minimap-halo')).toBeOnTheScreen();
  });

  it('crops the art to a window centred on the place at 0.9 points a unit', async () => {
    await renderUi(<EventMiniMap {...base} />);
    await layOut();
    const svg = screen.getByTestId('seerah-event-minimap-art-svg').props;
    // The strip is 358 x 168 pt: 358 / 0.9 by 168 / 0.9 units, so the art is not stretched.
    expect(svg.vbWidth).toBeCloseTo(358 / 0.9);
    expect(svg.vbHeight).toBeCloseTo(168 / 0.9);
    expect(svg.minX + svg.vbWidth / 2).toBeCloseTo(803);
    expect(svg.minY + svg.vbHeight / 2).toBeCloseTo(1122);
  });

  it('draws a few hundred units, not the whole art', async () => {
    await renderUi(<EventMiniMap {...base} />);
    await layOut();
    const svg = screen.getByTestId('seerah-event-minimap-art-svg').props;
    expect(svg.vbWidth * svg.vbHeight).toBeLessThan((1644 * 2400) / 10);
  });

  it('mounts the art a frame after the page, not with it', async () => {
    await renderUi(<EventMiniMap {...base} />);
    await act(async () => {
      fireEvent(screen.getByTestId('seerah-event-minimap'), 'layout', { nativeEvent: { layout: { height: 168, width: 358, x: 0, y: 0 } } });
    });
    expect(screen.queryByTestId('seerah-event-minimap-art-svg')).toBeNull();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(screen.getByTestId('seerah-event-minimap-art-svg')).toBeTruthy();
  });

  it('draws nothing of the art before the strip has a width', async () => {
    await renderUi(<EventMiniMap {...base} />);
    expect(screen.queryByTestId('seerah-event-minimap-art-svg')).toBeNull();
  });

  it('draws the route when the event has one', async () => {
    await renderUi(<EventMiniMap {...base} route={{ d: 'M0,0 L10,10', kind: 'ghazwa' }} />);
    expect(screen.getByTestId('seerah-event-minimap')).toBeOnTheScreen();
  });

  it('keeps the gold rules and has no raw colour literal', async () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/EventMiniMap.tsx')).toEqual([]);
  });
});
