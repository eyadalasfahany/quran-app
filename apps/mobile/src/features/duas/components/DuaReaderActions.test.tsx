import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { toggleDuaFavorite } from '../data/favorites-repository';
import { DuaReaderActions } from './DuaReaderActions';

const mockFavorites = new Set<string>();

jest.mock('../data/favorites-repository', () => ({
  toggleDuaFavorite: jest.fn(),
}));

jest.mock('../data/hooks', () => ({
  useIsDuaFavorite: (duaKey: string) => mockFavorites.has(duaKey),
}));

const mockToggle = toggleDuaFavorite as jest.Mock;

describe('DuaReaderActions', () => {
  beforeEach(() => {
    mockFavorites.clear();
    mockToggle.mockClear();
  });

  it('toggles the favourite of the dua it is given', async () => {
    const onShare = jest.fn();
    await renderUi(<DuaReaderActions duaKey="quran:1:1" onShare={onShare} onTextSize={jest.fn()} textSizeOpen={false} />);
    await press(screen.getByRole('button', { name: 'إضافة إلى المفضلة' }));
    expect(mockToggle).toHaveBeenCalledWith('quran:1:1');
  });

  it('labels a saved dua with the remove action', async () => {
    mockFavorites.add('hadeethenc:1');
    await renderUi(<DuaReaderActions duaKey="hadeethenc:1" onShare={jest.fn()} onTextSize={jest.fn()} textSizeOpen={false} />);
    expect(screen.getByRole('button', { name: 'إزالة من المفضلة' })).toBeOnTheScreen();
  });

  it('calls share and text size', async () => {
    const onShare = jest.fn();
    const onTextSize = jest.fn();
    await renderUi(<DuaReaderActions duaKey="quran:1:1" onShare={onShare} onTextSize={onTextSize} textSizeOpen={false} />);
    await press(screen.getByRole('button', { name: 'مشاركة' }));
    await press(screen.getByRole('button', { name: 'حجم النص' }));
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onTextSize).toHaveBeenCalledTimes(1);
  });

  it('reports the text size toggle as expanded when open', async () => {
    await renderUi(<DuaReaderActions duaKey="quran:1:1" onShare={jest.fn()} onTextSize={jest.fn()} textSizeOpen />);
    expect(screen.getByRole('button', { name: 'حجم النص' }).props.accessibilityState).toEqual({ expanded: true });
  });

  it('renders the English labels', async () => {
    await renderUi(<DuaReaderActions duaKey="quran:1:1" onShare={jest.fn()} onTextSize={jest.fn()} textSizeOpen={false} />, {
      locale: 'en',
    });
    expect(screen.getByRole('button', { name: 'Share' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add to favourites' })).toBeOnTheScreen();
  });
});
