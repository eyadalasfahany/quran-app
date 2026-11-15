import { databaseLocation, svgMushafPackDirectory, svgMushafPackPath, svgMushafPartPath } from './paths';

describe('svg mushaf paths', () => {
  it('keeps packs in the documents directory, one file per riwayah and version', () => {
    expect(svgMushafPackDirectory()).toBe('file:///documents/packs');
    expect(svgMushafPackPath('hafs', 3)).toBe('file:///documents/packs/svg-mushaf-hafs-3.db');
    expect(svgMushafPartPath('warsh', 2)).toBe('file:///documents/packs/svg-mushaf-warsh-2.db.part');
  });

  it('splits a file URI into the name and directory for the database opener', () => {
    expect(databaseLocation('file:///documents/packs/svg-mushaf-hafs-3.db')).toEqual({
      name: 'svg-mushaf-hafs-3.db',
      directory: '/documents/packs',
    });
  });

  it('decodes spaces written as %20', () => {
    expect(databaseLocation('file:///Users/me/Application%20Support/packs/a.db')).toEqual({
      name: 'a.db',
      directory: '/Users/me/Application Support/packs',
    });
  });

  it('accepts a plain path without the file scheme', () => {
    expect(databaseLocation('/var/tmp/x.db')).toEqual({ name: 'x.db', directory: '/var/tmp' });
  });
});
