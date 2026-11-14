import { act } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import { ThemeProvider } from '@/core/theme';

import { renderUi } from '../../jest/render-ui';

import SeerahRoute from './index';

jest.mock('expo-router', () => ({ useLocalSearchParams: jest.fn() }));

// Records each mount of the screen with the props it was mounted with: a new mount is a new instance.
const mockMounts: Record<string, unknown>[] = [];
jest.mock('@/features/seerah/screens/SeerahScreen', () => ({
  SeerahScreen: (props: Record<string, unknown>) => {
    const { useState } = jest.requireActual<typeof import('react')>('react');
    useState(() => mockMounts.push(props));
    return null;
  },
}));

const params = jest.mocked(useLocalSearchParams);

beforeEach(() => {
  mockMounts.length = 0;
  params.mockReturnValue({});
});

describe('/seerah route', () => {
  it('passes the age, place and view parameters to the screen', async () => {
    params.mockReturnValue({ age: '40', place: 'badr', view: 'map' });
    await renderUi(<SeerahRoute />);
    expect(mockMounts).toEqual([{ initialAge: 40, initialPlace: 'badr', initialView: 'map' }]);
  });

  it('opens a fresh screen when the parameters change on a reused route', async () => {
    params.mockReturnValue({ view: 'map', age: '40' });
    const view = await renderUi(<SeerahRoute />);
    params.mockReturnValue({ view: 'map', place: 'badr' });
    await act(async () => {
      view.rerender(<ThemeProvider name="light"><SeerahRoute /></ThemeProvider>);
    });
    expect(mockMounts).toHaveLength(2);
    expect(mockMounts[1]).toEqual({ initialAge: null, initialPlace: 'badr', initialView: 'map' });
  });

  it('keeps the same screen when the parameters do not change', async () => {
    params.mockReturnValue({ view: 'map', place: 'badr' });
    const view = await renderUi(<SeerahRoute />);
    await act(async () => {
      view.rerender(<ThemeProvider name="light"><SeerahRoute /></ThemeProvider>);
    });
    expect(mockMounts).toHaveLength(1);
  });

  it('opens a fresh screen when only the view parameter changes', async () => {
    params.mockReturnValue({ view: 'list' });
    const view = await renderUi(<SeerahRoute />);
    params.mockReturnValue({ view: 'map' });
    await act(async () => {
      view.rerender(<ThemeProvider name="light"><SeerahRoute /></ThemeProvider>);
    });
    expect(mockMounts.map((props) => props.initialView)).toEqual(['list', 'map']);
  });
});
