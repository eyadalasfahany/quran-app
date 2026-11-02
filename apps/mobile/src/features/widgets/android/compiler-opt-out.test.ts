import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// The widget functions are called directly to build RemoteViews trees, never rendered by React. The React Compiler
// (app.config `experiments.reactCompiler`) would memoise any PascalCase function returning JSX with a useMemoCache hook,
// which throws "Invalid hook call" outside a render. Jest doesn't run the compiler, so this guards the opt-out.
describe('Android widget files opt out of the React Compiler', () => {
  const files = readdirSync(__dirname).filter((name) => name.endsWith('.tsx') && !name.endsWith('.test.tsx'));

  it.each(files)('%s starts with the "use no memo" directive', (name) => {
    const source = readFileSync(path.join(__dirname, name), 'utf8');
    expect(source.startsWith("'use no memo';")).toBe(true);
  });
});
