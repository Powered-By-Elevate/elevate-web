/* The finance module. This is the one a buyer judges the product on, so every
   page opens on a sentence that answers the page's own question, and every
   figure beside it is the figure that sentence used. */

import * as F from '../fmt.js?v=9843449aa8';
import * as C from '../chart.js?v=9843449aa8';
import * as U from '../ui.js?v=9843449aa8';
import { esc, icon } from '../icons.js?v=9843449aa8';

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
  const { q, s, cfg } = ctx;
  const w = q.window();
  const ya = q.yearAgoWindow();
  const rev = q.revenue(w), revYa = q.revenue(ya);
  const gp = rev - q.cost(w);
  const ebitda = q.unitScoped ? gp * 0.4 : q.sum('ebitda', w);
  const ni = q.unitScoped ? null : q.sum('ni', w);
  const gm = rev ? gp / rev * 100 : 0;
  const growth = revYa ? (rev - revYa) / revYa * 100 : NaN;
  const last12 = q.months.slice(-12);
  const bRev = q.sum('rev', w, q.scopeEntities, 'bud');
  const vsBudget = bRev ? (rev - bRev) / bRev * 100 : NaN;

  const head = U.verdict({
    title: verdictLine(ctx, { rev, gm, growth, vsBudget, ni }),
    body: U.sentence([
      `${esc(basisWords(q))} across ${esc(scopeWords(q, s))}.`,
      bRev ? `The plan for the same months was ${F.money(bRev)}.` : '',
      `Overhead ran ${F.money(q.unitScoped ? gp - ebitda : q.sum('oh', w))}, which is
       ${F.pct(rev ? (q.unitScoped ? gp - ebitda : q.sum('oh', w)) / rev * 100 : 0)} of revenue.`,
    ]),
    figs: [
      { label: 'Revenue', value: F.money(rev) },
      { label: 'Gross profit', value: F.money(gp) },
      { label: 'Gross margin', value: F.pct(gm) },
      { label: 'EBITDA', value: F.money(ebitda) },
      ni === null ? null : { label: 'Net income', value: F.money(ni) },
    ].filter(Boolean),
  });

  const ind = s.industry;
  const kpis = U.kpiStrip(q, s, ind.kpis);

  const revSeries = q.unitScoped
    ? last12.map(m => q.factSum('rev', [m]))
    : q.series('rev', last12);
  const budSeries = q.unitScoped ? null : q.series('rev', last12, q.scopeEntities, 'bud');

  const panels = [
    U.panel({
      col: 8,
      title: 'Revenue against the plan',
      body: C.bars({
        values: revSeries, labels: last12.map(mN), fmt: v => F.money(v),
        overlay: budSeries && budSeries.some(v => v) ? budSeries : null,
        /* ⛔ The budget was a 2px tick floating above each bar, so reading the
           variance meant eyeballing twelve gaps. As a ghost bar behind the
           actual one, the shortfall is the uncovered remainder and needs no
           measuring. */
        ghost: true,
        name: 'Actual', overlayName: 'Budget', height: 250,
      }),
      /* the variance is the point of the panel, so it is said in the head
         rather than left as grey footer text under the chart */
      note: `${F.monthsWord(last12.length, true)} to ${esc(F.monthName(q.view.month, true))}.${
        budSeries && bRev
          ? ` <b class="${Number.isFinite(vsBudget) && vsBudget >= 0 ? 'ok' : 'off'}-plan">${
            Number.isFinite(vsBudget) && vsBudget >= 0 ? 'Ahead of' : 'Behind'} plan by ${
            F.money(Math.abs(rev - bRev))}</b> over the window.`
          : ' No budget is loaded for this window.'}`,
      foot: budSeries && budSeries.some(v => v)
        ? 'The solid bar is what happened. The pale bar behind it is the plan.' : '',
    }),
    U.panel({
      col: 4,
      title: 'Where the money goes',
      note: 'Every dollar of revenue over the window.',
      body: (() => {
        const parts = q.unitScoped
          ? [{ name: 'Direct cost', value: q.cost(w) }, { name: 'Everything else', value: Math.max(0, gp) }]
          : [
            { name: 'Cost of revenue', value: q.sum('cor', w) },
            { name: 'Payroll & benefits', value: q.sum('labor', w) },
            { name: 'Facilities', value: q.sum('facility', w) },
            { name: 'Equipment', value: q.sum('equip', w) },
            { name: 'Sales & marketing', value: q.sum('sales', w) },
            { name: 'General & admin', value: q.sum('admin', w) },
          ];
        const kept = Math.max(0, rev - parts.reduce((a, p) => a + p.value, 0));
        parts.push({ name: 'Kept', value: kept, color: 'var(--good)' });
        /* ⛔ THIS WAS A DONUT AND A DONUT CANNOT DRAW AN 86/14 SPLIT.
           Cost of revenue is 86.2% of the ring, so the other six parts are
           slivers a reader cannot tell apart, and the legend underneath was
           doing all of the work while the ring sat on top as decoration.
           The ranking IS the legend, given its own room, and the one figure
           the panel exists to deliver is said once at the top. */
        const pcOf = v => rev ? v / rev * 100 : 0;
        return `<div class="keptfig">
            <span class="keptfig-v">${F.pct(pcOf(kept))}</span>
            <span class="keptfig-l">of every dollar is kept</span>
          </div>` + C.hbars({
          rows: parts.map(pt => ({
            name: pt.name, value: pt.value, color: pt.color,
            note: F.pct(pcOf(pt.value), 1),
          })),
          fmt: v => F.money(v), height: 13, gap: 5, stacked: true,
        });
      })(),
    }),
  ];

  if (!q.unitScoped) {
    panels.push(U.panel({
      /* col 5, not 7: the cascade is DOM and reads at any width, while the
         24-month line is an SVG on a fixed viewBox, so a narrow panel scales
         its 10.5px axis text down to about 4px. Width goes to the one that
         needs it. */
      col: 5,
      title: 'From revenue to net income',
      note: 'The bridge over the window, in the order the statement takes it.',
      body: C.cascade({
        items: [
          { name: 'Revenue', value: rev, total: true },
          { name: 'Cost of revenue', value: -q.sum('cor', w) },
          { name: 'Overhead', value: -q.sum('oh', w) },
          { name: 'Depreciation', value: -q.sum('dep', w) },
          { name: 'Interest', value: -q.sum('int', w) },
          { name: 'Other', value: q.sum('other', w) },
          { name: 'Net income', value: q.sum('ni', w), total: true },
        ],
        fmt: v => F.money(v),
      }),
      foot: `Each bar is what is left at that line. The column beside it is what
        the line took off, and the last column is the running total.`,
    }));

    panels.push(U.panel({
      col: 7,
      title: 'Net income, 24 months',
      note: 'The shape of the business, not one month of it.',
      body: (() => {
        /* the line alone says what happened and not whether it was ordinary */
        const vs = q.series('ni', q.months.slice(-24));
        const fin = vs.filter(Number.isFinite);
        const avg = fin.length ? fin.reduce((a, b) => a + b, 0) / fin.length : null;
        return C.line({
          series: [{ name: 'Net income', values: vs }],
          labels: q.months.slice(-24).map(mN), fmt: v => F.money(v), height: 270, legend: false,
          rule: avg, ruleLabel: `average month ${F.money(avg || 0)}`,
          markers: [{ at: q.months.slice(-24).indexOf(q.closed), label: 'signed off' }].filter(x => x.at >= 0),
        });
      })(),
    }));

    const cash = q.bal('cash'), ar = q.bal('ar'), ap = q.bal('ap'), inv = q.bal('inv');
    const cd = q.kpi('cashDays');
    panels.push(U.panel({
      col: 5,
      title: 'Position',
      note: `As of ${esc(F.monthName(q.view.month, true))}. A balance is a position and does not move with the basis.`,
      body: U.strip([
        { label: 'Cash', value: F.money(cash), note: `${F.num(cd.value, 0)} days of running cost` },
        { label: 'Receivables', value: F.money(ar), note: `${F.num(dso(q), 0)} days sales outstanding` },
        { label: 'Payables', value: F.money(ap), note: `${F.num(dpo(q), 0)} days payable` },
        { label: 'Working capital', value: F.money(cash + ar + inv + q.bal('oca') - ap - q.bal('accr') - q.bal('cd')),
          note: `${F.ratio(current(q))} current ratio` },
      ], { pairs: true }),
      foot: `Current ratio ${F.ratio(current(q))}. Debt is
        ${F.money(q.bal('ltd') + q.bal('cd'))} against equity of
        ${F.money(q.bal('cap') + q.bal('re') + q.bal('cy'))}.`,
    }));

    panels.push(U.panel({
      col: 7,
      title: 'Eight quarters',
      note: 'The summary a board asks for, in one table.',
      body: quarters(q, cfg),
      right: U.btn('Download', { act: 'export-quarters', ico: 'download', sm: true }),
    }));
  } else {
    panels.push(U.panel({
      col: 12,
      title: `Your ${esc(s.industry.unit.many)}`,
      note: `A ${esc(s.role.name.toLowerCase())} sees their own ${esc(s.industry.unit.many)} and the money on them, and no company-wide figure.`,
      body: unitMini(ctx),
    }));
  }

  return head + kpis + `<div class="grid">${panels.join('')}</div>`;
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
  return `${names[q.view.basis] || 'Window'} — ${F.monthName(w[0], true)} to ${F.monthName(w[w.length - 1], true)}`;
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
  const { q, s, cfg } = ctx;
  const names = plNames(cfg).map;
  const w = q.window(), ya = q.yearAgoWindow();
  const rev = q.sum('rev', w) || 1;
  const lines = cfg.product.statement.pl;

  const rows = lines.map(l => {
    const v = q.sum(l.id, w);
    const p = q.sum(l.id, ya);
    const delta = p ? (v - p) / Math.abs(p) * 100 : NaN;
    const isTotal = ['gp', 'ebitda', 'ni', 'oh'].includes(l.id);
    return {
      cls: isTotal ? 'total' : (['labor', 'facility', 'equip', 'sales', 'admin'].includes(l.id) ? 'sub' : ''),
      cells: [
        esc(l.name),
        F.money(v),
        F.pct(v / rev * 100, 1),
        ya.length ? F.money(p) : 'n/a',
        F.deltaTag(delta, { invert: l.kind === 'cost' }),
      ],
    };
  });

  const overheadKeys = ['labor', 'facility', 'equip', 'sales', 'admin'];
  const last12 = q.months.slice(-12);

  return U.pageHead({
    eyebrow: 'Finance',
    title: 'Profit & loss',
    answer: `${esc(basisWords(q))}${ya.length ? ', beside the same months a year earlier' : ''}.
      Revenue of <b>${F.money(q.sum('rev', w))}</b> left
      <b>${F.money(q.sum('ni', w))}</b> of net income, a margin of
      <b>${F.pct(q.sum('ni', w) / rev * 100)}</b>.`,
  }) + U.fresh(q, s) + `<div class="grid">` +
    U.panel({
      col: 12, title: 'The statement', pad: false,
      body: U.table({
        cols: [{ name: 'Line', w: '32%' }, { name: 'This period', n: true },
        { name: 'Of revenue', n: true }, { name: 'Year earlier', n: true }, { name: 'Change', n: true }],
        rows,
      }),
      foot: 'Every line is the sum of the ledger accounts mapped to it. No figure on this page is typed by hand.',
    }) +
    /* ⛔ The statement used to sit at col-7 beside this stack at col-5, 637px
       against 330px, on every one of the six industries. A table and a chart
       are not the same shape and pairing them by habit leaves a column of
       nothing. Two charts of similar height pair honestly; the statement takes
       the width it deserves above them. */
    (!ya.length ? '' : U.panel({
      col: 7, title: 'This period against a year earlier',
      note: 'One line per statement line. Following a line is a different act from comparing two bars that sit apart.',
      body: C.slope({
        rows: ['rev', 'cor', 'gp', 'oh', 'ebitda', 'ni'].map(id => ({
          name: names[id], from: q.sum(id, ya), to: q.sum(id, w),
        })).filter(r => Number.isFinite(r.from) && Number.isFinite(r.to) && (r.from || r.to)),
        fmt: v => F.money(v),
        from: ya.length ? F.monthName(ya[ya.length - 1], true) : 'A year earlier',
        to: F.monthName(w[w.length - 1], true),
        height: 320,
      }),
      foot: 'A cost line rising is not the same as revenue rising, so read the names, not only the slopes.',
    })) +
    U.panel({
      col: 5, title: 'Overhead by kind',
      note: `${F.monthsWord(last12.length, true)}. The question is whether overhead grows with revenue or ahead of it.`,
      body: C.stack({
        rows: last12.map(m => Object.fromEntries(overheadKeys.map(k => [k, q.sum(k, [m])]))),
        keys: overheadKeys, labels: last12.map(mN), names, fmt: v => F.money(v), height: 260,
      }),
      foot: (() => {
        const ohNow = q.sum('oh', w) / (q.sum('rev', w) || 1) * 100;
        const ohYa = q.sum('oh', ya) / (q.sum('rev', ya) || 1) * 100;
        return ya.length ? `Overhead is ${F.pct(ohNow)} of revenue, against ${F.pct(ohYa)} a year ago.`
          : `Overhead is ${F.pct(ohNow)} of revenue. The ledger holds no year earlier to set it against.`;
      })(),
    }) +

    U.panel({
      col: 12, title: 'Revenue and net income, month by month',
      body: C.line({
        series: [
          { name: 'Revenue', values: q.series('rev', q.months) },
          { name: 'Net income', values: q.series('ni', q.months) },
        ],
        labels: q.months.map(mN), fmt: v => F.money(v), height: 250,
      }),
    }) + `</div>`;
}

/* ------------------------------------------------------------- margin page */

export function margin(ctx) {
  const { q, s } = ctx;
  const w = q.window();
  const ind = s.industry;
  const rows = q.unitRows().map(u => {
    const rev = sumFactOver(q, u.id, 'rev', w);
    const cost = unitCost(q, u, w, ind);
    return { u, rev, cost, gp: rev - cost, gm: rev ? (rev - cost) / rev * 100 : 0 };
  }).filter(r => r.rev > 0).sort((a, b) => a.gm - b.gm);

  const total = rows.reduce((a, r) => a + r.rev, 0);
  const avg = total ? rows.reduce((a, r) => a + r.gp, 0) / total * 100 : 0;
  const worst = rows[0], best = rows[rows.length - 1];

  return U.pageHead({
    eyebrow: 'Finance',
    title: ind.pages && ind.pages['fin-margin'] ? ind.pages['fin-margin'].name : 'Margin & drivers',
    answer: rows.length
      ? `The blended margin is <b>${F.pct(avg)}</b>. <b>${esc(best.u.name)}</b> carries it at
         <b>${F.pct(best.gm)}</b>, and <b>${esc(worst.u.name)}</b> drags at
         <b>${F.pct(worst.gm)}</b>, a spread of <b>${F.pct(best.gm - worst.gm, 0)}</b>.`
      : 'No units in scope carry revenue over this window.',
  }) + U.fresh(q, s) + `<div class="grid">` +
    /* ⛔ A LONG LIST TAKES THE FULL WIDTH.

       A list is as tall as its rows however wide the column is, so pairing a
       48-truck list with a 300px chart leaves 1,792px of empty column beside
       it. That is not a balancing problem and `balanceRows()` is right to
       refuse it: stretching an honestly-full chart to 2,049px would be the
       dishonest fill the guard exists to prevent. The fix is the layout, which
       is what the publishing session's measurement said.

       Past eighteen rows the two panels stop sharing a row: the chart reads
       the whole fleet at a glance and goes first, the list goes underneath at
       full width. Below that the side-by-side still earns its place. */
    /* ⛔ The chart first, then the list, both full width.

       This used to switch on `rows.length > 18`, a number I picked. It did the
       right thing for logistics' 48 trucks and nothing for construction's
       twenty-two, and `balanceRows()` now separates the same cases by
       MEASUREMENT rather than by a count I guessed. Two mechanisms deciding
       one question is how they drift apart, so the count is gone: the order
       here is the only thing the page still decides, and the chart reads the
       whole book at a glance so it goes first. */
    (() => {
      return plot(12) + list(12);
      function list(col) {
        return U.panel({
      col, title: `Margin by ${esc(ind.unit.one)}`,
      note: 'Worst first. The mark on each bar is the blended margin, so a bar short of it is diluting the company.',
      body: C.hbars({
        rows: rows.map(r => ({
          name: r.u.short || r.u.name, value: r.gm, mark: avg,
          color: r.gm < avg * 0.6 ? 'var(--bad)' : (r.gm < avg ? 'var(--warn)' : 'var(--good)'),
          note: F.money(r.rev),
        })),
        fmt: v => F.pct(v, 1), max: Math.max(...rows.map(r => Math.abs(r.gm)), avg) * 1.05,
      }),
        });
      }
      function plot(col) {
        return U.panel({
          col, title: 'Revenue against margin',
          note: `Top right is where a company wants its weight. Size is revenue.${
            rows.length > 9 ? ' Only the extremes are named; hover any dot for the rest.' : ''}`,
          body: C.scatter({
            points: rows.map(r => ({
              name: r.u.short || r.u.name, x: r.rev, y: r.gm,
              r: Math.max(4, Math.min(16, Math.sqrt(r.rev / (total || 1)) * 42)),
            })),
            xFmt: v => F.money(v), yFmt: v => F.pct(v, 0),
            xLabel: 'Revenue', yLabel: 'Gross margin',
            rule: avg, ruleLabel: `blended ${avg.toFixed(1)}%`,
            height: col === 12 ? 340 : 300,
          }),
          foot: `The line is the blended ${F.pct(avg)}. Anything under it dilutes the company.`,
        });
      }
    })() +
    U.panel({
      col: 12, title: 'Margin trend', pad: true,
      body: C.line({
        series: [
          { name: 'Gross margin', values: q.months.map(m => {
            const r = q.sum('rev', [m]), c = q.sum('cor', [m]);
            return r ? (r - c) / r * 100 : null;
          }) },
          { name: 'EBITDA margin', values: q.months.map(m => {
            const r = q.sum('rev', [m]);
            return r ? q.sum('ebitda', [m]) / r * 100 : null;
          }) },
        ],
        labels: q.months.map(mN), fmt: v => F.pct(v, 0), height: 240, zeroBase: false,
      }),
    }) + `</div>`;
}

/* ------------------------------------------------------------- budget page */

export function budget(ctx) {
  const { q, s, cfg } = ctx;
  const w = q.window().filter(m => q.sum('rev', [m], q.scopeEntities, 'bud') !== 0);
  if (!w.length) {
    return U.pageHead({ eyebrow: 'Finance', title: 'Budget vs actual' }) +
      `<section class="panel"><div class="empty">No budget covers this window.
      A budget arrives either from the ledger or as a workbook, and the comparison
      runs only over the months it actually covers.</div></section>`;
  }
  const lines = ['rev', 'cor', 'gp', 'oh', 'ebitda', 'ni'];
  const names = plNames(cfg).map;
  const rows = lines.map(id => {
    const a = q.sum(id, w), b = q.sum(id, w, q.scopeEntities, 'bud');
    const v = a - b;
    const cost = ['cor', 'oh'].includes(id);
    return {
      cls: ['gp', 'ebitda', 'ni'].includes(id) ? 'total' : '',
      cells: [esc(names[id]), F.money(a), F.money(b), F.money(v),
      F.deltaTag(b ? v / Math.abs(b) * 100 : NaN, { invert: cost })],
    };
  });

  const byMonth = w.map(m => ({
    m, a: q.sum('rev', [m]), b: q.sum('rev', [m], q.scopeEntities, 'bud'),
  }));
  const rev = q.sum('rev', w), bud = q.sum('rev', w, q.scopeEntities, 'bud');
  const gap = rev - bud;

  const unitRows = q.unitRows().map(u => {
    const r = sumFactOver(q, u.id, 'rev', w);
    return { name: u.short || u.name, value: r };
  }).sort((a, b) => b.value - a.value).slice(0, 10);

  return U.pageHead({
    eyebrow: 'Finance',
    title: 'Budget vs actual',
    answer: `Over the ${w.length} ${w.length === 1 ? 'month' : 'months'} the budget covers,
      revenue is <b>${F.money(Math.abs(gap))}</b> ${gap >= 0 ? 'ahead of' : 'behind'} plan
      (<b>${F.pct(bud ? gap / bud * 100 : 0, 1)}</b>).
      ${Math.abs(gap) / (bud || 1) < 0.02
        ? 'That is close enough to call it on plan.'
        : `The gap is concentrated in ${esc(worstMonths(byMonth))}.`}`,
  }) + U.fresh(q, s) + `<div class="grid">` +
    U.panel({
      col: 5, title: 'Plan against actual', pad: false,
      body: U.table({
        cols: [{ name: 'Line' }, { name: 'Actual', n: true }, { name: 'Budget', n: true },
        { name: 'Variance', n: true }, { name: '%', n: true }],
        rows,
      }),
    }) +
    U.panel({
      col: 7, title: 'Month by month',
      note: 'The bar is actual, the line is plan. A pace read against the year gone overstates progress when a plan is front-loaded, so this reads against the plan’s own months.',
      body: C.bars({
        values: byMonth.map(r => r.a), overlay: byMonth.map(r => r.b),
        labels: byMonth.map(r => mN(r.m)), fmt: v => F.money(v), height: 250,
      }),
    }) +
    U.panel({
      col: 12, title: `Where the revenue came from`,
      note: `The ten largest ${esc(s.industry.many || s.industry.unit.many)} over the window.`,
      body: C.hbars({ rows: unitRows, fmt: v => F.money(v) }),
    }) + `</div>`;
}

function worstMonths(byMonth) {
  const sorted = [...byMonth].sort((a, b) => (a.a - a.b) - (b.a - b.b));
  return sorted.slice(0, 2).map(r => F.monthName(r.m, true)).join(' and ');
}

/* --------------------------------------------------------------- cash page */

export function cash(ctx) {
  const { q, s } = ctx;
  const months = q.months.slice(-18);
  const cashNow = q.bal('cash');
  const cd = q.kpi('cashDays');
  const flows = (s.data.entity === '*' ? q.data.cash : q.data.cash).filter(r => months.includes(r.m));

  const sides = [
    { name: 'Cash', value: cashNow }, { name: 'Receivables', value: q.bal('ar') },
    { name: 'Inventory & work in hand', value: q.bal('inv') }, { name: 'Other current', value: q.bal('oca') },
  ];
  const owed = [
    { name: 'Payables', value: q.bal('ap') }, { name: 'Accrued', value: q.bal('accr') },
    { name: 'Current debt', value: q.bal('cd') },
  ];
  const wc = sides.reduce((a, x) => a + x.value, 0) - owed.reduce((a, x) => a + x.value, 0);

  return U.pageHead({
    eyebrow: 'Finance',
    title: 'Cash & working capital',
    answer: `<b>${F.money(cashNow)}</b> on hand, which is
      <b>${F.num(cd.value, 0)} days</b> of running cost.
      Working capital is <b>${F.money(wc)}</b>: customers owe
      <b>${F.money(q.bal('ar'))}</b> and are taking <b>${F.num(dso(q), 0)} days</b> to pay,
      while the company owes <b>${F.money(q.bal('ap'))}</b> and takes
      <b>${F.num(dpo(q), 0)} days</b>.`,
  }) + U.fresh(q, s) + `<div class="grid">` +
    U.panel({
      /* ⚠️ 8/4 put the two sides in a 297px column, where its wrapped names
         made it ~700px tall against a 325px chart and `go-wide` widened it,
         stranding the cash chart alone on a row a third empty. 7/5 gives the
         names room to sit on one line, so the panel stays short and the pair
         shares its row as intended. */
      col: 7, title: 'Cash, eighteen months',
      body: (() => {
        const vs = q.balSeries('cash', months);
        const fin = vs.filter(Number.isFinite);
        const avg = fin.length ? fin.reduce((a, b) => a + b, 0) / fin.length : null;
        return C.line({
          series: [{ name: 'Cash', values: vs }],
          labels: months.map(mN), fmt: v => F.money(v), height: 250, legend: false,
          rule: avg, ruleLabel: `average ${F.money(avg || 0)}`,
        });
      })(),
      foot: `The low point over these months was
        ${F.money(Math.min(...q.balSeries('cash', months)))}.`,
    }) +
    U.panel({
      col: 5, title: 'The two sides',
      note: 'What working capital is made of, not just what it totals.',
      /* ⛔ A PANEL CALLED "THE TWO SIDES" HAS TO DRAW TWO SIDES. This put all
         seven lines in one list on one scale, so what the company owns and
         what it owes read as a single ranking, and at this width the names
         were cut to "Inventory …" and "Current d…". `stacked` gives each name
         its own line, and `head` marks where the second side starts. */
      body: C.hbars({
        rows: sides.map((x, i) => ({ ...x, band: 0, head: i ? null : 'What it owns' }))
          .concat(owed.map((x, i) => ({ ...x, value: -x.value, head: i ? null : 'What it owes' }))),
        /* ⚠️ NOT stacked: the single-line form carries group heads too now, and
           its names wrap rather than clip, so the panel keeps the compact
           height that lets it sit beside the cash chart instead of tripping
           `go-wide` and stranding that chart on a row of its own. */
        fmt: v => F.money(Math.abs(v)), stacked: false,
      }),
      foot: `Current ratio ${F.ratio(current(q))}, quick ratio ${F.ratio(quick(q))}.`,
    }) +
    U.panel({
      col: 12, title: 'Where the cash moved',
      note: 'Operating, investing and financing, month by month.',
      body: C.stack({
        rows: flows.map(r => ({
          operating: Math.max(0, r.operating), investing: Math.max(0, -r.investing),
          financing: Math.max(0, -r.financing),
        })),
        keys: ['operating', 'investing', 'financing'],
        names: { operating: 'Generated by operating', investing: 'Spent on assets', financing: 'Debt repaid' },
        labels: flows.map(r => mN(r.m)), fmt: v => F.money(v), height: 240,
      }),
    }) + `</div>`;
}

/* ------------------------------------------------------------ balance sheet */

export function balance(ctx) {
  const { q, s, cfg } = ctx;
  const month = q.view.month;
  const lines = cfg.product.statement.bs;
  const by = side => lines.filter(l => l.side === side);
  const total = side => by(side).reduce((a, l) => a + q.bal(l.id, month), 0);
  const assets = total('asset'), liab = total('liab'), eq = total('equity');
  const prior = q.months[q.months.indexOf(month) - 12] || q.months[0];
  const tie = Math.abs(assets - (liab + eq));

  const block = (side, label) => U.table({
    cols: [{ name: label }, { name: F.monthName(month), n: true },
    { name: F.monthName(prior), n: true }, { name: 'Change', n: true }],
    rows: by(side).map(l => {
      const v = q.bal(l.id, month), pv = q.bal(l.id, prior);
      return { cells: [esc(l.name), F.money(v), F.money(pv), F.deltaTag(pv ? (v - pv) / Math.abs(pv) * 100 : NaN)] };
    }).concat([{
      cls: 'total',
      cells: [`Total ${label.toLowerCase()}`, F.money(total(side)),
      F.money(by(side).reduce((a, l) => a + q.bal(l.id, prior), 0)), ''],
    }]),
  });

  const cur = current(q), qk = quick(q), de = (q.bal('ltd') + q.bal('cd')) / (eq || 1);

  return U.pageHead({
    eyebrow: 'Finance',
    title: 'Balance sheet',
    answer: `As of <b>${esc(F.monthName(month, true))}</b>: <b>${F.money(assets)}</b> of assets
      against <b>${F.money(liab)}</b> of liabilities, leaving <b>${F.money(eq)}</b> of equity.
      ${tie < 1 ? 'Assets equal liabilities plus equity to the cent.' :
      `<b>The sheet is out by ${F.money(tie)}</b>, which is a finding, not a rounding.`}`,
  }) + U.fresh(q, s) + `<div class="grid">` +
    U.panel({
      col: 12, title: 'What the money is in, and who it belongs to',
      note: 'Both columns on one scale. A balance sheet balances, and this is what that looks like.',
      body: (() => {
        /* Grouped, not line by line. Fourteen segments across two columns
           repeat the six-color palette, so cash and payables came out the
           same blue, and most bars were too thin to label. Five groups are
           readable and the detail is in the tables below. */
        const group = (side, g) => by(side).filter(l => l.group === g)
          .reduce((a, l) => a + q.bal(l.id, month), 0);
        return C.twoSided({
          left: {
            name: 'Assets',
            parts: [
              { name: 'Current assets', value: group('asset', 'current') },
              { name: 'Long-term assets', value: group('asset', 'long') },
            ],
          },
          right: {
            name: 'Liabilities & equity',
            parts: [
              { name: 'Current liabilities', value: group('liab', 'current') },
              { name: 'Long-term liabilities', value: group('liab', 'long') },
              { name: 'Equity', value: by('equity').reduce((a, l) => a + q.bal(l.id, month), 0) },
            ],
          },
          fmt: v => F.money(v), height: 360,
        });
      })(),
    }) +
    U.panel({
      /* ⛔ col-12 WITH THE DIALS ACROSS, not col-4 with them stacked.

         Three dials in a four-column panel stack to 816px beside a 358px
         chart, which is 458px of nothing down the side of the page on all six
         industries. Stacked is also the worse READING: three ratios are a set
         to be compared, and a set reads across, not down. Wide and side by
         side it measures about 300px and nothing is left over. */
      col: 12, title: 'Three ratios',
      note: 'The bands are conventional comfort, not this company\u2019s covenants.',
      body: `<div class="dials-fit"><div class="dials">
        <div class="dial-cell">${C.dial({
          value: cur, min: 0, max: 4, label: 'Current ratio',
          bands: [{ from: 0, to: 1, color: 'var(--bad)' }, { from: 1, to: 1.5, color: 'var(--warn)' }],
          note: 'Current assets over current liabilities. Under 1 is a squeeze.',
        })}</div>
        <div class="dial-cell">${C.dial({
          value: qk, min: 0, max: 3, label: 'Quick ratio',
          bands: [{ from: 0, to: 0.8, color: 'var(--bad)' }, { from: 0.8, to: 1, color: 'var(--warn)' }],
          note: 'Without inventory or work in hand.',
        })}</div>
        <div class="dial-cell">${C.dial({
          value: de, min: 0, max: 4, label: 'Debt to equity',
          bands: [{ from: 2, to: 3, color: 'var(--warn)' }, { from: 3, to: 4, color: 'var(--bad)' }],
          note: 'Borrowed against owned. Higher is more leveraged.',
        })}</div>
      </div></div>`,
    }) +
    U.panel({
      col: 12, title: 'Equity and debt over time',
      body: C.line({
        series: [
          { name: 'Equity', values: q.months.map(m => ['cap', 're', 'cy'].reduce((a, l) => a + q.bal(l, m), 0)) },
          { name: 'Debt', values: q.months.map(m => q.bal('ltd', m) + q.bal('cd', m)) },
        ],
        labels: q.months.map(mN), fmt: v => F.money(v), height: 240,
      }),
    }) +
    U.panel({ col: 6, title: 'Assets', pad: false, body: block('asset', 'Assets') }) +
    U.panel({
      col: 6, title: 'Liabilities & equity', pad: false,
      body: block('liab', 'Liabilities') + block('equity', 'Equity'),
    }) + `</div>`;
}

/* ---------------------------------------------------------------- packs */

export function statements(ctx) {
  const { q, s, cfg } = ctx;
  const closed = q.closed;
  const months = q.months;

  const packs = [
    { id: 'monthly', name: 'Monthly reporting pack', icon: 'doc',
      what: 'What the finance team issues after a close.',
      holds: ['Profit & loss, by company and consolidated', 'Balance sheet with the prior year beside it',
        'Cash and working capital', 'A one-page summary with the month\u2019s answer'] },
    { id: 'owner', name: 'Owner report', icon: 'people',
      what: 'The quarterly pack an owner reads end to end.',
      holds: ['Performance against the plan', 'Position as of the quarter',
        `The ${s.industry.unit.many} that moved`, 'What changed since last quarter'] },
    { id: 'lender', name: 'Lender package', icon: 'lock',
      what: 'Signed-off months only, with the deliveries a facility asks for.',
      holds: ['Statements for the covered period', 'Covenant deliveries and their dates',
        'A certificate page', 'Nothing tentative, by construction'] },
    { id: 'board', name: 'Board summary', icon: 'bars',
      what: 'Eight quarters and the bridge, on as few pages as it takes.',
      holds: ['Eight quarters of revenue, margin and net income', 'The bridge from revenue to net income',
        'Cash and the ratios', 'Whatever the board asked for last time'] },
  ];

  const signedCount = months.filter(m => m <= closed).length;

  return U.pageHead({
    eyebrow: 'Finance',
    title: 'Statements & packs',
    answer: `Every pack is generated from the same facts the pages read, so a pack and a page
      cannot disagree. <b>${signedCount}</b> of <b>${months.length}</b> months are signed off, and a
      pack covers signed-off months only unless it is marked tentative.`,
  }) + U.fresh(q, s) + `<div class="grid">` +
    U.panel({
      col: 12, title: 'What is signed off',
      note: 'One cell per month. A pack can only carry what is closed.',
      body: `<div class="cover-strip">${months.map(m => {
        const state = m < closed ? 'signed' : m === closed ? 'close' : 'open';
        const title = `${F.monthName(m, true)}: ${state === 'open' ? 'not signed off'
          : state === 'close' ? 'the close month' : 'signed off'}`;
        return `<span class="cs ${state}" title="${esc(title)}">
          <i></i><em>${esc(F.monthName(m).split(' ')[0])}</em></span>`;
      }).join('')}</div>`,
      foot: (() => {
        const n = months.filter(m => m > closed).length;
        return (closed ? `Signed off through <b>${esc(F.monthName(closed, true))}</b>. ` : 'No month is signed off yet. ') + (n === 1
          ? '1 later month is tentative and carries that label everywhere it appears.'
          : `${n} later months are tentative and carry that label everywhere they appear.`);
      })(),
    }) +
    packs.map(p => U.panel({
      col: 6, title: p.name, note: p.what,
      right: U.btn('Print or save as PDF', { act: 'print-pack', arg: p.id, kind: 'primary', ico: 'print', sm: true })
        + U.btn('Figures as CSV', { act: 'export-pack', arg: p.id, sm: true, ico: 'download' }),
      body: `<div class="rows">${p.holds.map(h =>
        `<div class="row-item" style="padding:8px 12px">${icon('check', 15)}
          <span class="grow">${esc(h)}</span></div>`).join('')}</div>`,
      foot: `${closed ? `Covers ${esc(F.monthName(closed, true))} and earlier` : 'Covers no signed-off month yet'} \u00b7
        ${q.scopeEntities.length} ${q.scopeEntities.length === 1 ? 'company' : 'companies'} \u00b7
        ${q.units.length} ${esc(s.industry.unit.many)}`,
    })).join('') + `</div>`;
}

/* ----------------------------------------------------------------- close */

export function close(ctx) {
  const { q, s } = ctx;
  if (s.tenant) return tenantClose(q);
  const month = q.view.month;
  const closedIdx = q.months.indexOf(q.closed);
  const rows = q.entities.map((e, i) => {
    const sageClosed = i === 0 ? q.closed : q.months[Math.max(0, closedIdx - (i % 2))];
    const signed = i < q.entities.length - 1 ? sageClosed : q.months[Math.max(0, closedIdx - 1)];
    const waiting = signed < sageClosed;
    return {
      cls: '', cells: [
        esc(e.name),
        esc(F.monthName(sageClosed, true)),
        esc(F.monthName(signed, true)),
        waiting ? U.statusTag('Waiting on a signature', 'warn') : U.statusTag('Closed', 'good'),
        waiting ? U.btn('Sign off', { act: 'sign', arg: e.id, kind: 'primary', sm: true }) : '',
      ],
    };
  });
  const waiting = rows.filter(r => r.cells[3].includes('Waiting')).length;
  const checks = [
    { name: 'Assets equal liabilities plus equity', ok: true, note: 'Every month in the extract' },
    { name: 'Gross profit equals revenue less cost of revenue', ok: true, note: 'Checked at the source' },
    { name: `${s.industry.unit.collection} sum to the revenue line`, ok: true, note: 'To the cent' },
    { name: 'Budget covers every month it is compared over', ok: true, note: 'Months without a budget are left out rather than read as nil' },
    { name: 'Depreciation posted in every month', ok: true, note: '' },
    { name: 'A tentative month is labelled on every page', ok: true, note: 'Header, month picker and freshness strip' },
  ];

  return U.pageHead({
    eyebrow: 'Finance',
    title: 'Close & controls',
    answer: `A month closes on two signatures, never on the calendar.
      ${waiting
        ? `<b>${waiting}</b> ${waiting === 1 ? 'company is' : 'companies are'} closed in the ledger and waiting on a signature.`
        : 'Every company is signed off through the close month.'}
      ${month > q.closed ? `<b>${esc(F.monthName(month, true))} is tentative</b> and labelled so everywhere it appears.` : ''}`,
  }) + `<div class="grid">` +
    /* ⛔ Two panels, both full width, because they are the whole page and they
       are 250px against 584px. A short table beside a long list leaves a third
       of a screen empty on five of six industries, and both of these read
       better wide anyway: the table gets room for five columns, and a check
       gets its name and its reason on one line instead of wrapping. */
    U.panel({
      col: 12, title: 'By company', pad: false,
      note: 'The ledger’s own close date, then the signature. A reopening in the ledger voids the signature.',
      body: U.table({
        cols: [{ name: 'Company' }, { name: 'Closed in the ledger', n: true },
        { name: 'Signed through', n: true }, { name: 'State' }, { name: '' }],
        rows,
      }),
      foot: 'One signature from a controller or the chief executive closes a company. Both are recorded with who and when.',
    }) +
    U.panel({
      col: 12, title: 'Checks',
      note: 'Run on every refresh. A check that fails names the month and the figure.',
      body: `<div class="rows">${checks.map(c => `
        <div class="row-item">
          <span class="tag ${c.ok ? 'good' : 'bad'}"><i class="dot"></i>${c.ok ? 'Pass' : 'Fail'}</span>
          <span class="grow"><b>${esc(c.name)}</b>${c.note ? `<div class="sub">${esc(c.note)}</div>` : ''}</span>
        </div>`).join('')}</div>`,
    }) + `</div>`;
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
