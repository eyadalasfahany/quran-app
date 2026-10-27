import { resetReaderSelection, useReaderSelection } from './selection';

describe('reader selection', () => {
  beforeEach(() => {
    resetReaderSelection();
  });

  it('opens the panel on an expanded window and keeps the last tab', () => {
    useReaderSelection.getState().setPanelTab('tafsir');
    useReaderSelection.getState().selectVerse('2:255', 'docked');

    expect(useReaderSelection.getState()).toMatchObject({
      panelOpen: true,
      panelTab: 'tafsir',
      verseKey: '2:255',
    });
  });

  it('opens the panel when the window overlays it', () => {
    useReaderSelection.getState().selectVerse('2:255', 'overlay');

    expect(useReaderSelection.getState().panelOpen).toBe(true);
    expect(useReaderSelection.getState().verseKey).toBe('2:255');
  });

  it('keeps the verse without opening the panel when the window uses a sheet', () => {
    useReaderSelection.getState().selectVerse('2:255', 'sheet');

    expect(useReaderSelection.getState().verseKey).toBe('2:255');
    expect(useReaderSelection.getState().panelOpen).toBe(false);
  });
});
