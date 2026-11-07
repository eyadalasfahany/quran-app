// Checks screens/ (ADR 0075): index.html loads every frame file and only those, each frame page has
// the shared head and script, frame ids are unique, links between frames land on a frame or section,
// and images are files under design-assets/, never inlined as base64.
// Usage: node scripts/check-screens.mjs ../../screens
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

const dir = resolve(process.argv[2]);
const read = (f) => readFileSync(f, 'utf8');
const problems = [];
const warnings = [];

const index = read(join(dir, 'index.html'));
const ids = new Set([...index.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const loaded = [...index.matchAll(/<iframe class="gx-frame[^"]*" src="(frames\/[^"]+)" width="\d+" height="\d+"[^>]*>/g)].map(
  (m) => m[1],
);
if (!index.includes('<link rel="stylesheet" href="screens.css">')) problems.push('index.html: does not link screens.css');

const files = [];
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk(join(d, e.name));
    else if (e.name.endsWith('.html')) files.push(relative(dir, join(d, e.name)));
  }
};
walk(join(dir, 'frames'));

const seen = new Set();
for (const src of loaded) {
  const id = basename(src, '.html');
  if (seen.has(id)) problems.push(`frame id used twice: ${id}`);
  seen.add(id);
  if (!files.includes(src)) problems.push(`index.html loads a missing file: ${src}`);
  const fig = index.lastIndexOf('<div class="gx-fig" id="', index.indexOf(`src="${src}"`));
  if (!index.startsWith(`<div class="gx-fig" id="${id}"`, fig)) problems.push(`${src}: its frame in index.html is not id="${id}"`);
}
for (const f of files) if (!loaded.includes(f)) problems.push(`frame file not loaded by index.html: ${f}`);

const pages = [['index.html', index], ['screens.css', read(join(dir, 'screens.css'))]];
for (const f of files) {
  const page = read(join(dir, f));
  pages.push([f, page]);
  if (!page.includes('<link rel="stylesheet" href="../../screens.css">')) problems.push(`${f}: does not link ../../screens.css`);
  if (!page.includes('\n<script src="../../screens.js"></script>\n</body>')) problems.push(`${f}: does not end with ../../screens.js`);
  for (const m of page.matchAll(/href="\.\.\/\.\.\/index\.html#([^"]+)"/g)) {
    if (!ids.has(m[1])) warnings.push(`warning: ${f}: link to #${m[1]}, which is no frame or section`);
  }
}

for (const [f, text] of pages) {
  const inlined = text.match(/data:image\/[a-z0-9+.-]+;base64,/g);
  if (inlined) problems.push(`${f}: ${inlined.length} base64 image(s); save them under design-assets/ and use the path`);
  for (const m of new Set(text.match(/(?:\.\.\/)*design-assets\/[^)"'\s]+/g) ?? [])) {
    if (!existsSync(resolve(dirname(join(dir, f)), m))) problems.push(`${f}: missing image ${m}`);
  }
}

for (const p of [...warnings, ...problems]) console.log(p);
if (problems.length) process.exit(1);
console.log(`screens: ${loaded.length} frames, all loaded, linked and free of inlined images`);
