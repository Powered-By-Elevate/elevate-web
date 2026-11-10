import { esc } from './fmt.js?v=02d4c24167';

/* esc lives in fmt.js. It is re-exported here because every drawing module
   needs both, and one import line per file is one fewer thing to get wrong. */
export { esc };

/* Line icons and brand marks, drawn rather than fetched: no sprite sheet, no
   network, and every one inherits currentColor so it works in both themes.
   A client's real lockup replaces the mark in the settings console. */

const P = {
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z',
  gauge: 'M4 18a8 8 0 1 1 16 0M12 18l4.5-6',
  bars: 'M4 20V9m5 11V4m5 16v-7m5 7V7',
  wedge: 'M4 20h16M6 20V9l12-5v16',
  target: 'M12 3v4m0 10v4M3 12h4m10 0h4M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5Z',
  wallet: 'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Zm13 4h3',
  scale: 'M12 4v16M5 8h14M5 8 2.5 14h5L5 8Zm14 0-2.5 6h5L19 8ZM8 20h8',
  doc: 'M6 3h8l4 4v14H6V3Zm8 0v4h4M9 12h6M9 16h6',
  lock: 'M6 11h12v10H6V11Zm3 0V7a3 3 0 0 1 6 0v4',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  list: 'M4 6h16M4 12h16M4 18h16',
  zoom: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15 15l5 5',
  pulse: 'M3 12h4l3-7 4 14 3-7h4',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 0c-3 0-5 2-5 5v3h10v-3c0-3-2-5-5-5Zm7-6.5a3 3 0 0 1 0 6M17 19h3v-2.5c0-2-1.2-3.6-3-4.2',
  funnel: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm9 3-2.1-.6-.5-1.2 1-1.9-1.7-1.7-1.9 1-1.2-.5L14 4h-4l-.6 2.1-1.2.5-1.9-1L4.6 7.3l1 1.9-.5 1.2L3 12l2.1.6.5 1.2-1 1.9 1.7 1.7 1.9-1 1.2.5L10 20h4l.6-2.1 1.2-.5 1.9 1 1.7-1.7-1-1.9.5-1.2L21 12Z',
  ledger: 'M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Zm0 0v16m4-12h6m-6 4h6m-6 4h3',
  core: 'M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 0v18m8-14-8 4-8-4',
  plan: 'M4 4h16v16H4V4Zm0 5h16M9 9v11m4-7h4m-4 3h4',
  check: 'M4 12.5 9 18 20 6',
  box: 'M3 8l9-4 9 4-9 4-9-4Zm0 0v8l9 4 9-4V8M12 12v8',
  chat: 'M4 5h16v11H9l-5 4V5Z',
  sun: 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z',
  print: 'M7 9V4h10v5M7 17H4v-6h16v6h-3M7 14h10v6H7v-6Z',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M4 20h16',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15 15l5 5',
  close: 'M6 6l12 12M18 6 6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  arrow: 'M5 12h14m0 0-5-5m5 5-5 5',
  bolt: 'M13 3 5 14h5l-1 7 8-11h-5l1-7Z',
  link: 'M9.5 14.5 14.5 9.5M11 7l1.5-1.5a4.2 4.2 0 0 1 6 6L17 13m-4 4-1.5 1.5a4.2 4.2 0 0 1-6-6L7 11',
  plus: 'M12 5v14M5 12h14',
  caret: 'M6 9l6 6 6-6',
  flag: 'M6 3v18M6 4h11l-2 4 2 4H6',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l4 2',
  shield: 'M12 3 5 6v6c0 4 3 7.3 7 9 4-1.7 7-5 7-9V6l-7-3Z',
  truck: 'M3 7h11v9H3V7Zm11 3h4l3 3v3h-7v-6ZM7 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  store: 'M4 9h16v11H4V9Zm0 0 2-5h12l2 5M9 20v-6h6v6',
  factory: 'M3 20V11l5 3V11l5 3V8l8 4v8H3Zm4-3h2m4 0h2',
  school: 'M12 3 3 8h18l-9-5Zm-7 5v12h14V8M9 20v-6h6v6',
  code: 'M9 7 4 12l5 5m6-10 5 5-5 5',
  dish: 'M12 5v2M5 17a7 7 0 0 1 14 0M3 17h18M6 20h12',
};

export function icon(name, size = 18, extra = '') {
  const d = P[name] || P.grid;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none"
    stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
    class="${extra}" aria-hidden="true"><path d="${d}"/></svg>`;
}

let markSeq = 0;

const SHAPES = {
  square: 'M2 2h20v20H2z',
  chevron: 'M12 1 23 7v10L12 23 1 17V7z',
  shield: 'M12 1 2 5v8c0 5 4 9.6 10 11 6-1.4 10-6 10-11V5L12 1Z',
  circle: 'M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Z',
  hex: 'M12 1.5 21.5 7v10L12 22.5 2.5 17V7L12 1.5Z',
  road: 'M5 1h14l3 22H2L5 1Z',
  beam: 'M12 1 22 12 12 23 2 12 12 1Z',
  tile: 'M7 1h10a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H7a6 6 0 0 1-6-6V7a6 6 0 0 1 6-6Z',
};

/* A monogram mark in the brand's own color. Replaced by an uploaded lockup. */
export function brandMark(brand, size = 34) {
  const shape = SHAPES[brand.shape] || SHAPES.square;
  const a = brand.palette.accent;
  const b = brand.palette.accentDeep;
  const id = 'g' + Math.abs(hash(brand.name)).toString(36) + (markSeq++).toString(36);
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" role="img" aria-label="${brand.name}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
    </linearGradient></defs>
    <path d="${shape}" fill="url(#${id})"/>
    <text x="12" y="12" text-anchor="middle" dominant-baseline="central"
      font-family="system-ui, sans-serif" font-size="9.4" font-weight="700" fill="#fff"
      letter-spacing="-.4">${brand.mono}</text>
  </svg>`;
}

/* A connector tile. Deterministic hue from the id, so the catalog is stable
   and nobody has to ship eighty vendor logos (and their trademarks). */
export function connTile(conn) {
  const h = Math.abs(hash(conn.id)) % 360;
  const bg = `hsl(${h} 46% 38%)`;
  const letters = conn.name.replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/)
    .slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  return `<span class="conn-logo" style="background:${bg}">${letters}</span>`;
}

export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619 >>> 0;
  return h >>> 0;
}

export const INDUSTRY_ICON = {
  construction: 'plan', education: 'school', retail: 'store',
  industrial: 'factory', logistics: 'truck', tech: 'code', restaurants: 'dish',
};
