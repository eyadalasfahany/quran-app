import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderGesture } from '../../../../jest/seerah-ui';
import { locales } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { eventsFixture, FIXTURE_PARAGRAPH, paragraphsFixture } from '../fixtures';

import { SeerahEventView } from './SeerahEventView';

const [first, second, third] = eventsFixture;
const handlers = {
  onAlsoPlacePress: jest.fn(),
  onBack: jest.fn(),
  onNext: jest.fn(),
  onPrevious: jest.fn(),
  onShowAge: jest.fn(),
  onShowList: jest.fn(),
  onShowPlace: jest.fn(),
};
const base = {
  ...handlers,
  alsoPlaces: [],
  event: second!,
  index: 2,
  next: third!,
  paragraphs: paragraphsFixture,
  placeName: 'الكعبة',
  previous: first!,
  sourcePage: 123,
  total: 10,
};

describe('SeerahEventView', () => {
  it.each(locales)('shows the book text verbatim, the chips and the pager (%s)', async (locale) => {
    await renderGesture(<SeerahEventView {...base} />, { locale });
    expect(screen.getByText(`${FIXTURE_PARAGRAPH} ١`)).toBeOnTheScreen();
    expect(screen.getByTestId('seerah-event-pager')).toBeOnTheScreen();
    expect(screen.getByTestId('seerah-event-topbar')).toBeOnTheScreen();
  });

  it('shows the mini map slot', async () => {
    await renderGesture(<SeerahEventView {...base} miniMap={<Text>mini</Text>} />);
    expect(screen.getByText('mini')).toBeOnTheScreen();
  });

  it('wires back, the list, previous and next', async () => {
    const onBack = jest.fn();
    const onNext = jest.fn();
    const onPrevious = jest.fn();
    const onShowList = jest.fn();
    await renderGesture(<SeerahEventView {...base} onBack={onBack} onNext={onNext} onPrevious={onPrevious} onShowList={onShowList} />);
    await press(screen.getByTestId('seerah-event-topbar-back'));
    await press(screen.getByTestId('seerah-event-pager-next'));
    await press(screen.getByTestId('seerah-event-pager-previous'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('leaves the previous slot empty on the first event', async () => {
    await renderGesture(<SeerahEventView {...base} event={first!} index={1} previous={null} />);
    expect(screen.getByTestId('seerah-event-pager-previous').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/SeerahEventView.tsx')).toEqual([]);
  });
});
