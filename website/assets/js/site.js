/* Taybah website script. Vanilla, no dependencies, no network calls, no storage.
   Every feature degrades to plain HTML when this file does not run. */
(function () {
  'use strict';

  // The IDs are live. The printed QR never changes: it points at /download, which redirects to the store.
  var APP_STORE_ID = '6828097265';  // numeric Apple ID
  var PROVIDER_TOKEN = '';          // App Store Connect provider token (pt)
  var PLAY_LIVE = true;             // Play listing is published
  var PACKAGE = 'com.taybahapp.taybah';

  /* ---------- Shared helpers ---------- */

  var root = document.documentElement;
  var lang = root.lang === 'en' ? 'en' : 'ar';
  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var wideQuery = window.matchMedia ? window.matchMedia('(min-width: 960px)') : null;
  var reduce = !!(reduceQuery && reduceQuery.matches);
  var hasIO = 'IntersectionObserver' in window;

  function listen(mql, fn) {
    if (!mql) return;
    if (mql.addEventListener) mql.addEventListener('change', fn);
    else if (mql.addListener) mql.addListener(fn);
  }

  listen(reduceQuery, function (e) {
    reduce = !!e.matches;
  });

  // Centre an item inside a horizontal scroller. Scrolls the scroller only, never the window.
  function centreInRow(row, item) {
    var rowBox = row.getBoundingClientRect();
    var itemBox = item.getBoundingClientRect();
    var delta = (itemBox.left + itemBox.width / 2) - (rowBox.left + rowBox.width / 2);
    row.scrollTo({ left: row.scrollLeft + delta, behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------- Titles, descriptions, aria labels ---------- */

  if (lang === 'en') {
    var titleEn = root.getAttribute('data-title-en');
    if (titleEn) document.title = titleEn;
    var descEn = root.getAttribute('data-desc-en');
    var metaDesc = document.querySelector('meta[name="description"]');
    if (descEn && metaDesc) metaDesc.setAttribute('content', descEn);
  }
  document.querySelectorAll('[data-aria-' + lang + ']').forEach(function (el) {
    el.setAttribute('aria-label', el.getAttribute('data-aria-' + lang));
  });

  /* ---------- Mobile navigation panel ---------- */

  var toggle = document.querySelector('[data-nav-toggle]');
  var panel = document.getElementById('nav-panel');

  function setNavOpen(open, returnFocus) {
    if (!toggle || !panel) return;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.hidden = !open;
    if (!open && returnFocus) toggle.focus({ preventScroll: true });
  }

  if (toggle && panel) {
    toggle.addEventListener('click', function () {
      setNavOpen(panel.hidden, false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) setNavOpen(false, true);
    });
    document.addEventListener('click', function (e) {
      if (panel.hidden) return;
      if (panel.contains(e.target) || toggle.contains(e.target)) return;
      setNavOpen(false, false);
    });
    listen(wideQuery, function () {
      if (wideQuery && wideQuery.matches && !panel.hidden) setNavOpen(false, false);
    });
  }

  /* ---------- Header shadow once the page has scrolled ---------- */

  var header = document.querySelector('.site-header');
  var sentinel = document.querySelector('.scroll-sentinel');
  if (header && sentinel && hasIO) {
    var headerIo = new IntersectionObserver(function (entries) {
      header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    });
    headerIo.observe(sentinel);
  }

  /* ---------- Scroll reveal and the ornament draw-on (each element once) ---------- */

  var revealEls = document.querySelectorAll('.reveal, .ornament.draw, .section-head');
  if (hasIO) {
    var revealIo = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) {
      revealIo.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('in');
    });
  }

  /* ---------- Features: chip scrollspy ---------- */

  var chipRow = document.querySelector('.chips__list');
  if (chipRow && hasIO) {
    var chipFor = {};
    chipRow.querySelectorAll('a[href^="#"]').forEach(function (a) {
      chipFor[a.getAttribute('href').slice(1)] = a;
    });
    var spyIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var chip = chipFor[entry.target.id];
        if (!chip) return;
        Object.keys(chipFor).forEach(function (key) {
          chipFor[key].removeAttribute('aria-current');
        });
        chip.setAttribute('aria-current', 'true');
        centreInRow(chipRow, chip.parentElement);
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('.feature[id]').forEach(function (section) {
      if (chipFor[section.id]) spyIo.observe(section);
    });
  }

  /* ---------- Home: tour steps drive the sticky device on desktop ---------- */

  var steps = Array.prototype.slice.call(document.querySelectorAll('.tour__step'));
  if (steps.length) {
    var shots = Array.prototype.slice.call(document.querySelectorAll('.tour__shot'));
    var fill = document.querySelector('.tour__rail-fill');

    var activate = function (index) {
      steps.forEach(function (step, i) {
        step.classList.toggle('is-active', i === index);
      });
      shots.forEach(function (shot) {
        shot.classList.toggle('is-active', Number(shot.getAttribute('data-i')) === index);
      });
      if (fill) fill.style.transform = 'scaleY(' + ((index + 1) / steps.length) + ')';
    };

    activate(0);

    if (hasIO) {
      var tourIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          activate(steps.indexOf(entry.target));
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach(function (step) {
        tourIo.observe(step);
      });
    }
  }

  /* ---------- Store links on the download page ---------- */

  var src = (new URLSearchParams(location.search).get('src') || 'web').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'web';
  var iosCampaign = APP_STORE_ID
    ? 'https://apps.apple.com/app/apple-store/id' + APP_STORE_ID + '?mt=8&ct=' + encodeURIComponent(src) +
      (PROVIDER_TOKEN ? '&pt=' + encodeURIComponent(PROVIDER_TOKEN) : '')
    : '';
  var androidCampaign = PLAY_LIVE
    ? 'https://play.google.com/store/apps/details?id=' + PACKAGE +
      '&referrer=' + encodeURIComponent('utm_source=' + src + '&utm_medium=qr')
    : '';

  /* ---------- Download page: campaign links, then redirect to the device's store ---------- */

  if (document.body && document.body.hasAttribute('data-download')) {
    document.querySelectorAll('[data-store="ios"]').forEach(function (a) {
      if (iosCampaign) a.href = iosCampaign;
    });
    document.querySelectorAll('[data-store="android"]').forEach(function (a) {
      if (androidCampaign) a.href = androidCampaign;
    });

    var ua = navigator.userAgent;
    var isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var isAndroid = /Android/.test(ua);
    var redirectTo = (isIOS && iosCampaign) ? iosCampaign : ((isAndroid && androidCampaign) ? androidCampaign : '');

    if (redirectTo) {
      document.querySelectorAll('[data-state]').forEach(function (el) {
        el.hidden = el.getAttribute('data-state') !== 'opening';
      });
      location.replace(redirectTo);
    }
  }

  /* ---------- QR page: print and fullscreen ---------- */

  var qrCard = document.getElementById('qr-card');
  var printBtn = document.querySelector('[data-qr-action="print"]');
  var fullscreenBtn = document.querySelector('[data-qr-action="fullscreen"]');
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      window.print();
    });
  }
  if (fullscreenBtn && qrCard) {
    if (!qrCard.requestFullscreen) {
      fullscreenBtn.hidden = true;
    } else {
      fullscreenBtn.addEventListener('click', function () {
        qrCard.requestFullscreen().catch(function () {});
      });
    }
  }

  /* ---------- Legal: table of contents from the visible language's headings ---------- */

  var legal = document.querySelector('.legal');
  var tocList = legal ? legal.querySelector('[data-toc]') : null;
  if (legal && tocList) {
    var article = legal.querySelector('article[data-l="' + lang + '"]');
    var headings = article ? Array.prototype.slice.call(article.querySelectorAll('h2')) : [];
    var tocLinks = headings.map(function (h, i) {
      if (!h.id) h.id = 'sec-' + lang + '-' + (i + 1);
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.className = 'toc__link';
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      tocList.appendChild(li);
      return { link: a, heading: h };
    });
    if (tocLinks.length) {
      legal.classList.add('legal--toc');
      if (hasIO) {
        var tocIo = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            tocLinks.forEach(function (item) {
              item.link.setAttribute('aria-current', item.heading === entry.target ? 'true' : 'false');
            });
          });
        }, { rootMargin: '-20% 0px -70% 0px' });
        headings.forEach(function (h) {
          tocIo.observe(h);
        });
      }
    }
  }
})();
