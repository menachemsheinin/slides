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

  /* שקף חופשי: קנבס 1920×1080 עם רכיבים במיקום מוחלט (טקסט, תמונה, טבלה). נערך בעורך בגרירה, ונקלט מ-PowerPoint בפריסה המקורית */
  const CV_FONTS = { he: "'Heebo', Arial, sans-serif", arial: 'Arial, Helvetica, sans-serif', serif: "Georgia, 'Times New Roman', serif" };
  const cvItem = (it, i) => {
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
    } else {
      Object.assign(st, {
        fontSize: (it.size || 40) + 'px', fontWeight: it.bold ? 700 : 400, color: it.color || '#0A0A0A', textAlign: it.align || 'right',
        lineHeight: String(it.lh || 1.25), fontFamily: CV_FONTS[it.font] || CV_FONTS.he,
      });
      const ls = String(it.text || '').split('\n');
      const body = it.list ? h(it.list === 'number' ? 'ol' : 'ul', {}, ls.map((l) => h('li', {}, l))) : h('div', { class: 'cv-t' }, lines(it.text));
      inner = it.link ? h('a', { href: it.link, target: '_blank', rel: 'noopener', style: { color: 'inherit' } }, body) : body;
    }
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
    render: (s) => [h('div', { class: 'cv', style: { background: s.bg || '#FFFFFF' } }, (s.items || []).map(cvItem))],
  };

  /* לוגו בפינת כל שקף. הצורות מצוירות מחדש כווקטור, בצבע הטקסט: שחור על שקף בהיר, לבן על כהה/צבעוני (ראו .logo ב-CSS) */
  const LOGO_SVG = '<svg viewBox="73 73 301 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" d="M73 73 H152 L374 373 H296 Z M286 73 H374 V190 Z"/></svg>';
  const logo = () => h('div', { class: 'logo', html: LOGO_SVG });

  const Slides = {
    COLORS, COLOR_OPTS, TYPES, parseEmbed,
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
