/* עורך המצגות: רשימת שקפים, תצוגה מקדימה חיה וטופס עריכה לפי סוג השקף. שמירה דרך serve.py */
(function () {
  'use strict';
  const { h } = window.DeckKit;
  const { TYPES, COLOR_OPTS } = window.Slides;

  const id = new URLSearchParams(location.search).get('d') || '';
  if (!/^[\w-]+$/.test(id)) { document.body.textContent = 'מצגת לא נמצאה'; return; }

  let deck, savedJSON, sel = 0, serverOk = false;
  let hist = [], hi = 0, snapT = null, prevT = null;
  let selItem = -1, lastSel = -1; // רכיב נבחר בשקף חופשי
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const api = (path, opts) => fetch(path, { cache: 'no-store', ...opts, headers: { 'X-Deck-Edit': '1', ...((opts || {}).headers || {}) } });

  /* ---------- שלד העמוד ---------- */
  const status = h('span', { class: 'ed-status' });
  const titleInput = h('input', { class: 'deck-title', type: 'text', 'aria-label': 'שם המצגת', oninput: (e) => { deck.title = e.target.value; changed(); } });
  const btnUndo = h('button', { title: 'ביטול (Ctrl+Z)', onclick: () => undo() }, '↶ בטל');
  const btnRedo = h('button', { title: 'שחזור (Ctrl+Y)', onclick: () => redo() }, '↷ שחזר');
  const btnSave = h('button', { class: 'primary', title: 'Ctrl+S', onclick: () => save() }, 'שמור');
  const btnView = h('button', { onclick: async () => { if (dirty() && serverOk) await save(); location.href = 'deck.html?d=' + id + '#' + (sel + 1); } }, 'הצג מצגת ←');
  const banner = h('div', { class: 'ed-banner' }, 'העורך עובד רק כשהאתר רץ דרך edit.bat. אפשר לראות את השקפים, אבל אי אפשר לשמור.');
  banner.hidden = true;

  const listEl = h('div', { class: 'ed-items' });
  const addType = h('select', {}, Object.entries(TYPES).map(([k, t]) => h('option', { value: k }, t.label)));
  const listBox = h('aside', { class: 'ed-list' },
    h('div', { class: 'ed-head' }, 'שקפים'), listEl,
    h('div', { class: 'ed-add' }, addType, h('button', { class: 'primary', onclick: () => addSlide(addType.value) }, '+ הוסף')));

  const pv = h('div', { class: 'pv' });
  const stage = h('div', { class: 'stage' });
  pv.append(stage);
  const prevBox = h('div', { class: 'ed-prev' }, pv);
  const centerBox = h('section', { class: 'ed-center' }, prevBox,
    h('div', { class: 'ed-hint' }, 'תצוגה מקדימה: כל הפריטים מוצגים. במצגת עצמה הם נחשפים בלחיצה.'));

  const formBox = h('aside', { class: 'ed-form' });

  const top = h('header', { class: 'ed-top' },
    h('a', { href: 'index.html', onclick: (e) => { if (dirty() && !confirm('יש שינויים שלא נשמרו. לצאת בכל זאת?')) e.preventDefault(); } }, '→ כל המצגות'),
    titleInput, status, btnUndo, btnRedo, btnSave, btnView);

  document.body.classList.add('editor');
  document.body.append(top, banner, h('div', { class: 'ed-main' }, listBox, centerBox, formBox));

  /* ---------- מצב ---------- */
  const dirty = () => JSON.stringify(deck) !== savedJSON;
  function updateStatus(msg) {
    status.textContent = msg || (dirty() ? 'יש שינויים שלא נשמרו' : 'הכול שמור');
    status.classList.toggle('dirty', dirty());
    btnSave.disabled = !serverOk;
    btnUndo.disabled = hi === 0;
    btnRedo.disabled = hi >= hist.length - 1;
  }
  function snap() {
    clearTimeout(snapT);
    const j = JSON.stringify(deck);
    if (j !== hist[hi]) {
      hist = hist.slice(0, hi + 1); hist.push(j);
      if (hist.length > 80) hist.shift();
      hi = hist.length - 1;
    }
    updateStatus();
  }
  function changed() {
    updateStatus();
    clearTimeout(snapT); snapT = setTimeout(snap, 600);
    clearTimeout(prevT); prevT = setTimeout(() => { renderPreview(); renderList(); }, 120);
  }
  function structural() { snap(); renderAll(); }
  function restore(i) { hi = i; deck = JSON.parse(hist[hi]); sel = Math.min(sel, deck.slides.length - 1); titleInput.value = deck.title; renderAll(); }
  function undo() { snap(); if (hi > 0) restore(hi - 1); }
  function redo() { if (hi < hist.length - 1) restore(hi + 1); }

  /* ---------- שמירה והעלאה ---------- */
  async function save() {
    if (!serverOk) return;
    updateStatus('שומר…');
    try {
      const r = await api('/api/save-deck?id=' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(deck) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || r.status);
      savedJSON = JSON.stringify(deck);
      updateStatus('נשמר ב-' + j.saved);
    } catch (e) {
      updateStatus('שגיאה בשמירה');
      alert('השמירה נכשלה: ' + e.message);
    }
  }
  async function upload(file) {
    if (!serverOk) { alert('העלאת תמונות עובדת רק דרך edit.bat'); return null; }
    try {
      const r = await api('/api/upload?name=' + encodeURIComponent(file.name), { method: 'POST', body: file });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || r.status);
      return j.path;
    } catch (e) { alert('ההעלאה נכשלה: ' + e.message); return null; }
  }
  addEventListener('beforeunload', (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- פעולות על שקפים ---------- */
  function addSlide(type) {
    deck.slides.splice(sel + 1, 0, TYPES[type].blank());
    sel += 1; structural();
  }
  function dupSlide(i) { deck.slides.splice(i + 1, 0, clone(deck.slides[i])); sel = i + 1; structural(); }
  function delSlide(i) {
    if (!confirm('למחוק את השקף? אפשר לשחזר עם ״בטל״.')) return;
    deck.slides.splice(i, 1); sel = Math.max(0, Math.min(sel, deck.slides.length - 1)); structural();
  }
  function moveSlide(i, d) {
    const j = i + d;
    if (j < 0 || j >= deck.slides.length) return;
    [deck.slides[i], deck.slides[j]] = [deck.slides[j], deck.slides[i]];
    sel = j; structural();
  }
  function changeType(newType) {
    const old = deck.slides[sel];
    const next = TYPES[newType].blank();
    const keys = TYPES[newType].fields.map((f) => f.k);
    keys.forEach((k) => { if (old[k] !== undefined && typeof old[k] === typeof next[k]) next[k] = old[k]; });
    next.notes = old.notes || '';
    deck.slides[sel] = next; structural();
  }

  /* ---------- רשימת שקפים ---------- */
  /* תמונות ממוזערות: שקף מצויר פעם אחת ונשמר עד שהתוכן שלו משתנה */
  const thumbCache = new Map();
  function buildThumb(s) {
    const st = h('div', { class: 'stage' });
    const el = h('section', { class: 'slide on ' + window.Slides.cls(s) });
    try { window.Slides.render(s).forEach((n) => el.append(n)); } catch (e) { /* שקף שבור: ממוזער ריק */ }
    // מסגרות וידאו לא נטענות בממוזער
    el.querySelectorAll('iframe, video').forEach((n) => n.replaceWith(h('div', { class: 'vid-empty' }, '▶')));
    el.querySelectorAll('[data-step]').forEach((e) => e.classList.add('on'));
    st.append(el);
    return h('div', { class: 'th' }, st);
  }
  function thumbFor(s) {
    const key = JSON.stringify({ ...s, notes: undefined });
    let tpl = thumbCache.get(key);
    if (!tpl) {
      tpl = buildThumb(s);
      thumbCache.set(key, tpl);
      if (thumbCache.size > 250) thumbCache.delete(thumbCache.keys().next().value);
    }
    return tpl.cloneNode(true);
  }

  /* גרירה לסידור מחדש */
  let dragFrom = null;
  const SLIDE_MIME = 'application/x-slide-index';
  function clearMarks() { listEl.querySelectorAll('.drop-before, .drop-after').forEach((e) => e.classList.remove('drop-before', 'drop-after')); }
  function reorder(from, insertAt) {
    if (insertAt > from) insertAt -= 1;
    if (insertAt === from) return;
    const [s] = deck.slides.splice(from, 1);
    deck.slides.splice(insertAt, 0, s);
    sel = insertAt;
    structural();
  }
  function autoScroll(e) {
    const r = listEl.getBoundingClientRect();
    if (e.clientY < r.top + 50) listEl.scrollTop -= 14;
    else if (e.clientY > r.bottom - 50) listEl.scrollTop += 14;
  }

  function renderList() {
    listEl.replaceChildren(...deck.slides.map((s, i) => {
      const on = i === sel;
      const row = h('div', { class: 'it' + (on ? ' on' : ''), draggable: 'true', title: 'גררו כדי לשנות מקום', onclick: () => { sel = i; renderAll(); } },
        h('b', {}, i + 1),
        h('div', { class: 'tw' }, thumbFor(s),
          h('div', { class: 'tt' }, window.Slides.titleOf(s) || (TYPES[s.type] || {}).label || '')));
      row.addEventListener('dragstart', (e) => {
        dragFrom = i; e.dataTransfer.setData(SLIDE_MIME, String(i)); e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => row.classList.add('dragging'), 0);
      });
      row.addEventListener('dragend', () => { dragFrom = null; clearMarks(); row.classList.remove('dragging'); });
      row.addEventListener('dragover', (e) => {
        if (dragFrom == null) return;
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        const r = row.getBoundingClientRect();
        const after = e.clientY > r.top + r.height / 2;
        clearMarks(); row.classList.add(after ? 'drop-after' : 'drop-before');
        autoScroll(e);
      });
      row.addEventListener('drop', (e) => {
        if (dragFrom == null) return;
        e.preventDefault(); e.stopPropagation();
        const r = row.getBoundingClientRect();
        const from = dragFrom; dragFrom = null; clearMarks();
        reorder(from, i + (e.clientY > r.top + r.height / 2 ? 1 : 0));
      });
      if (on) {
        const btn = (txt, tip, fn) => h('button', { title: tip, onclick: (e) => { e.stopPropagation(); fn(); } }, txt);
        row.append(h('div', { class: 'ops' }, btn('▲', 'הזז למעלה', () => moveSlide(i, -1)), btn('▼', 'הזז למטה', () => moveSlide(i, 1)), btn('⧉', 'שכפל', () => dupSlide(i)), btn('✕', 'מחק', () => delSlide(i))));
      }
      return row;
    }));
    const cur = listEl.querySelector('.it.on');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- תצוגה מקדימה ---------- */
  function renderPreview() {
    stage.replaceChildren();
    const s = deck.slides[sel];
    if (!s) return;
    const el = h('section', { class: 'slide on ' + window.Slides.cls(s) });
    try { window.Slides.render(s).forEach((n) => el.append(n)); } catch (e) { el.append(h('p', {}, 'שגיאה בתצוגה: ' + e.message)); }
    el.querySelectorAll('[data-step]').forEach((e) => e.classList.add('on'));
    stage.append(el);
    if (s.type === 'canvas') wireCanvas(el, s);
  }

  /* ---------- שקף חופשי: בחירה, גרירה ושינוי גודל על התצוגה המקדימה ---------- */
  function selectItem(i) {
    if (selItem === i) return;
    selItem = i; renderPreview(); renderForm();
  }
  function wireCanvas(el, s) {
    const cv = el.querySelector('.cv');
    if (!cv) return;
    cv.querySelectorAll('.ci').forEach((n) => {
      const i = +n.dataset.i;
      n.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (n.isContentEditable) { e.stopPropagation(); return; }
        e.preventDefault(); e.stopPropagation();
        selectItem(i);
        const cur = stage.querySelector('.cv [data-i="' + i + '"]');
        if (cur) startDrag(e, s, i, cur, 'move');
      });
    });
    cv.addEventListener('pointerdown', (e) => { if (e.target === cv && selItem !== -1) { selItem = -1; renderPreview(); renderForm(); } });
    cv.addEventListener('dblclick', (e) => {
      const t = e.target.closest && e.target.closest('.ci');
      if (!t) return;
      const i = +t.dataset.i, itm = s.items[i];
      if (!itm || (itm.kind || 'text') !== 'text') return;
      if (selItem !== i) { selItem = i; renderPreview(); renderForm(); }
      editInline(s, i);
    });
    /* קווי עזר */
    (s.guides || []).forEach((g, gi) => {
      const v = g.o === 'v';
      const gn = h('div', { class: 'cvg ' + (v ? 'cvg-v' : 'cvg-h'), title: 'גררו להזזה, גררו אל מחוץ לשקף למחיקה', style: v ? { left: g.p - 6 + 'px' } : { top: g.p - 6 + 'px' } });
      gn.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        const k = cv.getBoundingClientRect().width / 1920 || 1, r = cv.getBoundingClientRect();
        const mv = (ev) => {
          g.p = Math.round(v ? (ev.clientX - r.left) / k : (ev.clientY - r.top) / k);
          gn.style[v ? 'left' : 'top'] = g.p - 6 + 'px';
        };
        const up = () => {
          removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
          if (g.p < 0 || g.p > (v ? 1920 : 1080)) s.guides.splice(gi, 1);
          snap(); renderPreview(); renderForm();
        };
        addEventListener('pointermove', mv); addEventListener('pointerup', up);
      });
      cv.append(gn);
    });
    const it = s.items[selItem];
    const n = it && cv.querySelector('[data-i="' + selItem + '"]');
    if (n) {
      n.classList.add('sel');
      ['nw', 'ne', 'sw', 'se'].forEach((pos) => n.append(h('i', { class: 'hd hd-' + pos, onpointerdown: (e) => { e.preventDefault(); e.stopPropagation(); startDrag(e, s, selItem, n, pos); } })));
    }
  }
  /* ---------- עריכת טקסט בתוך התיבה ---------- */
  function editInline(s, i) {
    const n = stage.querySelector('.cv [data-i="' + i + '"]'), it = s.items[i];
    if (!n || n.isContentEditable) return;
    n.classList.add('editing');
    n.textContent = it.text || '';
    n.style.whiteSpace = 'pre-wrap';
    n.setAttribute('contenteditable', 'plaintext-only');
    if (!n.isContentEditable) n.setAttribute('contenteditable', 'true');
    n.focus();
    const r = document.createRange(); r.selectNodeContents(n);
    const sel_ = getSelection(); sel_.removeAllRanges(); sel_.addRange(r);
    const read = () => String(n.innerText || '').replace(/\r/g, '').replace(/\n$/, '');
    n.addEventListener('input', () => { it.text = read(); updateStatus(); clearTimeout(snapT); snapT = setTimeout(snap, 600); renderForm(); });
    n.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Escape') n.blur(); });
    n.addEventListener('blur', () => { it.text = read(); changed(); snap(); renderPreview(); renderForm(); }, { once: true });
  }

  /* ---------- הצמדה לקווי עזר ולאלמנטים ---------- */
  function snapTargets(s, i, cv) {
    const X = [0, 960, 1920], Y = [0, 540, 1080];
    (s.guides || []).forEach((g) => (g.o === 'v' ? X : Y).push(g.p));
    cv.querySelectorAll('.ci').forEach((el) => {
      if (+el.dataset.i === i) return;
      const x = el.offsetLeft, y = el.offsetTop, w = el.offsetWidth, hh = el.offsetHeight;
      X.push(x, x + w / 2, x + w); Y.push(y, y + hh / 2, y + hh);
    });
    return { X, Y };
  }
  const snapDelta = (vals, targets, thr) => {
    let best = null;
    vals.forEach((v) => targets.forEach((t) => { const d = t - v; if (Math.abs(d) <= thr && (best === null || Math.abs(d) < Math.abs(best.d))) best = { d, t }; }));
    return best;
  };
  function showSnap(cv, xs, ys) {
    cv.querySelectorAll('.cvs').forEach((e) => e.remove());
    xs.forEach((p) => cv.append(h('div', { class: 'cvs cvs-v', style: { left: p - 2 + 'px' } })));
    ys.forEach((p) => cv.append(h('div', { class: 'cvs cvs-h', style: { top: p - 2 + 'px' } })));
  }
  function startDrag(e, s, i, n, mode) {
    const it = s.items[i];
    const cv = stage.querySelector('.cv');
    const k = cv.getBoundingClientRect().width / 1920 || 1;
    const sx = e.clientX, sy = e.clientY;
    const o = { x: it.x || 0, y: it.y || 0, w: it.w || 200, h: it.h || n.offsetHeight || 100 };
    const tg = snapOn ? snapTargets(s, i, cv) : null, thr = 8 / (k * 1.5);
    let moved = false;
    const move = (ev) => {
      const dx = Math.round((ev.clientX - sx) / k), dy = Math.round((ev.clientY - sy) / k);
      if (!dx && !dy && !moved) return;
      moved = true;
      const free = ev.altKey || !tg;
      let hx = [], hy = [];
      if (mode === 'move') {
        it.x = o.x + dx; it.y = o.y + dy;
        if (!free) {
          const w = it.w || o.w, hh = it.h || o.h;
          const a = snapDelta([it.x, it.x + w / 2, it.x + w], tg.X, thr), b = snapDelta([it.y, it.y + hh / 2, it.y + hh], tg.Y, thr);
          if (a) { it.x += a.d; hx.push(a.t); }
          if (b) { it.y += b.d; hy.push(b.t); }
        }
      } else {
        let L = o.x, T = o.y, R = o.x + o.w, B = o.y + o.h;
        if (mode.includes('e')) R += dx;
        if (mode.includes('w')) L += dx;
        if (mode.includes('s')) B += dy;
        if (mode.includes('n')) T += dy;
        if (!free) {
          if (mode.includes('e')) { const a = snapDelta([R], tg.X, thr); if (a) { R += a.d; hx.push(a.t); } }
          if (mode.includes('w')) { const a = snapDelta([L], tg.X, thr); if (a) { L += a.d; hx.push(a.t); } }
          if (mode.includes('s')) { const a = snapDelta([B], tg.Y, thr); if (a) { B += a.d; hy.push(a.t); } }
          if (mode.includes('n')) { const a = snapDelta([T], tg.Y, thr); if (a) { T += a.d; hy.push(a.t); } }
        }
        it.w = Math.max(40, Math.round(R - L)); it.h = Math.max(24, Math.round(B - T));
        it.x = mode.includes('w') ? Math.round(R - it.w) : Math.round(L); it.y = mode.includes('n') ? Math.round(B - it.h) : Math.round(T);
      }
      it.x = Math.round(it.x); it.y = Math.round(it.y);
      showSnap(cv, hx, hy);
      n.style.left = it.x + 'px'; n.style.top = it.y + 'px'; n.style.width = it.w + 'px'; n.style.height = it.h ? it.h + 'px' : 'auto';
      updateStatus();
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      cv.querySelectorAll('.cvs').forEach((x) => x.remove());
      if (moved) { changed(); snap(); renderForm(); }
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  }
  const ITEM_POS = [{ k: 'x', t: 'num', label: 'x' }, { k: 'y', t: 'num', label: 'y' }, { k: 'w', t: 'num', label: 'רוחב' }, { k: 'h', t: 'num', label: 'גובה' }];
  const ITEM_FIELDS = {
    text: [
      { k: 'text', t: 'long', rows: 4, label: 'טקסט (כל שורה בשורה נפרדת)' },
      { k: 'size', t: 'num', label: 'גודל' },
      { k: 'color', t: 'color', label: 'צבע' },
      { k: 'bold', t: 'select', label: 'עובי', opts: [['', 'רגיל'], ['1', 'מודגש']] },
      { k: 'align', t: 'select', label: 'יישור', opts: [['right', 'ימין'], ['center', 'מרכז'], ['left', 'שמאל']] },
      { k: 'font', t: 'select', label: 'גופן', opts: [['he', 'Heebo'], ['arial', 'Arial'], ['serif', 'Georgia']] },
      { k: 'list', t: 'select', label: 'רשימה', opts: [['', 'ללא'], ['bullet', 'תבליטים'], ['number', 'מספור']] },
      { k: 'lh', t: 'num', label: 'גובה שורה (למשל 1.25)' },
      { k: 'valign', t: 'select', label: 'יישור אנכי', opts: [['', 'למעלה'], ['middle', 'אמצע'], ['bottom', 'למטה']] },
      { k: 'dir', t: 'select', label: 'כיוון הטקסט', opts: [['', 'אוטומטי'], ['rtl', 'מימין לשמאל'], ['ltr', 'משמאל לימין']] },
      { k: 'link', t: 'text', label: 'קישור (לא חובה)' },
    ],
    image: [
      { k: 'src', t: 'image', label: 'תמונה' },
      { k: 'fit', t: 'select', label: 'התאמה', opts: [['cover', 'למלא (חיתוך)'], ['contain', 'להציג שלמה']] },
      { k: 'bg', t: 'color', label: 'רקע (לא חובה)' },
      { k: 'alt', t: 'text', label: 'תיאור התמונה' },
    ],
    shape: [
      { k: 'fill', t: 'color', label: 'צבע מילוי' },
      { k: 'stroke', t: 'color', label: 'צבע קו' },
      { k: 'sw', t: 'num', label: 'עובי קו' },
      { k: 'flip', t: 'select', label: 'היפוך', opts: [['', 'ללא'], ['h', 'אופקי']] },
      { k: 'rot', t: 'num', label: 'סיבוב (מעלות)' },
    ],
    table: [
      { k: 'rows', t: 'long', rows: 6, label: 'שורות (תאים מופרדים ב-|)' },
      { k: 'colw', t: 'text', label: 'רוחב עמודות באחוזים (למשל 78,22)' },
      { k: 'header', t: 'select', label: 'שורה ראשונה', opts: [['yes', 'כותרת'], ['no', 'רגילה']] },
      { k: 'size', t: 'num', label: 'גודל' },
      { k: 'color', t: 'color', label: 'צבע' },
    ],
  };
  const itemName = (it) => {
    if (it.kind === 'image') return '🖼 ' + (it.alt || (it.src || '').split('/').pop() || 'תמונה');
    if (it.kind === 'table') return '▦ טבלה';
    if (it.kind === 'shape') return '➜ ' + ({ arrow: 'חץ', line: 'קו', path: 'עקומה' }[it.shape] || 'צורה');
    return 'T ' + String(it.text || '').split('\n')[0].slice(0, 28);
  };
  function addItem(kind) {
    const s = deck.slides[sel];
    const base = { text: { kind: 'text', text: 'טקסט חדש', x: 480, y: 420, w: 960, h: 120, size: 56, bold: '', color: '#0A0A0A', align: 'right', font: 'he', lh: 1.25, list: '', link: '' },
      image: { kind: 'image', src: '', alt: '', fit: 'contain', bg: '', x: 560, y: 240, w: 800, h: 600 },
      shape: { kind: 'shape', shape: 'arrow', fill: '#C00000', stroke: '', sw: 0, flip: 'h', rot: 0, x: 800, y: 480, w: 200, h: 100 },
      table: { kind: 'table', rows: 'כותרת א | כותרת ב\nתא | תא\nתא | תא', colw: '50,50', header: 'yes', size: 36, color: '#0A0A0A', x: 240, y: 300, w: 1440, h: 300 } }[kind];
    s.items.push(clone(base)); selItem = s.items.length - 1; structural();
  }
  const mvItem = (d) => {
    const a = deck.slides[sel].items, j = selItem + d;
    if (j < 0 || j >= a.length) return;
    [a[selItem], a[j]] = [a[j], a[selItem]]; selItem = j; structural();
  };
  function renderCanvasForm(s, body) {
    s.items = s.items || [];
    body.append(
      wrapField({ label: 'רקע השקף' }, h('input', { type: 'color', value: s.bg || '#FFFFFF', oninput: (e) => { s.bg = e.target.value; changed(); } })),
      h('div', { class: 'cvbar' },
        h('button', { type: 'button', title: 'קו עזר אנכי (גררו להזזה; מחוץ לשקף = מחיקה)', onclick: () => addGuide('v') }, '+ קו עזר אנכי'),
        h('button', { type: 'button', title: 'קו עזר אופקי', onclick: () => addGuide('h') }, '+ קו עזר אופקי'),
        (s.guides || []).length ? h('button', { type: 'button', onclick: () => { s.guides = []; structural(); } }, 'נקה קווים') : null,
        h('label', { class: 'cvsnap', title: 'הצמדה לקווי עזר, לקצוות ולמרכז של רכיבים אחרים (Alt בזמן גרירה מבטל זמנית)' },
          h('input', { type: 'checkbox', checked: snapOn, onchange: (e) => { snapOn = e.target.checked; try { localStorage.setItem('edSnap', snapOn ? '1' : '0'); } catch (_) {} } }), ' הצמדה')),
      h('div', { class: 'cvbar' },
        h('button', { class: 'primary', type: 'button', onclick: () => addItem('text') }, '+ טקסט'),
        h('button', { class: 'primary', type: 'button', onclick: () => addItem('image') }, '+ תמונה'),
        h('button', { class: 'primary', type: 'button', onclick: () => addItem('table') }, '+ טבלה'),
        h('button', { class: 'primary', type: 'button', onclick: () => addItem('shape') }, '+ חץ')),
      h('div', { class: 'cvlist' }, s.items.map((it, i) =>
        h('button', { type: 'button', class: 'cvb' + (i === selItem ? ' on' : ''), onclick: () => { selItem = i; renderPreview(); renderForm(); } }, itemName(it)))));
    const it = s.items[selItem];
    if (!it) { body.append(h('p', { class: 'ed-hint' }, 'לחצו על רכיב בתצוגה המקדימה כדי לערוך אותו: גרירה מזיזה, פינות משנות גודל, חיצים מזיזים בעדינות, Delete מוחק.')); return; }
    body.append(
      h('div', { class: 'cvbar' },
        h('button', { type: 'button', title: 'קדימה', onclick: () => mvItem(1) }, '▲ קדימה'),
        h('button', { type: 'button', title: 'אחורה', onclick: () => mvItem(-1) }, '▼ אחורה'),
        h('button', { type: 'button', onclick: dupItem }, 'שכפל'),
        h('button', { type: 'button', onclick: delItem }, 'מחק')));
    const box = h('div', { class: 'ed-fields' });
    buildFields(ITEM_FIELDS[it.kind] || ITEM_FIELDS.text, it, box, it);
    const pos = h('div', { class: 'cvpos' });
    buildFields(ITEM_POS, it, pos, it);
    body.append(box, h('span', { class: 'lbl' }, 'מיקום וגודל'), pos);
  }
  let snapOn = true;
  try { snapOn = localStorage.getItem('edSnap') !== '0'; } catch (_) {}
  function addGuide(o) {
    const s = deck.slides[sel];
    (s.guides = s.guides || []).push({ o, p: o === 'v' ? 960 : 540 });
    structural();
  }
  function dupItem() {
    const s = deck.slides[sel], it = clone(s.items[selItem]);
    it.x = (it.x || 0) + 40; it.y = (it.y || 0) + 40;
    s.items.push(it); selItem = s.items.length - 1; structural();
  }
  function delItem() {
    const s = deck.slides[sel];
    if (!s.items[selItem]) return;
    s.items.splice(selItem, 1); selItem = -1; structural();
  }
  function fit() {
    const r = prevBox.getBoundingClientRect();
    const k = Math.max(0.1, Math.min((r.width - 32) / 1280, (r.height - 32) / 720));
    pv.style.width = 1280 * k + 'px'; pv.style.height = 720 * k + 'px';
    stage.style.transform = 'scale(' + k + ')';
  }
  addEventListener('resize', fit);

  /* ---------- טופס עריכה ---------- */
  const blankOf = (f) => (f.t === 'select' ? ((f.opts || [])[0] || [''])[0] : f.t === 'num' ? 0 : f.t === 'strings' || f.t === 'list' ? [] : '');
  const blankItem = (fields) => Object.fromEntries(fields.map((f) => [f.k, blankOf(f)]));

  function wrapField(f, control) {
    return h('label', { class: 'fld' }, h('span', { class: 'lbl' }, f.label), control, f.help ? h('span', { class: 'help' }, f.help) : null);
  }

  function imageField(f, obj) {
    const input = h('input', { type: 'text', value: obj[f.k] || '', placeholder: 'נתיב לתמונה (או Ctrl+V להדבקה)', oninput: (e) => { obj[f.k] = e.target.value; changed(); thumb(); } });
    const file = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: async (e) => { const fl = [...e.target.files]; e.target.value = ''; if (fl.length) place(await uploadAll(fl), slot); } });
    const prev = h('div', { class: 'thumb' });
    const set = (p) => { obj[f.k] = p; input.value = p; thumb(); changed(); snap(); };
    function thumb() {
      const v = obj[f.k] || '';
      prev.replaceChildren(v && !v.startsWith('builtin:') ? h('img', { src: v, alt: '' }) : h('span', {}, v ? 'איור דוגמה' : 'לחצו כאן ואז Ctrl+V, או גררו תמונה'));
    }
    thumb();
    const box = h('div', { class: 'fld img', tabindex: 0 },
      h('span', { class: 'lbl' }, f.label), prev, input,
      h('div', { class: 'btns' },
        h('button', { type: 'button', onclick: () => file.click() }, 'בחר תמונה…'),
        h('button', { type: 'button', onclick: () => set('') }, 'הסר'), file));
    const slot = { label: f.label, box, get: () => obj[f.k], set };
    imgSlots.push(slot);
    box.addEventListener('focusin', () => { activeSlot = slot; });
    box.addEventListener('click', () => { activeSlot = slot; });
    box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('drop'); });
    box.addEventListener('dragleave', () => box.classList.remove('drop'));
    box.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); box.classList.remove('drop'); dragDepth = 0; document.body.classList.remove('dragging'); dropped(e.dataTransfer, slot); });
    return box;
  }

  /* ---------- הדבקה וגרירה של תמונות ---------- */
  let imgSlots = [], activeSlot = null;
  const toastEl = h('div', { class: 'toast' });
  const dropHint = h('div', { class: 'drop-hint' }, 'שחררו כדי להוסיף את התמונה');
  document.body.append(toastEl, dropHint);
  let toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 3200); }

  const extOf = (f) => ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg' }[f.type] || '');
  async function uploadAll(files) {
    const out = [];
    for (const f of files) {
      toast('מעלה תמונה…');
      const named = /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name) ? f : new File([f], 'pasted' + extOf(f), { type: f.type });
      const p = await upload(named);
      if (p) out.push(p);
    }
    return out;
  }

  // נתונים שחייבים להיקרא מיד באירוע (אחרי await הם נמחקים)
  function grab(dt) {
    const files = [...(dt.files || [])].filter((f) => f.type.startsWith('image/'));
    [...(dt.items || [])].forEach((i) => { if (i.kind === 'file' && i.type.startsWith('image/')) { const f = i.getAsFile(); if (f && !files.includes(f) && !files.some((x) => x.size === f.size && x.type === f.type)) files.push(f); } });
    let url = '';
    if (!files.length) {
      const uri = (dt.getData('text/uri-list') || '').split(/\r?\n/).find((l) => l && !l.startsWith('#'));
      const html = dt.getData('text/html') || '';
      const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      const txt = (dt.getData('text/plain') || '').trim();
      url = (m && m[1]) || uri || (/^https?:\/\/\S+$/.test(txt) ? txt : '');
    }
    return { files, url };
  }
  async function fromUrl(url) {
    if (url.startsWith('data:image/')) {
      const blob = await (await fetch(url)).blob();
      return uploadAll([new File([blob], 'dropped' + extOf(blob), { type: blob.type })]);
    }
    if (!/^https?:\/\//i.test(url)) return [];
    if (!serverOk) { alert('הורדת תמונה מכתובת עובדת רק דרך edit.bat'); return []; }
    toast('מוריד תמונה…');
    try {
      const r = await api('/api/fetch-image', { method: 'POST', body: JSON.stringify({ url }) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || r.status);
      return [j.path];
    } catch (e) {
      alert('לא הצלחתי להוריד את התמונה (' + e.message + '). אפשר לשמור אותה כקובץ ולגרור את הקובץ, או להעתיק את התמונה עצמה ולהדביק.');
      return [];
    }
  }
  const hasPayload = (dt) => !!dt && (dt.types.includes('Files') || dt.types.includes('text/uri-list') || dt.types.includes('text/html'));

  // מכניס תמונות: לשדה שנבחר, אחרת לשדה ריק בשקף, ואם אין שדה תמונה פותח שקף תמונה חדש
  function place(paths, hint, xFrac) {
    if (!paths.length) return;
    const cur = deck.slides[sel];
    if (!hint && cur && cur.type === 'image') return addToImageSlide(cur, paths);
    if (!hint && cur && cur.type === 'canvas') {
      const sit = (cur.items || [])[selItem];
      if (!sit || sit.kind !== 'image') { // אין תמונה נבחרת: כל תמונה הופכת לרכיב חדש
        paths.forEach((p, j) => cur.items.push({ kind: 'image', src: p, alt: '', fit: 'contain', bg: '', x: 460 + j * 40, y: 180 + j * 40, w: 1000, h: 700 }));
        selItem = cur.items.length - 1; structural();
        return toast(paths.length > 1 ? 'נוספו ' + paths.length + ' תמונות לשקף' : 'התמונה נוספה לשקף');
      }
    }
    const rest = paths.slice();
    let slot = hint || null;
    if (!slot && xFrac != null && imgSlots.length === 2) slot = imgSlots[xFrac < 0.5 ? 0 : 1];
    if (!slot) slot = (activeSlot && imgSlots.includes(activeSlot)) ? activeSlot : (imgSlots.find((s) => !s.get()) || imgSlots[0]);
    if (slot) { slot.set(rest.shift()); toast('התמונה הוכנסה: ' + slot.label); }
    if (rest.length) newImageSlides(rest);
  }
  // שקף תמונות: ממלאים משבצות ריקות, והשאר מתווספות כתמונות חדשות באותו שקף
  function addToImageSlide(s, paths) {
    const rest = paths.slice();
    s.items = s.items || [];
    s.items.forEach((it) => { if (!it.src && rest.length) it.src = rest.shift(); });
    rest.forEach((p) => s.items.push({ src: p, caption: '', fit: '' }));
    structural();
    toast(paths.length > 1 ? 'נוספו ' + paths.length + ' תמונות לשקף' : 'התמונה נוספה לשקף');
  }
  // כמה תמונות יחד נכנסות לשקף תמונות אחד (רשת)
  function newImageSlides(paths) {
    const s = TYPES.image.blank();
    s.items = paths.map((p) => ({ src: p, caption: '', fit: '' }));
    deck.slides.splice(sel + 1, 0, s); sel += 1;
    structural();
    toast(paths.length > 1 ? 'נוצר שקף עם ' + paths.length + ' תמונות' : 'נוסף שקף תמונה חדש');
  }
  async function dropped(dt, hint, xFrac, asNewSlides) {
    const g = grab(dt);
    const paths = g.files.length ? await uploadAll(g.files) : g.url ? await fromUrl(g.url) : [];
    if (!paths.length) return;
    if (asNewSlides) newImageSlides(paths); else place(paths, hint, xFrac);
  }

  document.addEventListener('paste', async (e) => {
    const g = grab(e.clipboardData || { files: [], items: [], getData: () => '' });
    if (!g.files.length) return; // הדבקת טקסט רגילה
    e.preventDefault();
    place(await uploadAll(g.files), null, null);
  });
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => { if (hasPayload(e.dataTransfer)) { dragDepth++; document.body.classList.add('dragging'); } });
  window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) document.body.classList.remove('dragging'); });
  window.addEventListener('dragover', (e) => { if (hasPayload(e.dataTransfer)) e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    dragDepth = 0; document.body.classList.remove('dragging');
    if (!hasPayload(e.dataTransfer)) return;
    const inText = /^(INPUT|TEXTAREA)$/.test((e.target || {}).tagName || '') && !e.dataTransfer.files.length;
    if (inText) return;
    e.preventDefault();
    dropped(e.dataTransfer, null, null, false);
  });
  prevBox.addEventListener('drop', (e) => {
    e.preventDefault(); e.stopPropagation(); dragDepth = 0; document.body.classList.remove('dragging');
    const r = pv.getBoundingClientRect();
    dropped(e.dataTransfer, null, (e.clientX - r.left) / r.width, false);
  });
  listBox.addEventListener('drop', (e) => {
    e.preventDefault(); e.stopPropagation(); dragDepth = 0; document.body.classList.remove('dragging');
    if ([...e.dataTransfer.types].includes(SLIDE_MIME)) return; // גרירת שקף (לא תמונה) שנפלה מחוץ לשורה
    dropped(e.dataTransfer, null, null, true);
  });

  function stringsField(f, obj) {
    obj[f.k] = obj[f.k] || [];
    const wrap = h('div', { class: 'fld' }, h('span', { class: 'lbl' }, f.label));
    const rows = h('div', { class: 'strs' });
    function draw() {
      rows.replaceChildren(...obj[f.k].map((v, i) =>
        h('div', { class: 'srow' },
          h('input', { type: 'text', value: v, oninput: (e) => { obj[f.k][i] = e.target.value; changed(); } }),
          h('button', { type: 'button', title: 'הזז למעלה', onclick: () => { if (i) { const a = obj[f.k]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; draw(); changed(); snap(); } } }, '▲'),
          h('button', { type: 'button', title: 'מחק', onclick: () => { obj[f.k].splice(i, 1); draw(); changed(); snap(); } }, '✕'))));
    }
    draw();
    wrap.append(rows, h('button', { type: 'button', class: 'add', onclick: () => { obj[f.k].push(''); draw(); changed(); snap(); rows.lastChild.querySelector('input').focus(); } }, '+ הוסף'));
    return wrap;
  }

  function listField(f, obj, root) {
    obj[f.k] = obj[f.k] || [];
    const wrap = h('div', { class: 'fld' }, h('span', { class: 'lbl' }, f.label));
    const holder = h('div', { class: 'lst' });
    const openSet = new WeakSet();
    function draw() {
      holder.replaceChildren(...obj[f.k].map((it, i) => {
        const arr = obj[f.k];
        const nm = (f.itemName || 'פריט') + ' ' + (i + 1);
        const sum = h('summary', {}, h('span', { class: 'sl' }, String(it[f.labelKey] || nm)),
          ...[['▲', 'למעלה', -1], ['▼', 'למטה', 1]].map(([t, tip, d]) => h('button', { type: 'button', title: tip, onclick: (e) => { e.preventDefault(); e.stopPropagation(); const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; draw(); changed(); snap(); } }, t)),
          h('button', { type: 'button', title: 'מחק', onclick: (e) => { e.preventDefault(); e.stopPropagation(); arr.splice(i, 1); draw(); changed(); snap(); } }, '✕'));
        const det = h('details', { class: 'li', open: openSet.has(it) || arr.length === 1 }, sum);
        det.addEventListener('toggle', () => { if (det.open) openSet.add(it); });
        const inner = h('div', { class: 'inner' });
        buildFields(f.of, it, inner, root, (txt) => { sum.querySelector('.sl').textContent = txt || nm; }, f.labelKey);
        det.append(inner);
        return det;
      }));
    }
    draw();
    wrap.append(holder, h('button', { type: 'button', class: 'add', onclick: () => { const it = blankItem(f.of); obj[f.k].push(it); openSet.add(it); draw(); changed(); snap(); } }, '+ הוסף'));
    return wrap;
  }

  function buildFields(fields, obj, into, root, onLabel, labelKey) {
    fields.forEach((f) => {
      let el;
      if (f.t === 'text') {
        el = wrapField(f, h('input', { type: 'text', value: obj[f.k] == null ? '' : obj[f.k], oninput: (e) => { obj[f.k] = e.target.value; if (onLabel && f.k === labelKey) onLabel(e.target.value); changed(); } }));
      } else if (f.t === 'long') {
        el = wrapField(f, h('textarea', { rows: f.rows || 4, oninput: (e) => { obj[f.k] = e.target.value; changed(); } }, obj[f.k] == null ? '' : obj[f.k]));
      } else if (f.t === 'num') {
        el = wrapField(f, h('input', { type: 'number', value: obj[f.k] == null ? 0 : obj[f.k], oninput: (e) => { obj[f.k] = e.target.value === '' ? 0 : Number(e.target.value); changed(); } }));
      } else if (f.t === 'select') {
        const opts = f.optsFrom ? (root[f.optsFrom] || []).map((p) => [p.key, p.name || p.key]) : f.opts;
        const sel0 = h('select', { onchange: (e) => { obj[f.k] = e.target.value; changed(); snap(); } }, opts.map(([v, l]) => h('option', { value: v }, l)));
        sel0.value = obj[f.k] == null ? (opts[0] || [''])[0] : obj[f.k];
        el = wrapField(f, sel0);
      } else if (f.t === 'color') {
        el = wrapField(f, h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(obj[f.k] || '') ? obj[f.k] : '#000000', oninput: (e) => { obj[f.k] = e.target.value; changed(); } }));
      } else if (f.t === 'image') {
        el = imageField(f, obj);
      } else if (f.t === 'strings') {
        el = stringsField(f, obj);
      } else if (f.t === 'list') {
        el = listField(f, obj, root);
      }
      if (el) into.append(el);
    });
  }

  function renderForm() {
    formBox.replaceChildren();
    imgSlots = []; activeSlot = null;
    const s = deck.slides[sel];
    if (!s) { formBox.append(h('p', { class: 'ed-hint' }, 'אין שקפים. הוסיפו שקף ברשימה.')); return; }
    const typeSel = h('select', { onchange: (e) => { if (confirm('החלפת סוג תשמור רק שדות תואמים. להמשיך?')) changeType(e.target.value); else e.target.value = s.type; } },
      Object.entries(TYPES).map(([k, t]) => h('option', { value: k }, t.label)));
    typeSel.value = s.type;
    formBox.append(h('div', { class: 'ed-head' }, 'שקף ' + (sel + 1)), wrapField({ label: 'סוג שקף' }, typeSel));
    const body = h('div', { class: 'ed-fields' });
    if (s.type === 'canvas') renderCanvasForm(s, body);
    else buildFields((TYPES[s.type] || TYPES.text).fields, s, body, s);
    body.append(wrapField({ label: 'הערות מרצה (לא מוצגות לכיתה)' }, h('textarea', { rows: 5, oninput: (e) => { s.notes = e.target.value; changed(); } }, s.notes || '')));
    formBox.append(body);
  }

  function renderAll() { if (sel !== lastSel) { selItem = -1; lastSel = sel; } renderList(); renderForm(); renderPreview(); fit(); updateStatus(); history.replaceState(null, '', '#' + (sel + 1)); }

  /* ---------- מקשים ---------- */
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '') || !!(e.target && e.target.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    else if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    else if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if (!typing && deck && deck.slides[sel] && deck.slides[sel].type === 'canvas' && deck.slides[sel].items[selItem]) {
      const it = deck.slides[sel].items[selItem], step = e.shiftKey ? 20 : 4;
      const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (mv) { e.preventDefault(); it.x = (it.x || 0) + mv[0]; it.y = (it.y || 0) + mv[1]; changed(); renderPreview(); renderForm(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); delItem(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); dupItem(); }
    }
  });

  /* ---------- טעינה ---------- */
  function start() {
    const src = window.DECKS[id];
    if (!src) { document.body.textContent = 'מצגת לא נמצאה: ' + id; return; }
    deck = clone(src);
    deck.slides.forEach(window.Slides.normalize);
    savedJSON = JSON.stringify(deck);
    hist = [savedJSON]; hi = 0;
    titleInput.value = deck.title;
    const n = parseInt(location.hash.slice(1), 10);
    sel = Number.isFinite(n) ? Math.max(0, Math.min(deck.slides.length - 1, n - 1)) : 0;
    document.title = 'עריכה: ' + deck.title;
    api('/api/ping').then((r) => r.ok && r.json()).then((j) => { serverOk = !!(j && j.ok); }).catch(() => { serverOk = false; })
      .finally(() => { banner.hidden = serverOk; updateStatus(); });
    renderAll();
    new ResizeObserver(fit).observe(prevBox);
  }
  const sc = document.createElement('script');
  sc.src = 'decks/' + id + '.js';
  sc.onload = start;
  sc.onerror = () => (document.body.textContent = 'מצגת לא נמצאה: ' + id);
  document.head.append(sc);
})();
