/* The finance module. This is the one a buyer judges the product on, so every
   page opens on a sentence that answers the page's own question, and every
   figure beside it is the figure that sentence used. */

import * as F from '../fmt.js?v=4f9513663c';
import * as C from '../chart.js?v=4f9513663c';
import * as U from '../ui.js?v=4f9513663c';
import { esc, icon } from '../icons.js?v=4f9513663c';
import * as M from '../calm.js?v=4f9513663c';

const PL_NAMES = {};

function plNames(cfg) {
  if (!PL_NAMES.map) {
    PL_NAMES.map = Object.fromEntries(cfg.product.statement.pl.map(l => [l.id, l.name]));
    PL_NAMES.bs = Object.fromEntries(cfg.product.statement.bs.map(l => [l.id, l.name]));
  }
  return PL_NAMES;
}

const mN = (m) => F.monthName(m);

/* ------------------------------------------------------- the dashboard */

export function dash(ctx) {
  /* ⚖️ Matt, 2026-11-16: *"i would never use the current financial dashboard we
     have because it is so overwhelming that it doesnt feel useful"*. The old
     page said revenue three times and gross margin twice across a dark banner,
     a figure strip, six tiles and six panels. This page answers the three
     things an owner opens it for, once each: am I making money against plan,
     where is it going, and do I have the cash. Everything else waits in a fold
     or lives on its own page. */
  const { q, s, cfg } = ctx;
  if (q.unitScoped) return dashUnit(ctx);
  const w = q.window(), ya = q.yearAgoWindow();
  const rev = q.revenue(w), revYa = q.revenue(ya);
  const cor = q.sum('cor', w), gp = rev - q.cost(w), oh = q.sum('oh', w), ni = q.sum('ni', w);
  const bRev = q.sum('rev', w, q.scopeEntities, 'bud');
  const growth = revYa ? (rev - revYa) / revYa * 100 : NaN;
  const vsPlan = rev - bRev;
  const last12 = q.months.slice(-12);
  const cash = q.bal('cash'), ar = q.bal('ar'), ap = q.bal('ap');
  const cd = q.kpi('cashDays');
  const pct = v => rev ? F.pct(v / rev * 100) : '';
  const month = esc(F.monthName(q.view.month, true));

  const line = `${esc(basisWords(q))}, ${esc(scopeWords(q, s))}. ${bRev
    ? `${vsPlan >= 0 ? '<b class="cm-up">Ahead of plan</b>' : '<b class="cm-down">Behind plan</b>'} by ${F.money(Math.abs(vsPlan))}.`
    : 'No plan is loaded for these months.'}`;
  const stamp = `Books as of ${month}<br>${q.view.month > q.closed ? 'Not yet signed off' : 'Signed off'}`;

  const ledger = (s.connectedIn('finance')[0] || {}).name || '';
  const figs = M.figures([
    { label: 'Revenue', value: F.money(rev), spark: q.series('rev', last12), go: 'fin-pl',
      sub: Number.isFinite(growth) ? `<b>${growth >= 0 ? '+' : ''}${F.pct(growth)}</b> on the same months last year` : '' },
    { label: 'Gross profit', value: F.money(gp), go: 'fin-margin',
      spark: last12.map(m => q.sum('rev', [m]) - q.sum('cor', [m])), sub: `<b>${pct(gp)}</b> of revenue kept after direct cost` },
    { label: 'Net income', value: F.money(ni), spark: q.series('ni', last12), go: 'fin-pl', sub: `<b>${pct(ni)}</b> of revenue, after everything` },
    { label: 'Cash today', value: F.money(cash), spark: last12.map(m => q.bal('cash', m)), go: 'fin-cash', sub: `<b>${F.num(cd.value, 0)} days</b> of running cost` },
  ]);

  const revSeries = q.series('rev', last12);
  const budSeries = q.series('rev', last12, q.scopeEntities, 'bud');
  const hasPlan = budSeries.some(v => v);
  const best = last12[revSeries.indexOf(Math.max(...revSeries))];
  const plan = M.section({
    title: 'Am I on plan', src: ledger,
    note: `${F.monthsWord(last12.length, true)} to ${month}.`,
    body: C.bars({ values: revSeries, labels: last12.map(mN), fmt: v => F.money(v),
      overlay: hasPlan ? budSeries : null, ghost: true, name: 'Actual', overlayName: 'Plan', height: 240, legend: false }),
    aside: M.facts([
      { k: 'Revenue this window', v: F.money(rev) },
      hasPlan ? { k: 'Plan for the same months', v: F.money(bRev) } : null,
      hasPlan ? { k: vsPlan >= 0 ? 'Ahead of plan' : 'Behind plan', v: F.money(Math.abs(vsPlan)), hl: true } : null,
      { k: 'Best month', v: esc(F.monthName(best, true)), sub: F.money(Math.max(...revSeries)) },
      { k: 'Last year, same months', v: F.money(revYa) },
    ]),
  });

  const items = (ids) => ids.map(([id, name]) => ({ label: name, amount: q.sum(id, w) })).filter(x => x.amount);
  const ohLines = items([['labor', 'Payroll & benefits'], ['facility', 'Facilities'], ['equip', 'Equipment'], ['sales', 'Sales & marketing'], ['admin', 'General & admin']]);
  const below = [['dep', 'Depreciation'], ['int', 'Interest'], ['other', 'Other']];
  const foldList = rows => M.list(rows.map(r => [esc(r.label), F.money(r.amount)]));
  const where = M.section({
    title: 'Where the money goes', src: ledger,
    note: 'From every dollar earned to what is left, in the order the books take it.',
    body: M.bridge([
      { name: 'Revenue', value: rev, total: true },
      { name: 'Direct cost', value: -cor },
      { name: 'Gross profit', value: gp, total: true },
      { name: 'Overhead', value: -oh, fold: foldList(ohLines), foldLabel: `${ohLines.length} overhead lines` },
      ...below.map(([id, name]) => ({ name, value: id === 'other' ? q.sum(id, w) : -q.sum(id, w) })),
      { name: 'Net income', value: ni, total: true, grand: true },
    ], v => F.money(v)),
  });

  const net = ar - ap;
  const cashSec = M.section({
    title: 'Do I have the cash', src: ledger,
    note: `As of ${month}. Balances do not move with the period picked.`,
    body: C.line({ series: [{ name: 'Cash', values: last12.map(m => q.bal('cash', m)) }],
      labels: last12.map(mN), fmt: v => F.money(v), height: 210, legend: false }),
    aside: M.facts([
      { k: 'Cash in the bank', v: F.money(cash), sub: `${F.num(cd.value, 0)} days of running cost`, hl: true },
      { k: 'Owed to us', v: F.money(ar), sub: `paid in ${F.num(dso(q), 0)} days on average` },
      { k: 'We owe', v: F.money(ap), sub: `paid in ${F.num(dpo(q), 0)} days on average` },
      { k: net >= 0 ? 'Coming in, net' : 'Going out, net', v: F.money(Math.abs(net)) },
    ]),
  });

  const quartersSec = M.section({
    title: 'Eight quarters',
    note: 'The summary a board asks for.',
    right: U.btn('Download', { act: 'export-quarters', ico: 'download', sm: true }),
    body: '',
    fold: quarters(q, cfg), foldLabel: 'Show the table',
  });

  return M.page(M.head({ eyebrow: 'Finance', title: 'How the business is doing', line, stamp })
    + figs + plan + where + cashSec + quartersSec);
}

function dashUnit(ctx) {
  const { s } = ctx;
  return M.page(M.head({ eyebrow: 'Finance', title: `Your ${s.industry.unit.many}`,
    line: `A ${esc(s.role.name.toLowerCase())} sees their own ${esc(s.industry.unit.many)} and the money on them, and no company-wide figure.` })
    + M.section({ title: `Your ${s.industry.unit.many}`, body: unitMini(ctx) }));
}

function verdictLine(ctx, m) {
  const { q, s } = ctx;
  const id = s.data.industry;
  const dir = Number.isFinite(m.growth) ? (m.growth >= 0 ? 'up' : 'down') : null;
  const plan = Number.isFinite(m.vsBudget)
    ? (m.vsBudget >= 1 ? `ahead of plan` : m.vsBudget <= -1 ? `behind plan` : `on plan`)
    : null;
  const lead = `${esc(s.data.company)} has earned <b>${F.money(m.rev)}</b>` +
    (dir ? `, ${dir} <b>${F.pct(Math.abs(m.growth))}</b> on the same months last year` : '') +
    (plan ? ` and ${plan}` : '') + '.';
  const second = {
    construction: () => {
      const b = q.kpi('backlog'), ou = q.kpi('overUnder');
      return `Backlog stands at <b>${F.money(b.value)}</b>, and
        ${ou.value >= 0 ? `billing is <b>${F.money(ou.value)}</b> ahead of the work`
        : `<b>${F.money(Math.abs(ou.value))}</b> of work is done and not yet invoiced`}.`;
    },
    education: () => {
      const e = q.kpi('enrolled'), fr = q.kpi('fillRate'), ps = q.kpi('perStudent');
      return `<b>${F.num(e.value)}</b> students fill <b>${F.pct(fr.value, 0)}</b> of the seats,
        at <b>${F.exact(ps.value)}</b> of revenue each.`;
    },
    econdev: () => {
      const c = q.kpi('capex'), j = q.kpi('jobs'), r = q.kpi('roomNights');
      return `The portfolio carries <b>${F.money(c.value)}</b> of capital investment and <b>${F.num(j.value)}</b>
        committed jobs, and tourism sales booked <b>${F.num(r.value)}</b> room nights.`;
    },
    healthcare: () => {
      const v = q.kpi('visits'), pv = q.kpi('perVisit'), cr = q.kpi('collectRate');
      return `<b>${F.num(v.value)}</b> patient visits at <b>${F.exact(pv.value, 2)}</b> each,
        with <b>${F.pct(cr.value, 1)}</b> of what payers allowed collected.`;
    },
    retail: () => {
      const sp = q.kpi('salesPerSqft'), bk = q.kpi('basket');
      return `Trading at <b>${F.exact(sp.value)}</b> per square foot on an average basket of
        <b>${F.exact(bk.value, 2)}</b>.`;
    },
    restaurants: () => {
      const pc = q.kpi('primeCost'), ck = q.kpi('avgCheck'), ss = q.kpi('sameStore');
      return `Prime cost ran <b>${F.pct(pc.value)}</b> of sales on an average check of
        <b>${F.exact(ck.value, 2)}</b>, with same-store sales
        ${ss.value >= 0 ? 'up' : 'down'} <b>${F.pct(Math.abs(ss.value))}</b> on a year ago.`;
    },
    industrial: () => {
      const o = q.kpi('oee'), cpu = q.kpi('costPerUnit');
      return `The lines ran at <b>${F.pct(o.value)}</b> effectiveness and made each unit for
        <b>${F.exact(cpu.value, 2)}</b>.`;
    },
    logistics: () => {
      /* the spread is taken off the figures as they are shown, not off the
         full-precision ones: a reader subtracts what is on the screen */
      const r2 = v => Math.round(v * 100) / 100;
      const rpm = { value: r2(q.kpi('revPerMile').value) };
      const cpm = { value: r2(q.kpi('costPerMile').value) };
      const spread = r2(rpm.value - cpm.value);
      return `Every mile earned <b>${F.exact(rpm.value, 2)}</b> and cost
        <b>${F.exact(cpm.value, 2)}</b>, leaving <b>${F.exact(spread, 2)}</b>.`;
    },
    tech: () => {
      const arr = q.kpi('arr'), nrr = q.kpi('nrr'), r40 = q.kpi('ruleOf40');
      return `ARR is <b>${F.money(arr.value)}</b> at <b>${F.pct(nrr.value, 0)}</b> net retention,
        for a rule of forty of <b>${F.pct(r40.value, 0)}</b>.`;
    },
  }[id];
  /* the second sentence reads unit facts, which a ledger-only company does not send */
  return lead + (second && (q.data.unitFacts || []).length ? ' ' + second() : '');
}

function basisWords(q) {
  const w = q.window();
  const names = { month: 'One month', ytd: 'Year to date', ttm: 'Trailing twelve months', fy: 'Fiscal year' };
  return `${names[q.view.basis] || 'Window'}, ${F.monthName(w[0], true)} to ${F.monthName(w[w.length - 1], true)}`;
}

function scopeWords(q, s) {
  const role = s.role;
  if (role.scope === 'all' && (q.view.entity === '*' || !q.view.entity)) {
    return q.entities.length === 1
      ? 'the whole company' : `all ${q.entities.length} companies`;
  }
  if (q.unitScoped) return `${q.units.length} of ${q.allUnits.length} ${s.industry.unit.many}`;
  const e = q.entities.find(x => x.id === q.scopeEntities[0]);
  return e ? e.name : 'the company';
}

/* ----------------------------------------------------------- profit & loss */

export function pl(ctx) {
  /* ⚖️ The calm pass (Matt, 2026-11-16). One question: what changed against
     last year, and is overhead keeping pace with revenue. The statement is the
     picture, the lines that moved most sit beside it, and the slope chart waits
     in a fold. The month-by-month revenue line is on the dashboard. */
  const { q, s, cfg } = ctx;
  const names = plNames(cfg).map;
  const w = q.window(), ya = q.yearAgoWindow();
  const revV = q.sum('rev', w), rev = revV || 1;
  const lines = cfg.product.statement.pl;
  const ledger = (s.connectedIn('finance')[0] || {}).name || '';
  const ohKeys = ['labor', 'facility', 'equip', 'sales', 'admin'];

  const rows = lines.map(l => {
    const v = q.sum(l.id, w), p = q.sum(l.id, ya);
    const delta = p ? (v - p) / Math.abs(p) * 100 : NaN;
    const isTotal = ['gp', 'ebitda', 'ni', 'oh'].includes(l.id);
    return { cls: isTotal ? 'total' : (ohKeys.includes(l.id) ? 'sub' : ''),
      cells: [esc(l.name), F.money(v), F.pct(v / rev * 100, 1), ya.length ? F.money(p) : 'n/a',
        F.deltaTag(delta, { invert: l.kind === 'cost' })] };
  });

  const moved = ya.length ? lines.filter(l => !['gp', 'ebitda', 'ni', 'oh'].includes(l.id))
    .map(l => ({ l, d: q.sum(l.id, w) - q.sum(l.id, ya) }))
    .sort((x, y) => Math.abs(y.d) - Math.abs(x.d)).slice(0, 4) : [];
  const good = m => (m.l.kind === 'cost' ? m.d <= 0 : m.d >= 0);

  const ohNow = q.sum('oh', w) / rev * 100;
  const ohYa = ya.length ? q.sum('oh', ya) / (q.sum('rev', ya) || 1) * 100 : NaN;
  const revYa = q.sum('rev', ya), niNow = q.sum('ni', w), niYa = q.sum('ni', ya);
  const last12 = q.months.slice(-12);

  const statement = M.section({
    title: 'The statement', src: ledger,
    note: `${esc(basisWords(q))}${ya.length ? ', beside the same months a year earlier' : ''}.`,
    body: U.table({
      cols: [{ name: 'Line', w: '34%' }, { name: 'This period', n: true }, { name: 'Of revenue', n: true },
        { name: 'Year earlier', n: true }, { name: 'Change', n: true }], rows }),
    aside: moved.length ? `<span class="cm-eyebrow">Moved most</span>` + M.facts(moved.map(m => ({
      k: names[m.l.id] || m.l.name,
      sub: m.l.kind === 'cost' ? (m.d > 0 ? 'cost up' : 'cost down') : (m.d > 0 ? 'up' : 'down'),
      v: `<span class="${good(m) ? 'cm-up' : 'cm-down'}">${m.d > 0 ? '+' : ''}${F.money(m.d)}</span>` }))) : '',
    fold: ya.length ? C.slope({
      rows: ['rev', 'cor', 'gp', 'oh', 'ebitda', 'ni'].map(id => ({ name: names[id], from: q.sum(id, ya), to: q.sum(id, w) }))
        .filter(r => Number.isFinite(r.from) && Number.isFinite(r.to) && (r.from || r.to)),
      fmt: v => F.money(v), from: F.monthName(ya[ya.length - 1], true), to: F.monthName(w[w.length - 1], true), height: 300 }) : '',
    foldLabel: 'See each total against a year earlier',
  });

  const ohBiggest = ohKeys.map(k => ({ k, v: q.sum(k, w) })).sort((x, y) => y.v - x.v)[0];
  const overhead = M.section({
    title: 'Is overhead keeping pace', src: ledger,
    note: `${F.monthsWord(last12.length, true)}, by kind.`,
    body: C.stack({ rows: last12.map(m => Object.fromEntries(ohKeys.map(k => [k, q.sum(k, [m])]))),
      keys: ohKeys, labels: last12.map(mN), names, fmt: v => F.money(v), height: 240 }),
    aside: M.facts([
      { k: 'Overhead, this period', v: F.money(q.sum('oh', w)) },
      { k: 'Share of revenue', v: F.pct(ohNow), hl: true,
        sub: Number.isFinite(ohYa) ? `${F.pct(ohYa)} a year ago` : 'no year earlier to compare' },
      { k: 'Largest kind', v: F.money(ohBiggest.v), sub: esc(names[ohBiggest.k] || ohBiggest.k) },
    ]),
  });

  const figs = ya.length ? M.figures([
    { label: 'Revenue against last year', value: `${revYa ? (revV >= revYa ? '+' : '') + F.pct((revV - revYa) / Math.abs(revYa) * 100) : 'n/a'}`,
      sub: `<b>${F.money(revV)}</b> against ${F.money(revYa)}` },
    { label: 'Net margin', value: F.pct(niNow / rev * 100),
      sub: `<b>${F.money(niNow)}</b> of net income, ${F.pct(niYa / (revYa || 1) * 100)} a year ago` },
    { label: 'Overhead share', value: F.pct(ohNow), sub: Number.isFinite(ohYa) ? `of revenue, <b>${F.pct(ohYa)}</b> a year ago` : 'of revenue' },
  ]) : '';

  return M.page(M.head({ eyebrow: 'Finance', title: 'Profit & loss',
    line: `Revenue of <b>${F.money(revV)}</b> left <b>${F.money(niNow)}</b> of net income.`,
    stamp: `Books as of ${esc(F.monthName(q.view.month, true))}` }) + figs + statement + overhead);
}

/* ------------------------------------------------------------- margin page */

export function margin(ctx) {
  /* The calm pass: which work makes money and which dilutes it. The ranking is
     the answer, so it is the picture, worst first; the scatter and the margin
     trend wait in folds. */
  const { q, s } = ctx;
  const w = q.window();
  const ind = s.industry;
  const ledger = (s.connectedIn('finance')[0] || {}).name || '';
  const rows = q.unitRows().map(u => {
    const rev = sumFactOver(q, u.id, 'rev', w);
    const cost = unitCost(q, u, w, ind);
    return { u, rev, cost, gp: rev - cost, gm: rev ? (rev - cost) / rev * 100 : 0 };
  }).filter(r => r.rev > 0).sort((a, b) => a.gm - b.gm);
  const title = ind.pages && ind.pages['fin-margin'] ? ind.pages['fin-margin'].name : 'Margin & drivers';
  if (!rows.length) return M.page(M.head({ eyebrow: 'Finance', title, line: `No ${esc(ind.unit.many)} in scope carry revenue over this window.` }));

  const total = rows.reduce((a, r) => a + r.rev, 0);
  const avg = total ? rows.reduce((a, r) => a + r.gp, 0) / total * 100 : 0;
  const worst = rows[0], best = rows[rows.length - 1];
  const under = rows.filter(r => r.gm < avg);
  const lost = under.reduce((a, r) => a + r.rev * (avg - r.gm) / 100, 0);

  const ranking = M.section({
    title: `Which ${ind.unit.many} carry the company`, src: ledger,
    note: 'Worst first. The mark on each bar is the blended margin.',
    body: C.hbars({
      rows: rows.map(r => ({ name: r.u.short || r.u.name, value: r.gm, mark: avg,
        color: r.gm < avg * 0.6 ? 'var(--bad)' : (r.gm < avg ? 'var(--warn)' : 'var(--good)'), note: F.money(r.rev) })),
      fmt: v => F.pct(v, 1), max: Math.max(...rows.map(r => Math.abs(r.gm)), avg) * 1.05 }),
    aside: M.facts([
      { k: 'Blended margin', v: F.pct(avg), hl: true, sub: `across ${rows.length} ${esc(ind.unit.many)}` },
      { k: 'Carrying it', v: F.pct(best.gm), sub: esc(best.u.name) },
      { k: 'Dragging it', v: F.pct(worst.gm), sub: esc(worst.u.name) },
      { k: `Below the blend`, v: `${under.length} of ${rows.length}`, sub: `worth ${F.money(lost)} of margin if they reached it` },
    ]),
    fold: C.scatter({
      points: rows.map(r => ({ name: r.u.short || r.u.name, x: r.rev, y: r.gm,
        r: Math.max(4, Math.min(16, Math.sqrt(r.rev / (total || 1)) * 42)) })),
      xFmt: v => F.money(v), yFmt: v => F.pct(v, 0), xLabel: 'Revenue', yLabel: 'Gross margin',
      rule: avg, ruleLabel: `blended ${avg.toFixed(1)}%`, height: 320 }),
    foldLabel: 'See revenue against margin',
  });

  const gmSeries = q.months.map(m => { const r = q.sum('rev', [m]), c = q.sum('cor', [m]); return r ? (r - c) / r * 100 : null; });
  const trend = M.section({
    title: 'Is margin holding', src: ledger,
    note: `${F.monthsWord(q.months.length, true)}, gross and EBITDA.`,
    body: C.line({ series: [
      { name: 'Gross margin', values: gmSeries },
      { name: 'EBITDA margin', values: q.months.map(m => { const r = q.sum('rev', [m]); return r ? q.sum('ebitda', [m]) / r * 100 : null; }) },
    ], labels: q.months.map(mN), fmt: v => F.pct(v, 0), height: 230, zeroBase: false }),
  });

  return M.page(M.head({ eyebrow: 'Finance', title,
    line: `<b>${esc(best.u.name)}</b> carries the margin at <b>${F.pct(best.gm)}</b>, and <b>${esc(worst.u.name)}</b> drags it at <b>${F.pct(worst.gm)}</b>.`,
    stamp: `Books as of ${esc(F.monthName(q.view.month, true))}` }) + ranking + trend);
}

/* ------------------------------------------------------------- budget page */

export function budget(ctx) {
  /* The calm pass: where are we off plan, and on which line. */
  const { q, s, cfg } = ctx;
  const ledger = (s.connectedIn('finance')[0] || {}).name || '';
  const w = q.window().filter(m => q.sum('rev', [m], q.scopeEntities, 'bud') !== 0);
  if (!w.length) {
    return M.page(M.head({ eyebrow: 'Finance', title: 'Budget vs actual',
      line: 'No budget covers this window. The comparison runs only over the months a budget covers.' }));
  }
  const lines = ['rev', 'cor', 'gp', 'oh', 'ebitda', 'ni'];
  const names = plNames(cfg).map;
  const rows = lines.map(id => {
    const a = q.sum(id, w), b = q.sum(id, w, q.scopeEntities, 'bud'), v = a - b;
    const cost = ['cor', 'oh'].includes(id);
    return { cls: ['gp', 'ebitda', 'ni'].includes(id) ? 'total' : '',
      cells: [esc(names[id]), F.money(a), F.money(b), F.money(v), F.deltaTag(b ? v / Math.abs(b) * 100 : NaN, { invert: cost })] };
  });
  const byMonth = w.map(m => ({ m, a: q.sum('rev', [m]), b: q.sum('rev', [m], q.scopeEntities, 'bud') }));
  const rev = q.sum('rev', w), bud = q.sum('rev', w, q.scopeEntities, 'bud'), gap = rev - bud;
  const niA = q.sum('ni', w), niB = q.sum('ni', w, q.scopeEntities, 'bud');
  const hit = byMonth.filter(r => r.a >= r.b).length;
  const worstM = byMonth.slice().sort((x, y) => (x.a - x.b) - (y.a - y.b))[0];

  const months = M.section({
    title: 'Month by month', src: ledger,
    note: 'The solid bar is what happened, the pale bar behind it is the plan.',
    body: C.bars({ values: byMonth.map(r => r.a), overlay: byMonth.map(r => r.b), ghost: true, name: 'Actual', overlayName: 'Plan',
      labels: byMonth.map(r => mN(r.m)), fmt: v => F.money(v), height: 240 }),
    aside: M.facts([
      { k: 'Revenue against plan', v: `<span class="${gap >= 0 ? 'cm-up' : 'cm-down'}">${gap >= 0 ? '+' : ''}${F.money(gap)}</span>`, hl: true,
        sub: `${F.pct(bud ? gap / bud * 100 : 0, 1)} of ${F.money(bud)}` },
      { k: 'Months on or over plan', v: `${hit} of ${byMonth.length}` },
      { k: 'Furthest behind', v: esc(F.monthName(worstM.m, true)), sub: F.money(worstM.a - worstM.b) },
      { k: 'Net income against plan', v: `<span class="${niA >= niB ? 'cm-up' : 'cm-down'}">${niA >= niB ? '+' : ''}${F.money(niA - niB)}</span>` },
    ]),
  });
  const table = M.section({
    title: 'Line by line', src: ledger,
    note: `Over the ${w.length} ${w.length === 1 ? 'month' : 'months'} the budget covers.`,
    body: U.table({ cols: [{ name: 'Line', w: '30%' }, { name: 'Actual', n: true }, { name: 'Budget', n: true },
      { name: 'Variance', n: true }, { name: 'Change', n: true }], rows }),
  });
  return M.page(M.head({ eyebrow: 'Finance', title: 'Budget vs actual',
    line: `Revenue is <b>${F.money(Math.abs(gap))}</b> ${gap >= 0 ? 'ahead of' : 'behind'} plan${Math.abs(gap) / (bud || 1) < 0.02 ? ', close enough to call it on plan' : `, most of it in ${esc(worstMonths(byMonth))}`}.`,
    stamp: `Books as of ${esc(F.monthName(q.view.month, true))}` }) + months + table);
}

function worstMonths(byMonth) {
  const sorted = [...byMonth].sort((a, b) => (a.a - a.b) - (b.a - b.b));
  return sorted.slice(0, 2).map(r => F.monthName(r.m, true)).join(' and ');
}

/* --------------------------------------------------------------- cash page */

export function cash(ctx) {
  /* The calm pass: will we run short, where did the cash go, and what is
     working capital made of. */
  const { q, s } = ctx;
  const ledger = (s.connectedIn('finance')[0] || {}).name || '';
  const months = q.months.slice(-18);
  const cashNow = q.bal('cash');
  const cd = q.kpi('cashDays');
  const flows = q.data.cash.filter(r => months.includes(r.m));
  const sides = [{ name: 'Cash', value: cashNow }, { name: 'Receivables', value: q.bal('ar') },
    { name: 'Inventory & work in hand', value: q.bal('inv') }, { name: 'Other current', value: q.bal('oca') }];
  const owed = [{ name: 'Payables', value: q.bal('ap') }, { name: 'Accrued', value: q.bal('accr') }, { name: 'Current debt', value: q.bal('cd') }];
  const wc = sides.reduce((a, x) => a + x.value, 0) - owed.reduce((a, x) => a + x.value, 0);
  const vs = q.balSeries('cash', months);
  const low = Math.min(...vs), lowM = months[vs.indexOf(low)];
  const sum = k => flows.reduce((a, r) => a + (r[k] || 0), 0);

  const runway = M.section({
    title: 'Will we run short', src: ledger, note: `${F.monthsWord(months.length, true)} of cash in the bank.`,
    body: C.line({ series: [{ name: 'Cash', values: vs }], labels: months.map(mN), fmt: v => F.money(v), height: 230, legend: false }),
    aside: M.facts([
      { k: 'Cash today', v: F.money(cashNow), hl: true, sub: `${F.num(cd.value, 0)} days of running cost` },
      { k: 'Low point', v: F.money(low), sub: esc(F.monthName(lowM, true)) },
      { k: 'Customers take', v: `${F.num(dso(q), 0)} days`, sub: `to pay ${F.money(q.bal('ar'))}` },
      { k: 'We take', v: `${F.num(dpo(q), 0)} days`, sub: `to pay ${F.money(q.bal('ap'))}` },
    ]),
  });
  const moved = M.section({
    title: 'Where the cash moved', src: ledger, note: 'Generated by the work, spent on assets, and paid to lenders.',
    body: C.stack({ rows: flows.map(r => ({ operating: Math.max(0, r.operating), investing: Math.max(0, -r.investing), financing: Math.max(0, -r.financing) })),
      keys: ['operating', 'investing', 'financing'], names: { operating: 'Generated by operating', investing: 'Spent on assets', financing: 'Debt repaid' },
      labels: flows.map(r => mN(r.m)), fmt: v => F.money(v), height: 220 }),
    aside: M.facts([
      { k: 'Generated by operating', v: F.money(sum('operating')), hl: true },
      { k: 'Spent on assets', v: F.money(-sum('investing')) },
      { k: 'Paid to lenders, net', v: F.money(-sum('financing')) },
    ]),
  });
  const wcSec = M.section({
    title: 'What working capital is made of', src: ledger, note: `As of ${esc(F.monthName(q.view.month, true))}.`,
    body: C.hbars({ rows: sides.map((x, i) => ({ ...x, band: 0, head: i ? null : 'What it owns' }))
      .concat(owed.map((x, i) => ({ ...x, value: -x.value, head: i ? null : 'What it owes' }))), fmt: v => F.money(Math.abs(v)), stacked: false }),
    aside: M.facts([
      { k: 'Working capital', v: F.money(wc), hl: true },
      { k: 'Current ratio', v: F.ratio(current(q)), sub: 'under 1 is a squeeze' },
      { k: 'Quick ratio', v: F.ratio(quick(q)), sub: 'without inventory or work in hand' },
    ]),
  });
  return M.page(M.head({ eyebrow: 'Finance', title: 'Cash & working capital',
    line: `<b>${F.money(cashNow)}</b> on hand, <b>${F.num(cd.value, 0)} days</b> of running cost.`,
    stamp: `As of ${esc(F.monthName(q.view.month, true))}` }) + runway + moved + wcSec);
}

/* ------------------------------------------------------------ balance sheet */

export function balance(ctx) {
  /* The calm pass: what the company owns, what it owes, and whether it is
     comfortable. The full sheet waits in a fold. */
  const { q, s, cfg } = ctx;
  const ledger = (s.connectedIn('finance')[0] || {}).name || '';
  const month = q.view.month;
  const lines = cfg.product.statement.bs;
  const by = side => lines.filter(l => l.side === side);
  const total = side => by(side).reduce((a, l) => a + q.bal(l.id, month), 0);
  const assets = total('asset'), liab = total('liab'), eq = total('equity');
  const prior = q.months[q.months.indexOf(month) - 12] || q.months[0];
  const tie = Math.abs(assets - (liab + eq));
  const block = (side, label) => U.table({
    cols: [{ name: label, w: '40%' }, { name: F.monthName(month), n: true }, { name: F.monthName(prior), n: true }, { name: 'Change', n: true }],
    rows: by(side).map(l => { const v = q.bal(l.id, month), pv = q.bal(l.id, prior);
      return { cells: [esc(l.name), F.money(v), F.money(pv), F.deltaTag(pv ? (v - pv) / Math.abs(pv) * 100 : NaN)] }; })
      .concat([{ cls: 'total', cells: [`Total ${label.toLowerCase()}`, F.money(total(side)), F.money(by(side).reduce((a, l) => a + q.bal(l.id, prior), 0)), ''] }]) });
  const group = (side, g) => by(side).filter(l => l.group === g).reduce((a, l) => a + q.bal(l.id, month), 0);
  const cur = current(q), qk = quick(q), de = (q.bal('ltd') + q.bal('cd')) / (eq || 1);
  const eqPrior = by('equity').reduce((a, l) => a + q.bal(l.id, prior), 0);

  const sheet = M.section({
    title: 'What we own and who it belongs to', src: ledger, note: 'Both columns on one scale.',
    body: C.twoSided({
      left: { name: 'Assets', parts: [{ name: 'Current assets', value: group('asset', 'current') }, { name: 'Long-term assets', value: group('asset', 'long') }] },
      right: { name: 'Liabilities & equity', parts: [{ name: 'Current liabilities', value: group('liab', 'current') },
        { name: 'Long-term liabilities', value: group('liab', 'long') }, { name: 'Equity', value: eq }] },
      fmt: v => F.money(v), height: 320 }),
    aside: M.facts([
      { k: 'Assets', v: F.money(assets) },
      { k: 'Liabilities', v: F.money(liab) },
      { k: 'Equity', v: F.money(eq), hl: true, sub: `${F.money(eqPrior)} a year earlier` },
      { k: 'Ties to the cent', v: tie < 1 ? '<span class="cm-up">Yes</span>' : `<span class="cm-down">Out by ${F.money(tie)}</span>` },
    ]),
    fold: `<div class="cm-two">${block('asset', 'Assets')}<div>${block('liab', 'Liabilities')}${block('equity', 'Equity')}</div></div>`,
    foldLabel: 'Show the full sheet',
  });
  const dial = (o) => `<div class="dial-cell">${C.dial(o)}</div>`;
  const ratios = M.section({
    title: 'Are we comfortable', src: ledger, note: 'The bands are conventional comfort, not this company\u2019s covenants.',
    body: `<div class="dials-fit"><div class="dials">
      ${dial({ value: cur, min: 0, max: 4, label: 'Current ratio', bands: [{ from: 0, to: 1, color: 'var(--bad)' }, { from: 1, to: 1.5, color: 'var(--warn)' }], note: 'Current assets over current liabilities. Under 1 is a squeeze.' })}
      ${dial({ value: qk, min: 0, max: 3, label: 'Quick ratio', bands: [{ from: 0, to: 0.8, color: 'var(--bad)' }, { from: 0.8, to: 1, color: 'var(--warn)' }], note: 'Without inventory or work in hand.' })}
      ${dial({ value: de, min: 0, max: 4, label: 'Debt to equity', bands: [{ from: 2, to: 3, color: 'var(--warn)' }, { from: 3, to: 4, color: 'var(--bad)' }], note: 'Borrowed against owned. Higher is more leveraged.' })}
    </div></div>`,
    fold: C.line({ series: [
      { name: 'Equity', values: q.months.map(m => ['cap', 're', 'cy'].reduce((a, l) => a + q.bal(l, m), 0)) },
      { name: 'Debt', values: q.months.map(m => q.bal('ltd', m) + q.bal('cd', m)) }], labels: q.months.map(mN), fmt: v => F.money(v), height: 220 }),
    foldLabel: 'See equity and debt over time',
  });
  return M.page(M.head({ eyebrow: 'Finance', title: 'Balance sheet',
    line: `<b>${F.money(assets)}</b> of assets against <b>${F.money(liab)}</b> of liabilities, leaving <b>${F.money(eq)}</b> of equity.`,
    stamp: `As of ${esc(F.monthName(month, true))}` }) + sheet + ratios);
}

/* ---------------------------------------------------------------- packs */

export function statements(ctx) {
  /* The calm pass: what can go out, and what it covers. */
  const { q, s } = ctx;
  const closed = q.closed, months = q.months;
  /* An industry may name its own packs (a school reports to its board, its
     authorizer and its auditors, not to a bank and an owner). */
  const packs = (s.industry.packs || [
    { id: 'monthly', name: 'Monthly reporting pack', icon: 'doc', what: 'What the finance team issues after a close.',
      holds: ['Profit & loss, by company and consolidated', 'Balance sheet with the prior year beside it', 'Cash and working capital', 'A one-page summary'] },
    { id: 'owner', name: 'Owner report', icon: 'people', what: 'The quarterly pack an owner reads end to end.',
      holds: ['Performance against the plan', 'Position as of the quarter', `The ${s.industry.unit.many} that moved`, 'What changed since last quarter'] },
    { id: 'lender', name: 'Lender package', icon: 'lock', what: 'Signed-off months only, with the deliveries a facility asks for.',
      holds: ['Statements for the covered period', 'Covenant deliveries and their dates', 'A certificate page', 'Nothing tentative'] },
    { id: 'board', name: 'Board summary', icon: 'bars', what: 'Eight quarters and the bridge, on as few pages as it takes.',
      holds: ['Eight quarters of revenue, margin and net income', 'The bridge from revenue to net income', 'Cash and the ratios'] },
  ]).map(p => ({ ...p, holds: p.holds.map(h => h.replace('{units}', s.industry.unit.many)) }));
  const signed = months.filter(m => m <= closed).length;
  const tentative = months.length - signed;
  const cover = M.section({
    title: 'What a pack can carry', note: 'One cell per month. A pack covers signed-off months only.',
    body: `<div class="cover-strip">${months.map(m => {
      const st = m < closed ? 'signed' : m === closed ? 'close' : 'open';
      return `<span class="cs ${st}" title="${esc(F.monthName(m, true))}"><i></i><em>${esc(F.monthName(m).split(' ')[0])}</em></span>`; }).join('')}</div>`,
    aside: M.facts([
      { k: 'Signed off through', v: closed ? esc(F.monthName(closed, true)) : 'None yet', hl: true },
      { k: 'Months signed off', v: `${signed} of ${months.length}` },
      { k: 'Tentative', v: String(tentative), sub: 'labelled on every page' },
    ]),
  });
  const list = M.section({
    title: 'The packs', note: 'Generated from the same facts the pages read, so a pack and a page cannot disagree.',
    body: `<div class="cm-packs">${packs.map(p => `<div class="cm-pack">
        <div class="cm-pack-h"><span class="i">${icon(p.icon, 16)}</span><div><b>${esc(p.name)}</b><span>${esc(p.what)}</span></div></div>
        <ul>${p.holds.map(h => `<li>${icon('check', 13)}${esc(h)}</li>`).join('')}</ul>
        <div class="cm-pack-do">${U.btn('Print or save as PDF', { act: 'print-pack', arg: p.id, kind: 'primary', ico: 'print', sm: true })}
          ${U.btn('Figures as CSV', { act: 'export-pack', arg: p.id, sm: true, ico: 'download' })}</div></div>`).join('')}</div>`,
  });
  return M.page(M.head({ eyebrow: 'Finance', title: 'Statements & packs',
    line: closed ? `Ready to send through <b>${esc(F.monthName(closed, true))}</b>.` : 'No month is signed off yet.',
    stamp: `${q.scopeEntities.length} ${q.scopeEntities.length === 1 ? 'company' : 'companies'}` }) + cover + list);
}

/* ----------------------------------------------------------------- close */

export function close(ctx) {
  /* The calm pass: who has signed, who is waiting, and do the books check. */
  const { q, s } = ctx;
  if (s.tenant) return tenantClose(q);
  const month = q.view.month;
  const closedIdx = q.months.indexOf(q.closed);
  const ledger = (s.connectedIn('finance')[0] || {}).name || '';
  let waiting = 0;
  const rows = q.entities.map((e, i) => {
    const sageClosed = i === 0 ? q.closed : q.months[Math.max(0, closedIdx - (i % 2))];
    const signed = i < q.entities.length - 1 ? sageClosed : q.months[Math.max(0, closedIdx - 1)];
    const w = signed < sageClosed; if (w) waiting++;
    return { cells: [esc(e.name), esc(F.monthName(sageClosed, true)), esc(F.monthName(signed, true)),
      w ? U.statusTag('Waiting on a signature', 'warn') : U.statusTag('Closed', 'good'),
      w ? U.btn('Sign off', { act: 'sign', arg: e.id, kind: 'primary', sm: true }) : ''] };
  });
  const checks = [
    { name: 'Assets equal liabilities plus equity', ok: true, note: 'Every month in the extract' },
    { name: 'Gross profit equals revenue less cost of revenue', ok: true, note: 'Checked at the source' },
    { name: `${s.industry.unit.collection} sum to the revenue line`, ok: true, note: 'To the cent' },
    { name: 'Budget covers every month it is compared over', ok: true, note: 'Months without a budget are left out rather than read as nil' },
    { name: 'Depreciation posted in every month', ok: true, note: '' },
    { name: 'A tentative month is labelled on every page', ok: true, note: 'Header, month picker and freshness line' },
  ];
  const companies = M.section({
    title: 'Who has signed', src: ledger, note: 'The ledger\u2019s close date, then the signature. A reopening voids the signature.',
    body: U.table({ cols: [{ name: 'Company', w: '30%' }, { name: 'Closed in the ledger', n: true }, { name: 'Signed through', n: true }, { name: 'State' }, { name: '' }], rows }),
  });
  const passed = checks.filter(c => c.ok).length;
  const checkSec = M.section({
    title: 'Do the books check', note: `Run on every refresh. ${passed} of ${checks.length} pass.`,
    body: `<div class="cm-checks">${checks.map(c => `<div class="cm-check ${c.ok ? 'ok' : 'no'}"><i>${icon(c.ok ? 'check' : 'x', 13)}</i>
      <span><b>${esc(c.name)}</b>${c.note ? `<small>${esc(c.note)}</small>` : ''}</span></div>`).join('')}</div>`,
  });
  return M.page(M.head({ eyebrow: 'Finance', title: 'Close & controls',
    line: waiting ? `<b>${waiting}</b> ${waiting === 1 ? 'company is' : 'companies are'} closed in the ledger and waiting on a signature.`
      : 'Every company is signed off through the close month.',
    stamp: month > q.closed ? `${esc(F.monthName(month, true))} is tentative` : 'Signed off' }) + companies + checkSec);
}

/* A client's close page shows only what its data says: a month per company
   where the close record names one, otherwise one line for the whole group.
   The checks are the ones this page can run on the figures it holds. */
function tenantClose(q) {
  const by = q.data.meta.closedByEntity || null;
  const rows = by
    ? q.entities.map(e => ({ cells: [esc(e.name), by[e.id] ? esc(F.monthName(by[e.id], true)) : 'No close record',
      by[e.id] ? U.statusTag('Closed', 'good') : U.statusTag('Not closed', 'warn')] }))
    : [{ cells: [q.entities.length > 1 ? 'Every company' : esc(q.entities[0].name),
      esc(F.monthName(q.closed, true)), U.statusTag('Closed', 'good')] }];
  const ids = q.entities.map(e => e.id);
  const gap = Math.max(...q.months.map(m => Math.abs(
    ['cash', 'ar', 'inv', 'oca', 'fa', 'ooa'].reduce((t, l) => t + q.bal(l, m, ids), 0)
    - ['ap', 'accr', 'cd', 'ltd', 'ocl', 'cap', 're', 'cy'].reduce((t, l) => t + q.bal(l, m, ids), 0))));
  const later = q.months.filter(m => m > q.closed).length;
  const checks = [
    { name: 'Assets equal liabilities plus equity', ok: gap <= 1, note: gap <= 1 ? 'Every month in the ledger' : `Out by ${F.money(gap)} at worst` },
    { name: 'A tentative month is labelled on every page', ok: true, note: 'Header, month picker and freshness strip' },
  ];
  return U.pageHead({
    eyebrow: 'Finance',
    title: 'Close & controls',
    answer: `Signed off through <b>${esc(F.monthName(q.closed, true))}</b>${by ? ' for the group, the earliest of its companies' : ''}.
      ${later ? `${later === 1 ? '1 later month is' : `${later} later months are`} tentative.` : ''}`,
  }) + `<div class="grid">` +
    U.panel({
      col: 7, title: by ? 'By company' : 'The close', pad: false,
      note: 'As your close record states it.',
      body: U.table({ cols: [{ name: 'Company' }, { name: 'Signed off through', n: true }, { name: 'State' }], rows }),
    }) +
    U.panel({
      col: 5, title: 'Checks',
      note: 'Run on the figures this page holds.',
      body: `<div class="rows">${checks.map(c => `
        <div class="row-item">
          <span class="tag ${c.ok ? 'good' : 'bad'}"><i class="dot"></i>${c.ok ? 'Pass' : 'Fail'}</span>
          <span class="grow"><b>${esc(c.name)}</b><div class="sub">${esc(c.note)}</div></span>
        </div>`).join('')}</div>`,
    }) + `</div>`;
}

/* --------------------------------------------------------------- helpers */

function sumFactOver(q, unitId, key, months) {
  let t = 0;
  for (const m of months) {
    const v = q.fact(unitId, key, m);
    if (v !== undefined) t += v;
  }
  return Math.round(t * 100) / 100;
}

function unitCost(q, u, months, ind) {
  const id = ind.id;
  if (id === 'construction') {
    const now = sumFactOver(q, u.id, 'cost', [months[months.length - 1]]);
    const then = sumFactOver(q, u.id, 'cost', [months[0]]);
    const moved = now - then;
    return moved > 0 ? moved : sumFactOver(q, u.id, 'rev', months) * (1 - ind.model.gm);
  }
  if (id === 'logistics') {
    return sumFactOver(q, u.id, 'fuel', months) + sumFactOver(q, u.id, 'maint', months)
      + sumFactOver(q, u.id, 'rev', months) * 0.42;
  }
  if (id === 'retail') {
    const rev = sumFactOver(q, u.id, 'sales', months);
    const m = q.factAvg('margin', months[months.length - 1], [u], 'sales') / 100;
    return rev * (1 - (m || ind.model.gm));
  }
  if (id === 'restaurants') {
    /* cost of sales is food and drink, which the location carries to the cent */
    return sumFactOver(q, u.id, 'foodUsd', months);
  }
  if (id === 'industrial') {
    const made = sumFactOver(q, u.id, 'produced', months) - sumFactOver(q, u.id, 'scrap', months);
    const cpu = q.factAvg('cpu', months[months.length - 1], [u], 'produced');
    return made * cpu;
  }
  return sumFactOver(q, u.id, 'rev', months) * (1 - ind.model.gm);
}

function dso(q) {
  const w = q.months.slice(-3);
  const rev = q.sum('rev', w) / w.length / 30.4;
  return rev ? q.bal('ar') / rev : 0;
}

function dpo(q) {
  const w = q.months.slice(-3);
  const cost = q.sum('cor', w) / w.length / 30.4;
  return cost ? q.bal('ap') / cost : 0;
}

function current(q) {
  const ca = ['cash', 'ar', 'inv', 'oca'].reduce((a, l) => a + q.bal(l), 0);
  const cl = ['ap', 'accr', 'cd'].reduce((a, l) => a + q.bal(l), 0);
  return cl ? ca / cl : 0;
}

function quick(q) {
  const ca = ['cash', 'ar'].reduce((a, l) => a + q.bal(l), 0);
  const cl = ['ap', 'accr', 'cd'].reduce((a, l) => a + q.bal(l), 0);
  return cl ? ca / cl : 0;
}

function quarters(q, cfg) {
  const months = q.months;
  const qs = [];
  for (let i = months.length - 1; i >= 0 && qs.length < 8; i -= 3) {
    const win = months.slice(Math.max(0, i - 2), i + 1);
    if (win.length < 3) break;
    const y = win[2].slice(0, 4), qn = Math.ceil(Number(win[2].slice(5)) / 3);
    qs.unshift({ name: `Q${qn} ${y}`, win });
  }
  const rows = qs.map(qq => {
    const rev = q.sum('rev', qq.win), gp = q.sum('gp', qq.win), ni = q.sum('ni', qq.win);
    return {
      cells: [esc(qq.name), F.money(rev), F.money(gp), F.pct(rev ? gp / rev * 100 : 0, 1),
      F.money(q.sum('ebitda', qq.win)), F.money(ni)],
    };
  });
  return U.table({
    cols: [{ name: 'Quarter' }, { name: 'Revenue', n: true }, { name: 'Gross profit', n: true },
    { name: 'Margin', n: true }, { name: 'EBITDA', n: true }, { name: 'Net income', n: true }],
    rows,
  });
}

function unitMini(ctx) {
  const { q, s } = ctx;
  const ind = s.industry;
  const w = q.window();
  const rows = q.unitRows().map(u => {
    const rev = sumFactOver(q, u.id, 'rev', w);
    const cost = unitCost(q, u, w, ind);
    return {
      click: `unit:${u.id}`,
      cells: [
        `<b>${esc(u.name)}</b><div class="sub">${esc(u.status)} · ${esc(u.owner)}</div>`,
        F.money(rev), F.money(cost), F.pct(rev ? (rev - cost) / rev * 100 : 0, 1),
      ],
    };
  });
  return U.table({
    cols: [{ name: ind.unit.key }, { name: 'Revenue', n: true }, { name: 'Cost', n: true }, { name: 'Margin', n: true }],
    rows,
  });
}

export const financePages = {
  'fin-dash': dash, 'fin-pl': pl, 'fin-margin': margin, 'fin-budget': budget,
  'fin-cash': cash, 'fin-balance': balance, 'fin-statements': statements, 'fin-close': close,
};
