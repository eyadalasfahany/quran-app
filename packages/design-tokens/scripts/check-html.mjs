// Checks src/ against the CSS tokens and type specimens in quran-app-design-system.html (ADR 0005).
// Usage: npm run check:html -w @quran/design-tokens
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [html, pkg] = process.argv.slice(2);
const src = (f) => import(pathToFileURL(`${pkg}/src/${f}`).href);
const { colors, shadows, highContrast } = await src('colors.ts');
const { space, radius, blur } = await src('scale.ts');
const { fontFamilies, typeScale, quranTypeScale } = await src('typography.ts');
const { duration, easing, spring } = await src('motion.ts');

const text = readFileSync(html, 'utf8');
const style = text.split('\n')[2].replace(/:\{([a-z-]+)\}/g, ':@$1');
const blocks = {};
for (const m of style.matchAll(/(:root,\[data-theme=light\]|\[data-theme=(sepia|dark)\])\{([^}]*)\}/g)) {
  const name = m[2] ?? 'light';
  if (blocks[name]) continue;
  blocks[name] = Object.fromEntries(
    m[3].split(';').filter(Boolean).map((d) => {
      const i = d.indexOf(':');
      return [d.slice(2, i), d.slice(i + 1).trim()];
    }),
  );
}
for (const t of ['sepia', 'dark']) blocks[t] = { ...blocks.light, ...blocks[t] };

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const resolve = (vars, v) => v.replace(/^@(.+)$/, (_, ref) => vars[ref]);
let mismatches = 0;
let checked = 0;
const check = (where, expected, actual) => {
  checked++;
  if (String(expected) !== String(actual)) {
    mismatches++;
    console.log(`MISMATCH ${where}: html=${expected} ts=${actual}`);
  }
};

for (const theme of ['light', 'sepia', 'dark']) {
  const vars = blocks[theme];
  const seen = new Set();
  for (const [k, v] of Object.entries(vars)) {
    const val = resolve(vars, v);
    if (k.startsWith('shadow-')) check(`${theme}.${k}`, val, shadows[theme][camel(k.slice(7))]);
    else if (k.startsWith('space-')) check(`${theme}.${k}`, val, `${space[k.slice(6)]}px`);
    else if (k.startsWith('radius-')) check(`${theme}.${k}`, val, `${radius[k.slice(7)]}px`);
    else if (k.startsWith('blur-')) check(`${theme}.${k}`, val, `${blur[k.slice(5)]}px`);
    else if (k.startsWith('font-')) check(`${theme}.${k}`, val.split(',')[0].replaceAll('"', ''), fontFamilies[camel(k.slice(5))]);
    else if (k.startsWith('duration-')) check(`${theme}.${k}`, val, `${duration[k.slice(9)]}ms`);
    else if (k.startsWith('ease-')) check(`${theme}.${k}`, val, `cubic-bezier(${easing[camel(k)]?.join(', ')})`);
    else if (k === 'spring-duration') check(`${theme}.${k}`, val, `${spring.duration}ms`);
    else if (k.startsWith('spring-')) check(`${theme}.${k}`, val, spring[camel(k.slice(7))]);
    else {
      seen.add(camel(k));
      check(`${theme}.${k}`, val, colors[theme][camel(k)]);
    }
  }
  for (const k of Object.keys(colors[theme])) if (!seen.has(k)) check(`${theme}.${k} (extra in ts)`, 'absent', colors[theme][k]);
}

// Increase Contrast blocks: [data-theme=X][data-contrast=more]{...}
for (const theme of ['light', 'sepia', 'dark']) {
  const m = style.match(new RegExp(`\\[data-theme=${theme}\\]\\[data-contrast=more\\]\\{([^}]*)\\}`));
  if (!m) { check(`${theme}.contrast-more`, 'present', 'missing'); continue; }
  const vars = Object.fromEntries(m[1].split(';').filter(Boolean).map((d) => [d.slice(2, d.indexOf(':')), d.slice(d.indexOf(':') + 1).trim()]));
  for (const [k, v] of Object.entries(vars)) check(`${theme}.contrast-more.${k}`, v, highContrast[theme][camel(k)]);
  for (const k of Object.keys(highContrast[theme])) if (!(k in Object.fromEntries(Object.keys(vars).map((v) => [camel(v), 1])))) check(`${theme}.contrast-more.${k} (extra in ts)`, 'absent', highContrast[theme][k]);
}

// Type specimens: <code>name</code> <span ...>size / lineHeight / weight</span>
for (const m of text.matchAll(/<code>([a-z-]+)<\/code> <span class="muted mono">(\d+)px \/ ([\d.]+)(px)? \/ (\d+)<\/span>/g)) {
  const [, name, size, lh, px, weight] = m;
  const key = camel(name);
  const tok = typeScale[key] ?? quranTypeScale[key];
  if (!tok) { check(`type.${name}`, 'present', 'missing'); continue; }
  check(`type.${name}.size`, size, tok.size);
  check(`type.${name}.lineHeight`, lh, px ? tok.lineHeight : tok.lineHeightRatio);
  check(`type.${name}.weight`, weight, tok.weight);
}

console.log(`checked ${checked} values, ${mismatches} mismatches`);
process.exit(mismatches ? 1 : 0);
