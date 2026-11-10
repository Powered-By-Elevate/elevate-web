/* The settings console: everything a company changes about its own Hub without
   a build. Five tabs, one object behind them, and an export that is the file a
   real deployment is built from.

   The integrations tab is deliberately honest about three states. Live means we
   have run it against a real company's data. Adapter built means the code
   exists and has been tested against fixtures. Available means the vendor's API
   and auth route are confirmed and the adapter is a day or two of work. A demo
   that blurs those three is a demo that gets caught. */

import * as U from './ui.js?v=5cc1fbd6cf';
import * as F from './fmt.js?v=5cc1fbd6cf';
import { esc, icon, brandMark, connTile } from './icons.js?v=5cc1fbd6cf';
import { paletteFrom, contrast, mix } from './settings.js?v=5cc1fbd6cf';
import { statusWord } from './pages/misc.js?v=5cc1fbd6cf';
import { locked } from './site.js?v=5cc1fbd6cf';

/* ⚖️ Matt, 2026-11-02: *"i would also love for the settings pages to be
   intentionally built out in a very user friendly and pleasing to the eye kind
   of layout. right now it's very mom's basement coding layout"*.

   He is right, and the cause was structural rather than cosmetic: every tab
   was a stack of label-over-input fields in two ragged columns, which is what
   a form looks like when nobody decided what it should look like.

   The console is now one pattern: a SETTINGS ROW with the name and a plain
   sentence on the left and the control on the right, in a column that lines up
   down the whole page. It gives a scannable left edge, one place for the eye
   to find every control, and it makes a long tab read as a document rather
   than a pile. Anything that genuinely needs the width (a palette, a drop
   zone, a table) takes it with `full`. */
const TABS = [
  { id: 'brand', name: 'Brand & identity', ico: 'sun', why: 'Name, logo, color, type' },
  { id: 'conns', name: 'Integrations', ico: 'link', why: 'What the figures are read from' },
  { id: 'levels', name: 'View levels', ico: 'lock', why: 'Who sees what, and whether in money' },
  { id: 'modules', name: 'Modules & pages', ico: 'grid', why: 'Which places exist at all' },
  { id: 'deploy', name: 'Save & hand off', ico: 'download', why: 'What this is set to, and the file a deployment is built from' },
];

/* One setting: what it is, what it does, and the control that changes it. */
function srow({ name, hint = '', control, full = false, id = '' }) {
  return `<div class="srow${full ? ' full' : ''}">
    <div class="srow-t">
      ${id ? `<label for="${esc(id)}">${esc(name)}</label>` : `<b>${esc(name)}</b>`}
      ${hint ? `<span>${hint}</span>` : ''}
    </div>
    <div class="srow-c">${control}</div>
  </div>`;
}

/* A switch reads as a state. A button labelled "Switch off" reads as a thing
   that might be doing something else, and the reader has to work out whether
   the label is the state or the action. */
function toggle(on, act, arg, label) {
  return `<button class="sw" role="switch" aria-checked="${!!on}" aria-label="${esc(label)}"
    data-act="${esc(act)}" data-arg="${esc(arg)}"><i></i></button>`;
}

export const FONT_PAIRS = [
  { name: 'Newsreader + IBM Plex Sans', display: '"Newsreader", Georgia, serif', body: '"IBM Plex Sans", -apple-system, sans-serif', google: 'Newsreader:ital,wght@0,400;0,600;0,700;1,400|IBM+Plex+Sans:wght@400;500;600;700' },
  { name: 'Archivo + Inter', display: '"Archivo", Impact, sans-serif', body: '"Inter", -apple-system, sans-serif', google: 'Archivo:wght@500;600;700&family=Inter:wght@400;500;600;700' },
  { name: 'Bitter + Source Sans 3', display: '"Bitter", Georgia, serif', body: '"Source Sans 3", -apple-system, sans-serif', google: 'Bitter:wght@500;600;700&family=Source+Sans+3:wght@400;500;600;700' },
  { name: 'Fraunces + Nunito Sans', display: '"Fraunces", Georgia, serif', body: '"Nunito Sans", -apple-system, sans-serif', google: 'Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Nunito+Sans:wght@400;500;600;700' },
  { name: 'Oswald + Roboto', display: '"Oswald", Impact, sans-serif', body: '"Roboto", -apple-system, sans-serif', google: 'Oswald:wght@500;600;700&family=Roboto:wght@400;500;700' },
  { name: 'Barlow Condensed + Barlow', display: '"Barlow Condensed", Impact, sans-serif', body: '"Barlow", -apple-system, sans-serif', google: 'Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700' },
  { name: 'Space Grotesk + Inter', display: '"Space Grotesk", Helvetica, sans-serif', body: '"Inter", -apple-system, sans-serif', google: 'Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700' },
  { name: 'Playfair Display + Montserrat', display: '"Playfair Display", Georgia, serif', body: '"Montserrat", -apple-system, sans-serif', google: 'Playfair+Display:wght@500;600;700&family=Montserrat:wght@400;500;600;700' },
  { name: 'DM Serif Display + DM Sans', display: '"DM Serif Display", Georgia, serif', body: '"DM Sans", -apple-system, sans-serif', google: 'DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;700' },
];

/* A demo shows two tabs: the brand, which the viewer may change (kept in this
   browser), and the software every figure is read from, which nobody may
   change (site.js). Levels, modules and the hand-off file are deployment work. */
const DEMO_TABS = ['brand', 'conns'];

export function settings(ctx) {
  const { s } = ctx;
  const tabs = locked(s) ? TABS.filter(t => DEMO_TABS.includes(t.id)) : TABS;
  const tab = tabs.some(t => t.id === ctx.subtab) ? ctx.subtab : 'brand';
  const body = {
    brand: brandTab, conns: connsTab, levels: levelsTab,
    modules: modulesTab, deploy: deployTab,
  }[tab](ctx);

  return U.pageHead({
    eyebrow: 'Settings',
    title: 'Settings',
    answer: s.tenant ? `How this Hub looks and who sees what. A change here shows in this browser,
      and the next build follows the settings file your administrator keeps.`
      : `Make this demo yours: name, logo, colors and type. It stays in this browser only.
      Every figure is read from connected software, so nothing else here can be edited.`,
  }) + `<div class="set-grid">
    <nav class="set-nav">${tabs.map(t =>
    `<button data-act="settab" data-arg="${t.id}" aria-current="${t.id === tab}">
       <span class="sn-i">${icon(t.ico, 16)}</span>
       <span><b>${esc(t.name)}</b><span>${esc(t.why)}</span></span>
     </button>`).join('')}
      ${s.tenant ? '' : `<div class="set-reset">
        ${U.btn('Reset to the sample', { act: 'reset-settings', sm: true })}
        <p>Puts the name, logo, colors and type back to the demo it shipped with.</p>
      </div>`}
    </nav>
    <div>${body}</div>
  </div>`;
}

/* ------------------------------------------------------------------- brand */

function brandTab(ctx) {
  const { s } = ctx;
  const d = s.data;
  const p = d.brand.palette;
  const onWhite = contrast(p.accent, '#ffffff');
  const pair = FONT_PAIRS.find(f => f.display === d.brand.type.display);

  return U.panel({
    title: 'Identity', ico: 'compass',
    note: 'What this Hub is called and what it wears.',
    body:
      srow({
        id: 'f-company', name: 'Company name',
        hint: 'Shown in the rail, the window title and every pack.',
        control: `<input id="f-company" type="text" value="${esc(d.company)}" data-bind="company">`,
      }) +
      srow({
        id: 'f-mono', name: 'Monogram',
        hint: 'Stands in for a logo until one is uploaded. Two or three letters.',
        control: `<input id="f-mono" type="text" maxlength="3" value="${esc(d.brand.mono)}"
          data-bind="brand.mono" class="narrow">`,
      }) +
      srow({
        name: 'Logo',
        hint: d && s.tenant ? 'Your logo replaces the monogram in this browser. Send the file to your administrator to put it in every build.'
          : `A client’s own logo replaces the monogram the moment it lands. It stays in this
          browser: a real deployment takes the file itself.`,
        control: `<div class="drop" id="logo-drop">${d.brand.logo
          ? `<img src="${esc(d.brand.logo)}" alt="">
             <div>${U.btn('Remove', { act: 'logo-clear', sm: true })}</div>`
          : `${icon('download', 20)}<div>Drop a PNG or SVG, or
             <label>choose a file<input type="file" id="logo-file" accept="image/*" hidden></label></div>`}
        </div>`,
      }) +
      srow({
        name: 'Typefaces',
        hint: `A display face for headings and figures, a body face for everything else. A client’s
          own faces go in here by name once they are licensed.`,
        control: `<select data-bind="fontpair">${FONT_PAIRS.map((f, i) =>
          `<option value="${i}" ${pair === f ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select>`,
      }) +
      srow({
        name: 'Theme',
        hint: 'Both are checked for contrast. Chart colors change between them on purpose.',
        control: `<div class="basis">
          <button data-act="theme" data-arg="light" aria-pressed="${d.theme === 'light'}">Light</button>
          <button data-act="theme" data-arg="dark" aria-pressed="${d.theme === 'dark'}">Dark</button>
        </div>`,
      }) +
      srow({
        name: 'How it reads', full: true,
        hint: 'The mark as the rail draws it, from everything above.',
        control: `<div class="mark-preview">
          <span class="rail-mark">${d.brand.logo
          ? `<img src="${esc(d.brand.logo)}" alt="">` : brandMark(d.brand, 42)}</span>
          <div><b>${esc(d.company)}</b><span>${esc(d.productName)}</span></div>
        </div>`,
      }),
  }) + U.panel({
    title: 'Color', ico: 'sun',
    note: `Set one brand color and the rest derives to stay readable, or set each by hand.
      ⛔ Chart colors are deliberately not brand colors: a brand hex carries no contrast
      guarantee, so the series palette is fixed and validated.`,
    body:
      srow({
        id: 'f-accent', name: 'Brand color',
        hint: 'Everything else on this page can be derived from this one value.',
        control: `<div class="color-set">
          <input id="f-accent" type="color" value="${esc(p.accent)}" data-bind="accent-pick">
          <input type="text" value="${esc(p.accent)}" data-bind="accent-hex" class="hex">
          ${U.btn('Derive the rest', { act: 'derive', kind: 'primary', ico: 'bolt', sm: true })}
          <span class="tag ${onWhite >= 4.5 ? 'good' : onWhite >= 3 ? 'warn' : 'bad'}">
            <i class="dot"></i>${onWhite.toFixed(1)}:1 on white</span>
        </div>`,
      }) +
      srow({
        name: 'The derived set', full: true,
        hint: 'Each one can be set by hand. The dashboard follows immediately.',
        control: `<div class="pal">${['accent', 'accentDeep', 'accentLift', 'tint', 'navy']
          .map(k => `<label class="pal-c">
            <input type="color" value="${esc(p[k])}" data-bind="pal.${k}">
            <b>${esc(k)}</b><span>${esc(p[k].toUpperCase())}</span>
          </label>`).join('')}</div>`,
      }),
  });
}

function connsTab(ctx) {
  const { s, cfg } = ctx;
  const cats = cfg.connectors.categories;
  const counts = cats.map(c => ({ c, on: s.connectedIn(c.id).length, all: s.connectorsIn(c.id).length }));
  const missing = counts.filter(x => !x.on && x.all);

  const header = U.panel({
    title: 'What this Hub reads',
    note: s.tenant ? 'What this Hub is connected to. A page whose source is not connected says so rather than showing a number from nowhere.'
      : `Where every figure in this demo comes from. Finance, CRM, marketing and pipeline are read from the company's own software with no manual entry. Documents and HR are hosted inside the Hub. Read only in the demo.`,
    body: `<div class="strip" style="margin:4px 0 0">
      ${counts.map(x => `<div class="strip-item">
        <div class="strip-label">${esc(x.c.name)}</div>
        <div class="strip-value">${x.on}<span class="u">/${x.all}</span></div>
        <div class="strip-note">${!x.all ? 'Nothing in this category applies to this industry'
      : x.on ? esc(s.connectedIn(x.c.id).map(k => k.name).join(', '))
        : (x.c.required ? '<b style="color:var(--bad)">Required</b>' : 'Not connected')}</div>
      </div>`).join('')}
    </div>`,
    foot: missing.length
      ? `${missing.length} ${missing.length === 1 ? 'category has' : 'categories have'} nothing connected.
         Where a company runs nothing at all, the recommended option in each category below is the one we put forward.`
      : 'Every category has something behind it.',
  });

  const sections = cats.map(cat => {
    const list = s.connectorsIn(cat.id);
    if (!list.length) return '';
    const on = list.filter(c => s.isOn(c.id));
    const recs = list.filter(c => c.recommend);
    return `<section class="cat">
      <div class="cat-head">
        <h3>${esc(cat.name)}</h3>
        ${on.length ? U.statusTag(`${on.length} connected`, 'good')
      : U.statusTag(cat.required ? 'Required, nothing connected' : 'Nothing connected', cat.required ? 'bad' : '')}
      </div>
      <p class="blurb">${esc(cat.blurb)}${!on.length && recs.length
      ? ` <b>If you run none of these, we would put forward ${esc(recs.map(r => r.name).join(' or '))}.</b>` : ''}</p>
      <div class="conns">
        ${list.sort(sortConns).map(c => connCard(c, s)).join('')}
      </div>
    </section>`;
  }).join('');

  return header + `<div style="margin-top:22px">${sections}</div>`;
}

function sortConns(a, b) {
  const rank = { live: 0, built: 1, cataloged: 2 };
  if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
  if (!!b.recommend !== !!a.recommend) return b.recommend ? 1 : -1;
  return a.name.localeCompare(b.name);
}

function connCard(c, s) {
  const on = s.isOn(c.id);
  return `<article class="conn" data-on="${on}">
    <div class="conn-top">
      ${connTile(c)}
      <div style="min-width:0">
        <div class="conn-name">${esc(c.name)}</div>
        <div class="conn-meta">${esc(c.api)}</div>
      </div>
    </div>
    <div class="conn-note">${esc(c.note)}</div>
    <div class="conn-foot">
      <span class="tag ${c.status === 'live' ? 'good' : c.status === 'built' ? 'warn' : ''}">
        <i class="dot"></i>${esc(statusWord(c.status))}</span>
      ${c.recommend ? `<span class="tag">${icon('bolt', 12)}We recommend</span>` : ''}
      ${locked(s) || s.tenant ? (on ? '<span class="tag good"><i class="dot"></i>Connected</span>' : '') : on
      ? U.btn('Disconnect', { act: 'disconnect', arg: c.id, sm: true })
      : U.btn('Connect', { act: 'connect', arg: c.id, kind: 'primary', sm: true, ico: 'link' })}
    </div>
  </article>`;
}

/* The sheet a Connect button opens. Real auth route, real scopes, real steps. */
export function connectSheet(c, s) {
  const steps = stepsFor(c);
  return `<div class="sheet">
    <div class="sheet-head">
      ${connTile(c)}
      <div style="flex:1">
        <h3 style="font-size:17px">Connect ${esc(c.name)}</h3>
        <div class="muted small">${esc(c.auth)} · ${esc(c.api)}</div>
      </div>
      <button class="btn ghost sm" data-act="sheet-close">${icon('close', 15)}</button>
    </div>
    <div class="sheet-body">
      <p style="margin-top:0">${esc(c.note)}</p>
      <h4 style="margin:18px 0 10px;font-size:13.5px">What happens when you connect</h4>
      <ol class="steps">${steps.map(x => `<li>${x}</li>`).join('')}</ol>
      <h4 style="margin:18px 0 8px;font-size:13.5px">What it is granted</h4>
      <div class="scopes">${esc(scopesFor(c))}</div>
      <p class="muted small" style="margin:12px 0 0">
        Read only. Nothing in this product writes to a source system unless a company asks for a
        specific write and signs off on it.
      </p>
      ${c.status !== 'live' ? `<p class="small" style="margin:14px 0 0;padding:10px 12px;
        background:var(--warn-tint);color:var(--warn);border-radius:9px">
        ${c.status === 'built'
      ? 'The adapter for this one is written and tested against fixtures. Pointing it at a live tenant is configuration, not development.'
      : 'This one is cataloged: the API and the auth route are confirmed, the adapter is not written yet. Connecting it here switches the sample data on so you can see the shape it would take.'}
      </p>` : ''}
    </div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="sheet-close">Cancel</button>
      ${U.btn('Connect', { act: 'connect-go', arg: c.id, kind: 'primary', ico: 'link' })}
    </div>
  </div>`;
}

function stepsFor(c) {
  const auth = c.auth.toLowerCase();
  if (auth.includes('oauth')) {
    return [
      `You are sent to <b>${esc(c.name)}</b> to sign in as yourself.`,
      `${esc(c.name)} asks you to approve the read scopes listed below. Nothing else is requested.`,
      `The token comes back to the Hub and is stored encrypted. The password never reaches us.`,
      `A first read runs immediately so you can see the figures land, then it refreshes on the schedule you set.`,
    ];
  }
  if (auth.includes('certificate')) {
    return [
      `Your IT provider issues a certificate for the Hub’s application registration.`,
      `An administrator grants the read permissions below, scoped to the sites and companies you name.`,
      `The private key is held as a secret, never in a file beside the code.`,
      `A first read proves the grant, and the result is written into the dashboard’s feed table.`,
    ];
  }
  if (auth.includes('api key') || auth.includes('token')) {
    return [
      `You create a read-only key inside ${esc(c.name)}.`,
      `Paste it here once. It is stored encrypted and never shown again.`,
      `We read on a schedule and record every read, so a figure can always be traced to the pull that produced it.`,
      `Revoking the key in ${esc(c.name)} stops the Hub reading, immediately and completely.`,
    ];
  }
  return [
    `A read-only user is created in ${esc(c.name)} for the Hub.`,
    `The credentials are stored as secrets.`,
    `A first read runs and ties its totals to a report you already trust before anything goes on a page.`,
    `From then on it reads on a schedule.`,
  ];
}

function scopesFor(c) {
  const map = {
    'sage-intacct': 'Web Services: GL account balances, GL detail, dimensions, close dates. Read only.',
    quickbooks: 'com.intuit.quickbooks.accounting (read). Reports, accounts, classes, locations.',
    procore: 'Projects, budgets, change events, commitments. Read only, company-scoped.',
    sharepoint: 'Sites.Selected (Graph + SharePoint REST), read only, limited to the sites you name.',
    'ms-teams': 'Team.ReadBasic.All, Channel.ReadBasic.All, ChannelMessage.Read.All (read).',
    outlook: 'Mail.ReadBasic, Calendars.Read (read).',
    'ms-planner': 'Tasks.Read, Group.Read.All (read).',
    monday: 'boards:read, items:read (API-Version 2026-07).',
    slack: 'channels:read, chat:write (delivery only, to channels you pick).',
    stripe: 'Restricted key: charges, subscriptions, invoices — read.',
    adp: 'Workers and payroll output, read, over mutual TLS.',
  };
  return map[c.id] || `${c.name} read scopes only: the records this dashboard shows and nothing beside them.`;
}

/* ------------------------------------------------------------- view levels */

/* ⚖️ Matt, 2026-11-02: *"this is the most confusing setup ive ever seen. i
   dont see how to add new users to levels, i dont see how to add new levels,
   what the fuck does rank mean, what does money mean, what is pages and why is
   there a try it button. the what each level reaches section is incredibly
   confusing as well"*.

   Every one of those is the same fault: the table WAS the data model. `rank`
   is an integer the engine sorts on, `scope` and `money` are field names, and
   "What each level reaches" was a join table printed on a page. None of it is
   something a person setting up their company should have to learn.

   ⛔ **Rank is gone from the interface.** A level's seniority is its POSITION
   in the list, and moving it up or down rewrites the number underneath. Nobody
   needs to know a number exists.

   ⛔ **Scope and money are sentences**, taken from the config's own
   descriptions rather than their keys.

   ⛔ **The matrix is gone.** What a level reaches now sits inside that level,
   where the question is actually asked, behind a disclosure.

   And the two things that were missing entirely, which is why he could not
   find them: a level can be ADDED, and people can be put IN one. */
function levelsTab(ctx) {
  const { s, cfg } = ctx;
  const roles = s.data.roles.slice().sort((a, b) => b.rank - a.rank);
  const pageCat = cfg.product.pages;

  return U.panel({
    title: 'Who sees what', ico: 'people',
    note: `A level is a job title. Everyone in it sees the same pages, the same much of the
      company, and money at the same detail. The order is the seniority: a level sees everything
      the ones below it see, and more.`,
    right: U.btn('Add a level', { act: 'level-add', kind: 'primary', ico: 'plus', sm: true }),
    body: roles.map((r, n) => {
      const reach = pagesFor(s, r, cfg);
      const people = r.people || [];
      return `<div class="lvl" data-role="${esc(r.id)}">
        <div class="lvl-head">
          <span class="lvl-ord">${n + 1}</span>
          <input type="text" value="${esc(r.name)}" data-bind="role.${r.id}.name"
            aria-label="What this level is called">
          <span class="lvl-move">
            <button class="btn sm ghost" data-act="level-up" data-arg="${esc(r.id)}"
              ${n === 0 ? 'disabled' : ''} aria-label="More senior">${icon('caret', 13)}</button>
            <button class="btn sm ghost down" data-act="level-down" data-arg="${esc(r.id)}"
              ${n === roles.length - 1 ? 'disabled' : ''} aria-label="Less senior">${icon('caret', 13)}</button>
          </span>
          ${U.btn('See the dashboard as this level', { act: 'try-role', arg: r.id, sm: true, ico: 'zoom' })}
          ${roles.length > 2 ? `<button class="btn sm ghost danger" data-act="level-del"
            data-arg="${esc(r.id)}" aria-label="Remove this level">${icon('close', 13)}</button>` : ''}
        </div>

        <div class="lvl-grid">
          <label class="lvl-f">
            <b>How much of the company they see</b>
            <select data-bind="role.${r.id}.scope">${Object.entries(cfg.roles.scopes).map(([k, v]) =>
        `<option value="${k}" ${r.scope === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
          </label>
          <label class="lvl-f">
            <b>How much money they see</b>
            <select data-bind="role.${r.id}.money">${Object.entries(cfg.roles.money).map(([k, v]) =>
        `<option value="${k}" ${r.money === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
          </label>
        </div>

        <details class="lvl-pages">
          <summary><b>${reach.length}</b> of ${reach.total} pages${reach.length === reach.total
        ? ' — everything' : ''}<span>${icon('caret', 12)}</span></summary>
          <div class="lvl-plist">${reach.byModule.map(([mod, names]) =>
          `<div><b>${esc(mod)}</b>${names.map(nm => `<span>${esc(nm)}</span>`).join('')}</div>`).join('')}</div>
          ${reach.missing.length ? `<p class="lvl-miss">Not offered at this level:
            ${reach.missing.map(nm => esc(nm)).join(', ')}.</p>` : ''}
        </details>

        <div class="lvl-people">
          <b>Who is at this level</b>
          ${people.length
          ? `<div class="chips">${people.map((who, idx) =>
            `<span class="chip">${esc(who)}<button data-act="person-del"
               data-arg="${esc(r.id)}:${idx}" aria-label="Remove ${esc(who)}">${icon('close', 11)}</button></span>`).join('')}</div>`
          : `<p class="muted small">Nobody yet. ${(r.titles || []).length
            ? `Usually ${esc((r.titles || []).slice(0, 3).join(', '))}.` : ''}</p>`}
          <div class="lvl-add">
            <input type="text" data-person="${esc(r.id)}" placeholder="Name or email"
              aria-label="Add someone to ${esc(r.name)}">
            ${U.btn('Add', { act: 'person-add', arg: r.id, sm: true })}
          </div>
        </div>
      </div>`;
    }).join(''),
    foot: `How much of the company and how much money are independent on purpose: a site
      supervisor can see every operational page for their own crew with no currency anywhere on
      them.${s.tenant ? '' : ` A real deployment reads the people from the company\u2019s own directory, so this list
      is the shape of it rather than the list itself.`}`,
  });
}

/* Which pages a level reaches, grouped by module, and which it does not. */
function pagesFor(s, role, cfg) {
  const saved = s.data.role;
  s.data.role = role.id;
  const mine = s.pages();
  s.data.role = saved;
  const all = Object.entries(cfg.product.pages)
    .filter(([k, p]) => !k.startsWith('$') && !p.hidden);
  const got = new Set(mine.map(p => p.id));
  const byMod = new Map();
  for (const p of mine) {
    const m = cfg.product.modules[p.module]?.name || p.module;
    if (!byMod.has(m)) byMod.set(m, []);
    byMod.get(m).push(p.name);
  }
  return {
    length: mine.length, total: all.length,
    byModule: [...byMod.entries()],
    missing: all.filter(([id]) => !got.has(id)).map(([, p]) => p.name),
  };
}

function countPages(s, role) {
  const saved = s.data.role;
  s.data.role = role.id;
  const n = s.pages().length;
  s.data.role = saved;
  return n;
}

/* ----------------------------------------------------------------- modules */

function modulesTab(ctx) {
  const { s, cfg } = ctx;
  const mods = cfg.product.modules;
  const pages = cfg.product.pages;
  return U.panel({
    title: 'Modules', ico: 'grid',
    note: `Switch one off and it leaves the rail for everyone. The financial module is the
      product; the rest are there when a company wants them.`,
    body: Object.entries(mods).filter(([k]) => !k.startsWith('$'))
      .sort((a, b) => a[1].order - b[1].order).map(([id, m]) => {
      const list = Object.entries(pages)
        .filter(([k, pg]) => !k.startsWith('$') && pg.module === id && !pg.hidden);
      const on = s.data.modules[id] !== false;
      const locked = id === 'finance' || id === 'settings';
      return srow({
        name: m.name,
        hint: list.map(([, pg]) => esc(pg.name)).join(' · ') || 'no pages',
        control: locked
          ? `<span class="muted small">Always on</span>`
          : toggle(on, 'module', id, `Switch ${m.name} ${on ? 'off' : 'on'}`),
      });
    }).join(''),
  });
}

/* ------------------------------------------------------------- deploy tab */

/* ⛔ A TAB CALLED "CONFIGURATION FILE" THAT OPENS ON RAW JSON.

   Matt, 2026-11-02: *"why is there a confuguration file seciton.....what is
   that even for, how is it useful, and how can it not be so confusing"*. Three
   questions, and the page answered none of them: it opened on an eighteen-row
   textarea of JSON, which is the ANSWER to a question nobody had asked yet.

   So it answers them in order. What this deployment is currently set to, read
   back in English, because a person wants to see their own decisions before
   they see a file. Then what the file is for, in two sentences. Then the two
   things you actually DO here, saving it and loading one, as the primary
   controls. The JSON itself goes behind a disclosure, because it is the
   evidence rather than the point.

   The tab is called Save & hand off now. "Configuration file" names the
   artifact; a tab should name the job. */
function deployTab(ctx) {
  const { s } = ctx;
  const json = s.exportJSON();
  const d = s.data;
  const pages = s.pages().length;
  const allPages = Object.keys(ctx.cfg.product.pages).filter(k => k !== '$comment').length;
  const conns = Object.keys(d.connectors || {}).length;
  const mods = Object.values(d.modules || {}).filter(Boolean).length;
  const withMoney = (d.roles || []).filter(r => r.money !== 'none').length;

  const line = (what, value, why) => `
    <div class="sumrow">
      <span class="sum-k">${esc(what)}</span>
      <span class="sum-v">${value}</span>
      <span class="sum-w">${esc(why)}</span>
    </div>`;

  return U.panel({
    title: 'What this deployment is set to',
    ico: 'check',
    note: `Everything you changed in the other tabs, read back. This is what the file below
      carries, so you can check your own decisions without reading JSON.`,
    body: `<div class="sumtable">
      ${line('Client', `<b>${esc(d.company)}</b>`, `${esc(d.industry)}, shown as ${esc(d.productName)}`)}
      ${(() => {
      /* ⛔ The brand nests its colours under `palette` and its faces under
         `type`, and reading `brand.accent` and `brand.display` gave a grey
         swatch, a dash and "default over default" on a client whose brand is
         fully set. A summary that misreports the thing it is summarising is
         worse than no summary. The first face name is taken out of the CSS
         stack, because "Archivo, Impact, sans-serif" is a fallback chain and
         the reader only chose the first one. */
      const pal = d.brand.palette || {};
      const face = v => String(v || '').split(',')[0].replace(/["']/g, '').trim() || 'default';
      return line('Brand',
        `<span class="sw" style="background:${esc(pal.accent || '#888')}"></span>
         <b>${esc(pal.accent || 'not set')}</b>`,
        `${esc(face((d.brand.type || {}).display))} over ${esc(face((d.brand.type || {}).body))}`);
    })()}
      ${line('Connected software', `<b>${conns}</b>`, conns
      ? `read-only, and every figure on every page comes from one of them`
      : `nothing connected yet, so every page reads the sample`)}
      ${line('Modules on', `<b>${mods}</b>`, `${pages} of ${allPages} pages exist at all`)}
      ${line('View levels', `<b>${(d.roles || []).length}</b>`,
      `${withMoney} see money, ${(d.roles || []).length - withMoney} do not`)}
      ${line('Opens on', `<b>${esc(d.theme)} theme</b>`, `${esc((d.basis || '').toUpperCase())}, as ${esc((d.roles.find(r => r.id === d.role) || {}).name || d.role)}`)}
    </div>`,
    foot: s.tenant
      ? 'Changes here stay in this browser. The next build follows the settings file your administrator keeps.'
      : 'Settings live in this browser while you are trying things. A real deployment carries the file.',
  }) + U.panel({
    title: 'Save it, or load one',
    ico: 'download',
    note: `The file IS the deployment. Hand it to the build and the dashboard comes out branded,
      connected and scoped to these levels, with no code touched. It is also how a setup moves:
      from a laptop to a colleague, from a trial to the real thing, from one client to the next
      as a starting point.`,
    body: `<div class="handoff">
        <div class="ho-card">
          <b>Save this setup</b>
          <p>Downloads everything above as one file. Keep it, send it, or hand it to whoever
            builds the deployment.</p>
          ${U.btn('Download the file', { act: 'export-config', kind: 'primary', ico: 'download' })}
        </div>
        <div class="ho-card">
          <b>Load a setup</b>
          <p>Paste a file saved here or sent to you. It replaces everything above, and you can
            look around before deciding to keep it.</p>
          <textarea rows="3" id="import-json" placeholder="Paste a configuration file here"></textarea>
          ${U.btn('Load it', { act: 'import-config', ico: 'arrow' })}
        </div>
      </div>
      <details class="raw">
        <summary>Show the file itself</summary>
        <p class="raw-why">The same thing in the form the build reads. Nothing here needs editing
          by hand: every value in it is set by one of the other tabs.</p>
        <textarea rows="16" readonly
          style="font-family:ui-monospace,Menlo,monospace;font-size:11.5px">${esc(json)}</textarea>
      </details>`,
  }) + (s.tenant ? '' : U.panel({
    title: 'What a deployment actually involves',
    ico: 'plan',
    body: `<ol class="steps">
      <li><b>Brand.</b> The kit goes in: logo files, the palette, the two typefaces. An hour, and
        it is the part a client notices first.</li>
      <li><b>The ledger.</b> One accounting connection, read only, tied to a report the company
        already trusts, cell by cell, before a single figure goes on a page.</li>
      <li><b>The unit of work.</b> Jobs, campuses, stores, lines, trucks, products: whichever one
        this company divides its money by. This is the decision the whole dashboard hangs on.</li>
      <li><b>View levels.</b> The company’s own titles, mapped to the levels, with the ranks
        moved to suit. Usually one meeting.</li>
      <li><b>Everything else.</b> Task management, documents, communication, pipeline: switched on
        one at a time, each one earning its place rather than arriving as a bundle.</li>
    </ol>`,
    foot: 'A month closes on a signature, never on the calendar. That rule is in the product, not in a policy document.',
  }));
}
