"""The review page: one self-contained HTML document (inline CSS and JS, no CDN). Served at GET /.

Quran text comes from the list file and the stretch endpoint as Tanzil has it. It is inserted with
textContent, one token per span, and the spaces between tokens are kept, so the text is never altered.
"""

PAGE = r"""<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>مراجعة توقيت الآيات</title>
<style>
:root { color-scheme: light dark; --bg:#f7f5f0; --fg:#1d1b18; --muted:#6b665c; --card:#ffffff; --line:#e2ddd2;
  --accent:#1f6f5c; --warn:#a4541a; --now:#e3f1eb; --tok:#c9e6d9; }
@media (prefers-color-scheme: dark) {
  :root { --bg:#141412; --fg:#ece8df; --muted:#9b958a; --card:#1d1d1a; --line:#34322d; --accent:#6cc4a6;
    --warn:#e5a06a; --now:#22332d; --tok:#2f4a40; }
}
* { box-sizing: border-box; }
body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background:var(--bg); color:var(--fg); }
header { padding:12px 18px; border-bottom:1px solid var(--line); display:flex; gap:16px; align-items:center; flex-wrap:wrap; }
header h1 { font-size:18px; margin:0; }
#progress, #status { color:var(--muted); font-size:14px; }
#hint { color:var(--muted); padding:8px 18px; margin:0; font-size:14px; border-bottom:1px solid var(--line); }
main { display:grid; grid-template-columns: 300px 1fr; min-height: calc(100vh - 110px); }
aside { border-inline-end:1px solid var(--line); overflow:auto; max-height: calc(100vh - 110px); }
.stretch { display:block; width:100%; text-align:start; background:none; border:0; border-bottom:1px solid var(--line);
  padding:10px 14px; color:inherit; cursor:pointer; font:inherit; }
.stretch[aria-current="true"] { background:var(--now); }
.stretch .meta { color:var(--muted); font-size:13px; margin-top:2px; }
.stretch .done { color:var(--accent); }
.badge { display:inline-block; font-size:12px; padding:1px 7px; border-radius:999px; border:1px solid var(--warn);
  color:var(--warn); margin-inline-start:6px; }
#panel { padding:16px 20px; overflow:auto; }
#panel h2 { font-size:17px; margin:0 0 10px; }
audio { width:100%; margin-bottom:12px; }
.controls { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:12px; }
button { font:inherit; padding:6px 12px; min-height:32px; border-radius:8px; border:1px solid var(--line);
  background:var(--card); color:var(--fg); cursor:pointer; }
button:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
button[aria-pressed="true"] { border-color:var(--accent); color:var(--accent); }
button.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
button:disabled { opacity:.5; cursor:default; }
.clock { font-variant-numeric:tabular-nums; color:var(--muted); font-size:14px; }
.row { display:grid; grid-template-columns: 48px 1fr; gap:10px; padding:10px; border:1px solid var(--line);
  border-radius:10px; background:var(--card); margin-bottom:8px; }
.row.now { border-color:var(--accent); background:var(--now); }
.row.warn { border-color:var(--warn); }
.num { font-variant-numeric:tabular-nums; font-weight:600; text-align:center; padding-top:6px; }
.text { font-family:"Amiri Quran", "Scheherazade New", "Amiri", serif; font-size:26px; line-height:1.9; direction:rtl; margin:0; }
.tok { border-radius:6px; padding:0 2px; cursor:pointer; }
.tok.cur { background:var(--tok); color:var(--fg); }
.times { font-variant-numeric:tabular-nums; font-size:13px; color:var(--muted); display:flex; gap:14px; flex-wrap:wrap; }
.times b { color:var(--fg); font-weight:600; }
.warnmsg { color:var(--warn); font-size:13px; }
.rowctl { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
.rowctl button { min-height:28px; padding:3px 9px; font-size:13px; }
.finish { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-top:14px;
  position:sticky; bottom:0; z-index:2; background:var(--bg); padding:12px 0; border-top:1px solid var(--line); }
@media (max-width:760px) { main { grid-template-columns:1fr; } aside { max-height:200px; border-inline-end:0; border-bottom:1px solid var(--line); } }
</style>
</head>
<body>
<header>
  <h1>مراجعة توقيت الآيات</h1>
  <span id="progress"></span>
  <span id="status" aria-live="polite"></span>
</header>
<p id="hint">استمع: الكلمة الحالية مظللة وتتبع الصوت. إن كانت التوقيتات صحيحة اضغط «صحيح» (أو Enter). إن كانت هناك أخطاء، اضغط M عند بداية الآية التالية ثم «تم». المسافة: تشغيل أو إيقاف. J وL: ثلاث ثوانٍ للخلف وللأمام.</p>
<main>
  <aside id="list" aria-label="المقاطع"></aside>
  <section id="panel" aria-label="مراجعة المقطع">
    <h2 id="title"></h2>
    <audio id="audio" controls preload="metadata"></audio>
    <div class="controls">
      <button id="play" type="button" aria-keyshortcuts="Space">تشغيل</button>
      <button id="back" type="button" aria-keyshortcuts="J">ثلاث ثوانٍ للخلف (J)</button>
      <button id="fwd" type="button" aria-keyshortcuts="L">ثلاث ثوانٍ للأمام (L)</button>
      <button id="speed1" type="button" aria-pressed="true">1×</button>
      <button id="speed75" type="button" aria-pressed="false">0.75×</button>
      <button id="markNext" type="button" aria-keyshortcuts="M">بداية الآية التالية (M)</button>
      <span class="clock" id="clock"></span>
    </div>
    <div id="rows"></div>
    <div class="finish">
      <button id="ok" type="button" class="primary" aria-keyshortcuts="Enter">صحيح، لا توجد بدايات معلّمة</button>
      <button id="done" type="button" class="primary" aria-keyshortcuts="Enter">تم، حفظ البدايات المعلّمة</button>
      <span id="stretchStatus" class="clock"></span>
    </div>
  </section>
</main>
<script>
(function () {
  "use strict";
  var MS_NUDGE = 250;
  var TOKEN_TAIL_MS = 200;
  var state = { list: null, marks: null, idx: 0, rate: 1, detail: {}, saving: Promise.resolve(),
                raf: null, view: { rows: {}, tokens: [], lastTok: null, lastRow: null } };
  var audio = document.getElementById("audio");
  var pendingSeek = null;

  function $(id) { return document.getElementById(id); }
  function pad3(n) { return String(n).padStart(3, "0"); }
  function fmt(ms) {
    var m = Math.floor(ms / 60000);
    var s = (ms % 60000) / 1000;
    return m + ":" + s.toFixed(2).padStart(5, "0");
  }
  function setStatus(text) { $("status").textContent = text; }
  function stretch() { return state.list.stretches[state.idx]; }
  function moshaf() { return state.list.moshaf; }
  function surahMarks(st) {
    var m = state.marks;
    if (!m[moshaf()]) { m[moshaf()] = {}; }
    if (!m[moshaf()][pad3(st.surah)]) { m[moshaf()][pad3(st.surah)] = {}; }
    return m[moshaf()][pad3(st.surah)];
  }
  function isReviewed(st) { return state.marks.reviewed.indexOf(st.id) !== -1; }
  function isMarked(st, a) { return surahMarks(st)[String(a)] !== undefined; }
  function markedCount(st) {
    var sm = surahMarks(st);
    return Object.keys(sm).filter(function (k) { return +k >= st.lo && +k <= st.hi; }).length;
  }
  function hasMarks(st) { return markedCount(st) > 0; }
  function curStart(st, a) {
    for (var i = 0; i < st.ayahs.length; i++) { if (st.ayahs[i].ayah === a) { return st.ayahs[i].start_ms; } }
    return 0;
  }
  function effective(st, a) {
    var mk = surahMarks(st)[String(a)];
    return mk === undefined ? curStart(st, a) : mk;
  }

  function save() {
    var body = JSON.stringify(state.marks);
    state.saving = state.saving.then(function () {
      setStatus("جارٍ الحفظ…");
      return fetch("/api/marks", { method: "POST", headers: { "Content-Type": "application/json" }, body: body })
        .then(function (r) {
          if (!r.ok) { throw new Error("HTTP " + r.status); }
          setStatus("تم الحفظ");
        })
        .catch(function () { setStatus("تعذّر الحفظ. تحقق من الخادم ثم أعد المحاولة."); });
    });
  }

  function renderProgress() {
    var total = state.list.stretches.length;
    var done = state.list.stretches.filter(isReviewed).length;
    $("progress").textContent = "تمت مراجعة " + done + " من " + total + " مقاطع";
  }

  function renderList() {
    var aside = $("list");
    aside.textContent = "";
    state.list.stretches.forEach(function (st, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "stretch";
      b.setAttribute("aria-current", i === state.idx ? "true" : "false");
      var t = document.createElement("div");
      t.textContent = "سورة " + st.surah + " · الآيات " + st.lo + "–" + st.hi;
      if (st.low_confidence) {
        var badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "ثقة منخفضة";
        t.appendChild(badge);
      }
      var m = document.createElement("div");
      m.className = "meta";
      m.textContent = (isReviewed(st) ? "تمت المراجعة" : "لم تُراجع") + " · بدايات معدّلة: " + markedCount(st);
      if (isReviewed(st)) { m.classList.add("done"); }
      b.appendChild(t);
      b.appendChild(m);
      b.addEventListener("click", function () { select(i, false); });
      aside.appendChild(b);
    });
    renderProgress();
  }

  function loadDetail(st) {
    if (state.detail[st.id]) { return Promise.resolve(state.detail[st.id]); }
    return fetch("/api/stretch/" + st.id).then(function (r) {
      if (!r.ok) { throw new Error("HTTP " + r.status); }
      return r.json();
    }).then(function (d) {
      state.detail[st.id] = d;
      return d;
    });
  }

  function select(i, autoplay) {
    state.idx = i;
    var st = stretch();
    audio.pause();
    audio.src = "/audio/" + st.audio;
    pendingSeek = st.window.start_ms / 1000;
    state.autoplay = !!autoplay;
    $("title").textContent = "سورة " + st.surah + " · الآيات " + st.lo + "–" + st.hi;
    renderList();
    renderRows();
    loadDetail(st).then(function () {
      if (stretch() === st) { renderRows(); }
    }).catch(function () { setStatus("تعذّر تحميل توقيت الكلمات لهذا المقطع"); });
    updateFinish();
  }

  function updateFinish() {
    var st = stretch();
    var marks = hasMarks(st);
    $("ok").disabled = marks;
    $("done").textContent = isReviewed(st) && !marks ? "تم، المقطع معتمد" : "تم، حفظ البدايات المعلّمة";
    $("stretchStatus").textContent = isReviewed(st) ? "المقطع معتمد" : "";
  }

  function setMark(a, ms) {
    var st = stretch();
    surahMarks(st)[String(a)] = Math.max(0, Math.round(ms));
    save();
    renderRows();
    renderList();
    updateFinish();
  }

  function clearMark(a) {
    var st = stretch();
    delete surahMarks(st)[String(a)];
    save();
    renderRows();
    renderList();
    updateFinish();
  }

  function listenFrom(a) {
    var st = stretch();
    audio.currentTime = Math.max(0, effective(st, a) - 1000) / 1000;
    audio.play();
  }

  function markNext() {
    var st = stretch();
    var target = null;
    for (var i = 0; i < st.ayahs.length; i++) {
      var a = st.ayahs[i].ayah;
      if (a > st.lo && !isMarked(st, a)) { target = a; break; }
    }
    if (target === null) {
      setStatus("لا توجد آية غير معلّمة بعد هذا المقطع");
      return;
    }
    setMark(target, audio.currentTime * 1000);
    setStatus("عُلّمت بداية الآية " + target);
    var el = state.view.rows[target];
    if (el) { el.scrollIntoView({ block: "nearest" }); }
  }

  function labelled(label, value) {
    var s = document.createElement("span");
    s.textContent = label + ": ";
    var b = document.createElement("b");
    b.textContent = value;
    s.appendChild(b);
    return s;
  }

  function button(label, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function tokensFor(st, a) {
    var d = state.detail[st.id];
    if (!d) { return null; }
    for (var i = 0; i < d.ayahs.length; i++) { if (d.ayahs[i].ayah === a) { return d.ayahs[i].tokens; } }
    return null;
  }

  function textNode(item, st) {
    var p = document.createElement("p");
    p.className = "text";
    p.setAttribute("lang", "ar");
    var tokens = tokensFor(st, item.ayah);
    if (!tokens) {
      p.textContent = item.text;
      return p;
    }
    tokens.forEach(function (tok, i) {
      if (i > 0) { p.appendChild(document.createTextNode(" ")); }
      var span = document.createElement("span");
      span.textContent = tok.text;
      if (tok.start_ms !== null && tok.start_ms !== undefined) {
        span.className = "tok";
        span.setAttribute("data-a", String(item.ayah));
        state.view.tokens.push({ ayah: item.ayah, start: tok.start_ms, end: tok.end_ms, el: span });
        span.addEventListener("click", function () { audio.currentTime = tok.start_ms / 1000; });
      }
      p.appendChild(span);
    });
    return p;
  }

  function row(st, item, prevStart) {
    var a = item.ayah;
    var eff = effective(st, a);
    var wrap = document.createElement("div");
    wrap.className = "row";
    wrap.setAttribute("data-ayah", String(a));
    var num = document.createElement("div");
    num.className = "num";
    num.textContent = String(a);
    var body = document.createElement("div");
    body.appendChild(textNode(item, st));

    var times = document.createElement("div");
    times.className = "times";
    times.appendChild(labelled("الحالية", fmt(item.start_ms)));
    times.appendChild(labelled("المعلّمة", isMarked(st, a) ? fmt(eff) : "—"));
    body.appendChild(times);
    if (prevStart !== null && eff <= prevStart) {
      var warn = document.createElement("div");
      warn.className = "warnmsg";
      warn.textContent = "هذا الوقت يسبق الآية السابقة";
      body.appendChild(warn);
      wrap.classList.add("warn");
    }

    var ctl = document.createElement("div");
    ctl.className = "rowctl";
    ctl.appendChild(button("بداية هنا", function () { setMark(a, audio.currentTime * 1000); }));
    ctl.appendChild(button("−٠٫٢٥ ث", function () { setMark(a, eff - MS_NUDGE); }));
    ctl.appendChild(button("+٠٫٢٥ ث", function () { setMark(a, eff + MS_NUDGE); }));
    ctl.appendChild(button("استمع من هنا", function () { listenFrom(a); }));
    var clear = button("مسح", function () { clearMark(a); });
    clear.disabled = !isMarked(st, a);
    ctl.appendChild(clear);
    body.appendChild(ctl);

    wrap.appendChild(num);
    wrap.appendChild(body);
    return wrap;
  }

  function renderRows() {
    var st = stretch();
    var box = $("rows");
    box.textContent = "";
    state.view = { rows: {}, tokens: [], lastTok: null, lastRow: null };
    var prev = null;
    st.ayahs.forEach(function (item) {
      var eff = effective(st, item.ayah);
      var el = row(st, item, prev);
      state.view.rows[item.ayah] = el;
      box.appendChild(el);
      prev = eff;
    });
    tick();
  }

  function finishStretch() {
    var st = stretch();
    if (!isReviewed(st)) {
      state.marks.reviewed.push(st.id);
      state.marks.reviewed.sort();
    }
    save();
    advance();
  }

  function advance() {
    var list = state.list.stretches;
    var n = list.length;
    for (var k = 1; k <= n; k++) {
      var j = (state.idx + k) % n;
      if (!isReviewed(list[j])) {
        select(j, true);
        return;
      }
    }
    setStatus("لا توجد مقاطع أخرى غير مراجعة");
    renderList();
    updateFinish();
  }

  function setCur(el, on) {
    if (el) { el.classList.toggle("cur", on); }
  }

  function setRow(a) {
    var el = a === null ? null : state.view.rows[a];
    if (el === state.view.lastRow) { return; }
    if (state.view.lastRow) { state.view.lastRow.classList.remove("now"); }
    if (el) { el.classList.add("now"); }
    state.view.lastRow = el;
  }

  // Highlight for the playhead. With no marks in the stretch, the word the aligner placed at the playhead
  // is shaded and its ayah is the row. Once the developer has marked starts, only the marked ayah starts
  // are used (ayah level), so the effect of the marks can be heard.
  function tick() {
    var st = stretch();
    if (!st || !state.list) { return; }
    var t = audio.currentTime * 1000;
    if (t >= st.window.end_ms && !audio.paused) { audio.pause(); }
    $("clock").textContent = fmt(t) + " / " + fmt(st.window.end_ms);
    var wordMode = !hasMarks(st) && state.view.tokens.length > 0;
    var ayahNow = null;
    st.ayahs.forEach(function (item) {
      if (effective(st, item.ayah) <= t) { ayahNow = item.ayah; }
    });
    var tokNow = null;
    if (wordMode) {
      state.view.tokens.forEach(function (tk) {
        if (tk.start <= t) { tokNow = tk; }
      });
      if (tokNow && t > tokNow.end + TOKEN_TAIL_MS) { tokNow = null; }
      if (tokNow && tokNow.el.getAttribute("data-a") !== null) { ayahNow = +tokNow.ayah; }
    }
    if (tokNow !== state.view.lastTok) {
      setCur(state.view.lastTok && state.view.lastTok.el, false);
      setCur(tokNow && tokNow.el, true);
      state.view.lastTok = tokNow;
    }
    setRow(ayahNow);
  }

  function loop() {
    tick();
    state.raf = audio.paused ? null : requestAnimationFrame(loop);
  }

  function startLoop() {
    if (state.raf === null) { state.raf = requestAnimationFrame(loop); }
  }

  function togglePlay() {
    if (audio.paused) { audio.play(); } else { audio.pause(); }
  }

  function seekBy(deltaMs) {
    var st = stretch();
    var t = audio.currentTime * 1000 + deltaMs;
    audio.currentTime = Math.min(st.window.end_ms, Math.max(st.window.start_ms, t)) / 1000;
  }

  function setSpeed(rate) {
    state.rate = rate;
    audio.defaultPlaybackRate = rate;
    audio.playbackRate = rate;
    $("speed1").setAttribute("aria-pressed", String(rate === 1));
    $("speed75").setAttribute("aria-pressed", String(rate === 0.75));
  }

  audio.addEventListener("loadedmetadata", function () {
    audio.playbackRate = state.rate;  // setting src resets the rate, so set it again
    if (pendingSeek !== null) { audio.currentTime = pendingSeek; pendingSeek = null; }
    if (state.autoplay) { state.autoplay = false; audio.play(); }
  });
  audio.addEventListener("play", function () { $("play").textContent = "إيقاف"; startLoop(); });
  audio.addEventListener("pause", function () { $("play").textContent = "تشغيل"; tick(); });
  audio.addEventListener("seeked", tick);
  audio.addEventListener("timeupdate", tick);

  $("play").addEventListener("click", togglePlay);
  $("back").addEventListener("click", function () { seekBy(-3000); });
  $("fwd").addEventListener("click", function () { seekBy(3000); });
  $("speed1").addEventListener("click", function () { setSpeed(1); });
  $("speed75").addEventListener("click", function () { setSpeed(0.75); });
  $("markNext").addEventListener("click", markNext);
  $("ok").addEventListener("click", function () {
    if (hasMarks(stretch())) { setStatus("توجد بدايات معلّمة. استخدم «تم»."); return; }
    finishStretch();
  });
  $("done").addEventListener("click", finishStretch);

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || !state.list) { return; }
    var tag = e.target.tagName;
    var native = tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "A";
    if (e.code === "Space") {
      if (native) { return; }  // a focused button clicks itself on Space
      e.preventDefault();
      togglePlay();
      return;
    }
    if (e.code === "Enter") {
      if (native) { return; }  // a focused button clicks itself on Enter
      e.preventDefault();
      finishStretch();  // no marks: the same as «صحيح»; with marks: «تم»
      return;
    }
    if (e.code === "KeyJ") { seekBy(-3000); }
    else if (e.code === "KeyL") { seekBy(3000); }
    else if (e.code === "KeyM") { e.preventDefault(); if (!e.repeat) { markNext(); } }  // a held key marks once
  });

  function boot() {
    Promise.all([fetch("/api/list").then(function (r) { return r.json(); }),
                 fetch("/api/marks").then(function (r) { return r.json(); })])
      .then(function (res) {
        state.list = res[0];
        state.marks = res[1];
        if (!state.marks.reviewed) { state.marks.reviewed = []; }
        if (!state.list.stretches.length) { setStatus("لا توجد مقاطع للمراجعة"); return; }
        var first = state.list.stretches.findIndex(function (s) { return !isReviewed(s); });
        select(first === -1 ? 0 : first, false);
      })
      .catch(function () { setStatus("تعذّر تحميل البيانات من الخادم"); });
  }
  boot();
})();
</script>
</body>
</html>
"""
