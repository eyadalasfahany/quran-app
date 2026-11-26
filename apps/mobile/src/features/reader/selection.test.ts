import { pressedVerseKey, resetReaderSelection, useReaderSelection } from './selection';

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

  it('toggles inline tafsir mode and resets with the store', () => {
    expect(useReaderSelection.getState().inlineTafsirOpen).toBe(false);

    useReaderSelection.getState().toggleInlineTafsir();
    expect(useReaderSelection.getState().inlineTafsirOpen).toBe(true);

    useReaderSelection.getState().toggleInlineTafsir();
    expect(useReaderSelection.getState().inlineTafsirOpen).toBe(false);

    useReaderSelection.getState().toggleInlineTafsir();
    resetReaderSelection();
    expect(useReaderSelection.getState().inlineTafsirOpen).toBe(false);
  });

  it('sets and clears the sheet verse, and resets with the store', () => {
    useReaderSelection.getState().setSheetVerseKey('1:2');
    expect(useReaderSelection.getState().sheetVerseKey).toBe('1:2');

    useReaderSelection.getState().setSheetVerseKey(null);
    expect(useReaderSelection.getState().sheetVerseKey).toBeNull();

    useReaderSelection.getState().setSheetVerseKey('1:3');
    resetReaderSelection();
    expect(useReaderSelection.getState().sheetVerseKey).toBeNull();
  });

  it('the pressed ayah is the sheet verse when the panel is closed, and the panel verse when it is open', () => {
    useReaderSelection.getState().setSheetVerseKey('1:2');
    useReaderSelection.getState().selectVerse('2:255', 'docked');
    expect(pressedVerseKey(useReaderSelection.getState())).toBe('2:255');

    useReaderSelection.getState().closePanel();
    expect(pressedVerseKey(useReaderSelection.getState())).toBe('1:2');
  });

  it('has no pressed ayah when neither the sheet nor the panel is open', () => {
    expect(pressedVerseKey(useReaderSelection.getState())).toBeNull();

    useReaderSelection.getState().selectVerse('2:255', 'sheet');
    expect(pressedVerseKey(useReaderSelection.getState())).toBeNull();
  });
});
