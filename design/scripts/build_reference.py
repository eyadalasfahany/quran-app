#!/usr/bin/env python3
"""Build the Taybah design reference: one folder per stack, one folder per screen.

Input: design/screens/ (the lean extraction of quran-app-screens.html, see design/screens/AGENTS.md),
packages/design-tokens/src/colors.ts and the app's i18n files. Neither the monolith nor
design/screens is changed.

Output, for every screen:
  design/<stack>/<Screen>/index.html     canvas: every size x theme x direction
  design/<stack>/<Screen>/light-rtl.html standalone variant documents (four of them); the window
  design/<stack>/<Screen>/dark-rtl.html  size is applied at view time by common/frame.js
  design/<stack>/<Screen>/light-ltr.html (?size=compact|medium|expanded|landscape)
  design/<stack>/<Screen>/dark-ltr.html
plus design/<stack>/index.html, design/index.html, design/CATALOG.md and common/catalog.js.

A variant is "drawn" when the designer drew it (a *Dark or *English frame), or "derived":
- dark: every inline colour goes through the light->dark mapping learned from the drawn pairs,
  falling back to the design tokens;
- LTR: the layout is mirrored (dir, physical sides, chevrons) and UI strings are translated
  from the app's ar.json/en.json, the drawn English frames and scripts/ltr-strings.json.
Quran, dhikr, dua and hadith text is never translated or changed: it stays byte-for-byte and RTL.

usage: python design/scripts/build_reference.py
"""
from __future__ import annotations

import collections
import json
import re
import shutil
import sys
from html import escape
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dom import Node, parse, serialize, walk  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DESIGN = ROOT / 'design'
SRC = DESIGN / 'screens'
COMMON = DESIGN / 'common'
LOCALES = ROOT / 'apps' / 'mobile' / 'src' / 'core' / 'i18n' / 'locales'
TOKENS = ROOT / 'packages' / 'design-tokens' / 'src' / 'colors.ts'
EXTRA = Path(__file__).resolve().parent / 'ltr-strings.json'

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri+Quran'
         '&family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700'
         '&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">')

STACK_TITLES = {
    'core': ('Core flow', 'Home, mushaf, ayah actions, player, reader settings'),
    'reading': ('Reading', 'Surah index, search, reading and focus modes, tafsir'),
    'salah': ('Salah', 'Prayer times, adhan, qibla'),
    'azkar': ('Azkar', 'Azkar home, reader, player, reminders, downloads'),
    'duas': ('Duas', 'Duas and my duas'),
    'menu': ('Menu', 'Menu tab'),
    'menu-v2': ('Menu v2', 'Menu card redesign'),
    'home': ('Home and misbaha', 'Home additions and the misbaha'),
    'onboarding': ('Onboarding', 'First run'),
    'account': ('Account', 'Sign in, khatma, downloads, account'),
    'states': ('States', 'Loading, offline and other states'),
    'hadith': ('Hadith', 'Collections, books, hadith detail'),
    'asmaa': ('Names of Allah', 'Asmaa al-husna list and detail'),
    'hijri': ('Hijri calendar', 'Calendar and date adjustment'),
    'moon': ('Moon sighting', 'Crescent visibility'),
    'entry-points': ('Entry points', 'Menu cards and the home Hijri line'),
    'widgets': ('Widgets', 'iOS and Android widgets'),
    'watch': ('Watch', 'Apple Watch'),
    'expanded': ('Tablet frames', 'Drawn medium and expanded windows'),
    'discover': ('Discover Taybah', 'Discover card, screen and tips'),
    'my-quran': ('My Quran', 'Bookmarks, notes, highlights'),
    'audio': ('Audio', 'Reciters and buffering'),
    'settings': ('Settings', 'Settings, adhan sound, sources'),
}
# Boards that are not app windows: shown at their drawn size only.
FIXED_STACKS = {'widgets', 'watch'}
# Frames that are other states of a screen with a different id.
ALIASES = {'HomeDark': ('Main', 'dark-rtl'), 'HomeEnglish': ('Main', 'light-ltr')}
# Screens whose content is a Quran page or an instrument: in LTR only the chrome direction
# changes; the drawing itself is not mirrored.
NO_MIRROR = {'Mushaf', 'LoadingMushaf', 'Qibla', 'QiblaLandscape', 'Reading', 'Focus',
             'ReadingMiniIdle', 'ReadingMiniCollapsed'}
VARIANTS = ['light-rtl', 'dark-rtl', 'light-ltr', 'dark-ltr']
# Drawn frames that show another screen at a different window size. 'landscape' replaces the
# derived short window; 'related' are linked from the inspector (the drawn tablet frames still
# draw the sidebar that ADR 0051 retired, so the derived expanded window stays the default).
SIZE_FRAMES = {
    'Main': {'landscape': 'MainLandscapeRail', 'related': ['ExpandedHome', 'ExpandedHomeDark']},
    'Qibla': {'landscape': 'QiblaLandscape'},
    'Sibha': {'landscape': 'SibhaLandscape'},
    'AzkarReader': {'related': ['AzkarExpanded']},
    'AyahSheet': {'related': ['ReaderMedium', 'ReaderExpandedActions']},
    'Tafsir': {'related': ['ReaderExpandedTafsir', 'ReaderOverlayTafsir']},
    'Mushaf': {'related': ['ReaderExpandedDark']},
}

# --------------------------------------------------------------------------------------------
# colours

COLOR_RE = re.compile(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)')


def canon(c: str):
    c = c.strip().lower()
    if c.startswith('#'):
        h = c[1:]
        if len(h) in (3, 4):
            h = ''.join(ch * 2 for ch in h)
        if len(h) not in (6, 8):
            return None
        r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
        return (r, g, b, round(a, 3))
    m = re.match(r'rgba?\(([^)]*)\)', c)
    if not m:
        return None
    parts = [p for p in re.split(r'[\s,/]+', m.group(1)) if p]
    try:
        r, g, b = (round(float(p)) for p in parts[:3])
        a = float(parts[3].rstrip('%')) / (100 if parts[3].endswith('%') else 1) if len(parts) > 3 else 1.0
    except ValueError:
        return None
    return (r, g, b, round(a, 3))


def fmt(t) -> str:
    r, g, b, a = t
    if a >= 1:
        return f'rgb({r}, {g}, {b})'
    return f'rgba({r}, {g}, {b}, {("%.3f" % a).rstrip("0").rstrip(".")})'


def group(prop: str) -> str:
    if prop.startswith('border') or prop.startswith('outline'):
        return 'border'
    if prop.startswith('background'):
        return 'background'
    if prop in ('color', 'caret-color', '-webkit-text-fill-color'):
        return 'color'
    if prop in ('@fill', '@stroke', '@stop-color', 'fill', 'stroke', 'stop-color'):
        return 'svg'
    if prop.endswith('shadow'):
        return 'shadow'
    return 'other'


def color_props(n: Node):
    """(prop, value) pairs that may hold colours: inline style plus SVG paint attributes."""
    out = [(k, v) for k, v in n.style()]
    for a in ('fill', 'stroke', 'stop-color'):
        if a in n.attrs and n.attrs[a]:
            out.append(('@' + a, n.attrs[a]))
    return out


def context(n: Node, g: str):
    """The colour that tells two uses of one value apart (brand fill vs brand text)."""
    other = 'color' if g == 'background' else 'background'
    for k, v in n.style():
        if group(k) == other:
            cs = COLOR_RE.findall(v)
            if cs:
                return canon(cs[0])
    return None


class ColorMap:
    def __init__(self):
        self.ctx = collections.defaultdict(collections.Counter)
        self.grp = collections.defaultdict(collections.Counter)
        self.any = collections.defaultdict(collections.Counter)
        self.tokens: dict = {}

    def learn(self, a: Node, b: Node):
        da, db = dict(color_props(a)), dict(color_props(b))
        for k, va in da.items():
            vb = db.get(k)
            if vb is None:
                continue
            ca, cb = COLOR_RE.findall(va), COLOR_RE.findall(vb)
            if not ca or len(ca) != len(cb):
                continue
            g = group(k)
            cx = context(a, g)
            for x, y in zip(ca, cb):
                x, y = canon(x), canon(y)
                if x is None or y is None:
                    continue
                self.ctx[(g, x, cx)][y] += 1
                self.grp[(g, x)][y] += 1
                self.any[x][y] += 1

    def lookup(self, g, c, cx):
        for table, key in ((self.ctx, (g, c, cx)), (self.grp, (g, c)), (self.any, c)):
            if key in table:
                return table[key].most_common(1)[0][0]
        if c in self.tokens:
            return self.tokens[c]
        # same colour at another alpha (glass fills, scrims)
        for k, v in self.tokens.items():
            if k[:3] == c[:3]:
                return (*v[:3], c[3])
        return None

    def apply(self, root: Node):
        for n in walk(root):
            if n.tag in ('#text', '#root'):
                continue
            new = []
            changed = False
            for k, v in n.style():
                g = group(k)
                if COLOR_RE.search(v):
                    cx = context(n, g)

                    def sub(m):
                        c = canon(m.group(0))
                        t = self.lookup(g, c, cx) if c else None
                        return fmt(t) if t and t != c else m.group(0)
                    v2 = COLOR_RE.sub(sub, v)
                    changed |= v2 != v
                    v = v2
                new.append([k, v])
            if changed:
                n.set_style(new)
            for a in ('fill', 'stroke', 'stop-color'):
                v = n.attrs.get(a)
                if v and COLOR_RE.fullmatch(v.strip()):
                    c = canon(v)
                    t = self.lookup('svg', c, None)
                    if t and t != c:
                        n.attrs[a] = fmt(t)


def token_tables():
    s = TOKENS.read_text(encoding='utf-8')

    def block(name):
        m = re.search(name + r': \{(.*?)\n  \}', s, re.S)
        return dict(re.findall(r"(\w+): '([^']+)'", m.group(1)))
    light, dark = block('light'), block('dark')
    l2d, d2l = {}, {}
    for k, lv in light.items():
        dv = dark.get(k)
        if not dv:
            continue
        lc, dc = canon(lv), canon(dv)
        if lc and dc:
            l2d.setdefault(lc, dc)
            d2l.setdefault(dc, lc)
    return l2d, d2l


# --------------------------------------------------------------------------------------------
# text

AR_LETTER = re.compile('[ء-يٱ-ۓ]')
SACRED_MARKS = re.compile('[ً-ٰٟۖ-ۭ﴾﴿]')
AR_DIGITS = str.maketrans('٠١٢٣٤٥٦٧٨٩٪٫٬', '0123456789%.,')
PLACEHOLDER_SACRED = re.compile(r'\[(نص|آية|الذكر|الحديث|الدعاء)')


def latin_digits(s: str) -> str:
    return s.translate(AR_DIGITS).replace('،', ',').replace('؛', ';').replace('؟', '?')


def vocalized(text: str) -> bool:
    """Quran, dhikr and dua text is fully vocalized; UI text has at most a shadda or tanween."""
    if '﴾' in text or '﴿' in text:
        return True
    letters = len(AR_LETTER.findall(text))
    return letters > 0 and len(SACRED_MARKS.findall(text)) / letters >= 0.25


def is_sacred(text: str, node: Node) -> bool:
    if vocalized(text) or PLACEHOLDER_SACRED.search(text):
        return True
    p = node
    while p is not None and p.tag != '#root':
        ff = p.get('font-family') or ''
        if 'Quran' in ff or p.attrs.get('lang') == 'ar':
            return True
        p = p.parent
    return False


class Translator:
    def __init__(self):
        def flat(d, p=''):
            for k, v in d.items():
                if isinstance(v, dict):
                    yield from flat(v, p + k + '.')
                else:
                    yield p + k, v
        ar = dict(flat(json.loads((LOCALES / 'ar.json').read_text(encoding='utf-8'))))
        en = dict(flat(json.loads((LOCALES / 'en.json').read_text(encoding='utf-8'))))
        extra = json.loads(EXTRA.read_text(encoding='utf-8'))
        self.exact: dict[str, str] = {}
        self.templates: list[tuple[re.Pattern, str]] = []
        self.surahs: dict[str, str] = extra['surahs']
        for k, v in extra['strings'].items():
            self.exact[latin_digits(k)] = v
        for k, v in ar.items():
            e = en.get(k)
            if not isinstance(v, str) or not isinstance(e, str) or not v.strip():
                continue
            if '{{' in v:
                names = re.findall(r'\{\{\s*(\w+)\s*\}\}', v)
                if not names or set(names) - set(re.findall(r'\{\{\s*(\w+)\s*\}\}', e)):
                    continue
                pat = ''
                for i, part in enumerate(re.split(r'\{\{\s*\w+\s*\}\}', v)):
                    pat += re.escape(latin_digits(part.strip() if i == 0 else part))
                    if i < len(names):
                        pat += f'(?P<{names[i]}_{i}>.+?)' if names.count(names[i]) > 1 else f'(?P<{names[i]}>.+?)'
                if len(AR_LETTER.findall(re.sub(r'\{\{\s*\w+\s*\}\}', '', v))) < 2:
                    continue
                try:
                    self.templates.append((re.compile('^' + pat.strip() + '$'), e))
                except re.error:
                    pass
            else:
                self.exact.setdefault(latin_digits(v.strip()), e)
        self.templates.sort(key=lambda t: -len(t[0].pattern))
        hm = extra.get('hijriMonths', {})
        gm = extra.get('months', {})
        wd = extra.get('weekdays', {})

        def alt(d):
            return '|'.join(sorted(map(re.escape, d), key=len, reverse=True))
        self.dates = [
            (re.compile(rf'^(\d+) ({alt(hm)}) (\d+)$'), lambda m: f'{m.group(1)} {hm[m.group(2)]} {m.group(3)}'),
            (re.compile(rf'^({alt(hm)}) (\d+)$'), lambda m: f'{hm[m.group(1)]} {m.group(2)}'),
            (re.compile(rf'^({alt(wd)}) (\d+) ({alt(gm)})$'),
             lambda m: f'{wd[m.group(1)]}, {m.group(2)} {gm[m.group(3)]}'),
            (re.compile(rf'^(\d+) ({alt(gm)})(?: (\d+))?$'),
             lambda m: f'{m.group(1)} {gm[m.group(2)]}' + (f' {m.group(3)}' if m.group(3) else '')),
            (re.compile(rf'^(\d+) ({alt(gm)}) [–-] (\d+) ({alt(gm)}) (\d+)$'),
             lambda m: f'{m.group(1)} {gm[m.group(2)]} – {m.group(3)} {gm[m.group(4)]} {m.group(5)}'),
            (re.compile(r'^(\d{1,2}):(\d{2}) (م|ص)$'),
             lambda m: f'{m.group(1)}:{m.group(2)} {"PM" if m.group(3) == "م" else "AM"}'),
            (re.compile(r'^([\d.,]+) كم$'), lambda m: f'{m.group(1)} km'),
            (re.compile(r'^([\d.,]+) م\.ب$'), lambda m: f'{m.group(1)} MB'),
            (re.compile(r'^(\d+) سورة$'), lambda m: f'{m.group(1)} surahs'),
            (re.compile(r'^أكملت (\d+) من (\d+)$'), lambda m: f'Done {m.group(1)} of {m.group(2)}'),
            (re.compile(r'^(\d+) من (\d+) أهداف$'), lambda m: f'{m.group(1)} of {m.group(2)} goals'),
            (re.compile(r'^إعادة الإرسال بعد ([\d:]+)$'), lambda m: f'Resend in {m.group(1)}'),
            (re.compile(r'^رقم (\d+)$'), lambda m: f'No. {m.group(1)}'),
            (re.compile(rf'^({alt(self.surahs)}) (\d+)$'), lambda m: f'{self.surahs[m.group(1)]} {m.group(2)}'),
        ]
        self.patterns = [
            (re.compile(r'^سورة (.+)$'), lambda m: 'Surah ' + self.word(m.group(1))),
            (re.compile(r'^الآية (\d+)$'), lambda m: f'Ayah {m.group(1)}'),
            (re.compile(r'^آية (\d+)$'), lambda m: f'Ayah {m.group(1)}'),
            (re.compile(r'^الآيات (\d+)\s*[-–]\s*(\d+)$'), lambda m: f'Ayahs {m.group(1)}–{m.group(2)}'),
            (re.compile(r'^صفحة (\d+)$'), lambda m: f'Page {m.group(1)}'),
            (re.compile(r'^ص (\d+)$'), lambda m: f'p. {m.group(1)}'),
            (re.compile(r'^الجزء (\d+)$'), lambda m: f'Juz {m.group(1)}'),
            (re.compile(r'^جزء (\d+)$'), lambda m: f'Juz {m.group(1)}'),
            (re.compile(r'^الحزب (\d+)$'), lambda m: f'Hizb {m.group(1)}'),
            (re.compile(r'^(\d+) من (\d+)$'), lambda m: f'{m.group(1)} of {m.group(2)}'),
            (re.compile(r'^اليوم (\d+) من (\d+)$'), lambda m: f'Day {m.group(1)} of {m.group(2)}'),
            (re.compile(r'^(\d+) (آيات|آية)$'), lambda m: f'{m.group(1)} ayahs'),
            (re.compile(r'^(\d+) (صفحات|صفحة)$'), lambda m: f'{m.group(1)} pages'),
            (re.compile(r'^(\d+) (دقائق|دقيقة|د)$'), lambda m: f'{m.group(1)} min'),
        ]

    def learn(self, ar: str, en: str):
        if ar and en and AR_LETTER.search(ar) and not AR_LETTER.search(en):
            self.exact.setdefault(latin_digits(ar.strip()), en.strip())

    def word(self, s: str):
        s = s.strip()
        return self.surahs.get(s) or self.exact.get(s)

    def one(self, s: str):
        s = s.strip()
        if not s:
            return s
        if not AR_LETTER.search(s):
            return s
        if s in self.exact:
            return self.exact[s]
        if s in self.surahs:
            return self.surahs[s]
        for rx, f in self.dates + self.patterns:
            m = rx.match(s)
            if m:
                try:
                    out = f(m)
                except TypeError:
                    out = None
                if out and None not in (out,) and not AR_LETTER.search(out):
                    return out
        for rx, e in self.templates:
            m = rx.match(s)
            if m:
                vals = {k.split('_')[0]: (self.word(v) or latin_digits(v)) for k, v in m.groupdict().items()}
                out = re.sub(r'\{\{\s*(\w+)\s*\}\}', lambda mm: vals.get(mm.group(1), mm.group(0)), e)
                if not AR_LETTER.search(out):
                    return out
        m = re.match(r'^(.+?) (\d{1,2}:\d{2} [مص])$', s)
        if m:
            a, b = self.one(m.group(1)), self.one(m.group(2))
            if a and b:
                return f'{a} {b}'
        if s.startswith('· ') and self.one(s[2:]):
            return '· ' + self.one(s[2:])
        if s.endswith(' ·') and self.one(s[:-2]):
            return self.one(s[:-2]) + ' ·'
        if s.endswith(':') and s[:-1].strip() in self.exact:
            return self.exact[s[:-1].strip()] + ':'
        return None

    def __call__(self, text: str):
        """English for a UI string, or None. Leading/trailing space is kept."""
        lead = text[:len(text) - len(text.lstrip())]
        trail = text[len(text.rstrip()):]
        s = latin_digits(text.strip())
        out = self.one(s)
        if out is None:
            for sep in (' · ', ' — ', ' – ', ' - ', ': ', ', '):
                if sep.strip() in s or sep in s:
                    parts = s.split(sep) if sep in s else None
                    if parts and len(parts) > 1:
                        tr = [self.one(p) for p in parts]
                        if all(t is not None for t in tr):
                            out = sep.join(tr)
                            break
        if out is None:
            return None
        return lead + out + trail


# --------------------------------------------------------------------------------------------
# mirroring

SIDE_SWAP = {}
for a, b in [('left', 'right'), ('margin-left', 'margin-right'), ('padding-left', 'padding-right'),
             ('border-left', 'border-right'), ('border-top-left-radius', 'border-top-right-radius'),
             ('border-bottom-left-radius', 'border-bottom-right-radius')]:
    SIDE_SWAP[a], SIDE_SWAP[b] = b, a
for suf in ('-color', '-width', '-style'):
    SIDE_SWAP['border-left' + suf], SIDE_SWAP['border-right' + suf] = 'border-right' + suf, 'border-left' + suf
FOUR = {'margin', 'padding', 'inset', 'border-width', 'border-color', 'border-style', 'scroll-padding'}
DIRECTIONAL = re.compile('السابق|التالي|رجوع|ترجيع|تقديم|الخلف|الأمام')
CHEVRON = {'M9 6l6 6-6 6': 'M15 6l-6 6 6 6', 'M15 6l-6 6 6 6': 'M9 6l6 6-6 6',
           'M9 18l6-6-6-6': 'M15 18l-6-6 6-6', 'M15 18l-6-6 6-6': 'M9 18l6-6-6-6'}


def tokens(v: str):
    out, depth, cur = [], 0, ''
    for ch in v:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch.isspace() and depth == 0:
            if cur:
                out.append(cur)
            cur = ''
        else:
            cur += ch
    if cur:
        out.append(cur)
    return out


def neg(len_token: str) -> str:
    if len_token in ('0', '0px'):
        return len_token
    return len_token[1:] if len_token.startswith('-') else '-' + len_token


def mirror_value(k: str, v: str) -> str:
    if k in FOUR:
        t = tokens(v)
        if len(t) == 4:
            t[1], t[3] = t[3], t[1]
            return ' '.join(t)
        return v
    if k == 'border-radius' and '/' not in v:
        t = tokens(v)
        if len(t) == 4:
            return ' '.join([t[1], t[0], t[3], t[2]])
        if len(t) == 3:
            return ' '.join([t[1], t[0], t[1], t[2]])
        if len(t) == 2:
            return ' '.join([t[1], t[0]])
        return v
    if k in ('text-align', 'float', 'clear', 'justify-self'):
        return {'left': 'right', 'right': 'left'}.get(v, v)
    if k in ('transform', 'translate'):
        v = re.sub(r'translateX\(\s*([^)]+)\)', lambda m: f'translateX({neg(m.group(1).strip())})', v)
        v = re.sub(r'translate\(\s*([^,)]+)\s*,', lambda m: f'translate({neg(m.group(1).strip())},', v)
        v = re.sub(r'translate3d\(\s*([^,)]+)\s*,', lambda m: f'translate3d({neg(m.group(1).strip())},', v)
        return v
    if k in ('transform-origin', 'background-position', 'object-position'):
        return re.sub(r'\b(left|right)\b', lambda m: 'right' if m.group(1) == 'left' else 'left', v)
    if k.startswith('background') and 'gradient' in v:
        v = re.sub(r'\bto (left|right)\b', lambda m: 'to ' + ('right' if m.group(1) == 'left' else 'left'), v)
        v = re.sub(r'linear-gradient\(\s*(-?[\d.]+)deg',
                   lambda m: f'linear-gradient({(360 - float(m.group(1))) % 360:g}deg', v)
        return v
    if k == 'box-shadow' or k == 'text-shadow':
        def flip(seg):
            parts = tokens(seg.strip())
            for i, p in enumerate(parts):
                if re.match(r'^-?[\d.]+(px)?$', p):
                    parts[i] = neg(p)
                    break
            return ' '.join(parts)
        segs, depth, cur = [], 0, ''
        for ch in v:
            depth += ch == '('
            depth -= ch == ')'
            if ch == ',' and depth == 0:
                segs.append(cur)
                cur = ''
            else:
                cur += ch
        segs.append(cur)
        return ', '.join(flip(s) for s in segs)
    return v


def mirror(root: Node, physical: bool):
    """Mirror a frame for LTR. Quran/dhikr blocks are left exactly as drawn (RTL)."""
    skip = set()
    blocks = sacred_blocks(root)
    for n in walk(root):
        if id(n) in blocks:
            skip.update(id(x) for x in walk(n))
    for n in walk(root):
        if n.tag in ('#text', '#root') or id(n) in skip:
            continue
        if n.attrs.get('dir') == 'rtl':
            n.attrs['dir'] = 'ltr'
        if n.tag == 'path' and n.attrs.get('d') in CHEVRON:
            n.attrs['d'] = CHEVRON[n.attrs['d']]
        elif n.tag == 'svg' and n.parent is not None and DIRECTIONAL.search(
                (n.parent.attrs.get('aria-label') or '') + ' ' + (n.attrs.get('aria-label') or '')) and not any(
                x.tag == 'path' and x.attrs.get('d') in CHEVRON for x in walk(n)):
            # previous/next and back/forward glyphs drawn for RTL point the other way in LTR
            st = n.style()
            tf = next((v for k, v in st if k == 'transform'), None)
            if tf and 'scaleX(-1)' in tf:      # flipped for RTL by the designer: unflip
                rest = tf.replace('scaleX(-1)', '').strip()
                st = [[k, v] for k, v in st if k != 'transform'] + ([['transform', rest]] if rest else [])
            else:
                st = [[k, v] for k, v in st if k != 'transform'] + [['transform', ((tf or '') + ' scaleX(-1)').strip()]]
            n.set_style(st)
        if not physical or n.tag == 'svg' or (n.parent and n.parent.tag in ('svg', 'g', 'defs')):
            continue
        st = n.style()
        if st:
            n.set_style([[SIDE_SWAP.get(k, k), mirror_value(k, v)] for k, v in st])


def sacred_blocks(root: Node) -> set:
    """The topmost elements that hold only Quran/dhikr text (plus marks and digits), no controls.

    Their content keeps RTL order in an LTR frame: a mushaf line is a row of spans, and flipping
    its direction would reverse the ayahs.
    """
    state: dict[int, str] = {}

    def visit(n: Node) -> str:
        if n.tag == '#text':
            if not AR_LETTER.search(n.text):
                st = 'neutral'
            else:
                st = 'sacred' if is_sacred(n.text, n) else 'ui'
        elif n.tag in ('a', 'button', 'input', 'svg', 'nav', 'select', 'textarea'):
            for c in n.children:
                visit(c)
            st = 'ui'
        else:
            kids = [visit(c) for c in n.children]
            if 'ui' in kids:
                st = 'ui'
            elif 'sacred' in kids:
                st = 'sacred'
            else:
                st = 'neutral'
        state[id(n)] = st
        return st

    visit(root)
    out = set()
    for n in walk(root):
        if n.tag in ('#text', '#root') or n is root or state.get(id(n)) != 'sacred':
            continue
        if n.parent is not None and state.get(id(n.parent)) == 'sacred' and n.parent is not root:
            continue
        out.add(id(n))
    return out


def translate(root: Node, tr: Translator) -> list[str]:
    """Translate UI text in place. Quran/dhikr text stays as it is and keeps RTL order.

    Returns the UI strings that stayed Arabic.
    """
    blocks = sacred_blocks(root)
    keep = set()
    for n in walk(root):
        if id(n) in blocks:
            n.attrs['dir'] = 'rtl'
            keep.update(id(x) for x in walk(n))
    missing = []
    for n in list(walk(root)):
        if id(n) in keep:
            continue
        if n.tag == '#text':
            if not AR_LETTER.search(n.text):
                if re.search('[٠-٩]', n.text) and not is_sacred(n.text, n):
                    n.text = latin_digits(n.text)
                continue
            p = n.parent
            if is_sacred(n.text, n):
                span = Node('span', [('dir', 'rtl')], p)
                span.children.append(Node('#text', None, span, n.text))
                p.children[p.children.index(n)] = span
                continue
            out = tr(n.text)
            if out is None:
                missing.append(n.text.strip())
                p.attrs['data-untranslated'] = ''
            else:
                n.text = out
        elif n.tag != '#root':
            for a in ('aria-label', 'title', 'placeholder', 'alt'):
                v = n.attrs.get(a)
                if v and AR_LETTER.search(v) and not vocalized(v):
                    out = tr(v)
                    if out is not None:
                        n.attrs[a] = out
    return missing


# --------------------------------------------------------------------------------------------
# frames

def px(v):
    if v is None:
        return None
    m = re.fullmatch(r'(-?[\d.]+)px', v.strip())
    if m:
        return float(m.group(1))
    if v.strip() == '0':
        return 0.0
    return None


def mark_roles(root: Node):
    """Tag the parts of a phone frame that frame.js moves when the window size changes."""
    for c in root.elements():
        decls = c.style()
        if any(k == 'inset' for k, _ in decls):
            out = []
            for k, v in decls:
                if k != 'inset':
                    out.append([k, v])
                    continue
                t = tokens(v)
                if len(t) == 1:
                    t = t * 4
                elif len(t) == 2:
                    t = t * 2
                elif len(t) == 3:
                    t = [t[0], t[1], t[2], t[1]]
                out += [['top', t[0]], ['right', t[1]], ['bottom', t[2]], ['left', t[3]]]
            c.set_style(out)
        st = dict(c.style())
        if st.get('position') not in ('absolute', 'fixed'):
            c.attrs['data-role'] = 'flow'
            continue
        l, r, b, t = px(st.get('left')), px(st.get('right')), px(st.get('bottom')), px(st.get('top'))
        inset = st.get('inset', '').strip()
        links = sum(1 for x in walk(c) if x.tag == 'a')
        if c.tag == 'nav' and links >= 3 and b is not None:
            c.attrs['data-role'] = 'tabbar'
        elif c.tag == 'nav' and links >= 3 and st.get('flex-direction') == 'column':
            c.attrs['data-role'] = 'rail'
        elif (inset in ('0', '0px') or (l == 0 and r == 0 and t == 0 and b == 0)) and not any(
                x.tag == '#text' and x.text.strip() for x in walk(c)) and 'rgba' in (st.get('background') or ''):
            c.attrs['data-role'] = 'scrim'
        elif (l is not None and l <= 8 and r is not None and r <= 8 and b is not None and b <= 8
              and ((t is not None and t >= 120) or (t is None and st.get('height')))
              and 'radius' in (c.attrs.get('style') or '')):
            c.attrs['data-role'] = 'sheet'
        elif (l == 0 and r == 0) or inset in ('0', '0px'):
            c.attrs['data-role'] = 'bleed'
        else:
            c.attrs['data-role'] = 'float'


def screen_root(tree: Node):
    """(kind, node): 'phone' = the 390x844 inline root, 'window' = a drawn tablet window."""
    for n in walk(tree):
        if n.tag != '#text' and n.attrs.get('class') == 'sc-host':
            return 'phone', n.elements()[0]
    for n in walk(tree):
        if n.tag != '#text' and (n.attrs.get('class') or '').split()[:1] in (['xw-device'], ['xr-device-md']):
            return 'window', n
    return 'board', tree


def load(path: Path):
    html = path.read_text(encoding='utf-8')
    html = re.sub(r'<!--.*?-->', '', html, flags=re.S)
    html = html.replace('../../assets/', '../../common/assets/')
    return parse(html)


def is_dark(tree: Node, kind: str, root: Node) -> bool:
    if kind == 'window':
        return any(n.attrs.get('data-theme') == 'dark' for n in walk(tree) if n.tag != '#text')
    bg = root.get('background') or ''
    c = canon(COLOR_RE.findall(bg)[0]) if COLOR_RE.search(bg) else None
    return bool(c and sum(c[:3]) < 200)


def main():
    meta = json.loads((SRC / 'frames.json').read_text(encoding='utf-8'))
    frames = {f['id']: f for f in meta['frames']}

    # group frames into screens -------------------------------------------------------------
    screens: dict[str, dict] = {}
    for fid, f in frames.items():
        base, slot = fid, None
        if fid in ALIASES:
            base, slot = ALIASES[fid]
        elif fid.endswith('Dark') and fid[:-4] in frames:
            base, slot = fid[:-4], 'dark-rtl'
        elif fid.endswith('English') and fid[:-7] in frames:
            base, slot = fid[:-7], 'light-ltr'
        s = screens.setdefault(base, {'id': base, 'drawn': {}})
        if slot is None:
            s['primary'] = fid
        else:
            s['drawn'][slot] = fid
    for s in screens.values():
        f = frames[s['primary']]
        s.update(stack=f['stack'], caption=f['caption'], status=f['status'], size=f['size'])

    trees = {fid: load(SRC / f['path']) for fid, f in frames.items()}

    # a drawn frame whose markup is damaged is not used; that variant is derived instead
    broken = set()
    for fid, t in trees.items():
        k, r = screen_root(t)
        if k == 'phone' and not re.search(r'height:\s*\d+px', r.attrs.get('style') or ''):
            broken.add(fid)
            print(f'  warning: #{fid} is damaged in quran-app-screens.html (its screen root has no '
                  f'size); its variant is derived instead')
    for s in screens.values():
        s['drawn'] = {k: v for k, v in s['drawn'].items() if v not in broken}

    # learn ------------------------------------------------------------------------------------
    l2d, d2l = ColorMap(), ColorMap()
    l2d.tokens, d2l.tokens = token_tables()
    tr = Translator()
    for s in screens.values():
        for slot, fid in s['drawn'].items():
            a = list(walk(trees[s['primary']]))
            b = list(walk(trees[fid]))
            if [x.tag for x in a] != [x.tag for x in b]:
                continue
            for x, y in zip(a, b):
                if x.tag == '#text':
                    if slot == 'light-ltr':
                        tr.learn(x.text, y.text)
                elif x.tag != '#root':
                    if slot == 'dark-rtl':
                        l2d.learn(x, y)
                        d2l.learn(y, x)
                    elif slot == 'light-ltr':
                        for k in ('aria-label', 'title'):
                            if x.attrs.get(k) and y.attrs.get(k):
                                tr.learn(x.attrs[k], y.attrs[k])

    # links: #FrameId -> the screen page ------------------------------------------------------
    where = {}
    for s in screens.values():
        where[s['primary']] = (s, None)
        for slot, fid in s['drawn'].items():
            where[fid] = (s, slot)

    def relink(root: Node):
        for n in walk(root):
            if n.tag == 'a' and (n.attrs.get('href') or '').startswith('#'):
                tgt = where.get(n.attrs['href'][1:])
                if tgt:
                    s, slot = tgt
                    q = ''
                    if slot:
                        q = '?theme=' + slot.split('-')[0] + '&dir=' + slot.split('-')[1]
                    n.attrs['href'] = f'../../{s["stack"]}/{s["id"]}/index.html{q}'
                    n.attrs['target'] = '_top'
                else:
                    n.attrs['href'] = 'javascript:void 0'

    # build ------------------------------------------------------------------------------------
    for d in DESIGN.iterdir():
        if d.is_dir() and d.name in STACK_TITLES:
            shutil.rmtree(d)
    shutil.copytree(SRC / 'assets', COMMON / 'assets', dirs_exist_ok=True)
    shutil.copy(SRC / 'common' / 'styles.css', COMMON / 'frames.css')

    catalog = []
    report = collections.Counter()
    for s in sorted(screens.values(), key=lambda x: (list(STACK_TITLES).index(x['stack']), x['id'])):
        base_tree = trees[s['primary']]
        kind, _ = screen_root(base_tree)
        # the catalog's theme label, confirmed by the frame itself (one frame is mislabelled)
        base_dark = frames[s['primary']]['theme'] == 'dark' and is_dark(base_tree, kind, screen_root(base_tree)[1])
        base_slot = 'dark-rtl' if base_dark else 'light-rtl'
        if frames[s['primary']]['theme'] == 'en':
            base_slot = 'light-ltr'
        drawn = dict(s['drawn'])
        drawn.setdefault(base_slot, s['primary'])
        dark_only = s['stack'] == 'watch'
        out_dir = DESIGN / s['stack'] / s['id']
        out_dir.mkdir(parents=True, exist_ok=True)
        variants = {}
        for slot in VARIANTS:
            theme, direction = slot.split('-')
            if dark_only and theme == 'light':
                continue
            if slot in drawn:
                tree = load(SRC / frames[drawn[slot]]['path'])
                how = 'drawn'
                need_translate = False
                src_id = drawn[slot]
            else:
                # derive from the nearest drawn variant: same direction first, then same theme
                order = [f'{"dark" if theme == "light" else "light"}-{direction}',
                         f'{theme}-{"ltr" if direction == "rtl" else "rtl"}']
                order += [v for v in VARIANTS if v not in order]
                src_slot = next(v for v in order if v in drawn)
                src_id = drawn[src_slot]
                tree = load(SRC / frames[src_id]['path'])
                how = 'derived'
                st, sd = src_slot.split('-')
                need_translate = sd == 'rtl' and direction == 'ltr'
                k, r = screen_root(tree)
                if st != theme:
                    if k == 'window':
                        for n in walk(tree):
                            if n.tag != '#text' and 'data-theme' in n.attrs:
                                n.attrs['data-theme'] = theme
                    else:
                        (l2d if theme == 'dark' else d2l).apply(r)
                if sd != direction:
                    mirror(tree, physical=s['id'] not in NO_MIRROR)
            k, r = screen_root(tree)
            missing = []
            if need_translate:
                missing = translate(r if k != 'board' else tree, tr)
            if k == 'phone':
                mark_roles(r)
                r.attrs['data-frame-root'] = ''
            elif k == 'window':
                r.attrs['data-frame-root'] = 'window'
            relink(tree)
            fixed = s['stack'] in FIXED_STACKS or k == 'window'
            body = serialize(r if k != 'board' else tree)
            title = f'{s["id"]} · {slot}'
            doc = (f'<!doctype html>\n<html lang="{"en" if direction == "ltr" else "ar"}" '
                   f'dir="{direction}" data-theme="{theme}">\n<head>\n<meta charset="utf-8">\n'
                   f'<meta name="viewport" content="width=device-width,initial-scale=1">\n'
                   f'<title>{escape(title)}</title>\n{FONTS}\n'
                   f'<link rel="stylesheet" href="../../common/frames.css">\n'
                   f'<link rel="stylesheet" href="../../common/frame.css">\n'
                   f'<script src="../../common/frame.js" defer></script>\n</head>\n'
                   f'<body class="artboard" data-kind="{k}" data-fixed="{int(fixed)}" '
                   f'data-variant="{slot}" data-source="{src_id}" data-how="{how}">\n{body}\n</body>\n</html>\n')
            (out_dir / f'{slot}.html').write_text(doc, encoding='utf-8')
            variants[slot] = {'how': how, 'from': src_id, 'untranslated': len(missing)}
            report[how] += 1
            report['untranslated'] += len(missing)
            for m in missing:
                report_missing[m] += 1
        bk, broot = screen_root(base_tree)
        w, h = (744, 1133) if 'xr-device-md' in (broot.attrs.get('class') or '') else (1194, 834)
        if kind == 'phone':
            m = re.search(r'width:\s*(\d+)px;\s*height:\s*(\d+)px', broot.attrs.get('style') or '')
            if m and (int(m.group(1)), int(m.group(2))) != (390, 844):
                kind_size = (int(m.group(1)), int(m.group(2)))
            else:
                kind_size = None
        else:
            kind_size = None
        catalog.append({
            'id': s['id'], 'stack': s['stack'], 'caption': s['caption'], 'status': s['status'],
            'kind': kind, 'fixed': s['stack'] in FIXED_STACKS or kind == 'window' or kind_size is not None,
            'drawnSize': s['size'],
            'window': [w, h] if kind == 'window' else list(kind_size) if kind_size else None,
            'sizeFrames': SIZE_FRAMES.get(s['id'], {}),
            'variants': variants, 'frames': [s['primary'], *s['drawn'].values()],
        })

    check_sacred(catalog, trees, frames)
    write_catalog(catalog)
    print(f'{len(catalog)} screens · {report["drawn"]} drawn variants · {report["derived"]} derived · '
          f'{report["untranslated"]} untranslated strings ({len(report_missing)} unique)')
    with open(Path(__file__).resolve().parent / 'untranslated.txt', 'w', encoding='utf-8') as fh:
        for m, c in report_missing.most_common():
            fh.write(f'{c}\t{m}\n')


report_missing: collections.Counter = collections.Counter()


def check_sacred(catalog, trees, frames):
    """Every Quran/dhikr text node of a source frame must appear byte-for-byte in its variants."""
    bad = 0
    for s in catalog:
        for slot, v in s['variants'].items():
            if v['how'] != 'derived':
                continue
            k, src = screen_root(trees[v['from']])
            texts = {n.text.strip() for n in walk(src) if n.tag == '#text' and is_sacred(n.text, n)}
            out = (DESIGN / s['stack'] / s['id'] / f'{slot}.html').read_text(encoding='utf-8')
            for t in texts:
                if t and escape(t, quote=False) not in out:
                    bad += 1
                    print(f'  sacred text changed: {s["id"]} {slot}: {t[:40]}')
    if bad:
        sys.exit(f'{bad} sacred text nodes changed')


def write_catalog(catalog):
    stacks = []
    for key, (title, blurb) in STACK_TITLES.items():
        items = [c['id'] for c in catalog if c['stack'] == key]
        if items:
            stacks.append({'id': key, 'title': title, 'blurb': blurb, 'screens': items})
    data = {'stacks': stacks, 'screens': catalog}
    (COMMON / 'catalog.js').write_text(
        '/* generated by design/scripts/build_reference.py */\nwindow.TAYBAH = '
        + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    (DESIGN / 'catalog.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')

    page = (DESIGN / 'scripts' / 'templates' / 'canvas.html').read_text(encoding='utf-8')
    for st in stacks:
        for sid in st['screens']:
            (DESIGN / st['id'] / sid / 'index.html').write_text(
                page.replace('{{BASE}}', '../../').replace('{{VIEW}}', f'screen:{sid}')
                .replace('{{TITLE}}', sid), encoding='utf-8')
        (DESIGN / st['id'] / 'index.html').write_text(
            page.replace('{{BASE}}', '../').replace('{{VIEW}}', f'stack:{st["id"]}')
            .replace('{{TITLE}}', st['title']), encoding='utf-8')
    (DESIGN / 'index.html').write_text(
        page.replace('{{BASE}}', '').replace('{{VIEW}}', 'home').replace('{{TITLE}}', 'Taybah design'),
        encoding='utf-8')

    lines = ['# Design reference catalog', '',
             'Generated by `design/scripts/build_reference.py`. One row per screen. Variants: '
             '**D** drawn by the designer, **d** derived (dark from the learned colour map, LTR mirrored '
             'and translated). A number after an LTR variant is the count of UI strings left in Arabic.', '',
             '| screen | stack | status | light-rtl | dark-rtl | light-ltr | dark-ltr | sizes | caption |',
             '|---|---|---|---|---|---|---|---|---|']
    for c in catalog:
        cells = []
        for v in VARIANTS:
            x = c['variants'].get(v)
            cells.append('—' if not x else ('D' if x['how'] == 'drawn' else 'd') + (
                f' ({x["untranslated"]})' if x['untranslated'] else ''))
        sizes = 'drawn size only' if c['fixed'] else 'compact · medium · expanded · short'
        lines.append(f'| [`{c["id"]}`]({c["stack"]}/{c["id"]}/index.html) | {c["stack"]} | {c["status"]} | '
                     + ' | '.join(cells) + f' | {sizes} | {c["caption"].replace("|", "/")} |')
    (DESIGN / 'CATALOG.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
