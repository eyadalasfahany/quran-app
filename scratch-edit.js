const fs = require('fs');
const path = require('path');
const base = 'D:/projects/quran-app/apps/mobile/';
// Each edit: file, list of [old, new] pairs. Files are read as LF, edited, written back in their own line ending.
module.exports = function apply(file, pairs) {
  const p = path.join(base, file);
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');
  for (const [a, b] of pairs) {
    const count = s.split(a).length - 1;
    if (count !== 1) throw new Error(`${file}: expected 1 match, found ${count} for: ${a.slice(0, 90)}`);
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s);
  console.log(`${file}: ${pairs.length} edit(s), ${crlf ? 'CRLF' : 'LF'}`);
};
