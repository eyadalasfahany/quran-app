import {
  AYAH_SHEET_TOP,
  SETTINGS_SHEET_TOP,
  TAFSIR_SHEET_TOP,
  sheetHeight,
  sheetScreenOptions,
  sheetShapeFor,
  sheetTopFor,
} from './form-sheet';

describe('sheet presentation', () => {
  it('covers the design settings height and leaves the page above the card', () => {
    expect(sheetHeight(844, SETTINGS_SHEET_TOP)).toBe(844 - SETTINGS_SHEET_TOP);
  });

  it('opens the ayah sheet lower than settings', () => {
    expect(sheetHeight(844, AYAH_SHEET_TOP)).toBe(844 - AYAH_SHEET_TOP);
    expect(sheetHeight(844, AYAH_SHEET_TOP)).toBeLessThan(sheetHeight(844, SETTINGS_SHEET_TOP));
  });

  it('uses the phone frame when the window size is unknown', () => {
    expect(sheetHeight(0, SETTINGS_SHEET_TOP)).toBe(844 - SETTINGS_SHEET_TOP);
  });

  it('gives tafsir and translations the tall sheet, taller than settings', () => {
    expect(sheetTopFor('actions')).toBe(AYAH_SHEET_TOP);
    expect(sheetTopFor('tafsir')).toBe(TAFSIR_SHEET_TOP);
    expect(sheetTopFor('translation')).toBe(TAFSIR_SHEET_TOP);
    expect(sheetHeight(844, TAFSIR_SHEET_TOP)).toBeGreaterThan(sheetHeight(844, SETTINGS_SHEET_TOP));
    expect(sheetShapeFor('actions')).toBe('card');
    expect(sheetShapeFor('tafsir')).toBe('full');
  });

  it('lays over the screen behind it instead of pushing that screen, fading in its scrim', () => {
    expect(sheetScreenOptions.presentation).toBe('transparentModal');
    expect(sheetScreenOptions.animation).toBe('fade');
    expect(sheetScreenOptions.contentStyle.backgroundColor).toBe('transparent');
    expect(sheetScreenOptions.gestureDirection).toBe('vertical');
  });
});
