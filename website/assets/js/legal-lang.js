(function () {
  function langFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var q = params.get('lang');
    if (q === 'en' || q === 'ar') return q;
    return null;
  }

  function applyLang(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('.lang-ar').forEach(function (el) {
      el.hidden = lang !== 'ar';
    });
    document.querySelectorAll('.lang-en').forEach(function (el) {
      el.hidden = lang !== 'en';
    });
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      var isActive = btn.getAttribute('data-lang-btn') === lang;
      btn.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
    try {
      localStorage.setItem('taybah-site-lang', lang);
    } catch (e) {}
  }

  var lang = langFromQuery();
  if (!lang) {
    try {
      lang = localStorage.getItem('taybah-site-lang');
    } catch (e) {}
  }
  if (lang !== 'en' && lang !== 'ar') {
    lang = document.documentElement.getAttribute('data-default-lang') || 'ar';
  }
  applyLang(lang);
})();
