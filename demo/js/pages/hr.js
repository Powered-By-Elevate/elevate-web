/* The HR tab: a read-only display of the HR system the company already runs.

   Matt, 2026-11-16: "we need to change the HR section to not host it's own platform, but instead
   be an integrated display of whatever software that company uses". So nothing here is kept in
   the Hub and nothing here changes HR data. Every page names the system its figures come from,
   with a button that opens that system, and a request that needs someone to act says where to
   act ("Approve in Gusto") instead of offering a button that pretends to.

   Six pages: HR home, People (the directory, with the org chart as a toggle), Payroll & labor,
   Time & attendance, Hiring and Compliance, plus the employee record as a hidden drill page.
   Every figure is read from one roster (build_hr in data/gen.py), presented as the extract the
   HR system sends. Where no HR system is connected the pages say so and name the one to connect,
   and draw no figure at all. Hiring draws numbers only where the system holds hiring (`ats` in
   config/connectors.json). */
import * as F from '../fmt.js?v=a2aa80d688';
import * as C from '../chart.js?v=a2aa80d688';
import * as U from '../ui.js?v=a2aa80d688';
import * as M from '../calm.js?v=a2aa80d688';
import { esc, icon } from '../icons.js?v=a2aa80d688';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = iso => { const [, m, d] = iso.split('-').map(Number); return `${MON[m - 1]} ${d}`; };
const dayY = iso => `${day(iso)}, ${iso.slice(0, 4)}`;
const span = (a, b) => (a === b ? day(a) : `${day(a)} to ${day(b)}`);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const plural = (n, one, many) => `${F.num(n)} ${n === 1 ? one : many}`;
const hr = q => q.data.people.hr;
const ini = n => n.split(' ').map(w => w[0]).join('').slice(0, 2);

/* ---------------------------------------------------------- the HR system */

/* The connected HR system, the industry's own first when more than one is on. */
function system(s) {
  const on = s.connectedIn('people');
  const own = (s.industry.connected || {}).people || [];
  return on.find(c => own.includes(c.id)) || on[0] || null;
}

/* What we would connect when nothing is: the system this company runs, else the one we recommend. */
function recommended(s, need = c => true) {
  const list = s.connectorsIn('people').filter(need);
  const own = (s.industry.connected || {}).people || [];
  return list.find(c => own.includes(c.id)) || list.find(c => c.recommend) || list[0] || null;
}

const shortOf = c => c.short || c.name;

/* Which system, read only, and the way into it. ⚖️ The calm pass (Matt, 2026-11-16) puts it in the
   head's right column, so the Open button sits where the eye lands and the line is said once. */
function sourceLine(sys) {
  return `<div class="src-line hr-src cm-hr-src"><span class="cm-hr-src-t"><i class="dot"></i>From ${esc(sys.name)}, read only.
    Changes are made in ${esc(shortOf(sys))}.</span>${openBtn(sys)}</div>`;
}

function openBtn(sys, label = `Open in ${shortOf(sys)}`) {
  return `<a class="btn sm primary src-open" href="${esc(sys.url || '#')}" target="_blank" rel="noopener noreferrer">${esc(label)}${icon('arrow', 13)}</a>`;
}

/* Where a person acts on something, as a link to the system rather than a button that writes. */
const actIn = (sys, verb) => `<a class="act-in cm-hr-act" href="${esc(sys.url || '#')}" target="_blank" rel="noopener noreferrer">${esc(verb)} in ${esc(shortOf(sys))}${icon('arrow', 12)}</a>`;

/* Every HR page opens the same way: the question answered, the system and its door on the right. */
const head = (sys, title, line, eyebrow = 'HR') => M.head({ eyebrow, title, line, stamp: sourceLine(sys) });

/* The figures keep the strip's markup (`.strip`), worn in the calm grid. */
const figs = items => `<div class="cm-strip">${U.strip(items)}</div>`;

/* A person as a row that opens their record. */
const personRow = (r, right = '', tag = '') => `<div class="cm-task" data-click="person:${esc(r.id)}" tabindex="0">
    ${tag || `<span class="cm-hr-face">${face(r.n, 32)}</span>`}
    <span class="t"><b>${esc(r.n)}</b><span>${esc(r.t || '')}${r.d ? ` · ${esc(r.d)}` : ''}</span></span>
    <span class="o">${right}</span><span class="go">${icon('arrow', 14)}</span></div>`;

/* The page when no HR system is connected: it says so, names the one to connect, draws nothing. */
function notConnected(s, title) {
  const rec = recommended(s);
  return M.page(M.head({ eyebrow: 'HR · not connected', title,
    line: 'No HR or payroll system is connected, so this page shows no figures rather than a guess.' }) +
    M.section({ title: 'What fills this page', note: rec ? `We recommend ${esc(rec.name)}.` : 'No HR system connected.',
      right: U.btn('Integrations', { act: 'go', arg: 'settings', sm: true }),
      body: `<p class="cm-hr-empty">The HR tab reads headcount, pay runs, hours, time off and certifications from the
        company's own HR system and never keeps a copy of its own.
        ${rec ? `Connect ${esc(rec.name)} under Settings, Integrations, and these pages fill from it.` : ''}</p>` }));
}

/* Every page goes through here: no system means no figures. */
function page(title, draw) {
  return ctx => {
    const sys = system(ctx.s);
    if (!sys) return notConnected(ctx.s, title);
    return draw({ ...ctx, sys });
  };
}

/* A unit-scoped level reads the people at its own sites. Everyone else reads the whole roster. */
function roster(q) {
  const all = hr(q).roster;
  if (!q.unitScoped) return all;
  const mine = new Set(q.units.flatMap(u => [u.short, u.name]).filter(Boolean));
  return all.filter(r => mine.has(r.loc));
}

/* One person's pay as the payroll system holds it: the industry's typical seat, moved by seniority. */
function seeded(id) {
  let x = 0;
  for (const ch of id) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}
function payOf(q, r) {
  const h = hr(q), p = q.data.people;
  const rnd = seeded(`${r.id}:pay`);
  const yrs = daysBetween(r.s, h.asOf) / 365;
  const base = Math.round(p.costPerHead * (!r.mgr ? 1.35 : 0.62 + rnd() * 0.4) * (1 + Math.min(10, yrs) * 0.015) / 500) * 500;
  return { base, hourly: r.ty !== 'Full time', rate: Math.round(base / 2080 * 0.9 * 100) / 100, yrs };
}
const hourlyRate = q => q.data.people.costPerHead / 2080 * 0.9;

const face = (n, sz = 30) => `<span class="face" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz * 0.36)}px">${esc(ini(n))}</span>`;
const byName = (h, n) => h.roster.find(r => r.n === n);
const link = (h, n) => { const r = byName(h, n); return r ? `person:${r.id}` : ''; };

/* Work anniversaries in the next `days` days, one year or more. */
function anniversaries(h, people, days = 30) {
  const y = Number(h.asOf.slice(0, 4)), out = [];
  for (const r of people) {
    for (const yy of [y, y + 1]) {
      const when = `${yy}${r.s.slice(4)}`, gap = daysBetween(h.asOf, when), n = yy - Number(r.s.slice(0, 4));
      if (gap >= 0 && gap <= days && n >= 1) out.push({ r, when, gap, n });
    }
  }
  return out.sort((a, b) => a.gap - b.gap);
}

/* ---------------------------------------------------------------- HR home */

const home = page('HR home', ({ q, s, sys }) => {
  /* ⚖️ The calm pass: who in the team needs attention today. Four figures, then the certifications
     that are lapsing as rows that open each person, the team by department with who is out beside
     it, and anniversaries with the long list folded. */
  const h = hr(q), p = q.data.people, all = roster(q);
  const outToday = h.timeoff.out.filter(o => o.from <= h.asOf && o.to >= h.asOf);
  const ann = anniversaries(h, all);
  const expiring = h.compliance.expiring.filter(e => daysBetween(h.asOf, e.due) <= 30);
  const monthLabor = (p.payroll ? p.payroll.allIn : 0) / 12;
  const ats = !!sys.ats;
  const roles = h.hiring.reqs;
  const leave = all.filter(r => r.st === 'On leave').length;
  const certRow = e => {
    const r = byName(h, e.n) || { id: '', n: e.n }, d = daysBetween(h.asOf, e.due);
    return personRow({ ...r, t: e.c, d: '' }, d < 0 ? 'lapsed' : `due ${day(e.due)}`,
      U.statusTag(d < 0 ? `${-d}d over` : `${d}d left`, d < 0 ? 'bad' : d <= 14 ? 'warn' : ''));
  };
  const depts = p.departments.map(d => ({ name: d.name, value: all.filter(r => r.d === d.name).length }))
    .filter(r => r.value).sort((a, b) => b.value - a.value);

  const due = M.section({
    title: 'What needs a look', src: shortOf(sys),
    note: expiring.length ? `${plural(expiring.length, 'licence or certification', 'licences and certifications')} lapsed or lapsing within 30 days, soonest first.`
      : 'Nothing lapses in the next 30 days.',
    right: U.btn('All certifications', { act: 'go', arg: 'hr-compliance', sm: true, ico: 'arrow' }),
    body: expiring.length ? `<div class="cm-tasks">${expiring.slice(0, 5).map(certRow).join('')}</div>` : '',
    fold: expiring.length > 5 ? `<div class="cm-tasks">${expiring.slice(5).map(certRow).join('')}</div>` : '',
    foldLabel: `${expiring.length - 5} more`,
  });
  const team = M.section({
    title: 'The team today', src: shortOf(sys), note: 'Each department as the HR system files it.',
    body: C.hbars({ rows: depts, fmt: v => F.num(v) }),
    aside: `<span class="cm-eyebrow">Out today</span>` + (outToday.length ? M.facts(outToday.map(o => ({
      k: esc(o.n), sub: `${esc(o.k)} · ${esc(o.d)}`, v: `back ${day(addDays(o.to, 1))}` }))) : `<p class="cm-hr-empty">Nobody is out today.</p>`),
  });
  const annRow = a => personRow(a.r, `${plural(a.n, 'year', 'years')} on ${day(a.when)}`);
  const annSec = M.section({
    title: 'Work anniversaries', src: shortOf(sys),
    note: ann.length ? `${plural(ann.length, 'person reaches', 'people reach')} a work anniversary in the next 30 days.` : 'No anniversaries in the next 30 days.',
    body: ann.length ? `<div class="cm-tasks">${ann.slice(0, 4).map(annRow).join('')}</div>` : '',
    fold: ann.length > 4 ? `<div class="cm-tasks">${ann.slice(4).map(annRow).join('')}</div>` : '',
    foldLabel: `${ann.length - 4} more`,
  });

  return M.page(head(sys, 'HR home',
    `<b>${F.num(all.length)}</b> people, <b>${F.num(outToday.length)}</b> out today and <b>${F.num(expiring.length)}</b> ${expiring.length === 1 ? 'certification' : 'certifications'} lapsing within 30 days.`) +
    figs([
      { label: 'Headcount', value: F.num(all.length), note: `${leave} on leave` },
      ats ? { label: 'Open roles', value: F.num(roles.length), note: `in ${esc(shortOf(sys))} recruiting` }
        : { label: 'Open roles', value: 'Not held', note: `${esc(shortOf(sys))} holds no hiring` },
      { label: 'Out in two weeks', value: F.num(h.timeoff.out.length), note: 'approved time off' },
      { label: 'Labor this month', value: F.money(monthLabor), note: 'all in, from payroll' },
    ]) + due + team + annSec);
});

/* ----------------------------------------------------------------- People */

function orgChart(h, people, depts) {
  return `<div class="org"><div class="org-row">${depts.map(d => {
    const mine = people.filter(r => r.d === d);
    if (!mine.length) return '';
    const lead = mine.find(r => !r.mgr) || mine[0];
    const titles = {};
    for (const r of mine) if (r !== lead) titles[r.t] = (titles[r.t] || 0) + 1;
    return `<div class="org-col">
      <button class="org-card" data-click="person:${esc(lead.id)}">${face(lead.n, 34)}
        <span><b>${esc(lead.n)}</b><i>${esc(lead.t)}</i></span></button>
      <div class="org-dept">${esc(d)} · ${plural(mine.length, 'person', 'people')}</div>
      <ul class="org-kids">${Object.entries(titles).sort((a, b) => b[1] - a[1]).map(([t, n]) =>
        `<li><span>${esc(t)}</span><b>${F.num(n)}</b></li>`).join('')}</ul></div>`;
  }).join('')}</div></div>`;
}

const people = page('People', ({ q, s, sys, subtab }) => {
  /* ⚖️ The calm pass: who is on the team. The directory shows its first rows and folds the rest,
     the department filter and the org chart toggle are bordered controls in the section head. */
  const h = hr(q), all = roster(q);
  const depts = q.data.people.departments.map(d => d.name);
  const view = subtab === 'org' ? 'org' : 'list';
  const pick = (subtab || '').startsWith('dir:') ? subtab.slice(4) : '';
  const rows = pick ? all.filter(r => r.d === pick) : all;
  const ft = all.filter(r => r.ty === 'Full time').length;
  const avgTen = all.reduce((a, r) => a + daysBetween(r.s, h.asOf) / 365, 0) / Math.max(1, all.length);
  const newQ = all.filter(r => daysBetween(r.s, h.asOf) <= 90).length;
  const toggle = `<div class="cm-hr-seg" role="group" aria-label="View">
    <button class="${view === 'list' ? 'on' : ''}" data-act="settab" data-arg="">${icon('list', 13)}Directory</button>
    <button class="${view === 'org' ? 'on' : ''}" data-act="settab" data-arg="org">${icon('people', 13)}Org chart</button></div>`;
  const filters = `<div class="cm-hr-chips">${['', ...depts].map(d => {
    const n = d ? all.filter(r => r.d === d).length : all.length;
    return `<button class="cm-hr-chip${d === pick ? ' on' : ''}" data-act="settab" data-arg="dir:${esc(d)}">${esc(d || 'Everyone')}<i>${F.num(n)}</i></button>`;
  }).join('')}</div>`;
  const sorted = rows.slice().sort((a, b) => a.d.localeCompare(b.d) || (a.mgr ? 1 : 0) - (b.mgr ? 1 : 0) || a.n.localeCompare(b.n));
  const table = list => U.table({
    cols: [{ name: 'Name', w: '22%' }, { name: 'Role' }, { name: 'Department' }, { name: 'Location' },
      { name: 'Manager' }, { name: 'Type' }, { name: 'Started', n: true }],
    rows: list.map(r => ({
      click: `person:${r.id}`, cells: [`<b>${esc(r.n)}</b>${r.st !== 'Active' ? ` <span class="tag warn">${esc(r.st)}</span>` : ''}`,
        esc(r.t), esc(r.d), esc(r.loc), esc(r.mgr || 'Leadership'), esc(r.ty),
        `<span style="white-space:nowrap">${MON[Number(r.s.slice(5, 7)) - 1]} ${r.s.slice(0, 4)}</span>`] })) });
  const SHOW = 15;
  const sec = view === 'org'
    ? M.section({ title: 'Org chart', src: shortOf(sys), right: toggle,
      note: `Each department's lead and the roles under them. A move is made in ${esc(shortOf(sys))}.`,
      body: orgChart(h, all, depts) })
    : M.section({ title: pick || 'Directory', src: shortOf(sys), right: toggle,
      note: `${plural(rows.length, 'person', 'people')}${pick ? ` in ${esc(pick)}` : ''}. Open a person for their record.`,
      body: filters + table(sorted.slice(0, SHOW)),
      fold: sorted.length > SHOW ? table(sorted.slice(SHOW)) : '', foldLabel: `Show the other ${sorted.length - SHOW}` });

  return M.page(head(sys, 'People',
    `<b>${F.num(all.length)}</b> people across <b>${depts.length}</b> departments, with an average tenure of <b>${avgTen.toFixed(1)}</b> years.`) +
    figs([
      { label: 'People', value: F.num(all.length), note: `${all.filter(r => r.st === 'On leave').length} on leave` },
      { label: 'Full time', value: F.num(ft), note: F.pct(ft / Math.max(1, all.length) * 100, 0) + ' of the team' },
      { label: 'Average tenure', value: `${avgTen.toFixed(1)} yrs`, note: 'from start date' },
      { label: 'New in 90 days', value: F.num(newQ), note: 'by start date' },
    ]) + sec);
});

/* -------------------------------------------------------- the employee record */

const person = page('Employee', ({ q, s, sys, arg }) => {
  const h = hr(q);
  const r = h.roster.find(x => x.id === arg) || h.roster[0];
  const pay = payOf(q, r);
  const mgr = byName(h, r.mgr);
  const reports = h.roster.filter(x => x.mgr === r.n);
  const outs = h.timeoff.out.filter(x => x.n === r.n);
  const pend = h.timeoff.pending.filter(x => x.id === r.id);
  const certs = h.compliance.expiring.filter(x => x.n === r.n);
  const card = h.attendance.cards.find(c => c.id === r.id);
  const tenure = pay.yrs < 1 ? `${Math.max(1, Math.round(pay.yrs * 12))} months` : `${pay.yrs.toFixed(1)} years`;

  const record = M.section({
    title: 'The record', src: shortOf(sys), right: actIn(sys, 'Edit this record'),
    note: `Employee ${esc(r.id)}, as ${esc(shortOf(sys))} holds it.`,
    body: `<span class="cm-eyebrow">Role</span>` + M.facts([
      { k: 'Title', v: esc(r.t) }, { k: 'Department', v: esc(r.d) },
      { k: 'Manager', v: mgr ? `<button class="cm-link" data-click="person:${esc(mgr.id)}">${esc(mgr.n)}</button>` : 'Leadership' },
      { k: 'Location', v: esc(r.loc) }, { k: 'Status', v: esc(r.st) }, { k: 'Direct reports', v: F.num(reports.length) },
    ]),
    aside: `<span class="cm-eyebrow">Pay and time</span>` + M.facts([
      { k: pay.hourly ? 'Hourly rate' : 'Annual salary', v: pay.hourly ? F.exact(pay.rate, 2) : F.exact(pay.base), hl: true, sub: esc(r.ty) },
      { k: 'Pay schedule', v: 'Every other week' },
      { k: 'Paid time off banked', v: r.pto ? `${F.num(r.pto)} hrs` : 'Not accruing' },
      { k: 'Hours this period', v: card ? `${F.num(card.reg + card.ot, 1)} hrs` : 'Salaried', sub: card ? `${F.num(card.ot, 1)} overtime` : 'not clocked' },
    ]),
  });
  const items = [...outs.map(o => ({ cells: [esc(o.k), span(o.from, o.to), '<span class="tag good">Approved</span>'] })),
    ...pend.map(o => ({ cells: [esc(o.k), span(o.from, o.to), `<span class="tag warn">Waiting</span> ${actIn(sys, 'Approve')}`] })),
    ...certs.map(c => ({ cells: [esc(c.c), day(c.due), daysBetween(h.asOf, c.due) < 0 ? '<span class="tag bad">Lapsed</span>' : '<span class="tag warn">Due</span>'] }))];
  const time = M.section({
    title: 'Time off and certifications', src: shortOf(sys),
    note: items.length ? `Booked, waiting on a manager, or coming due. Each is changed in ${esc(shortOf(sys))}.` : 'Nothing booked, waiting or due.',
    body: items.length ? U.table({ cols: [{ name: 'What', w: '40%' }, { name: 'When' }, { name: 'Where it stands', n: true }], rows: items }) : '',
  });
  return M.page(head(sys, r.n, `${esc(r.t)} in ${esc(r.d)}, ${esc(r.loc)}. Started ${dayY(r.s)}, ${tenure} ago.`, 'HR · employee record') + record + time);
});

/* ---------------------------------------------------------- Payroll & labor */

/* Labor by the industry's unit of work. Where the system of record carries labor dollars per unit
   (a restaurant's labor), that is the figure. Otherwise the payroll system's job costing spreads
   direct labor over the units in proportion to the work each one carried. */
function laborByUnit(q, months) {
  const units = q.units;
  if ((q.data.unitFacts || []).some(f => f.k === 'laborUsd')) {
    return units.map(u => ({ u, v: q.factSum('laborUsd', months, [u]) }));
  }
  const pay = q.data.people.payroll || { direct: 0 };
  const direct = pay.direct / 12 * months.length;
  const tot = q.factSum('rev', months, q.allUnits) || 1;
  return units.map(u => ({ u, v: direct * q.factSum('rev', months, [u]) / tot }));
}

const payroll = page('Payroll & labor', ({ q, s, sys }) => {
  /* ⚖️ The calm pass: what the next run pays and where labor goes. The run is a two-step track with
     its totals beside it, labor by unit is a ranking with the full table folded, and the pay that
     moved is its own block. */
  const h = hr(q), p = q.data.people, pr = h.payroll, ind = s.industry;
  const moved = pr.variances.reduce((a, v) => a + (v.now - v.last), 0);
  const lastGross = pr.gross - moved;
  const lastPay = addDays(pr.payday, -14);
  const months = q.window();
  const units = laborByUnit(q, months).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const unitTot = units.reduce((a, x) => a + x.v, 0);
  const cards = h.attendance.cards;
  const otHrs = cards.reduce((a, c) => a + c.ot, 0);
  const regHrs = cards.reduce((a, c) => a + c.reg, 0);
  const otCost = otHrs * hourlyRate(q) * 1.5;
  const pay = p.payroll || { allIn: 0, direct: 0, overhead: 0 };
  const otDept = p.departments.map(d => ({
    name: d.name, value: Math.round(cards.filter(c => c.d === d.name).reduce((a, c) => a + c.ot, 0) * 10) / 10,
  })).filter(x => x.value > 0).sort((a, b) => b.value - a.value);
  const per = F.monthsWord(months.length);

  const run = M.section({
    title: 'The next pay run', src: shortOf(sys), right: openBtn(sys, `Run payroll in ${shortOf(sys)}`),
    note: `Pay runs, tax filing and money movement stay with ${esc(shortOf(sys))}.`,
    body: `<div class="cm-hr-runs">
      <div class="cm-hr-run done"><i></i><span class="cm-eyebrow">Last run, paid</span><b>${day(lastPay)}</b><em>${F.money(lastGross)} gross</em></div>
      <div class="cm-hr-run next"><i></i><span class="cm-eyebrow">Next run</span><b>${day(pr.payday)}</b><em>submit by ${day(pr.runBy)}</em></div></div>`,
    aside: M.facts([
      { k: 'Gross', v: F.money(pr.gross), hl: true, sub: `${F.num(pr.people)} people` },
      { k: 'Net to employees', v: F.money(pr.net) },
      { k: 'Employer taxes', v: F.money(pr.taxesEr) },
      { k: 'Total debit', v: F.money(pr.debit), sub: `from the account on ${day(addDays(pr.payday, -2))}` },
    ]),
  });
  const labor = M.section({
    title: `Where labor goes`, src: shortOf(sys),
    note: `Direct labor charged to each ${esc(ind.unit.one)} over the ${esc(per.toLowerCase())} in view.`,
    body: units.length ? C.hbars({ rows: units.slice(0, 8).map(x => ({ name: x.u.short || x.u.name, value: x.v,
      note: F.pct(x.v / Math.max(1, unitTot) * 100, 0) })), fmt: v => F.money(v) })
      : `<p class="cm-hr-empty">No labor was charged to a ${esc(ind.unit.one)} in this window.</p>`,
    aside: units.length ? M.facts([
      { k: 'Charged in view', v: F.money(unitTot), hl: true },
      { k: 'Largest', v: F.money(units[0].v), sub: esc(units[0].u.short || units[0].u.name) },
      { k: `${ind.unit.many[0].toUpperCase()}${ind.unit.many.slice(1)} charged`, v: F.num(units.length) },
    ]) : '',
    fold: units.length > 8 ? U.table({ cols: [{ name: ind.unit.key || ind.unit.one, w: '50%' }, { name: 'Labor', n: true }, { name: 'Share', n: true }],
      rows: units.map(x => ({ cells: [`<b>${esc(x.u.short || x.u.name)}</b>`, F.money(x.v), F.pct(x.v / Math.max(1, unitTot) * 100, 0)] })) }) : '',
    foldLabel: `All ${units.length} ${esc(ind.unit.many)}`,
  });
  const ot = M.section({
    title: 'Overtime by department', src: shortOf(sys), note: 'Hours past forty a week this pay period, hourly staff only.',
    body: otDept.length ? C.hbars({ rows: otDept, fmt: v => `${F.num(v, 1)} hrs` }) : `<p class="cm-hr-empty">No overtime this period.</p>`,
    aside: M.facts([
      { k: 'Overtime hours', v: `${F.num(otHrs, 1)} hrs`, hl: true, sub: `${F.pct(otHrs / Math.max(1, regHrs) * 100, 1)} of hours clocked` },
      { k: 'At time and a half', v: F.money(otCost) },
    ]),
  });
  const changes = M.section({
    title: 'Pay that moved since the last run', src: shortOf(sys),
    note: `${plural(pr.variances.length, 'check differs', 'checks differ')} from the last run, and why, as ${esc(shortOf(sys))} explains it.`,
    body: U.table({
      cols: [{ name: 'Who', w: '28%' }, { name: 'Reason' }, { name: 'Last run', n: true }, { name: 'This run', n: true }, { name: 'Change', n: true }],
      rows: pr.variances.map(v => ({ click: `person:${v.id}`,
        cells: [`<b>${esc(v.n)}</b><div class="sub">${esc(v.d)}</div>`, esc(v.why), F.money(v.last), F.money(v.now),
          F.state.money === 'none' ? F.HIDDEN_MARK : F.deltaTag((v.now - v.last) / Math.max(1, v.last) * 100, { dp: 0 })] })) }),
  });

  return M.page(head(sys, 'Payroll & labor',
    `The next run pays <b>${F.num(pr.people)}</b> people on <b>${dayY(pr.payday)}</b>, ${moved >= 0 ? 'up' : 'down'} <b>${F.money(Math.abs(moved))}</b> on the last run.`) +
    figs([
      { label: 'Payroll a year', value: F.money(pay.allIn), note: 'all in, taxes and benefits' },
      { label: 'Direct labor a year', value: F.money(pay.direct), note: `charged to the ${esc(ind.unit.many)}` },
      { label: 'Overhead payroll', value: F.money(pay.overhead), note: 'everyone not on the work' },
      { label: 'Checks that moved', value: F.num(pr.variances.length), note: 'since the last run' },
    ]) + run + labor + ot + changes);
});

/* ------------------------------------------------------ Time & attendance */

const attendance = page('Time & attendance', ({ q, s, sys }) => {
  /* ⚖️ The calm pass: who is out and what is waiting on someone. The two-week calendar is the
     picture, the requests and exceptions are rows with the way to act on each, and balances fold. */
  const h = hr(q), t = h.timeoff, a = h.attendance;
  const outToday = t.out.filter(o => o.from <= h.asOf && o.to >= h.asOf);
  const reg = a.cards.reduce((x, c) => x + c.reg, 0), ot = a.cards.reduce((x, c) => x + c.ot, 0);
  const exc = a.cards.filter(c => c.exc.length);
  const avgBal = t.balances.reduce((x, b) => x + b.avg, 0) / Math.max(1, t.balances.length);
  const liability = t.balances.reduce((x, b) => x + b.liability, 0);
  const days = Array.from({ length: 14 }, (_, i) => addDays(h.asOf, i));
  const inWin = t.out.filter(o => o.to >= days[0] && o.from <= days[13]);

  const cal = M.section({
    title: 'Who is out, the next two weeks', src: shortOf(sys),
    note: 'Each row a person, each column a day, so two people out from one team at once stands out.',
    body: inWin.length ? `<div class="scroll cm-hr-cal"><table class="t cal"><thead><tr><th style="width:22%">Who</th>${days.map(d => {
      const wd = new Date(d + 'T12:00').getDay();
      return `<th class="n${wd === 0 || wd === 6 ? ' we' : ''}${d === h.asOf ? ' today' : ''}">${'SMTWTFS'[wd]}<br>${Number(d.slice(8))}</th>`; }).join('')}</tr></thead><tbody>${inWin.map(o =>
      `<tr><td><b>${esc(o.n)}</b><div class="sub">${esc(o.d)} · ${esc(o.k)}</div></td>${days.map(d => {
        const wd = new Date(d + 'T12:00').getDay();
        return `<td class="n${wd === 0 || wd === 6 ? ' we' : ''}">${d >= o.from && d <= o.to ? '<i class="cal-on" title="Out"></i>' : ''}</td>`; }).join('')}</tr>`).join('')}
      </tbody></table></div>` : `<p class="cm-hr-empty">Nobody is out in the next two weeks.</p>`,
  });
  const reqRow = p => `<div class="cm-task" data-click="person:${esc(p.id)}" tabindex="0">
      ${U.statusTag(plural(p.days, 'day', 'days'), 'warn')}
      <span class="t"><b>${esc(p.n)}</b><span>${esc(p.k)} · ${span(p.from, p.to)}</span></span>
      <span class="o">${actIn(sys, 'Approve')}</span><span class="go">${icon('arrow', 14)}</span></div>`;
  const excRow = c => `<div class="cm-task" data-click="person:${esc(c.id)}" tabindex="0">
      ${U.statusTag('Held', 'bad')}
      <span class="t"><b>${esc(c.n)}</b><span>${esc(c.exc.join(', '))}</span></span>
      <span class="o">${F.num(c.reg + c.ot, 1)} hrs</span><span class="go">${icon('arrow', 14)}</span></div>`;
  const waiting = M.section({
    title: 'Waiting on someone', src: shortOf(sys),
    note: `Requests are decided and cards are cleared in ${esc(shortOf(sys))}.`,
    body: `<div class="cm-two cm-hr-two">
      <div><span class="cm-eyebrow">Time off requests · ${F.num(t.pending.length)}</span>${t.pending.length
        ? `<div class="cm-tasks">${t.pending.slice(0, 4).map(reqRow).join('')}</div>${t.pending.length > 4 ? M.details(`${t.pending.length - 4} more`, `<div class="cm-tasks">${t.pending.slice(4).map(reqRow).join('')}</div>`) : ''}` : '<p class="cm-hr-empty">Nothing waiting.</p>'}</div>
      <div><span class="cm-eyebrow">Timecard exceptions · ${F.num(exc.length)}</span>${exc.length
        ? `<div class="cm-tasks">${exc.slice(0, 4).map(excRow).join('')}</div>${exc.length > 4 ? M.details(`${exc.length - 4} more`, `<div class="cm-tasks">${exc.slice(4).map(excRow).join('')}</div>`) : ''}` : '<p class="cm-hr-empty">Every card is clean.</p>'}</div></div>`,
  });
  const bal = M.section({
    title: 'Paid time off banked', src: shortOf(sys), note: 'Average hours banked per full-time person, by department.',
    body: C.hbars({ rows: t.balances.map(b => ({ name: b.d, value: b.avg, note: `${F.pct(b.used, 0)} used` })), fmt: v => `${F.num(v)} hrs` }),
    aside: M.facts([
      { k: 'Average banked', v: `${avgBal.toFixed(0)} hrs`, sub: 'full-time staff' },
      { k: 'Liability', v: F.money(liability), hl: true, sub: 'unused hours at pay rate' },
    ]),
    fold: U.table({ cols: [{ name: 'Department' }, { name: 'Avg banked', n: true }, { name: 'Used this year', n: true }, { name: 'Liability', n: true }],
      rows: t.balances.map(b => ({ cells: [`<b>${esc(b.d)}</b>`, `${b.avg} hrs`, F.pct(b.used, 0), F.money(b.liability)] })) }),
    foldLabel: 'Balances as a table',
  });

  return M.page(head(sys, 'Time & attendance',
    `<b>${F.num(outToday.length)}</b> ${outToday.length === 1 ? 'person is' : 'people are'} out today and <b>${F.num(t.pending.length + exc.length)}</b> ${t.pending.length + exc.length === 1 ? 'item waits' : 'items wait'} on a manager.`) +
    figs([
      { label: 'Hours this period', value: F.num(reg + ot, 0), note: `${span(a.from, a.to)}, ${a.cards.length} cards` },
      { label: 'Overtime', value: `${F.num(ot, 1)} hrs`, note: F.pct(ot / Math.max(1, reg) * 100, 1) + ' of regular' },
      { label: 'Out today', value: F.num(outToday.length), note: `${F.num(inWin.length)} in two weeks` },
      { label: 'Waiting', value: F.num(t.pending.length + exc.length), note: 'requests and held cards' },
    ]) + cal + waiting + bal);
});

/* ----------------------------------------------------------------- Hiring */

const hiring = page('Hiring', ({ q, s, sys }) => {
  const h = hr(q), g = h.hiring;
  if (!sys.ats) {
    const alt = recommended(s, c => c.ats && c.id !== sys.id);
    return M.page(head(sys, 'Hiring', `${esc(sys.name)} does not hold hiring, so this page shows no applicant figures.`) +
      M.section({ title: 'Where hiring would come from',
        note: `Not held in ${esc(shortOf(sys))}.`, right: U.btn('Integrations', { act: 'go', arg: 'settings', sm: true }),
        body: `<p class="cm-hr-empty">Open roles and applicants live wherever the company recruits today, and nothing is shown
          here until a system that holds them is connected.
          ${alt ? `${esc(alt.name)} carries recruiting alongside HR, so connecting it would fill this page.` : ''}</p>` }));
  }
  /* ⚖️ The calm pass: are the roles filling. The funnel is the picture, each role is a row in its own
     block, and new starters fold after the first few. */
  const stages = ['Applied', 'Screened', 'Interviewed', 'Offer'];
  const tot = stages.map((_, i) => g.reqs.reduce((a, r) => a + r.stages[i], 0));
  const recent = roster(q).filter(r => daysBetween(r.s, h.asOf) <= 60).sort((a, b) => b.s.localeCompare(a.s));
  const oldest = g.reqs.slice().sort((a, b) => b.days - a.days)[0];

  const funnel = M.section({
    title: 'Are the roles filling', src: shortOf(sys), note: 'Every open role added together, stage by stage.',
    body: C.hbars({ rows: stages.map((st, i) => ({ name: st, value: tot[i], note: i ? F.pct(tot[i] / Math.max(1, tot[i - 1]) * 100, 0) + ' of the stage before' : '' })), fmt: v => F.num(v) }),
    aside: M.facts([
      { k: 'Pass the screen', v: F.pct(tot[1] / Math.max(1, tot[0]) * 100, 0), sub: 'of applicants' },
      { k: 'Offers out', v: F.num(tot[3]), hl: true },
      oldest ? { k: 'Open longest', v: `${oldest.days} days`, sub: esc(oldest.t) } : null,
    ]),
  });
  const roles = M.section({
    title: 'Each open role', src: shortOf(sys), note: `Where every role stands. Candidates are moved in ${esc(shortOf(sys))}.`,
    body: U.table({
      cols: [{ name: 'Role', w: '34%' }, { name: 'Open', n: true }, ...stages.map(st => ({ name: st, n: true }))],
      rows: g.reqs.map(r => ({ cells: [`<b>${esc(r.t)}</b><div class="sub">${esc(r.d)} · ${esc(r.src)}</div>`,
        `<span class="agepill ${r.days > 120 ? 'bad' : r.days > 60 ? 'warn' : ''}">${r.days}d</span>`,
        ...r.stages.map((n, i) => (i === 3 && n ? `<span class="tag good">${n}</span>` : F.num(n)))] })) }),
  });
  const joinRow = r => personRow(r, `started ${day(r.s)}`);
  const joined = M.section({
    title: 'Joined in the last 60 days', src: shortOf(sys),
    note: recent.length ? `${plural(recent.length, 'new starter', 'new starters')}, newest first.` : 'Nobody joined in the last 60 days.',
    body: recent.length ? `<div class="cm-tasks">${recent.slice(0, 4).map(joinRow).join('')}</div>` : '',
    fold: recent.length > 4 ? `<div class="cm-tasks">${recent.slice(4).map(joinRow).join('')}</div>` : '',
    foldLabel: `${recent.length - 4} more`,
  });

  return M.page(head(sys, 'Hiring',
    `<b>${g.reqs.length}</b> open roles with <b>${F.num(tot[0])}</b> applicants between them. Roles fill in <b>${g.timeToFill}</b> days on average.`) +
    figs([
      { label: 'Open roles', value: F.num(g.reqs.length), note: `in ${esc(shortOf(sys))} recruiting` },
      { label: 'Applicants', value: F.num(tot[0]), note: `${tot[2]} interviewed` },
      { label: 'Days to fill', value: F.num(g.timeToFill), note: 'average, last 12 months' },
      { label: 'Offers accepted', value: F.pct(g.accept, 0), note: 'last 12 months' },
    ]) + funnel + roles + joined);
});

/* ------------------------------------------------------------- Compliance */

const compliance = page('Compliance', ({ q, s, sys }) => {
  /* ⚖️ The calm pass: is anyone working without a current certificate. Lapsed and due-soon people are
     rows that open their record, the rest of the 90 days folds, then gaps and training. */
  const h = hr(q), c = h.compliance;
  const lapsed = c.expiring.filter(e => e.due < h.asOf);
  const soon = c.expiring.filter(e => e.due >= h.asOf && daysBetween(h.asOf, e.due) <= 30);
  const later = c.expiring.filter(e => daysBetween(h.asOf, e.due) > 30);
  const gaps = c.gaps.reduce((a, g) => a + g.n, 0);
  const avgTrain = c.courses.reduce((a, x) => a + x.pct, 0) / c.courses.length;
  const low = c.courses.slice().sort((a, b) => a.pct - b.pct)[0];
  const certRow = e => {
    const r = byName(h, e.n) || { id: '', n: e.n }, d = daysBetween(h.asOf, e.due);
    return personRow({ ...r, t: e.c, d: e.d }, `due ${day(e.due)}`,
      U.statusTag(d < 0 ? `${-d}d over` : `${d}d left`, d < 0 ? 'bad' : 'warn'));
  };
  const now = lapsed.concat(soon);
  const certs = M.section({
    title: 'Who needs a renewal', src: shortOf(sys),
    note: `Lapsed first, then due within 30 days. Renewals are recorded in ${esc(shortOf(sys))}.`,
    body: now.length ? `<div class="cm-tasks">${now.map(certRow).join('')}</div>` : '<p class="cm-hr-empty">Nothing lapsed or due within 30 days.</p>',
    fold: later.length ? U.table({ cols: [{ name: 'Who', w: '28%' }, { name: 'Certification' }, { name: 'Due', n: true }, { name: '', n: true }],
      rows: later.map(e => ({ click: link(h, e.n), cells: [`<b>${esc(e.n)}</b><div class="sub">${esc(e.d)}</div>`, esc(e.c), day(e.due),
        `<span class="agepill">${daysBetween(h.asOf, e.due)}d</span>`] })) }) : '',
    foldLabel: `${later.length} more due within 90 days`,
  });
  const gapSec = M.section({
    title: 'What records are missing', src: shortOf(sys), note: 'Documents the company is required to hold.',
    body: C.hbars({ rows: c.gaps.map(g => ({ name: g.k, value: g.n })), fmt: v => F.num(v) }),
    aside: (() => { const big = c.gaps.slice().sort((a, b) => b.n - a.n)[0];
      return M.facts([{ k: 'Largest gap', v: F.num(big.n), hl: true, sub: esc(big.k) }, { k: 'Kinds of document short', v: F.num(c.gaps.filter(g => g.n).length) }]); })(),
  });
  const train = M.section({
    title: 'Required training', src: shortOf(sys), note: 'Each course by the share of the team that has finished it.',
    body: U.table({ cols: [{ name: 'Course', w: '32%' }, { name: 'Complete', w: '40%' }, { name: '', n: true }, { name: 'Due', n: true }],
      rows: c.courses.map(x => ({ cells: [`<b>${esc(x.c)}</b>`,
        `<div class="meter${x.pct < 75 ? ' bad' : x.pct < 90 ? ' warn' : ''}"><i style="width:${Math.min(100, x.pct).toFixed(0)}%"></i></div>`,
        F.pct(x.pct, 0), day(x.due)] })) }),
  });

  return M.page(head(sys, 'Compliance',
    `<b>${F.num(now.length)}</b> ${now.length === 1 ? 'person needs' : 'people need'} a renewal now, and ${esc(low.c)} is furthest behind at <b>${F.pct(low.pct, 0)}</b> complete.`) +
    figs([
      { label: 'Lapsed', value: F.num(lapsed.length), note: 'certifications past due' },
      { label: 'Due in 30 days', value: F.num(soon.length), note: `${c.expiring.length} due in 90` },
      { label: 'Document gaps', value: F.num(gaps), note: 'records missing a document' },
      { label: 'Training complete', value: F.pct(avgTrain, 0), note: 'average across required courses' },
    ]) + certs + gapSec + train);
});

export const HR_PAGES = ['hr-home', 'hr-people', 'hr-payroll', 'hr-time', 'hr-hiring', 'hr-compliance', 'hr-person'];

export const hrPages = {
  'hr-home': home, 'hr-people': people, 'hr-payroll': payroll, 'hr-time': attendance,
  'hr-hiring': hiring, 'hr-compliance': compliance, 'hr-person': person,
};
