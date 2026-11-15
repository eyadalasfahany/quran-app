import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { toggleAzkarFavorite } from '@/features/azkar/data';
import { DuaHisnReaderActions } from './DuaHisnReaderActions';

const mockFavorites = new Set<string>();

// The Azkar favourite of the entry, as the Azkar reader uses it: one favourite per entry key.
jest.mock('@/features/azkar/data', () => ({
  toggleAzkarFavorite: jest.fn(),
  useIsFavorite: (entryKey: string) => mockFavorites.has(entryKey),
}));

const mockToggle = toggleAzkarFavorite as jest.Mock;

describe('DuaHisnReaderActions', () => {
  beforeEach(() => {
    mockFavorites.clear();
    mockToggle.mockClear();
  });

  it('toggles the Azkar favourite of the entry it is given', async () => {
    await renderUi(<DuaHisnReaderActions entryKey="FIXTURE:entry-1" onShare={jest.fn()} onTextSize={jest.fn()} textSizeOpen={false} />);

    await press(screen.getByRole('button', { name: 'إضافة إلى المفضلة' }));
    expect(mockToggle).toHaveBeenCalledWith('FIXTURE:entry-1');
  });

  it('labels a saved entry with the remove action', async () => {
    mockFavorites.add('FIXTURE:entry-1');
    await renderUi(<DuaHisnReaderActions entryKey="FIXTURE:entry-1" onShare={jest.fn()} onTextSize={jest.fn()} textSizeOpen={false} />);

    expect(screen.getByRole('button', { name: 'إزالة من المفضلة' })).toBeOnTheScreen();
  });

  it('calls share and text size, and nothing else (no play, no download)', async () => {
    const onShare = jest.fn();
    const onTextSize = jest.fn();
    await renderUi(<DuaHisnReaderActions entryKey="FIXTURE:entry-1" onShare={onShare} onTextSize={onTextSize} textSizeOpen={false} />);

    await press(screen.getByRole('button', { name: 'مشاركة' }));
    await press(screen.getByRole('button', { name: 'حجم النص' }));
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onTextSize).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('azkar-actions-play')).toBeNull();
    expect(screen.queryByTestId('azkar-download')).toBeNull();
  });

  it('reports the text size toggle as expanded when open', async () => {
    await renderUi(<DuaHisnReaderActions entryKey="FIXTURE:entry-1" onShare={jest.fn()} onTextSize={jest.fn()} textSizeOpen />);

    expect(screen.getByRole('button', { name: 'حجم النص' }).props.accessibilityState).toEqual({ expanded: true });
  });

  it('renders the English labels', async () => {
    await renderUi(<DuaHisnReaderActions entryKey="FIXTURE:entry-1" onShare={jest.fn()} onTextSize={jest.fn()} textSizeOpen={false} />, {
      locale: 'en',
    });

    expect(screen.getByRole('button', { name: 'Share' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add to favourites' })).toBeOnTheScreen();
  });
});
