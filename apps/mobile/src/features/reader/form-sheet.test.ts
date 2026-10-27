import { AYAH_SHEET_TOP, SETTINGS_SHEET_TOP, sheetHeight, sheetScreenOptions } from './form-sheet';

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

  it('slides over the screen behind it instead of pushing that screen', () => {
    expect(sheetScreenOptions.presentation).toBe('transparentModal');
    expect(sheetScreenOptions.animation).toBe('slide_from_bottom');
    expect(sheetScreenOptions.contentStyle.backgroundColor).toBe('transparent');
    expect(sheetScreenOptions.gestureDirection).toBe('vertical');
  });
});
