import { fireEvent, type RenderResult } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { i18n } from '@/core/i18n';

import { renderUi } from '../../../../jest/render-ui';

import { SourcesScreen } from './SourcesScreen';

// The Seerah credit rows (frame SeerahSources). Kept apart from SourcesScreen.test.tsx, whose Hadith tests restore all mocks.
let mockSeerahBook: { editionAr: string } | undefined;

jest.mock('@/features/seerah/hooks', () => ({ useSeerahBook: () => mockSeerahBook }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

const rowOf = (view: RenderResult, key: string) => view.queryAllByTestId(`sources-${key}`, { includeHiddenElements: true })[0];
const exact = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

describe('SourcesScreen Seerah credits', () => {
  beforeEach(() => {
    mockSeerahBook = undefined;
  });

  it.each(['ar', 'en'] as const)('credits OpenITI with the licence and Natural Earth in %s', async (locale) => {
    const view = await renderUi(<SourcesScreen testID="sources" />, { locale });
    expect(rowOf(view, 'seerahOpeniti')).toHaveTextContent(exact(i18n.t('seerah.sources.openiti.title', { lng: locale })));
    expect(rowOf(view, 'seerahOpeniti')).toHaveTextContent(/CC BY-NC-SA 4\.0/);
    expect(rowOf(view, 'naturalEarth')).toHaveTextContent(exact(i18n.t('seerah.sources.naturalEarth.title', { lng: locale })));
  });

  it('adds the edition read from the installed book row', async () => {
    mockSeerahBook = { editionAr: '[طبعة تجريبية]' };
    const view = await renderUi(<SourcesScreen testID="sources" />);
    expect(rowOf(view, 'seerahOpeniti')).toHaveTextContent(/\[طبعة تجريبية\]/);
  });

  it('names no edition while the book is not installed', async () => {
    const view = await renderUi(<SourcesScreen testID="sources" />);
    expect(rowOf(view, 'seerahOpeniti')).not.toHaveTextContent(/\[طبعة تجريبية\]/);
  });

  it('opens the licence and the Natural Earth site', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
    const view = await renderUi(<SourcesScreen testID="sources" />);
    fireEvent.press(rowOf(view, 'seerahOpeniti') as never);
    expect(openURL).toHaveBeenLastCalledWith('https://creativecommons.org/licenses/by-nc-sa/4.0/');
    fireEvent.press(rowOf(view, 'naturalEarth') as never);
    expect(openURL).toHaveBeenLastCalledWith('https://www.naturalearthdata.com');
    openURL.mockRestore();
  });
});
