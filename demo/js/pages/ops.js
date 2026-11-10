/* The operations module. One engine, six shapes: the columns, the second page
   and the unit detail all come from the industry profile, which is what makes
   the same build read as a construction dashboard and a fleet dashboard. */

import * as F from '../fmt.js?v=9843449aa8';
import * as C from '../chart.js?v=9843449aa8';
import * as U from '../ui.js?v=9843449aa8';
import { esc, icon } from '../icons.js?v=9843449aa8';
import { motif } from '../scenes.js?v=9843449aa8';

const mN = m => F.monthName(m);

/* The table columns per industry. Each is {name, n, get(row, ctx)}. */
const COLUMNS = {
  construction: [
    { name: 'Contract', n: true, get: r => F.money(r.f.contract) },
    { name: 'Earned', n: true, get: r => F.money(r.f.earned) },
    { name: 'Billed', n: true, get: r => F.money(r.f.billed) },
    { name: 'Over / under', n: true, get: r => {
      const v = (r.f.billed || 0) - (r.f.earned || 0);
      return `<span class="delta ${v >= 0 ? 'up' : 'down'}">${F.money(v, { sign: true })}</span>`;
    } },
    { name: 'Complete', n: true, get: r => bar(r.f.pct, 100, F.pct(r.f.pct, 0)) },
    { name: 'Cost at completion', n: true, get: r => {
      const p = (r.f.pct || 0) / 100;
      const proj = p > 0.05 ? (r.f.cost || 0) / p : (r.f.estCost || 0);
      const v = proj - (r.f.estCost || 0);
      return `<span class="delta ${v > 0 ? 'down' : 'up'}">${F.money(v, { sign: true })}</span>`;
    } },
  ],
  education: [
    { name: 'Grades', get: r => esc(r.grades || '') },
    { name: 'Enrolled', n: true, get: r => F.num(r.f.enrolled) },
    { name: 'Seats', n: true, get: r => F.num(r.f.capacity) },
    { name: 'Filled', n: true, get: r => bar(r.f.enrolled, r.f.capacity, F.pct(r.f.capacity ? r.f.enrolled / r.f.capacity * 100 : 0, 0)) },
    { name: 'Staff', n: true, get: r => F.num(r.f.staff, 1) },
    { name: 'Per student', n: true, get: r => F.exact(r.f.funding) },
    { name: 'Cost per student', n: true, get: r => F.exact(r.f.costPer) },
  ],
  healthcare: [
    { name: 'Specialty', get: r => esc(r.specialty || '') },
    { name: 'Visits', n: true, get: r => F.num(r.f.visits) },
    { name: 'Providers', n: true, get: r => F.num(r.f.providers, 1) },
    { name: 'Per visit', n: true, get: r => F.exact(r.f.perVisit, 2) },
    { name: 'Collected', n: true, get: r => bar(r.f.collect, 100, F.pct(r.f.collect, 1)) },
    { name: 'Days in A/R', n: true, get: r => F.num(r.f.arDays, 0) },
    { name: 'No-shows', n: true, get: r => F.pct(r.f.noShow, 1) },
  ],
  retail: [
    { name: 'Format', get: r => esc(r.format || '') },
    { name: 'Sales', n: true, get: r => F.money(r.f.sales) },
    { name: 'Sq ft', n: true, get: r => r.f.sqft ? F.num(r.f.sqft) : '—' },
    { name: 'Per sq ft', n: true, get: r => r.f.sqft ? F.exact(r.f.sales * 12 / r.f.sqft) : '—' },
    { name: 'Margin', n: true, get: r => F.pct(r.f.margin, 1) },
    { name: 'Visitors', n: true, get: r => F.num(r.f.traffic) },
    { name: 'Conversion', n: true, get: r => F.pct(r.f.conv, 1) },
  ],
  restaurants: [
    { name: 'Format', get: r => esc(r.format || '') },
    { name: 'Sales', n: true, get: r => F.money(r.f.sales) },
    { name: 'Covers', n: true, get: r => F.num(r.f.covers) },
    { name: 'Avg check', n: true, get: r => F.exact(r.f.check, 2) },
    { name: 'Prime cost', n: true, get: r => bar(r.f.prime, 100, F.pct(r.f.prime, 1)) },
    { name: 'Turns', n: true, get: r => r.f.seats ? F.num(r.f.turns, 1) : '—' },
    { name: 'Sales / labor hr', n: true, get: r => F.exact(r.f.splh, 2) },
  ],
  industrial: [
    { name: 'Plant', get: r => esc(r.plant || '') },
    { name: 'Produced', n: true, get: r => F.num(r.f.produced) },
    { name: 'Scrap', n: true, get: r => `${F.num(r.f.scrap)} <span class="muted">(${F.pct(r.f.produced ? r.f.scrap / r.f.produced * 100 : 0, 1)})</span>` },
    { name: 'Hours run', n: true, get: r => F.num(r.f.hoursRun, 0) },
    { name: 'OEE', n: true, get: r => bar(r.f.oee, 100, F.pct(r.f.oee, 1)) },
    { name: 'Cost per unit', n: true, get: r => F.exact(r.f.cpu, 2) },
  ],
  logistics: [
    { name: 'Terminal', get: r => esc(r.terminal || '') },
    { name: 'Loads', n: true, get: r => F.num(r.f.loads) },
    { name: 'Miles', n: true, get: r => F.num(r.f.miles) },
    { name: 'Rev / mile', n: true, get: r => F.exact(r.f.miles ? r.f.linehaul / r.f.miles : 0, 2) },
    { name: 'Fuel + maint / mile', n: true, get: r => F.exact(r.f.miles ? (r.f.fuel + r.f.maint) / r.f.miles : 0, 2) },
    { name: 'Deadhead', n: true, get: r => F.pct(r.f.deadhead, 1) },
    { name: 'On time', n: true, get: r => bar(r.f.onTime, 100, F.pct(r.f.onTime, 1)) },
  ],
  tech: [
    { name: 'ARR', n: true, get: r => F.money(r.f.arr) },
    { name: 'New ARR', n: true, get: r => F.money(r.f.newArr) },
    { name: 'Churn', n: true, get: r => `<span class="delta down">${F.money(r.f.churn)}</span>` },
    { name: 'Seats', n: true, get: r => F.num(r.f.seats) },
    { name: 'CAC', n: true, get: r => F.exact(r.f.cac) },
    { name: 'Gross margin', n: true, get: r => F.pct(r.f.gm, 1) },
  ],
};

function bar(v, max, label) {
  const w = max ? Math.min(100, Math.max(0, v / max * 100)) : 0;
  return `<span style="display:flex;align-items:center;gap:7px;justify-content:flex-end">
    <span class="bar-cell" style="width:62px"><i style="width:${w.toFixed(0)}%"></i></span>
    <span class="nowrap">${label}</span></span>`;
}

/* ------------------------------------------------------------------- home */

/* ⚖️ Matt, 2026-11-02: *"job portfolio section is really lame for the first
   tab and main page of the operations tab. more isnt always better but you can
   definitely fix it. make it prettier. give it more wow. have it be more
   useful"*.

   It was three generic panels: a bar chart of units by size, a flag list and a
   line. Nothing on it said what the book actually IS. The page now opens on
   the book as one object and then draws every unit as a real row, which is the
   view a person running the work actually wants: how far along, how big, and
   what is wrong with it, on one line each.

   ⛔ What a row shows is declared per industry in `portfolio` (industries.json)
   rather than branched on here, because a contract that is 60% complete and a
   campus that is 60% full are the same shape and different words. */
export function home(ctx) {
  const { q, s } = ctx;
  const ind = s.industry;
  const rows = q.unitRows();
  const w = q.window();
  const port = ind.portfolio || {};
  const flagged = flags(q, rows, ind);
  const flagOf = new Map(flagged.map(f => [f.id, f]));

  const read = (r, spec) => {
    if (!spec) return null;
    if (Array.isArray(spec)) {
      const a = r.f[spec[0]], b = r.f[spec[1]];
      return Number.isFinite(a) && Number.isFinite(b) && b ? a / b : null;
    }
    const v = r.f[spec];
    return Number.isFinite(v) ? (v > 1.5 ? v / 100 : v) : null;
  };

  /* A measure that never approaches 100% needs a scale of its own, or it
     draws as nothing happening. Retail's bar is conversion: 3% to 24% is a
     healthy spread for a store, but beside construction's 52% to 98% every
     retail bar read as a sliver. `barMax` is the ceiling the TRACK is drawn
     against; the figure printed on the row is always the real one, and the
     panel says what the scale is rather than leaving a full-looking bar to
     imply 100%. Raised by the publishing session reading the live page. */
  const barMax = Number.isFinite(port.barMax) && port.barMax > 0 ? port.barMax : 1;
  const book = rows.map(r => {
    const bar = read(r, port.bar);
    return {
      r, size: Number.isFinite(r.f[port.size]) ? r.f[port.size] : 0,
      bar, fill: bar === null ? null : Math.min(1, bar / barMax),
      mark: read(r, port.mark), flag: flagOf.get(r.id),
    };
  }).sort((a, b) => b.size - a.size);

  const total = book.reduce((a, x) => a + x.size, 0);
  const done = book.reduce((a, x) => a + x.size * (x.bar || 0), 0);
  const money = port.size && /contract|arr|sales|linehaul|funding/.test(port.size);
  const fmtSize = v => money ? F.money(v) : F.num(v);

  return U.verdict({
    title: opsVerdict(ctx, rows, flagged),
    body: `${esc(ind.tagline)}. ${rows.length} ${esc(ind.unit.many)} in scope.`,
    figs: headFigs(q, s, ind),
  }) + `<div class="grid">` +
    U.panel({
      col: 12, title: `The whole book`, ico: 'grid',
      note: `Every ${esc(ind.unit.one)} on one scale. The bar is ${esc((port.barLabel || 'progress').toLowerCase())}${
        port.mark ? `, the tick is ${esc((port.markLabel || '').toLowerCase())}` : ''}${
        port.barNote ? `, ${esc(port.barNote)}` : ''}.`,
      body: `<div class="book-top">
          <div class="book-bar" role="img" aria-label="${Math.round(done / (total || 1) * 100)}% of the book">
            ${book.map(x => `<span style="flex:${Math.max(x.size, total * 0.004)} 0 0"
              class="${x.flag ? 'bad' : ''}" title="${esc(x.r.short || x.r.name)}: ${fmtSize(x.size)}">
              <i style="width:${Math.round((x.fill || 0) * 100)}%"></i></span>`).join('')}
          </div>
          <div class="book-key">
            <span><b>${fmtSize(total)}</b>${esc(port.sizeLabel || 'total')} across ${book.length} ${esc(ind.unit.many)}</span>
            <span><i class="k-done"></i>${Math.round(done / (total || 1) * 100)}% ${esc((port.barLabel || '').toLowerCase())}</span>
            ${flagged.length ? `<span><i class="k-bad"></i>${flagged.length} flagged</span>` : ''}
          </div>
        </div>`,
    }) +
    U.panel({
      col: 12, title: `Every ${esc(ind.unit.one)}`, ico: 'list', pad: false,
      note: `Largest first. Click any row to open its arithmetic.`,
      body: `<div class="pf">${book.map((x, n) => {
        const pct = Math.round((x.bar || 0) * 100);
        const fill = Math.round((x.fill || 0) * 100);
        return `<div class="pf-row" data-click="unit:${esc(x.r.id)}" tabindex="0">
          <span class="pf-n">${n + 1}</span>
          <span class="pf-name">
            <b>${esc(x.r.short || x.r.name)}</b>
            <span>${esc([x.r.id, x.r.status, x.r.owner].filter(Boolean).join(' \u00b7 '))}</span>
          </span>
          <span class="pf-bar" title="${esc(port.barLabel || '')}: ${pct}%">
            <i style="width:${fill}%" class="${x.flag ? 'bad' : ''}"></i>
            ${Number.isFinite(x.mark) ? `<em style="left:${Math.min(100, Math.round(x.mark / barMax * 100))}%"
              title="${esc(port.markLabel || '')}"></em>` : ''}
            <b>${pct}%</b>
          </span>
          ${(port.chips || []).map(([k, label]) => `<span class="pf-chip">
            <b>${Number.isFinite(x.r.f[k]) ? (/cost|earned|cpu|arr|margin/i.test(k)
              ? F.money(x.r.f[k]) : F.num(x.r.f[k])) : '—'}</b><span>${esc(label)}</span></span>`).join('')}
          <span class="pf-size">${fmtSize(x.size)}<span>${esc(port.sizeLabel || '')}</span></span>
          <span class="pf-flag">${x.flag
          ? `<span class="tag ${x.flag.kind}"><i class="dot"></i>${esc(x.flag.tag)}</span>`
          : `<span class="tag good"><i class="dot"></i>In band</span>`}</span>
        </div>`;
      }).join('')}</div>`,
      foot: `${flagged.length} of ${rows.length} ${esc(ind.unit.many)} are outside their band.
        The rules are on <b>What needs you</b>.`,
    }) +
    U.panel({
      col: 12, title: 'The whole picture, month by month', ico: 'clock',
      body: (() => {
        const vs = q.months.slice(-18).map(m => headlineTotal(q, ind, m));
        const fin = vs.filter(Number.isFinite);
        const avg = fin.length ? fin.reduce((a, b) => a + b, 0) / fin.length : null;
        return C.line({
          series: [{ name: headlineName(ind), values: vs }],
          labels: q.months.slice(-18).map(mN), fmt: v => headlineFmt(ind, v), height: 240, legend: false,
          rule: avg, ruleLabel: `average month ${headlineFmt(ind, avg || 0)}`,
        });
      })(),
    }) + `</div>`;
}

function headFigs(q, s, ind) {
  return ind.kpis.slice(0, 4).map(id => {
    const k = q.kpi(id);
    return { label: k.label, value: U.display(k) };
  });
}

/* A `why` clause is written to sit after a colon and carries no full stop, so
   anything spliced after it runs on: "over the estimate Everything below it".
   The same defect appeared in the operations verdict and on What needs you, so
   the termination lives in one place rather than being remembered twice. */
function endSentence(html) {
  const text = String(html).replace(/<[^>]+>/g, '').trim();
  return /[.!?]$/.test(text) ? html : `${html}.`;
}

function opsVerdict(ctx, rows, flagged) {
  const { q, s } = ctx;
  const ind = s.industry;
  const k = q.kpi(ind.headline.metric);
  const lead = `${esc(ind.headline.label)} is <b>${U.display(k)}</b>`;
  if (!flagged.length) return `${lead}, and every ${esc(ind.unit.one)} is inside its band.`;
  const first = flagged[0];
  /* `why` is written as a clause and does not punctuate itself, so the next
     sentence ran straight on: "against a company 42.8% 2 others are flagged".
     And the count read "1 other ARE flagged" at exactly two, because the
     plural was taken off the noun and left on the verb. */
  const why = endSentence(first.why);
  const rest = flagged.length - 1;
  return `${lead}. <b>${esc(first.name)}</b> is the one to look at: ${why}` +
    (rest > 0 ? ` ${rest} other${rest > 1 ? 's are' : ' is'} flagged.` : '');
}

function headlineOf(q, r, ind, w) {
  let t = 0;
  for (const m of w) t += q.fact(r.id, 'rev', m) || 0;
  return Math.round(t * 100) / 100;
}

function headlineName(ind) {
  return { construction: 'Earned revenue', education: 'Students enrolled', retail: 'Net sales',
    restaurants: 'Net sales', industrial: 'Units produced', logistics: 'Miles', tech: 'ARR',
    healthcare: 'Patient visits' }[ind.id];
}

function headlineTotal(q, ind, m) {
  const key = { construction: 'rev', education: 'enrolled', retail: 'sales', restaurants: 'sales',
    industrial: 'produced', logistics: 'miles', tech: 'arr', healthcare: 'visits' }[ind.id];
  return q.factSum(key, [m]);
}

function headlineFmt(ind, v) {
  return ['education', 'industrial', 'logistics', 'healthcare'].includes(ind.id) ? F.num(v) : F.money(v);
}

/* Rules, per industry. A flag names the figure that tripped it. */
function flags(q, rows, ind) {
  const out = [];
  const month = q.view.month;
  for (const r of rows) {
    const f = r.f || {};
    /* `value` is what the finding is WORTH, which is what orders a task list.
       Without it every flag is equally urgent, and a $29K overrun sorts beside
       a $4M one. Where a rule has no money behind it the value is 0 and the
       page says the list is ordered by severity for those. */
    const add = (tag, kind, why, value = 0) =>
      out.push({ id: r.id, name: r.name, owner: r.owner, tag, kind, why, value });
    if (ind.id === 'construction') {
      const p = (f.pct || 0) / 100;
      const proj = p > 0.05 ? (f.cost || 0) / p : 0;
      if (proj && f.estCost && proj > f.estCost * 1.05) {
        add('Overrun', 'bad', `projected to finish <b>${F.money(proj - f.estCost)}</b> over the estimate`,
          proj - f.estCost);
      } else if ((f.earned || 0) - (f.billed || 0) > (f.contract || 0) * 0.04) {
        add('Under-billed', 'warn', `<b>${F.money(f.earned - f.billed)}</b> of work is done and not invoiced`,
          f.earned - f.billed);
      }
    } else if (ind.id === 'education') {
      const fill = f.capacity ? f.enrolled / f.capacity : 1;
      if (fill < 0.7 || fill < 0.85) {
        add('Seats empty', fill < 0.7 ? 'bad' : 'warn',
          `<b>${F.num(f.capacity - f.enrolled)}</b> seats open at
           <b>${F.pct(fill * 100, 0)}</b> full, worth
           <b>${F.money((f.capacity - f.enrolled) * (f.funding || 0))}</b> of funding`,
          (f.capacity - f.enrolled) * (f.funding || 0));
      }
    } else if (ind.id === 'healthcare') {
      /* money left on the table: what was allowed and not collected */
      const leak = (f.rev || 0) * Math.max(0, 96 - (f.collect || 0)) / 100;
      if ((f.arDays || 0) > 50 || (f.collect || 100) < 92) {
        add('Revenue cycle', 'bad', `<b>${F.num(f.arDays, 0)}</b> days in A/R and
          <b>${F.pct(f.collect, 1)}</b> collected, about <b>${F.money(leak)}</b> short this month`, leak);
      } else if ((f.noShow || 0) > 9) {
        add('No-shows', 'warn', `<b>${F.pct(f.noShow, 1)}</b> of booked visits did not show, about
          <b>${F.num((f.visits || 0) * f.noShow / (100 - f.noShow))}</b> empty slots`,
          (f.visits || 0) * f.noShow / (100 - f.noShow) * (f.perVisit || 0));
      }
    } else if (ind.id === 'retail') {
      if (f.margin && f.margin < ind.model.gm * 100 - 6) {
        add('Margin down', 'bad', `margin of <b>${F.pct(f.margin)}</b> against a company
          ${F.pct(ind.model.gm * 100)}`,
          (f.sales || 0) * (ind.model.gm * 100 - f.margin) / 100);
      }
    } else if (ind.id === 'restaurants') {
      if (f.prime && f.prime > 65) {
        add('Prime cost', 'bad', `prime cost of <b>${F.pct(f.prime)}</b>, food
          <b>${F.pct(f.food)}</b> and labor <b>${F.pct(f.labor)}</b>`,
          (f.sales || 0) * (f.prime - 60) / 100);
      } else if (f.food && f.food > 34) {
        add('Food cost', 'warn', `food cost at <b>${F.pct(f.food)}</b> of sales`,
          (f.sales || 0) * (f.food - 31) / 100);
      }
    } else if (ind.id === 'industrial') {
      if (f.oee && f.oee < 62) add('Downtime', 'bad', `OEE of <b>${F.pct(f.oee)}</b>, with
        <b>${F.num((f.hoursAvl || 0) - (f.hoursRun || 0), 0)}</b> hours lost`,
        ((f.hoursAvl || 0) - (f.hoursRun || 0)) * (f.ratePerHour || 0));
      else if (f.produced && f.scrap / f.produced > 0.04) {
        add('Scrap', 'warn', `scrap at <b>${F.pct(f.scrap / f.produced * 100)}</b>`);
      }
    } else if (ind.id === 'logistics') {
      const rpm = f.miles ? f.linehaul / f.miles : 0;
      const cpm = f.miles ? (f.fuel + f.maint) / f.miles : 0;
      if (rpm && cpm / rpm > 0.42) {
        add('Cost per mile', 'bad', `fuel and maintenance are <b>${F.pct(cpm / rpm * 100, 0)}</b>
          of the revenue the truck earns`);
      } else if (f.onTime && f.onTime < 90) {
        add('Service', 'warn', `on time <b>${F.pct(f.onTime)}</b>`);
      }
    } else if (ind.id === 'tech') {
      if (f.arr && f.churn / f.arr > 0.014) {
        add('Churn', 'bad', `<b>${F.money(f.churn)}</b> churned this month, which is
          <b>${F.pct(f.churn / f.arr * 100, 2)}</b> of the product’s ARR`, f.churn);
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ units */

export function units(ctx) {
  const { q, s } = ctx;
  const ind = s.industry;
  const cols = COLUMNS[ind.id] || [];
  const rows = q.unitRows();
  const name = (ind.pages && ind.pages['ops-units'] && ind.pages['ops-units'].name) || ind.unit.collection;

  /* ⛔ A WORK IN PROGRESS SCHEDULE IS NOT A TABLE OF UNITS.

     Matt, 2026-11-02: *"work in progress could definitely have a better
     build"*. Construction calls this page Work in progress, and a WIP schedule
     is THE report a construction CFO reads: what is under contract, what the
     work has earned, what has been billed, and the gap between the last two.
     That gap is the point. Billed ahead of the work is money the company owes
     back in service; work done and not billed is money it has already spent
     and not asked for. They are opposite problems and a single net figure
     hides both, so the page shows the two sides apart and nets them underneath.

     It is driven by the facts, not by the industry name: any deployment whose
     units carry a contract, what it has earned and what it has billed gets the
     schedule. Everything else keeps the table, which also gains its totals. */
  const hasWip = rows.some(r => Number.isFinite(r.f.contract) && Number.isFinite(r.f.earned)
    && Number.isFinite(r.f.billed));

  const wip = rows.map(r => ({
    r,
    contract: r.f.contract || 0,
    earned: r.f.earned || 0,
    billed: r.f.billed || 0,
    cost: r.f.cost || 0,
    pos: (r.f.billed || 0) - (r.f.earned || 0),
  }));
  const sum = k => wip.reduce((a, x) => a + x[k], 0);
  const over = wip.filter(x => x.pos > 0);
  const under = wip.filter(x => x.pos < 0);
  const overTotal = over.reduce((a, x) => a + x.pos, 0);
  const underTotal = Math.abs(under.reduce((a, x) => a + x.pos, 0));

  const head = U.pageHead({
    eyebrow: 'Operations',
    title: name,
    motif: motif(ind.id, s.data.brand.palette),
    answer: hasWip
      ? `<b>${F.money(sum('contract'))}</b> under contract, of which
         <b>${F.money(sum('earned'))}</b> has been earned and
         <b>${F.money(sum('billed'))}</b> billed.
         ${overTotal >= underTotal
        ? `On balance the company is <b>${F.money(overTotal - underTotal)}</b> ahead of its work,
             which is revenue it still has to deliver.`
        : `On balance <b>${F.money(underTotal - overTotal)}</b> of work is done and not yet
             invoiced, which is cash already spent and not asked for.`}`
      : `Every ${esc(ind.unit.one)} in scope as of <b>${esc(F.monthName(q.view.month, true))}</b>.
         A position is read as of the month, not summed over the window. Click any row for the
         arithmetic behind it.`,
  }) + U.fresh(q, s);

  /* ⛔ THE STRIP GOES BEFORE THE GRID, NEVER INSIDE IT. A `.strip` laid out as
     a grid child becomes a single column and overlaps the panel beside it.
     This is the second time I have made exactly this mistake, so the gate now
     refuses it rather than relying on me remembering. */
  const wipStrip = !hasWip ? '' :
    U.strip([
      { label: 'Under contract', value: F.money(sum('contract')), note: `${rows.length} ${esc(ind.unit.many)}` },
      { label: 'Earned to date', value: F.money(sum('earned')), note: `${F.pct(sum('contract') ? sum('earned') / sum('contract') * 100 : 0, 0)} of contract` },
      { label: 'Billed to date', value: F.money(sum('billed')), note: 'invoiced' },
      { label: 'Billed ahead', value: F.money(overTotal), note: `${over.length} ${over.length === 1 ? esc(ind.unit.one) : esc(ind.unit.many)}` },
      { label: 'Not yet billed', value: F.money(underTotal), note: `${under.length} ${under.length === 1 ? esc(ind.unit.one) : esc(ind.unit.many)}` },
    ]);

  const wipPanels = !hasWip ? '' :
    U.panel({
      col: 12, ico: 'scale', title: 'The two sides of the billing position',
      note: `Left is work done and not invoiced, which is cash already spent. Right is billing
        ahead of the work, which is revenue still to deliver. A company wants both small, and
        a single net figure would hide either one.`,
      body: C.twoSided({
        /* ⛔ EVERY contract, not the largest eight. Cutting the chart at eight
           made its right-hand column total $394K while the strip above it and
           the note below it both said $468K: three figures for one fact on one
           page, which is the defect class this build keeps finding. A thin
           slice is honest; a total that disagrees with the card above it is
           not. */
        left: {
          name: 'Work done, not billed',
          parts: under.slice().sort((a, b) => a.pos - b.pos)
            .map(x => ({ name: x.r.short || x.r.name, value: Math.abs(x.pos) })),
        },
        right: {
          name: 'Billed ahead of the work',
          parts: over.slice().sort((a, b) => b.pos - a.pos)
            .map(x => ({ name: x.r.short || x.r.name, value: x.pos })),
        },
        fmt: v => F.money(v),
      }),
      foot: `${F.money(underTotal)} on the left against ${F.money(overTotal)} on the right.
        Both sides are read as of ${esc(F.monthName(q.view.month, true))}, because a position is
        a position and does not sum over a window.`,
    });

  return head + wipStrip + `<div class="grid">` + wipPanels +
    U.panel({
      col: 12, pad: false,
      right: U.btn('Download', { act: 'export-units', ico: 'download', sm: true }),
      title: hasWip ? 'The schedule' : `${rows.length} ${esc(ind.unit.many)}`,
      note: `Owner shown as the ${esc((ind.unit.owner || 'manager').toLowerCase())} responsible.
        Click any row for the arithmetic behind it.`,
      body: U.table({
        maxHeight: '620px',
        cols: [{ name: ind.unit.key, w: '22%' }, { name: 'Status' }, ...cols],
        rows: rows.map(r => ({
          click: `unit:${r.id}`,
          cells: [
            `<b>${esc(r.name)}</b><div class="sub">${esc(r.owner)}</div>`,
            U.statusTag(r.status, statusKind(r.status)),
            ...cols.map(c => c.get(r, ctx)),
          ],
        })),
      }),
      /* ⛔ A schedule without totals is a list. The figure a reader checks
         first is the bottom line, and making them add a column themselves is
         the difference between a report and a data dump. */
      foot: hasWip
        ? `<b>${F.money(sum('contract'))}</b> under contract · <b>${F.money(sum('earned'))}</b>
           earned · <b>${F.money(sum('billed'))}</b> billed · <b>${F.money(sum('cost'))}</b> cost
           to date, leaving <b>${F.money(sum('earned') - sum('cost'))}</b> of margin on the work
           done so far.`
        : `${rows.length} ${esc(ind.unit.many)} as of ${esc(F.monthName(q.view.month, true))}.`,
    }) + `</div>`;
}

function statusKind(status) {
  if (/complete|closed/i.test(status)) return '';
  if (/shop|hold|beta/i.test(status)) return 'warn';
  return 'good';
}

/* --------------------------------------------------------- second ops page */

export function second(ctx) {
  const { q, s } = ctx;
  const ind = s.industry;
  const name = (ind.pages && ind.pages['ops-second'] && ind.pages['ops-second'].name) || 'Performance';
  const fn = {
    construction: backlog, education: enrolment, retail: category, restaurants: primeCost,
    industrial: throughput, logistics: lanes, tech: retention, healthcare: revenueCycle,
  }[ind.id] || backlog;
  return U.pageHead({ eyebrow: 'Operations', title: name, answer: fn.answer(ctx),
    motif: motif(ind.id, s.data.brand.palette) })
    + U.fresh(q, s) + `<div class="grid">${fn(ctx)}</div>`;
}

/* --- construction: backlog and schedule */
function backlog(ctx) {
  const { q, s } = ctx;
  const all = q.unitRows();
  const rows = all.filter(r => r.status !== 'Complete');
  const remaining = rows.map(r => ({
    name: r.short || r.name,
    value: (r.f.contract || 0) - (r.f.earned || 0),
    note: F.pct(r.f.pct, 0),
    id: r.id,
  })).sort((a, b) => b.value - a.value);
  const total = remaining.reduce((a, r) => a + r.value, 0);
  const burn = q.factSum('rev', q.months.slice(-3)) / 3;

  /* THE SCHEDULE. The page is called Backlog & schedule and had no schedule in
     it: three panels, two of them the same horizontal bar chart, which is what
     Matt meant by *"backlog and schedule is ugly and needs better graphics and
     layout"*. Every unit carries the month it started and how many months it
     runs, so the schedule can be drawn rather than described.

     The window is every open contract's span, so the bars share one axis and
     can be compared. A bar is filled to the work actually earned, which is the
     comparison that matters: a contract three quarters through its CALENDAR
     and half through its WORK is the finding, and no table of percentages
     shows it the way two lengths side by side do. */
  const span = rows.map(r => ({
    r,
    from: Number.isFinite(r.start) ? r.start : 0,
    to: (Number.isFinite(r.start) ? r.start : 0) + (r.dur || 12),
    pct: Math.max(0, Math.min(1, (r.f.pct || 0) / 100)),
  }));
  const now = q.months.indexOf(q.view.month);
  const lo = Math.min(now, ...span.map(x => x.from));
  const hi = Math.max(now + 2, ...span.map(x => x.to));
  const at = v => ((v - lo) / Math.max(1, hi - lo)) * 100;
  const monthOf = i => {
    if (i >= 0 && i < q.months.length) return F.monthName(q.months[i], true);
    const base = q.months[0];
    const [y, m] = base.split('-').map(Number);
    const total2 = (y * 12 + (m - 1)) + i;
    return F.monthName(`${Math.floor(total2 / 12)}-${String(total2 % 12 + 1).padStart(2, '0')}`, true);
  };
  /* A contract whose calendar has run out while work remains. The page says
     how many rather than leaving the reader to compare two bars by eye. */
  const late = span.filter(x => x.to <= now && x.pct < 0.995);
  const ticks = [];
  for (let i = Math.ceil(lo / 6) * 6; i <= hi; i += 6) ticks.push(i);

  return U.panel({
    col: 12, ico: 'clock', title: 'When each contract runs',
    note: `Every open contract on one calendar. The pale bar is its schedule, the solid part is the work earned, and the line is ${esc(F.monthName(q.view.month, true))}.`,
    /* ⛔ The axis, the today line and the bars must all measure from the SAME
       box. The first cut positioned the axis and the line against the whole
       row, which is wider than the bars' column by the name and percent
       cells, and offset them by a hard-coded margin on top. Measured: the line
       landed on May 2027 while the page was as of October 2026, seven months
       out, against bars that were drawn correctly. So the axis and the line
       are now laid out on the row's own grid and positioned inside its track
       cell, which cannot drift from the bars whatever the column widths do. */
    body: `<div class="gantt">
      <div class="gt-row gt-axis"><span></span><span class="gt-track">${ticks.map(t =>
      `<i style="left:${at(t).toFixed(2)}%">${esc(monthOf(t))}</i>`).join('')}</span><span></span></div>
      <div class="gt-rows">
        <div class="gt-row gt-nowrow" aria-hidden="true"><span></span><span class="gt-track">
          <i class="gt-now" style="left:${at(now).toFixed(2)}%"></i></span><span></span></div>
        ${span.slice().sort((a, b) => a.from - b.from).map(x => `
          <div class="gt-row" data-click="unit:${esc(x.r.id)}" tabindex="0">
            <span class="gt-name">${esc(x.r.short || x.r.name)}</span>
            <span class="gt-track">
              <i class="gt-bar${x.to <= now && x.pct < 0.995 ? ' late' : ''}"
                 data-r="${esc(x.r.short || x.r.name)} · ${esc(monthOf(x.from))} to ${esc(monthOf(x.to))} · ${F.pct(x.r.f.pct, 0)} of the work earned${
          x.to <= now && x.pct < 0.995 ? ' · calendar has run out' : ''}"
                 style="left:${at(x.from).toFixed(2)}%;width:${Math.max(1.2, at(x.to) - at(x.from)).toFixed(2)}%">
                <b style="width:${(x.pct * 100).toFixed(1)}%"></b>
              </i>
            </span>
            <span class="gt-pct">${F.pct(x.r.f.pct, 0)}</span>
          </div>`).join('')}
      </div>
      <div class="hm-key"><p>
        A bar that ends left of the line with its solid part short is a contract
        whose calendar has run out while work remains.
        ${late.length
      ? `<b>${late.length}</b> of <b>${span.length}</b> ${late.length === 1 ? 'is' : 'are'} in that position.`
      : 'None is in that position today.'}
      </p></div>
    </div>`,
  }) + U.panel({
    col: 7, ico: 'bars', title: 'What is left to earn',
    note: 'The open contracts by the work still to come, largest first.',
    body: C.hbars({ rows: remaining, fmt: v => F.money(v) }),
    foot: `At the last three months’ pace of ${F.money(burn)} a month, the backlog is
      ${F.num(burn ? total / burn : 0, 1)} months of work.`,
  }) + U.panel({
    col: 5, ico: 'target', title: 'Completion spread',
    note: 'Where the open contracts sit. A cluster near the end means revenue falls off unless the pipeline lands.',
    body: C.bars({
      values: [0, 0, 0, 0, 0].map((_, i) =>
        rows.filter(r => (r.f.pct || 0) >= i * 20 && (r.f.pct || 0) < (i + 1) * 20).length),
      labels: ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'],
      fmt: v => F.num(v), height: 230, negativeOk: false,
    }),
    foot: `${rows.filter(r => (r.f.pct || 0) >= 80).length} of ${rows.length} open contracts are
      past 80% complete.`,
  }) + U.panel({
    col: 12, ico: 'scale', title: 'Billing against work done',
    note: 'To the right is billed ahead of the work, to the left is work done and not yet invoiced.',
    body: C.hbars({
      rows: all.map(r => ({
        name: r.short || r.name, value: (r.f.billed || 0) - (r.f.earned || 0),
      })).sort((a, b) => a.value - b.value),
      fmt: v => F.money(v),
    }),
    foot: (() => {
      const under = all.map(r => (r.f.billed || 0) - (r.f.earned || 0)).filter(v => v < 0);
      return `${under.length} ${under.length === 1 ? 'contract carries' : 'contracts carry'}
        ${F.money(Math.abs(under.reduce((a, v) => a + v, 0)))} of work done and not yet invoiced.`;
    })(),
  });
}

backlog.answer = ctx => {
  const { q } = ctx;
  const open = q.unitRows().filter(r => r.status !== 'Complete');
  const total = open.reduce((a, r) => a + (r.f.contract || 0) - (r.f.earned || 0), 0);
  const burn = q.factSum('rev', q.months.slice(-3)) / 3;
  return `<b>${F.money(total)}</b> of contracted work is still to be earned across
    <b>${open.length}</b> open contracts, which at the current pace is
    <b>${F.num(burn ? total / burn : 0, 1)} months</b> of revenue.`;
};

/* --- education: enrolment */
function enrolment(ctx) {
  const { q } = ctx;
  const rows = q.unitRows();
  const months = q.months.slice(-24);
  return U.panel({
    col: 7, title: 'Enrolment by campus',
    note: 'Enrolled against seats. The gap is funding not collected.',
    body: C.hbars({
      rows: rows.map(r => ({
        name: r.short, value: r.f.enrolled || 0, mark: r.f.capacity,
        note: F.pct(r.f.capacity ? r.f.enrolled / r.f.capacity * 100 : 0, 0),
        color: (r.f.enrolled / (r.f.capacity || 1)) < 0.85 ? 'var(--warn)' : 'var(--accent)',
      })),
      fmt: v => F.num(v), max: Math.max(...rows.map(r => r.f.capacity || 0)),
    }),
    foot: 'The tick on each bar is that campus’s capacity.',
  }) + U.panel({
    col: 5, title: 'Cost against funding, per student',
    note: 'A campus below the line costs more to run than it is funded for.',
    body: C.scatter({
      points: rows.map(r => ({ name: r.name, x: r.f.funding || 0, y: r.f.costPer || 0 })),
      xFmt: v => F.exact(v), yFmt: v => F.exact(v),
      xLabel: 'Funding per student', yLabel: 'Cost per student', height: 300,
    }),
  }) + U.panel({
    col: 12, title: 'Enrolment over two years',
    body: C.line({
      series: [
        { name: 'Enrolled', values: months.map(m => q.factSum('enrolled', [m])) },
        { name: 'Seats', values: months.map(m => q.factSum('capacity', [m])), dash: true, area: false },
      ],
      labels: months.map(mN), fmt: v => F.num(v), height: 240,
    }),
  });
}
enrolment.answer = ctx => {
  const { q } = ctx;
  const e = q.factAt('enrolled'), c = q.factAt('capacity');
  const low = q.unitRows().filter(r => r.f.capacity && r.f.enrolled / r.f.capacity < 0.85);
  return `<b>${F.num(e)}</b> of <b>${F.num(c)}</b> seats are filled.
    ${low.length ? `<b>${low.length}</b> ${low.length === 1 ? 'campus is' : 'campuses are'} under 85%, worth
      <b>${F.money(low.reduce((a, r) => a + (r.f.capacity - r.f.enrolled) * (r.f.funding || 0), 0))}</b>
      of funding.` : 'Every campus is above 85% full.'}`;
};

/* --- healthcare: visits and the revenue cycle

   A clinic earns a visit four times over: it has to be booked, the patient has
   to come, it has to be coded and the payer has to pay. Visits and no-shows come
   from the practice management system and the money from the ledger, so nothing
   on this page is typed in by hand. */
const COLLECT_TARGET = 95;

function revenueCycle(ctx) {
  const { q } = ctx;
  const rows = q.unitRows();
  const months = q.months.slice(-18);
  return U.panel({
    col: 12, title: 'Collection rate by clinic',
    note: `Collected against what payers allowed. The mark is the ${COLLECT_TARGET}% a well run practice holds.`,
    body: C.hbars({
      rows: rows.map(r => ({
        name: r.short, value: r.f.collect || 0, mark: COLLECT_TARGET,
        note: `${F.num(r.f.arDays, 0)} days in A/R`,
        color: (r.f.collect || 0) < 92 ? 'var(--bad)' : ((r.f.collect || 0) < COLLECT_TARGET ? 'var(--warn)' : 'var(--good)'),
      })).sort((a, b) => a.value - b.value),
      fmt: v => F.pct(v, 1), max: 100,
    }),
    foot: 'A point of collection on this month’s revenue is worth '
      + `<b>${F.money(q.factAt('rev') / 100)}</b> to the group.`,
  }) + U.panel({
    col: 5, title: 'No-shows against days in A/R',
    note: 'A clinic high on both is losing money at the front desk and again in billing.',
    body: C.scatter({
      points: rows.map(r => ({ name: r.name, x: r.f.noShow || 0, y: r.f.arDays || 0 })),
      xFmt: v => F.pct(v, 1), yFmt: v => F.num(v, 0),
      xLabel: 'No-show rate', yLabel: 'Days in A/R', height: 300,
    }),
  }) + U.panel({
    col: 7, title: 'Visits, month by month',
    body: C.line({
      series: [{ name: 'Visits', values: months.map(m => q.factSum('visits', [m])) }],
      labels: months.map(mN), fmt: v => F.num(v), height: 230, legend: false,
    }),
    foot: 'Winter carries the respiratory season, so January reads high and summer reads low every year.',
  });
}
revenueCycle.answer = ctx => {
  const { q } = ctx;
  const v = q.kpi('visits'), pv = q.kpi('perVisit'), cr = q.kpi('collectRate'), ar = q.kpi('arDays');
  const worst = q.unitRows().slice().sort((a, b) => (b.f.arDays || 0) - (a.f.arDays || 0))[0];
  return `<b>${F.num(v.value)}</b> visits at <b>${F.exact(pv.value, 2)}</b> each, with
    <b>${F.pct(cr.value, 1)}</b> collected and <b>${F.num(ar.value, 0)}</b> days in A/R.
    <b>${esc(worst ? worst.name : '')}</b> is slowest to collect at
    <b>${F.num(worst ? worst.f.arDays : 0, 0)}</b> days.`;
};

/* --- retail: category and basket */
function category(ctx) {
  const { q } = ctx;
  const rows = q.unitRows();
  const months = q.months.slice(-18);
  return U.panel({
    col: 6, title: 'Sales per square foot',
    note: 'Annualised, selling area only, so a flagship and a mall unit can be compared.',
    body: C.hbars({
      rows: rows.filter(r => r.f.sqft).map(r => ({
        name: r.short, value: r.f.sales * 12 / r.f.sqft, note: r.format,
      })).sort((a, b) => b.value - a.value),
      fmt: v => F.exact(v),
    }),
  }) + U.panel({
    col: 6, title: 'Traffic against conversion',
    note: 'A store with traffic and no conversion is a different problem from one with neither.',
    body: C.scatter({
      points: rows.filter(r => r.f.sqft).map(r => ({ name: r.name, x: r.f.traffic || 0, y: r.f.conv || 0 })),
      xFmt: v => F.num(v), yFmt: v => F.pct(v, 0),
      xLabel: 'Visitors', yLabel: 'Conversion', height: 290,
    }),
  }) + U.panel({
    col: 12, title: 'Sales and margin together',
    body: C.line({
      series: [
        { name: 'Net sales', values: months.map(m => q.factSum('sales', [m])) },
      ],
      labels: months.map(mN), fmt: v => F.money(v), height: 230, legend: false,
    }),
    foot: 'The seasonal peak is November and December, which is why a month-on-month read is misleading here and a year-on-year read is not.',
  });
}
category.answer = ctx => {
  const { q } = ctx;
  const sp = q.kpi('salesPerSqft'), bk = q.kpi('basket');
  const rows = q.unitRows().filter(r => r.f.sqft);
  const best = rows.slice().sort((a, b) => (b.f.sales / b.f.sqft) - (a.f.sales / a.f.sqft))[0];
  return `The estate trades at <b>${F.exact(sp.value)}</b> per square foot on a
    <b>${F.exact(bk.value, 2)}</b> basket. <b>${esc(best ? best.name : '')}</b> is the densest at
    <b>${F.exact(best ? best.f.sales * 12 / best.f.sqft : 0)}</b>.`;
};

/* --- restaurants: prime cost and service

   Prime cost is the number a restaurant operator runs on: food and labor
   together, as a share of sales. 60% is the line most groups hold themselves
   to, and the page draws it rather than leaving a reader to remember it. */
const PRIME_TARGET = 60;

function primeCost(ctx) {
  const { q } = ctx;
  const rows = q.unitRows();
  const months = q.months.slice(-18);
  const groupPrime = m => {
    const s = q.factSum('sales', [m]);
    return s ? (q.factSum('foodUsd', [m]) + q.factSum('laborUsd', [m])) / s * 100 : null;
  };
  /* the ranked list runs a row per location, so it takes the full width and
     the two charts share the row under it rather than one stranded beside it */
  return U.panel({
    col: 12, title: 'Prime cost by location',
    note: `Food plus labor as a share of sales. The mark is the ${PRIME_TARGET}% most groups hold themselves to.`,
    body: C.hbars({
      rows: rows.map(r => ({
        name: r.short, value: r.f.prime || 0, mark: PRIME_TARGET,
        note: `food ${F.pct(r.f.food, 0)} · labor ${F.pct(r.f.labor, 0)}`,
        color: (r.f.prime || 0) > 65 ? 'var(--bad)' : ((r.f.prime || 0) > 62 ? 'var(--warn)' : 'var(--good)'),
      })).sort((a, b) => b.value - a.value),
      fmt: v => F.pct(v, 1), max: 100,
    }),
    foot: `Each point over ${PRIME_TARGET}% on this month’s sales is worth
      <b>${F.money(q.factAt('sales') / 100)}</b> to the group.`,
  }) + U.panel({
    col: 5, title: 'Average check against table turns',
    note: 'Dining rooms only. A room that turns slowly has to sell a bigger check to earn the same seat.',
    body: C.scatter({
      points: rows.filter(r => r.f.seats).map(r => ({ name: r.name, x: r.f.turns || 0, y: r.f.check || 0 })),
      xFmt: v => F.num(v, 1), yFmt: v => F.exact(v, 2),
      xLabel: 'Turns a day', yLabel: 'Average check', height: 300,
    }),
  }) + U.panel({
    col: 7, title: 'Prime cost, month by month',
    body: C.line({
      series: [{ name: 'Prime cost', values: months.map(groupPrime) }],
      labels: months.map(mN), fmt: v => F.pct(v, 1), height: 230, legend: false,
      rule: PRIME_TARGET, ruleLabel: `target ${PRIME_TARGET}%`,
    }),
    foot: 'Food cost moves with the menu and the market, labor with the schedule, so a month above the line is read back to one or the other on the location page.',
  });
}
primeCost.answer = ctx => {
  const { q } = ctx;
  const pc = q.kpi('primeCost'), fc = q.kpi('foodCost'), lc = q.kpi('laborCost'), ck = q.kpi('avgCheck');
  const worst = q.unitRows().slice().sort((a, b) => (b.f.prime || 0) - (a.f.prime || 0))[0];
  return `The group ran at <b>${F.pct(pc.value)}</b> prime cost, food <b>${F.pct(fc.value)}</b>
    and labor <b>${F.pct(lc.value)}</b>, on a <b>${F.exact(ck.value, 2)}</b> average check.
    <b>${esc(worst ? worst.name : '')}</b> is the heaviest at
    <b>${F.pct(worst ? worst.f.prime : 0)}</b> this month.`;
};

/* --- industrial: throughput */
function throughput(ctx) {
  const { q } = ctx;
  const rows = q.unitRows();
  const months = q.months.slice(-18);
  const lost = rows.reduce((a, r) => a + ((r.f.hoursAvl || 0) - (r.f.hoursRun || 0)), 0);
  return U.panel({
    col: 7, title: 'OEE by line',
    note: 'Availability times quality. The mark is the plant target of 80%.',
    body: C.hbars({
      rows: rows.map(r => ({
        name: r.short, value: r.f.oee || 0, mark: 80, note: r.plant,
        color: (r.f.oee || 0) < 62 ? 'var(--bad)' : ((r.f.oee || 0) < 75 ? 'var(--warn)' : 'var(--good)'),
      })).sort((a, b) => a.value - b.value),
      fmt: v => F.pct(v, 1), max: 100,
    }),
    foot: `<b>${F.num(lost, 0)}</b> machine hours were available and not run this month.`,
  }) + U.panel({
    col: 5, title: 'Scrap against cost per unit',
    note: 'Scrap and unit cost move together, which is the argument for fixing quality before buying capacity.',
    body: C.scatter({
      points: rows.map(r => ({
        name: r.name, x: r.f.produced ? r.f.scrap / r.f.produced * 100 : 0, y: r.f.cpu || 0,
      })),
      xFmt: v => F.pct(v, 1), yFmt: v => F.exact(v, 2),
      xLabel: 'Scrap rate', yLabel: 'Cost per unit', height: 300,
    }),
  }) + U.panel({
    col: 12, title: 'Units produced and scrapped',
    body: C.stack({
      rows: months.map(m => ({ good: q.factSum('produced', [m]) - q.factSum('scrap', [m]), scrap: q.factSum('scrap', [m]) })),
      keys: ['good', 'scrap'], names: { good: 'Good units', scrap: 'Scrap' },
      labels: months.map(mN), fmt: v => F.num(v), height: 240,
    }),
  });
}
throughput.answer = ctx => {
  const { q } = ctx;
  const o = q.kpi('oee'), sc = q.kpi('scrapRate');
  const worst = q.unitRows().slice().sort((a, b) => (a.f.oee || 0) - (b.f.oee || 0))[0];
  return `The lines ran at <b>${F.pct(o.value)}</b> effectiveness with
    <b>${F.pct(sc.value)}</b> scrap. <b>${esc(worst ? worst.name : '')}</b> is the constraint at
    <b>${F.pct(worst ? worst.f.oee : 0)}</b>, which is
    <b>${F.num(worst ? (worst.f.hoursAvl - worst.f.hoursRun) : 0, 0)}</b> hours lost in the month.`;
};

/* --- logistics: lanes and service */
function lanes(ctx) {
  const { q } = ctx;
  const rows = q.unitRows();
  const byLane = {};
  for (const r of rows) {
    const l = r.lane || 'Unassigned';
    byLane[l] ||= { miles: 0, rev: 0, loads: 0, cost: 0 };
    byLane[l].miles += r.f.miles || 0;
    byLane[l].rev += r.f.linehaul || 0;
    byLane[l].loads += r.f.loads || 0;
    byLane[l].cost += (r.f.fuel || 0) + (r.f.maint || 0);
  }
  const laneRows = Object.entries(byLane).map(([name, v]) => ({
    name, value: v.miles ? v.rev / v.miles : 0,
    note: `${F.num(v.loads)} loads`,
    color: (v.miles ? v.rev / v.miles : 0) < 2.1 ? 'var(--warn)' : 'var(--accent)',
  })).sort((a, b) => b.value - a.value);

  return U.panel({
    col: 6, title: 'Revenue per mile by lane',
    note: `A lane under ${F.exact(2.1, 2)} is not paying for itself once overhead is counted.`,
    body: C.hbars({ rows: laneRows, fmt: v => F.exact(v, 2) }),
  }) + U.panel({
    col: 6, title: 'Deadhead against revenue per mile',
    note: 'Empty miles are the cheapest margin available: they cost fuel and earn nothing.',
    body: C.scatter({
      points: rows.map(r => ({
        name: r.name, x: r.f.deadhead || 0, y: r.f.miles ? r.f.linehaul / r.f.miles : 0,
      })),
      xFmt: v => F.pct(v, 0), yFmt: v => F.exact(v, 2),
      xLabel: 'Deadhead', yLabel: 'Revenue per mile', height: 290,
    }),
  }) + U.panel({
    col: 12, title: 'Trucks ranked by what they keep',
    note: 'Revenue per mile less fuel and maintenance per mile. Before overhead.',
    body: C.hbars({
      rows: rows.map(r => ({
        name: r.short,
        value: r.f.miles ? (r.f.linehaul - r.f.fuel - r.f.maint) / r.f.miles : 0,
        note: `${F.num(r.f.miles)} mi`,
      })).sort((a, b) => a.value - b.value),
      fmt: v => F.exact(v, 2),
    }),
  });
}
lanes.answer = ctx => {
  const { q } = ctx;
  const rpm = q.kpi('revPerMile'), dh = q.kpi('deadhead'), ot = q.kpi('onTime');
  return `Every mile earned <b>${F.exact(rpm.value, 2)}</b>, with
    <b>${F.pct(dh.value)}</b> of miles run empty and
    <b>${F.pct(ot.value)}</b> of loads delivered on time.
    Taking deadhead down a single point is worth
    <b>${F.money(q.factSum('miles', q.window()) * 0.01 * rpm.value)}</b> over this window.`;
};

/* --- tech: retention */
function retention(ctx) {
  const { q } = ctx;
  const months = q.months.slice(-24);
  const rows = q.unitRows();
  return U.panel({
    col: 7, title: 'ARR movement',
    note: 'New against churned, month by month. The net is what the business actually gained.',
    body: C.stack({
      rows: months.map(m => ({ newArr: q.factSum('newArr', [m]), churn: q.factSum('churn', [m]) })),
      keys: ['newArr', 'churn'], names: { newArr: 'New ARR', churn: 'Churned ARR' },
      labels: months.map(mN), fmt: v => F.money(v), height: 250,
    }),
  }) + U.panel({
    col: 5, title: 'By product',
    note: 'ARR and the churn running against it.',
    body: C.hbars({
      rows: rows.map(r => ({
        name: r.short, value: r.f.arr || 0,
        note: F.pct(r.f.arr ? r.f.churn / r.f.arr * 100 : 0, 2) + ' churn',
      })).sort((a, b) => b.value - a.value),
      fmt: v => F.money(v),
    }),
  }) + U.panel({
    col: 12, title: 'ARR and seats',
    body: C.line({
      series: [
        { name: 'ARR', values: months.map(m => q.factSum('arr', [m])) },
      ],
      labels: months.map(mN), fmt: v => F.money(v), height: 230, legend: false,
    }),
    foot: `Seats stand at ${F.num(q.factAt('seats'))}, which is
      ${F.exact(q.factAt('seats') ? q.factAt('arr') / q.factAt('seats') : 0)} of ARR each.`,
  });
}
retention.answer = ctx => {
  const { q } = ctx;
  const nrr = q.kpi('nrr'), arr = q.kpi('arr'), cac = q.kpi('cacPayback');
  return `ARR of <b>${F.money(arr.value)}</b> at <b>${F.pct(nrr.value, 0)}</b> net retention.
    A customer pays back its acquisition cost in <b>${F.num(cac.value, 1)} months</b>.`;
};

/* ------------------------------------------------------------------ detail */

export function detail(ctx) {
  const { q, s, arg } = ctx;
  const ind = s.industry;
  const u = q.units.find(x => x.id === arg) || q.allUnits.find(x => x.id === arg);
  if (!u) {
    return U.pageHead({ eyebrow: 'Operations', title: 'Not in scope' }) +
      `<section class="panel"><div class="empty">That ${esc(ind.unit.one)} is not in this
      view level\u2019s scope. A unit-scoped role sees only its own.</div></section>`;
  }
  const month = q.view.month;
  const prevMonth = q.months[Math.max(0, q.months.indexOf(month) - 1)];
  const f = (q.uf[month] || {})[u.id] || {};
  const prev = (q.uf[prevMonth] || {})[u.id] || {};
  const months = q.months.slice(-18);
  const measures = ind.measures;
  const verdictText = unitVerdict(q, u, f, ind);
  const entity = (q.entities.find(e => e.id === u.entity) || {}).name || u.entity;

  const fmtOf = m => v => m.unit === 'usd' ? F.money(v)
    : m.unit === 'pct' ? F.pct(v, 1) : F.num(v);

  /* A way back, on the page itself as well as in the tab strip. A drill-down
     that can only be left by the browser's own back button reads as a place
     outside the product, which is exactly how Matt described it. */
  const backTo = ctx.detailFrom || 'ops-home';
  const backName = (s.pages().find(p => p.id === backTo) || {}).name || 'Operations';

  return `<nav class="backbar">
      <button class="btn sm ghost" data-act="go" data-arg="${esc(backTo)}">
        ${icon('arrow', 14)}Back to ${esc(backName)}</button>
      <span class="bb-where">${esc(ind.unit.one)} · ${esc(entity)}</span>
    </nav>` + U.verdict({
    title: verdictText.title,
    body: verdictText.body,
    figs: measures.slice(0, 4).map(m => ({
      label: m.name, value: fmtOf(m)(f[m.id]),
    })),
  }) + `<div class="grid">` +

    /* the chain that produces this unit's result, as a bridge */
    U.panel({
      col: 7, title: 'How it arrives',
      note: 'The arithmetic behind the headline, in the order it happens.',
      body: C.waterfall({ items: chain(u, f, ind), fmt: v => F.money(v), height: 260 }),
      foot: chainNote(u, f, ind),
    }) +

    U.panel({
      col: 5, title: 'This month against last', pad: false,
      note: `${esc(F.monthName(month, true))} beside ${esc(F.monthName(prevMonth, true))}.`,
      body: U.table({
        cols: [{ name: 'Measure' }, { name: 'Now', n: true }, { name: 'Last', n: true },
        { name: 'Change', n: true }],
        rows: measures.map(m => {
          const now = f[m.id], was = prev[m.id];
          const pc = Number.isFinite(now) && Number.isFinite(was) && was !== 0
            ? (now - was) / Math.abs(was) * 100 : NaN;
          return {
            cells: [esc(m.name), fmtOf(m)(now), fmtOf(m)(was), F.deltaTag(pc)],
          };
        }),
      }),
      foot: `${esc(u.status)} \u00b7 ${esc(u.owner)} \u00b7 booked to ${esc(entity)}`,
    }) +

    U.panel({
      col: 12, title: 'Eighteen months',
      note: 'Every measure this ' + esc(ind.unit.one) + ' carries, on its own scale.',
      body: C.multiples({
        rows: measures.map(m => ({
          name: m.name,
          fmt: fmtOf(m),                 /* each measure keeps its own units */
          values: months.map(mm => q.fact(u.id, m.id, mm) ?? null),
        })),
        fmt: v => F.num(v, 0), labels: months.map(mN), shared: false,
      }),
    }) +

    U.panel({
      col: 12, title: `Against the other ${esc(ind.unit.many)}`,
      note: 'This one is marked. A single figure means little without the spread it sits in.',
      body: C.hbars({
        rows: q.unitRows().map(r => ({
          name: r.short || r.name,
          value: r.f.rev || 0,
          color: r.id === u.id ? 'var(--accent)' : 'var(--rule)',
          note: r.id === u.id ? 'this one' : '',
        })).sort((a, b) => b.value - a.value),
        fmt: v => F.money(v),
      }),
      foot: (() => {
        const rows = q.unitRows().map(r => r.f.rev || 0).sort((a, b) => b - a);
        const mine = f.rev || 0;
        const rank = rows.indexOf(mine) + 1;
        return rank > 0
          ? `Ranked ${rank} of ${rows.length} by revenue this month.`
          : 'Not carrying revenue this month.';
      })(),
    }) + `</div>`;
}

/* The chain from the top line to what is left, per industry. Every step is a
   figure the page already shows elsewhere, so a reader can check it. */
function chain(u, f, ind) {
  switch (ind.id) {
    case 'construction': {
      const pct = (f.pct || 0) / 100;
      const cost = f.cost || 0;
      return [
        { name: 'Contract', value: f.contract || 0, total: true },
        { name: 'Not yet earned', value: -((f.contract || 0) - (f.earned || 0)) },
        { name: 'Earned', value: f.earned || 0, total: true },
        { name: 'Cost to date', value: -cost },
        { name: 'Margin so far', value: (f.earned || 0) - cost, total: true },
      ];
    }
    case 'education': {
      const rev = (f.enrolled || 0) * (f.funding || 0);
      const cost = (f.enrolled || 0) * (f.costPer || 0);
      return [
        { name: 'Seats', value: (f.capacity || 0) * (f.funding || 0), total: true },
        { name: 'Empty seats', value: -(((f.capacity || 0) - (f.enrolled || 0)) * (f.funding || 0)) },
        { name: 'Funding', value: rev, total: true },
        { name: 'Cost to run', value: -cost },
        { name: 'Left over', value: rev - cost, total: true },
      ];
    }
    case 'healthcare': {
      const rev = f.rev || 0;
      const allowed = (f.collect || 0) ? rev / (f.collect / 100) : rev;
      const clinical = rev * (1 - ind.model.gm);
      return [
        { name: 'Allowed by payers', value: allowed, total: true },
        { name: 'Not collected', value: -(allowed - rev) },
        { name: 'Collected', value: rev, total: true },
        { name: 'Clinical cost', value: -clinical },
        { name: 'Clinic margin', value: rev - clinical, total: true },
      ];
    }
    case 'retail': {
      const sales = f.sales || 0;
      const cogs = sales * (1 - (f.margin || 0) / 100);
      return [
        { name: 'Net sales', value: sales, total: true },
        { name: 'Cost of goods', value: -cogs },
        { name: 'Gross profit', value: sales - cogs, total: true },
      ];
    }
    case 'restaurants': {
      const sales = f.sales || 0;
      return [
        { name: 'Net sales', value: sales, total: true },
        { name: 'Food & beverage', value: -(f.foodUsd || 0) },
        { name: 'Labor', value: -(f.laborUsd || 0) },
        { name: 'After prime cost', value: sales - (f.foodUsd || 0) - (f.laborUsd || 0), total: true },
      ];
    }
    case 'industrial': {
      const made = (f.produced || 0) - (f.scrap || 0);
      const cpu = f.cpu || 0;
      return [
        { name: 'Produced', value: (f.produced || 0) * cpu, total: true },
        { name: 'Scrapped', value: -((f.scrap || 0) * cpu) },
        { name: 'Good output', value: made * cpu, total: true },
      ];
    }
    case 'logistics': {
      const rev = f.linehaul || 0;
      return [
        { name: 'Linehaul', value: rev, total: true },
        { name: 'Fuel', value: -(f.fuel || 0) },
        { name: 'Maintenance', value: -(f.maint || 0) },
        { name: 'Before overhead', value: rev - (f.fuel || 0) - (f.maint || 0), total: true },
      ];
    }
    default: {
      const arr = f.arr || 0;
      return [
        { name: 'ARR a year ago', value: arr - (f.newArr || 0) + (f.churn || 0), total: true },
        { name: 'New', value: f.newArr || 0 },
        { name: 'Churned', value: -(f.churn || 0) },
        { name: 'ARR now', value: arr, total: true },
      ];
    }
  }
}

function chainNote(u, f, ind) {
  switch (ind.id) {
    case 'construction':
      return `Cost is to date, not at completion, so the margin here is what the job has
        banked rather than what it will finish on.`;
    case 'education':
      return `An empty seat costs the same to keep as a full one, which is why the gap is
        drawn as money rather than as a count.`;
    case 'healthcare':
      return `Clinical cost is providers, staff and supplies at the group’s rate. Rent and
        the billing office sit in overhead, above this line.`;
    case 'retail':
      return `Before store payroll and occupancy, which sit in overhead rather than on the store.`;
    case 'restaurants':
      return `Prime cost only. Rent, utilities and the support office sit in overhead, above this line.`;
    case 'industrial':
      return `Scrap is priced at the same unit cost as good output, because it consumed it.`;
    case 'logistics':
      return `Fuel and maintenance only. Driver pay, insurance and overhead sit above this.`;
    default:
      return `Expansion is counted inside new ARR, a stated sample assumption rather than a
        reading from a billing system.`;
  }
}

function unitVerdict(q, u, f, ind) {
  const name = esc(u.name);
  switch (ind.id) {
    case 'construction': {
      const p = (f.pct || 0) / 100;
      const proj = p > 0.05 ? (f.cost || 0) / p : (f.estCost || 0);
      const v = proj - (f.estCost || 0);
      const ou = (f.billed || 0) - (f.earned || 0);
      return {
        title: `${name} is <b>${F.pct(f.pct, 0)}</b> complete and projected to finish
          <b>${F.money(Math.abs(v))}</b> ${v > 0 ? 'over' : 'under'} its estimate.`,
        body: `Of a <b>${F.money(f.contract)}</b> contract, <b>${F.money(f.earned)}</b> has been earned and
          <b>${F.money(f.billed)}</b> invoiced, so billing is
          ${ou >= 0 ? `<b>${F.money(ou)}</b> ahead of the work` : `<b>${F.money(-ou)}</b> behind it`}.`,
      };
    }
    case 'education':
      return {
        title: `${name} has <b>${F.num(f.enrolled)}</b> of <b>${F.num(f.capacity)}</b> seats filled.`,
        body: `Funding runs <b>${F.exact(f.funding)}</b> a student against
          <b>${F.exact(f.costPer)}</b> of cost, with
          <b>${F.num(f.staff, 1)}</b> staff, or one for every
          <b>${F.num(f.staff ? f.enrolled / f.staff : 0, 1)}</b> students.`,
      };
    case 'healthcare':
      return {
        title: `${name} saw <b>${F.num(f.visits)}</b> patients and collected
          <b>${F.pct(f.collect, 1)}</b> of what payers allowed.`,
        body: `<b>${F.exact(f.perVisit, 2)}</b> a visit across <b>${F.num(f.providers, 1)}</b>
          providers, with <b>${F.pct(f.noShow, 1)}</b> of bookings not showing and
          <b>${F.num(f.arDays, 0)}</b> days in A/R.`,
      };
    case 'retail':
      return {
        title: `${name} sold <b>${F.money(f.sales)}</b> at <b>${F.pct(f.margin)}</b> margin.`,
        body: f.sqft
          ? `That is <b>${F.exact(f.sales * 12 / f.sqft)}</b> per square foot annualised, from
             <b>${F.num(f.traffic)}</b> visitors converting at <b>${F.pct(f.conv, 1)}</b>.`
          : `Online, so there is no selling area to divide by.`,
      };
    case 'restaurants':
      return {
        title: `${name} sold <b>${F.money(f.sales)}</b> at <b>${F.pct(f.prime)}</b> prime cost.`,
        body: `<b>${F.num(f.covers)}</b> covers at an average check of <b>${F.exact(f.check, 2)}</b>,
          ${f.seats ? `turning each seat <b>${F.num(f.turns, 1)}</b> times a day, ` : ''}with
          <b>${F.exact(f.splh, 2)}</b> of sales for every labor hour.`,
      };
    case 'industrial':
      return {
        title: `${name} ran at <b>${F.pct(f.oee)}</b> and made each unit for <b>${F.exact(f.cpu, 2)}</b>.`,
        body: `<b>${F.num(f.produced)}</b> units produced, <b>${F.num(f.scrap)}</b> scrapped
          (<b>${F.pct(f.produced ? f.scrap / f.produced * 100 : 0, 1)}</b>), over
          <b>${F.num(f.hoursRun, 0)}</b> of <b>${F.num(f.hoursAvl, 0)}</b> available hours.`,
      };
    case 'logistics': {
      const rpm = f.miles ? f.linehaul / f.miles : 0;
      const cpm = f.miles ? (f.fuel + f.maint) / f.miles : 0;
      return {
        title: `${name} earned <b>${F.exact(rpm, 2)}</b> a mile and spent
          <b>${F.exact(cpm, 2)}</b> on fuel and maintenance.`,
        body: `<b>${F.num(f.loads)}</b> loads over <b>${F.num(f.miles)}</b> miles,
          <b>${F.pct(f.deadhead, 1)}</b> of them empty, <b>${F.pct(f.onTime, 1)}</b> delivered on time.`,
      };
    }
    default:
      return {
        title: `${name} carries <b>${F.money(f.arr)}</b> of ARR.`,
        body: `<b>${F.money(f.newArr)}</b> was added and <b>${F.money(f.churn)}</b> churned this month,
          across <b>${F.num(f.seats)}</b> paid seats at a <b>${F.exact(f.cac)}</b> cost to acquire.`,
      };
  }
}



/* ------------------------------------------------------------ the grid page

   Twelve months by unit, as a heatmap and as small multiples. This is the
   view that answers "which one, and since when", which a line chart with
   twenty series cannot. */

const GRID = {
  construction: { key: 'pct', name: 'Percent complete', fmt: v => F.pct(v, 0), good: 'high', isPct: true,
    says: 'how far through each contract is' },
  education: { key: 'enrolled', name: 'Students enrolled', fmt: v => F.num(v), good: 'high',
    says: 'how full each campus has been' },
  retail: { key: 'sales', name: 'Net sales', fmt: v => F.money(v), good: 'high',
    says: 'how each store has traded' },
  restaurants: { key: 'covers', name: 'Covers', fmt: v => F.num(v), good: 'high',
    says: 'how busy each location has been' },
  industrial: { key: 'oee', name: 'OEE', fmt: v => F.pct(v, 0), good: 'high', isPct: true,
    says: 'how effectively each line has run' },
  logistics: { key: 'onTime', name: 'On time', fmt: v => F.pct(v, 0), good: 'high', isPct: true,
    says: 'how each truck has served' },
  tech: { key: 'arr', name: 'ARR', fmt: v => F.money(v), good: 'high',
    says: 'how each product has grown' },
  healthcare: { key: 'visits', name: 'Patient visits', fmt: v => F.num(v), good: 'high',
    says: 'how busy each clinic has been' },
};

export function grid(ctx) {
  const { q, s } = ctx;
  const ind = s.industry;
  const g = GRID[ind.id] || GRID.construction;
  const months = q.months.slice(-12);
  const units = q.units;
  const name = (ind.pages && ind.pages['ops-grid'] && ind.pages['ops-grid'].name) || 'Performance grid';

  const rows = units.map(u => ({
    name: u.short || u.name,
    click: `unit:${u.id}`,
    values: months.map(m => q.fact(u.id, g.key, m)),
  })).filter(r => r.values.some(Number.isFinite));

  if (!rows.length) {
    return U.pageHead({ eyebrow: 'Operations', title: name, motif: motif(ind.id, s.data.brand.palette) }) +
      `<section class="panel"><div class="empty">No ${esc(ind.unit.many)} in scope carry
       ${esc(g.name.toLowerCase())} over these months.</div></section>`;
  }

  /* who moved, and by how much, over the window */
  const movers = rows.map(r => {
    const vals = r.values.filter(Number.isFinite);
    const from = vals[0], to = vals[vals.length - 1];
    return { name: r.name, from, to, change: to - from,
      /* ⛔ A percent change OF A PERCENTAGE is meaningless. A contract that
         went from 1% complete to 53% complete did not improve 5,194%, it
         advanced 52 points, and that 5,194% is most of why this page could not
         be understood. A measure that is itself a percentage moves in POINTS.
         Found by the gate's four-figure-percentage check, which was written
         for a different bug on another page and caught this one on its first
         run. */
      pct: g.isPct ? null : (from ? (to - from) / Math.abs(from) * 100 : NaN) };
  }).sort((a, b) => a.change - b.change);

  const worst = movers[0], best = movers[movers.length - 1];
  const lastCol = rows.map(r => r.values[r.values.length - 1]).filter(Number.isFinite);
  const spread = Math.max(...lastCol) - Math.min(...lastCol);

  return U.pageHead({
    eyebrow: 'Operations',
    title: name,
    motif: motif(ind.id, s.data.brand.palette),
    answer: `Twelve months of <b>${esc(g.name.toLowerCase())}</b>, ${esc(g.says)}.
      <b>${esc(best.name)}</b> improved most (${esc(g.fmt(best.from))} to <b>${esc(g.fmt(best.to))}</b>).
      ${worst.change < 0
      ? `<b>${esc(worst.name)}</b> moved the other way
         (${esc(g.fmt(worst.from))} to <b>${esc(g.fmt(worst.to))}</b>).`
      : `Nothing went backwards: the least movement was <b>${esc(worst.name)}</b>,
         which sat at <b>${esc(g.fmt(worst.to))}</b> throughout.`}
      The spread across ${esc(ind.unit.many)} this month is <b>${esc(g.fmt(spread))}</b>.`,
  }) + U.fresh(q, s) + `<div class="grid">` +
    U.panel({
      col: 12, title: `${esc(g.name)} by ${esc(ind.unit.one)}, month by month`,
      note: 'One cell per reading, darker for higher. Click a row to open it.',
      body: C.heatmap({
        rows, cols: months.map(m => F.monthName(m).split(' ')[0]),
        fmt: g.fmt, label: g.name.toLowerCase(), good: g.good,
      }),
      foot: `${rows.length} ${esc(ind.unit.many)} over ${months.length} months to
        ${esc(F.monthName(months[months.length - 1], true))},
        ${F.num(rows.length * months.length)} readings. Color says more or less, not better
        or worse: these measures carry no target.`,
    }) +
    U.panel({
      col: 7, title: `Each ${esc(ind.unit.one)} on one scale`,
      note: 'Every chart shares an axis, so the shapes can be compared rather than only read.',
      body: C.multiples({
        rows: rows.map(r => ({ ...r, note: '' })),
        fmt: g.fmt, labels: months.map(mN),
      }),
    }) +
    U.panel({
      col: 5, title: 'What moved', pad: false,
      note: `From ${esc(F.monthName(months[0], true))} to ${esc(F.monthName(months[months.length - 1], true))}.`,
      body: U.table({
        cols: [{ name: ind.unit.key }, { name: 'Then', n: true }, { name: 'Now', n: true },
        { name: g.isPct ? 'Change (points)' : 'Change', n: true }],
        rows: movers.slice().reverse().map(m => ({
          cells: [esc(m.name), g.fmt(m.from), g.fmt(m.to),
          g.isPct
            ? `<span class="delta ${Math.abs(m.change) < 0.05 ? 'flat'
              : (m.change > 0) === (g.good === 'high') ? 'up' : 'down'}">${
              Math.abs(m.change) < 0.05 ? '—'
                : `${m.change > 0 ? '↑' : '↓'} ${Math.abs(m.change).toFixed(0)}pt`}</span>`
            : F.deltaTag(m.pct, { invert: g.good !== 'high' })],
        })),
      }),
    }) + `</div>`;
}



/* =========================================================================
   Three more places in Operations. Each has a job: what needs attention,
   who is carrying it, and what the calendar does to it.
   ========================================================================= */

/* The rules each industry runs, said in words. A dashboard that flags things
   without saying what it flags on is asking to be trusted rather than read. */
const RULES = {
  construction: [
    'Projected cost at completion more than 5% over the estimate',
    'More than 4% of the contract earned and not yet invoiced',
  ],
  education: ['A campus under 70% of its seats, which is serious',
    'A campus under 85% of its seats'],
  retail: ['Margin more than 6 points under the company'],
  restaurants: ['Prime cost over 65% of sales', 'Food cost over 34% of sales'],
  industrial: ['OEE under 62%', 'Scrap over 4% of what was produced'],
  logistics: [
    'Fuel and maintenance over 42% of what the truck earns',
    'On time under 90%',
  ],
  tech: ['Monthly churn over 1.4% of the product’s ARR'],
  healthcare: ['Days in A/R over 50, or under 92% collected', 'No-shows over 9% of bookings'],
};

/* What needs you.

   Matt, 2026-11-02: *"what eneds you is fine i guess but still lacking somewhat
   of what a real webpage would be like. something that actually helps you with
   task management"*. A page that lists findings grouped by rule is a report. A
   page that helps you work has to answer, in order: what is the ONE thing to do
   now, who owns each of the rest, what is it worth, and what have I already
   dealt with.

   ⛔ The state lives in the viewer's own browser and the page SAYS SO. A static
   demo has nowhere else to put it, and quietly keeping a per-browser list while
   implying a shared one is the trap Core BI's db rule exists to prevent. A real
   deployment writes it where every viewer reads the same list. */
export function watch(ctx) {
  const { q, s } = ctx;
  const ind = s.industry;
  const rows = q.unitRows();
  const found = flags(q, rows, ind);
  const bad = found.filter(f => f.kind === 'bad');
  const warn = found.filter(f => f.kind === 'warn');
  const atStakeAll = found.reduce((a, f) => a + Math.max(0, f.value || 0), 0);

  /* Worst first, and worst means money where a rule carries money, severity
     where it does not. */
  const marks = ctx.tasks || {};
  const stateOf = f => marks[`${f.id}:${f.tag}`] || '';
  const RANK = { '': 0, snooze: 1, done: 2 };
  const queue = found.slice().sort((a, b) =>
    RANK[stateOf(a)] - RANK[stateOf(b)]
    || (b.kind === 'bad' ? 1 : 0) - (a.kind === 'bad' ? 1 : 0)
    || (b.value || 0) - (a.value || 0));
  const open = queue.filter(f => !stateOf(f));
  const first = open[0];

  const byOwner = {};
  for (const f of open) {
    const o = (byOwner[f.owner || 'Unassigned'] ||= { name: f.owner || 'Unassigned', n: 0, value: 0, bad: 0 });
    o.n += 1; o.value += Math.max(0, f.value || 0); o.bad += f.kind === 'bad' ? 1 : 0;
  }
  const owners = Object.values(byOwner).sort((a, b) => b.value - a.value);

  const taskRow = (f, n) => `
    <div class="tk${f.kind === 'bad' ? ' tk-bad' : ''}${stateOf(f) ? ` tk-${stateOf(f)}` : ''}">
      <span class="tk-n">${n}</span>
      <span class="tk-main">
        <b>${esc(f.name)}</b>
        <span class="tk-why">${f.why}</span>
        <span class="tk-meta">${U.statusTag(f.tag, f.kind)}
          <i>${esc(f.owner || 'Unassigned')}</i>
          ${f.value > 0 ? `<i class="tk-val">${F.money(f.value)} at stake</i>` : ''}</span>
      </span>
      <span class="tk-do">
        <button class="btn sm ghost" data-act="task" data-arg="done:${esc(f.id)}:${esc(f.tag)}">Done</button>
        <button class="btn sm ghost" data-act="task" data-arg="snooze:${esc(f.id)}:${esc(f.tag)}">Snooze</button>
        <button class="btn sm" data-click="unit:${esc(f.id)}">Open</button>
      </span>
    </div>`;

  return U.verdict({
    title: found.length
      ? `<b>${found.length}</b> of <b>${rows.length}</b> ${esc(ind.unit.many)} are outside their
         band, <b>${bad.length}</b> of them badly${atStakeAll > 0
        ? `, with <b>${F.money(atStakeAll)}</b> at stake` : ''}.`
      : `Every one of <b>${rows.length}</b> ${esc(ind.unit.many)} is inside its band this month.`,
    body: first
      ? `Start with <b>${esc(first.name)}</b>: ${endSentence(first.why)} Everything below it is
         ordered by what it costs, and each line can be opened, snoozed or marked done.`
      : found.length
        ? `Every line is marked done or snoozed. The rules are listed below, so a cleared list
           can be read rather than taken on trust.`
        : `The rules are listed below, so an empty list can be read rather than taken on trust.`,
    figs: [
      { label: 'Open', value: String(open.length) },
      { label: 'Serious', value: String(open.filter(f => f.kind === 'bad').length) },
      { label: 'At stake', value: (() => { const v = open.reduce((a, f) => a + Math.max(0, f.value || 0), 0); return v > 0 ? F.money(v) : '—'; })() },
      { label: 'Clear', value: String(rows.length - found.length) },
    ],
  }) + `<div class="grid">` +
    U.panel({
      col: 8, ico: 'check', title: 'Your list', pad: false,
      note: found.length
        ? `Worst first, by what it costs. Snoozed and finished lines drop to the bottom and
           stop counting against you.`
        : '',
      body: found.length
        ? `<div class="tasks">${queue.map((f, i) => taskRow(f, i + 1)).join('')}</div>`
        : `<div class="empty">Nothing is outside its band. The month is clean.</div>`,
      foot: found.length
        ? `Done and Snooze are remembered in this browser only, which is what a page with no
           server can honestly offer. A deployment writes them where everyone sees the same list.`
        : '',
    }) +
    U.panel({
      col: 4, ico: 'people', title: 'Who it lands on',
      note: 'Each person and what their open lines are worth.',
      body: owners.length
        ? `<div class="rows">${owners.map(o => `
          <div class="row-item">
            <span class="grow"><b>${esc(o.name)}</b>
              <div class="sub">${o.n} open${o.bad ? ` · ${o.bad} serious` : ''}</div></span>
            <span class="tk-val">${o.value > 0 ? F.money(o.value) : '—'}</span>
          </div>`).join('')}</div>`
        : `<div class="empty">Nobody has anything open.</div>`,
    }) +
    U.panel({
      col: 12, ico: 'list', title: 'The rules',
      note: `What this ${esc(ind.unit.one)} list is tested against. A company sets its own
        thresholds at deployment; these are the build’s, and the page says so rather than
        implying they are yours.`,
      body: `<ol class="steps">${(RULES[ind.id] || []).map(r =>
        `<li>${esc(r)}</li>`).join('')}</ol>`,
    }) + `</div>`;
}

export function people(ctx) {
  const { q, s } = ctx;
  const ind = s.industry;
  const w = q.window();
  const rows = q.unitRows();
  const found = flags(q, rows, ind);
  const flagged = new Set(found.map(f => f.id));
  const last = q.view.month;

  /* One scorecard per person, built from the same facts the unit pages read.
     Matt, 2026-11-02: *"project managers page is increbily bare of any useful
     information"*. Revenue alone does not judge anyone: a person carrying
     twice the work at half the margin is the finding, and so is a person whose
     billing has fallen behind the work they have already done. Both need cost
     and billing beside the revenue, which is what this adds. */
  const byOwner = {};
  for (const r of rows) {
    const o = (byOwner[r.owner] ||= {
      name: r.owner, units: 0, rev: 0, cost: 0, contract: 0,
      billed: 0, earned: 0, flags: 0, names: [], worst: null, pct: [],
    });
    o.units += 1;
    o.names.push(r.short || r.name);
    o.flags += flagged.has(r.id) ? 1 : 0;
    /* ⛔ `rev` is the month's revenue, but `cost`, `billed`, `earned` and
       `contract` are POSITIONS: the figure to date at that month. Summing a
       position across the window the way revenue is summed printed a house
       margin of −222% and a job 5,356% complete on the first draw. A position
       is read at the latest month and nowhere else, and the margin arithmetic
       here is the same `earned − cost` the drawer uses, so the two cannot
       disagree about the same person's work. */
    for (const m of w) o.rev += q.fact(r.id, 'rev', m) || 0;
    o.contract += q.fact(r.id, 'contract', last) || 0;
    o.billed += q.fact(r.id, 'billed', last) || 0;
    o.earned += q.fact(r.id, 'earned', last) || 0;
    o.cost += q.fact(r.id, 'cost', last) || 0;
    if (flagged.has(r.id) && !o.worst) o.worst = r.short || r.name;
  }
  const owners = Object.values(byOwner).map(o => ({
    ...o,
    gm: o.earned ? (o.earned - o.cost) / o.earned * 100 : null,
    position: o.billed - o.earned,
    /* Completion is earned against contract, weighted by the money, not an
       average of each job's own percentage: a $12M job half done and a $200K
       job finished do not average to three quarters complete. */
    complete: o.contract ? o.earned / o.contract * 100 : null,
  })).sort((a, b) => b.rev - a.rev);

  if (!owners.length) {
    return U.pageHead({ eyebrow: 'Operations', title: 'Who carries what' }) +
      `<section class="panel"><div class="empty">Nothing is assigned in this scope.</div></section>`;
  }

  const name = (ind.pages && ind.pages['ops-people'] && ind.pages['ops-people'].name) || 'Who carries what';
  const totalRev = owners.reduce((a, o) => a + o.rev, 0);
  const totalEarned = owners.reduce((a, o) => a + o.earned, 0);
  const totalCost = owners.reduce((a, o) => a + o.cost, 0);
  const houseGm = totalEarned ? (totalEarned - totalCost) / totalEarned * 100 : 0;
  const avg = totalRev / owners.length;
  const most = owners[0], least = owners[owners.length - 1];
  const withGm = owners.filter(o => Number.isFinite(o.gm));
  const weakest = withGm.length ? withGm.slice().sort((a, b) => a.gm - b.gm)[0] : null;
  const behind = owners.filter(o => o.position < 0);
  const unit1 = esc(ind.unit.one), unitN = esc(ind.unit.many);

  return U.pageHead({
    eyebrow: 'Operations',
    title: name,
    motif: motif(ind.id, s.data.brand.palette),
    answer: `<b>${owners.length}</b> people carry <b>${rows.length}</b> ${unitN} and
      <b>${F.money(totalRev)}</b> between them, at <b>${F.pct(houseGm)}</b> margin.
      <b>${esc(most.name)}</b> carries the most at <b>${F.money(most.rev)}</b>, which is
      <b>${F.ratio(least.rev ? most.rev / least.rev : 0)}</b> what ${esc(least.name)} carries.
      ${weakest && weakest.gm < houseGm - 2
      ? `<b>${esc(weakest.name)}</b> is the one to look at: <b>${F.pct(weakest.gm)}</b> margin against the house's <b>${F.pct(houseGm)}</b>.`
      : `Margin is within two points of the house across everyone.`}`,
  }) + U.fresh(q, s) + `<div class="grid">` +

    U.panel({
      col: 12, ico: 'people', title: 'The scorecard', pad: false,
      note: `Each person's work over the window, then where their ${unitN} stand today. Billing position is what has been billed less what the work has earned, so a negative figure is work done and not yet invoiced.`,
      body: `<div class="sc">${owners.map(o => {
        const gmGap = Number.isFinite(o.gm) ? o.gm - houseGm : null;
        return `<article class="sc-card${o.flags ? ' has-flag' : ''}">
          <header>
            <span class="sc-who">${esc(o.name)}</span>
            <span class="sc-n">${o.units} ${o.units === 1 ? unit1 : unitN}</span>
          </header>
          <div class="sc-figs">
            <span><i>Revenue</i><b>${F.money(o.rev)}</b>
              <u>${o.rev >= avg ? 'above' : 'below'} the ${F.money(avg)} average</u></span>
            <span><i>Margin</i><b>${Number.isFinite(o.gm) ? F.pct(o.gm) : '—'}</b>
              <u>${gmGap === null ? '' : `<span class="delta ${gmGap >= 0 ? 'up' : 'down'}">${gmGap >= 0 ? '+' : ''}${gmGap.toFixed(1)}pt</span> on the house`}</u></span>
            <span><i>Billing position</i><b class="${o.position < 0 ? 'neg' : ''}">${F.money(o.position)}</b>
              <u>${o.position < 0 ? 'behind the work' : 'ahead of the work'}</u></span>
            <span><i>Complete</i><b>${o.complete === null ? '—' : F.pct(o.complete, 0)}</b>
              <u>${F.money(o.earned)} of ${F.money(o.contract)} earned</u></span>
          </div>
          <footer>
            <span class="sc-names">${esc(o.names.slice(0, 3).join(', '))}${o.names.length > 3 ? ` and ${o.names.length - 3} more` : ''}</span>
            ${o.flags ? `<span class="tag warn"><i class="dot"></i>${o.flags} flagged${o.worst ? `, ${esc(o.worst)} first` : ''}</span>`
            : `<span class="tag good"><i class="dot"></i>nothing flagged</span>`}
          </footer>
        </article>`;
      }).join('')}</div>`,
      foot: `${behind.length} of ${owners.length} are billing behind the work they have done, for ${F.money(Math.abs(behind.reduce((a, o) => a + o.position, 0)))} in all.`,
    }) +

    U.panel({
      col: 7, ico: 'bars', title: 'Load against margin',
      note: 'Across is what they carry, up is the margin it earns. The line is the house margin, so anyone below it is carrying work that pays less than the company average.',
      body: C.scatter({
        points: withGm.map(o => ({ x: o.rev, y: o.gm, name: o.name })),
        xFmt: v => F.money(v), yFmt: v => F.pct(v, 0),
        xLabel: 'Revenue over the window', yLabel: 'Margin',
        rule: houseGm, ruleLabel: `house ${houseGm.toFixed(1)}%`, height: 280,
      }),
      foot: `House margin is ${F.pct(houseGm)}.`,
    }) +

    U.panel({
      col: 5, ico: 'list', title: 'Load',
      note: 'The mark is the average, so a bar short of it is carrying less than its share.',
      body: C.hbars({
        rows: owners.map(o => ({
          name: o.name, value: o.rev, mark: avg,
          note: `${o.units} ${o.units === 1 ? ind.unit.one : ind.unit.many}`,
          color: o.flags ? 'var(--warn)' : 'var(--accent)',
        })),
        fmt: v => F.money(v), stacked: true,
      }),
      foot: `Amber marks someone with at least one flagged ${unit1}.`,
    }) + `</div>`;
}

/* --------------------------------------------------------------- the year */

export function season(ctx) {
  const { q, s } = ctx;
  const ind = s.industry;
  const months = q.months;
  const key = { construction: 'rev', education: 'enrolled', retail: 'sales', restaurants: 'covers',
    industrial: 'produced', logistics: 'miles', tech: 'arr', healthcare: 'visits' }[ind.id] || 'rev';
  const label = { construction: 'Earned revenue', education: 'Students enrolled',
    retail: 'Net sales', restaurants: 'Covers', industrial: 'Units produced', logistics: 'Miles',
    tech: 'ARR', healthcare: 'Patient visits' }[ind.id] || 'Revenue';
  const money = ['rev', 'sales', 'arr'].includes(key);
  const fmt = v => money ? F.money(v) : F.num(v, 0);

  const years = [...new Set(months.map(m => m.slice(0, 4)))].sort();
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const rows = years.map(y => ({
    name: y,
    values: MON.map((_, i) => {
      const m = `${y}-${String(i + 1).padStart(2, '0')}`;
      return months.includes(m) ? q.factSum(key, [m]) : null;
    }),
  }));

  /* the calendar's own shape: each month against the average month */
  const index = MON.map((_, i) => {
    const vals = rows.map(r => r.values[i]).filter(Number.isFinite);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });
  const mean = index.filter(Number.isFinite).reduce((a, b) => a + b, 0)
    / index.filter(Number.isFinite).length;
  const shape = index.map(v => Number.isFinite(v) ? (v / mean - 1) * 100 : null);
  const peak = MON[shape.indexOf(Math.max(...shape.filter(Number.isFinite)))];
  const trough = MON[shape.indexOf(Math.min(...shape.filter(Number.isFinite)))];
  const swing = Math.max(...shape.filter(Number.isFinite)) - Math.min(...shape.filter(Number.isFinite));

  return U.pageHead({
    eyebrow: 'Operations',
    title: 'Pattern by month',
    motif: motif(ind.id, s.data.brand.palette),
    answer: `<b>${esc(label)}</b> peaks in <b>${esc(peak)}</b> and bottoms in
      <b>${esc(trough)}</b>, a swing of <b>${F.pct(swing, 0)}</b> between them.
      ${swing > 30
        ? 'A business this seasonal cannot be read month on month: the calendar moves it more than the work does.'
        : 'The calendar moves this business less than the work does, so a month-on-month read is fair.'}`,
  }) + U.fresh(q, s) + `<div class="grid">` +
    U.panel({
      col: 12, title: `${esc(label)} by calendar month`,
      note: 'One row per year. Reading down a column shows the same month in different years.',
      body: C.heatmap({
        rows, cols: MON, fmt, label: label.toLowerCase(), rowWidth: 70,
      }),
      foot: `A gap is a month the extract does not reach, not a month of nothing.`,
    }) +
    U.panel({
      col: 12, title: 'The shape of the year',
      note: 'Each calendar month against the average month, averaged over every year in the extract.',
      body: C.bars({
        values: shape.map(v => Number.isFinite(v) ? v : 0), labels: MON,
        fmt: v => F.pct(v, 0), height: 230,
        /* A quiet month is the calendar, not a failure. Red here would say
           February went wrong, and February goes like this every year. */
        color: 'var(--accent)', negColor: 'var(--accent-lift)',
      /* ⛔ THE KEY BELOW SHOWS THE COLOURS THIS CHART ACTUALLY DRAWS.

         It used to borrow the heatmap's `hm-ramp`, which is one colour at
         varying opacity, for a chart that uses TWO colours at full opacity: the
         swatch said a faded accent and the bars said `--accent-lift`. A reader
         matching the legend to a bar found neither. The second swatch now names
         its own colour instead of inheriting a ramp's.

         ⚠️ And this note lives OUT here for two reasons. A JSX-style brace
         comment inside the template literal below would render as text on the
         page. And writing one INTO this comment to say so closed the comment
         early at its own delimiter, which made the rest of the sentence into
         code: the build and `node --check` both passed and the app did not
         boot. A comment cannot quote the mark that ends it. */
      }) + `<div class="hm-key">
        <div class="hm-ramp">
          <i style="opacity:1"></i><span>above an average month</span>
          <i style="background:var(--accent-lift);opacity:1;margin-left:14px"></i><span>below it</span>
        </div>
        <p>Every bar is one calendar month measured against the AVERAGE month of
          this extract, so the baseline is not zero ${esc(label.toLowerCase())}, it is a
          normal month. ${esc(peak)} runs <b>${F.pct(Math.max(...shape.filter(Number.isFinite)), 0)}</b>
          richer than normal and ${esc(trough)} runs
          <b>${F.pct(Math.abs(Math.min(...shape.filter(Number.isFinite))), 0)}</b> leaner.
          A bar below the line is the calendar, not a month that went wrong.</p>
      </div>`,
      foot: `This is why a pace read as a share of the year gone can mislead: by
        ${esc(peak)} a seasonal business is further through its year than the calendar says.`,
    }) + `</div>`;
}

export const opsPages = {
  'ops-home': home, 'ops-watch': watch, 'ops-units': units, 'ops-grid': grid,
  'ops-season': season, 'ops-people': people, 'ops-second': second, 'ops-detail': detail,
};
