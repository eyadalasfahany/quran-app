import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { Text } from 'react-native';

import { eventsFixture, makeEvent, paragraphsFixture } from '../fixtures';
import { EventPage } from './EventPage';

const base = {
  alsoPlaces: [{ id: 'makkah', name: 'مكة' }],
  event: makeEvent({ ageFrom: 54, ageTo: 54, id: 'e006', placeId: 'badr', position: 6, titleAr: '[عنوان الفصل في الكتاب]' }),
  onAlsoPlacePress: jest.fn(),
  onShowAge: jest.fn(),
  onShowPlace: jest.fn(),
  paragraphs: paragraphsFixture,
  placeName: 'بدر',
  sourcePage: 123,
};

describe('EventPage', () => {
  it.each(locales)('composes the heading, the text, the other places and the source (%s)', async (locale) => {
    await renderUi(<EventPage {...base} />, { locale });
    expect(screen.getByRole('header')).toHaveTextContent('[عنوان الفصل في الكتاب]');
    expect(screen.getAllByTestId(/^seerah-event-text-p/)).toHaveLength(2);
    expect(screen.getByText('مكة')).toBeOnTheScreen();
    expect(screen.getByText(/OpenITI/)).toBeOnTheScreen();
    expect(screen.queryByRole('summary')).toBeNull();
  });

  it('shows a slot for the mini map', async () => {
    await renderUi(<EventPage {...base} miniMap={<Text>mini map slot</Text>} />);
    expect(screen.getByText('mini map slot')).toBeOnTheScreen();
  });

  it('routes the chip and the other-place taps', async () => {
    const onShowAge = jest.fn();
    const onShowPlace = jest.fn();
    const onAlsoPlacePress = jest.fn();
    await renderUi(<EventPage {...base} onAlsoPlacePress={onAlsoPlacePress} onShowAge={onShowAge} onShowPlace={onShowPlace} />);
    await press(screen.getByTestId('seerah-event-header-age'));
    await press(screen.getByTestId('seerah-event-header-place'));
    await press(screen.getByTestId('seerah-also-places-makkah'));
    expect([onShowAge, onShowPlace, onAlsoPlacePress].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it('an event in «أخرى» says the place is not stated and its chip is inert', async () => {
    const event = eventsFixture.find((candidate) => candidate.id === 'e007');
    await renderUi(<EventPage {...base} event={event!} placeName="أخرى" />);
    expect(screen.getByTestId('seerah-event-note-place')).toBeOnTheScreen();
    expect(screen.queryByTestId('seerah-event-note-year')).toBeNull();
    expect(screen.getByTestId('seerah-event-header-place').props.accessibilityRole).toBe('text');
  });

  it('an event in the «غير محدد» bucket says the year is not stated', async () => {
    const event = eventsFixture.find((candidate) => candidate.id === 'e008');
    await renderUi(<EventPage {...base} event={event!} />);
    expect(screen.getByTestId('seerah-event-note-year')).toBeOnTheScreen();
    expect(screen.getByText('العمر غير محدد')).toBeOnTheScreen();
  });

  it('an approximate event gets the quiet «approximate» note, and a stated one does not', async () => {
    const approximate = await renderUi(<EventPage {...base} event={{ ...base.event, certainty: 'approximate' }} />);
    expect(screen.getByTestId('seerah-event-note-uncertain')).toBeOnTheScreen();
    await approximate.unmount();
    await renderUi(<EventPage {...base} />);
    expect(screen.queryByTestId('seerah-event-note-uncertain')).toBeNull();
  });

  it('keeps clear of the floating pager', async () => {
    await renderUi(<EventPage {...base} bottomInset={150} />);
    expect(flatStyle(screen.getByTestId('seerah-event-page').props.contentContainerStyle).paddingBottom).toBe(150);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/EventPage.tsx')).toEqual([]);
    expect(themes.light.colors.ink).toBeDefined();
  });
});
