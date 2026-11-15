import { screen } from '@testing-library/react-native';

import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { toggleAzkarFavorite } from '@/features/azkar/data';
import { DuaHisnReaderActions } from './DuaHisnReaderActions';

const mockFavorites = new Set<string>();

// The Azkar favourite of the entry, as the Azkar reader uses it: one favourite per entry key.
jest.mock('@/features/azkar/data', () => ({
  toggleAzkarFavorite: jest.fn(),
  useIsFavorite: (entryKey: string) => mockFavorites.has(entryKey),
}));

const mockToggle = toggleAzkarFavorite as jest.Mock;

const PLAY = 'تشغيل التسجيل';
const PAUSE = 'إيقاف التسجيل مؤقتًا';
const DOWNLOAD = 'تنزيل التسجيل';

function baseProps(overrides: Partial<Parameters<typeof DuaHisnReaderActions>[0]> = {}) {
  return {
    entryKey: 'FIXTURE:entry-1',
    onShare: jest.fn(),
    onTextSize: jest.fn(),
    textSizeOpen: false,
    ...overrides,
  };
}

describe('DuaHisnReaderActions', () => {
  beforeEach(() => {
    mockFavorites.clear();
    mockToggle.mockClear();
  });

  it('toggles the Azkar favourite of the entry it is given', async () => {
    await renderUi(<DuaHisnReaderActions {...baseProps()} />);

    await press(screen.getByRole('button', { name: 'إضافة إلى المفضلة' }));
    expect(mockToggle).toHaveBeenCalledWith('FIXTURE:entry-1');
  });

  it('labels a saved entry with the remove action', async () => {
    mockFavorites.add('FIXTURE:entry-1');
    await renderUi(<DuaHisnReaderActions {...baseProps()} />);

    expect(screen.getByRole('button', { name: 'إزالة من المفضلة' })).toBeOnTheScreen();
  });

  it('calls share and text size', async () => {
    const onShare = jest.fn();
    const onTextSize = jest.fn();
    await renderUi(<DuaHisnReaderActions {...baseProps({ onShare, onTextSize })} />);

    await press(screen.getByRole('button', { name: 'مشاركة' }));
    await press(screen.getByRole('button', { name: 'حجم النص' }));
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onTextSize).toHaveBeenCalledTimes(1);
  });

  it('reports the text size toggle as expanded when open', async () => {
    await renderUi(<DuaHisnReaderActions {...baseProps({ textSizeOpen: true })} />);

    expect(screen.getByRole('button', { name: 'حجم النص' }).props.accessibilityState).toEqual({ expanded: true });
  });

  it('draws no play control and no download when neither is given (no recording, or offline)', async () => {
    await renderUi(<DuaHisnReaderActions {...baseProps()} />);

    expect(screen.queryByTestId('dua-hisn-play')).toBeNull();
    expect(screen.queryByRole('button', { name: PLAY })).toBeNull();
    expect(screen.queryByRole('button', { name: DOWNLOAD })).toBeNull();
  });

  it('draws the play control with the Azkar label and calls its toggle', async () => {
    const onToggle = jest.fn();
    await renderUi(<DuaHisnReaderActions {...baseProps({ playControl: { playing: false, loading: false, onToggle } })} />);

    await press(screen.getByRole('button', { name: PLAY }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows the pause label while the recording plays', async () => {
    await renderUi(<DuaHisnReaderActions {...baseProps({ playControl: { playing: true, loading: false, onToggle: jest.fn() } })} />);

    expect(screen.getByRole('button', { name: PAUSE })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: PLAY })).toBeNull();
  });

  it('shows the pause glyph while the recording loads', async () => {
    await renderUi(<DuaHisnReaderActions {...baseProps({ playControl: { playing: false, loading: true, onToggle: jest.fn() } })} />);

    expect(screen.getByRole('button', { name: PAUSE })).toBeOnTheScreen();
  });

  it('draws the download control for a recording that allows it', async () => {
    await renderUi(<DuaHisnReaderActions {...baseProps({ recording: makeRecording({ downloadAllowed: true }) })} />);

    expect(screen.getByRole('button', { name: DOWNLOAD })).toBeOnTheScreen();
  });

  it('draws no download for a recording without download rights, but keeps play', async () => {
    await renderUi(
      <DuaHisnReaderActions
        {...baseProps({
          recording: makeRecording({ downloadAllowed: false }),
          playControl: { playing: false, loading: false, onToggle: jest.fn() },
        })}
      />,
    );

    expect(screen.queryByRole('button', { name: DOWNLOAD })).toBeNull();
    expect(screen.getByRole('button', { name: PLAY })).toBeOnTheScreen();
  });

  it('renders the English labels, including the audio ones', async () => {
    await renderUi(
      <DuaHisnReaderActions
        {...baseProps({
          recording: makeRecording({ downloadAllowed: true }),
          playControl: { playing: false, loading: false, onToggle: jest.fn() },
        })}
      />,
      { locale: 'en' },
    );

    expect(screen.getByRole('button', { name: 'Share' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add to favourites' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Play recording' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Download recording' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/DuaHisnReaderActions.tsx')).toEqual([]);
  });
});
