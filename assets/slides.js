/* סוגי שקפים: הגדרת שדות (לעורך) + ציור (לנגן ולתצוגה המקדימה). שקף הוא אובייקט {type, notes, ...שדות}. */
(function () {
  'use strict';
  const { h, UI } = window.DeckKit;

  const COLORS = { ink: 'var(--ink)', bg: 'var(--c-bg)', app: 'var(--c-app)', green: 'var(--ph3)', purple: 'var(--ph4)', ochre: 'var(--ph5)' };
  const COLOR_OPTS = [['ink', 'שחור'], ['bg', 'כחול (רקע)'], ['app', 'כתום (יישום)'], ['green', 'ירוק'], ['purple', 'סגול'], ['ochre', 'חרדל']];
  const col = (c, d) => COLORS[c] || COLORS[d || 'ink'];

  /* איורי דוגמה לשקף ההשוואה. בשדה תמונה אפשר לרשום builtin:hand או builtin:render */
  const ART = {
    hand: `<svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="1000" height="420" fill="#f4ecd8"/>
    <g stroke="#cdbf9c" stroke-width="1">${Array.from({ length: 22 }, (_, i) => `<path d="M0 ${i * 20} H1000"/>`).join('')}${Array.from({ length: 51 }, (_, i) => `<path d="M${i * 20} 0 V420"/>`).join('')}</g>
    <g transform="translate(250,4)">
    <g fill="none" stroke="#2b2a27" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M62 78 L438 72 L444 332 L58 338 Z"/>
      <path d="M60 205 L252 201 M251 76 L254 335 M254 262 L442 258 M340 262 L338 334"/>
    </g>
    <g fill="none" stroke="#2b2a27" stroke-width="2" stroke-linecap="round">
      <path d="M150 203 A42 42 0 0 1 192 161 M150 203 L192 161"/>
      <path d="M254 292 A38 38 0 0 0 292 260"/>
      <path d="M118 70 L190 69 M118 76 L190 75 M300 66 L378 65 M300 72 L378 71"/>
      <path d="M62 52 L438 47 M62 44 L62 60 M438 39 L438 55 M250 42 L250 58"/>
      <path d="M470 78 L474 332 M464 78 L480 77 M468 332 L482 332"/>
    </g>
    <g stroke="#8a826e" stroke-width="1.5"><path d="M270 100 L310 140 M280 100 L320 140 M290 100 L330 140 M300 100 L340 140 M310 100 L350 140"/></g>
    </g>
  </svg>`,
    render: `<svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb7e0"/><stop offset="1" stop-color="#f7e9d2"/></linearGradient>
      <linearGradient id="w1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9d1d9"/></linearGradient>
      <linearGradient id="gl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3f5a78"/><stop offset="1" stop-color="#7fa0c2"/></linearGradient>
    </defs>
    <rect width="1000" height="420" fill="url(#sky)"/>
    <path d="M0 330 H1000 V420 H0Z" fill="#d6c8ad"/>
    <g fill="#2f6b3f" opacity=".9"><circle cx="200" cy="322" r="18"/><circle cx="226" cy="328" r="12"/><circle cx="790" cy="324" r="16"/><circle cx="818" cy="330" r="11"/></g>
    <g transform="translate(250,6)">
    <ellipse cx="260" cy="326" rx="230" ry="16" fill="#000" opacity=".18"/>
    <path d="M30 322 C52 196 168 104 276 128 C380 150 462 232 474 322 Z" fill="url(#w1)"/>
    <path d="M30 322 C74 246 174 196 276 206 C376 216 444 268 474 322 Z" fill="#b4bfca" opacity=".85"/>
    <path d="M84 322 C118 270 200 232 276 240 C352 248 412 284 432 322 Z" fill="url(#gl)"/>
    <g fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".85">
      <path d="M110 304 C150 262 210 246 276 252"/><path d="M150 312 C190 276 236 262 290 266"/><path d="M200 318 C236 290 270 282 320 286"/>
    </g>
    <path d="M70 168 C130 118 210 108 276 128" fill="none" stroke="#fff" stroke-width="4" opacity=".7" stroke-linecap="round"/>
    </g>
  </svg>`,
  };

  const pic = (src, alt, fit) => {
    if (typeof src === 'string' && src.startsWith('builtin:') && ART[src.slice(8)]) {
      return h('div', { html: ART[src.slice(8)], style: { width: '100%', height: '100%' } });
    }
    if (!src) return h('div', { style: { width: '100%', height: '100%', background: '#ddd3c1', display: 'grid', placeItems: 'center', color: '#6a645a', fontSize: '28px' } }, 'אין תמונה');
    return h('img', { src, alt: alt || '', style: { objectFit: fit || 'cover' } });
  };

  // *טקסט* הופך לצבע הדגשה
  const hl = (s) => String(s || '').split(/\*(.+?)\*/g).map((p, i) => (i % 2 ? h('em', {}, p) : p));
  const lines = (s) => String(s || '').split('\n').flatMap((l, i) => (i ? [h('br'), l] : [l]));
  const txt = (s) => (s == null ? '' : String(s));

  const TYPES = {};

  TYPES.title = {
    label: 'שקף כותרת',
    fields: [
      { k: 'kicker', t: 'text', label: 'שורה עליונה' },
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'sub', t: 'text', label: 'כותרת משנה' },
      { k: 'extra', t: 'text', label: 'שורה נוספת' },
      { k: 'foot', t: 'text', label: 'שורת תחתית (להפריד בין שני חלקים עם |)' },
    ],
    blank: () => ({ type: 'title', kicker: '', title: 'כותרת', sub: '', extra: '', foot: '', notes: '' }),
    cls: () => 's-title',
    render: (s) => {
      const len = txt(s.title).length;
      const foot = txt(s.foot).split('|').map((x) => x.trim());
      return [
        s.kicker ? h('div', { class: 'kicker' }, s.kicker) : null,
        h('h1', { style: { fontSize: len <= 16 ? '136px' : len <= 26 ? '104px' : '78px' } }, s.title),
        s.sub ? h('div', { class: 'sub' }, s.sub) : null,
        s.extra ? h('div', { class: 'extra' }, s.extra) : null,
        s.foot ? h('div', { class: 'foot' }, h('span', {}, foot[0] || ''), h('span', {}, foot[1] || '')) : null,
        h('div', { class: 'bars' }, h('i'), h('i')),
      ];
    },
  };

  TYPES.section = {
    label: 'פתיחת חלק',
    fields: [
      { k: 'letter', t: 'text', label: 'אות גדולה ברקע' },
      { k: 'part', t: 'text', label: 'שם החלק' },
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'sub', t: 'text', label: 'כותרת משנה' },
      { k: 'color', t: 'select', label: 'צבע', opts: [['ink', 'שחור'], ['bg', 'כחול (רקע)'], ['app', 'כתום (יישום)']] },
    ],
    blank: () => ({ type: 'section', letter: 'א', part: 'חלק א׳', title: 'כותרת החלק', sub: '', color: 'ink', notes: '' }),
    cls: (s) => 's-section k-' + (['ink', 'bg', 'app'].includes(s.color) ? s.color : 'ink'),
    render: (s) => [
      h('div', { class: 'letter', 'aria-hidden': 'true' }, s.letter),
      h('div', { class: 'part' }, s.part),
      h('h2', {}, s.title),
      s.sub ? h('div', { class: 'sub' }, s.sub) : null,
    ],
  };

  TYPES.bullets = {
    label: 'רשימה',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'mode', t: 'select', label: 'סגנון', opts: [['num', 'ממוספר'], ['plain', 'נקודות']] },
      { k: 'items', t: 'strings', label: 'פריטים (כל אחד נחשף בלחיצה)' },
      { k: 'badge', t: 'text', label: 'תיבת קישור בסוף (לא חובה)' },
    ],
    blank: () => ({ type: 'bullets', title: 'כותרת', mode: 'num', items: ['פריט ראשון', 'פריט שני'], badge: '', notes: '' }),
    render: (s) => {
      const items = (s.items || []).map((t, i) => UI.step(i + 1, h('li', {}, t)));
      const n = items.length;
      return [
        s.title ? h('h2', {}, s.title) : null,
        h(s.mode === 'plain' ? 'ul' : 'ol', { class: s.mode === 'plain' ? 'big-list' : 'num-list' }, items),
        s.badge ? UI.step(n + 1, h('div', { style: { marginTop: '14px' } }, h('span', { class: 'urlbox' }, s.badge))) : null,
      ];
    },
  };

  TYPES.cards = {
    label: 'כרטיסים',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      {
        k: 'items', t: 'list', label: 'כרטיסים', labelKey: 'title',
        of: [
          { k: 'icon', t: 'text', label: 'סימן (תו אחד)' },
          { k: 'title', t: 'text', label: 'כותרת' },
          { k: 'text', t: 'text', label: 'טקסט קטן' },
          { k: 'color', t: 'select', label: 'צבע', opts: COLOR_OPTS },
        ],
      },
    ],
    blank: () => ({ type: 'cards', title: 'כותרת', items: [{ icon: '✔', title: 'כרטיס', text: '', color: 'ink' }], notes: '' }),
    render: (s) => [
      s.title ? h('h2', {}, s.title) : null,
      h('div', { class: 'grow', style: { justifyContent: 'flex-start' } },
        (s.items || []).map((c, i) =>
          UI.step(i + 1, h('div', { class: 'big-card', style: { '--cx': col(c.color) } },
            h('div', { class: 'ico' }, c.icon || ''),
            h('div', {}, h('b', {}, c.title), c.text ? h('span', {}, c.text) : null))))),
    ],
  };

  TYPES.columns = {
    label: 'עמודות',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'size', t: 'select', label: 'סגנון', opts: [['normal', 'רגיל'], ['big', 'כותרות גדולות']] },
      {
        k: 'items', t: 'list', label: 'עמודות', labelKey: 'title',
        of: [
          { k: 'kicker', t: 'text', label: 'שורה קטנה' },
          { k: 'title', t: 'text', label: 'כותרת' },
          { k: 'points', t: 'strings', label: 'נקודות' },
          { k: 'color', t: 'select', label: 'צבע', opts: COLOR_OPTS },
        ],
      },
      { k: 'note', t: 'text', label: 'שורה בתחתית (לא חובה)' },
    ],
    blank: () => ({ type: 'columns', title: 'כותרת', size: 'normal', items: [{ kicker: '', title: 'עמודה', points: ['נקודה'], color: 'bg' }, { kicker: '', title: 'עמודה', points: ['נקודה'], color: 'app' }], note: '', notes: '' }),
    render: (s) => {
      const big = s.size === 'big';
      const items = s.items || [];
      return [
        s.title ? h('h2', {}, s.title) : null,
        h('div', { class: 'row' },
          items.map((c, i) =>
            UI.step(i + 1, h('div', { class: 'panel', style: { '--cx': col(c.color) } },
              c.kicker ? h('div', { class: 'kk' }, c.kicker) : null,
              h('h3', { style: big ? { fontSize: '90px' } : {} }, c.title),
              big
                ? h('p', { class: 'lead', style: { marginTop: '10px' } }, (c.points || []).join(' · '))
                : h('ul', {}, (c.points || []).map((p) => h('li', {}, p))))))
        ),
        s.note ? UI.step(items.length, h('p', { class: 'lead', style: { marginTop: '30px' } }, s.note)) : null,
      ];
    },
  };

  TYPES.text = {
    label: 'טקסט',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'body', t: 'long', label: 'טקסט (שורה ריקה = פסקה חדשה)', rows: 8 },
    ],
    blank: () => ({ type: 'text', title: 'כותרת', body: 'טקסט', notes: '' }),
    render: (s) => [
      s.title ? h('h2', {}, s.title) : null,
      h('div', { class: 'grow', style: { justifyContent: 'flex-start' } },
        txt(s.body).split(/\n\s*\n/).map((p) => h('p', { style: { fontSize: '38px', margin: '0 0 22px', lineHeight: 1.4 } }, lines(p)))),
    ],
  };

  const IMG_LAYOUTS = [
    ['auto', 'אוטומטי (לפי מספר התמונות)'], ['row', 'שורה אחת'], ['column', 'עמודה אחת'],
    ['grid2', 'רשת של 2 בשורה'], ['grid3', 'רשת של 3 בשורה'], ['grid4', 'רשת של 4 בשורה'],
    ['bigside', 'ראשונה גדולה בצד, השאר בטור'], ['bigtop', 'ראשונה גדולה למעלה, השאר בשורה'],
  ];
  TYPES.image = {
    label: 'תמונה / תמונות',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת (לא חובה)' },
      {
        k: 'items', t: 'list', label: 'תמונות', labelKey: 'caption', itemName: 'תמונה',
        of: [
          { k: 'src', t: 'image', label: 'תמונה' },
          { k: 'caption', t: 'text', label: 'כיתוב על התמונה' },
          { k: 'fit', t: 'select', label: 'התאמה לתמונה זו', opts: [['', 'כמו ההגדרה הכללית'], ['cover', 'למלא את המסגרת (חיתוך)'], ['contain', 'להציג שלמה']] },
        ],
      },
      { k: 'layout', t: 'select', label: 'סידור התמונות', opts: IMG_LAYOUTS },
      { k: 'dir', t: 'select', label: 'סדר', opts: [['rtl', 'מימין לשמאל'], ['ltr', 'משמאל לימין']] },
      { k: 'fit', t: 'select', label: 'התאמה כללית', opts: [['cover', 'למלא את המסגרת (חיתוך)'], ['contain', 'להציג שלמה']] },
      { k: 'gap', t: 'select', label: 'רווח בין תמונות', opts: [['normal', 'רגיל'], ['tight', 'קטן'], ['none', 'בלי רווח']] },
      { k: 'frame', t: 'select', label: 'מסגרת', opts: [['framed', 'עם מסגרת'], ['none', 'בלי מסגרת']] },
      { k: 'bg', t: 'select', label: 'רקע מאחורי התמונה', opts: [['warm', 'בז׳'], ['white', 'לבן'], ['black', 'שחור'], ['none', 'שקוף']] },
      { k: 'caption', t: 'text', label: 'כיתוב מתחת לתמונות' },
    ],
    blank: () => ({ type: 'image', title: '', layout: 'auto', dir: 'rtl', fit: 'cover', gap: 'normal', frame: 'framed', bg: 'warm', items: [{ src: '', caption: '', fit: '' }], caption: '', notes: '' }),
    render: (s) => {
      const items = Array.isArray(s.items) ? s.items : [{ src: s.src || '' }]; // תאימות לשקפי תמונה ישנים
      const n = Math.max(1, items.length);
      const layout = s.layout || 'auto';
      const gap = { normal: 14, tight: 4, none: 0 }[s.gap || 'normal'];
      const framed = s.frame !== 'none';
      const bg = { warm: '#ddd3c1', white: '#fff', black: '#000', none: 'transparent' }[s.bg || 'warm'];
      const fixed = { row: n, column: 1, grid2: 2, grid3: 3, grid4: 4 }[layout];
      const auto = n <= 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : n === 4 ? 2 : n <= 6 ? 3 : 4;
      const cols = Math.min(fixed || auto, n) || 1;
      const grid = { display: 'grid', gap: gap + 'px', height: s.title ? '470px' : '560px', flex: 'none', direction: s.dir === 'ltr' ? 'ltr' : 'rtl' };
      let firstCell = {};
      if (n > 1 && layout === 'bigside') {
        grid.gridTemplateColumns = '2fr 1fr'; grid.gridTemplateRows = 'repeat(' + (n - 1) + ', 1fr)'; firstCell = { gridRow: '1 / -1' };
      } else if (n > 1 && layout === 'bigtop') {
        grid.gridTemplateRows = '2fr 1fr'; grid.gridTemplateColumns = 'repeat(' + (n - 1) + ', 1fr)'; firstCell = { gridColumn: '1 / -1' };
      } else {
        grid.gridTemplateColumns = 'repeat(' + cols + ', 1fr)'; grid.gridTemplateRows = 'repeat(' + Math.ceil(n / cols) + ', 1fr)';
      }
      return [
        s.title ? h('h2', { style: { marginBottom: '16px' } }, s.title) : null,
        h('div', { class: 'imgs', style: grid },
          items.map((it, i) =>
            h('figure', { class: 'imgcell' + (framed ? ' framed' : ''), style: { background: bg, ...(i === 0 ? firstCell : {}) } },
              pic(it.src, it.caption, it.fit || s.fit || 'cover'),
              it.caption ? h('figcaption', {}, it.caption) : null))),
        s.caption ? h('p', { class: 'foot', style: { position: 'static', marginTop: '10px', justifyContent: 'center', fontSize: '24px', opacity: 0.8 } }, s.caption) : null,
      ];
    },
  };

  TYPES.compare = {
    label: 'השוואה בגרירה',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'a', t: 'image', label: 'תמונה שמאלית (builtin:hand לאיור דוגמה)' },
      { k: 'aLabel', t: 'text', label: 'שם שמאלית' },
      { k: 'b', t: 'image', label: 'תמונה ימנית (builtin:render לאיור דוגמה)' },
      { k: 'bLabel', t: 'text', label: 'שם ימנית' },
      { k: 'hint', t: 'text', label: 'הנחיה בתחתית' },
    ],
    blank: () => ({ type: 'compare', title: 'השוואה', a: '', aLabel: 'לפני', b: '', bLabel: 'אחרי', hint: 'גררו את הקו כדי להשוות', notes: '' }),
    render: (s) => [
      s.title ? h('h2', { style: { marginBottom: '16px' } }, s.title) : null,
      h('div', { style: { height: s.title ? '470px' : '560px' } },
        UI.compare({ a: pic(s.a, s.aLabel), b: pic(s.b, s.bLabel), labelA: s.aLabel, labelB: s.bLabel })),
      s.hint ? h('p', { class: 'foot', style: { position: 'static', marginTop: '10px', justifyContent: 'center' } }, s.hint) : null,
    ],
  };

  TYPES.timeline = {
    label: 'ציר זמן',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      {
        k: 'phases', t: 'list', label: 'שלבים (צבעים במקרא)', labelKey: 'name',
        of: [{ k: 'key', t: 'text', label: 'מזהה (למשל p1)' }, { k: 'name', t: 'text', label: 'שם' }, { k: 'color', t: 'select', label: 'צבע', opts: COLOR_OPTS }],
      },
      {
        k: 'items', t: 'list', label: 'תחנות', labelKey: 'title',
        of: [
          { k: 'n', t: 'text', label: 'מספר' }, { k: 'date', t: 'text', label: 'תאריך' }, { k: 'title', t: 'text', label: 'כותרת' },
          { k: 'text', t: 'long', label: 'תיאור', rows: 3 }, { k: 'phase', t: 'select', label: 'שלב', optsFrom: 'phases' },
        ],
      },
    ],
    blank: () => ({ type: 'timeline', title: 'ציר זמן', phases: [{ key: 'p1', name: 'שלב', color: 'bg' }], items: [{ n: '1', date: '', title: 'תחנה', text: '', phase: 'p1' }], notes: '' }),
    render: (s) => {
      const phases = {};
      (s.phases || []).forEach((p) => (phases[p.key] = { name: p.name, color: col(p.color) }));
      return [
        s.title ? h('h2', { style: { marginBottom: '10px', fontSize: '50px' } }, s.title) : null,
        UI.timeline((s.items || []).map((i) => ({ ...i })), phases),
      ];
    },
  };

  TYPES.flips = {
    label: 'כרטיסי היפוך',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      {
        k: 'items', t: 'list', label: 'כרטיסים', labelKey: 'front',
        of: [{ k: 'front', t: 'text', label: 'חזית' }, { k: 'sub', t: 'text', label: 'שורה קטנה בחזית' }, { k: 'back', t: 'long', label: 'גב הכרטיס', rows: 3 }, { k: 'color', t: 'select', label: 'צבע', opts: COLOR_OPTS }],
      },
    ],
    blank: () => ({ type: 'flips', title: 'כותרת', items: [{ front: 'כרטיס', sub: 'לחצו להיפוך', back: 'הטקסט בגב', color: 'bg' }], notes: '' }),
    render: (s) => [
      s.title ? h('h2', {}, s.title) : null,
      h('div', { class: 'flips' }, (s.items || []).map((c) => UI.flip({ front: c.front, sub: c.sub, back: h('span', {}, c.back), color: col(c.color) }))),
    ],
  };

  TYPES.donuts = {
    label: 'עוגות אחוזים',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      {
        k: 'items', t: 'list', label: 'עוגות', labelKey: 'label',
        of: [{ k: 'label', t: 'text', label: 'שם' }, { k: 'pct', t: 'num', label: 'אחוז' }, { k: 'legend', t: 'long', label: 'הסבר (שורה לכל חלק)', rows: 2 }, { k: 'color', t: 'select', label: 'צבע', opts: COLOR_OPTS }],
      },
    ],
    blank: () => ({ type: 'donuts', title: 'כותרת', items: [{ label: 'שם', pct: 50, legend: '50% חלק ראשון\n50% חלק שני', color: 'bg' }], notes: '' }),
    render: (s) => [
      s.title ? h('h2', {}, s.title) : null,
      h('div', { class: 'row' },
        (s.items || []).map((d, i) =>
          UI.step(i + 1, h('div', { style: { '--cx': col(d.color) } },
            h('div', { class: 'legend', style: { marginTop: 0, marginBottom: '10px', fontWeight: 800, fontSize: '34px' } }, h('b', {}, d.label)),
            UI.donut(Number(d.pct) || 0),
            h('div', { class: 'legend' }, txt(d.legend).split('\n').flatMap((l, j) => {
              const m = l.match(/^(\d+%)\s*(.*)$/);
              return [j ? h('br') : null, m ? [h('b', {}, m[1]), ' ' + m[2]] : l];
            })))))),
    ],
  };

  TYPES.counters = {
    label: 'מוני ספירה',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'lead', t: 'text', label: 'שורה מתחת לכותרת' },
      { k: 'items', t: 'list', label: 'מונים', labelKey: 'name', of: [{ k: 'name', t: 'text', label: 'שם' }, { k: 'color', t: 'select', label: 'צבע', opts: COLOR_OPTS }] },
    ],
    blank: () => ({ type: 'counters', title: 'כותרת', lead: '', items: [{ name: 'מונה', color: 'bg' }], notes: '' }),
    render: (s) => [
      s.title ? h('h2', {}, s.title) : null,
      s.lead ? h('p', { class: 'lead', style: { marginBottom: '22px' } }, s.lead) : null,
      h('div', { class: 'row' }, (s.items || []).map((c) => UI.counter(c.name, col(c.color)))),
    ],
  };

  TYPES.timer = {
    label: 'שאלה + טיימר',
    fields: [
      { k: 'quote', t: 'text', label: 'השאלה (*כך* מדגישים מילים)' },
      { k: 'lead', t: 'text', label: 'שורה מתחת' },
      { k: 'seconds', t: 'num', label: 'שניות' },
    ],
    blank: () => ({ type: 'timer', quote: 'שאלה *מודגשת*?', lead: '', seconds: 120, notes: '' }),
    render: (s) => [
      h('div', { class: 'grow', style: { alignItems: 'center', textAlign: 'center' } },
        h('div', { class: 'quote' }, hl(s.quote)),
        s.lead ? h('p', { class: 'lead', style: { margin: '14px 0 20px' } }, s.lead) : null,
        UI.timer(Number(s.seconds) || 60)),
    ],
  };

  TYPES.twopoints = {
    label: 'נקודות על ציר',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'items', t: 'list', label: 'נקודות', labelKey: 'title', of: [{ k: 'year', t: 'text', label: 'שנה / מספר' }, { k: 'title', t: 'text', label: 'כותרת' }, { k: 'sub', t: 'text', label: 'שורה קטנה' }, { k: 'color', t: 'select', label: 'צבע', opts: COLOR_OPTS }] },
      { k: 'lead', t: 'text', label: 'שורה בתחתית (לא חובה)' },
    ],
    blank: () => ({ type: 'twopoints', title: 'כותרת', items: [{ year: '1900', title: 'נקודה', sub: '', color: 'bg' }, { year: '2000', title: 'נקודה', sub: '', color: 'app' }], lead: '', notes: '' }),
    render: (s) => {
      const items = s.items || [];
      const kids = [];
      items.forEach((p, i) => {
        if (i) kids.push(UI.step(i + 1, h('div', { class: 'arrow' }, '←')));
        kids.push(UI.step(i + 1, h('div', { class: 'pt', style: { '--cx': col(p.color) } }, h('div', { class: 'yr' }, p.year), h('b', {}, p.title), p.sub ? h('span', {}, p.sub) : null)));
      });
      return [
        s.title ? h('h2', {}, s.title) : null,
        h('div', { class: 'two-pts' }, kids),
        s.lead ? UI.step(items.length + 1, h('p', { class: 'lead', style: { marginTop: '30px' } }, s.lead)) : null,
      ];
    },
  };

  TYPES.flow = {
    label: 'תרשים זרימה',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'top', t: 'list', label: 'שני קצוות למעלה (לא חובה)', labelKey: 'title', of: [{ k: 'kicker', t: 'text', label: 'שורה קטנה' }, { k: 'title', t: 'text', label: 'כותרת' }, { k: 'color', t: 'select', label: 'צבע', opts: COLOR_OPTS }] },
      { k: 'items', t: 'list', label: 'שלבים בתרשים', labelKey: 'title', of: [{ k: 'title', t: 'text', label: 'כותרת' }, { k: 'sub', t: 'text', label: 'שורה קטנה' }] },
      { k: 'color', t: 'select', label: 'צבע התרשים', opts: COLOR_OPTS },
      { k: 'lead', t: 'text', label: 'שורה בתחתית (לא חובה)' },
    ],
    blank: () => ({ type: 'flow', title: 'כותרת', top: [], items: [{ title: 'שלב 1', sub: '' }, { title: 'שלב 2', sub: '' }], color: 'app', lead: '', notes: '' }),
    render: (s) => {
      const items = s.items || [];
      const kids = [];
      items.forEach((p, i) => {
        if (i) kids.push(UI.step(i + 1, h('div', { class: 'arrow' }, '←')));
        kids.push(UI.step(i + 1, h('div', { class: 'box' }, h('b', {}, p.title), p.sub ? h('span', {}, p.sub) : null)));
      });
      return [
        s.title ? h('h2', {}, s.title) : null,
        (s.top || []).length
          ? h('div', { class: 'row', style: { marginBottom: '26px' } },
            s.top.map((c) => h('div', { class: 'panel', style: { '--cx': col(c.color), padding: '14px 24px' } }, c.kicker ? h('div', { class: 'kk' }, c.kicker) : null, h('h3', { style: { fontSize: '44px' } }, c.title))))
          : null,
        h('div', { class: 'flow', style: { '--cx': col(s.color, 'app') } }, kids),
        s.lead ? UI.step(items.length, h('p', { class: 'lead', style: { marginTop: '26px' } }, s.lead)) : null,
      ];
    },
  };

  TYPES.qr = {
    label: 'קוד QR + קישור',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'src', t: 'image', label: 'תמונת הברקוד (SVG או תמונה)' },
      { k: 'text', t: 'long', rows: 3, label: 'טקסט לצד הברקוד (שורה לכל משפט)' },
      { k: 'url', t: 'text', label: 'כתובת להצגה מתחת לטקסט' },
    ],
    blank: () => ({ type: 'qr', title: 'סרקו', src: '', text: '', url: '', notes: '' }),
    render: (s) => [
      s.title ? h('h2', {}, s.title) : null,
      h('div', { class: 'qr-row' },
        h('div', { class: 'qr-text' },
          txt(s.text).split('\n').filter(Boolean).map((l) => h('p', {}, l)),
          s.url ? h('div', { style: { marginTop: '18px' } }, h('span', { class: 'urlbox' }, s.url)) : null),
        h('div', { class: 'qr-box' }, pic(s.src, 'QR', 'contain'))),
    ],
  };

  /* ---------- סרטון: קוד הטמעה (iframe / video) או קישור ---------- */
  const httpUrl = (u) => {
    if (!u) return '';
    const full = u.startsWith('//') ? 'https:' + u : u;
    return /^https?:\/\//i.test(full) ? full : '';
  };
  function parseEmbed(raw) {
    const code = String(raw || '').trim();
    if (!code) return null;
    if (code.includes('<')) {
      const doc = new DOMParser().parseFromString(code, 'text/html');
      const fr = doc.querySelector('iframe');
      if (fr && httpUrl(fr.getAttribute('src'))) return { kind: 'iframe', src: httpUrl(fr.getAttribute('src')), title: fr.getAttribute('title') || '' };
      const v = doc.querySelector('video');
      const vs = v && httpUrl(v.getAttribute('src') || (v.querySelector('source') || { getAttribute: () => '' }).getAttribute('src'));
      if (vs) return { kind: 'video', src: vs };
      return null;
    }
    let u;
    try { u = new URL(httpUrl(code.split(/\s+/)[0])); } catch (e) { return null; }
    const host = u.hostname.replace(/^www\./, '');
    const t = u.searchParams.get('t') || u.searchParams.get('start');
    const start = t && /^\d+/.test(t) ? '&start=' + parseInt(t, 10) : '';
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/) || [])[1] || '';
    if (/^[\w-]{6,}$/.test(id)) return { kind: 'iframe', src: 'https://www.youtube.com/embed/' + id + '?rel=0' + start };
    if (host === 'vimeo.com' && /^\/\d+/.test(u.pathname)) return { kind: 'iframe', src: 'https://player.vimeo.com/video/' + u.pathname.match(/\d+/)[0] };
    const drive = host === 'drive.google.com' && u.pathname.match(/\/file\/d\/([\w-]+)/);
    if (drive) return { kind: 'iframe', src: 'https://drive.google.com/file/d/' + drive[1] + '/preview' };
    if (/\.(mp4|webm|ogv|ogg|mov|m4v)$/i.test(u.pathname)) return { kind: 'video', src: u.href };
    return { kind: 'iframe', src: u.href };
  }

  TYPES.video = {
    label: 'סרטון (קוד הטמעה)',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת (לא חובה)' },
      { k: 'embed', t: 'long', rows: 6, label: 'קוד הטמעה או קישור', help: 'YouTube: שיתוף ← הטמעה ← העתק, ואז הדביקו כאן. עובד גם עם Vimeo, Google Drive וקישור רגיל לסרטון. קוד שמכיל סקריפט (למשל Instagram) לא נתמך.' },
      { k: 'caption', t: 'text', label: 'כיתוב' },
    ],
    blank: () => ({ type: 'video', title: '', embed: '', caption: '', notes: '' }),
    render: (s) => {
      const tall = s.title ? '470px' : '560px';
      const p = parseEmbed(s.embed);
      let body;
      if (!String(s.embed || '').trim()) {
        body = h('div', { class: 'vid-empty' }, 'הדביקו קוד הטמעה או קישור לסרטון בעורך');
      } else if (!p) {
        body = h('div', { class: 'vid-empty' }, 'לא זוהה קוד הטמעה תקין. הדביקו קוד שמכיל iframe, או קישור לסרטון.');
      } else if (p.kind === 'video') {
        body = h('video', { src: p.src, controls: true, preload: 'metadata' });
      } else if (location.protocol === 'file:' && /youtube(-nocookie)?\.com\/embed\//.test(p.src)) {
        // YouTube מסרב להטמיע דף שנפתח כקובץ (שגיאה 153, אין כתובת מפנה). במקום מסגרת שבורה: תמונה ממוזערת וקישור
        const vid = (p.src.match(/\/embed\/([\w-]+)/) || [])[1];
        body = h('a', { class: 'vid-fallback', href: 'https://www.youtube.com/watch?v=' + vid, target: '_blank', rel: 'noopener' },
          h('img', { src: 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg', alt: '' }),
          h('span', { class: 'vid-play' }, '▶'),
          h('span', { class: 'vid-msg' }, 'YouTube לא מתנגן בתוך מצגת שנפתחה כקובץ. לחצו לפתיחה ב-YouTube, או הציגו את המצגת דרך edit.bat'));
      } else {
        body = h('iframe', {
          src: p.src, title: p.title || 'סרטון', allowfullscreen: true, loading: 'lazy', referrerpolicy: 'strict-origin-when-cross-origin',
          allow: 'autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write',
          sandbox: 'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox allow-forms',
        });
      }
      return [
        s.title ? h('h2', { style: { marginBottom: '16px' } }, s.title) : null,
        h('div', { class: 'vidbox', style: { height: tall } }, body),
        h('div', { class: 'vid-foot' },
          s.caption ? h('span', {}, s.caption) : h('span'),
          p ? h('a', { href: p.src, target: '_blank', rel: 'noopener', title: 'אם הסרטון לא נטען' }, 'פתח בחלון חדש') : null),
      ];
    },
  };

  /* מתגים אינטראקטיביים: לוחצים על מתגים ורואים את המספר הבינארי (ואת האות המתאימה) מתעדכנים */
  const expl = (s) => (s.explain ? h('p', { class: 'sw-explain' }, s.explain) : null);
  TYPES.switches = {
    label: 'מתגים אינטראקטיביים',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'explain', t: 'long', rows: 3, label: 'טקסט הסבר (מוצג מתחת לכותרת)' },
      { k: 'bits', t: 'select', label: 'מספר מתגים', opts: [['8', '8 (עד 255)'], ['4', '4 (עד 15)']] },
      { k: 'letter', t: 'select', label: 'הצגת אות ASCII (רק ב-8 מתגים)', opts: [['1', 'כן'], ['', 'לא']] },
      { k: 'start', t: 'num', label: 'ערך התחלתי (למשל 65)' },
      { k: 'hint', t: 'text', label: 'שורת הנחיה' },
    ],
    blank: () => ({ type: 'switches', title: 'לחצו על המתגים', bits: '8', letter: '1', start: 0, hint: 'מתג דלוק מוסיף את המשקל שמעליו', notes: '' }),
    cls: () => 's-switches',
    render: (s) => {
      const n = String(s.bits) === '4' ? 4 : 8;
      const W = Array.from({ length: n }, (_, i) => Math.pow(2, n - 1 - i));
      const start = Math.max(0, Math.min(Math.pow(2, n) - 1, Math.floor(Number(s.start) || 0)));
      let rest = start;
      const state = W.map((w) => { const on = rest >= w; if (on) rest -= w; return on; });
      const showCh = n === 8 && !!s.letter;
      const valEl = h('div', { class: 'sw-val' }), sumEl = h('div', { class: 'sw-sum' });
      const chr = h('div', { class: 'sw-chr' }), code = h('div', { class: 'sw-code' });
      const chEl = showCh ? h('div', { class: 'sw-ch' }, chr, code) : null;
      const btns = [], bits = [];
      const update = () => {
        let v = 0; const parts = [];
        state.forEach((on, i) => {
          if (on) { v += W[i]; parts.push(W[i]); }
          btns[i].classList.toggle('on', on);
          bits[i].classList.toggle('on', on);
          bits[i].textContent = on ? '1' : '0';
        });
        valEl.textContent = '= ' + v;
        sumEl.textContent = parts.length ? parts.join(' + ') : '0';
        if (showCh) {
          chr.textContent = v > 32 && v < 127 ? String.fromCharCode(v) : (v === 32 ? '␣' : '·');
          code.textContent = 'קוד ' + v;
        }
      };
      const noFocus = (e) => e.preventDefault(); // שהרווח לא יפעיל מתג וגם יקדם שקף
      const cols = W.map((w, i) => {
        btns[i] = h('button', { class: 'sw-btn', type: 'button', 'aria-label': 'מתג ' + w, onmousedown: noFocus, onclick: () => { state[i] = !state[i]; update(); } }, h('i'));
        bits[i] = h('div', { class: 'sw-bit' });
        return h('div', { class: 'sw-col' }, h('div', { class: 'sw-w' }, String(w)), btns[i], bits[i]);
      });
      update();
      return [
        s.title ? h('h2', {}, s.title) : null,
        expl(s),
        h('div', { class: 'grow' },
          h('div', { class: 'sw-row' }, cols),
          h('div', { class: 'sw-res' }, h('div', { class: 'sw-calc' }, valEl, sumEl), chEl,
            h('button', { class: 'sw-reset', type: 'button', onmousedown: noFocus, onclick: () => { state.fill(false); update(); } }, 'אפס')),
          s.hint ? h('p', { class: 'sw-hint' }, s.hint) : null),
      ];
    },
  };

  /* מעגל חשמלי אינטראקטיבי: שני מתגים בטור (AND) ובמקביל (OR) מדליקים נורה. לוחצים על המתגים בציור */
  const CIR_SVG_SERIES = `<svg viewBox="0 0 430 270" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="מעגל עם שני מתגים בטור">
    <g class="loop">
      <path class="cw" d="M40 125 V40 H110"/><path class="cw" d="M170 40 H230"/><path class="cw" d="M290 40 H390 V118"/><path class="cw" d="M390 182 V240 H40 V145"/>
    </g>
    <path d="M18 125 H62" stroke="#333" stroke-width="7" stroke-linecap="round"/><path d="M28 145 H52" stroke="#333" stroke-width="7" stroke-linecap="round"/>
    <g class="sw" data-sw="A"><circle cx="110" cy="40" r="7" fill="#333"/><circle cx="170" cy="40" r="7" fill="#333"/>
      <line class="b-on" x1="110" y1="40" x2="170" y2="40" stroke="#333" stroke-width="8" stroke-linecap="round"/>
      <line class="b-off" x1="110" y1="40" x2="162" y2="8" stroke="#333" stroke-width="8" stroke-linecap="round"/>
      <text x="140" y="80" text-anchor="middle" font-size="30" font-weight="800" font-family="Arial" fill="#1C7ED6">A</text>
      <rect data-sw="A" x="96" y="0" width="88" height="62" fill="transparent" style="cursor:pointer"/></g>
    <g class="sw" data-sw="B"><circle cx="230" cy="40" r="7" fill="#333"/><circle cx="290" cy="40" r="7" fill="#333"/>
      <line class="b-on" x1="230" y1="40" x2="290" y2="40" stroke="#333" stroke-width="8" stroke-linecap="round"/>
      <line class="b-off" x1="230" y1="40" x2="282" y2="8" stroke="#333" stroke-width="8" stroke-linecap="round"/>
      <text x="260" y="80" text-anchor="middle" font-size="30" font-weight="800" font-family="Arial" fill="#1C7ED6">B</text>
      <rect data-sw="B" x="216" y="0" width="88" height="62" fill="transparent" style="cursor:pointer"/></g>
    <circle class="glow" cx="390" cy="150" r="52" fill="#FFE066"/><circle class="bulb" cx="390" cy="150" r="32" stroke="#333" stroke-width="6"/>
    <path d="M368 128 L412 172 M412 128 L368 172" stroke="#333" stroke-width="5" stroke-linecap="round"/>
  </svg>`;
  const CIR_SVG_PARALLEL = `<svg viewBox="0 0 430 270" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="מעגל עם שני מתגים במקביל">
    <g class="main"><path class="cw" d="M40 125 V60 H110"/><path class="cw" d="M310 60 H390 V118"/><path class="cw" d="M390 182 V240 H40 V145"/></g>
    <g class="brA"><path class="cw" d="M110 30 V60"/><path class="cw" d="M110 30 H150"/><path class="cw" d="M210 30 H310"/><path class="cw" d="M310 30 V60"/></g>
    <g class="brB"><path class="cw" d="M110 60 V90"/><path class="cw" d="M110 90 H150"/><path class="cw" d="M210 90 H310"/><path class="cw" d="M310 60 V90"/></g>
    <path d="M18 125 H62" stroke="#333" stroke-width="7" stroke-linecap="round"/><path d="M28 145 H52" stroke="#333" stroke-width="7" stroke-linecap="round"/>
    <g class="sw" data-sw="A"><circle cx="150" cy="30" r="7" fill="#333"/><circle cx="210" cy="30" r="7" fill="#333"/>
      <line class="b-on" x1="150" y1="30" x2="210" y2="30" stroke="#333" stroke-width="8" stroke-linecap="round"/>
      <line class="b-off" x1="150" y1="30" x2="202" y2="0" stroke="#333" stroke-width="8" stroke-linecap="round"/>
      <text x="180" y="62" text-anchor="middle" font-size="30" font-weight="800" font-family="Arial" fill="#1C7ED6">A</text>
      <rect data-sw="A" x="136" y="-4" width="88" height="56" fill="transparent" style="cursor:pointer"/></g>
    <g class="sw" data-sw="B"><circle cx="150" cy="90" r="7" fill="#333"/><circle cx="210" cy="90" r="7" fill="#333"/>
      <line class="b-on" x1="150" y1="90" x2="210" y2="90" stroke="#333" stroke-width="8" stroke-linecap="round"/>
      <line class="b-off" x1="150" y1="90" x2="202" y2="60" stroke="#333" stroke-width="8" stroke-linecap="round"/>
      <text x="180" y="124" text-anchor="middle" font-size="30" font-weight="800" font-family="Arial" fill="#1C7ED6">B</text>
      <rect data-sw="B" x="136" y="62" width="88" height="62" fill="transparent" style="cursor:pointer"/></g>
    <circle class="glow" cx="390" cy="150" r="52" fill="#FFE066"/><circle class="bulb" cx="390" cy="150" r="32" stroke="#333" stroke-width="6"/>
    <path d="M368 128 L412 172 M412 128 L368 172" stroke="#333" stroke-width="5" stroke-linecap="round"/>
  </svg>`;
  TYPES.circuit = {
    label: 'מעגל חשמלי: מתגים ונורה',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'explain', t: 'long', rows: 3, label: 'טקסט הסבר (מוצג מתחת לכותרת)' },
      { k: 'hint', t: 'text', label: 'שורת הנחיה' },
    ],
    blank: () => ({ type: 'circuit', title: 'מתגים שמקבלים החלטות', hint: 'לחצו על המתגים בציור', notes: '' }),
    cls: () => 's-circuit',
    render: (s) => {
      const st = { A: false, B: false };
      const mk = (svg, name, rule) => {
        const box = h('div', { class: 'cir-svg', html: svg });
        const state = h('div', { class: 'cir-state' });
        const col = h('div', { class: 'cir-col' }, h('h3', {}, name), box, state, h('div', { class: 'cir-rule' }, rule));
        return { col, box, state };
      };
      const ser = mk(CIR_SVG_SERIES, 'בטור: AND', 'כמו כספת עם שני מפתחות');
      const par = mk(CIR_SVG_PARALLEL, 'במקביל: OR', 'כמו חדר עם שתי דלתות');
      const sw = (box, key) => {
        box.querySelectorAll('[data-sw="' + key + '"].sw .b-on').forEach((e) => { e.style.display = st[key] ? '' : 'none'; });
        box.querySelectorAll('[data-sw="' + key + '"].sw .b-off').forEach((e) => { e.style.display = st[key] ? 'none' : ''; });
      };
      const on = (box, sel, v) => box.querySelectorAll(sel + ' .cw').forEach((e) => e.classList.toggle('on', v));
      const lamp = (part, lit) => {
        part.box.querySelector('.bulb').setAttribute('fill', lit ? '#FFE066' : '#E4E0D4');
        part.box.querySelector('.glow').style.opacity = lit ? '.45' : '0';
        part.state.textContent = lit ? 'הנורה דולקת' : 'הנורה כבויה';
        part.state.classList.toggle('lit', lit);
      };
      const update = () => {
        const and = st.A && st.B, or = st.A || st.B;
        ['A', 'B'].forEach((k) => { sw(ser.box, k); sw(par.box, k); });
        on(ser.box, '.loop', and); lamp(ser, and);
        on(par.box, '.main', or); on(par.box, '.brA', st.A); on(par.box, '.brB', st.B); lamp(par, or);
      };
      [ser, par].forEach((p) => p.box.addEventListener('click', (e) => {
        const k = e.target.closest && e.target.closest('rect[data-sw]');
        if (k) { st[k.getAttribute('data-sw')] = !st[k.getAttribute('data-sw')]; update(); }
      }));
      update();
      return [
        s.title ? h('h2', {}, s.title) : null,
        expl(s),
        s.hint ? h('p', { class: 'sw-hint', style: { margin: '0 0 6px', textAlign: 'right' } }, s.hint) : null,
        h('div', { class: 'grow' }, h('div', { class: 'cir-wrap' }, ser.col, par.col)),
      ];
    },
  };

  /* קסקדת מתגים: כל מתג נקבע מהמתגים שמעליו, שורה אחרי שורה. עם XOR ומתג אחד נוצר המשולש של סרפינסקי (פרקטל) */
  TYPES.cascade = {
    label: 'קסקדת מתגים (פרקטל)',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'explain', t: 'long', rows: 3, label: 'טקסט הסבר (מוצג מתחת לכותרת)' },
      { k: 'rule', t: 'select', label: 'כלל התחלתי', opts: [['xor', 'XOR (פרקטל)'], ['or', 'OR (הצפה)'], ['and', 'AND (דועך)']] },
      { k: 'rows', t: 'select', label: 'מספר שורות', opts: [['8', '8'], ['6', '6'], ['10', '10']] },
      { k: 'hint', t: 'text', label: 'שורת הנחיה' },
    ],
    blank: () => ({ type: 'cascade', title: 'מתגים ששולטים במתגים', rule: 'xor', rows: '8', hint: 'כל מתג נקבע לפי שני המתגים שמעליו. לחצו על מתגי השורה העליונה', notes: '' }),
    cls: () => 's-cascade',
    render: (s) => {
      const W = 17, MID = 8;
      const R = Math.max(4, Math.min(12, parseInt(s.rows, 10) || 8));
      const RULES = [['xor', 'XOR: פרקטל'], ['or', 'OR: הצפה'], ['and', 'AND: דועך']];
      let rule = RULES.some((r) => r[0] === s.rule) ? s.rule : 'xor';
      const top = Array(W).fill(false); top[MID] = true;
      const f = { xor: (a, b) => a !== b, or: (a, b) => a || b, and: (a, b) => a && b };
      const noFocus = (e) => e.preventDefault();
      const cells = [];
      const RULE_TXT = { xor: 'מתג דלוק אם בדיוק אחד משני המתגים שמעליו דלוק (XOR).', or: 'מתג דלוק אם לפחות אחד משני המתגים שמעליו דלוק (OR).', and: 'מתג דלוק רק אם שני המתגים שמעליו דלוקים (AND).' };
      const hintEl = h('p', { class: 'sw-hint', style: { margin: '0 0 6px', textAlign: 'right' } });
      const mark = (r, i, on) => [i - 1, i + 1].forEach((j) => cells[r - 1][j] && cells[r - 1][j].classList.toggle('pa', on));
      const rowEls = Array.from({ length: R }, (_, r) => {
        const row = h('div', { class: 'cs-row' + (r === 0 ? ' cs-top' : ''), style: { '--c': 'hsl(' + (150 - r * 16) + ' 58% 38%)' } },
          Array.from({ length: W }, (_, i) => {
            const el = r === 0
              ? h('button', { class: 'cs-cell', type: 'button', 'aria-label': 'מתג', onmousedown: noFocus, onclick: () => { top[i] = !top[i]; update(); } })
              : h('span', { class: 'cs-cell', onmouseenter: () => mark(r, i, true), onmouseleave: () => mark(r, i, false) });
            (cells[r] = cells[r] || [])[i] = el;
            return el;
          }));
        return row;
      });
      const modeBtns = RULES.map(([k, label]) => h('button', { class: 'cs-mode', type: 'button', onmousedown: noFocus, onclick: () => { rule = k; update(); } }, label));
      const reset = h('button', { class: 'cs-mode', type: 'button', onmousedown: noFocus, onclick: () => { top.fill(false); top[MID] = true; update(); } }, 'מתג אחד באמצע');
      const clear = h('button', { class: 'cs-mode', type: 'button', onmousedown: noFocus, onclick: () => { top.fill(false); update(); } }, 'אפס');
      const update = () => {
        let prev = top.slice();
        for (let r = 0; r < R; r++) {
          const cur = r === 0 ? top : prev.map((_, i) => f[rule](!!prev[i - 1], !!prev[i + 1]));
          cur.forEach((on, i) => cells[r][i].classList.toggle('on', !!on));
          prev = cur;
        }
        RULES.forEach(([k], i) => modeBtns[i].classList.toggle('on', k === rule));
        hintEl.textContent = RULE_TXT[rule];
      };
      update();
      return [
        s.title ? h('h2', {}, s.title) : null,
        expl(s),
        hintEl,
        h('div', { class: 'grow' },
          h('div', { class: 'cs-grid' }, rowEls),
          h('div', { class: 'cs-ctrl' }, modeBtns, reset, clear)),
      ];
    },
  };

  /* שרשרת מתגים (דומינו): לוחצים על המתג הראשון, וכל מתג מדליק את הבא אחריו עד הנורה שבסוף */
  const CH_ARROW = '<svg viewBox="0 0 50 20" xmlns="http://www.w3.org/2000/svg"><path d="M46 10H12" stroke-width="6" stroke-linecap="round"/><path d="M2 10 L16 1 V19 Z" stroke-width="0"/></svg>';
  TYPES.chain = {
    label: 'שרשרת מתגים (דומינו)',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'explain', t: 'long', rows: 3, label: 'טקסט הסבר (מוצג מתחת לכותרת)' },
      { k: 'hint', t: 'text', label: 'שורת הנחיה' },
      { k: 'count', t: 'select', label: 'מספר שלבים (כולל הנורה)', opts: [['5', '5'], ['4', '4'], ['6', '6']] },
      { k: 'caption', t: 'text', label: 'משפט הסבר בתחתית' },
    ],
    blank: () => ({ type: 'chain', title: 'מתג אחד מדליק את הבא', hint: 'לחצו על המתג הראשון', count: '5', caption: 'כל מתג נדלק כשהמתג שלפניו נדלק, כמו דומינו', notes: '' }),
    cls: () => 's-chain',
    render: (s) => {
      const K = Math.max(3, Math.min(6, parseInt(s.count, 10) || 5));
      const state = Array(K).fill(false);
      let token = 0;
      const noFocus = (e) => e.preventDefault();
      const els = [], arrows = [];
      const stages = [];
      for (let i = 0; i < K; i++) {
        const last = i === K - 1;
        const el = last
          ? h('div', { class: 'ch-lamp' })
          : h('button', { class: 'ch-sw' + (i === 0 ? ' me' : ''), type: 'button', 'aria-label': 'מתג ' + (i + 1), disabled: i !== 0, onmousedown: noFocus, onclick: i === 0 ? () => press() : null });
        els[i] = el;
        stages.push(h('div', { class: 'ch-st' }, h('div', { class: 'ch-box' }, el), h('div', { class: 'ch-lab' }, last ? 'נורה' : 'מתג ' + (i + 1))));
        if (!last) { arrows[i] = h('div', { class: 'ch-arrow', html: CH_ARROW }); stages.push(arrows[i]); }
      }
      const update = () => {
        state.forEach((on, i) => els[i].classList.toggle('on', on));
        arrows.forEach((a, i) => a.classList.toggle('on', state[i]));
      };
      const press = () => {
        state[0] = !state[0]; update();
        const t = ++token;
        for (let k = 1; k < K; k++) setTimeout(() => { if (t === token) { state[k] = state[k - 1]; update(); } }, 450 * k);
      };
      update();
      return [
        s.title ? h('h2', {}, s.title) : null,
        expl(s),
        s.hint ? h('p', { class: 'sw-hint', style: { margin: '0 0 6px', textAlign: 'right' } }, s.hint) : null,
        h('div', { class: 'grow' },
          h('div', { class: 'ch-row' }, stages),
          s.caption ? h('p', { class: 'ch-cap' }, s.caption) : null),
      ];
    },
  };

  /* רשת מתגים (המשך שקף הדומינו): ארבעה מתגי קלט שולטים בשכבה הבאה, וכל שכבה בשכבה שאחריה, עד הנורה. ההדלקה "זולגת" שכבה אחר שכבה */
  const NW_LAYERS = [4, 3, 2, 1];
  const NW_GATES = [
    null,
    [{ op: 'and', from: [0, 1] }, { op: 'or', from: [1, 2] }, { op: 'and', from: [2, 3] }],
    [{ op: 'or', from: [0, 1] }, { op: 'and', from: [1, 2] }],
    [{ op: 'and', from: [0, 1] }],
  ];
  TYPES.network = {
    label: 'רשת מתגים (שכבות)',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'explain', t: 'long', rows: 3, label: 'טקסט הסבר (מוצג מתחת לכותרת)' },
    ],
    blank: () => ({ type: 'network', title: 'מתגים ששולטים במתגים, שכבה אחר שכבה', explain: 'כל שכבה מחליטה לפי השכבה שלפניה (AND או OR), עד שנדלקת הנורה.', notes: '' }),
    cls: () => 's-network',
    render: (s) => {
      const W = 1000, H = 335, GAP = 85, CX = 900, DX = 270, CY = H / 2, PW = 90;
      const noFocus = (e) => e.preventDefault();
      const nodes = NW_LAYERS.map((n, l) => Array.from({ length: n }, (_, i) => ({ l, i, x: CX - l * DX, y: CY + (i - (n - 1) / 2) * GAP, on: false })));
      const wrap = h('div', { class: 'nw', style: { width: W + 'px', height: H + 'px' } });
      let svg = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
      nodes.forEach((layer, l) => layer.forEach((nd, i) => {
        if (l === 0) return;
        NW_GATES[l][i].from.forEach((pi) => {
          const p = nodes[l - 1][pi];
          svg += '<path class="nw-l" data-p="' + (l - 1) + '-' + pi + '" d="M' + (p.x - PW / 2 + 4) + ' ' + p.y + ' L' + (nd.x + PW / 2 - 4) + ' ' + nd.y + '"/>';
        });
      }));
      svg += '</svg>';
      wrap.append(h('div', { class: 'nw-lines', html: svg }));
      let token = 0;
      const update = () => {
        nodes.forEach((layer) => layer.forEach((nd) => nd.el.classList.toggle('on', nd.on)));
        wrap.querySelectorAll('.nw-l').forEach((ln) => { const [l, i] = ln.getAttribute('data-p').split('-').map(Number); ln.classList.toggle('on', nodes[l][i].on); });
      };
      const run = () => {
        const t = ++token;
        for (let l = 1; l < NW_LAYERS.length; l++) {
          setTimeout(() => {
            if (t !== token) return;
            nodes[l].forEach((nd, i) => {
              const g = NW_GATES[l][i], a = nodes[l - 1][g.from[0]].on, b = nodes[l - 1][g.from[1]].on;
              nd.on = g.op === 'and' ? a && b : a || b;
            });
            update();
          }, 550 * l);
        }
      };
      const press = (nd) => { nd.on = !nd.on; update(); run(); };
      nodes.forEach((layer, l) => layer.forEach((nd) => {
        const last = l === NW_LAYERS.length - 1;
        nd.el = last
          ? h('div', { class: 'nw-lamp', style: { left: nd.x - 36 + 'px', top: nd.y - 36 + 'px' } })
          : l === 0
            ? h('button', { class: 'nw-n me', type: 'button', 'aria-label': 'מתג קלט', style: { left: nd.x - PW / 2 + 'px', top: nd.y - 23 + 'px' }, onmousedown: noFocus, onclick: () => press(nd) })
            : h('span', { class: 'nw-n', style: { left: nd.x - PW / 2 + 'px', top: nd.y - 23 + 'px' } });
        wrap.append(nd.el);
        const txt = l === 0 ? 'ABCD'[nd.i] : last ? 'נורה' : (NW_GATES[l][nd.i].op === 'and' ? 'AND' : 'OR');
        wrap.append(h('div', { class: 'nw-lab' + (l === 0 ? ' in' : last ? ' lamp' : ''), style: { left: nd.x - PW / 2 + 'px', top: nd.y - (last ? 62 : 52) + 'px' } }, txt));
      }));
      const setInputs = (v) => { nodes[0].forEach((nd) => { nd.on = v; }); update(); run(); };
      update();
      return [
        s.title ? h('h2', {}, s.title) : null,
        expl(s),
        h('div', { class: 'grow' },
          wrap,
          h('div', { class: 'cs-ctrl' },
            h('button', { class: 'cs-mode', type: 'button', onmousedown: noFocus, onclick: () => setInputs(true) }, 'הדלק את כל הקלטים'),
            h('button', { class: 'cs-mode', type: 'button', onmousedown: noFocus, onclick: () => setInputs(false) }, 'אפס'))),
      ];
    },
  };

  /* שער לוגי: מתגי קלט, סמל השער, נורת פלט וטבלת אמת שמסמנת את השורה הנוכחית */
  const GATE_SHAPES = {
    and: { out: 395, d: 'M270 80 H335 A60 60 0 0 1 335 200 H270 Z' },
    or: { out: 395, d: 'M270 80 Q335 80 395 140 Q335 200 270 200 Q300 140 270 80 Z' },
    xor: { out: 395, d: 'M270 80 Q335 80 395 140 Q335 200 270 200 Q300 140 270 80 Z', extra: '<path d="M252 80 Q282 140 252 200" fill="none" stroke="#333" stroke-width="5" stroke-linecap="round"/>' },
    not: { out: 394, d: 'M270 92 L270 188 L372 140 Z', extra: '<circle cx="383" cy="140" r="11" fill="#fff" stroke="#333" stroke-width="5"/>' },
  };
  const GATE_FN = { and: (a, b) => a && b, or: (a, b) => a || b, xor: (a, b) => a !== b, not: (a) => !a };
  const GATE_TXT = {
    and: 'AND: הפלט 1 רק אם שני הקלטים 1.',
    or: 'OR: הפלט 1 אם לפחות אחד מהקלטים 1.',
    xor: 'XOR: הפלט 1 אם הקלטים שונים זה מזה.',
    not: 'NOT: הופך. 1 הופך ל-0, ו-0 הופך ל-1.',
  };
  const gateParts = (gate0) => {
      const st = { A: false, B: false };
      let gate = GATE_SHAPES[gate0] ? gate0 : 'and';
      const box = h('div', { class: 'gt-svg' });
      const tbl = h('div', { class: 'gt-tbl' });
      const rule = h('p', { class: 'gt-rule' });
      const noFocus = (e) => e.preventDefault();
      const MODES = [['and', 'AND'], ['or', 'OR'], ['xor', 'XOR'], ['not', 'NOT']];
      const btns = MODES.map(([k, label]) => h('button', { class: 'cs-mode', type: 'button', onmousedown: noFocus, onclick: () => { gate = k; draw(); } }, label));
      const pill = (key, cy, on) =>
        '<g data-in="' + key + '"><rect x="20" y="' + (cy - 25) + '" width="100" height="50" rx="25" fill="' + (on ? '#2B8A3E' : '#B9B4A8') + '"/>' +
        '<circle cx="' + (on ? 95 : 45) + '" cy="' + cy + '" r="20" fill="#fff" stroke="#00000033" stroke-width="2"/>' +
        '<text x="70" y="' + (cy - 36) + '" text-anchor="middle" font-size="30" font-weight="800" font-family="Arial" fill="#1C7ED6">' + key + '</text>' +
        '<rect data-in="' + key + '" x="10" y="' + (cy - 42) + '" width="120" height="84" fill="transparent" style="cursor:pointer"/></g>';
      const draw = () => {
        const g = GATE_SHAPES[gate], two = gate !== 'not';
        const out = two ? GATE_FN[gate](st.A, st.B) : GATE_FN.not(st.A);
        const w = (on) => 'fill="none" stroke="' + (on ? '#E8590C' : '#9A958A') + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"';
        let svg = '<svg viewBox="0 0 660 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="שער לוגי">';
        if (two) {
          svg += '<path ' + w(st.A) + ' d="M120 70 H235 V105 H275"/>';
          svg += '<path ' + w(st.B) + ' d="M120 210 H235 V175 H275"/>';
        } else {
          svg += '<path ' + w(st.A) + ' d="M120 70 H235 V140 H272"/>';
        }
        svg += '<path ' + w(out) + ' d="M' + g.out + ' 140 H550"/>';
        svg += '<path d="' + g.d + '" fill="#FBF8F0" stroke="#333" stroke-width="6" stroke-linejoin="round"/>' + (g.extra || '');
        svg += pill('A', 70, st.A) + (two ? pill('B', 210, st.B) : '');
        svg += '<circle cx="' + 590 + '" cy="140" r="64" fill="#FFE066" opacity="' + (out ? 0.45 : 0) + '"/>';
        svg += '<circle cx="590" cy="140" r="38" fill="' + (out ? '#FFE066' : '#E4E0D4') + '" stroke="#333" stroke-width="6"/>';
        svg += '<path d="M563 113 L617 167 M617 113 L563 167" stroke="#333" stroke-width="5" stroke-linecap="round"/>';
        svg += '</svg>';
        box.innerHTML = svg;
        // טבלת אמת
        const rows = two ? [[0, 0], [0, 1], [1, 0], [1, 1]] : [[0], [1]];
        let tb = '<table><tr>' + (two ? '<th>A</th><th>B</th>' : '<th>A</th>') + '<th>פלט</th></tr>';
        rows.forEach((r) => {
          const cur = two ? (r[0] === +st.A && r[1] === +st.B) : (r[0] === +st.A);
          const o = two ? +GATE_FN[gate](!!r[0], !!r[1]) : +GATE_FN.not(!!r[0]);
          tb += '<tr' + (cur ? ' class="cur"' : '') + '>' + r.map((v) => '<td>' + v + '</td>').join('') + '<td class="o' + (o ? ' one' : '') + '">' + o + '</td></tr>';
        });
        tbl.innerHTML = tb + '</table>';
        rule.textContent = GATE_TXT[gate];
        MODES.forEach(([k], i) => btns[i].classList.toggle('on', k === gate));
      };
      box.addEventListener('click', (e) => {
        const r = e.target.closest && e.target.closest('rect[data-in]');
        if (r) { const k = r.getAttribute('data-in'); st[k] = !st[k]; draw(); }
      });
    draw();
    return { box, tbl, rule, btns };
  };

  TYPES.gate = {
    label: 'שער לוגי (AND, OR, XOR, NOT)',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'explain', t: 'long', rows: 3, label: 'טקסט הסבר (מוצג מתחת לכותרת)' },
      { k: 'gate', t: 'select', label: 'שער התחלתי', opts: [['and', 'AND'], ['or', 'OR'], ['xor', 'XOR'], ['not', 'NOT']] },
    ],
    blank: () => ({ type: 'gate', title: 'שער לוגי', explain: 'שער מקבל 0 או 1 ומחזיר 0 או 1 לפי כלל קבוע. לחצו על המתגים.', gate: 'and', notes: '' }),
    cls: () => 's-gate',
    render: (s) => {
      const p = gateParts(s.gate);
      return [
        s.title ? h('h2', {}, s.title) : null,
        expl(s),
        h('div', { class: 'grow' },
          h('div', { class: 'gt-row' }, p.box, p.tbl),
          p.rule,
          h('div', { class: 'cs-ctrl' }, p.btns)),
      ];
    },
  };

  /* שער לוגי מכני: גלגלי שיניים. מתג דולק = הגלגל במקומו (משולב), כבוי = מורם החוצה.
     כל הגלגלים זהים, והשיניים מסונכרנות לפי כיוון הצירים כדי שיילכו זו בתוך זו בלי להתנגש */
  const GEAR = { R: 38, n: 12, tip: 6, root: 8 };
  const gearD = (() => {
    const { R, n, tip, root } = GEAR, p = (2 * Math.PI) / n, Ro = R + tip, Ri = R - root;
    const P = (r, a) => (r * Math.cos(a)).toFixed(2) + ' ' + (r * Math.sin(a)).toFixed(2);
    let d = '';
    for (let k = 0; k < n; k++) {
      const a = k * p;
      d += (k ? 'A' + Ri + ' ' + Ri + ' 0 0 1 ' : 'M') + P(Ri, a - 0.23 * p) + ' L' + P(Ro, a - 0.12 * p) + ' L' + P(Ro, a + 0.12 * p) + ' L' + P(Ri, a + 0.23 * p) + ' ';
    }
    return d + 'A' + Ri + ' ' + Ri + ' 0 0 1 ' + P(Ri, -0.23 * p) + ' Z';
  })();
  const gearHoles = [0, 1, 2, 3, 4].map((k) => {
    const a = (k * 2 * Math.PI) / 5 - Math.PI / 2;
    return '<circle cx="' + (24 * Math.cos(a)).toFixed(1) + '" cy="' + (24 * Math.sin(a)).toFixed(1) + '" r="5.5" fill="#F1EDE2" stroke="#333" stroke-width="2"/>';
  }).join('');
  const GQ = GEAR.R * Math.SQRT2;
  const GEAR_LAYOUT = {
    and: {
      g: [['D', 205, 150, 1], ['A', 281, 150, -1], ['B', 357, 150, 1], ['O', 433, 150, -1]],
      e: [['D', 'A'], ['A', 'B'], ['B', 'O']],
      lift: { A: [0, -76], B: [0, -76] },
      pow: (st) => ({ D: 1, A: st.A, B: st.A && st.B, O: st.A && st.B }),
      txt: 'AND (שרשרת): הפלט מסתובב רק אם שני הגלגלים, A וגם B, במקומם.',
    },
    or: {
      g: [['D', 205, 150, 1], ['A', 205 + GQ, 150 - GQ, -1], ['B', 205 + GQ, 150 + GQ, -1], ['O', 205 + 2 * GQ, 150, 1]],
      e: [['D', 'A'], ['D', 'B'], ['A', 'O'], ['B', 'O']],
      lift: { A: [0, -46], B: [0, 46] },
      pow: (st) => ({ D: 1, A: st.A, B: st.B, O: st.A || st.B }),
      txt: 'OR (שני מסלולים): הפלט מסתובב אם לפחות אחד מהגלגלים, A או B, במקומו.',
    },
  };
  function gearPhases(L) {
    const pos = {}; L.g.forEach(([id, x, y]) => { pos[id] = [x, y]; });
    const root = L.g[0][0], phi = { [root]: 0 }, todo = [root];
    while (todo.length) {
      const a = todo.shift();
      L.e.forEach(([u, v]) => {
        const o = u === a ? v : v === a ? u : null;
        if (!o || phi[o] !== undefined) return;
        const al = Math.atan2(pos[o][1] - pos[a][1], pos[o][0] - pos[a][0]);
        phi[o] = 2 * al + Math.PI - Math.PI / GEAR.n - phi[a];
        todo.push(o);
      });
    }
    return phi;
  }
  TYPES.gears = {
    label: 'שער לוגי מכני (גלגלי שיניים)',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'explain', t: 'long', rows: 3, label: 'טקסט הסבר (מוצג מתחת לכותרת)' },
      { k: 'gate', t: 'select', label: 'שער התחלתי', opts: [['and', 'AND'], ['or', 'OR']] },
    ],
    blank: () => ({ type: 'gears', title: 'שער לוגי בלי חשמל', explain: 'מנוע מסובב גלגלי שיניים. מתג דולק: הגלגל במקומו. כבוי: מורם החוצה.', gate: 'and', notes: '' }),
    cls: () => 's-gears',
    render: (s) => {
      const st = { A: true, B: true };
      let mode = GEAR_LAYOUT[s.gate] ? s.gate : 'and', lay = null, gs = {};
      const box = h('div', { class: 'gr-svg' });
      const rule = h('p', { class: 'gt-rule' });
      const noFocus = (e) => e.preventDefault();
      const MODES = [['and', 'AND'], ['or', 'OR']];
      const btns = MODES.map(([k, label]) => h('button', { class: 'cs-mode', type: 'button', onmousedown: noFocus, onclick: () => { mode = k; build(); } }, label));
      const pill = (key, cy) =>
        '<g data-pill="' + key + '"><rect class="gp-bg" x="20" y="' + (cy - 25) + '" width="100" height="50" rx="25" fill="#2B8A3E"/>' +
        '<circle class="gp-kn" cx="95" cy="' + cy + '" r="20" fill="#fff" stroke="#00000033" stroke-width="2"/>' +
        '<text x="70" y="' + (cy - 36) + '" text-anchor="middle" font-size="30" font-weight="800" font-family="Arial" fill="#1C7ED6">' + key + '</text>' +
        '<rect data-in="' + key + '" x="10" y="' + (cy - 42) + '" width="120" height="84" fill="transparent" style="cursor:pointer"/></g>';
      const upd = () => {
        const pw = lay.pow(st);
        lay.g.forEach(([id]) => {
          const g = gs[id], lf = lay.lift[id], up = lf && !st[id];
          g.w.style.transform = 'translate(' + (g.x + (up ? lf[0] : 0)) + 'px,' + (g.y + (up ? lf[1] : 0)) + 'px)';
          g.w.style.opacity = up ? 0.55 : 1;
          g.on = !!pw[id];
          g.body.setAttribute('fill', pw[id] ? '#FDE6D6' : '#FBF8F0');
        });
        const out = !!pw.O;
        box.querySelector('.gr-shaft').setAttribute('stroke', out ? '#E8590C' : '#9A958A');
        box.querySelector('.gr-glow').setAttribute('opacity', out ? 0.45 : 0);
        box.querySelector('.gr-lamp').setAttribute('fill', out ? '#FFE066' : '#E4E0D4');
        box.querySelector('.gr-dig').textContent = out ? '1' : '0';
        ['A', 'B'].forEach((k) => {
          const g = box.querySelector('[data-pill="' + k + '"]');
          g.querySelector('.gp-bg').setAttribute('fill', st[k] ? '#2B8A3E' : '#B9B4A8');
          g.querySelector('.gp-kn').setAttribute('cx', st[k] ? 95 : 45);
        });
        rule.textContent = lay.txt;
        MODES.forEach(([k], i) => btns[i].classList.toggle('on', k === mode));
      };
      const build = () => {
        lay = GEAR_LAYOUT[mode];
        const phi = gearPhases(lay), O = lay.g.find((g) => g[0] === 'O');
        let svg = '<svg viewBox="10 0 650 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="שער לוגי מכני">';
        svg += '<path class="gr-shaft" d="M' + O[1] + ' ' + O[2] + ' H545" fill="none" stroke="#9A958A" stroke-width="9" stroke-linecap="round"/>';
        lay.g.forEach(([id, x, y]) => {
          svg += '<g class="gr-w" data-g="' + id + '" style="transform:translate(' + x + 'px,' + y + 'px)"><g class="gr-r" transform="rotate(' + (phi[id] * 180 / Math.PI).toFixed(2) + ')">' +
            '<path d="' + gearD + '" fill="#FBF8F0" stroke="#333" stroke-width="2.6" stroke-linejoin="round"/>' + gearHoles + '</g>' +
            (id === 'A' || id === 'B' ? '<text y="9" text-anchor="middle" font-size="26" font-weight="800" font-family="Arial" fill="#1C7ED6">' + id + '</text>' : '') + '</g>';
        });
        svg += '<text x="155" y="159" text-anchor="end" font-size="28" font-weight="700" fill="#6A645A">הנעה</text>';
        svg += pill('A', 62) + pill('B', 238);
        svg += '<circle class="gr-glow" cx="585" cy="150" r="66" fill="#FFE066" opacity="0"/>';
        svg += '<circle class="gr-lamp" cx="585" cy="150" r="42" fill="#E4E0D4" stroke="#333" stroke-width="6"/>';
        svg += '<text class="gr-dig" x="585" y="166" text-anchor="middle" font-size="46" font-weight="800" font-family="Arial" fill="#333">0</text>';
        svg += '<text x="585" y="227" text-anchor="middle" font-size="28" font-weight="700" fill="#6A645A">פלט</text>';
        box.innerHTML = svg + '</svg>';
        gs = {};
        lay.g.forEach(([id, x, y, sg]) => {
          const w = box.querySelector('[data-g="' + id + '"]'), deg = phi[id] * 180 / Math.PI;
          gs[id] = { w, r: w.querySelector('.gr-r'), body: w.querySelector('path'), x, y, s: sg, phi: deg, ang: deg, on: false };
        });
        upd();
      };
      box.addEventListener('click', (e) => {
        const r = e.target.closest && e.target.closest('rect[data-in]');
        if (r) { const k = r.getAttribute('data-in'); st[k] = !st[k]; upd(); }
      });
      build();
      let seen = false, idle = 0;
      const t0 = performance.now();
      const tick = (now) => {
        if (box.isConnected) seen = true; else if (seen || ++idle > 600) return;
        const T = (now - t0) / 1000;
        Object.keys(gs).forEach((id) => {
          const g = gs[id];
          if (g.on) g.ang = g.s * 60 * T + g.phi;
          g.r.setAttribute('transform', 'rotate(' + g.ang.toFixed(2) + ')');
        });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      return [
        s.title ? h('h2', {}, s.title) : null,
        expl(s),
        h('div', { class: 'grow' },
          h('div', { class: 'gr-row' }, box),
          rule,
          h('div', { class: 'cs-ctrl' }, btns)),
      ];
    },
  };

  /* שרשרת גלגלים עם נורות: גלגל שמסתובב מדליק את הנורה שלו. מראה מי תלוי במי */
  const GC_Y = 164;
  const GEARCHAIN = {
    series: {
      g: [['D', 130, GC_Y, 1, 'm'], ['A', 206, GC_Y, -1, 'A'], ['L1', 282, GC_Y, 1, 'l'], ['L2', 358, GC_Y, -1, 'l'], ['B', 434, GC_Y, 1, 'B'], ['L3', 510, GC_Y, -1, 'l']],
      e: [['D', 'A'], ['A', 'L1'], ['L1', 'L2'], ['L2', 'B'], ['B', 'L3']],
      lift: { A: [0, -76], B: [0, -76] },
      pills: { A: [206, 262], B: [434, 262] },
      pow: (st) => ({ D: 1, A: st.A, L1: st.A, L2: st.A, B: st.A && st.B, L3: st.A && st.B }),
      txt: 'טורי: A מפעיל שתי נורות. B מפעיל נורה אחת, ורק אם A דולק.',
    },
    branch: {
      g: [['D', 130, GC_Y, 1, 'm'], ['A', 130 + GQ, GC_Y - GQ, -1, 'A'], ['L1', 206 + GQ, GC_Y - GQ, 1, 'l'], ['L2', 282 + GQ, GC_Y - GQ, -1, 'l'],
        ['B', 130 + GQ, GC_Y + GQ, -1, 'B'], ['L3', 206 + GQ, GC_Y + GQ, 1, 'l']],
      e: [['D', 'A'], ['A', 'L1'], ['L1', 'L2'], ['D', 'B'], ['B', 'L3']],
      lift: { A: [0, -56], B: [0, 56] },
      pills: { A: [520, GC_Y - GQ], B: [520, GC_Y + GQ] },
      pow: (st) => ({ D: 1, A: st.A, L1: st.A, L2: st.A, B: st.B, L3: st.B }),
      txt: 'מסלולים נפרדים: A מפעיל שתי נורות, B מפעיל נורה אחת, בלי תלות זה בזה.',
    },
    layers: {
      g: [['M', 130, GC_Y, 1, 'm'], ['C', 130 + GQ, GC_Y - GQ, -1, 'C'], ['A', 206 + GQ, GC_Y - GQ, 1, 'a'], ['L1', 282 + GQ, GC_Y - GQ, -1, 'l'], ['L2', 358 + GQ, GC_Y - GQ, 1, 'l'],
        ['D', 130 + GQ, GC_Y + GQ, -1, 'D'], ['B', 206 + GQ, GC_Y + GQ, 1, 'b'], ['L3', 282 + GQ, GC_Y + GQ, -1, 'l']],
      e: [['M', 'C'], ['C', 'A'], ['A', 'L1'], ['L1', 'L2'], ['M', 'D'], ['D', 'B'], ['B', 'L3']],
      lift: { C: [0, -56], D: [0, 56] },
      pills: { C: [540, GC_Y - GQ], D: [540, GC_Y + GQ] },
      pow: (st) => ({ M: 1, C: st.C, A: st.C, L1: st.C, L2: st.C, D: st.D, B: st.D, L3: st.D }),
      txt: 'C מסובב את A ושתי נורות. D מסובב את B ונורה אחת.',
    },
  };
  TYPES.gearchain = {
    label: 'שרשרת גלגלים עם נורות',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'explain', t: 'long', rows: 3, label: 'טקסט הסבר (מוצג מתחת לכותרת)' },
      { k: 'mode', t: 'select', label: 'מצב התחלתי', opts: [['series', 'טורי'], ['branch', 'מסלולים נפרדים'], ['layers', 'A ו-B הם גלגלים']] },
    ],
    blank: () => ({ type: 'gearchain', title: 'מי מפעיל כמה נורות?', explain: 'גלגל מסתובב = הנורה שלו דולקת. A מפעיל שתי נורות, B רק אחת.', mode: 'series', notes: '' }),
    cls: () => 's-gears',
    render: (s) => {
      const st = { A: true, B: true, C: true, D: true };
      let mode = GEARCHAIN[s.mode] ? s.mode : 'series', lay = null, gs = {};
      const box = h('div', { class: 'gr-svg' });
      const rule = h('p', { class: 'gt-rule' });
      const noFocus = (e) => e.preventDefault();
      const MODES = [['series', 'טורי'], ['branch', 'מסלולים נפרדים'], ['layers', 'A ו-B הם גלגלים']];
      const btns = MODES.map(([k, label]) => h('button', { class: 'cs-mode', type: 'button', onmousedown: noFocus, onclick: () => { mode = k; build(); } }, label));
      const pill = (key, cx, cy) =>
        '<g data-pill="' + key + '"><rect class="gp-bg" x="' + (cx - 50) + '" y="' + (cy - 25) + '" width="100" height="50" rx="25" fill="#2B8A3E"/>' +
        '<circle class="gp-kn" cx="' + (cx + 25) + '" cy="' + cy + '" r="20" fill="#fff" stroke="#00000033" stroke-width="2"/>' +
        '<text x="' + cx + '" y="' + (cy - 36) + '" text-anchor="middle" font-size="30" font-weight="800" font-family="Arial" fill="#1C7ED6">' + key + '</text>' +
        '<rect data-in="' + key + '" x="' + (cx - 60) + '" y="' + (cy - 42) + '" width="120" height="84" fill="transparent" style="cursor:pointer"/></g>';
      const upd = () => {
        const pw = lay.pow(st);
        lay.g.forEach(([id, , , , kind]) => {
          const g = gs[id], lf = lay.lift[id], up = lf && !st[id];
          g.w.style.transform = 'translate(' + (g.x + (up ? lf[0] : 0)) + 'px,' + (g.y + (up ? lf[1] : 0)) + 'px)';
          g.w.style.opacity = up ? 0.55 : 1;
          g.on = !!pw[id];
          g.body.setAttribute('fill', pw[id] ? '#FDE6D6' : '#FBF8F0');
          if (kind === 'l') {
            g.bulb.setAttribute('fill', pw[id] ? '#FFE066' : '#E4E0D4');
            g.glow.setAttribute('opacity', pw[id] ? 0.7 : 0);
          }
        });
        Object.keys(lay.pills).forEach((k) => {
          const g = box.querySelector('[data-pill="' + k + '"]'), cx = lay.pills[k][0];
          g.querySelector('.gp-bg').setAttribute('fill', st[k] ? '#2B8A3E' : '#B9B4A8');
          g.querySelector('.gp-kn').setAttribute('cx', st[k] ? cx + 25 : cx - 25);
        });
        rule.textContent = lay.txt;
        MODES.forEach(([k], i) => btns[i].classList.toggle('on', k === mode));
      };
      const build = () => {
        lay = GEARCHAIN[mode];
        const phi = gearPhases(lay);
        let svg = '<svg viewBox="0 5 590 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="שרשרת גלגלי שיניים עם נורות">';
        lay.g.forEach(([id, x, y, , kind]) => {
          svg += '<g class="gr-w" data-g="' + id + '" style="transform:translate(' + x + 'px,' + y + 'px)"><g class="gr-r" transform="rotate(' + (phi[id] * 180 / Math.PI).toFixed(2) + ')">' +
            '<path d="' + gearD + '" fill="#FBF8F0" stroke="#333" stroke-width="2.6" stroke-linejoin="round"/>' + gearHoles + '</g>' +
            (/^[ABCD]$/.test(kind) ? '<text y="9" text-anchor="middle" font-size="26" font-weight="800" font-family="Arial" fill="#1C7ED6">' + kind + '</text>'
              : /^[ab]$/.test(kind) ? '<text y="9" text-anchor="middle" font-size="26" font-weight="800" font-family="Arial" fill="#333">' + kind.toUpperCase() + '</text>' : '') +
            (kind === 'l' ? '<circle class="gc-glow" r="19" fill="#FFE066" opacity="0"/><circle class="gc-bulb" r="11" fill="#E4E0D4" stroke="#333" stroke-width="3"/>' : '') + '</g>';
        });
        svg += '<text x="78" y="173" text-anchor="end" font-size="28" font-weight="700" fill="#6A645A">הנעה</text>';
        Object.keys(lay.pills).forEach((k) => { svg += pill(k, lay.pills[k][0], lay.pills[k][1]); });
        box.innerHTML = svg + '</svg>';
        gs = {};
        lay.g.forEach(([id, x, y, sg, kind]) => {
          const w = box.querySelector('[data-g="' + id + '"]'), deg = phi[id] * 180 / Math.PI;
          gs[id] = { w, r: w.querySelector('.gr-r'), body: w.querySelector('path'), x, y, s: sg, phi: deg, ang: deg, on: false,
            bulb: kind === 'l' ? w.querySelector('.gc-bulb') : null, glow: kind === 'l' ? w.querySelector('.gc-glow') : null };
        });
        upd();
      };
      box.addEventListener('click', (e) => {
        const r = e.target.closest && e.target.closest('rect[data-in]');
        if (r) { const k = r.getAttribute('data-in'); st[k] = !st[k]; upd(); }
      });
      build();
      let seen = false, idle = 0;
      const t0 = performance.now();
      const tick = (now) => {
        if (box.isConnected) seen = true; else if (seen || ++idle > 600) return;
        const T = (now - t0) / 1000;
        Object.keys(gs).forEach((id) => {
          const g = gs[id];
          if (g.on) g.ang = g.s * 60 * T + g.phi;
          g.r.setAttribute('transform', 'rotate(' + g.ang.toFixed(2) + ')');
        });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      return [
        s.title ? h('h2', {}, s.title) : null,
        expl(s),
        h('div', { class: 'grow' },
          h('div', { class: 'gr-row' }, box),
          rule,
          h('div', { class: 'cs-ctrl' }, btns)),
      ];
    },
  };

  /* מחבר חצי: שני מתגים, XOR קובע את הספרה ו-AND קובע אם 1 עולה לעמודה הבאה */
  TYPES.halfadder = {
    label: 'מחבר חצי (XOR ו-AND)',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'explain', t: 'long', rows: 3, label: 'טקסט הסבר (מוצג מתחת לכותרת)' },
    ],
    blank: () => ({ type: 'halfadder', title: 'איך מחשבים חיבור? עם שערים', explain: 'בבינארי יש רק 0 ו-1, ולכן 1+1 נותן 0 בעמודה ו-1 עולה לעמודה הבאה. XOR קובע את הספרה, AND קובע אם 1 עולה.', notes: '' }),
    cls: () => 's-adder',
    render: (s) => {
      const st = { A: true, B: true };
      const box = h('div', { class: 'gr-svg' });
      const eq = h('p', { class: 'ad-eq' });
      const w = (on) => 'fill="none" stroke="' + (on ? '#E8590C' : '#9A958A') + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"';
      const pill = (key, cy, on) =>
        '<g><rect x="20" y="' + (cy - 25) + '" width="100" height="50" rx="25" fill="' + (on ? '#2B8A3E' : '#B9B4A8') + '"/>' +
        '<circle cx="' + (on ? 95 : 45) + '" cy="' + cy + '" r="20" fill="#fff" stroke="#00000033" stroke-width="2"/>' +
        '<text x="70" y="' + (cy - 36) + '" text-anchor="middle" font-size="30" font-weight="800" font-family="Arial" fill="#1C7ED6">' + key + '</text>' +
        '<rect data-in="' + key + '" x="10" y="' + (cy - 42) + '" width="120" height="84" fill="transparent" style="cursor:pointer"/></g>';
      const lamp = (cx, cy, on) =>
        '<circle cx="' + cx + '" cy="' + cy + '" r="64" fill="#FFE066" opacity="' + (on ? 0.45 : 0) + '"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="38" fill="' + (on ? '#FFE066' : '#E4E0D4') + '" stroke="#333" stroke-width="6"/>' +
        '<path d="M' + (cx - 27) + ' ' + (cy - 27) + ' L' + (cx + 27) + ' ' + (cy + 27) + ' M' + (cx + 27) + ' ' + (cy - 27) + ' L' + (cx - 27) + ' ' + (cy + 27) + '" stroke="#333" stroke-width="5" stroke-linecap="round"/>';
      const lab = (x, y, txt) => '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="28" font-weight="700" fill="#6A645A">' + txt + '</text>';
      const draw = () => {
        const A = st.A, B = st.B, sum = A !== B, carry = A && B;
        const dX = -60, dA = 80; // הזזת צורות השערים (מצוירות סביב y=140) למרכזים 80 ו-220
        let svg = '<svg viewBox="0 -28 760 328" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="מחבר חצי">';
        svg += '<path ' + w(B) + ' d="M215 255 V115 H275"/>' + '<path ' + w(B) + ' d="M120 255 H275"/>';
        svg += '<path ' + w(A) + ' d="M120 45 H275"/>' + '<path ' + w(A) + ' d="M175 45 V185 H275"/>';
        svg += '<circle cx="175" cy="45" r="9" fill="' + (A ? '#E8590C' : '#9A958A') + '"/><circle cx="215" cy="255" r="9" fill="' + (B ? '#E8590C' : '#9A958A') + '"/>';
        svg += '<path ' + w(sum) + ' d="M395 80 H525"/><path ' + w(carry) + ' d="M395 220 H525"/>';
        svg += '<g transform="translate(0,' + dX + ')"><path d="M270 80 Q335 80 395 140 Q335 200 270 200 Q300 140 270 80 Z" fill="#FBF8F0" stroke="#333" stroke-width="6" stroke-linejoin="round"/>' +
          '<path d="M252 80 Q282 140 252 200" fill="none" stroke="#333" stroke-width="5" stroke-linecap="round"/></g>';
        svg += '<g transform="translate(0,' + dA + ')"><path d="M270 80 H335 A60 60 0 0 1 335 200 H270 Z" fill="#FBF8F0" stroke="#333" stroke-width="6" stroke-linejoin="round"/></g>';
        svg += '<text x="325" y="90" text-anchor="middle" font-size="26" font-weight="800" font-family="Arial" fill="#6A645A">XOR</text>';
        svg += '<text x="318" y="230" text-anchor="middle" font-size="26" font-weight="800" font-family="Arial" fill="#6A645A">AND</text>';
        svg += pill('A', 45, A) + pill('B', 255, B);
        svg += lamp(590, 80, sum) + lamp(590, 220, carry);
        svg += lab(590, 148, 'ספרה בעמודה') + lab(590, 288, 'עולה לעמודה הבאה');
        box.innerHTML = svg + '</svg>';
        eq.innerHTML = '<span dir="ltr">' + (+A) + ' + ' + (+B) + ' = ' + (+carry) + (+sum) + '</span> <small>בבינארי, כלומר ' + (+A + +B) + ' בעשרוני</small>';
      };
      box.addEventListener('click', (e) => {
        const r = e.target.closest && e.target.closest('rect[data-in]');
        if (r) { const k = r.getAttribute('data-in'); st[k] = !st[k]; draw(); }
      });
      draw();
      return [
        s.title ? h('h2', {}, s.title) : null,
        expl(s),
        h('div', { class: 'grow' }, h('div', { class: 'gr-row' }, box), eq),
      ];
    },
  };

  /* מחבר של 4 ביטים: שורת מתגים לכל מספר, נורות לתוצאה, וה-1 העולה עובר מעמודה לעמודה */
  TYPES.adder4 = {
    label: 'מחשבון: מחבר של 4 ביטים',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'explain', t: 'long', rows: 3, label: 'טקסט הסבר (מוצג מתחת לכותרת)' },
    ],
    blank: () => ({ type: 'adder4', title: 'מחשבון: חיבור בבינארי', explain: 'כל עמודה מחברת את הביטים שלה. אם יוצא יותר מדי, 1 עולה לעמודה הבאה, כמו בחיבור בכתב.', notes: '' }),
    cls: () => 's-adder',
    render: (s) => {
      const a = [0, 1, 0, 1], b = [0, 0, 1, 1]; // 5 + 3 (עמודות 8,4,2,1)
      const box = h('div', { class: 'gr-svg' });
      const eq = h('p', { class: 'ad-eq' });
      const XS = [190, 300, 410, 520, 630]; // עמודות 16,8,4,2,1
      const val = (v) => v[0] * 8 + v[1] * 4 + v[2] * 2 + v[3];
      const setBits = (v, n) => { for (let i = 0; i < 4; i++) v[i] = (n >> (3 - i)) & 1; };
      const calc = () => {
        let c = 0; const sum = [0, 0, 0, 0], co = [0, 0, 0, 0];
        for (let i = 3; i >= 0; i--) { const tt = a[i] + b[i] + c; sum[i] = tt & 1; co[i] = tt >> 1; c = co[i]; }
        return { sum, co, top: c };
      };
      const pill = (id, cx, cy, on) =>
        '<rect x="' + (cx - 38) + '" y="' + (cy - 19) + '" width="76" height="38" rx="19" fill="' + (on ? '#2B8A3E' : '#B9B4A8') + '"/>' +
        '<circle cx="' + (cx + (on ? 19 : -19)) + '" cy="' + cy + '" r="15" fill="#fff" stroke="#00000033" stroke-width="2"/>' +
        '<rect data-bit="' + id + '" x="' + (cx - 48) + '" y="' + (cy - 28) + '" width="96" height="56" fill="transparent" style="cursor:pointer"/>';
      const txt = (x, y, str, size, fill, anchor) => '<text x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'middle') + '" font-size="' + size + '" font-weight="800" font-family="Arial" fill="' + fill + '">' + str + '</text>';
      const draw = () => {
        const r = calc();
        let svg = '<svg viewBox="0 0 760 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="מחבר של ארבעה ביטים">';
        [16, 8, 4, 2, 1].forEach((v, k) => { svg += txt(XS[k], 24, v, 26, '#8A857A'); });
        svg += txt(125, 80, 'A', 34, '#1C7ED6', 'end') + txt(125, 140, 'B', 34, '#1C7ED6', 'end');
        svg += '<text x="125" y="203" text-anchor="end" font-size="26" font-weight="700" fill="#6A645A">עולה</text>';
        svg += '<text x="125" y="256" text-anchor="end" font-size="26" font-weight="700" fill="#6A645A">תוצאה</text><text x="125" y="280" text-anchor="end" font-size="20" font-weight="600" fill="#8A857A">בבינארי</text>';
        for (let i = 0; i < 4; i++) {
          svg += pill('a' + i, XS[i + 1], 70, a[i]) + pill('b' + i, XS[i + 1], 130, b[i]);
        }
        svg += '<path d="M150 166 H680" stroke="#333" stroke-width="4" stroke-linecap="round"/>';
        for (let i = 0; i < 4; i++) { // 1 שעולה מעמודה i ונכנס לעמודה משמאלה
          const x = XS[i + 1] - 55, on = r.co[i];
          svg += '<circle cx="' + x + '" cy="196" r="17" fill="' + (on ? '#FFE066' : '#EDE8DA') + '" stroke="#333" stroke-width="3"/>' + txt(x, 205, on, 24, '#333');
        }
        const bits = [r.top, r.sum[0], r.sum[1], r.sum[2], r.sum[3]];
        bits.forEach((on, k) => {
          svg += '<circle cx="' + XS[k] + '" cy="252" r="34" fill="#FFE066" opacity="' + (on ? 0.45 : 0) + '"/>' +
            '<circle cx="' + XS[k] + '" cy="252" r="24" fill="' + (on ? '#FFE066' : '#E4E0D4') + '" stroke="#333" stroke-width="5"/>' + txt(XS[k], 262, on, 28, '#333');
        });
        box.innerHTML = svg + '</svg>';
        eq.innerHTML = '<span dir="ltr">' + val(a) + ' + ' + val(b) + ' = ' + (val(a) + val(b)) + '</span> <small>בעשרוני</small>';
      };
      box.addEventListener('click', (e) => {
        const el = e.target.closest && e.target.closest('rect[data-bit]');
        if (!el) return;
        const id = el.getAttribute('data-bit'), v = id[0] === 'a' ? a : b, i = +id[1];
        v[i] = v[i] ? 0 : 1; draw();
      });
      const LR = (x) => '⁦' + x + '⁩'; // שהמספרים לא יתהפכו בתוך טקסט עברית
      const PRESETS = [[5, 3, LR('5 + 3')], [7, 1, LR('7 + 1') + ': עולה בשרשרת'], [15, 1, LR('15 + 1')]];
      const btns = PRESETS.map(([x, y, label]) => h('button', { class: 'cs-mode', type: 'button', onmousedown: (e) => e.preventDefault(), onclick: () => { setBits(a, x); setBits(b, y); draw(); } }, label));
      draw();
      return [
        s.title ? h('h2', {}, s.title) : null,
        expl(s),
        h('div', { class: 'grow' }, h('div', { class: 'gr-row' }, box), eq, h('div', { class: 'cs-ctrl' }, btns)),
      ];
    },
  };

  /* השוואה בין עשרוני לבינארי: אותו מספר בשתי שפות. לחיצה על ספרה עשרונית או על מתג בינארי משנה את שניהם */
  TYPES.binary = {
    label: 'עשרוני מול בינארי (מתגים)',
    fields: [
      { k: 'title', t: 'text', label: 'כותרת' },
      { k: 'explain', t: 'long', rows: 3, label: 'טקסט הסבר (מוצג מתחת לכותרת)' },
      { k: 'val', t: 'num', label: 'מספר התחלתי (0 עד 255)' },
    ],
    blank: () => ({ type: 'binary', title: 'אותו מספר, שתי שפות', explain: 'לחצו על מתגים בבינארי או על ספרות בעשרוני, והמספר זהה בשני הצדדים.', val: 75, notes: '' }),
    cls: () => 's-binary',
    render: (s) => {
      let v = Math.max(0, Math.min(255, parseInt(s.val, 10) || 0));
      const PV = [128, 64, 32, 16, 8, 4, 2, 1], DP = [100, 10, 1];
      const noFocus = (e) => e.preventDefault();
      const decBox = h('div', { class: 'bd-cols' }), binBox = h('div', { class: 'bd-cols' });
      const decSum = h('div', { class: 'bd-sum' }), binSum = h('div', { class: 'bd-sum' }), eq = h('p', { class: 'bd-eq' });
      const draw = () => {
        const ds = String(v).padStart(3, '0').split('').map(Number);
        decBox.replaceChildren(...DP.map((p, i) => h('div', { class: 'bd-col' },
          h('button', { class: 'bd-digit', type: 'button', onmousedown: noFocus, onclick: () => {
            const nd = (ds[i] + 1) % 10, nv = v + (nd - ds[i]) * p;
            v = nv > 255 ? v - ds[i] * p : nv; draw();
          } }, String(ds[i])),
          h('div', { class: 'bd-pv' }, String(p)),
          h('div', { class: 'bd-bcd' }, ds[i].toString(2).padStart(4, '0')))));
        binBox.replaceChildren(...PV.map((p) => {
          const on = (v & p) !== 0;
          return h('div', { class: 'bd-col' },
            h('button', { class: 'bd-sw' + (on ? ' on' : ''), type: 'button', onmousedown: noFocus, onclick: () => { v ^= p; draw(); } }),
            h('div', { class: 'bd-bit' + (on ? ' on' : '') }, on ? '1' : '0'),
            h('div', { class: 'bd-pv' }, String(p)));
        }));
        const dp = DP.map((p, i) => ds[i] * p).filter(Boolean), bp = PV.filter((p) => v & p);
        decSum.innerHTML = '<span dir="ltr">' + (dp.length ? dp.join(' + ') : '0') + ' = ' + v + '</span>';
        binSum.innerHTML = '<span dir="ltr">' + (bp.length ? bp.join(' + ') : '0') + ' = ' + v + '</span>';
        eq.innerHTML = '<span dir="ltr">' + v + '</span> בעשרוני = <span dir="ltr">' + v.toString(2).padStart(8, '0') + '</span> בבינארי';
      };
      const panel = (title, sub, cols, sum) => h('div', { class: 'bd-panel' }, h('h3', {}, title), h('p', { class: 'bd-sub' }, sub), cols, sum);
      const PRESETS = [5, 42, 100, 255];
      const btns = PRESETS.map((n) => h('button', { class: 'cs-mode', type: 'button', onmousedown: noFocus, onclick: () => { v = n; draw(); } }, String(n)));
      draw();
      return [
        s.title ? h('h2', {}, s.title) : null,
        expl(s),
        h('div', { class: 'grow' },
          h('div', { class: 'bd-row' },
            panel('בינארי: בסיס 2', 'שתי ספרות בלבד (0 ו-1). כל עמודה שווה פי 2 מהקודמת', binBox, binSum),
            panel('עשרוני: בסיס 10', 'עשר ספרות (0 עד 9). כל עמודה שווה פי 10 מהקודמת', decBox, decSum)),
          eq,
          h('div', { class: 'cs-ctrl' }, btns)),
      ];
    },
  };

  /* שקף חופשי: קנבס 1920×1080 עם רכיבים במיקום מוחלט (טקסט, תמונה, טבלה). נערך בעורך בגרירה, ונקלט מ-PowerPoint בפריסה המקורית */
  const CV_FONTS = { he: "'Heebo', Arial, sans-serif", arial: 'Arial, Helvetica, sans-serif', serif: "Georgia, 'Times New Roman', serif" };
  const cvItem = (it, i, ctx) => {
    const st = { position: 'absolute', left: (it.x || 0) + 'px', top: (it.y || 0) + 'px', width: (it.w || 200) + 'px', height: it.h ? it.h + 'px' : 'auto' };
    let inner;
    if (it.kind === 'image') {
      if (it.bg) st.background = it.bg;
      inner = it.src
        ? h('img', { src: it.src, alt: it.alt || '', draggable: 'false', style: { width: '100%', height: '100%', objectFit: it.fit === 'contain' ? 'contain' : 'cover', display: 'block' } })
        : h('div', { class: 'cv-empty' }, 'תמונה');
    } else if (it.kind === 'table') {
      const rows = String(it.rows || '').split('\n').filter((r) => r.trim()).map((r) => r.split('|').map((c) => c.trim()));
      const cw = String(it.colw || '').split(',').map(Number);
      inner = h('table', { style: { fontSize: (it.size || 32) + 'px', color: it.color || '#0A0A0A', fontFamily: CV_FONTS[it.font] || CV_FONTS.he } },
        rows.map((r, ri) => h('tr', {}, r.map((c, ci) =>
          h(ri === 0 && it.header !== 'no' ? 'th' : 'td', { style: { width: cw[ci] ? cw[ci] + '%' : '', textAlign: it.align || 'right' } }, c)))));
    } else if (it.kind === 'gate') { // חלק משער לוגי אינטראקטיבי: סרטוט, טבלה, כלל או כפתורים. כל חלק נערך בנפרד, והמצב משותף
      const first = (ctx.items || []).find((x) => x.kind === 'gate');
      const p = ctx.gate || (ctx.gate = gateParts(first ? first.gate : it.gate));
      const part = it.part || 'circuit', size = (it.size || 40) + 'px';
      if (part === 'table') inner = h('div', { class: 'cv-gate', style: { fontSize: size } }, p.tbl);
      else if (part === 'rule') inner = h('div', { class: 'cv-gate cv-gate-rule', style: { fontSize: size } }, p.rule);
      else if (part === 'buttons') inner = h('div', { class: 'cv-gate', style: { fontSize: size } }, h('div', { class: 'cs-ctrl' }, p.btns));
      else inner = h('div', { class: 'cv-gate' }, p.box);
    } else if (it.kind === 'shape') {
      const w = it.w || 100, hh = it.h || 100, fill = it.fill || 'none', stroke = it.stroke || 'none', sw = it.sw || 0;
      let g;
      if (it.shape === 'line') g = '<line x1="0" y1="0" x2="' + w + '" y2="' + hh + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
      else if (it.shape === 'path') g = '<path d="' + String(it.path || '').replace(/"/g, '') + '" fill="' + (it.fill || 'none') + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round" vector-effect="non-scaling-stroke" transform="scale(' + (w / (it.vw || w)) + ' ' + (hh / (it.vh || hh)) + ')"/>';
      else { // חץ ימינה (הפוך בעזרת flip)
        const head = Math.min(w, hh) * 0.5, top = hh * 0.25, bot = hh * 0.75, nk = Math.max(0, w - head);
        g = '<polygon points="0,' + top + ' ' + nk + ',' + top + ' ' + nk + ',0 ' + w + ',' + hh / 2 + ' ' + nk + ',' + hh + ' ' + nk + ',' + bot + ' 0,' + bot + '" fill="' + fill + '"/>';
      }
      inner = h('div', { html: '<svg width="' + w + '" height="' + hh + '" viewBox="0 0 ' + w + ' ' + hh + '" style="overflow:visible;display:block" xmlns="http://www.w3.org/2000/svg">' + g + '</svg>' });
    } else {
      Object.assign(st, {
        fontSize: (it.size || 40) + 'px', fontWeight: it.bold ? 700 : 400, color: it.color || '#0A0A0A', textAlign: it.align || 'right',
        lineHeight: String(it.lh || 1.25), fontFamily: CV_FONTS[it.font] || CV_FONTS.he,
      });
      const ls = String(it.text || '').split('\n');
      st.direction = it.dir || (/[֐-׿]/.test(it.text || '') ? 'rtl' : 'ltr'); // לועזית בלבד: סדר סימנים ומספרים נכון
      if (it.valign === 'middle' || it.valign === 'bottom') Object.assign(st, { display: 'flex', flexDirection: 'column', justifyContent: it.valign === 'middle' ? 'center' : 'flex-end' });
      const body = it.html ? h('div', { class: 'cv-t cv-rich', html: sanitizeRich(it.html) }) : it.list ? h(it.list === 'number' ? 'ol' : 'ul', {}, ls.map((l) => h('li', {}, l))) : h('div', { class: 'cv-t' }, lines(it.text));
      inner = it.link ? h('a', { href: it.link, target: '_blank', rel: 'noopener', style: { color: 'inherit', textDecoration: 'none' } }, body) : body;
    }
    const tf = [it.rot ? 'rotate(' + it.rot + 'deg)' : '', it.flip === 'h' ? 'scaleX(-1)' : ''].filter(Boolean).join(' ');
    if (tf) st.transform = tf;
    return h('div', { class: 'ci ci-' + (it.kind || 'text'), 'data-i': i, style: st }, inner);
  };
  TYPES.canvas = {
    label: 'שקף חופשי (גרירה)',
    fields: [],
    blank: () => ({
      type: 'canvas', title: '', bg: '#FFFFFF', notes: '',
      items: [{ kind: 'text', text: 'כותרת', x: 240, y: 400, w: 1440, h: 160, size: 96, bold: '1', color: '#C00000', align: 'center', font: 'he', lh: 1.2, list: '', link: '' }],
    }),
    cls: () => 's-canvas',
    render: (s) => [h('div', { class: 'cv', style: { background: s.bg || '#FFFFFF' } }, (() => { const ctx = { items: s.items || [] }; return (s.items || []).map((it, i) => cvItem(it, i, ctx)); })())],
  };

  /* לוגו בפינת כל שקף. הצורות מצוירות מחדש כווקטור, בצבע הטקסט: שחור על שקף בהיר, לבן על כהה/צבעוני (ראו .logo ב-CSS) */
  const LOGO_SVG = '<svg viewBox="73 73 301 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" d="M73 73 H152 L374 373 H296 Z M286 73 H374 V190 Z"/></svg>';
  const logo = () => h('div', { class: 'logo', html: LOGO_SVG });

  /* טקסט עשיר בשקף חופשי: רק תגיות עיצוב בטוחות (הדגשה, קו תחתון, נטוי, צבע, רשימות). כל השאר נמחק */
  const RICH_OK = new Set(['B', 'I', 'U', 'SPAN', 'DIV', 'P', 'BR', 'OL', 'UL', 'LI']);
  const RICH_MAP = { STRONG: 'b', EM: 'i' };
  const sanitizeRich = (html) => {
    const src = new DOMParser().parseFromString('<body>' + String(html || '') + '</body>', 'text/html').body;
    const walk = (from, to) => {
      from.childNodes.forEach((n) => {
        if (n.nodeType === 3) { to.append(document.createTextNode(n.nodeValue)); return; }
        if (n.nodeType !== 1) return;
        const tag = RICH_MAP[n.tagName] ? RICH_MAP[n.tagName].toUpperCase() : n.tagName;
        if (!RICH_OK.has(tag)) { if (!/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED)$/.test(tag)) walk(n, to); return; }
        const el = document.createElement(tag.toLowerCase());
        if (tag === 'SPAN') {
          const c = (n.style && n.style.color) || '';
          if (/^(#[0-9a-f]{3,8}|rgba?\([\d\s,.%]+\)|[a-z]+)$/i.test(c)) el.style.color = c;
        }
        walk(n, el);
        to.append(el);
      });
    };
    const out = document.createElement('div');
    walk(src, out);
    return out.innerHTML;
  };

  const Slides = {
    COLORS, COLOR_OPTS, TYPES, parseEmbed, sanitizeRich,
    // שקף תמונה ישן (שדה src אחד) הופך לרשימת תמונות
    normalize: (s) => {
      if (s && s.type === 'image' && !Array.isArray(s.items)) {
        s.items = [{ src: s.src || '', caption: '', fit: '' }];
        delete s.src;
        s.layout = s.layout || 'auto';
      }
      return s;
    },
    type: (s) => TYPES[s.type] || TYPES.text,
    cls: (s) => { const t = Slides.type(s); return t.cls ? t.cls(s) : ''; },
    render: (s) => [...Slides.type(s).render(s).filter(Boolean), logo()],
    titleOf: (s) => {
      if (s.type === 'section') return [s.part, s.title].filter(Boolean).join(': ');
      if (s.type === 'timer') return String(s.quote || '').replace(/\*/g, '');
      return s.title || s.kicker || (TYPES[s.type] || {}).label || '';
    },
  };
  window.Slides = Slides;
})();
