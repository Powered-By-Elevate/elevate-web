/* The two doors in front of a client's Hub.

   Each client gets a
   dedicated Launchpad with logins that show different views, such as finance
   or HR, hosted where the team picks a client and sees all of their data.

   So there are two screens, and neither is a permission system of its own:

   - The SIGN-IN is a client's front door, in that client's brand. A real
     deployment signs people in with Microsoft and maps each person to a view
     level by job title. The demo has no sign-in, so it says so and offers
     sample people instead, each tied to one level in config/roles.json.
   - The CONSOLE is Elevate's own view, a staff tool in Elevate's brand: a
     search first, then one row per client with figures from that client's
     own extract, and Enter or one click into any of them at the top level.

   ⛔ Both only ever SET the view level. What a level may see is still decided
   where it always was: pages in settings.js, scope in query.js, money in
   fmt.js. A sample person is a level with a name on it, nothing more. */

import * as F from './fmt.js?v=02d4c24167';
import { Q } from './query.js?v=02d4c24167';
import { esc, icon, brandMark, INDUSTRY_ICON } from './icons.js?v=02d4c24167';
import { scene } from './scenes.js?v=02d4c24167';
import { spark } from './chart.js?v=02d4c24167';

export function scopeWord(role) {
  return { all: 'every company', company: 'one company', units: 'assigned units only',
    own: 'own work only' }[role.scope] || role.scope;
}

export function moneyWord(role) {
  return { full: 'all figures', operating: 'operating figures', unit: 'unit figures',
    none: 'no currency' }[role.money] || role.money;
}

/* The top level a client has. Staff enter at it. Found by rank rather than by
   id, because a client can rename every level in the console. */
export function topRole(roles) {
  return roles.slice().sort((a, b) => b.rank - a.rank)[0];
}

/* The sample people at one company. A person whose level was deleted in the
   console is dropped, and a level renamed there shows its new name. */
export function people(cfg, roles, ind) {
  const spec = (cfg.roles && cfg.roles.signin) || {};
  const list = spec.people || [];
  const names = spec.names || [];
  const at = Math.max(0, cfg.industries.industries.findIndex(i => i.id === ind.id));
  return list.map((p, i) => {
    const role = roles.find(r => r.id === p.role);
    if (!role) return null;
    const name = names.length ? names[(at * list.length + i) % names.length] : `Sample person ${i + 1}`;
    return {
      name, role: role.id, level: role, lands: p.lands,
      title: p.title || cap(ind.unit.owner || role.name),
    };
  }).filter(Boolean);
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

function initials(name) {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function pageName(cfg, ind, id) {
  const over = (ind.pages || {})[id];
  return (over && over.name) || (cfg.product.pages[id] || {}).name || id;
}

/* --------------------------------------------------------------- the host */

export function show(html, kind) {
  let host = document.getElementById('gate');
  if (!host) {
    host = document.createElement('div');
    host.id = 'gate';
    document.body.appendChild(host);
  }
  host.innerHTML = html;
  host.dataset.kind = kind;
  delete host.dataset.ind;
  host.hidden = false;
  document.body.classList.add('gated');
  window.scrollTo({ top: 0 });
  /* the entrance, never for a robot, so the gate measures the settled screen */
  const quiet = window.matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.webdriver;
  if (!quiet) {
    host.querySelectorAll('[data-rise]').forEach((el, i) => {
      el.style.animationDelay = `${40 + i * 50}ms`;
      el.classList.add('enter');
    });
  }
  const field = host.querySelector('[data-bind="gate-search"]');
  if (field) field.focus({ preventScroll: true });
  return host;
}

export function hide() {
  const host = document.getElementById('gate');
  if (host) { host.hidden = true; host.innerHTML = ''; }
  document.body.classList.remove('gated');
}

export function open() {
  const host = document.getElementById('gate');
  if (!host || host.hidden) return null;
  return host.dataset.kind || null;
}

/* ------------------------------------------------------------ the sign-in */

export function signin({ cfg, s, q, ind, tenant, note }) {
  const brand = s.data.brand;
  const company = s.data.company;
  const who = people(cfg, s.data.roles, ind);
  const ents = q.entities;
  const closed = q.closed ? F.monthName(q.closed, true) : '';
  return `<div class="sg" data-kind="signin">
    <header class="gate-top" data-rise>
      <span class="gate-prod">${esc(s.data.productName)} <span>${esc(cfg.product.product.vendor)}</span></span>
      <span class="gate-links">
        ${tenant ? '' : `<button class="gate-link" data-act="chooser">${icon('grid', 14)}Another company</button>
        <button class="gate-link" data-act="console">${icon('shield', 14)}Elevate staff</button>`}
      </span>
    </header>
    <div class="sg-card" data-rise>
      <section class="sg-brand">
        <span class="sg-scene">${scene(ind.id, brand.palette, { height: 230 })}</span>
        <span class="sg-mark">${brand.logo ? `<img src="${esc(brand.logo)}" alt="">` : brandMark(brand, 56)}</span>
        <h1>${esc(company)}</h1>
        <p>${esc(ind.tagline)}</p>
        <ul class="sg-facts">
          <li><b>${ents.length}</b> ${ents.length === 1 ? 'company' : 'companies'}</li>
          <li><b>${q.allUnits.length}</b> ${esc(ind.unit.many)}</li>
          ${closed ? `<li>Signed off through <b>${esc(closed)}</b></li>` : ''}
        </ul>
      </section>
      <section class="sg-form">
        <div class="sg-eyebrow">Sign in</div>
        <h2>Your ${esc(s.data.productName)}, at your level</h2>
        <button class="sg-ms" data-act="ms-signin">${msLogo()}<span>Sign in with Microsoft</span></button>
        <p class="sg-small">${note
    ? `<b>This demo has no sign-in.</b> A deployment opens ${esc(company)}'s own Microsoft 365 here, with its two-factor and access rules. Pick a sample person below instead.`
    : `A deployment signs people in through ${esc(company)}'s own Microsoft 365, so its two-factor and access rules apply. Each person lands at the level their job title maps to.`}</p>
        <div class="sg-or"><span>Demo sign-in</span></div>
        ${who.length ? `<div class="sg-people">
          ${who.map((p, i) => person(cfg, ind, p, i)).join('')}
        </div>` : `<p class="sg-small">No sample people are set up for this Hub.</p>`}
        <p class="sg-foot">This is a demo sign-in. Every name here is invented, and picking one sets the view level and nothing more.</p>
      </section>
    </div>
  </div>`;
}

function person(cfg, ind, p, i) {
  const none = p.level.money === 'none';
  return `<button class="sg-person" data-act="signin-as" data-arg="${i}">
    <span class="sg-av">${esc(initials(p.name))}</span>
    <span class="sg-who">
      <b>${esc(p.name)}</b>
      <span>${esc(p.title)} · opens on ${esc(pageName(cfg, ind, p.lands))}</span>
    </span>
    <span class="sg-level${none ? ' none' : ''}">${esc(p.level.name)}<small>${esc(moneyWord(p.level))}</small></span>
    <span class="sg-go">${icon('arrow', 15)}</span>
  </button>`;
}

function msLogo() {
  return `<svg viewBox="0 0 21 21" width="18" height="18" aria-hidden="true">
    <rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>`;
}

/* ------------------------------------------------------------ the console */

/* One row per client, every figure read from that client's own extract through
   the same Q the pages use. The money level is raised to full only while these
   strings are made, then put back, so a no-money level never inherits it. */
export function clients(cfg, data, roles) {
  const top = topRole(roles);
  const was = F.state.money;
  F.setMoneyLevel('full');
  try {
    return cfg.industries.industries.filter(ind => data[ind.id]).map(ind => {
      const q = new Q(data[ind.id], ind);
      const month = q.months[q.months.length - 1];
      q.setView({ role: top, entity: '*', basis: 'ytd', month });
      const figs = (ind.kpis || []).map(id => {
        try { return q.kpi(id); } catch (err) { return null; }
      }).filter(k => k && Number.isFinite(k.value)).slice(0, 3);
      const fin = (ind.connected || {}).finance;
      const conn = (cfg.connectors.connectors || []).find(c => c.id === fin);
      return {
        ind, q, month, figs,
        brand: cfg.brands.brands[ind.brand] || cfg.brands.brands.default,
        revenue: q.kpi('revenue').value,
        spark: q.series('rev', q.months.slice(-12)),
        tentative: !q.closed || month > q.closed,
        finance: conn ? conn.name : '',
        search: [ind.company, ind.name, ind.short, conn ? conn.name : '',
          ...q.entities.map(e => e.name)].join(' ').toLowerCase(),
      };
    });
  } finally {
    F.setMoneyLevel(was);
  }
}

/* The console is a staff tool, so it reads as one: Elevate's own light grey,
   charcoal and teal with the wordmark, a search first, and one dense row per
   client. The front door is the opposite on purpose (dark, scenic, a card per
   world), so a glance says which side of the glass you are on. Each client's
   brand survives only as its mark and the colour of its spark. */
export function console_({ cfg, rows, display }) {
  const was = F.state.money;
  F.setMoneyLevel('full');
  try {
    const ents = rows.reduce((t, r) => t + r.q.entities.length, 0);
    const units = rows.reduce((t, r) => t + r.q.allUnits.length, 0);
    const open = rows.filter(r => r.tentative).length;
    const rev = rows.reduce((t, r) => t + r.revenue, 0);
    const inds = [...new Map(rows.map(r => [r.ind.id, r.ind.short || r.ind.name])).entries()];
    const seen = recent().map(id => rows.find(r => r.ind.id === id)).filter(Boolean);
    return `<div class="ec" data-kind="console">
      <header class="ec-top" data-rise>
        <img class="ec-logo" src="img/elevate-wordmark.png" alt="Elevate" width="98" height="46">
        <span class="ec-staff">${icon('shield', 13)}Staff console</span>
        <span class="ec-gap"></span>
        <button class="ec-link" data-act="chooser" aria-label="Prospect demo">${icon('grid', 14)}<span>Prospect demo</span></button>
      </header>
      <section class="ec-hero" data-rise>
        <div class="ec-eyebrow">${esc(cfg.product.product.name)} clients</div>
        <h1>Find a client</h1>
        <label class="ec-search">${icon('search', 20)}
          <input type="search" data-bind="gate-search" placeholder="Company, industry or system"
            aria-label="Find a client" aria-controls="ec-rows" autocomplete="off" spellcheck="false"></label>
        <p class="ec-keys"><kbd>↑</kbd><kbd>↓</kbd> move <kbd>Enter</kbd> open at full access <kbd>Esc</kbd> clear</p>
      </section>
      <div class="ec-stats" data-rise>
        ${stat('Clients', rows.length, 'on this console')}
        ${stat('Companies', ents, `${units.toLocaleString('en-US')} units of work`)}
        ${stat('Revenue this year', F.figure(F.usd(rev)), 'every client, year to date')}
        ${stat('Waiting on a close', open, open === 1 ? 'client with a tentative month' : 'clients with a tentative month')}
      </div>
      ${seen.length ? `<div class="ec-recent" data-rise><span class="ec-label">Recently opened</span>
        ${seen.map(r => `<button class="ec-chip" data-act="staff-enter" data-arg="${esc(r.ind.id)}">
          ${brandMark(r.brand, 20)}<b>${esc(r.ind.company)}</b></button>`).join('')}</div>` : ''}
      <section class="ec-panel" data-rise>
        <div class="ec-tools">
          <div class="ec-inds" role="group" aria-label="Industry">
            <button class="ec-ind on" data-act="ec-ind" data-arg="*">All</button>
            ${inds.map(([id, name]) => `<button class="ec-ind" data-act="ec-ind" data-arg="${esc(id)}">${esc(name)}</button>`).join('')}
          </div>
          <div class="ec-sort" role="group" aria-label="Sort">
            <span class="ec-label">Sort</span>
            <button class="on" data-act="ec-sort" data-arg="name">Name</button>
            <button data-act="ec-sort" data-arg="rev">Revenue</button>
            <button data-act="ec-sort" data-arg="close">Close</button>
          </div>
        </div>
        <div class="ec-cols" aria-hidden="true"><span></span><span>Client</span><span>Scope</span>
          <span>Finance system</span><span>Close</span><span>Headline figures</span><span>12 months</span><span></span></div>
        <div class="ec-rows" id="ec-rows" role="listbox" aria-label="Clients">
          ${rows.slice().sort((a, b) => a.ind.company.localeCompare(b.ind.company)).map(r => row(r, display)).join('')}
        </div>
        <p class="ec-none" hidden>No client matches that. Try a company, an industry or a system.</p>
      </section>
      <footer class="ec-foot">${esc(cfg.product.demoNotice)} Only the Elevate team sees this console. A client never does.</footer>
    </div>`;
  } finally {
    F.setMoneyLevel(was);
  }
}

function stat(label, value, note) {
  return `<div class="ec-stat"><span>${esc(label)}</span><b>${value}</b>${note ? `<small>${esc(note)}</small>` : ''}</div>`;
}

/* "Oct 2026": the year stays, since "Oct 26" reads as a date */
function mon(m) { return F.monthName(m, true).replace(/^(\w{3})\w*/, '$1'); }

function row(r, display) {
  const ind = r.ind;
  const n = r.q.entities.length;
  return `<div class="ec-row" role="option" aria-selected="false" data-act="staff-enter" data-arg="${esc(ind.id)}"
    data-client="${esc(ind.id)}" data-ind="${esc(ind.id)}" data-search="${esc(r.search)}"
    data-name="${esc(ind.company.toLowerCase())}" data-rev="${r.revenue}" data-open="${r.tentative ? 1 : 0}"
    style="--w-accent:${r.brand.palette.accent}">
    <span class="ec-mark">${brandMark(r.brand, 32)}</span>
    <span class="ec-id"><b>${esc(ind.company)}</b><span>${esc(ind.name)}</span></span>
    <span class="ec-scope">${n} ${n === 1 ? 'company' : 'companies'}<small>${r.q.allUnits.length} ${esc(ind.unit.many)}</small></span>
    <span class="ec-sys">${esc(r.finance || 'Not connected')}</span>
    <span class="ec-close"><span class="ec-pill${r.tentative ? ' warn' : ' good'}">${r.tentative
    ? `${esc(mon(r.month))} tentative` : `Closed ${esc(mon(r.q.closed))}`}</span></span>
    <span class="ec-figs">${r.figs.map(k => `<span><small>${esc(k.label)}</small><b>${F.figure(display(k))}</b></span>`).join('')}</span>
    <span class="ec-trend">${spark(r.spark, { width: 76, height: 24, color: r.brand.palette.accent })}</span>
    <span class="ec-acts">
      <button class="ec-open" data-act="staff-enter" data-arg="${esc(ind.id)}">Open ${icon('arrow', 13)}</button>
      <button class="ec-alt" data-act="signin" data-arg="${esc(ind.id)}">Sign-in view</button>
    </span>
  </div>`;
}

/* --- the picker's behaviour: rows already drawn are filtered, sorted and
   highlighted in place. Nothing is refetched or redrawn. */

const RECENT = 'hub.console.recent';

export function recent() {
  try { return JSON.parse(localStorage.getItem(RECENT) || '[]').filter(x => typeof x === 'string'); }
  catch (err) { return []; }
}

export function remember(id) {
  try { localStorage.setItem(RECENT, JSON.stringify([id, ...recent().filter(x => x !== id)].slice(0, 4))); }
  catch (err) { /* a private window keeps no history */ }
}

function rowsOf(host) { return [...host.querySelectorAll('.ec-row')]; }

function mark(host, el) {
  for (const r of rowsOf(host)) {
    const on = r === el;
    r.classList.toggle('on', on);
    r.setAttribute('aria-selected', String(on));
  }
  if (el) el.scrollIntoView({ block: 'nearest' });
}

/* `text` given (the probe, a script) sets the field too, so the screen and
   the result never disagree. */
export function filter(text) {
  const host = document.getElementById('gate');
  if (!host) return 0;
  const input = host.querySelector('[data-bind="gate-search"]');
  if (text !== undefined && input) input.value = text;
  const want = String(input ? input.value : text || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const only = host.dataset.ind || '*';
  let shown = 0, first = null;
  for (const el of rowsOf(host)) {
    const hit = (only === '*' || el.dataset.ind === only) && want.every(w => el.dataset.search.includes(w));
    el.hidden = !hit;
    if (hit) { shown++; first = first || el; }
  }
  const none = host.querySelector('.ec-none');
  if (none) none.hidden = shown > 0;
  /* the first match is highlighted, so Enter right after typing opens it */
  mark(host, want.length || only !== '*' ? first : null);
  return shown;
}

export function only(id) {
  const host = document.getElementById('gate');
  if (!host) return;
  host.dataset.ind = id;
  for (const b of host.querySelectorAll('.ec-ind')) b.classList.toggle('on', b.dataset.arg === id);
  filter();
}

export function sort(by) {
  const host = document.getElementById('gate');
  const list = host && host.querySelector('.ec-rows');
  const key = {
    name: (a, b) => a.dataset.name.localeCompare(b.dataset.name),
    rev: (a, b) => b.dataset.rev - a.dataset.rev,
    close: (a, b) => b.dataset.open - a.dataset.open || a.dataset.name.localeCompare(b.dataset.name),
  }[by];
  if (!list || !key) return;
  rowsOf(host).sort(key).forEach(r => list.appendChild(r));
  for (const b of host.querySelectorAll('.ec-sort button')) b.classList.toggle('on', b.dataset.arg === by);
}

/* Arrow keys move the highlight, Enter opens it at full access, Escape
   clears. True when the key was the picker's. */
export function key(ev) {
  const host = document.getElementById('gate');
  if (!host || host.dataset.kind !== 'console') return false;
  const shown = rowsOf(host).filter(r => !r.hidden);
  const at = shown.findIndex(r => r.classList.contains('on'));
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
    const step = ev.key === 'ArrowDown' ? 1 : -1;
    const next = at < 0 ? (step > 0 ? 0 : shown.length - 1) : Math.min(shown.length - 1, Math.max(0, at + step));
    mark(host, shown[next] || null);
    return true;
  }
  if (ev.key === 'Enter') {
    const el = shown[at] || (shown.length === 1 ? shown[0] : null);
    if (el) el.click();
    return true;
  }
  if (ev.key === 'Escape') { filter(''); return true; }
  return false;
}

