import { rawColorLiterals, sharedUiFiles } from '../../../jest/ui-source';

import * as ui from './index';

const sources = sharedUiFiles().filter((file) => !/\.test\.tsx?$/.test(file));
const components = sources.filter((file) => /^[A-Z]\w*\.tsx$/.test(file)).map((file) => file.replace(/\.tsx$/, ''));

describe('shared ui', () => {
  it('finds the component files', () => {
    expect(components.length).toBeGreaterThan(10);
  });

  it.each(components)('exports %s from the index', (name) => {
    expect(ui).toHaveProperty(name);
  });

  it.each(components.filter((name) => !name.startsWith('Sidebar')))('gives %s a colocated test', (name) => {
    expect(sharedUiFiles()).toContain(`${name}.test.tsx`);
  });

  it.each(sources)('keeps raw colour literals out of %s', (file) => {
    expect(rawColorLiterals(file)).toEqual([]);
  });
});
