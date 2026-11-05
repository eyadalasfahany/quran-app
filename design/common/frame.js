/* Taybah design reference: lays a phone frame out for a window class.
 *
 * Every variant document loads this. ?size=compact|medium|expanded|landscape picks the window
 * (spec §4, ADR 0036, ADR 0051 as amended 2 Nov 2026):
 *   compact   390 x 844   as drawn: bottom tab bar, bottom sheets
 *   medium    744 x 1133  content in the 720 column, bottom bar capped at 720, sheets as a 560 card
 *   expanded  1194 x 834  the 76 pt rail on the start edge (screens clear 100), sheets as a 400 side panel
 *   landscape 844 x 390   short window: the rail, sheets as a 560 card
 * The build script tags the frame's top-level parts with data-role (flow, float, bleed, tabbar,
 * rail, sheet, scrim); this file only moves them. Drawn tablet windows and boards (widgets, watch)
 * are shown as drawn. ?mark=1 outlines UI text the LTR build could not translate.
 */
(function () {
  'use strict';
  var SIZES = { compact: [390, 844], medium: [744, 1133], expanded: [1194, 834], landscape: [844, 390] };
  var COLUMN = 720;          // CONTENT_COLUMN_MAX_WIDTH
  var RAIL_W = 76, RAIL_MAX_H = 324, RAIL_INSET = 12, RAIL_CLEAR = 100;
  var PANEL_W = 400;         // spec: persistent side panel, 360-420
  var CARD_W = 560;          // ADR 0013: large sheet card
  var SAFE_BOTTOM = { expanded: 20, landscape: 21, medium: 20 };

  var q = new URLSearchParams(location.search);
  if (q.get('mark') === '1') document.documentElement.classList.add('mark');
  var size = SIZES[q.get('size')] ? q.get('size') : 'compact';
  var body = document.body;
  var root = document.querySelector('[data-frame-root]');
  body.dataset.size = size;

  if (!root || body.dataset.kind !== 'phone' || body.dataset.fixed === '1' || size === 'compact') return;

  var W = SIZES[size][0], H = SIZES[size][1];
  var rtl = getComputedStyle(root).direction === 'rtl';
  var START = rtl ? 'right' : 'left', END = rtl ? 'left' : 'right';
  var useRail = size === 'expanded' || size === 'landscape';
  var kids = Array.prototype.slice.call(root.children);
  var role = function (el) { return el.getAttribute('data-role'); };
  var px = function (v) { return /^-?[\d.]+px$/.test(v || '') ? parseFloat(v) : (v === '0' ? 0 : null); };
  var pct = function (v) { return /^-?[\d.]+%$/.test(v || '') ? parseFloat(v) / 100 : null; };

  var tab = kids.filter(function (k) { return role(k) === 'tabbar' || role(k) === 'rail'; })[0];
  var sheet = kids.filter(function (k) { return role(k) === 'sheet'; })[0];
  var asPanel = size === 'expanded' && !!sheet;

  root.style.width = W + 'px';
  root.style.height = H + 'px';

  // the content column, measured from the start edge
  var clearStart = useRail && tab ? RAIL_CLEAR : 0;
  var clearEnd = asPanel ? PANEL_W : 0;
  var avail = W - clearStart - clearEnd;
  var C = Math.min(avail, COLUMN);
  var colStart = clearStart + (avail - C) / 2;
  var colEnd = W - colStart - C;

  // where the tab bar sat, so things that cleared it can move down when it becomes a rail
  var tabTop = null;
  if (tab && role(tab) === 'tabbar') tabTop = (px(tab.style.bottom) || 0) + (px(tab.style.height) || tab.offsetHeight);
  var safe = SAFE_BOTTOM[size] || 0;

  function place(el, side, offset) {
    var v = el.style[side];
    var n = px(v), p = pct(v);
    if (n !== null) el.style[side] = (offset + n) + 'px';
    else if (p !== null) el.style[side] = 'calc(' + offset + 'px + ' + (C * p) + 'px)';
  }

  kids.forEach(function (el) {
    var r = role(el), st = el.style;
    if (r === 'flow') {
      st.boxSizing = 'border-box';
      st.width = C + 'px';
      st.maxWidth = C + 'px';
      st.marginInlineStart = colStart + 'px';
      st.marginInlineEnd = colEnd + 'px';
      st.alignSelf = 'auto';
    } else if (r === 'float') {
      var w = px(st.width);
      if (w !== null && w >= 389) st.width = C + 'px';
      var hasStart = st[START] !== '' && st[START] !== 'auto';
      var hasEnd = st[END] !== '' && st[END] !== 'auto';
      if (hasStart) place(el, START, colStart);
      if (hasEnd) place(el, END, hasStart || pct(st[END]) === null ? colEnd : colStart);
      if (!hasStart && !hasEnd) st[START] = colStart + 'px';
      var b = px(st.bottom);
      if (useRail && tabTop !== null && b !== null && b >= tabTop - 8) {
        // it cleared the bottom bar: now 12 above the bottom safe area
        st.bottom = (b - tabTop + 12 + safe) + 'px';
        if (b - tabTop < 40 && hasStart && hasEnd) { // the mini player: 116 from the start edge
          st[START] = (RAIL_CLEAR + 16) + 'px';
          st[END] = Math.max(16, W - (RAIL_CLEAR + 16) - COLUMN) + 'px';
        }
      }
    } else if (r === 'tabbar' && !useRail) {
      var side = Math.max(px(st.left) || 16, (W - COLUMN) / 2);
      st.left = side + 'px';
      st.right = side + 'px';
    } else if ((r === 'tabbar' || r === 'rail') && useRail) {
      var h = Math.min(RAIL_MAX_H, H - 2 * RAIL_INSET);
      st.left = st.right = st.bottom = 'auto';
      st.top = Math.round((H - h) / 2) + 'px';
      st[START] = RAIL_INSET + 'px';
      st.width = RAIL_W + 'px';
      st.height = h + 'px';
      st.display = 'flex';
      st.gridTemplateColumns = 'none';
      st.flexDirection = 'column';
      st.gap = '4px';
      st.padding = '6px';
      st.borderRadius = '32px';
      Array.prototype.forEach.call(el.children, function (a) {
        a.style.flex = '1 1 0px';
        a.style.flexDirection = 'column';
        a.style.minWidth = '0';
        a.style.width = 'auto';
        a.style.borderRadius = '26px';
      });
    } else if (r === 'sheet') {
      var top = px(st.top), hgt = px(st.height);
      if (asPanel) {
        st.top = '0px'; st.bottom = '0px'; st.height = 'auto';
        st[START] = 'auto'; st[END] = '0px'; st.width = PANEL_W + 'px';
        st.borderRadius = '0px';
        st.boxShadow = 'none';
        st.borderInlineStart = '1px solid var(--line, rgba(127,127,127,.25))';
      } else {
        var cw = Math.min(CARD_W, W - 32);
        st.left = st.right = ((W - cw) / 2) + 'px';
        if (top !== null) st.top = Math.round(top / 844 * H) + 'px';
        else if (hgt !== null) st.height = Math.round(hgt / 844 * H) + 'px';
      }
    } else if (r === 'scrim' && asPanel) {
      st.display = 'none';
    }
  });
})();
