/* מנוע מצגות + ערכת רכיבים אינטראקטיביים. ללא תלויות, עובד גם מקובץ מקומי (file://). */
(function () {
  'use strict';

  window.DECKS = window.DECKS || {};

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const sk in v) (sk.startsWith('--') ? el.style.setProperty(sk, v[sk]) : (el.style[sk] = v[sk]));
      }
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  /* ---------- רכיבים ---------- */
  const UI = {};

  // שלב: מופיע רק מהלחיצה ה-n על המצגת
  UI.step = (n, node) => { node.classList.add('step'); node.dataset.step = n; return node; };

  // השוואה בגרירה בין שתי תמונות (a משמאל, b מימין)
  UI.compare = ({ a, b, labelA, labelB, start = 50 }) => {
    const box = h('div', { class: 'cmp' },
      h('div', { class: 'layer' }, a),
      h('div', { class: 'layer top' }, b),
      h('div', { class: 'handle' }),
      h('span', { class: 'lab l', onclick: (e) => { e.stopPropagation(); set(100); } }, labelA),
      h('span', { class: 'lab r', onclick: (e) => { e.stopPropagation(); set(0); } }, labelB)
    );
    const set = (p) => box.style.setProperty('--pos', Math.max(0, Math.min(100, p)) + '%');
    set(start);
    let drag = false;
    const move = (e) => { const r = box.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
    box.addEventListener('pointerdown', (e) => { drag = true; box.setPointerCapture(e.pointerId); move(e); });
    box.addEventListener('pointermove', (e) => drag && move(e));
    box.addEventListener('pointerup', () => (drag = false));
    return box;
  };

  // עוגה אחוזית. הצבע מגיע מ---cx של ההורה
  UI.donut = (pct, { live = false } = {}) =>
    h('div', { class: 'donut' + (live ? ' live' : ''), style: { '--p': pct } },
      h('div', { html: '<svg viewBox="0 0 40 40"><circle class="bgc" cx="20" cy="20" r="15.915" pathLength="100"/><circle class="fg" cx="20" cy="20" r="15.915" pathLength="100"/></svg>' }),
      h('div', { class: 'pc' }, pct + '%')
    );

  // ציר זמן אינטראקטיבי. items: {n, date, title, text, phase, off}
  UI.timeline = (items, phases) => {
    const detail = h('div', { class: 'detail' });
    const track = h('div', { class: 'track' });
    const phaseOf = (it) => phases[it.phase] || { name: '', color: 'var(--ink)' };
    function show(i) {
      const it = items[i];
      const p = phaseOf(it);
      detail.style.setProperty('--cx', p.color);
      detail.replaceChildren(
        h('div', { class: 'ph' }, p.name + (it.date ? ' · ' + it.date : '')),
        h('h3', {}, it.title),
        it.text ? h('p', {}, it.text) : null
      );
      [...track.children].forEach((s, j) => s.classList.toggle('on', j === i));
    }
    items.forEach((it, i) =>
      track.append(
        h('button', { class: 'st' + (it.off ? ' off' : ''), style: { '--cx': phaseOf(it).color }, onclick: () => show(i) },
          h('div', { class: 'dot' }, it.n), h('div', { class: 'dd' }, it.date || ''))
      )
    );
    const legend = h('div', { class: 'legend2' },
      Object.values(phases).map((p) => h('span', { style: { '--cx': p.color } }, p.name)));
    const first = Math.max(0, items.findIndex((x) => !x.off));
    show(first);
    return h('div', { class: 'tl' }, track, detail, legend);
  };

  // כרטיס שמתהפך בלחיצה
  UI.flip = ({ front, sub, back, color }) =>
    h('div', { class: 'flip', style: { '--cx': color }, onclick: (e) => e.currentTarget.classList.toggle('on') },
      h('div', { class: 'in' },
        h('div', { class: 'f' }, h('b', {}, front), sub ? h('span', {}, sub) : null),
        h('div', { class: 'b' }, back)));

  // מונה לספירת ידיים
  UI.counter = (name, color) => {
    const val = h('div', { class: 'val' }, '0');
    let n = 0;
    const upd = (d) => { n = Math.max(0, n + d); val.textContent = n; };
    return h('div', { class: 'counter', style: { '--cx': color } },
      h('div', { class: 'nm' }, name), val,
      h('div', { class: 'btns' },
        h('button', { class: 'btn', onclick: () => upd(-1) }, '−'),
        h('button', { class: 'btn', onclick: () => upd(1) }, '+'),
        h('button', { class: 'btn', onclick: () => upd(5) }, '+5')));
  };

  // טיימר לאחור
  UI.timer = (seconds) => {
    let left = seconds, iv = null;
    const val = h('div', { class: 'val' });
    const draw = () => {
      val.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
      val.classList.toggle('done', left === 0);
    };
    const stop = () => { clearInterval(iv); iv = null; };
    const toggle = () => {
      if (iv) return stop();
      if (left === 0) left = seconds;
      iv = setInterval(() => { left = Math.max(0, left - 1); draw(); if (left === 0) stop(); }, 1000);
    };
    draw();
    return h('div', { class: 'timer' }, val,
      h('div', { class: 'btns' },
        h('button', { class: 'btn', onclick: toggle }, 'התחל / עצור'),
        h('button', { class: 'btn', onclick: () => { stop(); left = seconds; draw(); } }, 'אפס')));
  };

  window.DeckKit = { h, UI };

  /* ---------- נגן ---------- */
  function play(deck, id) {
    document.body.classList.add('player');
    document.title = deck.title + ' · מצגות';
    const stage = h('div', { class: 'stage' });
    const view = h('div', { class: 'viewport' }, stage);
    const bar = h('i');
    const progress = h('div', { class: 'progress' }, bar);
    const cnt = h('span', { class: 'cnt' });
    const notesBody = h('div');
    const notes = h('div', { class: 'notes' },
      h('h4', {}, 'הערות מרצה', h('button', { class: 'x', onclick: () => notes.classList.remove('on') }, 'סגור ✕')),
      notesBody);
    const ovGrid = h('div', { class: 'g' });
    const ov = h('div', { class: 'ov', onclick: (e) => e.target === ov && toggleOv(false) }, h('h3', {}, deck.title), ovGrid);
    const ctrl = h('div', { class: 'ctrl' },
      h('button', { onclick: () => prev(), title: 'הקודם' }, '→'),
      cnt,
      h('button', { onclick: () => next(), title: 'הבא' }, '←'),
      h('button', { onclick: () => toggleOv(), title: 'תוכן (O)' }, 'תוכן'),
      h('button', { onclick: () => notes.classList.toggle('on'), title: 'הערות (N)' }, 'הערות'),
      h('button', { onclick: () => fullscreen(), title: 'מסך מלא (F)' }, 'מסך מלא'),
      h('a', { href: 'index.html' }, 'כל המצגות'));
    document.body.append(view, progress, ctrl, notes, ov);

    const slides = deck.slides.map((s, i) => {
      const el = h('section', { class: 'slide ' + window.Slides.cls(s) });
      window.Slides.render(s).forEach((n) => el.append(n));
      stage.append(el);
      ovGrid.append(h('button', { onclick: () => { go(i); toggleOv(false); } }, h('b', {}, i + 1), window.Slides.titleOf(s)));
      const steps = [...el.querySelectorAll('[data-step]')].reduce((m, e) => Math.max(m, Number(e.dataset.step)), 0);
      return { def: s, el, steps };
    });

    // כפתור עריכה: מופיע רק כשהאתר רץ דרך שרת העריכה (edit.bat)
    if (location.protocol.startsWith('http')) {
      fetch('/api/ping', { cache: 'no-store' }).then((r) => r.ok && r.json()).then((j) => {
        if (!j || !j.ok) return;
        ctrl.insertBefore(h('button', { onclick: () => { location.href = 'edit.html?d=' + encodeURIComponent(id) + '#' + (cur + 1); } }, 'עריכה'), ctrl.firstChild);
      }).catch(() => {});
    }

    let cur = 0, step = 0;

    function render() {
      const sl = slides[cur];
      slides.forEach((s, i) => s.el.classList.toggle('on', i === cur));
      sl.el.querySelectorAll('[data-step]').forEach((e) => e.classList.toggle('on', Number(e.dataset.step) <= step));
      cnt.textContent = cur + 1 + ' / ' + slides.length;
      bar.style.width = ((cur + 1) / slides.length) * 100 + '%';
      notesBody.textContent = sl.def.notes || '';
      [...ovGrid.children].forEach((b, i) => b.classList.toggle('cur', i === cur));
      history.replaceState(null, '', '#' + (cur + 1));
    }
    function go(i, st = 0) { cur = Math.max(0, Math.min(slides.length - 1, i)); step = st; render(); }
    function next() { if (step < slides[cur].steps) { step++; render(); } else if (cur < slides.length - 1) go(cur + 1); }
    function prev() { if (step > 0) { step--; render(); } else if (cur > 0) go(cur - 1, slides[cur - 1].steps); }
    function toggleOv(on) { ov.classList.toggle('on', on === undefined ? !ov.classList.contains('on') : on); }
    function fullscreen() {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    }
    function fit() {
      const s = Math.min(innerWidth / 1280, innerHeight / 720);
      stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
    }

    // בעברית כיוון ההתקדמות הוא שמאלה
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'PageDown' || k === ' ' || k === 'Enter') { e.preventDefault(); next(); }
      else if (k === 'ArrowRight' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); prev(); }
      else if (k === 'Home') go(0);
      else if (k === 'End') go(slides.length - 1);
      else if (k === 'f' || k === 'F' || k === 'כ') fullscreen();
      else if (k === 'o' || k === 'O' || k === 'ם') toggleOv();
      else if (k === 'n' || k === 'N' || k === 'מ') notes.classList.toggle('on');
      else if (k === 'Escape') { toggleOv(false); notes.classList.remove('on'); }
    });
    let sx = null;
    view.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    view.addEventListener('touchend', (e) => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 60) (dx < 0 ? next : prev)();
      sx = null;
    });
    let hideT;
    const wake = () => { ctrl.classList.remove('hide'); clearTimeout(hideT); hideT = setTimeout(() => ctrl.classList.add('hide'), 2500); };
    document.addEventListener('mousemove', wake);
    addEventListener('resize', fit);
    fit(); wake();

    const start = parseInt(location.hash.slice(1), 10);
    go(Number.isFinite(start) ? start - 1 : 0);
  }

  // טעינת מצגת לפי ?d=<id>
  window.DeckKit.boot = function () {
    const id = new URLSearchParams(location.search).get('d') || '';
    if (!/^[\w-]+$/.test(id)) { document.body.textContent = 'מצגת לא נמצאה'; return; }
    const sc = document.createElement('script');
    sc.src = 'decks/' + id + '.js';
    sc.onload = () => (window.DECKS[id] ? play(window.DECKS[id], id) : (document.body.textContent = 'מצגת לא נמצאה'));
    sc.onerror = () => (document.body.textContent = 'מצגת לא נמצאה: ' + id);
    document.head.append(sc);
  };
})();
