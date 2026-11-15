import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { locales } from '../../../../jest/render-ui';
import { renderGesture } from '../../../../jest/seerah-ui';
import { eventsFixture, FIXTURE_PARAGRAPH, levelsForTest, milestonesFixture, paragraphsFixture, placesFixture } from '../fixtures';
import { useSeerahEvent, useSeerahReady, useSeerahWorld } from '../hooks';

import { SeerahEventScreen } from './SeerahEventScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), navigate: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));
jest.mock('../hooks', () => ({
  useSeerahEvent: jest.fn(),
  useSeerahReady: jest.fn(),
  useSeerahWorld: jest.fn(),
}));

function eventData(id: string) {
  const index = eventsFixture.findIndex((event) => event.id === id);
  const event = eventsFixture[index];
  return event === undefined
    ? undefined
    : {
        event,
        index: index + 1,
        next: eventsFixture[index + 1] ?? null,
        previous: eventsFixture[index - 1] ?? null,
        text: { paragraphs: paragraphsFixture, sourcePage: 123 },
        total: eventsFixture.length,
      };
}

describe('SeerahEventScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSeerahReady as jest.Mock).mockReturnValue(true);
    (useSeerahWorld as jest.Mock).mockReturnValue({
      events: eventsFixture,
      levels: levelsForTest,
      milestones: milestonesFixture,
      places: placesFixture,
      routes: [],
    });
    (useSeerahEvent as jest.Mock).mockImplementation(eventData);
  });

  it.each(locales)('shows the book text verbatim and the mini map (%s)', async (locale) => {
    await renderGesture(<SeerahEventScreen eventId="e006" />, { locale });
    expect(screen.getByText(`${FIXTURE_PARAGRAPH} ١`)).toBeOnTheScreen();
    expect(screen.getByTestId('seerah-event-minimap')).toBeOnTheScreen();
  });

  it('replaces the route with the next and previous event in book order', async () => {
    await renderGesture(<SeerahEventScreen eventId="e006" />);
    await press(screen.getByTestId('seerah-event-pager-next'));
    expect(router.replace).toHaveBeenLastCalledWith('/seerah/event/e007');
    await press(screen.getByTestId('seerah-event-pager-previous'));
    expect(router.replace).toHaveBeenLastCalledWith('/seerah/event/e005');
  });

  it('goes back to the map', async () => {
    await renderGesture(<SeerahEventScreen eventId="e006" />);
    await press(screen.getByTestId('seerah-event-topbar-back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('shows the list and the place on the map from the chips', async () => {
    await renderGesture(<SeerahEventScreen eventId="e006" />);
    await press(screen.getByTestId('seerah-event-topbar-list'));
    expect(router.navigate).toHaveBeenLastCalledWith('/seerah?view=list');
  });

  it('has no mini map for an event in «أخرى»', async () => {
    await renderGesture(<SeerahEventScreen eventId="e007" />);
    expect(screen.queryByTestId('seerah-event-minimap')).toBeNull();
  });

  it('says so for an unknown event', async () => {
    await renderGesture(<SeerahEventScreen eventId="nope" />);
    expect(screen.getByText('لا يوجد هذا الحدث')).toBeOnTheScreen();
  });

  it('renders nothing before content.db is ready', async () => {
    (useSeerahReady as jest.Mock).mockReturnValue(false);
    await renderGesture(<SeerahEventScreen eventId="e006" />);
    expect(screen.queryByTestId('seerah-event-view')).toBeNull();
  });
});
