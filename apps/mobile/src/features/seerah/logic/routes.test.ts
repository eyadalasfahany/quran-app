import { eventsFixture } from '../fixtures';
import type { SeerahRoute } from '../types';
import { dimmedRouteIds } from './routes';

const routes: SeerahRoute[] = [
  { id: 'r-hijra', kind: 'hijra', nameAr: 'هجرة', stops: ['makkah', 'madinah'], eventIds: ['e005'] },
  { id: 'r-badr', kind: 'ghazwa', nameAr: 'غزوة', stops: ['madinah', 'badr'], eventIds: ['e006', 'e007'] },
  { id: 'r-empty', kind: 'trip', nameAr: 'رحلة', stops: [], eventIds: ['missing'] },
];

describe('dimmedRouteIds', () => {
  it('dims nothing without a focus', () => {
    expect(dimmedRouteIds(routes, eventsFixture, null)).toEqual([]);
  });

  it('dims the routes whose events fall outside the focused age', () => {
    expect(dimmedRouteIds(routes, eventsFixture, 53)).toEqual(['r-badr', 'r-empty']);
    expect(dimmedRouteIds(routes, eventsFixture, 54)).toEqual(['r-hijra', 'r-empty']);
  });

  it('dims every route for the unspecified bucket when none has an unspecified event', () => {
    expect(dimmedRouteIds(routes, eventsFixture, 'unspecified')).toHaveLength(3);
  });
});
