/* Formatting, and the one place a role's money setting is enforced.
   Every currency figure on every page goes through money(), so a view level
   that may not see money cannot see it by accident on a page nobody checked. */

export const state = { money: 'full' };

export function setMoneyLevel(level) { state.money = level || 'full'; }

const HIDDEN = '—';   /* em dash, the only one in the product: it means withheld */

export function money(v, opts = {}) {
  if (state.money === 'none' && !opts.force) return HIDDEN;
  return usd(v, opts);
}

export function usd(v, { dp = 0, sign = false, compact = true } = {}) {
  if (v === null || v === undefined || Number.isNaN(v)) return HIDDEN;
  const neg = v < 0;
  const a = Math.abs(v);
  let body;
  if (compact && a >= 1e9) body = (a / 1e9).toFixed(2) + 'B';
  else if (compact && a >= 1e6) body = (a / 1e6).toFixed(a >= 1e8 ? 0 : 1) + 'M';
  else if (compact && a >= 1e4) body = Math.round(a / 1e3) + 'K';
  else body = a.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const s = neg ? '-' : (sign ? '+' : '');
  return s + '$' + body;
}

export function exact(v, dp = 0) {
  if (state.money === 'none') return HIDDEN;
  if (v === null || v === undefined || Number.isNaN(v)) return HIDDEN;
  return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('en-US',
    { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function num(v, dp = 0) {
  if (v === null || v === undefined || Number.isNaN(v)) return HIDDEN;
  return v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function pct(v, dp = 1, sign = false) {
  if (v === null || v === undefined || Number.isNaN(v) || !Number.isFinite(v)) return HIDDEN;
  return (sign && v > 0 ? '+' : '') + v.toFixed(dp) + '%';
}

export function ratio(v, dp = 2) {
  if (!Number.isFinite(v)) return HIDDEN;
  return v.toFixed(dp) + '×';
}

/* a figure split so its unit can be set smaller than its digits */
export function split(text) {
  const m = String(text).match(/^([^A-Za-z%×]*)(.*)$/);
  if (!m) return { head: text, unit: '' };
  return { head: m[1], unit: m[2] };
}

export function figure(text) {
  const { head, unit } = split(text);
  return unit ? `${head}<span class="u">${unit}</span>` : head;
}

/* "Twelve months" only when there are twelve: a client with two months of
   ledger reads "Two months", never the demo's year. */
export function countWord(n, cap = false) {
  const w = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve'][n] || String(n);
  return cap ? w[0].toUpperCase() + w.slice(1) : w;
}

export function monthsWord(n, cap = false) {
  return `${countWord(n, cap)} month${n === 1 ? '' : 's'}`;
}

export function monthName(m, long = false) {
  if (!m) return HIDDEN;
  const [y, mm] = m.split('-').map(Number);
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const n = names[mm - 1] || '?';
  return long ? `${n} ${y}` : `${n.slice(0, 3)} ${String(y).slice(2)}`;
}

/* `unit` is '%' for a percent change, 'pp' for a change measured in PERCENTAGE
   POINTS, and anything else for money.

   ⛔ 'pp' used to be accepted and ignored: `ui.js` passed
   `k.deltaUnit === 'pp' ? '%' : '%'`, both branches identical, so gross
   margin's delta, which is already computed as a point difference, printed as
   "2.1%" and read as a 2.1 percent change. The arithmetic was right and the
   unit was a lie. A change of a percentage is in points or it is wrong. */
export function deltaTag(v, { invert = false, dp = 1, unit = '%' } = {}) {
  if (!Number.isFinite(v)) return '<span class="delta flat">—</span>';
  const good = invert ? v < 0 : v > 0;
  const cls = Math.abs(v) < 0.05 ? 'flat' : (good ? 'up' : 'down');
  const arrow = Math.abs(v) < 0.05 ? '' : (v > 0 ? '↑' : '↓');
  const body = unit === 'pp' ? Math.abs(v).toFixed(dp) + 'pt'
    : unit === '%' ? Math.abs(v).toFixed(dp) + '%'
      : usd(Math.abs(v));
  return `<span class="delta ${cls}">${arrow}${arrow ? ' ' : ''}${body}</span>`;
}

export function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const HIDDEN_MARK = HIDDEN;
