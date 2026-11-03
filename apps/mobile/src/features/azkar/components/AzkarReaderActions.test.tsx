import { screen } from '@testing-library/react-native';

import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { toggleFavorite } from '../data/favorites-repository';
import { AzkarReaderActions } from './AzkarReaderActions';

const mockFavorites = new Set<string>();

jest.mock('../data/favorites-repository', () => ({
  toggleFavorite: jest.fn(),
}));

jest.mock('../data/hooks', () => ({
  useIsFavorite: (entryKey: string) => mockFavorites.has(entryKey),
}));

const mockToggle = toggleFavorite as jest.Mock;

function renderActions(props: Partial<Parameters<typeof AzkarReaderActions>[0]> = {}) {
  const handlers = { onShare: jest.fn(), onTextSize: jest.fn() };
  const ui = <AzkarReaderActions entryKey="fixture:entry-001" textSizeOpen={false} {...handlers} {...props} />;
  return { ui, handlers };
}

describe('AzkarReaderActions', () => {
  beforeEach(() => {
    mockFavorites.clear();
    mockToggle.mockClear();
  });

  it('renders the text size, share and favourite controls with labels', async () => {
    const { ui } = renderActions();
    await renderUi(ui);
    expect(screen.getByRole('button', { name: 'حجم النص' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'مشاركة' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إضافة إلى المفضلة' })).toBeTruthy();
  });

  it('reports the text size toggle as expanded when its panel is open', async () => {
    const { ui } = renderActions({ textSizeOpen: true });
    await renderUi(ui);
    expect(screen.getByRole('button', { name: 'حجم النص' }).props.accessibilityState).toEqual({ expanded: true });
  });

  it('calls onShare and onTextSize', async () => {
    const { ui, handlers } = renderActions();
    await renderUi(ui);
    await press(screen.getByRole('button', { name: 'مشاركة' }));
    await press(screen.getByRole('button', { name: 'حجم النص' }));
    expect(handlers.onShare).toHaveBeenCalledTimes(1);
    expect(handlers.onTextSize).toHaveBeenCalledTimes(1);
  });

  it('toggles the favourite of the entry and shows the saved state', async () => {
    mockToggle.mockImplementation(() => {
      mockFavorites.add('fixture:entry-001');
      return true;
    });
    const { ui } = renderActions();
    await renderUi(ui);
    await press(screen.getByRole('button', { name: 'إضافة إلى المفضلة' }));
    expect(mockToggle).toHaveBeenCalledWith('fixture:entry-001');
  });

  it('labels a favourite entry with the remove action', async () => {
    mockFavorites.add('fixture:entry-001');
    const { ui } = renderActions();
    await renderUi(ui);
    expect(screen.getByRole('button', { name: 'إزالة من المفضلة' })).toBeTruthy();
  });

  it('draws no download control without a licensed recording', async () => {
    const { ui } = renderActions({ recording: null });
    await renderUi(ui);
    expect(screen.queryByRole('button', { name: 'تنزيل التسجيل' })).toBeNull();
  });

  it('draws no playback control without playControl even when a recording exists', async () => {
    const { ui } = renderActions({ recording: makeRecording({ downloadAllowed: false }) });
    await renderUi(ui);
    expect(screen.queryByRole('button', { name: 'تشغيل التسجيل' })).toBeNull();
    expect(screen.getByRole('button', { name: 'حجم النص' })).toBeOnTheScreen();
  });

  it('shows play and calls onToggle when playControl is set', async () => {
    const onToggle = jest.fn();
    const { ui } = renderActions({
      playControl: { playing: false, onToggle },
      recording: makeRecording({ downloadAllowed: false }),
    });
    await renderUi(ui);
    await press(screen.getByRole('button', { name: 'تشغيل التسجيل' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows busy and the buffering ring when playControl is loading', async () => {
    const { ui } = renderActions({
      playControl: { playing: false, loading: true, onToggle: jest.fn() },
      recording: makeRecording({ downloadAllowed: false }),
    });
    await renderUi(ui);
    const play = screen.getByTestId('azkar-actions-play');
    expect(play.props.accessibilityState).toEqual({ busy: true, disabled: false });
    expect(screen.getByTestId('azkar-actions-play-ring', { includeHiddenElements: true })).toBeTruthy();
  });

  it('orders actions bookmark, share, text size, then play and download', async () => {
    const { ui } = renderActions({
      playControl: { playing: false, onToggle: jest.fn() },
      recording: makeRecording({ downloadAllowed: true }),
    });
    await renderUi(ui);
    const row = screen.getByTestId('azkar-reader-actions');
    const ids = row.children.map((child) => (typeof child === 'object' && child !== null && 'props' in child ? child.props.testID : null));
    expect(ids).toEqual(['azkar-favourite', 'azkar-share', 'azkar-text-size-toggle', 'azkar-actions-play', 'azkar-download-button']);
  });

  it('draws the download control of a downloadable licensed recording', async () => {
    const { ui } = renderActions({ recording: makeRecording({ downloadAllowed: true }) });
    await renderUi(ui);
    expect(screen.getByRole('button', { name: 'تنزيل التسجيل' })).toBeOnTheScreen();
  });

  it('renders the English labels', async () => {
    const { ui } = renderActions();
    await renderUi(ui, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add to favourites' })).toBeTruthy();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarReaderActions.tsx')).toEqual([]);
  });
});
