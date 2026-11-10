/* The HR mashup, second pass (Matt, 2026-11-05).

   Round one copied each platform's layout but drew it as Hub cards, and Matt's read was exact:
   "you can tell where buttons are, it seems like an actual interface and ours just seems like
   information on a screen". So every screen here is built from interface parts the big players
   use and ours lacked: a toolbar, solid and outlined buttons with icons, search fields, cards with
   a header bar, links that look like links, row menus, stars and checkboxes. Each follows its source:

     HR home        BambooHR: the brand band with you in it, Time Off with Request Time Off, the
                    What's happening feed with Go to Inbox and dismiss, Who's out, Celebrations
     Inbox          Workday My Tasks: nav, searchable list with stars, the Review pane with Details
                    to Review, Request Details, Process History, Approve / Send Back / Deny / Cancel
     Employee       Rippling: the person and their apps, plus the key-facts header and edit pencils
     Timecards      ADP Workforce Now: Team and Individual Timecard, the pay period bar, Timecard,
                    Totals, Schedule and Time Off Balances tabs, punches with exceptions
     Run payroll    Gusto: four steps, the deadline sentence, per-person hours, + Overtime, + Bonus,
                    Reimbursement, Pay by, Skip payroll, then Review and submit, then Confirmation
     Org chart      Workday's org chart drawn by d3-org-chart (MIT, the open-source engine behind
                    most Workday-style charts), with the Worker panel and Related Actions
     Talent review  Lattice and Workday calibration: the numbered nine-box, avatars dragged with
                    SortableJS (MIT), the reviewer's card beside it
     Onboarding     BambooHR's onboarding task lists (assigned to, due relative to the start date)
                    with Gusto's new-hire checklist as the preview
     Reports        BambooHR's report builder (Add / Remove Columns, Sort, Group, Filters) over a
                    report library, with a real CSV export

   No vendor's name, logo or wording ships: the layouts are borrowed, the brand is the client's.
   Every figure comes from the generated roster (build_hr in data/gen.py). The side by side is
   os-vault/wiki/research/hr-mashup-spec.md. The vendored libraries are in ../vendor/LICENSES.md. */
import * as F from '../fmt.js?v=02d4c24167';
import * as C from '../chart.js?v=02d4c24167';
import * as U from '../ui.js?v=02d4c24167';
import { esc, icon } from '../icons.js?v=02d4c24167';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const day = iso => { const [, m, d] = iso.split('-').map(Number); return `${MON[m - 1]} ${d}`; };
const dayY = iso => `${day(iso)}, ${iso.slice(0, 4)}`;
const mdy = iso => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;
const wdN = iso => new Date(`${iso}T12:00:00`).getDay();
const wday = iso => WD[wdN(iso)];
const span = (a, b) => (a === b ? day(a) : `${day(a)} to ${day(b)}`);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const hr = q => q.data.people.hr;
const ini = n => n.split(' ').map(w => w[0]).join('').slice(0, 2);
const nice = t => t.replace(/\d{4}-\d{2}-\d{2}/g, d => day(d));
const noMoney = () => F.state.money === 'none';
const cents = v => F.exact(v, 2);
const lastFirst = n => { const p = n.split(' '); return p.length > 1 ? `${p.slice(1).join(' ')}, ${p[0]}` : n; };

function seeded(id) {
  let x = 0;
  for (const ch of id) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}
const HUES = [205, 160, 270, 25, 330, 120, 45, 185];
const hueOf = n => HUES[Math.floor(seeded(`${n}:hue`)() * HUES.length)];
const face = (n, sz = 32, cls = '') => `<span class="face hx-face ${cls}" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz * 0.36)}px;--h:${hueOf(n)}">${esc(ini(n))}</span>`;

/* A small set of interface icons the shared icon file does not carry. */
const IP = {
  star: '<path d="M12 3.6l2.6 5.2 5.8.9-4.2 4.1 1 5.7L12 16.8l-5.2 2.7 1-5.7-4.2-4.1 5.8-.9z"/>',
  pencil: '<path d="M4 20h4L19.5 8.5l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  more: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  dots: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  filter: '<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>',
  sort: '<path d="M8 4v16M4.5 7.5L8 4l3.5 3.5M16 20V4M12.5 16.5L16 20l3.5-3.5"/>',
  group: '<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/>',
  cols: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15M15 4.5v15"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
  calc: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01"/>',
  pin: '<path d="M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"/>',
  mega: '<path d="M4 10v4h3l7 4V6L7 10z"/><path d="M17.5 9.5a3.5 3.5 0 0 1 0 5"/>',
  inbox: '<path d="M4 13l2.5-7h11L20 13v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
  plus: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
  grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
  goal: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2"/>',
  grad: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5V16c3.5 2.5 7.5 2.5 11 0v-4.5M21.5 9.5V15"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  idcard: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 10h4M14 13.5h4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chart: '<path d="M5 20V10M10 20V4M15 20v-7M20 20v-4"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  tree: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
  zin: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4M8.5 11h5M11 8.5v5"/>',
  zout: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4M8.5 11h5"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 3.5M12 17h.01"/>',
  laptop: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 19h18"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.7-4M4 5v4h4M4 13a8 8 0 0 0 14.7 4M20 19v-4h-4"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
};
const ic = (n, sz = 16, fill = false) => `<svg class="hx-i" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IP[n] || ''}</svg>`;
const btn = (label, { act = 'hr', arg = '', kind = '', i = '', dis = false, attrs = '' } = {}) =>
  `<button class="hx-btn ${kind}" ${act ? `data-act="${act}"` : ''} ${arg !== '' ? `data-arg="${esc(arg)}"` : ''} ${dis ? 'disabled' : ''} ${attrs}>${i ? ic(i, 15) : ''}<span>${label}</span></button>`;
const ibtn = (i, title, arg, { act = 'hr', on = false, fill = false } = {}) =>
  `<button class="hx-ib${on ? ' on' : ''}" title="${esc(title)}" aria-label="${esc(title)}" data-act="${act}" data-arg="${esc(arg)}">${ic(i, 17, fill)}</button>`;
const card = (title, i, body, { right = '', cls = '' } = {}) =>
  `<section class="hx-card panel ${cls}"><header class="hx-card-h">${i ? ic(i, 18) : ''}<h3>${title}</h3>${right ? `<div class="hx-card-r">${right}</div>` : ''}</header><div class="hx-card-b">${body}</div></section>`;

/* One person's pay, the same wherever it is read. It starts from the industry's typical seat and
   moves with seniority. A department's all-in cost carries taxes and benefits, so it is never a salary. */
function payOf(q, r) {
  const h = hr(q), p = q.data.people;
  const rnd = seeded(`${r.id}:pay`);
  const yrs = daysBetween(r.s, h.asOf) / 365;
  const lead = !r.mgr;
  const base = Math.round(p.costPerHead * (lead ? 1.35 : 0.62 + rnd() * 0.4) * (1 + Math.min(10, yrs) * 0.015) / 500) * 500;
  const hourly = r.ty !== 'Full time';
  return { base, hourly, rate: Math.round(base / 2080 * 0.9 * 100) / 100, yrs, lead };
}
const leadOf = (h, d) => h.roster.find(r => r.d === d && !r.mgr);
const hrLead = h => h.roster.find(r => /account|people|office|admin|human/i.test(r.d) && !r.mgr) || h.roster.find(r => !r.mgr) || h.roster[0];

/* ------------------------------------------------------------- view state */

/* What a viewer has picked, typed or moved on these screens. It lives in memory for the visit
   only: a what-if move or a calibration placement is a scenario, never a record, and a static demo
   has nowhere shared to keep one. Approvals use the shared task store instead, so they agree with
   the Time off page and HR home. */
const S = {
  menu: '', hdismiss: {},
  istar: {}, isort: 'new', inav: 'all', ikind: '', isel: '', iopen: { saved: true, filters: false }, iwide: false,
  ptab: 'overview', pedit: '', psent: {},
  tcview: 'team', tcwho: '', tctab: 'timecard', tcper: 'current', tcsel: {}, tcfix: {}, tcsaved: '', tcwk: 0, tcappr: {},
  pstep: 1, hours: {}, extra: {}, open: {}, skip: {}, ot: {}, plimit: 25, receipt: false,
  osel: '', ofind: '', oplan: false, omoving: '', omoves: {}, osent: false, oview: 'chart', oactions: false,
  tdept: '', tsel: '', tplace: {}, tsubmitted: {},
  onsel: '', onview: 'tasks', ontab: 'hires', ondone: {}, onremind: {}, onadd: -1, oncustom: {}, tplExtra: [],
  rrep: '', rpop: '', rcat: 'Job', rname: '', rf: [], rsort: '', rdir: 1, rg: '', rfd: {}, rft: {}, rview: 'table',
  rall: false, rrename: false, rcustom: [], rlib: 'all', rstar: {}, rnote: '', rhired: false,
};

let RENDER = () => {};
let LAST_REPORT = null;
const goTo = page => { if (location.hash !== `#/${page}`) location.hash = `#/${page}`; };

export function hrAct(arg) {
  const at = arg.indexOf(':');
  const k = at < 0 ? arg : arg.slice(0, at), v = at < 0 ? '' : arg.slice(at + 1);
  const tog = (o, key) => { if (o[key]) delete o[key]; else o[key] = true; };
  switch (k) {
    case 'menu': S.menu = S.menu === v ? '' : v; return;
    case 'hdismiss': S.hdismiss[v] = true; break;
    case 'istar': tog(S.istar, v); break;
    case 'isort': S.isort = S.isort === 'new' ? 'old' : 'new'; break;
    case 'inav': S.inav = v; S.ikind = ''; S.isel = ''; break;
    case 'ikind': S.ikind = S.ikind === v ? '' : v; S.inav = 'all'; S.isel = ''; break;
    case 'iopen': S.iopen[v] = !S.iopen[v]; break;
    case 'isel': S.isel = v; break;
    case 'iwide': S.iwide = !S.iwide; break;
    case 'ptab': S.ptab = v; S.pedit = ''; break;
    case 'pedit': S.pedit = S.pedit === v ? '' : v; break;
    case 'psend': S.psent[v] = true; S.pedit = ''; break;
    case 'tcview': S.tcview = v; break;
    case 'tcwho': S.tcwho = v; S.tcview = 'one'; goTo('hr-attendance'); break;
    case 'tctab': S.tctab = v; break;
    case 'tcper': S.tcper = S.tcper === 'current' ? 'previous' : 'current'; S.tcsel = {}; break;
    case 'tcsel': tog(S.tcsel, v); break;
    case 'tcselall': S.tcsel = v ? Object.fromEntries(v.split(',').filter(Boolean).map(id => [id, true])) : {}; break;
    case 'tcbulk': v.split(',').filter(Boolean).forEach(id => { S.tcappr[id] = true; }); S.tcsel = {}; break;
    case 'tcfix': S.tcfix[v] = true; break;
    case 'tcsave': S.tcsaved = v; break;
    case 'tcwk': S.tcwk = Number(v); break;
    case 'pstep': S.pstep = Number(v); break;
    case 'popen': S.open[v] = true; break;
    case 'pskip': tog(S.skip, v); break;
    case 'pot': S.ot[v] = true; break;
    case 'pmore': S.plimit += 50; break;
    case 'preceipt': S.receipt = !S.receipt; break;
    case 'preset': S.pstep = 1; S.hours = {}; S.extra = {}; S.open = {}; S.skip = {}; S.ot = {}; S.receipt = false; break;
    case 'osel': S.osel = S.osel === v ? '' : v; S.oactions = false; break;
    case 'goorg': S.osel = v; S.oview = 'chart'; ORG.cmd = `show:${v}`; goTo('hr-org'); break;
    case 'oactions': S.oactions = !S.oactions; break;
    case 'oplan': S.oplan = !S.oplan; S.omoving = ''; break;
    case 'omove': S.oplan = true; S.omoving = v; S.oactions = false; break;
    case 'oto': if (S.omoving) { S.omoves[S.omoving] = v; S.omoving = ''; S.osent = false; } break;
    case 'oundo': delete S.omoves[v]; break;
    case 'oreset': S.omoves = {}; S.omoving = ''; S.osent = false; break;
    case 'osend': S.osent = true; break;
    case 'oview': S.oview = v; break;
    case 'ochart': ORG.cmd = v; return;
    case 'tdept': S.tdept = v; S.tsel = ''; break;
    case 'tsel': S.tsel = S.tsel === v ? '' : v; break;
    case 'tbox': if (S.tsel) S.tplace[S.tsel] = Number(v); break;
    case 'treset': S.tplace = {}; break;
    case 'tsubmit': S.tsubmitted[v] = true; break;
    case 'onsel': S.onsel = v; S.onadd = -1; break;
    case 'onview': S.onview = v; break;
    case 'ontab': S.ontab = v; break;
    case 'ontog': tog(S.ondone, v); break;
    case 'onremind': S.onremind[v] = true; break;
    case 'onadd': S.onadd = Number(v); break;
    case 'tplnew': S.tplExtra.push(['Miscellaneous', 'Untitled task', 'HR', 3]); break;
    case 'rrep': openReport(v); break;
    case 'rlib': S.rlib = v; break;
    case 'rstar': tog(S.rstar, v); break;
    case 'rpop': S.rpop = S.rpop === v ? '' : v; break;
    case 'rcat': S.rcat = v; break;
    case 'rf': S.rf = S.rf.includes(v) ? S.rf.filter(x => x !== v) : [...S.rf, v]; break;
    case 'rsort': if (S.rsort === v) S.rdir = -S.rdir; else { S.rsort = v; S.rdir = 1; } break;
    case 'rnosort': S.rsort = ''; break;
    case 'rg': S.rg = v; break;
    case 'rfd': tog(S.rfd, v); break;
    case 'rft': tog(S.rft, v); break;
    case 'rview': S.rview = v; break;
    case 'rall': S.rall = !S.rall; break;
    case 'rrename': S.rrename = !S.rrename; break;
    case 'rsave': {
      const id = `custom-${S.rcustom.length + 1}`;
      S.rcustom.push({ id, name: S.rname || 'Untitled report', cat: 'Custom', cols: [...S.rf], g: S.rg, sort: S.rsort, dir: S.rdir });
      S.rnote = `Saved as "${S.rname || 'Untitled report'}". It is under Custom reports for this visit.`;
      break;
    }
    case 'rcsv': downloadCsv(); return;
    default: break;
  }
  S.menu = '';
}

/* Delegated once on the page host, which survives every render; then mounted again after each
   render for the parts that keep state of their own (the org chart, the drag lists). */
export function hrWire(host, render) {
  RENDER = render;
  if (!host.dataset.hrWired) {
    host.dataset.hrWired = '1';
    host.addEventListener('change', ev => {
      const t = ev.target;
      if (t.dataset.pay) {
        const [id, f] = t.dataset.pay.split('|');
        const v = Math.max(0, Math.min(f === 'reg' || f === 'ot' ? 120 : 1e6, Number(t.value) || 0));
        if (f === 'reg' || f === 'ot') S.hours[`${id}|${f}`] = v; else S.extra[`${id}|${f}`] = v;
        render();
      } else if (t.id === 'oc-find') {
        S.ofind = t.value.trim(); render();
      } else if (t.id === 'nb-move' && S.tsel) {
        S.tplace[S.tsel] = Number(t.value); render();
      } else if (t.id === 'ob-new' && t.value.trim()) {
        const key = `${S.onsel}|${S.onadd}`;
        (S.oncustom[key] = S.oncustom[key] || []).push(t.value.trim());
        S.onadd = -1; render();
      } else if (t.id === 'rb-name') {
        S.rname = t.value.trim() || S.rname; S.rrename = false; render();
      }
    });
    host.addEventListener('input', ev => {
      const t = ev.target;
      if (t.id === 'wd-comment') { const b = host.querySelector('[data-needs-reason]'); if (b) b.disabled = !t.value.trim(); }
      if (t.dataset.filter) {
        const needle = t.value.trim().toLowerCase();
        host.querySelectorAll(t.dataset.filter).forEach(el => { el.hidden = !!needle && !(el.dataset.text || el.textContent).toLowerCase().includes(needle); });
      }
    });
    host.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && ['oc-find', 'ob-new', 'rb-name'].includes(ev.target.id)) ev.target.blur();
      if (ev.key === 'Escape' && (S.menu || S.rpop)) { S.menu = ''; S.rpop = ''; render(); }
    });
    document.addEventListener('click', ev => {
      if (!S.menu) return;
      if (ev.target.closest('[data-arg^="menu:"]')) return;
      const inside = ev.target.closest('.hx-menu');
      S.menu = '';
      if (!inside) render();
    }, true);
  }
  mountOrg(host);
  mountSortables(host);
}

function source(s) {
  const on = s.connectedIn('people');
  return `<p class="mash-src">${on.length
    ? `Employee records arrive from ${esc(on.map(c => c.name).join(', '))}, and decisions made here go back to it, so the payroll system stays the record.`
    : 'Employee records arrive from the payroll or HR system. Until one is connected these are the sample set.'}</p>`;
}
/* A dropdown menu. An item is [label, act, arg, icon]; act 'click' opens a record instead. */
const menu = (key, items) => (S.menu === key ? `<div class="hx-menu" role="menu">${items.map(([label, act, arg, i]) =>
  `<button role="menuitem" ${act === 'click' ? `data-click="${esc(arg)}"` : `data-act="${act}" data-arg="${esc(arg)}"`}>${i ? ic(i, 15) : ''}<span>${label}</span></button>`).join('')}</div>` : '');

/* ------------------------------------------------------- HR home (BambooHR) */

function celebrations(h) {
  const out = [];
  const now = h.asOf, y = Number(now.slice(0, 4));
  for (const r of h.roster) {
    const rnd = seeded(`${r.id}:bday`);
    const m = 1 + Math.floor(rnd() * 12), d = 1 + Math.floor(rnd() * 28);
    for (const yy of [y, y + 1]) {
      const b = `${yy}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const gap = daysBetween(now, b);
      if (gap >= 0 && gap <= 21) out.push({ r, when: b, gap, what: 'Birthday' });
      const a = `${yy}${r.s.slice(4)}`, ga = daysBetween(now, a), n = yy - Number(r.s.slice(0, 4));
      if (ga >= 0 && ga <= 21 && n >= 1) out.push({ r, when: a, gap: ga, what: `${n} year anniversary` });
    }
  }
  return out.sort((a, b) => a.gap - b.gap);
}

function home(ctx) {
  const { q, s } = ctx;
  const h = hr(q), marks = ctx.tasks || {};
  const company = q.data.meta.company || 'the company';
  const me = hrLead(h);
  const waiting = h.inbox.filter(i => !marks[inboxKey(i)]);
  const in7 = addDays(h.asOf, 7);
  const outs = h.timeoff.out.filter(o => o.to >= h.asOf && o.from <= in7);
  const today = outs.filter(o => o.from <= h.asOf);
  const tomorrow = outs.filter(o => o.from === addDays(h.asOf, 1));
  const later = outs.filter(o => o.from > addDays(h.asOf, 1));
  const cel = celebrations(h).slice(0, 6);
  const byN = n => h.roster.find(r => r.n === n);
  const certs = h.compliance.expiring.filter(c => daysBetween(h.asOf, c.due) <= 14);
  const goals = h.reviews.goals || [0, 0, 0];
  const courses = h.compliance.courses || [];
  const ben = h.benefits || {};

  const due = (d, done) => {
    const g = daysBetween(h.asOf, d);
    return g < 0 && !done ? `<span class="bh-late">Due ${mdy(d)} (${-g} day${g === -1 ? '' : 's'} ago). Past due</span>` : `Due ${mdy(d)} (${g === 0 ? 'today' : `${g} day${g === 1 ? '' : 's'}`})`;
  };
  const feed = [
    ...waiting.map(i => ({ id: i.id, go: 'hr-inbox', tile: face(i.who, 40), t: i.kind === 'Time off' ? `Time off request from ${i.who} is ready for approval.`
      : i.kind === 'Timecard' ? `Hours for ${i.who} are ready for approval.` : `${i.kind} for ${i.who} needs your approval.`,
      sub: due(addDays(h.asOf, 2 - (i.age || 0)), false), act: btn('Go to Inbox', { act: 'go', arg: 'hr-inbox', kind: 'sm' }) })),
    ...h.hiring.onboarding.slice(0, 3).map(n => ({ id: `ob-${n.n}`, go: 'hr-onboarding', link: true, tile: `<span class="bh-tile">${ic('idcard', 21)}</span>`,
      t: `Confirm the W-4 is signed for ${n.n}`, sub: due(addDays(n.s, -1), n.done >= 3), act: '' })),
    ...certs.slice(0, 3).map(c => ({ id: `ce-${c.n}-${c.c}`, go: 'hr-compliance', link: true, tile: `<span class="bh-tile">${ic('doc', 21)}</span>`,
      t: `${c.c} for ${c.n} ${daysBetween(h.asOf, c.due) < 0 ? 'has expired' : 'is expiring'}`, sub: due(c.due, false), act: '' })),
    { id: 'pulse', go: 'hr-reviews', tile: `<span class="bh-tile heart">${ic('heart', 21)}</span>`, t: 'We want your feedback! Take the quarterly pulse survey.', sub: `It's anonymous. ${h.pulse.responded}% have answered so far.`, act: '' },
    ...(ben.window ? [{ id: 'oe', go: 'hr-reviews', tile: `<span class="bh-tile">${ic('heart', 21)}</span>`, t: `Open enrollment runs ${span(ben.window[0], ben.window[1])}.`, sub: `${F.num(ben.elected || 0)} of ${F.num(ben.eligible || 0)} eligible people have made their elections.`, act: '' }] : []),
  ].filter(f => !S.hdismiss[f.id]);

  const who = o => { const r = byN(o.n); return `<button class="bh-who" ${r ? `data-click="person:${esc(r.id)}"` : ''}>${face(o.n, 34)}<span><b>${esc(o.n)}</b><i>${esc(o.k)} · ${span(o.from, o.to)}</i></span></button>`; };
  const grp = (t, l) => `<div class="bh-grp"><h5>${t}</h5>${l.length ? l.map(who).join('') : '<p class="bh-none">Nobody</p>'}</div>`;

  return `<div class="bh">
    <section class="bh-band"><div class="bh-me">${face(me.n, 66, 'ring')}<div><h1>${esc(me.n)}</h1><p>${esc(me.t)}</p></div></div>
      <div class="bh-band-r hx-pop">${btn('New…', { arg: 'menu:bhnew', kind: 'onband', i: 'plus' })}${menu('bhnew', [
        ['Time off request', 'go', 'hr-time', 'clock'], ['New hire', 'go', 'hr-onboarding', 'idcard'], ['Report', 'go', 'hr-reports', 'chart'], ['Payroll run', 'go', 'hr-payroll', 'doc']])}</div></section>
    <div class="bh-grid">
      <div class="bh-col">
        ${card('Time Off', 'clock', `<div class="bh-bal">
            <div><span>Vacation</span><b>${ic('cal', 22)}${Math.round((me.pto || 40) * 0.7)}</b><em>Hours available</em></div>
            <div><span>Sick</span><b>${ic('heart', 22)}${Math.round((me.pto || 40) * 0.3)}</b><em>Hours available</em></div></div>
          <div class="bh-req">${btn('Request Time Off', { act: 'go', arg: 'hr-time', kind: 'pri wide', i: 'clock' })}${ibtn('calc', 'Estimate a future balance', 'hr-time', { act: 'go' })}</div>`)}
        <section class="hx-card panel bh-links">${[
          ['goal', 'Goals', `${F.num(goals[0])} goals, ${F.num(goals[2])} at risk`, 'hr-reviews'],
          ['grad', 'Training', `${courses.length} active trainings, ${F.num((h.compliance.gaps || []).reduce((t, g) => t + (g.n || 0), 0))} past due or missing`, 'hr-compliance'],
          ['heart', 'Benefits', `${F.num(ben.elected || 0)} people enrolled for next year`, 'hr-reviews'],
        ].map(([i, t, sub, go]) => `<button class="bh-link" data-act="go" data-arg="${go}"><span class="bh-round">${ic(i, 20)}</span><span><b>${t}</b><i>${esc(sub)}</i></span>${ic('right', 16)}</button>`).join('')}</section>
        ${card("Who's Out", 'cal', grp('Today', today) + grp('Tomorrow', tomorrow) + grp('Next 7 days', later), { right: '<button class="hx-a" data-act="go" data-arg="hr-time">Calendar</button>' })}
        ${card('Celebrations', 'gift', cel.map(c => `<button class="bh-who" data-click="person:${esc(c.r.id)}">${face(c.r.n, 34)}<span><b>${esc(c.r.n)}</b><i>${esc(c.what)} · ${c.gap === 0 ? 'Today' : `${wday(c.when)}, ${day(c.when)}`}</i></span></button>`).join('') || '<p class="bh-none">Nothing in the next three weeks.</p>')}
      </div>
      <div class="bh-col">
        ${card(`What's happening at ${esc(company)}`, 'mega', feed.map(f => `<div class="bh-item">${f.tile}<div class="bh-text">
            <button class="${f.link ? 'hx-a' : 'bh-t'}" data-act="go" data-arg="${f.go}">${esc(f.t)}</button><p>${f.sub}</p></div>
            <div class="bh-act">${f.act}${ibtn('x', 'Dismiss', `hdismiss:${f.id}`)}</div></div>`).join('') || '<p class="bh-none">You are all caught up.</p>',
          { right: `<button class="hx-a" data-act="go" data-arg="hr-inbox">Inbox (${waiting.length})</button>`, cls: 'bh-feed' })}
        ${card('Welcome to the team', 'idcard', `<div class="bh-new">${h.hiring.onboarding.map(n => { const r = byN(n.n); return `<button ${r ? `data-click="person:${esc(r.id)}"` : ''}>${face(n.n, 54)}<b>${esc(n.n)}</b><span>${esc(n.t)}</span><i>Starts ${wday(n.s)}, ${day(n.s)}</i></button>`; }).join('') || '<p class="bh-none">No one starting this month.</p>'}</div>`)}
      </div>
    </div></div>` + source(s);
}

/* ---------------------------------------------------- Inbox (Workday My Tasks) */

function inboxKey(i) { return i.kind === 'Time off' ? `${i.id.slice(4)}:pto` : `${i.id}:inbox`; }
const TITLE = { 'Time off': 'Absence Request', 'Pay change': 'Request Compensation Change', 'Job change': 'Change Job', Timecard: 'Time Entry' };

function inbox(ctx) {
  const { q, s } = ctx;
  const h = hr(q), marks = ctx.tasks || {};
  const st = i => marks[inboxKey(i)];
  const word = { done: ['Approved', 'good', 'Successfully Completed'], snooze: ['Denied', 'bad', 'Denied'], back: ['Sent back', 'warn', 'Sent Back'] };
  const kinds = [...new Set(h.inbox.map(i => i.kind))];
  const created = i => addDays(h.asOf, -(i.age || 0));
  const dueOf = i => addDays(created(i), 2);
  const effOf = i => { const m = (i.what.match(/\d{4}-\d{2}-\d{2}/) || [])[0]; return m || addDays(h.asOf, 14 - (i.age || 0)); };
  let pool = h.inbox.filter(i => (S.inav === 'archive' ? st(i) : S.inav === 'starred' ? S.istar[i.id] : S.inav === 'due' ? !st(i) && daysBetween(h.asOf, dueOf(i)) <= 7 : !st(i)));
  if (S.ikind) pool = pool.filter(i => i.kind === S.ikind);
  pool = pool.slice().sort((a, b) => (S.isort === 'new' ? (a.age || 0) - (b.age || 0) : (b.age || 0) - (a.age || 0)));
  const sel = pool.find(i => i.id === S.isel) || pool[0];
  const waiting = h.inbox.filter(i => !st(i)).length;
  const navItem = (key, label, n, i) => `<button class="wd-nav-i${S.inav === key && !S.ikind ? ' on' : ''}" data-act="hr" data-arg="inav:${key}">${ic(i, 19)}<span>${label}</span>${n !== '' ? `<em>${n}</em>` : ''}</button>`;
  const listTitle = S.ikind ? TITLE[S.ikind] || S.ikind : { all: 'All Items', archive: 'Archive', starred: 'Starred', due: 'Due This Week' }[S.inav];

  const list = pool.map(i => `<div class="wd-row${sel && i.id === sel.id ? ' on' : ''}" data-text="${esc(`${TITLE[i.kind]} ${i.who} ${i.what}`)}">
      <button class="wd-row-b" data-act="hr" data-arg="isel:${esc(i.id)}"><b>${esc(TITLE[i.kind] || i.kind)}: ${esc(i.who)}</b>
        <span>${st(i) ? `<span class="tag ${word[st(i)][1]}">${word[st(i)][0]}</span>` : esc(nice(i.what))}</span>
        <i>Due: ${mdy(dueOf(i))}${i.kind !== 'Timecard' ? ` | Effective: ${mdy(effOf(i))}` : ''}</i></button>
      <span class="wd-date">${mdy(created(i))}</span>${ibtn('star', S.istar[i.id] ? 'Unstar' : 'Star', `istar:${i.id}`, { on: S.istar[i.id], fill: S.istar[i.id] })}</div>`).join('')
    || `<p class="wd-empty">${S.inav === 'archive' ? 'Nothing decided yet.' : 'Nothing here. Every request is decided.'}</p>`;

  let detail = '<div class="wd-detail"><p class="wd-empty">Pick an item to review it.</p></div>';
  if (sel) {
    const [k, tag] = inboxKey(sel).split(':');
    const decision = st(sel);
    const now = sel.steps.findIndex(x => x[2] === null);
    const r = h.roster.find(x => x.id === sel.pid);
    let details = '';
    if (sel.kind === 'Time off') {
      const p = h.timeoff.pending.find(x => `pto-${x.id}-${x.from}` === sel.id) || { k: 'Vacation', from: effOf(sel), to: effOf(sel) };
      const dates = []; for (let d = p.from; d <= p.to; d = addDays(d, 1)) if (wdN(d) % 6) dates.push(d);
      details = `<dl class="wd-dl"><div><dt>First Day of Time Off</dt><dd>${mdy(p.from)}</dd></div><div><dt>Last Day of Time Off</dt><dd>${mdy(p.to)}</dd></div>
        <div><dt>Total</dt><dd>${dates.length * 8} hours - ${esc(p.k)}</dd></div><div><dt>Balance After</dt><dd>${Math.max(0, (r ? r.pto : 40) - dates.length * 8)} hours</dd></div></dl>
        <div class="wd-tbl"><div class="wd-tbl-h"><b>Request Details</b><span>${dates.length} items</span></div><div class="scroll"><table class="t wd-t"><thead><tr><th>Date</th><th>Day of the Week</th><th>Type</th><th class="n">Requested</th><th>Unit of Time</th></tr></thead>
        <tbody>${dates.map(d => `<tr><td>${mdy(d)}</td><td>${WDL[wdN(d)]}</td><td>${esc(p.k)}</td><td class="n">8</td><td>Hours</td></tr>`).join('')}</tbody></table></div></div>`;
    } else if (sel.kind === 'Pay change' && r) {
      const pay = payOf(q, r), pct = Number((sel.what.match(/([\d.]+)%/) || [])[1] || 3);
      const cur = pay.hourly ? pay.rate : pay.base, nxt = cur * (1 + pct / 100);
      const show = v => (pay.hourly ? `${cents(v)} / hour` : `${F.exact(v)} / year`);
      details = `<dl class="wd-dl"><div><dt>Reason</dt><dd>${esc(sel.what.replace(/ of .*/, ''))}</dd></div><div><dt>Effective Date</dt><dd>${mdy(effOf(sel))}</dd></div>
        <div><dt>Current Pay</dt><dd>${show(cur)}</dd></div><div><dt>Proposed Pay</dt><dd>${show(nxt)}</dd></div><div><dt>Change</dt><dd>${F.pct(pct, 1)}</dd></div><div><dt>Position</dt><dd>${esc(r.t)}, ${esc(r.d)}</dd></div></dl>`;
    } else if (sel.kind === 'Job change' && r) {
      details = `<dl class="wd-dl"><div><dt>Reason</dt><dd>Promotion</dd></div><div><dt>Effective Date</dt><dd>${mdy(effOf(sel))}</dd></div>
        <div><dt>Current Business Title</dt><dd>${esc(r.t)}</dd></div><div><dt>Proposed Business Title</dt><dd>${esc((sel.what.match(/to (.*?),/) || [])[1] || `Senior ${r.t}`)}</dd></div>
        <div><dt>Supervisory Organization</dt><dd>${esc(r.d)}</dd></div><div><dt>Manager</dt><dd>${esc(r.mgr || 'Leadership')}</dd></div></dl>`;
    } else {
      details = `<dl class="wd-dl"><div><dt>Time Period</dt><dd>${mdy(h.attendance.from)} - ${mdy(h.attendance.to)}</dd></div><div><dt>Exceptions</dt><dd>${esc(sel.what)}</dd></div></dl>
        <p class="wd-note">Exceptions are cleared on the timecard before the hours can be approved.</p>`;
    }
    const hist = sel.steps.map(([step, who, ago], n) => {
      const done = ago !== null;
      const status = done ? 'Successfully Completed' : decision && n === now ? word[decision][2] : n === now ? 'Awaiting Action' : 'Not Started';
      return `<tr><td>${esc(TITLE[sel.kind])}</td><td>${esc(step)}</td><td>${esc(who)}</td><td><span class="tag ${done || decision === 'done' ? 'good' : decision ? word[decision][1] : n === now ? 'warn' : ''}">${status}</span></td>
        <td>${done ? mdy(addDays(h.asOf, -ago)) : decision && n === now ? mdy(h.asOf) : ''}</td></tr>`;
    }).join('');
    detail = `<div class="wd-detail">
      <header class="wd-dh"><h2><span>${decision ? word[decision][0] : sel.kind === 'Timecard' ? 'Review' : 'Approve'}</span> ${esc(TITLE[sel.kind])}: ${esc(sel.who)}</h2>
        <div class="wd-tools">${ibtn('star', 'Star', `istar:${sel.id}`, { on: S.istar[sel.id], fill: S.istar[sel.id] })}${ibtn('expand', S.iwide ? 'Show the list' : 'Hide the list', 'iwide')}</div></header>
      <p class="wd-meta">Created: ${mdy(created(sel))} | Due: ${mdy(dueOf(sel))}${sel.kind !== 'Timecard' ? ` | Effective: ${mdy(effOf(sel))}` : ''}</p>
      <dl class="wd-dl wd-top"><div><dt>For</dt><dd><button class="hx-a" data-click="person:${esc(sel.pid)}">${esc(sel.who)}</button></dd></div>
        <div><dt>Overall Process</dt><dd>${esc(TITLE[sel.kind])}: ${esc(sel.who)}</dd></div>
        <div><dt>Overall Status</dt><dd>${decision ? word[decision][0] : 'In Progress'}</dd></div><div><dt>Due Date</dt><dd>${mdy(dueOf(sel))}</dd></div></dl>
      <h3 class="wd-h3">Details to Review</h3>${details}
      ${decision ? '' : '<h3 class="wd-h3">Comment</h3><textarea id="wd-comment" class="hx-field" rows="2" placeholder="Add a comment. A reason is required to send this back."></textarea>'}
      <h3 class="wd-h3">Process History</h3><div class="scroll"><table class="t wd-t"><thead><tr><th>Process</th><th>Step</th><th>Person</th><th>Status</th><th>Completed On</th></tr></thead><tbody>${hist}</tbody></table></div>
      <footer class="wd-foot">${decision ? btn('Undo', { act: 'task', arg: `${decision}:${k}:${tag}` })
        : sel.kind === 'Timecard' ? btn('Open the timecard', { arg: `tcwho:${sel.pid}`, kind: 'pri' }) + btn('Cancel', { arg: 'isel:' })
          : `${btn('Approve', { act: 'task', arg: `done:${k}:${tag}`, kind: 'pri' })}${btn('Send Back', { act: 'task', arg: `back:${k}:${tag}`, dis: true, attrs: 'data-needs-reason' })}${btn('Deny', { act: 'task', arg: `snooze:${k}:${tag}` })}${btn('Cancel', { arg: 'isel:' })}`}</footer>
    </div>`;
  }

  return `<div class="wd panel${S.iwide ? ' wide' : ''}">
    <nav class="wd-nav"><div class="wd-nav-h">${ic('inbox', 26)}<h2>My Tasks</h2></div>
      ${navItem('all', 'All Items', waiting, 'list')}
      <button class="wd-nav-i" data-act="hr" data-arg="iopen:saved">${ic('clock', 19)}<span>Saved Searches</span>${ic(S.iopen.saved ? 'up' : 'down', 16)}</button>
      ${S.iopen.saved ? `<div class="wd-sub">${kinds.map(kd => `<button class="${S.ikind === kd ? 'on' : ''}" data-act="hr" data-arg="ikind:${esc(kd)}">${esc(TITLE[kd])}<em>${h.inbox.filter(i => i.kind === kd && !st(i)).length}</em></button>`).join('')}</div>` : ''}
      <button class="wd-nav-i" data-act="hr" data-arg="iopen:filters">${ic('filter', 19)}<span>Filters</span>${ic(S.iopen.filters ? 'up' : 'down', 16)}</button>
      ${S.iopen.filters ? `<div class="wd-sub"><button class="${S.inav === 'due' ? 'on' : ''}" data-act="hr" data-arg="inav:due">Due this week</button><button class="${S.inav === 'starred' ? 'on' : ''}" data-act="hr" data-arg="inav:starred">Starred<em>${Object.keys(S.istar).length}</em></button></div>` : ''}
      ${navItem('archive', 'Archive', h.inbox.length - waiting, 'doc')}
    </nav>
    <aside class="wd-list"><div class="wd-list-h"><h2>${esc(listTitle)}</h2><span>${pool.length} items</span></div>
      <div class="wd-search"><label class="hx-search">${ic('search', 16)}<input id="wd-q" type="search" placeholder="Search: ${esc(listTitle)}" data-filter=".wd-row" aria-label="Search the list"></label>
        ${ibtn('sort', S.isort === 'new' ? 'Newest first' : 'Oldest first', 'isort')}</div>
      <div class="wd-items">${list}</div></aside>${detail}</div>` + source(s);
}

/* ------------------------------------------------- Employee record (Rippling) */

const APPS = [['overview', 'Overview', 'idcard'], ['employment', 'Employment', 'doc'], ['pay', 'Compensation', 'chart'], ['time', 'Time off', 'cal'],
  ['benefits', 'Benefits', 'heart'], ['docs', 'Documents', 'doc'], ['devices', 'Devices & apps', 'laptop'], ['team', 'Team', 'tree']];

function person(ctx) {
  const { q, s } = ctx;
  const h = hr(q);
  const r = h.roster.find(x => x.id === ctx.arg) || h.roster[0];
  const rnd = seeded(r.id);
  const pay = payOf(q, r);
  const company = q.data.meta.company || 'Company';
  const domain = company.toLowerCase().replace(/[^a-z]/g, '') || 'company';
  const reports = h.roster.filter(x => x.mgr === r.n);
  const pend = h.timeoff.pending.filter(x => x.id === r.id);
  const outs = h.timeoff.out.filter(x => x.n === r.n);
  const certs = h.compliance.expiring.filter(x => x.n === r.n);
  const onb = h.hiring.onboarding.find(x => x.n === r.n);
  const tab = APPS.some(a => a[0] === S.ptab) ? S.ptab : 'overview';
  const months = Math.max(1, Math.round(pay.yrs * 12));
  const tenureTxt = pay.yrs < 1 ? `${months} month${months === 1 ? '' : 's'}` : `${pay.yrs.toFixed(1)} years`;
  const email = `${r.n.toLowerCase().replace(/[^a-z ]/g, '').replace(' ', '.')}@${domain}.com`;
  const mgr = h.roster.find(x => x.n === r.mgr);
  /* A field card in Rippling's shape: the title, an edit pencil, label over value. Editing turns the
     values into fields, and the change goes to the Inbox for approval rather than straight in. */
  const fields = (title, rows) => {
    const key = `${r.id}|${title}`, ed = S.pedit === key;
    return `<section class="rp-sec"><header><h3>${esc(title)}</h3>${S.psent[key] ? '<span class="tag warn">Change sent for approval</span>' : ''}
      ${ed ? '' : ibtn('pencil', `Edit ${title}`, `pedit:${key}`)}</header><dl>${rows.map(([k, v, fixed]) =>
      `<div><dt>${esc(k)}</dt><dd>${ed && !fixed && !String(v).startsWith('<') ? `<input class="hx-field" value="${esc(String(v))}" aria-label="${esc(k)}">` : String(v).startsWith('<') ? v : esc(v)}</dd></div>`).join('')}</dl>
      ${ed ? `<div class="rp-edit">${btn('Send for approval', { arg: `psend:${key}`, kind: 'pri sm' })}${btn('Cancel', { arg: `pedit:${key}`, kind: 'sm' })}<span class="sub">The change goes to the Inbox for the manager to approve.</span></div>` : ''}</section>`;
  };

  const hist = [];
  let cur = pay.base;
  const startY = Number(r.s.slice(0, 4)), nowY = Number(h.asOf.slice(0, 4));
  const hr2 = seeded(`${r.id}:hist`);
  for (let y = nowY; y > startY; y--) {
    if (daysBetween(r.s, `${y}-03-01`) < 180) continue;
    const promo = hr2() < 0.12;
    const up = promo ? 0.08 + hr2() * 0.06 : 0.025 + hr2() * 0.025;
    hist.push({ date: `${y}-${String(1 + Math.floor(hr2() * 3)).padStart(2, '0')}-01`, what: promo ? 'Promotion' : 'Merit increase', pay: cur, pct: up * 100 });
    cur = Math.round(cur / (1 + up) / 100) * 100;
  }
  hist.push({ date: r.s, what: 'Hire', pay: cur, pct: null });
  const payShown = v => (pay.hourly ? `${cents(v / 2080 * 0.9)} / hr` : `${F.exact(v)} / yr`);

  const body = {
    overview: fields('Basic information', [['Legal name', r.n], ['Preferred name', r.n.split(' ')[0]], ['Work email', email, true], ['Employee ID', r.id, true]]) +
      fields('Role', [['Title', r.t], ['Department', r.d], ['Manager', mgr ? `<button class="hx-a" data-click="person:${esc(mgr.id)}">${esc(mgr.n)}</button>` : 'Leadership'],
        ['Work location', r.loc], ['Start date', dayY(r.s), true], ['Tenure', tenureTxt, true]]) +
      fields('Emergency contact', [['Status', rnd() < 0.05 ? '<span class="tag bad">Missing</span>' : 'On file']]),
    employment: fields('Employment', [['Employment type', r.ty], ['FLSA status', pay.hourly ? 'Non-exempt' : 'Exempt'], ['Pay schedule', 'Every other week'],
      ['Start date', dayY(r.s), true], ['Probation', pay.yrs < 0.25 ? 'In probation' : 'Complete', true]]) +
      `<section class="rp-sec"><header><h3>Job history</h3></header><div class="scroll"><table class="t"><thead><tr><th>Effective</th><th>Change</th><th>Title</th></tr></thead><tbody>${hist.map(x =>
        `<tr><td>${dayY(x.date)}</td><td>${x.what === 'Promotion' ? '<span class="tag good">Promotion</span>' : esc(x.what)}</td><td>${esc(r.t)}</td></tr>`).join('')}</tbody></table></div></section>`,
    pay: fields('Current compensation', [[pay.hourly ? 'Hourly rate' : 'Annual salary', pay.hourly ? cents(pay.rate) : F.exact(pay.base)],
      ['Pay frequency', 'Every other week'], ['Last change', hist.length > 1 ? dayY(hist[0].date) : 'At hire', true]]) +
      `<section class="rp-sec"><header><h3>Compensation history</h3></header><div class="scroll"><table class="t"><thead><tr><th>Effective</th><th>Reason</th><th class="n">Pay</th><th class="n">Change</th></tr></thead><tbody>${hist.map(x =>
        `<tr><td>${dayY(x.date)}</td><td>${esc(x.what)}</td><td class="n">${payShown(x.pay)}</td><td class="n">${x.pct ? F.pct(x.pct, 1) : '—'}</td></tr>`).join('')}</tbody></table></div></section>`,
    time: fields('Balances', [['Vacation', r.pto ? `${Math.round(r.pto * 0.7)} hours` : 'Not accruing', true], ['Sick', r.pto ? `${Math.round(r.pto * 0.3)} hours` : 'Not accruing', true], ['Policy', r.ty === 'Full time' ? 'Full time accrual' : 'Not eligible']]) +
      `<section class="rp-sec"><header><h3>Requests</h3>${btn('Request time off', { act: 'go', arg: 'hr-time', kind: 'sm', i: 'clock' })}</header>${[...pend.map(x => `<div class="rp-line"><span>${esc(x.k)}, ${span(x.from, x.to)}</span><span class="tag warn">Waiting</span></div>`),
        ...outs.map(x => `<div class="rp-line"><span>${esc(x.k)}, ${span(x.from, x.to)}</span><span class="tag good">Approved</span></div>`)].join('') || '<p class="rp-none">Nothing booked.</p>'}</section>`,
    benefits: r.ty === 'Full time'
      ? fields('Enrolled plans', [['Medical', rnd() < 0.82 ? (rnd() < 0.5 ? 'Employee + family' : 'Employee only') : 'Waived'], ['Dental', rnd() < 0.74 ? 'Enrolled' : 'Waived'],
        ['Vision', rnd() < 0.6 ? 'Enrolled' : 'Waived'], ['Retirement plan', rnd() < 0.64 ? `${3 + Math.floor(rnd() * 6)}% of pay` : 'Not contributing'], ['Life insurance', '1x salary, company paid', true]])
      : fields('Benefits', [['Eligibility', 'Not eligible (not full time)', true]]),
    docs: `<section class="rp-sec"><header><h3>Documents</h3></header>${[['Offer letter', r.s, 'Signed'], ['Form I-9', r.s, 'Verified'], ['Form W-4', pay.yrs > 3 ? `${nowY - 4}-01-15` : r.s, pay.yrs > 3 ? 'Update due' : 'On file'],
      ['Handbook acknowledgement', r.s, rnd() < 0.06 ? 'Not signed' : 'Signed'], ['Direct deposit', r.s, 'On file'], ...certs.map(c => [c.c, c.due, daysBetween(h.asOf, c.due) < 0 ? 'Expired' : 'Expiring'])]
      .map(([k, d, st]) => `<div class="rp-line"><span>${ic('doc', 16)}<b>${esc(k)}</b><i>${dayY(d)}</i></span><span class="tag ${/Not|due|Exp/.test(st) ? 'warn' : 'good'}">${esc(st)}</span></div>`).join('')}</section>`,
    devices: (() => {
      const apps = ['people', 'finance', 'ops', 'docs', 'crm', 'comms'].flatMap(c => { try { return s.connectedIn(c); } catch { return []; } }).map(c => c.name);
      const office = r.d !== 'Field';
      return fields('Devices', [['Laptop', office || !r.mgr ? (rnd() < 0.5 ? 'Dell Latitude 5450' : 'MacBook Air 13') : 'None assigned'],
        ['Phone', !office || !r.mgr ? 'iPhone 15, company line' : 'None assigned'], ['Asset tag', `IT-${r.id.slice(1)}`, true]]) +
        `<section class="rp-sec"><header><h3>App access</h3></header><div class="rp-apps">${(apps.length ? apps : ['Email and calendar']).map(a => `<span class="hx-pill">${ic('check', 13)}${esc(a)}</span>`).join('')}</div>
        <p class="rp-none">Given at hire and taken back on the last day, from this record.</p></section>`;
    })(),
    team: `<section class="rp-sec"><header><h3>${reports.length ? `Direct reports (${reports.length})` : 'Team'}</h3>${btn('View in org chart', { arg: `goorg:${r.id}`, kind: 'sm', i: 'tree' })}</header>${(reports.length ? reports : h.roster.filter(x => x.mgr === r.mgr && x.id !== r.id).slice(0, 12))
      .map(x => `<button class="rp-line rp-person" data-click="person:${esc(x.id)}"><span>${face(x.n, 28)}<b>${esc(x.n)}</b><i>${esc(x.t)}</i></span><span class="sub">${esc(x.loc)}</span></button>`).join('')
      || '<p class="rp-none">No one else reports here.</p>'}</section>`,
  }[tab];

  return `<section class="rp-top hx-card panel">${face(r.n, 64)}<div class="rp-top-id"><h1>${esc(r.n)}</h1><p>${esc(r.t)} · ${esc(r.d)}</p>
      <div class="rp-facts">${[['Employee ID', r.id], ['Manager', r.mgr || 'Leadership'], ['Location', r.loc], ['Start date', dayY(r.s)], ['Status', r.st]].map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div></div>
      <div class="rp-top-r hx-pop">${btn('Actions', { arg: 'menu:rpact', i: 'dots' })}${menu('rpact', [['Request a change', 'go', 'hr-inbox', 'pencil'], ['View in org chart', 'hr', `goorg:${r.id}`, 'tree'], ['See timecard', 'hr', `tcwho:${r.id}`, 'clock'], ['Run payroll', 'go', 'hr-payroll', 'doc']])}</div></section>
    <div class="rp">
    <aside class="rp-side hx-card panel">
      <dl class="rp-mini"><div><dt>Work email</dt><dd>${esc(email)}</dd></div><div><dt>Type</dt><dd>${esc(r.ty)}</dd></div>${onb ? `<div><dt>Onboarding</dt><dd>${onb.done} of ${h.hiring.steps.length} steps</dd></div>` : ''}</dl>
      <nav class="rp-apps-nav">${APPS.map(([k, n, i]) => `<button class="${k === tab ? 'on' : ''}" data-act="hr" data-arg="ptab:${k}">${ic(i, 17)}<span>${esc(n)}</span></button>`).join('')}</nav>
    </aside>
    <main class="rp-main hx-card panel"><header class="rp-head"><h2>${esc(APPS.find(a => a[0] === tab)[1])}</h2></header>${body}</main>
  </div>` + source(s);
}

/* ---------------------------------------------- Timecards (ADP Workforce Now) */

function cardDays(from, to, c, seedTag = '') {
  const days = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  const work = days.filter(d => wdN(d) % 6);
  const rnd = seeded(`${c.id}:days${seedTag}`);
  const per = c.reg / work.length;
  const cells = days.map(d => ({ d, reg: 0, ot: 0, exc: '', ei: -1, inM: 0 }));
  let left = c.reg;
  work.forEach((d, i) => {
    const cell = cells.find(x => x.d === d);
    const v = i === work.length - 1 ? left : Math.round((per + (rnd() - 0.5) * 1.2) * 10) / 10;
    cell.reg = Math.max(0, Math.round(v * 10) / 10); left -= cell.reg;
    cell.inM = 6 * 60 + 30 + Math.floor(rnd() * 50);
  });
  let ot = c.ot;
  const otDays = work.filter(() => rnd() < 0.35);
  otDays.forEach((d, i) => { const v = i === otDays.length - 1 ? ot : Math.round(ot / otDays.length * 10) / 10; cells.find(x => x.d === d).ot = Math.max(0, v); ot -= v; });
  if (!seedTag) {
    c.exc.forEach((e, i) => {
      const free = work.filter(d => !cells.find(x => x.d === d).exc);
      const d = free[Math.floor(rnd() * free.length)];
      if (d) { const cell = cells.find(x => x.d === d); cell.exc = e; cell.ei = i; }
    });
  }
  return cells;
}
const clock = m => `${String(((Math.floor(m / 60) + 11) % 12) + 1).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} ${m < 720 ? 'AM' : 'PM'}`;
const tcType = t => (t === 'D' ? ic('cal', 13) : t === '#' ? '#' : t === 'L' ? ic('list', 13) : 'T');

function attendance(ctx) {
  const { q, s } = ctx;
  const h = hr(q), a = h.attendance, marks = ctx.tasks || {};
  const prev = S.tcper === 'previous';
  const from = prev ? addDays(a.from, -14) : a.from, to = prev ? addDays(a.to, -14) : a.to;
  const rows = a.cards.map(c => ({ c, cells: cardDays(from, to, c, prev ? ':prev' : '') }));
  const fixed = (c, i) => prev || S.tcfix[`${c.id}|${i}`] || marks[`${c.id}:tcx`] === 'done';
  const openExc = rw => rw.cells.filter(x => x.exc && !fixed(rw.c, x.ei));
  const approved = c => prev || c.approved || S.tcappr[c.id] || marks[`${c.id}:tc`] === 'done';
  const pending = rows.filter(rw => !approved(rw.c));
  const ready = pending.filter(rw => !openExc(rw).length);
  const blocked = pending.filter(rw => openExc(rw).length);
  const chosen = ready.filter(rw => S.tcsel[rw.c.id]);
  const roster = id => h.roster.find(x => x.id === id);
  const deptList = [...new Set(h.roster.map(x => x.d))];
  const deptCode = d => String(10 + deptList.indexOf(d) * 10).padStart(3, '0');
  const wkCells = cells => cells.slice(S.tcwk * 7, S.tcwk * 7 + 7);

  const periodBar = `<div class="tc-ctl">
      <button class="hx-select" data-act="hr" data-arg="tcper">${prev ? 'Previous Pay Period' : 'Current Pay Period'}${ic('down', 15)}</button>
      <span class="hx-date">${mdy(from)}${ic('cal', 15)}</span><span class="hx-date">${mdy(to)}${ic('cal', 15)}</span>
      ${S.tcview === 'one' ? btn('Team Timecard', { arg: 'tcview:team', i: 'back' }) : ''}
      <span class="grow"></span>
      ${S.tcview === 'team' && !prev ? btn(chosen.length ? `Approve ${chosen.length} timecard${chosen.length === 1 ? '' : 's'}` : 'Approve timecards', { arg: chosen.length ? `tcbulk:${chosen.map(rw => rw.c.id).join(',')}` : '', kind: 'pri', dis: !chosen.length, i: 'check' }) : ''}</div>`;
  const tabs = `<div class="tc-tabs">${[['timecard', 'Timecard'], ['totals', 'Totals'], ['schedule', 'Schedule'], ['balances', 'Time Off Balances']]
    .map(([k, n]) => `<button class="${S.tctab === k ? 'on' : ''}" data-act="hr" data-arg="tctab:${k}">${k === 'timecard' ? ic('list', 16) : ''}${n}</button>`).join('')}</div>`;
  const nameBtn = c => `<button class="hx-a" data-act="hr" data-arg="tcwho:${esc(c.id)}">${esc(lastFirst(c.n))}</button>`;
  const weekPick = `<div class="tc-wk">${[0, 1].map(w => `<button class="${S.tcwk === w ? 'on' : ''}" data-act="hr" data-arg="tcwk:${w}">Week ${w + 1}: ${day(addDays(from, w * 7))} to ${day(addDays(from, w * 7 + 6))}</button>`).join('')}
      <span class="tc-key"><i class="k bad"></i>Exception <i class="k ot"></i>Overtime <i class="k ok"></i>Fixed</span></div>`;

  let body = '';
  if (S.tctab === 'timecard' && S.tcview === 'one') {
    const i = Math.max(0, rows.findIndex(rw => rw.c.id === S.tcwho));
    const rw = rows[i], c = rw.c, r = roster(c.id) || { n: c.n, d: c.d, s: h.asOf, st: 'Active', t: '' };
    const tot = cs => cs.reduce((t, x) => t + x.reg + x.ot, 0);
    const excLeft = openExc(rw);
    const dayRows = rw.cells.map(x => {
      const bad = x.exc && !fixed(c, x.ei), hrs = x.reg + x.ot, work = hrs > 0;
      const late = /late/i.test(x.exc), miss = /miss|absent|no call/i.test(x.exc), early = /early/i.test(x.exc);
      const inM = x.inM + (late ? 22 : 0), outM = x.inM + Math.round(hrs * 60) + 30;
      return `<tr class="${work ? '' : 'off'}${bad ? ' exc' : ''}"><td class="tc-chk"><span class="hx-check${approved(c) && work ? ' on' : ''}${work ? '' : ' dim'}">${ic('check', 12)}</span></td>
        <td class="tc-d"><b>${wday(x.d)}</b> ${x.d.slice(5, 7)}/${x.d.slice(8, 10)}</td>
        <td class="tc-io">${work ? `<span class="${bad && late ? 'late' : ''}">${clock(inM)}</span>${bad ? `<i class="dot" title="${esc(x.exc)}"></i>` : ''} - ${bad && miss ? '<span class="miss">Missing</span>' : `<span class="${bad && early ? 'late' : ''}">${clock(outM)}</span>`}` : '-'}</td>
        <td>${work ? 'REG' : wdN(x.d) % 6 ? 'PTO' : ''}</td><td class="n">${hrs.toFixed(2)}</td><td>${deptCode(c.d)}</td>
        <td class="n">${hrs.toFixed(2)}</td><td class="n">${x.reg.toFixed(2)}</td><td class="n">${x.ot.toFixed(2)}</td>
        <td>${bad ? btn(miss ? 'Add punch' : 'Mark reviewed', { arg: `tcfix:${c.id}|${x.ei}`, kind: 'sm' }) : x.exc ? '<span class="tag good">Fixed</span>' : ''}</td></tr>`;
    }).join('');
    body = `<div class="tc-person">${face(c.n, 64)}<div class="tc-name"><h2>${esc(lastFirst(c.n))} <button class="hx-ib round" data-click="person:${esc(c.id)}" title="Open the employee record" aria-label="Open the employee record">${ic('right', 16)}</button></h2>
        <p>Home Department : ${deptCode(c.d)} - ${esc(c.d)}</p></div>
      <dl class="tc-facts"><div><dt>Position ID</dt><dd>${esc(c.id)}</dd></div><div><dt>Hire Date</dt><dd>${mdy(r.s)}</dd></div><div><dt>Status</dt><dd>${esc(r.st)}</dd></div><div><dt>Job</dt><dd>${esc(r.t)}</dd></div></dl>
      <div class="tc-nav">${ibtn('left', 'Previous person', `tcwho:${rows[(i - 1 + rows.length) % rows.length].c.id}`)}<span>${i + 1} of ${rows.length}</span>${ibtn('right', 'Next person', `tcwho:${rows[(i + 1) % rows.length].c.id}`)}</div></div>
      ${tabs}<div class="scroll"><table class="tc-t"><thead><tr><th class="tc-chk">Approve</th><th>Date</th><th>In - Out</th><th>Pay Code</th><th class="n">Hours</th><th>Department</th><th class="n">Daily Totals</th><th class="n">Regular</th><th class="n">Overtime</th><th></th></tr></thead>
        <tbody>${dayRows}</tbody></table></div>
      <div class="tc-sum"><b>Pay Period</b> (${tot(rw.cells).toFixed(2)}) <b>Week 1</b> (${tot(rw.cells.slice(0, 7)).toFixed(2)}) <b>Week 2</b> (${tot(rw.cells.slice(7, 14)).toFixed(2)})</div>
      <div class="tc-foot">${btn('Save', { arg: `tcsave:${c.id}`, kind: 'pri', i: 'save' })}${btn('Refresh', { arg: 'tctab:timecard', i: 'refresh' })}
        ${S.tcsaved === c.id ? `<span class="tc-ok">${ic('check', 16)}Operation successful.</span>` : ''}<span class="grow"></span>
        ${approved(c) ? '<span class="tag good">Timecard approved</span>' : btn(excLeft.length ? `Fix ${excLeft.length} exception${excLeft.length === 1 ? '' : 's'} to approve` : 'Approve Timecard', { act: 'task', arg: `done:${c.id}:tc`, kind: excLeft.length ? '' : 'pri', dis: !!excLeft.length, i: excLeft.length ? 'lock' : 'check' })}</div>`;
  } else if (S.tctab === 'timecard') {
    const allOn = ready.length && ready.every(rw => S.tcsel[rw.c.id]);
    body = tabs + weekPick + `<div class="scroll"><table class="tc-t team"><thead><tr><th class="tc-chk"><button class="hx-check${allOn ? ' on' : ''}" ${prev || !ready.length ? 'disabled' : ''} data-act="hr" data-arg="tcselall:${allOn ? '' : ready.map(rw => rw.c.id).join(',')}" title="Select every timecard that is ready" aria-label="Select every timecard that is ready">${ic('check', 12)}</button></th>
        <th>Employee</th>${wkCells(rows[0].cells).map(x => `<th class="${wdN(x.d) % 6 ? '' : 'we'}">${wday(x.d)}<i>${x.d.slice(5, 7)}/${x.d.slice(8, 10)}</i></th>`).join('')}<th class="n">Week</th><th class="n">Period</th><th>Status</th></tr></thead>
        <tbody>${rows.map(rw => {
          const c = rw.c, open = openExc(rw), done = approved(c);
          const cells = wkCells(rw.cells);
          return `<tr class="${done ? 'muted' : ''}"><td class="tc-chk">${done ? `<span class="hx-check on dim">${ic('check', 12)}</span>` : `<button class="hx-check${S.tcsel[c.id] ? ' on' : ''}" ${open.length ? 'disabled title="Fix the exceptions first"' : ''} data-act="hr" data-arg="tcsel:${esc(c.id)}" aria-label="Select ${esc(c.n)}">${ic('check', 12)}</button>`}</td>
            <td class="tc-who">${nameBtn(c)}<i>${esc(c.d)}</i></td>
            ${cells.map(x => { const bad = x.exc && !fixed(c, x.ei); return `<td class="tc-cell${bad ? ' bad' : x.exc ? ' ok' : ''}${x.ot ? ' ot' : ''}${wdN(x.d) % 6 ? '' : ' we'}"><button data-act="hr" data-arg="tcwho:${esc(c.id)}" title="${bad ? esc(x.exc) : ''}">${x.reg + x.ot ? (x.reg + x.ot).toFixed(1) : '-'}</button></td>`; }).join('')}
            <td class="n">${cells.reduce((t, x) => t + x.reg + x.ot, 0).toFixed(1)}</td><td class="n">${(c.reg + c.ot).toFixed(1)}</td>
            <td>${done ? '<span class="tag good">Approved</span>' : open.length ? `<button class="tag bad tc-fix" data-act="hr" data-arg="tcwho:${esc(c.id)}">${open.length} to fix</button>` : '<span class="tag">Ready</span>'}</td></tr>`;
        }).join('')}</tbody></table></div>`;
  } else if (S.tctab === 'totals') {
    body = tabs + `<div class="scroll"><table class="tc-t"><thead><tr><th>Employee</th><th>Department</th><th class="n">Regular</th><th class="n">Overtime</th><th class="n">PTO</th><th class="n">Total hours</th><th class="n">Attendance points</th><th class="n">Est. gross</th></tr></thead><tbody>${rows.map(rw => {
      const c = rw.c, r = roster(c.id), p = r ? payOf(q, r) : { rate: 25 }, pto = rw.cells.filter(x => wdN(x.d) % 6 && !(x.reg + x.ot)).length * 8;
      const warn = a.ladder.find(([t]) => c.pts < t);
      return `<tr><td>${nameBtn(c)}</td><td>${esc(c.d)}</td><td class="n">${c.reg.toFixed(2)}</td><td class="n">${c.ot.toFixed(2)}</td><td class="n">${pto.toFixed(2)}</td>
        <td class="n"><b>${(c.reg + c.ot + pto).toFixed(2)}</b></td><td class="n">${c.pts}${warn && warn[0] - c.pts <= 4 ? ` <span class="tag warn">${warn[0] - c.pts} to a ${esc(warn[1].toLowerCase())}</span>` : ''}</td><td class="n">${F.exact(p.rate * c.reg + p.rate * 1.5 * c.ot)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  } else if (S.tctab === 'schedule') {
    body = tabs + weekPick + `<div class="scroll"><table class="tc-t"><thead><tr><th>Employee</th>${wkCells(rows[0].cells).map(x => `<th class="${wdN(x.d) % 6 ? '' : 'we'}">${wday(x.d)} ${x.d.slice(5, 7)}/${x.d.slice(8, 10)}</th>`).join('')}</tr></thead><tbody>${rows.map(rw => `<tr><td>${nameBtn(rw.c)}</td>${wkCells(rw.cells).map(x => {
      const off = !(wdN(x.d) % 6), worked = x.reg + x.ot;
      return `<td class="${off ? 'we' : ''}"><span class="tc-shift${off ? ' off' : !worked ? ' miss' : x.ot ? ' over' : ''}">${off ? 'Off' : '7:00a – 3:30p'}</span></td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>`;
  } else {
    body = tabs + `<div class="scroll"><table class="tc-t"><thead><tr><th>Employee</th><th>Policy</th><th class="n">Vacation</th><th class="n">Sick</th><th class="n">Personal</th><th class="n">Used this year</th></tr></thead><tbody>${rows.map(rw => {
      const r = roster(rw.c.id), pto = r ? r.pto : 0, rnd = seeded(`${rw.c.id}:bal`);
      return `<tr><td>${nameBtn(rw.c)}</td><td>${r && r.ty === 'Full time' ? 'Full time accrual' : 'Not eligible'}</td>
        <td class="n">${(pto * 0.62).toFixed(2)}</td><td class="n">${(pto * 0.28).toFixed(2)}</td><td class="n">${(pto * 0.1).toFixed(2)}</td><td class="n">${Math.round(20 + rnd() * 60).toFixed(2)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  return `<div class="tc panel"><header class="tc-h"><h1>${S.tcview === 'one' && S.tctab === 'timecard' ? 'Individual Timecard' : 'Team Timecard'}</h1>
      <p>${prev ? 'Previous pay period, approved and closed.' : `<b>${pending.length}</b> to approve, <b>${blocked.length}</b> blocked by exceptions, <b>${ready.length}</b> ready.`}</p></header>
    ${periodBar}${body}</div>` + source(s);
}

/* ------------------------------------------------------ Run payroll (Gusto) */

function payroll(ctx) {
  const { q, s } = ctx;
  const h = hr(q), pr = h.payroll, a = h.attendance, marks = ctx.tasks || {};
  const company = q.data.meta.company || 'Company';
  const flags = pr.variances.filter(v => !marks[`${v.id}:var`]);
  const cardOf = id => a.cards.find(c => c.id === id);
  const people = h.roster.map(r => {
    const pay = payOf(q, r), c = cardOf(r.id), rnd = seeded(`${r.id}:hrs`);
    const defReg = pay.hourly ? (c ? c.reg : Math.round((28 + rnd() * 50) * 10) / 10) : 80;
    const defOt = pay.hourly && c ? c.ot : 0;
    const reg = S.hours[`${r.id}|reg`] ?? defReg, ot = S.hours[`${r.id}|ot`] ?? defOt;
    const bonus = S.extra[`${r.id}|bonus`] || 0, comm = S.extra[`${r.id}|comm`] || 0, other = S.extra[`${r.id}|other`] || 0, reimb = S.extra[`${r.id}|reimb`] || 0;
    const base = pay.hourly ? reg * pay.rate + ot * pay.rate * 1.5 : pay.base / 26;
    const sk = !!S.skip[r.id];
    return { r, pay, reg, ot, reimb: sk ? 0 : reimb, gross: sk ? 0 : base + bonus + comm + other, dd: rnd() < 0.94 };
  });
  const paid = people.filter(p => !S.skip[p.r.id]);
  const rEe = pr.taxesEe / pr.gross, rEr = pr.taxesEr / pr.gross, rDed = pr.deductions / pr.gross;
  const T = { gross: paid.reduce((t, p) => t + p.gross, 0), reimb: paid.reduce((t, p) => t + p.reimb, 0) };
  Object.assign(T, { ee: T.gross * rEe, er: T.gross * rEr, ded: T.gross * rDed });
  T.net = T.gross - T.ee - T.ded + T.reimb;
  T.debit = T.net + T.ee + T.er + T.ded;
  const step = S.pstep;
  const left = daysBetween(h.asOf, pr.runBy);
  const steps = ['Hours and earnings', 'Time off', 'Review and submit', 'Confirmation'];
  const progress = `<div class="gs-prog">${steps.map((t, i) => `<div class="${step > i + 1 ? 'done' : step === i + 1 ? 'now' : ''}"><i></i><span>${i + 1}. ${t}</span></div>`).join('')}</div>`;
  const head = `<header class="gs-head"><h1>Run payroll</h1><p>Pay period: ${mdy(a.from)} - ${mdy(a.to)}</p></header>`;

  let body = '';
  if (step === 1) {
    const add = (id, f, label) => S.open[`${id}|${f}`] || S.extra[`${id}|${f}`]
      ? `<label class="gs-mini"><span>${label}</span><input type="number" min="0" step="1" data-pay="${esc(id)}|${f}" value="${S.extra[`${id}|${f}`] || ''}" placeholder="0.00" aria-label="${label}"></label>`
      : `<button class="hx-a gs-add" data-act="hr" data-arg="popen:${esc(id)}|${f}">${ic('plus', 15)}${label}</button>`;
    body = `<h2 class="gs-h2">Hours and additional earnings</h2>
      <p class="gs-p">Update your employees' hours, reimbursements and additional earnings below.</p>
      <p class="gs-p">To pay your employees with direct deposit on <b>${wday(pr.payday)} ${day(pr.payday)}</b>, you'll need to run payroll by <b>5:00pm ET</b> on <b>${wday(pr.runBy)} ${day(pr.runBy)}</b>.
        ${left <= 1 ? '<b class="bh-late">That is tomorrow or sooner.</b>' : `That's ${left} days from now.`} If you miss this deadline, direct deposits will be late.</p>
      <div class="gs-tools"><label class="hx-search">${ic('search', 16)}<input type="search" placeholder="Search for name" data-filter=".gs-row" aria-label="Search for name"></label><span class="grow"></span>
        <span class="sub">${F.num(paid.length)} of ${F.num(people.length)} people on this payroll</span></div>
      <div class="scroll"><table class="gs-t"><thead><tr><th>Employees (${people.length})</th><th>Regular Hours (RH)<br>Overtime (OT)</th><th>Additional Earnings</th><th>Gross Pay (GP)<br>Reimbursement (R)<br>Payment Method</th><th>Actions</th></tr></thead><tbody>
      ${people.slice(0, S.plimit).map(p => {
        const id = p.r.id, sk = S.skip[id];
        return `<tr class="gs-row${sk ? ' skip' : ''}" data-text="${esc(p.r.n)}">
          <td><button class="hx-a u" data-click="person:${esc(id)}">${esc(lastFirst(p.r.n))}</button><p>${p.pay.hourly ? `${cents(p.pay.rate)}/hr` : `${F.exact(p.pay.base, 2)}/yr`}</p>${sk ? '<span class="tag warn">Skipping this payroll</span>' : ''}</td>
          <td>${p.pay.hourly
            ? `<label class="gs-in"><span>RH</span><input type="number" min="0" step="0.1" data-pay="${esc(id)}|reg" value="${p.reg}" aria-label="Regular hours for ${esc(p.r.n)}"><em>hrs</em></label>
              ${S.ot[id] || p.ot ? `<label class="gs-in"><span>OT</span><input type="number" min="0" step="0.1" data-pay="${esc(id)}|ot" value="${p.ot}" aria-label="Overtime hours for ${esc(p.r.n)}"><em>hrs</em></label>` : `<button class="hx-a gs-add" data-act="hr" data-arg="pot:${esc(id)}">${ic('plus', 15)}Overtime</button>`}`
            : `<span class="gs-sal">${ic('pencil', 14)}80.00 hrs</span>`}</td>
          <td>${add(id, 'bonus', 'Bonus')}${add(id, 'comm', 'Commission')}${add(id, 'other', 'Other earnings')}</td>
          <td><b class="gs-gp">${F.exact(p.gross, 2)}</b>${add(id, 'reimb', 'Reimbursement')}<p class="gs-pm">Pay by: <span class="hx-a">${p.dd ? 'Direct Deposit' : 'Check'}</span></p></td>
          <td class="gs-act"><div class="hx-pop">${ibtn('more', 'More actions', `menu:pr-${id}`)}${menu(`pr-${id}`, [['Edit deductions', 'click', `person:${id}`, 'pencil'], [sk ? 'Include in this payroll' : 'Skip payroll', 'hr', `pskip:${id}`, 'x']])}</div></td></tr>`;
      }).join('')}</tbody></table></div>
      ${people.length > S.plimit ? `<div class="gs-more">${btn(`Show ${Math.min(50, people.length - S.plimit)} more of ${people.length - S.plimit}`, { arg: 'pmore' })}</div>` : ''}`;
  } else if (step === 2) {
    const pto = h.timeoff.out.filter(o => o.from <= a.to && o.to >= a.from);
    body = `<h2 class="gs-h2">Time off</h2><p class="gs-p">Approved time off that falls in this pay period is paid from each person's balance.</p>
      ${pto.length ? `<div class="scroll"><table class="gs-t"><thead><tr><th>Employees (${pto.length})</th><th>Type</th><th>Dates</th><th>Hours used</th><th>Remaining balance</th></tr></thead><tbody>${pto.map(o => {
        const r = h.roster.find(x => x.n === o.n); const hrs = Math.min(daysBetween(o.from, o.to) + 1, 10) * 8;
        return `<tr><td><button class="hx-a u" ${r ? `data-click="person:${esc(r.id)}"` : ''}>${esc(lastFirst(o.n))}</button></td><td>${esc(o.k)}</td><td>${span(o.from, o.to)}</td>
          <td><span class="gs-in ro"><span>${esc(o.k.slice(0, 3).toUpperCase())}</span><b>${hrs}</b><em>hrs</em></span></td><td>${Math.max(0, (r ? r.pto : 40) - hrs)} hrs</td></tr>`;
      }).join('')}</tbody></table></div>` : '<p class="gs-p">No one took time off in this pay period.</p>'}`;
  } else if (step === 3) {
    body = `<h2 class="gs-h2">Review and submit</h2><p class="gs-p">Here is your payroll summary. Review it, then click Submit payroll.</p>
      <div class="gs-sum">${[['Total payroll', F.exact(T.debit, 2)], ['Debit amount', F.exact(T.debit, 2)], ['Debit date', `${wday(pr.runBy)}, ${day(pr.runBy)}`], ['Employee pay date', `${wday(pr.payday)}, ${day(pr.payday)}`]]
        .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>
      <div class="gs-alert${flags.length ? '' : ' ok'}">${ic(flags.length ? 'help' : 'check', 18)}<div><b>${flags.length ? `Before you submit: ${flags.length} paycheck${flags.length === 1 ? '' : 's'} changed by more than 5%` : 'Every changed paycheck is reviewed'}</b>
        ${pr.variances.map(v => { const st = marks[`${v.id}:var`], pct = (v.now - v.last) / v.last * 100; return `<div class="gs-flag${st ? ' seen' : ''}"><span><b>${esc(v.n)}</b> · ${esc(v.why)}</span><span class="gs-amt">${F.exact(v.last)} → ${F.exact(v.now)} <i class="delta ${pct > 0 ? 'up' : 'down'}">${pct > 0 ? '+' : ''}${pct.toFixed(0)}%</i></span>${st ? '<span class="tag good">Looks right</span>' : btn('Looks right', { act: 'task', arg: `done:${v.id}:var`, kind: 'sm' })}</div>`; }).join('')}</div></div>
      <h3 class="gs-h3">What your company pays</h3>
      <div class="scroll"><table class="gs-t gs-tot"><tbody>
        <tr><td>Gross pay</td><td class="n">${F.exact(T.gross, 2)}</td></tr><tr><td>Reimbursements</td><td class="n">${F.exact(T.reimb, 2)}</td></tr>
        <tr><td>Employer taxes</td><td class="n">${F.exact(T.er, 2)}</td></tr><tr><td>Company benefits contributions</td><td class="n">${F.exact(T.ded, 2)}</td></tr>
        <tr class="tot"><td>Total</td><td class="n">${F.exact(T.debit, 2)}</td></tr></tbody></table></div>
      <h3 class="gs-h3">Payroll details <span class="sub">${paid.length} employees</span></h3>
      <div class="scroll" style="max-height:420px"><table class="gs-t"><thead><tr><th>Employee</th><th class="n">Gross pay</th><th class="n">Employee taxes</th><th class="n">Deductions</th><th class="n">Net pay</th><th>Payment method</th></tr></thead><tbody>${paid.slice(0, 60).map(p =>
        `<tr><td>${esc(lastFirst(p.r.n))}</td><td class="n">${F.exact(p.gross, 2)}</td><td class="n">${F.exact(p.gross * rEe, 2)}</td><td class="n">${F.exact(p.gross * rDed, 2)}</td><td class="n"><b>${F.exact(p.gross * (1 - rEe - rDed) + p.reimb, 2)}</b></td><td>${p.dd ? 'Direct Deposit' : 'Check'}</td></tr>`).join('')}</tbody></table></div>`;
  } else {
    body = `<div class="gs-done"><span class="gs-check">${ic('check', 34)}</span><h2>Payroll submitted!</h2>
      <p>We'll debit <b>${F.exact(T.debit, 2)}</b> from your account on <b>${wday(pr.runBy)}, ${day(pr.runBy)}</b>.</p>
      <p>Your ${F.num(paid.length)} employees will be paid on <b>${wday(pr.payday)}, ${day(pr.payday)}</b>.</p>
      <div class="gs-done-b">${btn(S.receipt ? 'Hide payroll receipt' : 'View payroll receipt', { arg: 'preceipt', i: 'doc' })}${btn('Start a new payroll', { arg: 'preset' })}</div>
      ${S.receipt ? `<div class="gs-receipt"><h3>Payroll receipt</h3><p class="sub">${esc(company)} · Pay period ${mdy(a.from)} - ${mdy(a.to)}</p><dl>${[['Net pay', T.net], ['Employee taxes', T.ee], ['Employer taxes', T.er], ['Benefits and deductions', T.ded], ['Reimbursements', T.reimb]].map(([k, v]) => `<div><dt>${k}</dt><dd>${F.exact(v, 2)}</dd></div>`).join('')}<div class="tot"><dt>Total debited</dt><dd>${F.exact(T.debit, 2)}</dd></div></dl></div>` : ''}
      <p class="sub">The payroll provider files the taxes and moves the money. This screen approves the run and keeps the receipt.</p></div>`;
  }
  const foot = step === 4 ? '' : `<footer class="gs-foot">${step > 1 ? btn('Back', { arg: `pstep:${step - 1}`, i: 'back' }) : '<span></span>'}
      <span class="gs-run">Total payroll <b>${F.exact(T.debit, 2)}</b></span>
      ${step < 3 ? btn('Save and continue', { arg: `pstep:${step + 1}`, kind: 'pri' })
        : flags.length ? btn('Submit payroll', { kind: 'pri', dis: true }) : btn('Submit payroll', { arg: 'pstep:4', kind: 'pri' })}</footer>`;
  return `<div class="gs panel">${head}${progress}${body}${foot}</div>` + source(s);
}

/* --------------------------------------------- Org chart (Workday, d3-org-chart) */

const ORG = { el: null, chart: null, key: '', dataKey: '', viewKey: '', nodes: [], cmd: '', pending: null, pendingKey: '' };
const VENDOR = new URL('../vendor/', import.meta.url).href;
function need(files) {
  return files.reduce((p, f) => p.then(() => new Promise((ok, bad) => {
    const had = document.querySelector(`script[data-hx="${f}"]`);
    if (had) { if (had.dataset.ok) ok(); else { had.addEventListener('load', () => ok()); had.addEventListener('error', () => bad(new Error(`could not load ${f}`))); } return; }
    const sc = document.createElement('script');
    sc.src = VENDOR + f; sc.dataset.hx = f;
    sc.onload = () => { sc.dataset.ok = '1'; ok(); };
    sc.onerror = () => bad(new Error(`could not load ${f}`));
    document.head.appendChild(sc);
  })), Promise.resolve());
}

function orgNodes(q) {
  const h = hr(q);
  const company = q.data.meta.company || 'Company';
  const leads = h.roster.filter(r => !r.mgr);
  const leadByName = Object.fromEntries(leads.map(l => [l.n, l.id]));
  const moved = Object.fromEntries(Object.entries(S.omoves).filter(([id]) => h.roster.some(r => r.id === id)));
  return [{ id: 'root', parentId: '', n: 'Leadership team', t: company, d: '', loc: '', root: true },
    ...leads.map(l => ({ id: l.id, parentId: 'root', n: l.n, t: l.t, d: l.d, loc: l.loc, lead: true })),
    ...h.roster.filter(r => r.mgr).map(r => ({ id: r.id, parentId: leadByName[moved[r.id] || r.mgr] || 'root', n: r.n, t: r.t, d: r.d, loc: r.loc, moved: !!moved[r.id] }))];
}

function orgNodeHtml(d) {
  const x = d.data;
  const mover = ORG.nodes.find(n => n.id === S.omoving);
  const target = S.oplan && mover && x.lead && mover.parentId !== x.id;
  return `<div class="ocn${x.root ? ' root' : ''}${x.lead ? ' lead' : ''}${S.osel === x.id ? ' on' : ''}${x.moved ? ' moved' : ''}${S.omoving === x.id ? ' moving' : ''}">
    <div class="ocn-org">${x.root ? 'Leadership' : `${esc(x.d)} Department`}</div>
    <div class="ocn-card">${face(x.n, x.root ? 50 : 44, 'ring')}<b>${esc(x.n)}</b><span>${esc(x.t)}</span>${x.loc ? `<i>${ic('pin', 12)}${esc(x.loc)}</i>` : ''}
      ${x.moved ? '<em class="tag warn">Moved</em>' : ''}${target ? `<button class="hx-btn pri sm" data-act="hr" data-arg="oto:${esc(x.n)}">Move here</button>` : ''}</div></div>`;
}

function mountOrg(host) {
  const slot = host.querySelector('#oc-tree');
  if (!slot || !ORG.pending) return;
  const key = ORG.pendingKey, nodes = ORG.pending;
  const dataKey = JSON.stringify(nodes.map(n => [n.id, n.parentId]));
  const viewKey = JSON.stringify([S.osel, S.omoving, S.oplan]);
  if (ORG.el && ORG.key === key) {
    if (slot !== ORG.el) slot.replaceWith(ORG.el);
    ORG.nodes = nodes;
    if (ORG.chart && (dataKey !== ORG.dataKey || viewKey !== ORG.viewKey)) {
      if (dataKey !== ORG.dataKey) ORG.chart.data(nodes.map(n => ({ ...n })));
      ORG.chart.render();
      ORG.dataKey = dataKey; ORG.viewKey = viewKey;
    }
    runOrgCmd();
    return;
  }
  const el = document.createElement('div');
  el.id = 'oc-tree'; el.className = 'oc-tree';
  slot.replaceWith(el);
  Object.assign(ORG, { el, key, nodes, chart: null, dataKey, viewKey });
  need(['d3-7.9.0.min.js', 'd3-flextree-2.1.2.min.js', 'd3-org-chart-3.1.1.min.js']).then(() => {
    if (ORG.el !== el || !window.d3 || !window.d3.OrgChart) return;
    ORG.chart = new window.d3.OrgChart()
      .container(el).data(nodes.map(n => ({ ...n })))
      .svgHeight(620).nodeWidth(() => 230).nodeHeight(() => 178)
      .childrenMargin(() => 56).compactMarginBetween(() => 26).compactMarginPair(() => 56).neighbourMargin(() => 34)
      .initialExpandLevel(1).compact(false)
      .linkUpdate(function () { window.d3.select(this).attr('stroke', 'var(--hx-line)').attr('stroke-width', 1.5); })
      .buttonContent(({ node }) => `<div class="ocn-btn">${ic(node.children ? 'up' : 'down', 12)}<span>${node.data._directSubordinates}</span></div>`)
      .nodeContent(orgNodeHtml)
      .onNodeClick(d => { const x = d.data || d; if (x && !x.root) { S.osel = x.id; S.oactions = false; RENDER(); } })
      .render();
    runOrgCmd();
  }).catch(err => { el.innerHTML = `<div class="empty">The org chart could not load (${esc(err.message)}). The List view shows everyone.</div>`; });
}
function runOrgCmd() {
  const c = ORG.chart, cmd = ORG.cmd;
  if (!c || !cmd) return;
  ORG.cmd = '';
  if (cmd === 'expand') c.expandAll().fit();
  else if (cmd === 'collapse') c.collapseAll().fit();
  else if (cmd === 'fit') c.fit();
  else if (cmd === 'in') c.zoomIn();
  else if (cmd === 'out') c.zoomOut();
  else if (cmd.startsWith('show:')) { const id = cmd.slice(5); if (ORG.nodes.some(n => n.id === id)) c.setExpanded(id).setCentered(id).render(); }
}

function org(ctx) {
  const { q, s } = ctx;
  const h = hr(q);
  const company = q.data.meta.company || 'Company';
  const leads = h.roster.filter(r => !r.mgr);
  ORG.pending = orgNodes(q); ORG.pendingKey = `${company}|${h.roster.length}`;
  if (S.ofind) {
    const hit = h.roster.find(r => r.n.toLowerCase().includes(S.ofind.toLowerCase()));
    if (hit) { S.osel = hit.id; ORG.cmd = `show:${hit.id}`; }
    S.ofind = '';
  }
  const moves = Object.entries(S.omoves).map(([id, to]) => ({ r: h.roster.find(x => x.id === id), to })).filter(m => m.r);
  const mgrOf = r => S.omoves[r.id] || r.mgr;
  const cost = list => list.reduce((t, r) => t + payOf(q, r).base * 1.28, 0);
  const w = h.roster.find(r => r.id === S.osel);

  const worker = w ? (() => {
    const rnd = seeded(`${w.id}:ph`);
    const domain = company.toLowerCase().replace(/[^a-z]/g, '');
    const team = h.roster.filter(x => x.mgr === w.n);
    return `<aside class="oc-worker"><header><div><span class="sub">Worker</span><h3><button class="hx-a" data-click="person:${esc(w.id)}">${esc(w.n)}</button></h3></div>${ibtn('x', 'Close', `osel:${w.id}`)}</header>
      <div class="oc-w-id">${face(w.n, 84, 'ring')}${btn(team.length ? 'View Team' : 'Show in chart', { arg: `ochart:show:${w.id}`, kind: 'sm' })}</div>
      <h4>Contact</h4><dl><div><dt>${ic('phone', 14)}Phone</dt><dd>+1 (864) 555-${String(1000 + Math.floor(rnd() * 8999))} (Mobile)</dd></div><div><dt>${ic('mail', 14)}Email</dt><dd>${esc(w.n.toLowerCase().replace(' ', '.'))}@${esc(domain)}.com</dd></div></dl>
      <h4>Work Address</h4><p class="oc-addr">${ic('pin', 14)}${esc(w.loc)}</p>
      <h4>Job</h4><dl><div><dt>Organization</dt><dd>${esc(w.d)} Department</dd></div><div><dt>Business Title</dt><dd>${esc(w.t)}</dd></div><div><dt>Manager</dt><dd>${esc(mgrOf(w) || 'Leadership team')}</dd></div>${team.length ? `<div><dt>Direct reports</dt><dd>${team.length}</dd></div>` : ''}</dl>
      <div class="oc-acts-w">${btn('Related Actions', { arg: 'oactions', i: 'dots' })}${S.oactions ? `<div class="oc-acts">${[
        ['Job Change', w.mgr ? [['Move to another team', 'hr', `omove:${w.id}`]] : [['Leads a team, cannot be moved here', '', '']]], ['Compensation', [['Request a change', 'go', 'hr-inbox']]],
        ['Time Off', [['View timecard and balances', 'hr', `tcwho:${w.id}`]]], ['Personal Data', [['View worker profile', 'click', `person:${w.id}`]]]]
        .map(([g, items]) => `<div class="oc-ag"><span>${g}</span>${items.map(([l, act, arg]) => (act ? `<button ${act === 'click' ? `data-click="${esc(arg)}"` : `data-act="${act}" data-arg="${esc(arg)}"`}>${l}${ic('right', 13)}</button>` : `<em>${l}</em>`)).join('')}</div>`).join('')}</div>` : ''}</div>
    </aside>`;
  })() : '';

  const scenario = moves.length ? `<section class="hx-card panel oc-scn"><header class="hx-card-h">${ic('tree', 18)}<h3>Scenario: ${moves.length} move${moves.length === 1 ? '' : 's'}, not yet sent</h3></header><div class="hx-card-b">
      ${moves.map(m => `<div class="oc-mv"><span><b>${esc(m.r.n)}</b> from ${esc(m.r.mgr)} to ${esc(m.to)}</span>${btn('Undo', { arg: `oundo:${m.r.id}`, kind: 'sm' })}</div>`).join('')}
      <div class="scroll"><table class="t"><thead><tr><th>Team</th><th class="n">Headcount</th><th class="n">Cost a year</th></tr></thead><tbody>${leads.filter(l => h.roster.filter(r => r.mgr === l.n).length !== h.roster.filter(r => r.mgr && mgrOf(r) === l.n).length).map(l => {
        const b = h.roster.filter(r => r.mgr === l.n), a2 = h.roster.filter(r => r.mgr && mgrOf(r) === l.n), dc = cost(a2) - cost(b);
        return `<tr><td>${esc(l.d)}</td><td class="n">${b.length} → <b>${a2.length}</b></td><td class="n"><span class="delta ${dc > 0 ? 'up' : 'down'}">${dc > 0 ? '+' : ''}${F.money(dc)}</span></td></tr>`;
      }).join('')}</tbody></table></div>
      <div class="oc-btns">${S.osent ? '<span class="tag good">Sent to the Inbox as job changes</span>' : btn('Send for approval', { arg: 'osend', kind: 'pri' })}${btn('Discard', { arg: 'oreset' })}</div></div></section>` : '';

  const list = `<div class="scroll oc-listw"><table class="t oc-list"><thead><tr><th>Worker</th><th>Business Title</th><th>Organization</th><th>Manager</th><th>Location</th></tr></thead><tbody>${h.roster.map(r =>
    `<tr data-click="person:${esc(r.id)}"><td><span class="oc-li">${face(r.n, 26)}${esc(r.n)}</span></td><td>${esc(r.t)}</td><td>${esc(r.d)}</td><td>${esc(mgrOf(r) || 'Leadership team')}</td><td>${esc(r.loc)}</td></tr>`).join('')}</tbody></table></div>`;

  return `<div class="oc panel">
    <header class="oc-band"><button class="hx-ib onband" data-act="go" data-arg="hr-home" title="Back" aria-label="Back">${ic('back', 20)}</button><h1>Org Chart As Of ${dayY(h.asOf)}</h1><span class="grow"></span>
      <button class="hx-ib onband" data-act="print" title="Print" aria-label="Print">${icon('print', 18)}</button></header>
    <div class="oc-tools"><div class="hx-seg">${['chart', 'list'].map(v => `<button class="${S.oview === v ? 'on' : ''}" data-act="hr" data-arg="oview:${v}" title="${v === 'chart' ? 'Chart' : 'List'}" aria-label="${v === 'chart' ? 'Chart view' : 'List view'}">${ic(v === 'chart' ? 'tree' : 'list', 17)}</button>`).join('')}</div>
      ${S.oview === 'chart' ? `${ibtn('zin', 'Zoom in', 'ochart:in')}${ibtn('zout', 'Zoom out', 'ochart:out')}${ibtn('fit', 'Fit to screen', 'ochart:fit')}
      ${btn('Expand all', { arg: 'ochart:expand', kind: 'sm' })}${btn('Collapse all', { arg: 'ochart:collapse', kind: 'sm' })}` : ''}
      <span class="grow"></span>
      <label class="hx-search">${ic('search', 16)}<input id="oc-find" type="search" placeholder="Find a worker" aria-label="Find a worker"></label>
      ${btn(S.oplan ? (S.omoving ? 'Pick the new team' : 'Planning a change') : 'Plan a change', { arg: 'oplan', kind: S.oplan ? 'pri' : '', i: 'tree' })}</div>
    ${S.oplan ? `<p class="oc-hint">${ic('help', 15)}${S.omoving ? `Moving <b>${esc((h.roster.find(r => r.id === S.omoving) || {}).n || '')}</b>. Press Move here on the team they should join.` : 'Open a worker and choose Related Actions, Job Change, Move to another team. Nothing changes until the moves are approved.'}</p>` : ''}
    <div class="oc-body${w ? ' with' : ''}">${S.oview === 'chart' ? '<div id="oc-tree" class="oc-tree"></div>' : list}${worker}</div>
  </div>${scenario}` + source(s);
}

/* --------------------------------------- Talent review (Lattice and Workday) */

const PERF = ['1 - Below expectations', '2 - Meets expectations', '3 - Exceeds expectations'];
const POT = ['1 - Low', '2 - Medium', '3 - High'];
const BOX = ['Underperformer', 'Effective', 'Trusted professional', 'Dilemma', 'Core contributor', 'High performer', 'Enigma', 'Growth talent', 'Future leader'];
const SAY = [
  '{f} has missed several commitments this cycle and needs a clear plan with weekly check-ins.',
  '{f} delivers what is asked and is steady on the routine work.',
  '{f} is the person the team leans on for the hard jobs, and the work is right the first time.',
];

function mountSortables(host) {
  const lists = host.querySelectorAll('[data-sortable]');
  if (!lists.length) return;
  need(['sortable-1.15.6.min.js']).then(() => {
    if (!window.Sortable) return;
    lists.forEach(el => {
      if (el._hx || !el.isConnected) return;
      el._hx = window.Sortable.create(el, el.dataset.sortable === 'nb'
        ? { group: 'nb', animation: 160, draggable: '.nb-av', ghostClass: 'nb-ghost', dragClass: 'nb-drag', onAdd: ev => { S.tplace[ev.item.dataset.id] = Number(ev.to.dataset.box); S.tsel = ev.item.dataset.id; RENDER(); } }
        : { handle: '.rb-grip', draggable: '.rb-chip', animation: 140, onEnd: () => { S.rf = [...el.querySelectorAll('[data-col]')].map(x => x.dataset.col); RENDER(); } });
    });
  }).catch(() => {});
}

function talent(ctx) {
  const { q, s } = ctx;
  const h = hr(q);
  const depts = [...new Set(h.roster.map(r => r.d))];
  const dept = depts.includes(S.tdept) ? S.tdept : depts[0];
  const people = h.roster.filter(r => r.d === dept && r.st === 'Active');
  const home = r => { const rnd = seeded(`${r.id}:nb`); const perf = Math.min(2, Math.floor(rnd() * 2.6 + 0.3)); const pot = Math.min(2, Math.floor(rnd() * 2.4 + (payOf(q, r).yrs < 3 ? 0.5 : 0.1))); return pot * 3 + perf; };
  const at = r => (S.tplace[r.id] ?? home(r));
  const sel = people.find(r => r.id === S.tsel);
  const movedN = people.filter(r => S.tplace[r.id] !== undefined && S.tplace[r.id] !== home(r)).length;
  const lead = leadOf(h, dept) || h.roster[0];
  const m = Number(h.asOf.slice(5, 7));

  const grid = [2, 1, 0].map(pot => `<span class="nb-yl">${POT[pot]}</span>` + [0, 1, 2].map(perf => {
    const i = pot * 3 + perf, inBox = people.filter(r => at(r) === i);
    return `<div class="nb-box${i === 8 ? ' top' : ''}${sel ? ' can' : ''}" data-box="${i}" data-sortable="nb" ${sel ? `data-act="hr" data-arg="tbox:${i}"` : ''}>${inBox.map(r =>
      `<button class="nb-av${sel && sel.id === r.id ? ' on' : ''}${S.tplace[r.id] !== undefined && S.tplace[r.id] !== home(r) ? ' moved' : ''}" data-id="${esc(r.id)}" data-act="hr" data-arg="tsel:${esc(r.id)}" title="${esc(r.n)}" aria-label="${esc(r.n)}" style="--h:${hueOf(r.n)}">${esc(ini(r.n))}</button>`).join('')}
      <em class="nb-name">${BOX[i]}</em><em class="nb-n">${inBox.length}</em></div>`;
  }).join('')).join('');

  const side = sel ? (() => {
    const i = at(sel), was = home(sel), perf = i % 3, pot = Math.floor(i / 3), rnd = seeded(`${sel.id}:tc`);
    const risk = rnd() < 0.2 ? ['High', 'bad'] : rnd() < 0.5 ? ['Medium', 'warn'] : ['Low', 'good'];
    const rev = h.roster.find(x => x.n === sel.mgr) || lead;
    return `<aside class="nb-side"><div class="nb-who">${face(sel.n, 72)}<div><h3>${esc(sel.n)}</h3><p>${esc(sel.t)} · ${esc(sel.d)}</p></div></div>
      <section><h4>Reviewer</h4><p class="nb-rev">${face(rev.n, 30)}${esc(rev.n)}</p></section>
      <section><h4>Performance rating</h4><b>${PERF[perf]}</b><p>${esc(SAY[perf].replace('{f}', sel.n.split(' ')[0]))}</p></section>
      <section><h4>Potential rating</h4><b>${POT[pot]} potential</b><p>Box: ${BOX[i]}${i !== was ? ` <span class="tag warn">moved from ${BOX[was]}</span>` : ''}</p></section>
      <section><h4>Flight risk</h4><span class="tag ${risk[1]}">${risk[0]}</span></section>
      <section><h4>Move to</h4><select id="nb-move" class="hx-field" aria-label="Move to a box">${[8, 7, 6, 5, 4, 3, 2, 1, 0].map(b => `<option value="${b}" ${b === i ? 'selected' : ''}>${BOX[b]} (${POT[Math.floor(b / 3)].slice(4).toLowerCase()} potential, ${PERF[b % 3].slice(4).toLowerCase()})</option>`).join('')}</select></section>
      <button class="hx-btn sm" data-click="person:${esc(sel.id)}"><span>Open the full record</span></button></aside>`;
  })() : `<aside class="nb-side empty">${ic('help', 22)}<p>Pick someone in the grid to see their ratings, or drag them to a new box.</p><p class="sub">${people.length} people in ${esc(dept)}. ${movedN} moved so far.</p></aside>`;

  return `<div class="nb panel">
    <header class="nb-band"><button class="hx-ib onband" data-act="go" data-arg="hr-home" title="Close" aria-label="Close">${ic('x', 20)}</button><h1>Q${Math.ceil(m / 3)} ${h.asOf.slice(0, 4)} Talent Review</h1><span class="grow"></span>
      ${S.tsubmitted[dept] ? '<span class="tag good">Calibration submitted</span>' : btn('Submit calibration', { arg: `tsubmit:${dept}`, kind: 'onband' })}</header>
    <div class="nb-main"><div class="nb-left">
      <div class="nb-title"><h2>${esc(dept)}</h2><div class="nb-teams">${depts.map(d => `<button class="hx-pill${d === dept ? ' on' : ''}" data-act="hr" data-arg="tdept:${esc(d)}">${esc(d)}</button>`).join('')}</div></div>
      <div class="nb-frame"><span class="nb-axis-y">Potential rating</span><div class="nb-grid">${grid}<span></span>${PERF.map(p => `<span class="nb-xl">${p}</span>`).join('')}</div><span class="nb-axis-x">Performance rating</span></div>
      <div class="nb-foot">${movedN ? `<span>${movedN} moved in this session.</span>${btn('Reset moves', { arg: 'treset', kind: 'sm' })}` : '<span>Drag a person to another box, or pick them and choose Move to.</span>'}</div>
    </div>${side}</div></div>` + source(s);
}

/* ------------------------------------------- Onboarding (BambooHR and Gusto) */

/* The task lists in BambooHR's shape: a list, who it is assigned to, and when it is due relative to
   the start date (negative is before). The same lists drive every new hire. */
const LISTS = [
  ['New hire paperwork', 'Employee', [['Review and sign W-4', -3], ['Complete direct deposit form', -3], ['Read the employee handbook', 0], ['Review and sign I-9, section 1', 0], ['Enroll in benefits', 30]]],
  ['HR', 'HR', [['Send welcome packet', -5], ['Add to payroll', -2], ['Verify I-9 section 2 and E-Verify', 3]]],
  ['Manager', 'Manager', [['Introduce new hire to the team', 0], ['Take new hire to lunch', 1], ['Set 30, 60 and 90 day goals', 7]]],
  ['IT', 'IT', [['Laptop and accounts ready', -2], ['Add to project software', 0]]],
];
const rel = n => (n === 0 ? 'Due on hire date' : n < 0 ? `Due ${-n} day${n === -1 ? '' : 's'} before hire date` : `Due ${n} day${n === 1 ? '' : 's'} after hire date`);

function onboarding(ctx) {
  const { q, s } = ctx;
  const h = hr(q);
  const company = q.data.meta.company || 'the company';
  const hires = h.hiring.onboarding;
  if (!hires.length) return U.pageHead({ eyebrow: 'HR', title: 'Onboarding', answer: 'Nobody is onboarding right now.' }) + source(s);
  const lists = LISTS.map(([n, who, tasks]) => [n, who, [...tasks]]);
  const misc = S.tplExtra.map(x => [x[1], x[3]]);
  if (misc.length) lists.push(['Miscellaneous', 'HR', misc]);
  const hrPerson = hrLead(h);
  const tasksFor = n => {
    const mgr = leadOf(h, n.d);
    const all = lists.flatMap(([ln, who, ts], li) => [...ts, ...(S.oncustom[`${n.n}|${li}`] || []).map(t => [t, 0])].map(([t, off]) => ({ li, list: ln, t, off,
      who: who === 'Employee' ? n.n : who === 'Manager' ? (mgr ? mgr.n : 'Manager') : who === 'HR' ? hrPerson.n : 'IT team', due: addDays(n.s, off) })));
    const order = all.slice().sort((x, y) => x.off - y.off);
    const k = Math.round(n.done / 8 * all.length);
    const byDefault = new Set(order.slice(0, k).map(x => `${x.li}|${x.t}`));
    return all.map(x => { const key = `${n.n}|${x.li}|${x.t}`, d0 = byDefault.has(`${x.li}|${x.t}`); return { ...x, key, done: S.ondone[key] ? !d0 : d0 }; });
  };
  const sel = hires.find(x => x.n === S.onsel) || hires[0];
  const tasks = tasksFor(sel);
  const doneN = tasks.filter(t => t.done).length;
  const until = daysBetween(h.asOf, sel.s);
  const r = h.roster.find(x => x.n === sel.n);
  const mgr = leadOf(h, sel.d);

  const tabs = `<div class="ob-tabs">${[['hires', `New hires (${hires.length})`], ['lists', 'Task lists']].map(([k, n]) => `<button class="${S.ontab === k ? 'on' : ''}" data-act="hr" data-arg="ontab:${k}">${n}</button>`).join('')}</div>`;
  let main;
  if (S.ontab === 'lists') {
    main = `<section class="ob-set"><div class="ob-set-tools">${btn('New task', { arg: 'tplnew', i: 'plus' })}<span class="grow"></span><span class="sub">Every new hire gets these tasks, dated from their start date.</span></div>
      <table class="ob-t"><thead><tr><th>Task name</th><th>Assigned to</th><th>Due</th></tr></thead><tbody>${lists.map(([ln, who, ts]) =>
        `<tr class="ob-grp"><td colspan="3">${ic('list', 15)}${esc(ln)}</td></tr>${ts.map(([t, off]) => `<tr><td><span class="hx-a">${esc(t)}</span></td><td>${esc(who)}</td><td>${rel(off)}</td></tr>`).join('')}
        <tr><td colspan="3"><button class="hx-a" data-act="hr" data-arg="tplnew">+ New task</button></td></tr>`).join('')}</tbody></table></section>`;
  } else if (S.onview === 'preview') {
    const mine = tasks.filter(t => t.list === 'New hire paperwork');
    const first = mine.findIndex(t => !t.done);
    const rnd = seeded(`${sel.n}:gtky`);
    main = `<section class="ob-prev"><div class="ob-prev-bar">${ic('help', 16)}<span>You are seeing what ${esc(sel.n.split(' ')[0])} sees.</span>${btn('Back to tasks', { arg: 'onview:tasks', kind: 'sm', i: 'back' })}</div>
      <div class="ob-prev-in"><div class="ob-prev-main"><h2>Welcome to ${esc(company)}, ${esc(sel.n.split(' ')[0])}!</h2><p>Finish these before your first day on ${wday(sel.s)}, ${day(sel.s)}.</p>
        <div class="ob-progress"><div class="meter big"><i style="width:${(mine.filter(t => t.done).length / mine.length * 100).toFixed(0)}%"></i></div><span>${mine.filter(t => t.done).length} of ${mine.length} steps complete</span></div>
        <ol class="ob-steps">${mine.map((t, i) => `<li class="${t.done ? 'done' : i === first ? 'now' : ''}"><span class="ob-num">${t.done ? ic('check', 16) : i + 1}</span><div><b>${esc(t.t)}</b><p>${rel(t.off)} (${dayY(t.due)})</p></div>
          ${t.done ? '<span class="tag good">Completed</span>' : i === first ? btn('Get started', { arg: `ontog:${t.key}`, kind: 'pri sm' }) : '<span class="sub">Not started</span>'}</li>`).join('')}</ol></div>
      <aside class="ob-prev-side"><section><h4>Your first day</h4><dl class="ob-dl"><div><dt>When</dt><dd>${wday(sel.s)}, ${day(sel.s)} at 8:00 AM</dd></div><div><dt>Where</dt><dd>${esc(r ? r.loc : 'Head office')}</dd></div>
        <div><dt>Your manager</dt><dd>${esc(mgr ? mgr.n : 'Your team lead')}</dd></div><div><dt>Bring</dt><dd>Two forms of ID for the I-9</dd></div></dl></section>
        <section><h4>Get to know you</h4><dl class="ob-dl"><div><dt>Hometown</dt><dd>${['Greenville', 'Charlotte', 'Asheville', 'Columbia', 'Knoxville', 'Atlanta'][Math.floor(rnd() * 6)]}</dd></div>
        <div><dt>Outside work</dt><dd>${['Fishing and the lake', 'Coaching youth soccer', 'Woodworking', 'Trail running', 'Cooking for a crowd', 'Restoring an old truck'][Math.floor(rnd() * 6)]}</dd></div>
        <div><dt>Ask me about</dt><dd>${['My last big project', 'The best barbecue in town', 'Learning a second language', 'My dog, Biscuit'][Math.floor(rnd() * 4)]}</dd></div></dl></section></aside></div></section>`;
  } else {
    main = `<section class="ob-hire-h">${face(sel.n, 56)}<div class="ob-hire-t"><h2>${esc(sel.n)}</h2><p>${esc(sel.t)} · ${esc(sel.d)} · ${until > 1 ? `starts in ${until} days` : until === 1 ? 'starts tomorrow' : until === 0 ? 'starts today' : until === -1 ? 'started yesterday' : `started ${-until} days ago`} (${dayY(sel.s)}) · reports to ${esc(mgr ? mgr.n : 'their lead')}</p>
        <div class="ob-progress"><div class="meter"><i style="width:${(doneN / tasks.length * 100).toFixed(0)}%"></i></div><span>${doneN} of ${tasks.length} tasks complete</span></div></div>
      <div class="ob-hire-b">${S.onremind[sel.n] ? '<span class="tag good">Reminder sent</span>' : btn('Send reminder', { arg: `onremind:${sel.n}`, i: 'mail' })}${btn('Preview as new hire', { arg: 'onview:preview', kind: 'pri', i: 'idcard' })}</div></section>
      <div class="scroll"><table class="ob-t"><thead><tr><th class="ob-c"></th><th>Task name</th><th>Assigned to</th><th>Due</th></tr></thead><tbody>${lists.map(([ln], li) => {
        const ts = tasks.filter(t => t.li === li);
        return `<tr class="ob-grp"><td colspan="4">${ic('list', 15)}${esc(ln)} <span>${ts.filter(t => t.done).length} of ${ts.length}</span></td></tr>${ts.map(t => {
          const late = !t.done && t.due < h.asOf;
          return `<tr class="${t.done ? 'done' : ''}"><td class="ob-c"><button class="hx-check${t.done ? ' on' : ''}" data-act="hr" data-arg="ontog:${esc(t.key)}" aria-label="Mark ${esc(t.t)} ${t.done ? 'not done' : 'done'}">${ic('check', 12)}</button></td>
            <td><span class="hx-a">${esc(t.t)}</span></td><td>${esc(t.who)}</td><td>${rel(t.off)}<i class="${late ? 'bh-late' : ''}">${late ? `Overdue since ${day(t.due)}` : day(t.due)}</i></td></tr>`;
        }).join('')}<tr><td></td><td colspan="3">${S.onadd === li ? '<input id="ob-new" class="hx-field" placeholder="Name the task and press Enter" aria-label="New task name">' : `<button class="hx-a" data-act="hr" data-arg="onadd:${li}">+ Add task</button>`}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }

  return `<div class="ob panel"><header class="ob-top"><h1>${ic('idcard', 24)}Onboarding</h1>${tabs}</header>
    <div class="ob-body${S.ontab === 'lists' ? ' one' : ''}">${S.ontab === 'lists' ? '' : `<aside class="ob-list"><label class="hx-search">${ic('search', 15)}<input type="search" placeholder="Search new hires" data-filter=".ob-hire" aria-label="Search new hires"></label>${hires.map(n => {
      const ts = tasksFor(n), d = ts.filter(t => t.done).length;
      return `<button class="ob-hire${n.n === sel.n ? ' on' : ''}" data-text="${esc(n.n)}" data-act="hr" data-arg="onsel:${esc(n.n)}">${face(n.n, 36)}<span><b>${esc(n.n)}</b><i>${esc(n.t)} · ${day(n.s)}</i><span class="meter"><i style="width:${(d / ts.length * 100).toFixed(0)}%"></i></span></span><em>${d}/${ts.length}</em></button>`;
    }).join('')}</aside>`}
    <main class="ob-main">${main}</main></div></div>` + source(s);
}

/* --------------------------------------------- Reports (BambooHR builder) */

const FIELDS = {
  Personal: [['n', 'Full name', 'T'], ['first', 'First name', 'T'], ['last', 'Last name', 'T'], ['id', 'Employee #', 'T']],
  Job: [['t', 'Job title', 'T'], ['d', 'Department', 'L'], ['mgr', 'Reports to', 'T'], ['loc', 'Location', 'L']],
  Employment: [['ty', 'Employment status', 'L'], ['st', 'Status', 'L'], ['s', 'Hire date', 'D'], ['ten', 'Years of service', '#']],
  'Pay & time off': [['pay', 'Annual pay', '#'], ['rate', 'Pay type', 'L'], ['pto', 'Time off balance (hrs)', '#']],
};
const FNAME = Object.fromEntries(Object.values(FIELDS).flat().map(([k, n]) => [k, n]));
const FTYPE = Object.fromEntries(Object.values(FIELDS).flat().map(([k, , t]) => [k, t]));
const STANDARD = [
  { id: 'directory', name: 'Employee directory', cat: 'Standard', cols: ['n', 't', 'd', 'loc', 'mgr'], sort: 'n' },
  { id: 'headcount', name: 'Headcount by department', cat: 'Standard', cols: ['n', 'd', 'ty'], g: 'd', view: 'chart' },
  { id: 'newhires', name: 'New hires this year', cat: 'Standard', cols: ['n', 't', 'd', 's'], sort: 's', dir: -1, hired: true },
  { id: 'pay', name: 'Pay by department', cat: 'Standard', cols: ['n', 'd', 't', 'pay'], g: 'd' },
  { id: 'pto', name: 'Time off balances', cat: 'Standard', cols: ['n', 'd', 'pto'], sort: 'pto', dir: -1 },
  { id: 'anniv', name: 'Years of service', cat: 'Standard', cols: ['n', 'd', 's', 'ten'], sort: 'ten', dir: -1 },
  { id: 'status', name: 'Employment status', cat: 'Standard', cols: ['n', 'ty', 'st', 'd'], g: 'ty' },
];
function openReport(id) {
  if (!id) { S.rrep = ''; S.rpop = ''; return; }
  const r = [...STANDARD, ...S.rcustom].find(x => x.id === id) || { id: 'new', name: 'Untitled report', cols: ['n', 'd', 't'] };
  Object.assign(S, { rrep: r.id, rname: r.name, rf: [...r.cols], rsort: r.sort || '', rdir: r.dir || 1, rg: r.g || '', rview: r.view || 'table', rfd: {}, rft: {}, rpop: '', rall: false, rnote: '', rhired: !!r.hired, rrename: false });
}
function downloadCsv() {
  if (!LAST_REPORT) return;
  const cell = v => `"${String(v).replace(/"/g, '""')}"`;
  const text = [LAST_REPORT.head.map(cell).join(','), ...LAST_REPORT.rows.map(row => row.map(cell).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = `${(LAST_REPORT.name || 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
}

function reports(ctx) {
  const { q, s } = ctx;
  const h = hr(q);
  const val = (r, f) => {
    if (f === 'ten') return daysBetween(r.s, h.asOf) / 365;
    if (f === 'pay') { const p = payOf(q, r); return p.hourly ? p.rate * 2080 : p.base; }
    if (f === 'rate') return payOf(q, r).hourly ? 'Hourly' : 'Salary';
    if (f === 'mgr') return r.mgr || 'Leadership';
    if (f === 'first') return r.n.split(' ')[0];
    if (f === 'last') return r.n.split(' ').slice(1).join(' ');
    return r[f];
  };
  const show = (f, v) => (f === 'ten' ? v.toFixed(1) : f === 'pay' ? F.exact(v) : f === 's' ? mdy(v) : esc(String(v)));
  const plain = (f, v) => (f === 'ten' ? v.toFixed(1) : f === 'pay' ? (noMoney() ? '' : Math.round(v)) : f === 's' ? mdy(v) : String(v));

  if (!S.rrep) {
    const lib = [...STANDARD, ...S.rcustom].filter(x => S.rlib === 'all' || (S.rlib === 'starred' ? S.rstar[x.id] : x.cat.toLowerCase() === S.rlib));
    return `<div class="rb panel"><header class="rb-top"><h1>Reports</h1><span class="grow"></span>${btn('New report', { arg: 'rrep:new', kind: 'pri', i: 'plus' })}</header>
      <div class="rb-lib"><nav class="rb-nav">${[['all', 'All reports', STANDARD.length + S.rcustom.length], ['standard', 'Standard reports', STANDARD.length], ['custom', 'Custom reports', S.rcustom.length], ['starred', 'Favorites', Object.keys(S.rstar).length]]
        .map(([k, n, c]) => `<button class="${S.rlib === k ? 'on' : ''}" data-act="hr" data-arg="rlib:${k}"><span>${n}</span><em>${c}</em></button>`).join('')}</nav>
      <section class="rb-libmain"><label class="hx-search">${ic('search', 16)}<input type="search" placeholder="Search reports" data-filter=".rb-librow" aria-label="Search reports"></label>
        <div class="scroll"><table class="t rb-libt"><thead><tr><th></th><th>Report name</th><th>Category</th><th>Owner</th><th>Columns</th></tr></thead><tbody>${lib.map(x => `<tr class="rb-librow" data-text="${esc(x.name)}"><td>${ibtn('star', 'Favorite', `rstar:${x.id}`, { on: S.rstar[x.id], fill: S.rstar[x.id] })}</td>
          <td><button class="hx-a" data-act="hr" data-arg="rrep:${x.id}">${esc(x.name)}</button></td><td>${esc(x.cat)}</td><td>${x.cat === 'Custom' ? 'You' : 'System'}</td><td class="sub">${x.cols.map(c => FNAME[c]).join(', ')}</td></tr>`).join('') || '<tr><td colspan="5" class="sub">No reports here yet. Save one from the builder.</td></tr>'}</tbody></table></div></section></div></div>` + source(s);
  }

  const depts = [...new Set(h.roster.map(r => r.d))], types = [...new Set(h.roster.map(r => r.ty))];
  let rows = h.roster.filter(r => (!Object.keys(S.rfd).length || S.rfd[r.d]) && (!Object.keys(S.rft).length || S.rft[r.ty]) && (!S.rhired || r.s.slice(0, 4) === h.asOf.slice(0, 4)));
  if (S.rsort) rows = rows.slice().sort((x, y) => { const a = val(x, S.rsort), b = val(y, S.rsort); return (a > b ? 1 : a < b ? -1 : 0) * S.rdir; });
  const cols = S.rf.filter(f => FNAME[f]);
  const groupable = ['d', 'ty', 'loc', 'st', 'mgr', 'rate'];
  const g = groupable.includes(S.rg) ? S.rg : '';
  LAST_REPORT = { name: S.rname, head: cols.map(f => FNAME[f]), rows: rows.map(r => cols.map(f => plain(f, val(r, f)))) };

  const pill = (k, label, i, n) => `<div class="hx-pop"><button class="rb-pill${S.rpop === k ? ' on' : ''}" data-act="hr" data-arg="rpop:${k}">${ic(i, 16)}<span>${label}</span>${n ? `<em>${n}</em>` : ''}${ic('down', 14)}</button>`;
  const cats = Object.keys(FIELDS);
  const popCols = S.rpop === 'cols' ? `<div class="rb-popover rb-cols"><header><h3>Columns</h3>${ibtn('x', 'Close', 'rpop:cols')}</header><div class="rb-cols-in">
      <div class="rb-cats"><label class="hx-search">${ic('search', 15)}<input type="search" placeholder="Search fields" data-filter=".rb-fld" aria-label="Search fields"></label>${cats.map(c => `<button class="${S.rcat === c ? 'on' : ''}" data-act="hr" data-arg="rcat:${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="rb-flds">${(FIELDS[S.rcat] ? [S.rcat] : cats).map(c => `<div class="rb-fgrp"><h4>${esc(c)}</h4>${FIELDS[c].map(([k, n, t]) =>
        `<label class="rb-fld" data-text="${esc(n)}"><input type="checkbox" data-act="hr" data-arg="rf:${k}" ${S.rf.includes(k) ? 'checked' : ''}><span class="rb-type">${tcType(t)}</span>${esc(n)}</label>`).join('')}</div>`).join('')}</div>
      <div class="rb-sel"><h4>Selected</h4><div data-sortable="cols">${cols.map(f => `<div class="rb-chip" data-col="${f}"><span class="rb-grip">${ic('grip', 14)}</span><span class="rb-type">${tcType(FTYPE[f])}</span><span class="rb-cn">${esc(FNAME[f])}</span>${ibtn('x', `Remove ${FNAME[f]}`, `rf:${f}`)}</div>`).join('')}</div>
        <p class="sub">Drag to reorder.</p></div></div><footer>${btn('Done', { arg: 'rpop:cols', kind: 'pri' })}</footer></div>` : '';
  const popSort = S.rpop === 'sort' ? `<div class="rb-popover rb-small"><h3>Sort by</h3>${cols.map(f => `<button class="rb-opt${S.rsort === f ? ' on' : ''}" data-act="hr" data-arg="rsort:${f}">${esc(FNAME[f])}${S.rsort === f ? `<em>${S.rdir > 0 ? 'Ascending' : 'Descending'}</em>` : ''}</button>`).join('')}
      <button class="rb-opt" data-act="hr" data-arg="rnosort">No sort</button></div>` : '';
  const popGroup = S.rpop === 'group' ? `<div class="rb-popover rb-small"><h3>Group by</h3>${['', ...groupable].map(f => `<button class="rb-opt${g === f ? ' on' : ''}" data-act="hr" data-arg="rg:${f}">${f ? esc(FNAME[f]) : 'No grouping'}</button>`).join('')}</div>` : '';
  const popFilt = S.rpop === 'filter' ? `<div class="rb-popover rb-small"><h3>Department</h3>${depts.map(d => `<label class="rb-fld"><input type="checkbox" data-act="hr" data-arg="rfd:${esc(d)}" ${S.rfd[d] ? 'checked' : ''}>${esc(d)}</label>`).join('')}
      <h3>Employment status</h3>${types.map(t => `<label class="rb-fld"><input type="checkbox" data-act="hr" data-arg="rft:${esc(t)}" ${S.rft[t] ? 'checked' : ''}>${esc(t)}</label>`).join('')}</div>` : '';
  const nFilt = Object.keys(S.rfd).length + Object.keys(S.rft).length + (S.rhired ? 1 : 0);

  let table;
  const limit = S.rall ? rows.length : 50;
  if (g) {
    const groups = {};
    for (const r of rows) { const k = val(r, g); (groups[k] = groups[k] || []).push(r); }
    const list = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    table = S.rview === 'chart'
      ? `<div class="rb-chart">${C.hbars({ rows: list.slice(0, 14).map(([k, v]) => ({ name: k, value: v.length })), fmt: v => `${v} people` })}</div>`
      : `<div class="scroll"><table class="t rb-t"><thead><tr><th class="rb-num">#</th>${cols.map(f => `<th class="${FTYPE[f] === '#' ? 'n' : ''}">${esc(FNAME[f])}</th>`).join('')}</tr></thead><tbody>${list.map(([k, v]) =>
        `<tr class="rb-grp"><td colspan="${cols.length + 1}">${esc(FNAME[g])}: <b>${esc(k)}</b> <span>${v.length} ${v.length === 1 ? 'person' : 'people'}</span></td></tr>${v.slice(0, S.rall ? 1e4 : 15).map((r, i) => `<tr data-click="person:${esc(r.id)}"><td class="rb-num">${i + 1}</td>${cols.map(f => `<td class="${FTYPE[f] === '#' ? 'n' : ''}">${show(f, val(r, f))}</td>`).join('')}</tr>`).join('')}`).join('')}</tbody></table></div>`;
  } else {
    table = `<div class="scroll"><table class="t rb-t"><thead><tr><th class="rb-num">#</th>${cols.map(f => `<th class="${FTYPE[f] === '#' ? 'n' : ''}"><button class="rb-th" data-act="hr" data-arg="rsort:${f}">${esc(FNAME[f])}${S.rsort === f ? ic(S.rdir > 0 ? 'up' : 'down', 12) : ''}</button></th>`).join('')}</tr></thead>
      <tbody>${rows.slice(0, limit).map((r, i) => `<tr data-click="person:${esc(r.id)}"><td class="rb-num">${i + 1}</td>${cols.map(f => `<td class="${FTYPE[f] === '#' ? 'n' : ''}">${show(f, val(r, f))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  return `<div class="rb panel"><div class="rb-back"><button class="hx-a" data-act="hr" data-arg="rrep:">${ic('back', 15)}All reports</button></div>
    <header class="rb-head">${S.rrename ? `<input id="rb-name" class="hx-field rb-namein" value="${esc(S.rname)}" aria-label="Report name">` : `<h1>${esc(S.rname)}</h1>${ibtn('pencil', 'Rename', 'rrename')}`}
      <span class="grow"></span>${btn('Export CSV', { arg: 'rcsv', i: 'download' })}${btn('Save', { arg: 'rsave', kind: 'pri', i: 'save' })}</header>
    ${S.rnote ? `<p class="rb-note">${ic('check', 15)}${esc(S.rnote)}</p>` : ''}
    <div class="rb-tools">${pill('cols', 'Add / Remove Columns', 'cols', cols.length)}${popCols}</div>${pill('sort', 'Sort', 'sort', S.rsort ? 1 : 0)}${popSort}</div>${pill('group', 'Group', 'group', g ? 1 : 0)}${popGroup}</div>${pill('filter', 'Filters', 'filter', nFilt)}${popFilt}</div>
      ${g ? `<div class="hx-seg">${['table', 'chart'].map(v => `<button class="${S.rview === v ? 'on' : ''}" data-act="hr" data-arg="rview:${v}">${v === 'table' ? 'Table' : 'Chart'}</button>`).join('')}</div>` : ''}
      <span class="grow"></span><span class="sub">${rows.length} ${rows.length === 1 ? 'person' : 'people'}</span></div>
    <section class="rb-prev">${cols.length ? table : '<p class="sub">Add a column to start the report.</p>'}</section>
    ${!g && rows.length > limit ? `<div class="gs-more">${btn(`Show all ${rows.length}`, { arg: 'rall' })}</div>` : ''}</div>` + source(s);
}

export const mashPages = {
  'hr-home': home, 'hr-inbox': inbox, 'hr-person': person, 'hr-attendance': attendance, 'hr-payroll': payroll,
  'hr-org': org, 'hr-talent': talent, 'hr-onboarding': onboarding, 'hr-reports': reports,
};
