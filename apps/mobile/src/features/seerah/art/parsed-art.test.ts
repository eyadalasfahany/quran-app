import { parse } from 'react-native-svg';

import { parsedArt } from './parsed-art';
import { seerahArtFor } from './seerah-art';

jest.mock('react-native-svg', () => {
  const actual = jest.requireActual<typeof import('react-native-svg')>('react-native-svg');
  return { ...actual, parse: jest.fn(actual.parse) };
});

describe('parsedArt', () => {
  it('parses a level art once and returns the same tree after that', () => {
    const xml = seerahArtFor('madinah', 'dark') ?? '';
    const first = parsedArt(xml);
    const second = parsedArt(xml);
    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(jest.mocked(parse)).toHaveBeenCalledTimes(1);
  });
});
