/* Taybah design reference: the canvas (pages list, pan and zoom artboards, inspector).
 * One script for every page; <html data-base data-view> says where the page sits and what it shows:
 *   home          the file: every stack as a card
 *   stack:<id>    one stack: every screen of it
 *   screen:<id>   one screen: every size x theme x direction
 * Data comes from catalog.js (window.TAYBAH), written by design/scripts/build_reference.py.
 */
(function () {
  'use strict';
  var DATA = window.TAYBAH;
  var html = document.documentElement;
  var BASE = html.getAttribute('data-base') || '';
  var VIEW = html.getAttribute('data-view') || 'home';
  var SIZES = {
    compact: { w: 390, h: 844, label: 'Compact', note: 'phone' },
    medium: { w: 744, h: 1133, label: 'Medium', note: 'iPad mini, unfolded portrait' },
    expanded: { w: 1194, h: 834, label: 'Expanded', note: 'iPad landscape, tablets' },
    landscape: { w: 844, h: 390, label: 'Short', note: 'phone landscape' }
  };
  var SIZE_ORDER = ['compact', 'medium', 'expanded', 'landscape'];
  var screensById = {};
  DATA.screens.forEach(function (s) { screensById[s.id] = s; });
  var stacksById = {};
  DATA.stacks.forEach(function (s) { stacksById[s.id] = s; });

  // ---------------------------------------------------------------------------------- state
  var store = {
    get: function (k) { try { return localStorage.getItem('taybah.design.' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('taybah.design.' + k, v); } catch (e) { /* private window */ } }
  };
  var q = new URLSearchParams(location.search);
  var isScreen = VIEW.indexOf('screen:') === 0;
  var state = {
    theme: q.get('theme') || store.get('theme') || (isScreen ? 'both' : 'light'),
    dir: q.get('dir') || store.get('dir') || (isScreen ? 'both' : 'rtl'),
    sizes: (q.get('sizes') || store.get(isScreen ? 'sizes' : 'stackSizes') || (isScreen ? SIZE_ORDER.join(',') : 'compact'))
      .split(',').filter(function (s) { return SIZES[s]; }),
    mark: (q.get('mark') || store.get('mark') || '0') === '1',
    badges: (store.get('badges') || '1') === '1',
    interact: false,
    chrome: store.get('chrome') || 'auto'
  };
  if (!state.sizes.length) state.sizes = ['compact'];
  if (q.get('theme') || q.get('dir')) { /* a link from a frame: show what it points at */ }

  function save() {
    store.set('theme', state.theme); store.set('dir', state.dir);
    store.set(isScreen ? 'sizes' : 'stackSizes', state.sizes.join(','));
    store.set('mark', state.mark ? '1' : '0'); store.set('badges', state.badges ? '1' : '0');
    var p = new URLSearchParams();
    p.set('theme', state.theme); p.set('dir', state.dir); p.set('sizes', state.sizes.join(','));
    if (state.mark) p.set('mark', '1');
    history.replaceState(null, '', location.pathname + '?' + p.toString() + location.hash);
  }

  function applyChrome() {
    if (state.chrome === 'auto') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', state.chrome);
  }
  applyChrome();

  // ---------------------------------------------------------------------------------- helpers
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function screenUrl(s) { return BASE + s.stack + '/' + s.id + '/index.html'; }
  function stackUrl(id) { return BASE + id + '/index.html'; }
  function variantUrl(s, v, size) {
    return BASE + s.stack + '/' + s.id + '/' + v + '.html?size=' + size + (state.mark ? '&mark=1' : '');
  }
  function combos(s) {
    var themes = state.theme === 'both' ? ['light', 'dark'] : [state.theme];
    var dirs = state.dir === 'both' ? ['rtl', 'ltr'] : [state.dir];
    var out = [];
    themes.forEach(function (t) { dirs.forEach(function (d) { out.push(t + '-' + d); }); });
    return out.map(function (v) {
      if (s.variants[v]) return v;
      // the watch is dark only
      var alt = 'dark-' + v.split('-')[1];
      return s.variants[alt] ? alt : null;
    }).filter(function (v, i, a) { return v && a.indexOf(v) === i; });
  }
  function boardSizes(s) {
    if (s.fixed) {
      if (s.window) {
        var w = s.window[0], h = s.window[1];
        var cls = h < 480 ? 'Short' : w >= 840 ? 'Expanded' : w >= 600 ? 'Medium' : 'Compact';
        return [{ key: 'drawn', w: w, h: h, label: cls + ' (drawn)' }];
      }
      return [{ key: 'drawn', w: 390, h: 844, label: 'Board' }];
    }
    return state.sizes.map(function (k) { return { key: k, w: SIZES[k].w, h: SIZES[k].h, label: SIZES[k].label }; });
  }
  function themeLabel(v) {
    var p = v.split('-');
    return (p[0] === 'dark' ? 'Dark' : 'Light') + ' · ' + (p[1] === 'ltr' ? 'LTR (English)' : 'RTL (Arabic)');
  }
  function provenance(s, v) {
    var x = s.variants[v];
    if (!x) return el('span', { class: 'pill neutral', text: 'not drawn' });
    if (x.how === 'drawn') return el('span', { class: 'pill drawn', title: 'Drawn: #' + x.from, text: 'Drawn' });
    return el('span', { class: 'pill derived', title: 'Derived from #' + x.from, text: 'Derived' });
  }

  // ---------------------------------------------------------------------------------- top bar
  function seg(name, opts, value, onPick) {
    return el('div', { class: 'seg', role: 'group', 'aria-label': name }, opts.map(function (o) {
      return el('button', {
        type: 'button', 'aria-pressed': String(value === o[0]), text: o[1],
        onclick: function () { onPick(o[0]); }
      });
    }));
  }
  function buildTop() {
    var top = document.querySelector('.top');
    top.innerHTML = '';
    top.appendChild(el('button', {
      class: 'icon-btn panel-toggle', type: 'button', 'aria-label': 'Pages', text: '☰',
      onclick: function () { document.querySelector('.pages').classList.toggle('open'); }
    }));
    top.appendChild(el('a', { class: 'brand', href: BASE + 'index.html' }, [
      el('span', { class: 'brand-mark', 'aria-hidden': 'true', text: 'ط' }), el('span', { text: 'Taybah design' })
    ]));
    var crumbs = el('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' });
    if (VIEW !== 'home') {
      var st = VIEW.indexOf('stack:') === 0 ? stacksById[VIEW.slice(6)] : stacksById[screensById[VIEW.slice(7)].stack];
      crumbs.appendChild(el('span', { text: '/' }));
      if (isScreen) {
        crumbs.appendChild(el('a', { href: stackUrl(st.id), text: st.title }));
        crumbs.appendChild(el('span', { text: '/' }));
        crumbs.appendChild(el('b', { text: VIEW.slice(7) }));
      } else crumbs.appendChild(el('b', { text: st.title }));
    }
    top.appendChild(crumbs);
    top.appendChild(el('div', { class: 'spacer' }));
    if (VIEW !== 'home') {
      top.appendChild(el('div', { class: 'group' }, [el('span', { class: 'lbl', text: 'Theme' }),
        seg('Theme', [['light', 'Light'], ['dark', 'Dark'], ['both', 'Both']], state.theme, function (v) { state.theme = v; rerender(); })]));
      top.appendChild(el('div', { class: 'group' }, [el('span', { class: 'lbl', text: 'Direction' }),
        seg('Direction', [['rtl', 'RTL'], ['ltr', 'LTR'], ['both', 'Both']], state.dir, function (v) { state.dir = v; rerender(); })]));
      top.appendChild(el('div', { class: 'group' }, [el('span', { class: 'lbl', text: 'Window' }),
        el('div', { class: 'seg', role: 'group', 'aria-label': 'Window sizes' }, SIZE_ORDER.map(function (k) {
          var on = state.sizes.indexOf(k) >= 0;
          return el('button', {
            type: 'button', 'aria-pressed': String(on), text: SIZES[k].label,
            title: SIZES[k].w + ' × ' + SIZES[k].h + ' · ' + SIZES[k].note,
            onclick: function () {
              if (on && state.sizes.length === 1) return;
              state.sizes = on ? state.sizes.filter(function (x) { return x !== k; })
                : SIZE_ORDER.filter(function (x) { return x === k || state.sizes.indexOf(x) >= 0; });
              rerender();
            }
          });
        }))]));
      top.appendChild(el('button', {
        class: 'icon-btn', type: 'button', 'aria-pressed': String(state.badges), text: 'Badges',
        title: 'Show which variants are drawn and which are derived',
        onclick: function () { state.badges = !state.badges; rerender(); }
      }));
      top.appendChild(el('button', {
        class: 'icon-btn', type: 'button', 'aria-pressed': String(state.mark), text: 'Untranslated',
        title: 'Outline UI text the LTR build left in Arabic',
        onclick: function () { state.mark = !state.mark; rerender(); }
      }));
      top.appendChild(el('button', {
        class: 'icon-btn', type: 'button', 'aria-pressed': String(state.interact), text: 'Prototype',
        title: 'Click through the frames (links open the target screen). Key: P',
        onclick: function () { setInteract(!state.interact); }
      }));
      top.appendChild(el('div', { class: 'group' }, [
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Zoom out', text: '−', onclick: function () { zoomBy(1 / 1.25); } }),
        el('span', { class: 'zoom-val', id: 'zoomVal', 'aria-live': 'polite', text: '100%' }),
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Zoom in', text: '+', onclick: function () { zoomBy(1.25); } }),
        el('button', { class: 'icon-btn', type: 'button', text: 'Fit', title: 'Zoom to fit (Shift+1)', onclick: function () { fit(); } })
      ]));
      top.appendChild(el('button', {
        class: 'icon-btn panel-toggle inspect-toggle', type: 'button', text: 'Info',
        onclick: function () { document.querySelector('.inspect').classList.toggle('open'); }
      }));
    }
    top.appendChild(el('button', {
      class: 'icon-btn', type: 'button', 'aria-label': 'Canvas colours: ' + state.chrome,
      title: 'Canvas colours: ' + state.chrome + ' (frames keep their own theme)',
      text: state.chrome === 'dark' ? '☾' : state.chrome === 'light' ? '☀' : '◐',
      onclick: function () {
        state.chrome = { auto: 'light', light: 'dark', dark: 'auto' }[state.chrome];
        store.set('chrome', state.chrome); applyChrome(); buildTop();
      }
    }));
  }

  // ---------------------------------------------------------------------------------- pages
  function buildPages() {
    var pages = document.querySelector('.pages');
    pages.innerHTML = '';
    var input = el('input', { type: 'search', placeholder: 'Find a screen…', 'aria-label': 'Find a screen' });
    pages.appendChild(el('div', { class: 'pages-head' }, [input]));
    var tree = el('ul', { class: 'tree' });
    var current = VIEW.indexOf('stack:') === 0 ? VIEW.slice(6) : isScreen ? screensById[VIEW.slice(7)].stack : null;
    function draw(filter) {
      tree.innerHTML = '';
      tree.appendChild(el('li', null, [el('a', { href: BASE + 'index.html', 'aria-current': VIEW === 'home' ? 'page' : null }, [el('span', { text: 'All stacks' })])]));
      DATA.stacks.forEach(function (st) {
        var items = st.screens.filter(function (id) { return !filter || id.toLowerCase().indexOf(filter) >= 0 || screensById[id].caption.toLowerCase().indexOf(filter) >= 0; });
        if (filter && !items.length) return;
        var li = el('li', null, [el('a', { href: stackUrl(st.id), 'aria-current': VIEW === 'stack:' + st.id ? 'page' : null }, [
          el('span', { text: st.title }), el('span', { class: 'count', text: String(st.screens.length) })
        ])]);
        if (filter || st.id === current) {
          li.appendChild(el('ul', { class: 'sub' }, items.map(function (id) {
            var s = screensById[id];
            return el('li', null, [el('a', { href: screenUrl(s), title: s.caption, 'aria-current': VIEW === 'screen:' + id ? 'page' : null }, [
              el('span', { class: 'dot' + (s.status === 'awaiting-approval' ? ' pending' : '') }), el('span', { text: id })
            ])]);
          })));
        }
        tree.appendChild(li);
      });
    }
    input.addEventListener('input', function () { draw(input.value.trim().toLowerCase()); });
    draw('');
    pages.appendChild(tree);
    pages.appendChild(el('div', { class: 'tree-label', text: 'Elsewhere' }));
    pages.appendChild(el('ul', { class: 'tree' }, [
      ['../quran-app-design-system.html', 'Design system (tokens)'],
      ['../screens/index.html', 'Screens (design source)']
    ].map(function (l) { return el('li', null, [el('a', { href: BASE + l[0], text: l[1] })]); })));
  }

  // ---------------------------------------------------------------------------------- canvas engine
  var canvas, world, cam = { x: 40, y: 40, z: 1 }, worldSize = { w: 0, h: 0 }, selected = null;
  function applyCam() {
    world.style.transform = 'translate(' + cam.x + 'px,' + cam.y + 'px) scale(' + cam.z + ')';
    var zv = document.getElementById('zoomVal');
    if (zv) zv.textContent = Math.round(cam.z * 100) + '%';
  }
  function zoomAt(f, cx, cy) {
    var z = Math.min(4, Math.max(0.03, cam.z * f));
    cam.x = cx - (cx - cam.x) * z / cam.z;
    cam.y = cy - (cy - cam.y) * z / cam.z;
    cam.z = z; applyCam();
  }
  function zoomBy(f) { var r = canvas.getBoundingClientRect(); zoomAt(f, r.width / 2, r.height / 2); }
  function fit() {
    var r = canvas.getBoundingClientRect(), pad = 48;
    var z = Math.min((r.width - 2 * pad) / worldSize.w, (r.height - 2 * pad) / worldSize.h, 1);
    cam.z = Math.max(0.03, z);
    cam.x = (r.width - worldSize.w * cam.z) / 2;
    cam.y = Math.max(pad, (r.height - worldSize.h * cam.z) / 2);
    if (worldSize.h * cam.z > r.height - 2 * pad) cam.y = pad;
    applyCam();
  }
  function setInteract(on) {
    state.interact = on;
    canvas.classList.toggle('interact', on);
    buildTop();
  }
  function wireCanvas() {
    var space = false, drag = null;
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = canvas.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top);
      else { cam.x -= e.deltaX; cam.y -= e.deltaY; applyCam(); }
    }, { passive: false });
    canvas.addEventListener('pointerdown', function (e) {
      var onBoard = e.target.closest && e.target.closest('.board-hit');
      if (e.button === 1 || space || (!onBoard && e.button === 0)) {
        drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add('panning');
      }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      cam.x = drag.cx + dx; cam.y = drag.cy + dy; applyCam();
    });
    function end() { if (drag && !drag.moved && !space) select(null); drag = null; canvas.classList.remove('panning'); }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    window.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { space = true; canvas.classList.add('space'); e.preventDefault(); }
      else if (e.shiftKey && e.code === 'Digit1') fit();
      else if (e.shiftKey && e.code === 'Digit0') { var r = canvas.getBoundingClientRect(); zoomAt(1 / cam.z, r.width / 2, r.height / 2); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); zoomBy(1.25); }
      else if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); zoomBy(0.8); }
      else if (e.key === 'p' || e.key === 'P') setInteract(!state.interact);
      else if (e.key === 'Escape') select(null);
    });
    window.addEventListener('keyup', function (e) { if (e.code === 'Space') { space = false; canvas.classList.remove('space'); } });
    window.addEventListener('resize', function () { fit(); });
  }

  // lazy frames: load an iframe only when its board is near the viewport
  var io = null;
  function lazy(frame) {
    if (!('IntersectionObserver' in window)) { frame.src = frame.dataset.src; return; }
    if (!io) io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !en.target.src) { en.target.src = en.target.dataset.src; io.unobserve(en.target); }
      });
    }, { root: canvas, rootMargin: '600px' });
    io.observe(frame);
  }

  // a drawn frame that stands in for one window size of this screen (e.g. MainLandscapeRail)
  function standIn(s, v, sz) {
    var id = s.sizeFrames && s.sizeFrames[sz.key];
    var t = id && screensById[id];
    if (!t) return null;
    var tv = t.variants[v] ? v : t.variants['light-' + v.split('-')[1]] ? 'light-' + v.split('-')[1] : 'light-rtl';
    return { s: t, v: tv };
  }
  function board(s, v, sz, x, y) {
    var alt = standIn(s, v, sz);
    var src = alt || { s: s, v: v };
    var b = el('div', { class: 'board', style: 'left:' + x + 'px;top:' + y + 'px;width:' + sz.w + 'px;height:' + sz.h + 'px' });
    b.appendChild(el('div', { class: 'board-label' }, [
      el('b', { text: sz.label }), el('span', { text: sz.w + '×' + sz.h + ' · ' + themeLabel(src.v) }),
      alt ? el('span', {
        class: 'pill ' + alt.s.variants[alt.v].how,
        title: (alt.s.variants[alt.v].how === 'drawn' ? 'Drawn: #' : 'Derived from #') + alt.s.variants[alt.v].from,
        text: (alt.s.variants[alt.v].how === 'drawn' ? 'Drawn' : 'Derived') + ' · #' + alt.s.id
      }) : provenance(s, v),
      s.variants[v] && s.variants[v].untranslated && v.indexOf('ltr') > 0
        ? el('span', { class: 'pill neutral', title: 'UI strings left in Arabic', text: s.variants[v].untranslated + ' untranslated' }) : null
    ]));
    var frameWrap = el('div', { class: 'board-frame' });
    var f = el('iframe', {
      title: s.id + ' · ' + sz.label + ' · ' + themeLabel(v), width: sz.w, height: sz.h, scrolling: 'no',
      'data-src': alt ? variantUrl(alt.s, alt.v, 'compact') : variantUrl(s, v, sz.key === 'drawn' ? 'compact' : sz.key)
    });
    frameWrap.appendChild(f);
    b.appendChild(frameWrap);
    var hit = el('div', { class: 'board-hit', role: 'button', tabindex: '0', 'aria-label': 'Select ' + s.id + ' ' + sz.label + ' ' + themeLabel(v) });
    var info = { s: src.s, v: src.v, sz: sz, node: b, standIn: !!alt };
    hit.addEventListener('click', function () { select(info); });
    hit.addEventListener('dblclick', function () { if (!isScreen) location.href = screenUrl(s) + '?theme=' + v.split('-')[0] + '&dir=' + v.split('-')[1]; });
    hit.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(info); } });
    b.appendChild(hit);
    world.appendChild(b);
    lazy(f);
    return b;
  }

  // ---------------------------------------------------------------------------------- layouts
  var GAP = 80, LABEL = 40;
  function layoutScreen(s, x0, y0, withTitle) {
    var y = y0, maxW = 0;
    if (withTitle) {
      var t = el('div', { class: 'screen-title', style: 'left:' + x0 + 'px;top:' + y + 'px' }, [
        isScreen ? el('span', { text: s.id }) : el('a', { href: screenUrl(s), text: s.id }),
        s.status === 'awaiting-approval' ? el('span', { class: 'pill pending', text: 'Awaiting approval' }) : null
      ]);
      world.appendChild(t);
      world.appendChild(el('div', { class: 'screen-cap', style: 'left:' + x0 + 'px;top:' + (y + 30) + 'px', text: s.caption }));
      y += 64 + LABEL;
    } else y += LABEL;
    var sizes = boardSizes(s);
    combos(s).forEach(function (v) {
      var x = x0, rowH = 0;
      sizes.forEach(function (sz) {
        board(s, v, sz, x, y);
        x += sz.w + GAP; rowH = Math.max(rowH, sz.h);
      });
      maxW = Math.max(maxW, x - GAP - x0);
      y += rowH + GAP + LABEL;
    });
    return { w: maxW, h: y - y0 - GAP - LABEL };
  }

  function renderScreen(id) {
    var s = screensById[id];
    var dims = layoutScreen(s, 0, 0, true);
    worldSize = { w: Math.max(dims.w, 600), h: dims.h };
  }

  function renderStack(id) {
    var st = stacksById[id];
    world.appendChild(el('div', { class: 'world-title', style: 'left:0;top:0', text: st.title }));
    world.appendChild(el('div', { class: 'world-sub', style: 'left:0;top:40px', text: st.blurb + ' · ' + st.screens.length + ' screens · double-click a frame to open its screen' }));
    var maxRow = Math.max(3400, 0), x = 0, y = 110, rowH = 0, maxW = 0;
    st.screens.forEach(function (sid) {
      var s = screensById[sid];
      // measure first with a dry layout
      var sizes = boardSizes(s), n = combos(s).length;
      var w = sizes.reduce(function (a, z) { return a + z.w + GAP; }, -GAP);
      var h = 64 + LABEL + n * (Math.max.apply(null, sizes.map(function (z) { return z.h; })) + GAP + LABEL) - GAP - LABEL;
      if (x > 0 && x + w > maxRow) { x = 0; y += rowH + 140; rowH = 0; }
      layoutScreen(s, x, y, true);
      x += w + 140; rowH = Math.max(rowH, h); maxW = Math.max(maxW, x - 140);
    });
    worldSize = { w: maxW, h: y + rowH };
  }

  // ---------------------------------------------------------------------------------- inspector
  function select(info) {
    if (selected) selected.node.classList.remove('selected');
    selected = info;
    if (info) info.node.classList.add('selected');
    buildInspect();
  }
  function buildInspect() {
    var box = document.querySelector('.inspect');
    if (!box) return;
    box.innerHTML = '';
    var s = selected ? selected.s : isScreen ? screensById[VIEW.slice(7)] : null;
    if (!s) {
      var st = stacksById[VIEW.slice(6)];
      box.appendChild(el('h2', { text: st.title }));
      box.appendChild(el('p', { text: st.blurb }));
      legend(box);
      return;
    }
    box.appendChild(el('h2', { text: s.id }));
    box.appendChild(el('p', { text: s.caption }));
    var dl = el('dl');
    [['Stack', stacksById[s.stack].title], ['Status', s.status === 'awaiting-approval' ? 'Awaiting approval (ADR 0010)' : 'Approved source'],
      ['Drawn frames', s.frames.map(function (f) { return '#' + f; }).join(', ')]].forEach(function (r) {
      dl.appendChild(el('dt', { text: r[0] })); dl.appendChild(el('dd', { text: r[1] }));
    });
    box.appendChild(dl);
    var sf = s.sizeFrames || {};
    var rel = (sf.related || []).concat(sf.landscape ? [sf.landscape] : []).filter(function (id) { return screensById[id]; });
    if (rel.length) {
      box.appendChild(el('h3', { text: 'Drawn at other sizes' }));
      box.appendChild(el('div', { class: 'actions' }, rel.map(function (id) {
        var r = screensById[id];
        return el('a', { href: screenUrl(r), title: r.caption, text: '#' + id + (r.status === 'awaiting-approval' ? ' · awaiting approval' : '') });
      })));
      if (sf.related) box.appendChild(el('p', { text: 'The drawn tablet frames still show the sidebar that ADR 0051 retired; their content layout still applies. The derived expanded window uses the rail.' }));
    }
    if (selected) {
      var v = selected.v, x = s.variants[v];
      box.appendChild(el('h3', { text: 'Selected frame' }));
      var d2 = el('dl');
      [['Window', selected.sz.label + ' · ' + selected.sz.w + ' × ' + selected.sz.h], ['Variant', themeLabel(v)],
        ['Source', x.how === 'drawn' ? 'Drawn: #' + x.from : 'Derived from #' + x.from]].forEach(function (r) {
        d2.appendChild(el('dt', { text: r[0] })); d2.appendChild(el('dd', { text: r[1] }));
      });
      if (x.untranslated) { d2.appendChild(el('dt', { text: 'Arabic left' })); d2.appendChild(el('dd', { text: x.untranslated + ' UI strings' })); }
      box.appendChild(d2);
      var url = variantUrl(s, v, selected.sz.key === 'drawn' ? 'compact' : selected.sz.key);
      box.appendChild(el('div', { class: 'actions' }, [
        el('a', { href: url, target: '_blank', rel: 'noopener', text: 'Open this frame alone ↗' }),
        !isScreen ? el('a', { href: screenUrl(s), text: 'Open the screen page' }) : null,
        el('button', { type: 'button', text: 'Copy frame-shot command', onclick: function (e) {
          var cmd = 'python3 packages/design-tokens/scripts/frame-shot.py ' + x.from + ' out.png';
          try { navigator.clipboard.writeText(cmd); e.target.textContent = 'Copied'; } catch (err) { e.target.textContent = cmd; }
        } })
      ]));
    }
    box.appendChild(el('h3', { text: 'Variants' }));
    var t = el('table', { class: 'vtable' });
    ['light-rtl', 'dark-rtl', 'light-ltr', 'dark-ltr'].forEach(function (v) {
      t.appendChild(el('tr', null, [el('td', { text: themeLabel(v) }), el('td', null, [provenance(s, v)])]));
    });
    box.appendChild(t);
    box.appendChild(el('h3', { text: 'Windows' }));
    box.appendChild(el('p', { text: s.fixed ? 'Shown at its drawn size only.' :
      'Medium, expanded and short windows are laid out from the compact frame by common/frame.js (spec §4, ADR 0051): 720 content column, bottom bar on phones and medium, the rail on expanded and short windows, sheets as a 560 card or a 400 side panel.' }));
    legend(box);
  }
  function legend(box) {
    box.appendChild(el('h3', { text: 'Legend' }));
    box.appendChild(el('div', { class: 'legend' }, [
      el('div', null, [el('span', { class: 'pill drawn', text: 'Drawn' }), ' the designer drew this variant']),
      el('div', null, [el('span', { class: 'pill derived', text: 'Derived' }), ' built from a drawn frame: dark from the learned colour map, LTR mirrored and translated']),
      el('div', null, [el('span', { class: 'pill pending', text: 'Awaiting approval' }), ' needs sign-off before app code']),
      el('p', { text: 'Quran, dhikr, dua and hadith text is never changed and stays RTL in LTR frames.' })
    ]));
  }

  // ---------------------------------------------------------------------------------- home
  function renderHome(main) {
    var total = DATA.screens.length, drawn = 0, derived = 0;
    DATA.screens.forEach(function (s) { Object.keys(s.variants).forEach(function (k) { if (s.variants[k].how === 'drawn') drawn++; else derived++; }); });
    main.appendChild(el('h1', { text: 'Taybah design reference' }));
    main.appendChild(el('p', { class: 'lead', text: 'Every screen of the app, one page each, in light and dark, Arabic (RTL) and English (LTR), at the compact, medium, expanded and short window sizes. Drawn frames come from screens/ (one file per frame); the rest are derived from them and marked so.' }));
    main.appendChild(el('div', { class: 'stats' }, [
      [DATA.stacks.length, 'stacks'], [total, 'screens'], [drawn, 'drawn variants'], [derived, 'derived variants']
    ].map(function (x) { return el('div', { class: 'stat' }, [el('b', { text: String(x[0]) }), el('span', { text: x[1] })]); })));
    var cards = el('div', { class: 'cards' });
    DATA.stacks.forEach(function (st) {
      var first = screensById[st.screens[0]];
      var v = first.variants['light-rtl'] ? 'light-rtl' : Object.keys(first.variants)[0];
      cards.appendChild(el('a', { class: 'card', href: stackUrl(st.id) }, [
        el('div', { class: 'thumb' }, [el('iframe', { src: BASE + first.stack + '/' + first.id + '/' + v + '.html', title: st.title + ' preview', loading: 'lazy', tabindex: '-1', 'aria-hidden': 'true' })]),
        el('div', { class: 'meta' }, [el('b', { text: st.title }), el('span', { text: st.screens.length + ' screens · ' + st.blurb })])
      ]));
    });
    main.appendChild(cards);
    main.appendChild(el('div', { class: 'links' }, [
      ['../quran-app-design-system.html', 'Design system (tokens and components)'],
      ['CATALOG.md', 'CATALOG.md (for agents)'], ['README.md', 'README.md']
    ].map(function (l) { return el('a', { href: BASE + l[0], text: l[1] }); })));
  }

  // ---------------------------------------------------------------------------------- boot
  function rerender() {
    save();
    buildTop();
    if (VIEW === 'home') return;
    world.innerHTML = '';
    if (io) { io.disconnect(); io = null; }
    selected = null;
    if (isScreen) renderScreen(VIEW.slice(7)); else renderStack(VIEW.slice(6));
    world.classList.toggle('hide-badges', !state.badges);
    buildInspect();
    fit();
  }

  function boot() {
    buildPages();
    var shell = document.querySelector('.shell');
    if (VIEW === 'home') {
      shell.classList.add('no-inspect');
      var main = el('main', { class: 'home' });
      shell.appendChild(main);
      buildTop();
      renderHome(main);
      return;
    }
    canvas = el('main', { class: 'canvas', 'aria-label': 'Canvas' });
    world = el('div', { class: 'world' });
    canvas.appendChild(world);
    shell.appendChild(canvas);
    shell.appendChild(el('aside', { class: 'inspect', 'aria-label': 'Inspector' }));
    wireCanvas();
    rerender();
  }
  boot();
})();
