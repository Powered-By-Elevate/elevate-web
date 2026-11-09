/* Start here, and the three lighter modules. Start here is the page a buyer
   lands on, so it carries the industry switch, the figures that matter today,
   and a door to each place. */

import * as F from '../fmt.js?v=cfc9ac23e4';
import * as C from '../chart.js?v=cfc9ac23e4';
import * as U from '../ui.js?v=cfc9ac23e4';
import { esc, icon, brandMark, connTile, INDUSTRY_ICON } from '../icons.js?v=cfc9ac23e4';
import { scene, motif } from '../scenes.js?v=cfc9ac23e4';

/* ⛔ TRUNCATE WHERE THE INFORMATION IS NOT.

   A filing is named `<place> - <date> <type>`, and the row cut the END of the
   string, which is the type: "Summerton Middle School - 2026-10-22 Executed
   agreem\u2026". The publishing session measured it showing 196px of a needed
   371px at 1024 wide, so nearly half went, and what went was the only part
   that tells one filing from the next. Place and date survived, and those are
   the parts a reader can already see from the folder they are standing in.

   Protecting the tail alone was not enough: measured again, construction's
   longer types ("Request for information") still lost at 1024, because place
   AND date AND type genuinely do not fit a 300px column and something has to
   go. The date is what goes. The list is newest first and says so in its foot,
   so it is already ordered by date, and the date is the one fact a reader can
   infer from position. It moves to the meta line, which is its own row at 11px
   and has the room.

   So the name line carries the two identifying facts, place and type, with the
   type protected and the place taking the ellipsis. Nothing on that line
   competes with anything else, which is why it holds at every width rather
   than at the widths someone checked. A name that does not match the pattern
   is left whole and behaves as before. */
function filedName(raw) {
  const name = String(raw).replace(/\.[a-z0-9]+$/i, '');
  const m = name.match(/^(.*?)\s*-\s*(\d{4}-\d{2}-\d{2})\s+(.+)$/);
  if (!m) return { line: `<span class="jf-h">${esc(name)}</span>`, when: '' };
  /* ⛔ THE SEPARATOR IS IN THE TEXT, NOT ONLY IN THE PAINT.

     It began as a `::before` on the tail, which paints a bullet but puts
     nothing in `textContent`, so the row read `Elmgrove Civic CenterRequest
     for information` to anything that takes the text rather than the pixels:
     a copy, a screen reader, a find-in-page. The old single-line name had a
     literal separator and this had quietly dropped it. */
  return {
    line: `<span class="jf-h">${esc(m[1])}</span>`
      + `<span class="jf-sep"> \u00b7 </span>`
      + `<span class="jf-t">${esc(m[3])}</span>`,
    when: m[2],
  };
}

export function start(ctx) {
  const { q, s, cfg } = ctx;
  const ind = s.industry;
  const role = s.role;
  const w = q.window();
  const rev = q.revenue(w);
  const kpis = ctx.strip || ind.kpis.slice(0, 5);
  const last12 = q.months.slice(-12);
  const revSeries = q.unitScoped
    ? last12.map(m => q.factSum('rev', [m]))
    : q.series('rev', last12);
  const prior = q.months.length >= 24
    ? q.revenue(q.months.slice(-24, -12)) : null;
  const budRaw = q.unitScoped ? null : q.series('rev', last12, q.scopeEntities, 'bud');
  const budSeries = budRaw && budRaw.some(v => Number.isFinite(v) && v) ? budRaw : null;
  const bRev = budSeries ? budSeries.reduce((a, v) => a + (v || 0), 0) : null;

  /* one door per module first, then fill from what is left: a map of the whole
     product reads better here than the first six pages of one module */
  const offered = s.pages().filter(p => !['home', 'settings'].includes(p.id));
  const firstOfModule = [];
  const seenModule = new Set();
  for (const p of offered) {
    if (seenModule.has(p.module)) continue;
    seenModule.add(p.module);
    firstOfModule.push(p);
  }
  const doors = firstOfModule
    .concat(offered.filter(p => !firstOfModule.includes(p)))
    .slice(0, 6)
    .map(p => `<button class="door" data-act="go" data-arg="${esc(p.id)}">
      <span class="door-ico">${icon(p.icon || 'grid', 17)}</span>
      <b>${esc(p.name)}</b>
      <span>${esc(doorWhy(p.id, ind))}</span>
    </button>`).join('');

  const connected = Object.keys(s.data.connectors).map(id => s.connector(id)).filter(Boolean);
  const live = connected.filter(c => c.status === 'live');

  return `<section class="cover">
    <div class="cover-scene">${scene(ind.id, s.data.brand.palette, { height: 340 })}</div>
    <div class="cover-greet">${esc(greeting())} · ${esc(role.name)} view</div>
    <h1>${esc((ind.headline.says || '{v}')
      .replace('{v}', U.display(q.kpi(ind.headline.metric))))}</h1>
    <p>${esc(s.data.company)} at ${esc(F.monthName(q.view.month, true))}.
      ${!q.closed ? 'No month is signed off yet, so every figure is tentative.' : q.view.month > q.closed
        ? 'This month is still tentative: the ledger is closed through ' + esc(F.monthName(q.closed, true)) + '.'
        : 'Signed off through ' + esc(F.monthName(q.closed, true)) + '.'}</p>
  </section>` +
    U.strip(kpis.map((id, slot) => {
      const k = q.kpi(id);
      /* every option carries its own live value, so hovering one shows the
         real figure in place rather than a name to be checked afterwards */
      const options = q.kpiIds().map(oid => {
        const ok = q.kpi(oid);
        return { id: oid, label: ok.label, value: U.display(ok), note: ok.note || '' };
      });
      return {
        id, slot, options,
        label: k.label, value: U.display(k), note: k.note ? esc(k.note) : '',
      };
    })) +
    `<div class="grid">` +
    U.panel({
      col: 12, title: 'Where to go', ico: 'compass',
      note: `${F.countWord(Math.min(6, offered.length), true)} places, cut to what the ${esc(role.name.toLowerCase())} level may see.`,
      body: `<div class="doors">${doors}</div>`,
    }) +
    /* ⚖️ Matt, 2026-11-02: *"the revenue section looks out of place like a
       small puzzle piece in a big empty space"*. It was a 230px chart in a
       seven-column panel with nothing beside it, so the panel was mostly air.
       The year now takes the FULL width and says something: the shape of the
       twelve months, the plan over it where one is loaded, and a sentence that
       reads the result. A chart with a verdict fills a panel. A chart alone
       never does, at any width. */
    U.panel({
      col: 12, title: `The year so far`, ico: 'clock',
      note: `${F.monthsWord(last12.length, true)} to ${esc(F.monthName(q.view.month, true))}.${
        budSeries ? ' The bars are what happened, the line is the plan.' : ''}`,
      right: U.btn('Open the dashboard', { act: 'go', arg: 'fin-dash', sm: true, ico: 'arrow' }),
      body: `<p class="lede">${yearRead(q, rev, prior, bRev, last12.length)}</p>` + C.bars({
        values: revSeries, labels: last12.map(m => F.monthName(m)),
        overlay: budSeries, overlayName: 'Plan', fmt: v => F.money(v), height: 300,
      }),
    }) +
    (s.tenant ? '' : U.panel({
      col: 7, title: 'The same build, another industry', ico: 'grid',
      note: 'One codebase. The company, the brand, the unit of work, the measures and the connected software all move together.',
      right: U.btn(`See all ${F.countWord(cfg.industries.industries.length)}`, { act: 'chooser', kind: 'primary', ico: 'grid', sm: true }),
      body: `<div class="ind-strip">${cfg.industries.industries.map(i => {
        const b = cfg.brands.brands[i.brand];
        const on = i.id === s.data.industry;
        return `<button class="ind-chip" data-act="industry" data-arg="${esc(i.id)}"
          aria-current="${on}" style="--c:${b.palette.accent}">
          <span class="m">${brandMark(b, 22)}</span>
          <span><b>${esc(i.short)}</b><span>${esc(i.unit.collection)}</span></span>
        </button>`;
      }).join('')}</div>`,
    })) +
    /* ⚖️ Same day: *"i appreciate the connections section but ... it looks like
       clutter"*. It was a list of rows with a status tag each, which reads as
       a monitoring panel and is not one: this is the catalog of what the
       build is wired to, and the detail belongs in Settings. Here it is a wall
       of marks and one sentence, which says the same thing in a glance. */
    U.panel({
      col: s.tenant ? 12 : 5, title: 'Live connections', ico: 'link',
      note: 'What every figure on every page is read from.',
      right: U.btn('Manage', { act: 'go', arg: 'settings', sm: true }),
      body: connected.length ? `<div class="conn-wall">${connected.map(c => `
        <span class="conn-chip ${c.status}" title="${esc(c.name)} · ${esc(statusWord(c.status))}">
          ${connTile(c)}<b>${esc(c.name)}</b></span>`).join('')}</div>`
        : `<div class="empty">Nothing is connected yet. Settings &rsaquo; Integrations.</div>`,
      foot: s.tenant ? (connected.length ? 'Read only. Nothing here writes back to these systems.' : '')
        : connected.length
        ? `<b>${live.length} of ${connected.length}</b> have been run against a real company’s
           data in production. The rest are adapters built or cataloged, and the page says
           which on every figure that depends on one.`
        : '',
    }) + `</div>`;
}

/* One sentence that reads the twelve months, so the band has a verdict rather
   than only a picture. Never invents a comparison it does not have. */
function yearRead(q, rev, prior, bRev, n = 12) {
  const bits = [`<b>${F.money(rev)}</b> of revenue over the ${F.monthsWord(n)}`];
  if (Number.isFinite(prior) && prior > 0) {
    const d = (rev - prior) / prior * 100;
    bits.push(`${Math.abs(d) < 0.5 ? 'level with' : (d > 0 ? 'up' : 'down')}
      ${Math.abs(d) < 0.5 ? '' : `<b>${F.pct(Math.abs(d), 1)}</b>`} on the twelve before`);
  }
  if (Number.isFinite(bRev) && bRev > 0) {
    bits.push(`${rev >= bRev ? 'ahead of' : 'behind'} plan by <b>${F.money(Math.abs(rev - bRev))}</b>`);
  }
  return bits.join(', ') + '.';
}

function doorWhy(id, ind) {
  return {
    'fin-dash': 'The one page a chief executive opens',
    'fin-pl': 'The statement, line by line, against last year',
    'fin-margin': 'Which work is carrying the company and which is diluting it',
    'fin-budget': 'The plan against what happened, over the months the plan covers',
    'fin-cash': 'Cash, what customers owe, and what is owed out',
    'fin-balance': 'The position as of the month',
    'fin-statements': 'The packs, generated from the same facts',
    'fin-close': 'What is signed off and what is waiting',
    'ops-home': `How the ${ind.unit.many} are running`,
    'ops-units': `Every ${ind.unit.one}, with the money on it`,
    'ops-second': 'The operational read behind the revenue',
    'people-home': 'Headcount, labor cost and turnover',
    'pipeline-home': 'What is coming, and what it is worth weighted',
    'docs-home': 'The paperwork behind the figures',
  }[id] || '';
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function statusWord(status) {
  return { live: 'Live', built: 'Adapter built', cataloged: 'Available' }[status] || status;
}

/* ------------------------------------------------------------------ people */

export function people(ctx) {
  const { q, s } = ctx;
  const p = q.data.people;
  const w = q.window();
  const rev = q.sum('rev', w) || 1;
  /* Payroll has TWO homes. The overhead line is only the people who are not
     doing the work; the rest sits inside cost of revenue. Reading the overhead
     line alone put "payroll at 4.6% of revenue" on a page whose own department
     table added to five times that, which is exactly the kind of disagreement
     the Core BI formula audit existed to find. So the headline is the ALL-IN
     figure and the page says where each half lives. */
  const pay = p.payroll || { allIn: 0, direct: 0, overhead: 0 };
  const annualRev = q.sum('rev', q.months.slice(-12)) || 1;
  const hist = p.history || [];
  const roles = p.roles || [];
  const last12 = hist.slice(-12);

  /* Whether the team is growing with the work or ahead of it. Both sides are
     put on the same base so the comparison is a real one: revenue per head
     this year against revenue per head a year ago. */
  const yearly = rev * (12 / Math.max(1, w.length));
  const perHead = yearly / p.headcount;
  const headAgo = (hist[hist.length - 13] || hist[0] || {}).head || p.headcount;
  const headDelta = p.headcount - headAgo;
  const joined12 = last12.reduce((a, m) => a + m.joined, 0);
  const left12 = last12.reduce((a, m) => a + m.left, 0);

  /* What the empty seats cost. A count of open roles says nothing about
     whether that is a week of recruiting or a structural hole, so the page
     carries the money and the oldest vacancy beside the count. */
  const vacancyCost = roles.reduce((a, r) => a + r.cost * (r.days / 365), 0);
  const oldest = roles[0];

  const worstDept = p.departments.slice()
    .sort((a, b) => b.turnover - a.turnover)[0];

  return U.pageHead({
    eyebrow: 'People',
    title: 'People & labor',
    answer: `<b>${F.num(p.headcount)}</b> people carry <b>${F.money(yearly)}</b> of annual revenue,
      or <b>${F.money(perHead)}</b> each. All-in payroll runs at
      <b>${F.pct(pay.allIn / annualRev * 100)}</b> of revenue, turnover at <b>${F.pct(p.turnover)}</b>,
      and <b>${F.num(roles.length)}</b> seats are open
      ${oldest ? `with the oldest unfilled for <b>${oldest.days}</b> days` : ''}.`,
  }) + U.fresh(q, s) + U.strip([
    {
      label: 'Headcount', value: F.num(p.headcount),
      note: headDelta === 0 ? 'flat on last year'
        : `<span class="delta ${headDelta > 0 ? 'up' : 'down'}">${headDelta > 0 ? '↑' : '↓'} ${Math.abs(headDelta)}</span> on last year`,
    },
    { label: 'Revenue per head', value: F.money(perHead), note: 'a year' },
    {
      label: 'Payroll of revenue', value: F.pct(pay.allIn / annualRev * 100),
      note: `${F.money(pay.allIn)} all in`,
    },
    { label: 'Turnover', value: F.pct(p.turnover), note: `${left12} left, ${joined12} joined` },
    { label: 'Open seats', value: F.num(roles.length), note: `${F.money(vacancyCost)} of vacancy so far` },
  ]) + `<div class="grid">` +

    U.panel({
      col: 7, ico: 'people', title: 'The team, month by month',
      note: 'Headcount as the line. The bars below the axis are people who joined and people who left, so a flat line made of churn does not read as stability.',
      body: C.line({
        series: [{ name: 'Headcount', values: last12.map(m => m.head) }],
        labels: last12.map(m => F.monthName(m.m)), fmt: v => F.num(v), height: 170,
        rule: (() => { const v = last12.map(m => m.head).filter(Number.isFinite);
          return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; })(),
        ruleLabel: 'average over the year',
        /* ⛔ Headcount is never zero-based. A team of 148 that lost 11 people
           drew as a perfectly flat line against an axis starting at zero, which
           is the opposite of what happened. A count that never approaches zero
           is read by its change, so the axis starts where the data does. */
        zeroBase: false, legend: false,
      }) + C.churn({
        labels: last12.map(m => F.monthName(m.m, true)),
        up: last12.map(m => m.joined), down: last12.map(m => m.left),
      }) + `<div class="ch-key"><span><i class="sw in"></i>Joined</span><span><i class="sw out"></i>Left</span></div>`,
      foot: `${joined12} joined and ${left12} left over the twelve months, on a team of ${F.num(p.headcount)}.`,
    }) +

    U.panel({
      col: 5, ico: 'bars', title: 'Where the cost sits',
      note: 'Each department by its all-in annual payroll. The five add to the whole company payroll, direct and overhead together.',
      pad: false,
      body: U.table({
        cols: [{ name: 'Department' }, { name: 'People', n: true },
        { name: 'Payroll', n: true }, { name: 'Turnover', n: true }],
        rows: p.departments.slice().sort((a, b) => b.cost - a.cost).map(d => ({
          cells: [`<b>${esc(d.name)}</b>${d.open ? `<div class="sub">${d.open} open</div>` : ''}`,
            F.num(d.fte), F.money(d.cost),
          `<span class="${d.turnover > p.turnover * 1.25 ? 'delta down' : d.turnover < p.turnover * 0.75 ? 'delta up' : 'delta flat'}">${F.pct(d.turnover, 0)}</span>`],
        })),
      }),
      foot: `${F.money(pay.allIn)} all in, of which ${F.money(pay.direct)} sits inside the cost
        of the work and ${F.money(pay.overhead)} in overhead.${worstDept
        ? ` ${esc(worstDept.name)} is losing people fastest, at ${F.pct(worstDept.turnover, 0)} a year.` : ''}`,
    }) +

    U.panel({
      col: 12, ico: 'pulse', title: 'Payroll against revenue',
      note: 'The question is whether labor grows with the work or ahead of it. Both lines are money on the same scale, so the gap between them is the margin the work leaves.',
      body: C.line({
        series: [
          { name: 'Revenue', values: q.series('rev', q.months.slice(-18)) },
          { name: 'Payroll & benefits', values: q.series('labor', q.months.slice(-18)) },
        ],
        labels: q.months.slice(-18).map(m => F.monthName(m)), fmt: v => F.money(v), height: 230,
      }),
    }) +

    /* ⛔ A TABLE, FULL WIDTH, not a stacked list in a narrow column.

       Every open seat carries four facts (the role, its department, how long
       it has been open and what the vacancy has cost), and four facts stacked
       in a five-column panel ran to 859px beside a 302px chart on five of six
       industries. Four facts across is a table, which is both shorter and the
       shape a reader can sort by eye. */
    U.panel({
      col: 12, ico: 'clock', title: 'Open seats', pad: false,
      note: 'What is unfilled, how long it has been unfilled, and what the empty seat has cost so far.',
      body: roles.length ? U.table({
        cols: [{ name: 'Role', w: '34%' }, { name: 'Department' },
        { name: 'Open', n: true }, { name: 'Cost a year', n: true }, { name: 'Cost so far', n: true }],
        rows: roles.map(r => ({
          cells: [`<b>${esc(r.title)}</b>`, esc(r.dept),
          `<span class="agepill ${r.days > 120 ? 'bad' : r.days > 60 ? 'warn' : ''}">${r.days}d</span>`,
          F.money(r.cost), F.money(r.cost * (r.days / 365))],
        })),
      }) : `<div class="empty">Nothing open.</div>`,
      foot: `${F.money(vacancyCost)} of salary unspent, which is work not being done rather than money saved.`,
    }) +

    U.panel({
      col: 12, title: 'Where this comes from',
      body: connectorNote(s, 'people', 'Headcount and labor cost arrive from the payroll system. Until one is connected these figures are the sample set.'),
    }) + `</div>`;
}

/* ---------------------------------------------------------------- pipeline */

export function pipeline(ctx) {
  const { q, s } = ctx;
  const p = q.data.pipeline;
  const total = p.rows.reduce((a, r) => a + r.value, 0);
  const weighted = p.rows.reduce((a, r) => a + r.weighted, 0);
  const target = p.target || 0;

  /* The one question a pipeline page has to answer. Coverage is weighted
     pipeline against what is left of the plan, and the convention every sales
     organisation uses is that under 3x is thin. The page states the rule it is
     judging by rather than colouring a number and leaving the reader to
     guess. */
  const w = q.window();
  const booked = q.sum('rev', w);
  const gap = Math.max(0, target - booked);
  const coverage = gap > 0 ? total / gap : null;
  const thin = coverage !== null && coverage < 3;

  const closed = p.closed || [];
  const won = closed.filter(c => c.won);
  const winRate = closed.length ? won.length / closed.length * 100 : null;

  /* Stage counts and values, in the funnel's own order so the drop-off between
     one stage and the next is the thing you see first. */
  const byStage = p.stages.map(st => {
    const mine = p.rows.filter(r => r.stage === st);
    return {
      name: st,
      n: mine.length,
      value: mine.reduce((a, r) => a + r.value, 0),
      weight: (mine[0] && mine[0].weight) || 0,
      stuck: mine.filter(r => r.age > 120).length,
    };
  });
  const widest = Math.max(1, ...byStage.map(x => x.value));

  const verdictBody = coverage === null
    ? `The plan is already covered by booked work, so everything in the pipeline
       is upside rather than cover.`
    : `<b>${F.money(total)}</b> of open opportunity stands against a
       <b>${F.money(gap)}</b> gap to the plan, which is
       <b>${coverage.toFixed(1)}×</b> coverage.
       ${thin ? 'That is under the 3× a pipeline usually needs to land a plan, so this is thin.'
      : 'That is at or above the 3× a pipeline usually needs to land a plan.'}`;

  const ageRows = p.rows.slice().sort((a, b) => b.age - a.age).slice(0, 6);

  return U.pageHead({
    eyebrow: 'Pipeline',
    title: 'Pipeline',
    answer: verdictBody,
  }) + U.strip([
      { label: 'Open opportunity', value: F.money(total), note: `${p.rows.length} pursuits` },
      { label: 'Weighted', value: F.money(weighted), note: 'by stage' },
      {
        label: 'Coverage', value: coverage === null ? '—' : `${coverage.toFixed(1)}×`,
        note: coverage === null ? 'plan already covered'
          : thin ? '<span class="delta down">thin, under 3×</span>' : 'at or above 3×',
      },
      { label: 'Win rate', value: winRate === null ? '—' : F.pct(winRate), note: `${won.length} of ${closed.length} closed` },
      { label: 'Gap to plan', value: F.money(gap), note: `plan ${F.money(target)}` },
    ]) + `<div class="grid">` +
    U.panel({
      col: 7, ico: 'funnel', title: 'The funnel',
      note: 'Each stage is its open value. The step down from one to the next is where work is being lost.',
      body: `<div class="fun">${byStage.map((st, i) => {
        const prev = byStage[i - 1];
        const drop = prev && prev.value ? (1 - st.value / prev.value) * 100 : null;
        return `<div class="fun-row">
          <span class="fun-name">${esc(st.name)}<i>${Math.round(st.weight * 100)}% weight</i></span>
          <span class="fun-track"><i style="width:${Math.max(2, st.value / widest * 100).toFixed(1)}%"></i></span>
          <span class="fun-val">${F.money(st.value)}<i>${st.n} open${st.stuck ? ` · ${st.stuck} stalled` : ''}</i></span>
          <span class="fun-drop">${drop === null ? '<i class="muted">entry</i>'
            : `<i class="${drop > 55 ? 'down' : ''}">${drop > 0 ? '−' : '+'}${Math.abs(drop).toFixed(0)}%</i>`}</span>
        </div>`;
      }).join('')}</div>`,
      foot: 'Stage weights are the build’s until a company sets its own, and the page says so rather than implying they are the company’s.',
    }) +

    U.panel({
      col: 5, ico: 'clock', title: 'Sitting longest',
      note: 'A pursuit that has not moved in four months is usually not a pursuit.',
      body: `<div class="rows">${ageRows.map(r => `
        <div class="row-item">
          <span class="grow"><b>${esc(r.name)}</b><div class="sub">${esc(r.stage)} · ${esc(r.owner)}</div></span>
          <span class="agepill ${r.age > 120 ? 'bad' : r.age > 60 ? 'warn' : ''}">${r.age}d</span>
        </div>`).join('')}</div>`,
      foot: `${p.rows.filter(r => r.age > 120).length} of ${p.rows.length} pursuits are past 120 days.`,
    }) +

    U.panel({
      col: 6, ico: 'people', title: 'By owner',
      note: 'Open value is what they are carrying. Win rate is what they have actually closed.',
      pad: false,
      body: U.table({
        cols: [{ name: 'Owner' }, { name: 'Open', n: true }, { name: 'Weighted', n: true },
        { name: 'Won', n: true }, { name: 'Win rate', n: true }],
        rows: (p.owners || []).map(o => ({
          cells: [`<b>${esc(o.name)}</b><div class="sub">${o.open} open · ${o.won + o.lost} closed</div>`,
            F.money(o.openValue), F.money(o.weighted), F.money(o.wonValue),
          `<span class="${o.winRate >= 40 ? 'delta up' : o.winRate < 25 ? 'delta down' : 'delta flat'}">${F.pct(o.winRate, 0)}</span>`],
        })),
      }),
    }) +

    U.panel({
      col: 6, ico: 'pulse', title: 'Why we lose',
      note: 'The reason recorded on every pursuit closed in the last twelve months.',
      body: (() => {
        const lost = closed.filter(c => !c.won);
        const why = {};
        for (const c of lost) why[c.why] = (why[c.why] || 0) + c.value;
        const rows = Object.entries(why).map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
        if (!rows.length) return `<div class="empty">Nothing closed lost in the window.</div>`;
        return C.hbars({ rows, fmt: v => F.money(v) });
      })(),
      foot: `${F.money(closed.filter(c => !c.won).reduce((a, c) => a + c.value, 0))} of work closed lost against ${F.money(won.reduce((a, c) => a + c.value, 0))} won.`,
    }) +

    /* The donut and its legend measured 497px against this chart's 234px on all
       six industries. A legend is a list and grows with its parts, so it never
       matches a fixed-height chart: they take a row each. */
    U.panel({
      col: 12, ico: 'plan', title: 'When it lands',
      note: 'Weighted value by the month each pursuit expects to close.',
      body: (() => {
        const byMonth = {};
        for (const r of p.rows) byMonth[r.close] = (byMonth[r.close] || 0) + r.weighted;
        const months = Object.keys(byMonth).sort();
        return C.bars({
          values: months.map(m => byMonth[m]),
          labels: months.map(m => F.monthName(m)),
          fmt: v => F.money(v), height: 200,
        });
      })(),
    }) +

    U.panel({
      col: 12, ico: 'link', title: 'Where it comes from',
      note: 'Open value by how the pursuit reached us.',
      body: (() => {
        const by = {};
        for (const r of p.rows) by[r.source] = (by[r.source] || 0) + r.value;
        const parts = Object.entries(by).map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
        /* ⛔ A RANKED BREAKDOWN IS A RANKING, NOT A RING. Five sources in five
           rainbow hues made the reader match a colour to a legend to learn an
           order the chart already knew. This is the treatment the financial
           dashboard took: the total said once, then the parts in rank with
           their share, one hue in steps. */
        const total = parts.reduce((a, x) => a + x.value, 0) || 1;
        return C.hbars({
          rows: parts.map((x, i) => ({
            name: x.name, value: x.value,
            note: `${(x.value / total * 100).toFixed(0)}%`,
            color: C.ramp('var(--accent)', parts.length, i),
          })),
          fmt: v => F.money(v), stacked: true,
        });
      })(),
    }) +

    U.panel({
      col: 12, ico: 'list', title: 'Every pursuit', pad: false,
      body: U.table({
        cols: [{ name: 'Opportunity' }, { name: 'Stage' }, { name: 'Owner' }, { name: 'Source' },
        { name: 'Age', n: true }, { name: 'Value', n: true }, { name: 'Weighted', n: true },
        { name: 'Expected', n: true }],
        rows: p.rows.slice().sort((a, b) => b.weighted - a.weighted).map(r => ({
          cells: [`<b>${esc(r.name)}</b>`, U.statusTag(r.stage, r.stage === 'Committed' ? 'good' : ''),
          esc(r.owner), esc(r.source),
          `<span class="${r.age > 120 ? 'delta down' : ''}">${r.age}d</span>`,
          F.money(r.value), F.money(r.weighted), esc(F.monthName(r.close, true))],
        })),
      }),
    }) +

    U.panel({
      col: 12, title: 'Where this comes from',
      body: connectorNote(s, 'crm', 'Pipeline is read from the CRM. It never enters a statement: a pursuit is not a fact.'),
    }) + `</div>`;
}

/* --------------------------------------------------------------- documents */

/* The Documents browser.

   Matt, 2026-11-02: *"your documents section looks like shit. there are no
   folders....just documents"*, and then, on the first attempt:
   *"what the fuck is this? are you fucking broken? can you not just make
   normal folders?"*

   He was right and the second complaint is the more useful one. The first cut
   put the UNIT OF WORK at the root, which reads fine for twenty-two named
   construction contracts and is nonsense for forty-eight trucks: a wall of
   folders called 2187, 2160, 2241. Nobody files that way and nobody looks that
   way either. The question a person brings to a filing system is "where are
   the insurance certificates", not "what is inside truck 2187".

   ⛔ So the ROOT IS THE FILING SCHEME: six to nine named folders, the same
   ones on every unit, and the unit numbers live one level down where they mean
   something. A company-wide folder sits beside them.

   The other order is still real: True North's own construction convention is
   project first, and someone who thinks that way can switch. The toggle sets
   which level is the root; the data underneath is the same. */
export function docs(ctx) {
  const { q, s } = ctx;
  const d = q.data.docs;
  const ind = s.industry;
  const folders = d.folders || [];
  const by = ctx.docsBy === 'unit' ? 'unit' : 'type';
  const at = String(ctx.docsAt || '');
  const [first, second] = at ? at.split('/') : [null, null];
  const unitName = id => id === '~' ? 'Company'
    : ((q.units.find(u => u.id === id) || {}).short
      || (folders.find(f => f.unit === id) || {}).unitName || id);

  const total = folders.reduce((a, f) => a + f.n, 0);
  /* What the two levels are, in this order. Everything below reads these
     rather than branching twice, so the two orders cannot drift apart. */
  const keyOf = f => by === 'type' ? f.disc : (f.unit || '~');
  const nameOf = k => by === 'type' ? k : unitName(k);
  const subKeyOf = f => by === 'type' ? (f.unit || '~') : f.disc;
  const subNameOf = k => by === 'type' ? unitName(k) : k;

  const crumbs = [{ label: 'All documents', to: '' }];
  if (first) crumbs.push({ label: nameOf(first), to: first });
  if (second) crumbs.push({ label: subNameOf(second), to: at });

  const group = (pick, keyFn, nameFn) => {
    const map = new Map();
    for (const f of folders) {
      if (pick && !pick(f)) continue;
      const k = keyFn(f);
      const g = map.get(k) || { key: k, name: nameFn(k), n: 0, size: 0, updated: '' };
      g.n += f.n; g.size += f.size;
      if (f.updated > g.updated) g.updated = f.updated;
      map.set(k, g);
    }
    return [...map.values()];
  };

  const card = (g, href, ico) => `
    <button class="fold-item${g.key === '~' ? ' is-co' : ''}" data-act="docs-open" data-arg="${esc(href)}">
      ${icon(ico, 19)}
      <span class="fo-name">${esc(g.name)}</span>
      <span class="fo-meta">${F.num(g.n)} documents · ${sizeOf(g.size)}</span>
      <span class="fo-when">last filed ${esc(g.updated)}</span>
    </button>`;

  let body = '';
  let heading = '';
  if (!first) {
    const groups = group(null, keyOf, nameOf).sort((a, b) =>
      by === 'type' ? d.disciplines.indexOf(a.key) - d.disciplines.indexOf(b.key)
        : (a.key === '~' ? -1 : b.key === '~' ? 1 : b.n - a.n));
    heading = by === 'type'
      ? `${groups.length} folders, the same ones on every ${esc(ind.unit.one)}`
      : `${groups.length} places, ${F.num(total)} documents`;
    body = `<div class="fold">${groups.map(g =>
      card(g, g.key, by === 'type' ? 'folder' : (g.key === '~' ? 'ledger' : 'folder'))).join('')}</div>`;
  } else if (!second) {
    const mine = group(f => keyOf(f) === first, subKeyOf, subNameOf)
      .sort((a, b) => (a.key === '~' ? -1 : b.key === '~' ? 1 : b.n - a.n));
    heading = `${esc(nameOf(first))} · ${F.num(mine.reduce((a, g) => a + g.n, 0))} documents
      across ${mine.length} ${mine.length === 1 ? 'place' : 'places'}`;
    body = `<div class="fold">${mine.map(g =>
      card(g, `${first}/${g.key}`, g.key === '~' ? 'ledger' : 'folder')).join('')}</div>`;
  } else {
    const f = folders.find(x => keyOf(x) === first && subKeyOf(x) === second);
    const shown = (f && f.docs) || [];
    heading = `${esc(nameOf(first))} › ${esc(subNameOf(second))}`;
    body = (shown.length ? `<div class="rows">${shown.map(r => `
      <div class="row-item">${icon('doc', 17)}
        <span class="grow"><b>${esc(r.name)}</b>
          <div class="sub">filed ${esc(r.when)} by ${esc(r.by)} · ${sizeOf(r.size)}</div></span>
        <span class="btn sm ghost">${icon('link', 14)}Open</span>
      </div>`).join('')}</div>` : '')
      + `<div class="empty">${f ? (f.n > shown.length
        ? `${F.num(f.n - shown.length)} more documents sit in this folder. A connected
           document store serves the whole folder; the sample set carries ${shown.length}.`
        : 'That is the whole folder.')
        : 'Nothing here.'}</div>`;
  }

  return U.pageHead({
    eyebrow: 'Documents',
    title: 'Documents',
    answer: `<b>${F.num(total)}</b> documents and <b>${d.sizeGb}GB</b> filed under one scheme:
      the same <b>${d.disciplines.length}</b> folders on every ${esc(ind.unit.one)} and on the
      company itself. Each row is readable only by the people who can already read it where it
      lives, and the index holds no copies.`,
  }) + `<div class="grid">` +
    U.panel({
      col: 8, ico: 'folder', title: 'Browse', pad: false,
      right: `<div class="fold-order" role="group" aria-label="Folder order">
          <button class="${by === 'type' ? 'on' : ''}" data-act="docs-by" data-arg="type">By type</button>
          <button class="${by === 'unit' ? 'on' : ''}" data-act="docs-by" data-arg="unit">By ${esc(ind.unit.one)}</button>
        </div>
        <nav class="crumbs">${crumbs.map((c, i) => i === crumbs.length - 1
        ? `<span aria-current="page">${esc(c.label)}</span>`
        : `<button data-act="docs-open" data-arg="${esc(c.to)}">${esc(c.label)}</button>${icon('chevron', 12)}`
      ).join('')}</nav>`,
      note: heading,
      body,
    }) +
    /* ⛔ One line per filing, not two.

       A filename plus a second line of metadata, in a four-column panel, wraps
       to about 100px a row: seven of them measured 677px to 915px beside a
       342px folder grid on every industry. A "just filed" strip is a glance,
       not a record, so the name is one truncated line with its folder and
       filer beneath it at a size that fits. The full name is on the row's
       hover readout and in the folder itself. */
    U.panel({
      col: 4, ico: 'clock', title: 'Just filed',
      body: `<div class="jf">${(d.recent || []).slice(0, 7).map(r => `
        <div class="jf-row" data-r="${esc(r.name)} · ${esc(r.unitName)} › ${esc(r.disc)} · filed ${esc(r.when)} by ${esc(r.by)}">
          ${icon('doc', 15)}
          <span class="jf-n">${filedName(r.name).line}</span>
          <span class="jf-m">${[filedName(r.name).when, esc(r.disc), esc(r.by)]
            .filter(Boolean).join(' · ')}</span>
        </div>`).join('')}</div>`,
      foot: 'Newest first. A filing appears here the moment it lands in its folder.',
    }) +
    U.panel({
      col: 12, ico: 'lock', title: 'How the index works',
      body: `<ol class="steps">
        <li><b>Read, never copy.</b> The index records a pointer and the file stays where it is,
          so storage does not double and nothing is migrated.</li>
        <li><b>One scheme everywhere.</b> The same ${d.disciplines.length} folders sit on every
          ${esc(ind.unit.one)}, which is what makes a filing scheme worth having. A company with
          a different scheme per ${esc(ind.unit.one)} has no scheme.</li>
        <li><b>Either way round.</b> Most people look for a kind of document, so that is the
          default. Someone who thinks ${esc(ind.unit.one)}-first can switch the order, and it is
          the same filing underneath.</li>
        <li><b>The page trims itself.</b> Two people on the same page see different rows, which is
          a permission decision, not a filter.</li>
      </ol>` + connectorNote(s, 'docs', 'Nothing is indexed until a document store is connected.'),
    }) + `</div>`;
}

function sizeOf(mb) {
  if (!Number.isFinite(mb)) return '—';
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${Math.round(mb)}MB`;
}

function connectorNote(s, cat, fallback) {
  const on = s.connectedIn(cat);
  if (!on.length) return `<div class="empty">${esc(fallback)}</div>`;
  return `<div class="rows">${on.map(c => `
    <div class="row-item">${connTile(c)}
      <span class="grow"><b>${esc(c.name)}</b><div class="sub">${esc(c.auth)} · ${esc(c.api)}</div></span>
      <span class="tag ${c.status === 'live' ? 'good' : c.status === 'built' ? 'warn' : ''}">
        <i class="dot"></i>${esc(statusWord(c.status))}</span>
    </div>`).join('')}</div>`;
}

export const miscPages = {
  home: start, 'people-home': people, 'pipeline-home': pipeline, 'docs-home': docs,
};
