/* The shell: load the configuration, mount the rail, the tab column and the
   top bar, then route to a page.

   Two measured rules are built in. The pickers are listboxes drawn in the page,
   never a native select, because a native popup is painted outside the document
   and a screenshot cannot capture it. And a basis button that would not change
   a single figure on the page is shown disabled with its reason, rather than
   offered and then doing nothing. */

import { Settings, paletteFrom } from './settings.js?v=cfc9ac23e4';
import { Q, loadData } from './query.js?v=cfc9ac23e4';
import * as F from './fmt.js?v=cfc9ac23e4';
import * as C from './chart.js?v=cfc9ac23e4';
import * as U from './ui.js?v=cfc9ac23e4';
import { esc, icon, brandMark } from './icons.js?v=cfc9ac23e4';
import { financePages } from './pages/finance.js?v=cfc9ac23e4';
import { opsPages } from './pages/ops.js?v=cfc9ac23e4';
import { miscPages } from './pages/misc.js?v=cfc9ac23e4';
import { hrPages } from './pages/hr.js?v=cfc9ac23e4';
import { mashPages, hrAct, hrWire } from './pages/hrmash.js?v=cfc9ac23e4';
import { settings as settingsPage, connectSheet, FONT_PAIRS } from './cms.js?v=cfc9ac23e4';
import * as Chooser from './chooser.js?v=cfc9ac23e4';
import * as Present from './present.js?v=cfc9ac23e4';
import * as World from './world.js?v=cfc9ac23e4';
import * as Gate from './gate.js?v=cfc9ac23e4';

const BASIS = [
  { id: 'month', name: 'Month' }, { id: 'ytd', name: 'YTD' },
  { id: 'ttm', name: 'TTM' }, { id: 'fy', name: 'FY' },
];

const PAGES = { ...financePages, ...opsPages, ...miscPages, ...hrPages, ...mashPages, settings: settingsPage };

const app = {
  cfg: null, s: null, q: null, data: {},
  page: 'home', arg: null, subtab: 'brand', menu: null, sheet: null, docsAt: '',
  detailFrom: null, docsBy: 'type', tasks: null,
};

/* --------------------------------------------------------------- bootstrap */

async function boot() {
  const base = document.body.dataset.base || '';
  const [product, brands, industries, connectors, roles] = await Promise.all(
    ['product', 'brands', 'industries', 'connectors', 'roles']
      .map(n => fetch(`${base}config/${n}.json`, { cache: 'no-cache' }).then(r => {
        if (!r.ok) throw new Error(`config/${n}.json: ${r.status}`);
        return r.json();
      })));

  app.cfg = { product, brands, industries, connectors, roles };
  /* read before Settings.load() consumes it: a returning viewer keeps their
     demo, a first-time one is shown the front door */
  let firstVisit = true;
  try { firstVisit = !localStorage.getItem('hub.settings.v2'); } catch (err) { /* blocked store */ }
  if (!product.tenant) await Chooser.loadCards(base);
  app.s = new Settings(app.cfg).load();
  app.s.apply();
  /* `#/demo/<industry>` opens that industry's demo on its Start here page, so
     a website can link straight to one company (elevatemanagedservices.com's
     industry chips do). It counts as a choice, so the front door stays shut. */
  const demo = demoHash();
  if (demo) { app.s.useIndustry(demo); app.s.save(); firstVisit = false; history.replaceState(null, '', '#/home'); }
  await useIndustry(app.s.data.industry, true);

  World.start();
  /* A row that sits level at 1440 can be wildly mismatched at 900 once the
     columns reflow, so the balance is re-measured on resize. Throttled to one
     frame: it reads geometry, and reading it per resize event is how a drag
     turns into a stutter. */
  let balanceFrame = 0;
  addEventListener('resize', () => {
    if (balanceFrame) return;
    balanceFrame = requestAnimationFrame(() => { balanceFrame = 0; balanceRows(); });
  }, { passive: true });
  window.addEventListener('hashchange', async () => {
    const demo = demoHash();
    if (demo) {
      if (demo !== app.s.data.industry) { app.s.useIndustry(demo); await useIndustry(demo); } else app.s.save();
      go('home'); return;
    }
    const gate = readHash();
    if (gate) { openGate(gate.kind, gate.arg); return; }
    if (Gate.open()) closeGate();
    render();
  });
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && ev.target.dataset && ev.target.dataset.person) {
      ev.preventDefault(); addPerson(ev.target.dataset.person); return;
    }
    if (ev.target.dataset && ev.target.dataset.bind === 'gate-search' && Gate.key(ev)) {
      ev.preventDefault(); return;
    }
    if (ev.target.matches('input, textarea, select')) return;
    if (Present.key(ev)) { ev.preventDefault(); return; }
    if (ev.key === 'Escape') { closeMenu(); closeSheet(); }
  });

  const gate = readHash();
  render();
  window.__hub = api();
  /* A sign-in or console link opens on that screen and never on the front
     door: someone sent a client's sign-in should land on it. */
  if (gate) await openGate(gate.kind, gate.arg);
  else if (firstVisit || location.hash === '#/choose') openChooser(firstVisit);
}

async function useIndustry(id, first = false) {
  if (!app.data[id]) app.data[id] = await loadData(id, document.body.dataset.base || '');
  const ind = app.cfg.industries.industries.find(i => i.id === id);
  app.q = new Q(app.data[id], ind);
  const d = app.s.data;
  const months = app.q.months;
  if (!d.month || !months.includes(d.month)) d.month = months[months.length - 1];
  app.q.setView({ role: app.s.role, entity: d.entity, basis: d.basis, month: d.month });
  F.setMoneyLevel(app.s.role.money);
  if (!first) app.s.save();
}

/* The industry named by `#/demo/<industry>`, or null. A client's own Hub
   (a tenant) has no other demos, so it never takes one. */
function demoHash() {
  const m = location.hash.match(/^#\/?demo\/([a-z-]+)/);
  if (!m || (app.cfg.product && app.cfg.product.tenant)) return null;
  return app.cfg.industries.industries.some(i => i.id === m[1]) ? m[1] : null;
}

/* A page route sets the page. `#/signin`, `#/signin/<industry>` and
   `#/console` are the two doors (gate.js): they are returned rather than
   routed, so they sit in front of the Hub without changing which page is
   under them, and no page route is ever gated behind them. */
function readHash() {
  const h = location.hash.replace(/^#\/?/, '');
  if (!h) return null;
  const [page, arg] = h.split('/');
  if (page === 'signin' || page === 'console') {
    return { kind: page, arg: arg ? decodeURIComponent(arg) : null };
  }
  if (PAGES[page]) { app.page = page; app.arg = arg ? decodeURIComponent(arg) : null; }
  return null;
}

/* ------------------------------------------------------------------ doors */

function toGate(kind, arg = null) {
  const hash = `#/${kind}${arg ? '/' + encodeURIComponent(arg) : ''}`;
  if (location.hash !== hash) location.hash = hash; else openGate(kind, arg);
}

async function openGate(kind, arg = null, note = false) {
  closeMenu(); closeSheet(); Chooser.hide();
  const inds = app.cfg.industries.industries;
  if (kind === 'console') {
    /* one client's own Hub has no other clients to show */
    if (app.s.tenant) { go('home'); return; }
    const base = document.body.dataset.base || '';
    await Promise.all(inds.filter(i => !app.data[i.id])
      .map(i => loadData(i.id, base).then(d => { app.data[i.id] = d; })));
    const rows = Gate.clients(app.cfg, app.data, app.s.data.roles);
    /* Elevate's screen wears Elevate's own brand, not whichever client is loaded */
    const b = app.cfg.brands.brands;
    app.s.apply(b.elevate || b.default || app.s.data.brand);
    document.title = `Elevate console · ${app.s.data.productName}`;
    Gate.show(Gate.console_({ cfg: app.cfg, rows, display: U.display }), 'console');
    return;
  }
  const id = arg && inds.find(i => i.id === arg) ? arg : app.s.data.industry;
  if (id !== app.s.data.industry) { app.s.useIndustry(id); await useIndustry(id); }
  app.s.apply();
  Gate.show(Gate.signin({ cfg: app.cfg, s: app.s, q: app.q, ind: app.s.industry,
    tenant: !!app.s.tenant, note }), 'signin');
}

function closeGate() {
  Gate.hide();
  app.s.apply();
}

/* Into the Hub as someone. Only the view level and the session are set here:
   which pages, which units and whether money shows are still settings.js,
   query.js and fmt.js. A landing page the level is not offered falls back to
   the first page it is. */
async function enterAs(industry, roleId, session, lands) {
  if (industry && industry !== app.s.data.industry) {
    app.s.useIndustry(industry);
    await useIndustry(industry);
  }
  app.s.data.role = roleId;
  app.s.data.entity = '*';
  app.s.data.session = session;
  app.s.save();
  closeGate();
  const ids = app.s.pages().map(p => p.id);
  go(ids.includes(lands) ? lands : (ids[0] || 'home'));
}

function startPresenting() {
  closeMenu();
  closeSheet();
  const ok = Present.enter({ s: app.s, pageId: () => app.page });
  if (!ok) {
    /* a page with nothing to present says so rather than blanking */
    const host = document.getElementById('page');
    host.insertAdjacentHTML('afterbegin',
      `<div id="demo-note">${icon('flag', 15)}<span>There is nothing on this page to present.</span>
       <button data-act="hide-note">\u00d7</button></div>`);
  }
}

function openChooser(firstTime = false) {
  if (app.s.tenant) return;   /* one client's Hub has no other companies to choose */
  Chooser.show(app.cfg, async id => {
    if (id !== app.s.data.industry) {
      app.s.useIndustry(id);
      await useIndustry(id);
    } else {
      /* Picking the demo that is already loaded still has to be remembered.
         Construction is the default, so a first-time viewer who picks the
         first card used to leave no record of having chosen at all, and every
         reload put the front door back over whatever page they were on
         (measured on the live site 2026-10-31). Choosing is the event worth
         saving, not changing. */
      app.s.save();
    }
    /* ⛔ Start here, on EVERY pick, including the company already loaded.
       Matt, 2026-11-02: *"when i click on a new company type from start here,
       it doesnt take me to the new start here, it links to the financial
       dashboard screen...i dont like that flow"*. The navigation used to sit
       inside the changed-industry branch, so picking the card you were already
       on dropped you back wherever you had been, usually the dashboard. A card
       on the front door promises that company's front door, and it should keep
       that promise whichever card you press. */
    go('home');
    render();
  }, firstTime ? null : app.s.data.industry);
}

function go(page, arg = null) {
  app.page = page; app.arg = arg;
  const hash = `#/${page}${arg ? '/' + encodeURIComponent(arg) : ''}`;
  if (location.hash !== hash) location.hash = hash; else render();
}

/* ------------------------------------------------------------------ render */

function render() {
  const s = app.s, q = app.q;
  F.setMoneyLevel(s.role.money);
  q.setView({ role: s.role, entity: s.data.entity, basis: s.data.basis, month: s.data.month });

  const pages = s.pages();
  /* the employee profile is a drill-down too, offered to whoever can open the directory */
  const drill = app.page === 'ops-detail' || (app.page === 'hr-person' && pages.find(p => p.id === 'hr-directory'));
  if (!pages.find(p => p.id === app.page) && !drill) {
    app.page = pages[0] ? pages[0].id : 'home';
  }

  document.getElementById('rail').innerHTML = rail(pages);
  document.getElementById('tabs').innerHTML = tabs(pages);
  document.getElementById('bar').innerHTML = bar();

  const ctx = { q, s, cfg: app.cfg, arg: app.arg, subtab: app.subtab, go,
    strip: stripIds(), docsAt: app.docsAt, docsBy: app.docsBy, tasks: taskState(),
    detailFrom: app.detailFrom };
  const host = document.getElementById('page');
  let html = '';
  try {
    const gap = unconnected(app.page);
    html = gap ? notConnected(gap) : (PAGES[app.page] || PAGES.home)(ctx);
  } catch (err) {
    html = `<section class="panel"><div class="empty">
      <b>That page could not be drawn.</b><br>${esc(err.message)}</div></section>`;
    console.error(err);
  }
  host.innerHTML = (s.data.showDemoNote && app.q.data.meta.notice ? demoNote() : '') + html;
  C.wire(host);
  U.wireStrip(host, (slot, id) => { placeKpi(slot, id); render(); });
  hrWire(host, render);
  World.arm(host);
  /* After the markup is in and the charts are wired, so the measurement sees
     real geometry. Again on resize, because a row that fits at 1440 can be
     wildly mismatched at 900 once the columns reflow. */
  balanceRows();
  if (Present.isOn()) Present.collect();
  host.scrollIntoView({ block: 'start' });
  window.scrollTo({ top: 0 });
}

/* A page whose source sends nothing says so, and never draws a sample figure in
   its place. The demo carries every section, so this only ever fires on a real
   company's build (build.py --tenant), where budget, unit facts, people and
   documents stay empty until a source supplies them. */
const NEEDS = {
  'fin-budget': ['budget', 'a budget', 'finance'],
  'people-home': ['people', 'payroll and headcount', 'people'],
  ...Object.fromEntries(['hr-home', 'hr-inbox', 'hr-attendance', 'hr-payroll', 'hr-directory', 'hr-time', 'hr-hiring', 'hr-compliance', 'hr-reviews', 'hr-org', 'hr-talent', 'hr-onboarding', 'hr-reports']
    .map(id => [id, ['people', 'employee records', 'people']])),
  'pipeline-home': ['pipeline', 'the pipeline', 'crm'],
  'docs-home': ['docs', 'documents', 'docs'],
  'fin-close': ['closedThrough', 'a close record', 'finance'],
};

function unconnected(page) {
  const d = app.q.data;
  const need = NEEDS[page] || (page.startsWith('ops-') ? ['unitFacts', `the ${app.s.industry.unit.many}`, 'systems'] : null);
  if (!need) return null;
  const v = need[0] in d ? d[need[0]] : d.meta[need[0]];
  const empty = !v || (typeof v === 'object' && !Object.keys(v).length)
    || (need[0] === 'unitFacts' && !(d.units || []).length);
  return empty ? { what: need[1], cat: need[2] } : null;
}

function notConnected({ what, cat }) {
  const c = (app.cfg.connectors.categories || []).find(x => x.id === cat);
  const name = (app.cfg.product.pages[app.page] || {}).name || 'This page';
  return U.pageHead({ eyebrow: 'Not connected', title: name,
    answer: `Nothing is connected that sends ${esc(what)}, so this page shows no figures rather than a guess.` }) +
    `<div class="grid">` + U.panel({
      col: 12, title: 'What fills this page', ico: 'link',
      note: c ? esc(c.name) : '',
      right: U.btn('Integrations', { act: 'go', arg: 'settings', sm: true }),
      body: `<div class="empty"><b>Not connected.</b><br>${c ? esc(c.blurb) : ''}
        Once a source sends ${esc(what)}, the next build draws it here.</div>`,
    }) + `</div>`;
}

function demoNote() {
  return `<div id="demo-note">${icon('flag', 15)}
    <span>${esc(app.q.data.meta.notice)}</span>
    <button data-act="hide-note" aria-label="Hide">×</button></div>`;
}

function rail(pages) {
  const s = app.s;
  const who = s.data.session;
  const mods = s.modulesWithPages();
  const open = (PAGES[app.page] && app.cfg.product.pages[app.page])
    ? app.cfg.product.pages[app.page].module : 'start';
  return `<div class="rail-head">
      <span class="rail-mark">${s.data.brand.logo
      ? `<img src="${esc(s.data.brand.logo)}" alt="">` : brandMark(s.data.brand, 34)}</span>
      <div><div class="rail-name">${esc(s.data.company)}</div>
        <div class="rail-sub">${esc(s.data.productName)}</div></div>
    </div>
    <div class="rail-places">
      ${mods.map(m => `<button class="place" data-act="go" data-arg="${esc(m.pages[0].id)}"
        aria-current="${m.id === open}">
        <span class="place-ico">${icon(m.pages[0].icon || 'grid', 18)}</span>
        <span>${esc(m.name)}</span>
        ${m.pages.length > 1 ? `<span class="place-count">${m.pages.length}</span>` : ''}
      </button>`).join('')}
    </div>
    <div class="rail-foot">
      ${who && who.kind === 'person' ? `<b>${esc(who.name)}</b><br>` : ''}
      <b>${esc(s.role.name)}</b><br>
      ${esc(Gate.scopeWord(s.role))} · ${esc(Gate.moneyWord(s.role))}
      <button class="rail-switch" data-act="${who && who.kind === 'staff' ? 'console' : who ? 'sign-out' : 'signin'}">
        ${icon(who && who.kind === 'staff' ? 'shield' : 'lock', 14)}
        ${who && who.kind === 'staff' ? 'Back to the Elevate console' : who ? 'Sign out' : 'Demo sign-in'}</button>
    </div>`;
}

function tabs(pages) {
  const open = app.cfg.product.pages[app.page]
    ? app.cfg.product.pages[app.page].module
    : (app.page === 'ops-detail' ? 'ops' : 'start');
  const mine = pages.filter(p => p.module === open);
  const mod = app.cfg.product.modules[open];
  if (!mine.length) return '';
  /* An open unit gets a tab of its own, with a close on it.

     Matt, 2026-11-02: *"when i click into one of these objects, it takes me to
     a screen that is just out in the ether with no tab or way to get back and
     it feels completely separated from everything"*. He is right: `ops-detail`
     is a hidden page, so the strip drew Operations' tabs with NONE of them
     current and no sign of where he actually was. A drill-down is a place, and
     a place needs a tab. */
  let open_unit = '';
  if (app.page === 'ops-detail' && app.arg && app.q) {
    const u = (app.q.units || []).find(x => x.id === app.arg)
      || (app.q.allUnits || []).find(x => x.id === app.arg);
    if (u) {
      const back = app.detailFrom && app.cfg.product.pages[app.detailFrom]
        ? app.detailFrom : (mine[0] && mine[0].id);
      open_unit = `<span class="tab open-unit" aria-current="true">
        ${esc(u.short || u.name)}
        <button class="tab-x" data-act="go" data-arg="${esc(back)}"
          aria-label="Close ${esc(u.short || u.name)}">${icon('close', 12)}</button></span>`;
    }
  }
  if (app.page === 'hr-person' && app.arg && app.q) {
    const hr = (app.q.data.people || {}).hr;
    const r = hr && hr.roster.find(x => x.id === app.arg);
    if (r) {
      const back = app.detailFrom && app.cfg.product.pages[app.detailFrom] && app.detailFrom !== 'hr-person'
        ? app.detailFrom : 'hr-directory';
      open_unit = `<span class="tab open-unit" aria-current="true">${esc(r.n)}
        <button class="tab-x" data-act="go" data-arg="${esc(back)}"
          aria-label="Close ${esc(r.n)}">${icon('close', 12)}</button></span>`;
    }
  }
  return `<div class="tabs-title">${esc(mod ? mod.name : '')}</div>` + open_unit +
    mine.map(p => `<button class="tab" data-act="go" data-arg="${esc(p.id)}"
      aria-current="${p.id === app.page}">${esc(p.name)}</button>`).join('') +
    (open === 'settings' ? '' : `<hr class="r">
      <div class="tabs-title">Period</div>
      <button class="tab opens" data-act="menu" data-arg="month" aria-haspopup="listbox"
        aria-current="false"><span>${esc(F.monthName(app.s.data.month, true))}</span>
        ${icon('caret', 13)}</button>`);
}

function bar() {
  const s = app.s, q = app.q;
  const ents = [{ id: '*', name: allLabel(q) }, ...q.entities];
  const ent = ents.find(e => e.id === (s.data.entity || '*')) || ents[0];
  const moves = q.basisMoves(app.page);

  const who = s.data.session;
  return `<button class="btn ghost sm menu-toggle" data-act="rail-toggle">${icon('menu', 18)}</button>
    ${who && who.kind === 'staff' ? `<button class="pill pill-back" data-act="console"
      title="Back to every client">${icon('arrow', 14)}<span class="pill-label">Elevate</span><b>Console</b></button>` : ''}
    <button class="pill" data-act="menu" data-arg="entity" aria-expanded="${app.menu === 'entity'}">
      <span class="pill-mark">${brandMark(s.data.brand, 18)}</span>
      <span class="pill-label">Company</span><b>${esc(short(ent.name))}</b>${caret()}
    </button>
    <button class="pill" data-act="menu" data-arg="month" aria-expanded="${app.menu === 'month'}">
      <span class="pill-label">As of</span><b>${esc(F.monthName(s.data.month, true))}</b>
      ${s.data.month > q.closed ? `<span class="tag warn" style="padding:1px 7px">tentative</span>` : ''}
      ${caret()}
    </button>
    <div class="basis" role="group" aria-label="Basis">
      ${BASIS.map(b => {
    const dead = !moves && b.id !== 'month';
    return `<button data-act="basis" data-arg="${b.id}" aria-pressed="${s.data.basis === b.id}"
          ${dead ? 'disabled title="This page reads a position as of its month, so a window would not change a figure on it"' : ''}
        >${b.name}</button>`;
  }).join('')}
    </div>
    <span class="bar-gap"></span>
    <button class="pill" data-act="menu" data-arg="role" aria-expanded="${app.menu === 'role'}">
      ${who && who.kind === 'person'
    ? `<span class="pill-label">Signed in</span><b>${esc(who.name)}</b>`
    : `<span class="pill-label">Viewing as</span><b>${esc(s.role.name)}</b>`}${caret()}
    </button>
    <span class="bar-tools">
      <button class="btn ghost sm" data-act="theme-toggle" title="Light or dark">
        ${icon(s.data.theme === 'dark' ? 'sun' : 'moon', 17)}</button>
      <button class="btn ghost sm" data-act="present" title="Present this page, one panel at a time">
        ${icon('grid', 17)}</button>
      <button class="btn ghost sm" data-act="print" title="Print this page">${icon('print', 17)}</button>
      <button class="btn ghost sm" data-act="go" data-arg="settings" title="Settings">${icon('gear', 17)}</button>
    </span>`;
}

/* One company is not "all 1 companies". */
function allLabel(q) {
  const n = q.entities.length;
  return n === 1 ? 'The whole company' : `All ${n} companies`;
}

function short(name) {
  return name.length > 26 ? name.slice(0, 24) + '…' : name;
}

function caret() {
  return `<svg class="caret" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6">
    <path d="M2 4l3 3 3-3"/></svg>`;
}

/* ------------------------------------------------------------------ menus */

/* What the viewer has marked done or snoozed on What needs you.

   Wrapped because a private window throws on localStorage rather than
   returning null, and a page that cannot read a convenience must still draw. */
const TASK_KEY = 'hub.tasks.v1';
function taskState() {
  if (app.tasks) return app.tasks;
  try { app.tasks = JSON.parse(localStorage.getItem(TASK_KEY) || '{}') || {}; }
  catch { app.tasks = {}; }
  return app.tasks;
}

/* Un-stretch a panel that cannot honestly fill its row.

   `.grid` stretches its children so a row's cards share one bottom edge, which
   is what removes the gap Matt kept seeing. But a card stretched far past its
   own content is a worse defect than the gap: it is the 830px hole the Core BI
   audit found, and this build has rows 1,792px apart.

   ⛔ MEASURE FROM THE LEAVES, NEVER FROM A CONTAINER. The panel's body is
   stretched too, so asking it how tall its content is returns the stretched
   height and the check can never fire. The lowest bottom edge of any element
   that actually draws something is the only honest answer.

   The threshold is a screenful: a card with more than 320px of nothing under
   its content reads as broken, and below that reads as a card. */
function balanceRows() {
  const host = document.getElementById('page');
  if (!host) return;
  const panels = [...host.querySelectorAll('.grid > .panel')];
  for (const panel of panels) panel.classList.remove('unstretch', 'roomy', 'go-wide');

  /* ⛔ A PANEL FAR TALLER THAN ITS NEIGHBOUR TAKES THE WHOLE ROW.

     Margin & drivers was fixed by a rule in the page: past eighteen rows, the
     list and the chart stop sharing a row. The publishing session measured the
     next page over and found the same defect wearing a different shape:
     logistics' ops-grid pairs a 2,284px small-multiples GRID with a 591px
     table, and "past eighteen rows" never fires on it because it is not a row
     list at all.

     A rule written in terms of what a panel CONTAINS only ever covers the
     shapes someone thought of. This one is written in terms of what a panel
     MEASURES, so it covers the next shape too: if a row's tallest panel is
     more than twice its shortest and over 900px, it takes the full width and
     the others fall below it. Nothing is stretched to fill, because that is
     the dishonest fill the un-stretch guard exists to refuse. */
  const byTop = new Map();
  for (const panel of panels) {
    const top = Math.round(panel.getBoundingClientRect().top);
    let key = [...byTop.keys()].find(k => Math.abs(k - top) < 8);
    if (key === undefined) { key = top; byTop.set(key, []); }
    byTop.get(key).push(panel);
  }

  /* ⛔ MEASURE NATURAL HEIGHTS, NOT STRETCHED ONES.

     `.grid` stretches its children, so every panel in a row already reports
     the row's height and a comparison between them can never find a mismatch.
     The first cut of this rule looked correct, ran on every page, and fired
     exactly zero times: logistics' ops-grid reported 2,284 against 2,284 for a
     pair that is really 2,284 against 591. Un-stretch everything first, read
     the heights the content actually wants, then put the stretch back. */
  for (const panel of panels) panel.classList.add('unstretch');
  void host.offsetHeight;
  const natural = new Map(panels.map(p => [p, p.getBoundingClientRect().height]));
  for (const panel of panels) panel.classList.remove('unstretch');

  let widened = false;
  for (const row of byTop.values()) {
    if (row.length < 2) continue;
    const hs = row.map(p => natural.get(p) || 0);
    const tall = Math.max(...hs), short = Math.min(...hs);
    /* ⛔ The trigger is a PROPORTION AND A GAP, not a shape and not a size.

       It began as "taller than 900px and more than twice the shortest", which
       caught the one catastrophic row and left six ordinary ones: a 1,110px
       grid beside a 591px table at 1.88x, a 632px list beside a 241px scatter
       that is nowhere near 900px. Every one of the six is the same thing, a
       list whose length follows the unit count sitting beside a chart whose
       height is fixed, and a per-unit list can never match a fixed chart.

       ⚠️ The first version of this comment claimed the two numbers separate "a
       row with some room in it" from "a row with a hole in it". That reading
       was wrong, and the publishing session was right to attack it: the gaps
       in the build stop at 233px against a 250px floor, which is the shape of
       a constant fitted to its own data. What the measurement actually shows
       is that the HOLE is closed somewhere else entirely, by the centre-or-end
       rule below, at every size and regardless of this bound. Of 43 ragged
       rows, 34 are centred and 9 end at their content, none leaving more than
       134px of white.

       So this rule is not the dead-space rule and must not be justified as
       one. It answers a narrower question: a list whose length follows the
       unit count makes a fixed-height chart beside it look like a footnote,
       whatever the white space does. Measured against three candidates derived
       from the viewport instead of the data, this bound selects five rows and
       all five are that shape (1.88x to 3.86x, 550px to 2,284px); the derived
       bounds select one or two and leave the 2.3x cases paired. A bound that
       picks the right set is worth keeping even when its origin was a fitted
       number, as long as the comment says which it is. Lowering it further is
       now a question of taste, not a defect, because nothing depends on it to
       close a hole. */
    if (tall - short < 250 || tall < short * 1.6) continue;
    row[hs.indexOf(tall)].classList.add('go-wide');
    widened = true;
  }
  /* The widened panel reflows everything under it, so the stretch decisions
     below are made against the layout the reader will actually see. */
  if (widened) void host.offsetHeight;
  for (const panel of panels) {
    /* ⛔ Measure the BODY against its own content, not the panel against its
       lowest child.

       The panel's foot is pinned to the bottom edge by `margin-top: auto`, so
       the lowest drawing child of a stretched panel IS its bottom edge and the
       slack reads zero however empty the card is. I wrote the warning about
       measuring from leaves and then walked into it anyway: the first cut of
       this guard never fired once, and left 1,810px of empty body on
       logistics' Margin & drivers while every measurement said the page was
       clean. The body is the part that is actually asked to stretch, so the
       body is the part to measure. */
    const body = panel.querySelector('.panel-body');
    if (!body) continue;
    const box = body.getBoundingClientRect();
    if (box.height < 40) continue;
    let low = box.top;
    for (const kid of body.querySelectorAll('*')) {
      const k = kid.getBoundingClientRect();
      if (!k.height && !k.width) continue;
      if (k.bottom > low) low = k.bottom;
    }
    /* Three states, because two were not enough. A card stretched a long way
       past its content should shrink; a card stretched a little is fine; and
       in between, the content should sit in the MIDDLE of the room it was
       given rather than clinging to the top with all the empty space pooled
       underneath. A bar chart with 280px of white below it is what Matt keeps
       pointing at, and it reads as a hole. The same 280px split above and
       below the chart reads as a card with room in it.

       ⛔ BUT NOT EVERY BODY CAN BE CENTRED, AND THE ONES THAT CANNOT HAVE NO
          THIRD OPTION, SO THEY GET THE SECOND ONE EARLY.

       A table or a row list has to start at the top: a table floating in the
       middle of its card reads as a mistake, which is why the stylesheet
       refuses to centre one. The refusal was silent, so those cards took the
       `roomy` class, ignored it, and kept the whole gap pooled underneath.
       Measured across the 120 combinations: of 43 ragged rows, 34 were
       centred and absorbed (worst residue 134px) and the nine the stylesheet
       excluded held 152px to 251px of pooled white, which is the hole Matt
       raised three times. The 250px widen bound never came into it.

       So the question is not how big the gap is but whether the room can be
       SHARED. Where it can, share it. Where it cannot, end the card where its
       content ends and let the row sit honestly ragged. The stylesheet stays
       the only list of what cannot be centred, and this reads the answer back
       off the computed style rather than keeping a copy of the list, because
       two mechanisms deciding one question is how they drift apart. */
    const gap = box.bottom - low;
    if (gap <= 70) continue;
    if (gap > 320) { panel.classList.add('unstretch'); continue; }
    panel.classList.add('roomy');
    const cs = getComputedStyle(body);
    if (cs.display !== 'flex' || cs.justifyContent !== 'center') {
      panel.classList.remove('roomy');
      panel.classList.add('unstretch');
    }
  }
}

/* Put a menu where it fits.

   The first cut set `top` to the anchor's bottom, clamped so the menu's whole
   height stayed on screen. With thirty months in a list that is 570px tall,
   the clamp dragged the menu UP until it covered the control that opened it
   and most of the page behind it, which is what made these read as unfinished.

   A menu belongs under its control. If there is not enough room under it, it
   goes above it; if neither side has room, it takes the larger side and
   SCROLLS inside itself rather than growing. So the height is set from the
   space actually available, never from the number of rows. */
function place(el, anchor) {
  const box = anchor.getBoundingClientRect();
  const gap = 6, edge = 10;
  const below = window.innerHeight - box.bottom - gap - edge;
  const above = box.top - gap - edge;
  const down = below >= Math.min(el.scrollHeight, 260) || below >= above;
  const room = Math.max(140, Math.floor(down ? below : above));
  el.style.maxHeight = `${Math.min(room, 440)}px`;
  el.style.top = down ? `${Math.round(box.bottom + gap)}px`
    : `${Math.round(box.top - gap - Math.min(el.offsetHeight, room))}px`;
  el.style.left = `${Math.round(Math.max(edge,
    Math.min(box.left, window.innerWidth - el.offsetWidth - edge)))}px`;
}

function openMenu(kind, anchor) {
  closeMenu();
  app.menu = kind;
  const el = document.createElement('div');
  el.className = 'menu';
  el.id = 'menu';
  el.innerHTML = menuBody(kind);
  document.body.appendChild(el);
  place(el, anchor);
  const first = el.querySelector('.menu-item');
  if (first) first.focus();
  document.getElementById('bar').innerHTML = bar();
}

/* The five ids the strip carries. A client's choice wins, the industry's own
   list is the default, and an id the current industry cannot resolve is
   dropped rather than rendered as a dash: switching industries leaves stale
   ids behind, and a strip of dashes reads as a broken build. */
/* Put a metric in a slot. ⛔ If it already sits in another slot the two SWAP
   rather than the metric appearing twice: a strip showing the same figure in
   two places is a worse strip than the one the client started with, and
   nothing about "pick what goes here" implies "and lose what you had". Both
   routes into this choice, the strip's own picker and the settings console,
   go through here so they cannot behave differently. */
function placeKpi(slot, id) {
  const next = stripIds();
  const already = next.indexOf(id);
  if (already > -1 && already !== slot) next[already] = next[slot];
  next[slot] = id;
  app.s.data.kpiStrip = next;
  app.s.save();
}

/* Put a person at a level. Shared by the Add button and the Enter key, so the
   two cannot behave differently. */
function addPerson(roleId) {
  const box = document.querySelector(`[data-person="${roleId}"]`);
  const who = (box?.value || '').trim();
  if (!who) { box?.focus(); return; }
  const r = app.s.data.roles.find(x => x.id === roleId);
  if (!r) return;
  r.people = [...(r.people || []), who];
  app.s.save(); render();
}

function stripIds() {
  const q = app.q, ok = new Set(q.kpiIds());
  const want = (app.s.data.kpiStrip || []).filter(id => ok.has(id));
  const fill = (app.q.ind.kpis || []).filter(id => ok.has(id) && !want.includes(id));
  return [...want, ...fill].slice(0, 5);
}

function menuBody(kind) {
  const s = app.s, q = app.q;
  if (kind && kind.startsWith('kpi:')) {
    /* Which figure sits in this slot. A client swaps any of the five for any
       metric their industry resolves, and the choice exports with the rest of
       the configuration, so the next deployment opens on their figures and not
       on ours. */
    const slot = Number(kind.slice(4));
    const chosen = stripIds();
    return `<div class="menu-head">Show in this slot</div>` + q.kpiIds().map(id => {
      const k = q.kpi(id);
      const elsewhere = chosen.indexOf(id);
      return `<button class="menu-item" data-act="pick-kpi" data-arg="${slot}:${esc(id)}"
        aria-selected="${chosen[slot] === id}">
        <span>${esc(k.label)}<small>${esc(U.display(k))}${
        elsewhere > -1 && elsewhere !== slot ? ` · swaps with slot ${elsewhere + 1}` : ''}</small></span>
      </button>`;
    }).join('');
  }
  if (kind === 'entity') {
    const rows = [{ id: '*', name: allLabel(q), kind: 'Consolidated' }, ...q.entities];
    const allowed = s.role.scope === 'all';
    return `<div class="menu-head">Company</div>` + rows.map(e => {
      const dead = !allowed && e.id === '*';
      return `<button class="menu-item" data-act="pick-entity" data-arg="${esc(e.id)}"
        aria-selected="${(s.data.entity || '*') === e.id}" ${dead ? 'disabled' : ''}>
        <span class="pill-mark">${brandMark(s.data.brand, 18)}</span>
        <span>${esc(e.name)}<small>${esc(dead ? 'Not at this view level' : (e.kind || ''))}</small></span>
      </button>`;
    }).join('');
  }
  if (kind === 'month') {
    /* Thirty months as thirty identical two-line rows is a wall, not a list:
       nothing tells you where you are in it, and the sign-off state repeated
       thirty times is noise on every row but the few that differ. Grouped by
       year with a heading that sticks while you scroll, one line per month,
       and the state as a short tag on the right. */
    const months = q.months.slice().reverse();
    let out = `<div class="menu-head">As of</div>`;
    let year = null;
    for (const m of months) {
      const y = m.slice(0, 4);
      if (y !== year) { year = y; out += `<div class="menu-year">${esc(y)}</div>`; }
      const open = m > q.closed;
      out += `<button class="menu-item tight" data-act="pick-month" data-arg="${m}"
        aria-selected="${s.data.month === m}">
        <span class="mi-n">${esc(F.monthName(m, true).replace(` ${y}`, ''))}</span>
        <span class="mi-tag${open ? ' warn' : ''}">${open ? 'tentative' : 'signed off'}</span>
      </button>`;
    }
    return out;
  }
  if (kind === 'role' && s.data.session && s.data.session.kind === 'person') {
    /* A signed-in person is their level. Seeing another means signing in as
       someone else, the way it would in a deployment. */
    const who = s.data.session;
    return `<div class="menu-head">Signed in</div>
      <div class="menu-who"><b>${esc(who.name)}</b><small>${esc(who.title)}</small>
        <small>${esc(s.role.name)} · ${esc(Gate.scopeWord(s.role))} · ${esc(Gate.moneyWord(s.role))}</small></div>
      <div class="menu-sep"></div>
      <button class="menu-item" data-act="sign-out"><span>Sign out<small>Back to the sign-in, to pick someone else</small></span></button>`;
  }
  if (kind === 'role') {
    return `<div class="menu-head">View level</div>` + s.data.roles.map(r =>
      `<button class="menu-item" data-act="pick-role" data-arg="${esc(r.id)}"
        aria-selected="${s.data.role === r.id}">
        <span>${esc(r.name)}<small>${esc((r.titles || []).slice(0, 3).join(', '))}</small></span>
      </button>`).join('') +
      `<div class="menu-sep"></div>
       <button class="menu-item" data-act="go" data-arg="settings"><span>Edit the levels…</span></button>`;
  }
  return '';
}

function closeMenu() {
  const el = document.getElementById('menu');
  if (el) el.remove();
  app.menu = null;
}

function openSheet(html) {
  let wrap = document.getElementById('sheet-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'sheet-wrap';
    document.body.appendChild(wrap);
  }
  wrap.hidden = false;
  wrap.innerHTML = html;
}

function closeSheet() {
  const wrap = document.getElementById('sheet-wrap');
  if (wrap) { wrap.hidden = true; wrap.innerHTML = ''; }
}

/* ----------------------------------------------------------------- events */

async function onClick(ev) {
  const row = ev.target.closest('[data-click]');
  const el = ev.target.closest('[data-act]');

  if (!el && !row) {
    if (app.menu && !ev.target.closest('#menu')) closeMenu();
    if (ev.target.id === 'sheet-wrap') closeSheet();
    return;
  }

  if (row && !el) {
    const [kind, arg] = row.dataset.click.split(':');
    if (kind === 'unit') { app.detailFrom = app.page; go('ops-detail', arg); }
    if (kind === 'person') { if (app.page !== 'hr-person') app.detailFrom = app.page; go('hr-person', arg); }
    return;
  }

  const act = el.dataset.act, arg = el.dataset.arg;
  switch (act) {
    case 'go': closeMenu(); closeSheet(); go(arg); break;
    case 'chooser':
      closeMenu(); closeSheet();
      /* from the console, the front door replaces it rather than sitting on it */
      if (Gate.open()) { closeGate(); history.replaceState(null, '', `#/${app.page}`); render(); }
      openChooser(); break;
    case 'ec-ind': Gate.only(arg); break;
    case 'ec-sort': Gate.sort(arg); break;
    case 'console': closeMenu(); closeSheet(); toGate('console'); break;
    case 'signin': closeMenu(); closeSheet(); toGate('signin', arg || app.s.data.industry); break;
    case 'ms-signin': openGate('signin', app.s.data.industry, true); break;
    case 'signin-as': {
      const p = Gate.people(app.cfg, app.s.data.roles, app.s.industry)[Number(arg)];
      if (p) await enterAs(null, p.role, { kind: 'person', name: p.name, title: p.title }, p.lands);
      break;
    }
    case 'staff-enter': {
      Gate.remember(arg);
      const top = Gate.topRole(app.s.data.roles);
      await enterAs(arg, top.id, { kind: 'staff' }, 'fin-dash');
      break;
    }
    case 'sign-out':
      delete app.s.data.session; app.s.save(); closeMenu();
      toGate('signin', app.s.data.industry); break;
    /* Clicking the control that opened a menu CLOSES it. Matt: *"when i click
       this dropdown, reclicking the line doesnt collapse it....and it should"*.
       It never could: this called openMenu, which closes and immediately
       reopens, so the menu blinked and stayed. (Measured in the harness as a
       click that never lands at all, because the open menu covers its own
       trigger and swallows the pointer.) */
    case 'menu':
      if (app.menu === arg) { closeMenu(); document.getElementById('bar').innerHTML = bar(); break; }
      openMenu(arg, el); break;
    case 'rail-toggle': document.getElementById('rail').classList.toggle('open'); break;
    case 'pick-entity': app.s.data.entity = arg; app.s.save(); closeMenu(); render(); break;
    case 'pick-month': app.s.data.month = arg; app.s.save(); closeMenu(); render(); break;
    case 'pick-role': app.s.data.role = arg; app.s.save(); closeMenu(); render(); break;
    case 'pick-kpi': {
      const [slot, id] = arg.split(':');
      placeKpi(Number(slot), id);
      closeMenu(); render(); break;
    }
    case 'try-role': app.s.data.role = arg; app.s.save(); go('fin-dash'); break;
    case 'basis': app.s.data.basis = arg; app.s.save(); render(); break;
    /* Where the Documents browser is standing. It is view state, not a setting,
       so it lives on the app rather than in the saved deployment: a client's
       config file should not remember which folder somebody had open. */
    case 'docs-open': app.docsAt = arg || ''; render(); break;
    /* Which level is the root of the browser. View state, like docsAt: a
       client's saved configuration should not remember how somebody last
       sorted their folders. Changing the order returns to the root, because a
       path in one order means nothing in the other. */
    case 'docs-by': app.docsBy = arg; app.docsAt = ''; render(); break;
    /* Done and Snooze on What needs you.

       ⛔ This is the ONE place in the build that keeps state the data does not
       produce, and it keeps it in the viewer's own browser because a static
       page has nowhere else. The page says so in as many words. It is NOT in
       the saved deployment: a client's configuration file must not carry one
       person's half-worked task list, and a second viewer must not inherit it.
       A real deployment writes this where every viewer reads the same list. */
    case 'task': {
      const [what, id, tag] = arg.split(':');
      const key = `${id}:${tag}`;
      const next = { ...taskState() };
      if (next[key] === what) delete next[key]; else next[key] = what;
      try { localStorage.setItem(TASK_KEY, JSON.stringify(next)); } catch { /* private window */ }
      app.tasks = next;
      render();
      break;
    }
    case 'theme': app.s.data.theme = arg; app.s.save().apply(); render(); break;
    case 'theme-toggle':
      app.s.data.theme = app.s.data.theme === 'dark' ? 'light' : 'dark';
      app.s.save().apply(); render(); break;
    case 'print': window.print(); break;
    case 'present': startPresenting(); break;
    case 'present-next': Present.next(); break;
    case 'present-prev': Present.prev(); break;
    case 'present-exit': Present.exit(); break;
    case 'level-add': {
      /* A new level starts between the two least senior, because a level
         someone adds is nearly always a narrower one, and it must not land
         above the owner by accident. */
      const rs = app.s.data.roles.slice().sort((a, b) => b.rank - a.rank);
      const low = rs[rs.length - 1], above = rs[rs.length - 2] || low;
      app.s.data.roles.push({
        id: `level-${Date.now().toString(36)}`,
        name: 'New level', titles: [],
        rank: Math.max(1, Math.round((low.rank + above.rank) / 2)),
        scope: low.scope, money: low.money, people: [],
      });
      app.s.save(); render(); break;
    }
    case 'level-del': {
      app.s.data.roles = app.s.data.roles.filter(r => r.id !== arg);
      if (app.s.data.role === arg) app.s.data.role = app.s.data.roles[0].id;
      app.s.save(); render(); break;
    }
    case 'level-up':
    case 'level-down': {
      /* Seniority is the ORDER, so moving a level swaps its rank with its
         neighbour's. The number exists for the engine and is never shown. */
      const rs = app.s.data.roles.slice().sort((a, b) => b.rank - a.rank);
      const at = rs.findIndex(r => r.id === arg);
      const to = at + (act === 'level-up' ? -1 : 1);
      if (at < 0 || to < 0 || to >= rs.length) break;
      const a = rs[at], b = rs[to];
      const keep = a.rank; a.rank = b.rank; b.rank = keep;
      app.s.save(); render(); break;
    }
    case 'person-add': addPerson(arg); break;
    case 'person-del': {
      const [rid, idx] = arg.split(':');
      const r = app.s.data.roles.find(x => x.id === rid);
      if (r && r.people) { r.people.splice(Number(idx), 1); app.s.save(); render(); }
      break;
    }
    case 'print-pack': printPack(arg); break;
    case 'hide-note': app.s.data.showDemoNote = false; app.s.save(); render(); break;
    case 'industry':
      app.s.useIndustry(arg);
      await useIndustry(arg);
      go('fin-dash'); render(); break;
    case 'settab': app.subtab = arg; render(); break;
    /* The HR screens' own view state (a picked inbox item, a payroll step, an org-chart move). */
    case 'hr': hrAct(arg); render(); break;
    case 'connect': {
      const c = app.s.connector(arg);
      if (c) openSheet(connectSheet(c, app.s));
      break;
    }
    case 'connect-go': app.s.setConnector(arg, true); closeSheet(); render(); break;
    case 'disconnect': app.s.setConnector(arg, false); render(); break;
    case 'sheet-close': closeSheet(); break;
    case 'module':
      app.s.data.modules[arg] = !app.s.data.modules[arg];
      app.s.save(); render(); break;
    case 'derive': {
      const hex = document.querySelector('[data-bind="accent-hex"]').value;
      app.s.data.brand.palette = paletteFrom(hex);
      app.s.save().apply(); render(); break;
    }
    case 'usebrand': {
      const b = app.cfg.brands.brands[arg];
      if (b) {
        app.s.data.brand = {
          ...app.s.data.brand, name: b.name, mono: b.mono, shape: b.shape,
          palette: { ...b.palette }, type: { ...b.type },
        };
        app.s.data.brandKey = arg;
        app.s.save().apply(); render();
      }
      break;
    }
    case 'logo-clear': app.s.data.brand.logo = null; app.s.save(); render(); break;
    case 'reset-settings':
      app.s.reset(app.s.data.industry);
      await useIndustry(app.s.data.industry);
      render(); break;
    case 'export-config':
      download(`${F.slug(app.s.data.company)}-hub-config.json`, app.s.exportJSON(), 'application/json');
      break;
    case 'import-config': {
      const box = document.getElementById('import-json');
      try {
        app.s.importJSON(box.value);
        await useIndustry(app.s.data.industry);
        render();
      } catch (err) {
        box.value = `Could not read that: ${err.message}\n\n` + box.value;
      }
      break;
    }
    case 'export-units': exportUnits(); break;
    case 'export-quarters': exportQuarters(); break;
    case 'export-pack': exportPack(arg); break;
    case 'sign': {
      const name = (app.q.entities.find(e => e.id === arg) || {}).name || arg;
      openSheet(`<div class="sheet">
        <div class="sheet-head"><div style="flex:1"><h3 style="font-size:17px">Sign off ${esc(name)}</h3>
          <div class="muted small">${esc(F.monthName(app.s.data.month, true))}</div></div></div>
        <div class="sheet-body">
          <p style="margin-top:0">In a live deployment this records your name, your role and the
          time against this company and this month, and the month stops being tentative for
          everyone the moment it is in.</p>
          <p class="muted small">A signature is not a filter: a reopening in the ledger voids it,
          and the page says so rather than carrying on as though the month were closed.</p>
        </div>
        <div class="sheet-foot"><button class="btn ghost" data-act="sheet-close">Close</button>
        ${U.btn('Understood', { act: 'sheet-close', kind: 'primary' })}</div></div>`);
      break;
    }
    default: break;
  }
}

function onChange(ev) {
  const el = ev.target;
  if (el.id === 'logo-file' && el.files && el.files[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      app.s.data.brand.logo = reader.result;
      app.s.save(); render();
    };
    reader.readAsDataURL(el.files[0]);
    return;
  }
  const bind = el.dataset.bind;
  if (!bind) return;
  if (bind === 'fontpair') {
    const f = FONT_PAIRS[Number(el.value)];
    if (f) {
      app.s.data.brand.type = { display: f.display, body: f.body, google: f.google };
      app.s.save().apply(); render();
    }
    return;
  }
  if (bind.startsWith('kpi.')) {
    /* A slot in the Start here strip, set from the settings console. The same
       store the strip's own picker writes, so the two cannot disagree. */
    placeKpi(Number(bind.split('.')[1]), el.value);
    render();
    return;
  }
  if (bind.startsWith('role.')) {
    const [, id, field] = bind.split('.');
    const role = app.s.roleById(id);
    if (role) {
      role[field] = field === 'rank' ? Number(el.value) : el.value;
      app.s.save(); render();
    }
    return;
  }
  if (bind.startsWith('pal.')) {
    app.s.data.brand.palette[bind.slice(4)] = el.value;
    app.s.save().apply();
    return;
  }
  if (bind === 'company') { app.s.data.company = el.value; app.s.save().apply(); return; }
  if (bind === 'brand.mono') { app.s.data.brand.mono = el.value.toUpperCase(); app.s.save(); render(); return; }
}

function onInput(ev) {
  const bind = ev.target.dataset.bind;
  if (!bind) return;
  if (bind === 'gate-search') { Gate.filter(ev.target.value); return; }
  if (bind === 'accent-pick' || bind === 'accent-hex') {
    const hex = ev.target.value;
    if (!/^#?[0-9a-f]{6}$/i.test(hex)) return;
    const h = hex.startsWith('#') ? hex : '#' + hex;
    app.s.data.brand.palette.accent = h;
    app.s.save().apply();
    const other = document.querySelector(`[data-bind="${bind === 'accent-pick' ? 'accent-hex' : 'accent-pick'}"]`);
    if (other) other.value = h;
    return;
  }
  if (bind.startsWith('pal.')) {
    app.s.data.brand.palette[bind.slice(4)] = ev.target.value;
    app.s.save().apply();
  }
}

/* ---------------------------------------------------------------- exports */

function download(name, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csv(rows) {
  return rows.map(r => r.map(c => {
    const v = c === null || c === undefined ? '' : String(c);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(',')).join('\n');
}

function exportUnits() {
  const q = app.q, ind = app.s.industry;
  const keys = ind.measures.map(m => m.id);
  const head = [ind.unit.key, 'Name', 'Status', 'Owner', 'Company', ...ind.measures.map(m => m.name)];
  const rows = q.unitRows().map(r => [r.id, r.name, r.status, r.owner, r.entity,
    ...keys.map(k => r.f[k] ?? '')]);
  download(`${F.slug(app.s.data.company)}-${ind.unit.many}-${app.s.data.month}.csv`,
    csv([head, ...rows]), 'text/csv');
}

function exportQuarters() {
  const q = app.q;
  const months = q.months;
  const rows = [['Quarter', 'Revenue', 'Gross profit', 'Gross margin %', 'EBITDA', 'Net income']];
  for (let i = months.length - 1; i >= 2 && rows.length <= 8; i -= 3) {
    const win = months.slice(i - 2, i + 1);
    const rev = q.sum('rev', win), gp = q.sum('gp', win);
    rows.splice(1, 0, [`Q${Math.ceil(Number(win[2].slice(5)) / 3)} ${win[2].slice(0, 4)}`,
      rev, gp, rev ? (gp / rev * 100).toFixed(2) : '', q.sum('ebitda', win), q.sum('ni', win)]);
  }
  download(`${F.slug(app.s.data.company)}-quarters.csv`, csv(rows), 'text/csv');
}

/* ⛔ Matt, 2026-11-02: *"your statement and packs section is printing csv's
   instead of PDF's"*. It was, and the page called them packs, which is a thing
   you hand to a bank. A static page cannot write a real PDF without pulling in
   a library, but it can PRINT one, which is how Core BI does it: a paper
   layout the browser renders and the reader saves as PDF.

   So the pack now has two honest doors. "Print or save as PDF" builds the
   paper layout and prints it. "Figures as CSV" is named for what it is, for
   the reader who wants the numbers in a spreadsheet rather than a document. */
function printPack(id) {
  const q = app.q, s = app.s, cfg = app.cfg;
  const w = q.window();
  const rev = q.sum('rev', w) || 1;
  const titles = {
    monthly: 'Monthly reporting pack', owner: 'Owner report',
    lender: 'Lender package', board: 'Board summary',
  };
  const money = v => F.money(v);
  const plRows = cfg.product.statement.pl.map(l => {
    const v = q.sum(l.id, w);
    return `<tr><td>${esc(l.name)}</td><td class="n">${money(v)}</td>
      <td class="n">${(v / rev * 100).toFixed(1)}%</td></tr>`;
  }).join('');
  const bsRows = cfg.product.statement.bs.map(l =>
    `<tr><td>${esc(l.name)}</td><td class="n">${money(q.bal(l.id))}</td></tr>`).join('');

  const sheet = document.createElement('div');
  sheet.id = 'pack-print';
  sheet.innerHTML = `
    <header>
      <div>
        <h1>${esc(titles[id] || 'Pack')}</h1>
        <p>${esc(s.data.company)} &middot; ${esc(F.monthName(q.view.month, true))}
          &middot; ${esc(s.data.basis.toUpperCase())}</p>
      </div>
      <span class="pp-mark">${esc(s.data.brand.mono || '')}</span>
    </header>
    <p class="pp-note">Signed off through ${esc(F.monthName(q.closed, true))}.
      ${q.view.month > q.closed
      ? 'This pack includes a month that is not yet signed off, and says so on every figure.'
      : 'Every figure in this pack comes from signed-off months.'}</p>
    <h2>Profit &amp; loss</h2>
    <table><thead><tr><th>Line</th><th class="n">Amount</th><th class="n">Of revenue</th></tr></thead>
      <tbody>${plRows}</tbody></table>
    <h2>Balance sheet <small>as of ${esc(F.monthName(q.view.month, true))}</small></h2>
    <table><thead><tr><th>Line</th><th class="n">Amount</th></tr></thead>
      <tbody>${bsRows}</tbody></table>
    <footer>Generated from the same facts the pages read, so a pack and a page cannot disagree.</footer>`;
  document.body.appendChild(sheet);
  document.body.classList.add('printing-pack');
  const done = () => {
    document.body.classList.remove('printing-pack');
    sheet.remove();
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  window.print();
  /* a browser that never fires afterprint must not leave the sheet behind */
  setTimeout(() => { if (sheet.isConnected) done(); }, 60000);
}

function exportPack(id) {
  const q = app.q, s = app.s, cfg = app.cfg;
  const w = q.window();
  const lines = cfg.product.statement.pl;
  const rows = [[`${s.data.company} — ${id} pack`],
    [`Basis`, s.data.basis.toUpperCase(), `${w[0]} to ${w[w.length - 1]}`],
    [`Signed off through`, q.closed], [],
    ['Profit & loss', 'Amount', 'Of revenue']];
  const rev = q.sum('rev', w) || 1;
  for (const l of lines) rows.push([l.name, q.sum(l.id, w), (q.sum(l.id, w) / rev * 100).toFixed(2)]);
  rows.push([], ['Balance sheet', `As of ${s.data.month}`]);
  for (const l of cfg.product.statement.bs) rows.push([l.name, q.bal(l.id)]);
  download(`${F.slug(s.data.company)}-${id}-pack-${s.data.month}.csv`, csv(rows), 'text/csv');
}

/* ------------------------------------------------------------------- probe */

/* A script route for a walk: a browser agent that cannot land a click can
   drive the page through these, and a test can assert on what they return. */
function api() {
  return {
    niceMax: C.niceMax,
    strip: () => stripIds(),
    go, render,
    page: () => app.page,
    pages: () => app.s.pages().map(p => p.id),
    industries: () => app.cfg.industries.industries.map(i => i.id),
    cards: () => Chooser.cardsNow(),
    cardValue: id => {
      const c = (Chooser.cardsNow() || []).find(x => x.id === id);
      return c ? Chooser.fmtValue(c) : null;
    },
    chooser: open => {
      if (open === false) { Chooser.hide(); return false; }
      openChooser();
      return true;
    },
    choosing: () => {
      const el = document.getElementById('chooser');
      return !!el && !el.hidden;
    },
    present: on => {
      if (on === false) { Present.exit(); return false; }
      return startPresenting(), Present.isOn();
    },
    presenting: () => Present.isOn(),
    slide: n => {
      if (n === undefined) return { at: Present.index(), of: Present.count() };
      Present.go(n);
      return { at: Present.index(), of: Present.count() };
    },
    slideNext: () => (Present.next(), Present.index()),
    slidePrev: () => (Present.prev(), Present.index()),
    roles: () => app.s.data.roles.map(r => r.id),
    months: () => app.q.months,
    pick: (what, value) => {
      if (what === 'industry') return app.s.useIndustry(value), useIndustry(value).then(render);
      if (what === 'role') { app.s.data.role = value; app.s.save(); render(); return true; }
      if (what === 'entity') { app.s.data.entity = value; app.s.save(); render(); return true; }
      if (what === 'month') { app.s.data.month = value; app.s.save(); render(); return true; }
      if (what === 'basis') { app.s.data.basis = value; app.s.save(); render(); return true; }
      if (what === 'theme') { app.s.data.theme = value; app.s.save().apply(); render(); return true; }
      if (what === 'tab') { app.subtab = value; render(); return true; }
      return false;
    },
    kpi: id => app.q.kpi(id),
    kpis: () => app.s.industry.kpis.map(id => ({ id, ...app.q.kpi(id) })),
    sum: (line, basis) => app.q.sum(line, app.q.window(basis || app.s.data.basis)),
    bal: line => app.q.bal(line),
    unitCount: () => app.q.units.length,
    connected: () => Object.keys(app.s.data.connectors),
    settings: () => app.s.data,
    config: () => JSON.parse(app.s.exportJSON()),
    ties: () => ties(),
    /* the two doors (gate.js) */
    gate: () => Gate.open(),
    openGate: (kind, arg) => openGate(kind, arg),
    session: () => app.s.data.session || null,
    people: () => Gate.people(app.cfg, app.s.data.roles, app.s.industry)
      .map(p => ({ name: p.name, title: p.title, role: p.role, lands: p.lands })),
    search: text => Gate.filter(text),
  };
}

/* The checks the close page claims. Run from a test, not asserted on trust. */
function ties() {
  const q = app.q;
  const out = [];
  for (const m of q.months) {
    const a = ['cash', 'ar', 'inv', 'oca', 'fa', 'ooa'].reduce((t, l) => t + q.bal(l, m, q.entities.map(e => e.id)), 0);
    const le = ['ap', 'accr', 'cd', 'ltd', 'ocl', 'cap', 're', 'cy'].reduce((t, l) => t + q.bal(l, m, q.entities.map(e => e.id)), 0);
    const rev = q.sum('rev', [m], q.entities.map(e => e.id));
    const urev = q.factSum('rev', [m], q.allUnits);
    out.push({
      month: m,
      balance: Math.round((a - le) * 100) / 100,
      unitsVsRevenue: Math.round((urev - rev) * 100) / 100,
    });
  }
  return {
    worstBalance: Math.max(...out.map(o => Math.abs(o.balance))),
    worstUnits: Math.max(...out.map(o => Math.abs(o.unitsVsRevenue))),
    months: out.length,
  };
}

boot().catch(err => {
  document.getElementById('page').innerHTML =
    `<section class="panel"><div class="empty"><b>The Hub could not start.</b><br>
     ${esc(err.message)}<br><br><span class="muted">Serve this folder over http rather than
     opening the file directly: the configuration and the data are fetched.</span></div></section>`;
  console.error(err);
});
