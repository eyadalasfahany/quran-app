import { fireEvent, screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { act } from 'react';

import { EventMiniMap } from './EventMiniMap';

const ART = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
const base = { art: ART, onPress: jest.fn(), placeName: 'بدر', point: { x: 803, y: 1122 }, viewbox: [0, 0, 1644, 2400] as const };

async function layOut() {
  await act(async () => {
    fireEvent(screen.getByTestId('seerah-event-minimap'), 'layout', { nativeEvent: { layout: { height: 168, width: 358, x: 0, y: 0 } } });
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

  it('centres the art on the place at 0.9', async () => {
    await renderUi(<EventMiniMap {...base} />);
    await layOut();
    expect(flatStyle(screen.getByTestId('seerah-event-minimap-art').props.style)).toMatchObject({ left: 358 / 2 - 803 * 0.9, top: 84 - 1122 * 0.9, width: 1644 * 0.9 });
  });

  it('draws the route when the event has one', async () => {
    await renderUi(<EventMiniMap {...base} route={{ d: 'M0,0 L10,10', kind: 'ghazwa' }} />);
    expect(screen.getByTestId('seerah-event-minimap')).toBeOnTheScreen();
  });

  it('keeps the gold rules and has no raw colour literal', async () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/EventMiniMap.tsx')).toEqual([]);
  });
});
