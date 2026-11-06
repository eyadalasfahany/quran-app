/* Taybah suggestion form (suggest.html). Vanilla, no dependencies, no storage.
   The form is plain HTML without this script; it simply can't send. */
(function () {
  'use strict';

  var form = document.getElementById('suggest-form');
  if (!form || !window.fetch) return;

  var root = document.documentElement;
  var lang = root.lang === 'en' ? 'en' : 'ar';
  var api = form.getAttribute('data-api');
  var fields = form.querySelector('[data-fields]');
  var status = form.querySelector('[data-status]');
  var submit = form.querySelector('[data-submit]');
  var idle = submit.querySelector('[data-idle]');
  var busy = submit.querySelector('[data-busy]');
  var sending = false;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var ORDER = ['name', 'email', 'message'];

  function input(name) {
    return form.querySelector('[name="' + name + '"]');
  }

  /* Localised copy lives in the HTML as <template data-msg="…">; pick the page's language. */
  function msg(key) {
    var tpl = form.querySelector('template[data-msg="' + key + '"]');
    if (!tpl) return '';
    var node = tpl.content.querySelector('[data-l="' + lang + '"]');
    return node ? node.textContent : '';
  }

  function setError(name, text) {
    var el = input(name);
    var err = document.getElementById('suggest-' + name + '-error');
    if (err) err.textContent = text || '';
    if (el) {
      if (text) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    }
  }

  function clearErrors() {
    ORDER.forEach(function (name) { setError(name, ''); });
  }

  function setStatus(text, tone) {
    status.textContent = text;
    status.setAttribute('data-tone', tone || '');
  }

  function setSending(on) {
    sending = on;
    submit.disabled = on;
    idle.hidden = on;
    busy.hidden = !on;
    form.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function focusFirst(names) {
    for (var i = 0; i < ORDER.length; i++) {
      if (names.indexOf(ORDER[i]) !== -1) {
        var el = input(ORDER[i]);
        if (el) { el.focus(); return; }
      }
    }
  }

  /* Client checks first. Returns the cleaned values, or null when something is invalid. */
  function validate() {
    clearErrors();
    var values = {
      name: input('name').value.trim(),
      email: input('email').value.trim(),
      message: input('message').value.trim()
    };
    var problems = {};
    if (!values.email) problems.email = msg('required');
    else if (!EMAIL_RE.test(values.email)) problems.email = msg('email');
    if (!values.message) problems.message = msg('required');
    else if (values.message.length < 10) problems.message = msg('short');

    var bad = Object.keys(problems);
    if (bad.length === 0) return values;
    bad.forEach(function (name) { setError(name, problems[name]); });
    focusFirst(bad);
    return null;
  }

  function succeed() {
    form.reset();
    clearErrors();
    setStatus(msg('success'), 'success');
    fields.hidden = true;
    status.focus();
  }

  function showServerErrors(body) {
    var errors = (body && body.errors) || {};
    var shown = [];
    ORDER.forEach(function (name) {
      if (errors[name] && errors[name][0]) {
        setError(name, errors[name][0]);
        shown.push(name);
      }
    });
    if (shown.length === 0) setStatus(msg('error'), 'error');
    else focusFirst(shown);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (sending) return;

    var values = validate();
    if (!values) return;

    setStatus('', '');
    setSending(true);

    var body = {
      email: values.email,
      message: values.message,
      locale: lang,
      website: input('website').value
    };
    if (values.name) body.name = values.name;

    fetch(api, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': lang
      },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (res.status === 202) { succeed(); return; }
      if (res.status === 429) { setStatus(msg('limited'), 'error'); return; }
      if (res.status === 422) {
        return res.json().then(showServerErrors, function () {
          setStatus(msg('error'), 'error');
        });
      }
      setStatus(msg('error'), 'error');
    }).catch(function () {
      setStatus(msg('error'), 'error');
    }).then(function () {
      setSending(false);
    });
  });

  ORDER.forEach(function (name) {
    var el = input(name);
    if (el) el.addEventListener('input', function () { setError(name, ''); });
  });
})();
