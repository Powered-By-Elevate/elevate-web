/* Start here, and the three lighter modules. Start here is the page a buyer
   lands on, so it carries the industry switch, the figures that matter today,
   and a door to each place. */

import * as F from '../fmt.js?v=c00326536b';
import * as C from '../chart.js?v=c00326536b';
import * as U from '../ui.js?v=c00326536b';
import * as M from '../calm.js?v=c00326536b';
import { flags } from './ops.js?v=c00326536b';
import { esc, icon, brandMark, connTile, INDUSTRY_ICON } from '../icons.js?v=c00326536b';
import { scene, motif } from '../scenes.js?v=c00326536b';

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
  /* ⚖️ Matt, 2026-11-16, on the whole Hub: *"i would never use the current
     financial dashboard we have because it is so overwhelming that it doesnt
     feel useful"*, *"this goes for the entire thing"*. Start here repeated the
     dashboard (a revenue banner, a figure strip, a twelve-month chart) and then
     added a door grid, an industry strip and a wall of connectors. It is now a
     briefing: how the company stands in four figures, what needs a look today,
     and where to go next. The revenue chart lives on the dashboard. */
  const { q, s } = ctx;
  const ind = s.industry, role = s.role;
  const kpis = (ctx.strip || ind.kpis).slice(0, 4);
  const month = esc(F.monthName(q.view.month, true));
  const status = !q.closed ? 'No month is signed off yet'
    : q.view.month > q.closed ? `Signed off through ${esc(F.monthName(q.closed, true))}` : 'Signed off';

  const head = M.head({
    mark: s.data.brand.logo ? `<img src="${esc(s.data.brand.logo)}" alt="">` : brandMark(s.data.brand, 46),
    eyebrow: `${greeting()} · ${role.name} view`,
    title: s.data.company,
    line: esc((ind.headline.says || '{v}').replace('{v}', U.display(q.kpi(ind.headline.metric)))) + '.',
    stamp: `Books as of ${month}<br>${status}`,
  });

  /* The bright look opens on the client's own photograph, the way their
     website does, with the figures as cards over its foot. */
  const bright = s.data.brand.look === 'bright';
  const hero = bright && s.data.brand.hero;
  const KICO = { revenue: 'wallet', grossMargin: 'scale', cashDays: 'clock', capex: 'wallet', jobs: 'people',
    activeProjects: 'target', roomNights: 'compass', hotelOcc: 'gauge', perStudent: 'scale', enrolled: 'school',
    fillRate: 'gauge', staffRatio: 'people' };
  const figs = `<div class="cm-strip${hero ? ' bx-over' : ''}">` + U.strip(kpis.map((id, slot) => {
    const k = q.kpi(id);
    const options = q.kpiIds().map(oid => {
      const ok = q.kpi(oid);
      return { id: oid, label: ok.label, value: U.display(ok), note: ok.note || '' };
    });
    return { id, slot, options, label: k.label, value: U.display(k), note: k.note ? esc(k.note) : '', spark: k.spark,
      ico: bright ? (KICO[id] || 'bars') : '' };
  })) + `</div>`;

  const found = (ind.focus === 'tourism' && q.data.tourism ? tourismFlags(q) : flags(q, q.unitRows(), ind))
    .sort((x, y) => (y.value || 0) - (x.value || 0));
  const row = f => `<div class="cm-task" ${f.go ? `data-act="go" data-arg="${esc(f.go)}"` : `data-click="unit:${esc(f.id)}"`} tabindex="0">
      ${U.statusTag(f.tag, f.kind)}
      <span class="t"><b>${esc(f.name)}</b><span>${f.why}</span></span>
      <span class="o">${bright && f.owner ? `<i class="av">${esc(f.owner.split(' ').map(w => w[0]).join('').slice(0, 2))}</i>` : ''}${esc(f.owner || (s.industry.unitList || f.go ? '' : 'Unassigned'))}</span><span class="go">${icon('arrow', 14)}</span></div>`;
  const needs = M.section({
    title: 'What needs a look',
    note: found.length
      ? (ind.focus === 'tourism' ? `${F.countWord(found.length, true)} things across tourism, the most at stake first.`
        : `${F.countWord(found.length, true)} of your ${esc(ind.unit.many)}, the most at stake first.`)
      : `Nothing on your ${esc(ind.unit.many)} needs attention this month.`,
    right: found.length ? U.btn('See them all', { act: 'go', arg: 'ops-watch', sm: true, ico: 'arrow' }) : '',
    body: found.length ? `<div class="cm-tasks">${found.slice(0, 5).map(row).join('')}</div>` : '',
    fold: found.length > 5 ? `<div class="cm-tasks">${found.slice(5).map(row).join('')}</div>` : '',
    foldLabel: `${found.length - 5} more`,
  });

  const offered = s.pages().filter(p => !['home', 'settings', 'ops-detail', 'hr-person'].includes(p.id));
  const seen = new Set();
  const firsts = offered.filter(p => !seen.has(p.module) && seen.add(p.module));
  const go = M.section({
    title: 'Where to go',
    note: `What the ${esc(role.name.toLowerCase())} level can open.`,
    body: `<div class="cm-doors" style="--n:${Math.min(firsts.length, 5)}">${firsts.map(p => `<button class="cm-door" data-act="go" data-arg="${esc(p.id)}">
        <span class="i">${icon(p.icon || 'grid', 16)}</span><b>${esc(p.name)}</b><span>${esc(doorWhy(p.id, ind))}</span></button>`).join('')}</div>`,
  });

  const wm = s.data.brand.watermark;
  const goBand = bright ? go.replace('<section class="cm-card"',
    `<section class="cm-card bx-band${wm ? ' has-wm' : ''}"${wm ? ` style="--wm:url('${esc(wm)}')"` : ''}`) : go;
  const connected = Object.keys(s.data.connectors).map(id => s.connector(id)).filter(Boolean);
  const reads = connected.length
    ? `<p class="cm-reads">Every figure is read from ${connected.slice(0, 4).map(c => `<b>${esc(c.name)}</b>`).join(', ')}${connected.length > 4 ? ` and ${connected.length - 4} more` : ''}. <button class="cm-link" data-act="go" data-arg="settings">See every connection</button></p>`
    : '';

  /* the demo's way back to the other industries (the probe reopens the chooser from here) */
  const other = s.tenant ? '' : `<p class="cm-reads">The same build runs ${F.countWord(ctx.cfg.industries.industries.length)} industries. <button class="cm-link" data-act="chooser">${icon('grid', 13)} See the other industries</button></p>`;
  const top = hero ? `<section class="bx-hero" style="background-image:url('${esc(hero)}')">${head}</section>` : head;
  return M.page(top + figs + needs + goBand + reads + other);
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
    'ops-home': ind.focus === 'tourism' ? 'How tourism is running, at a glance'
      : ind.focus === 'bizdev' ? 'Projects, recruitment, retention and events, at a glance' : `How the ${ind.unit.many} are running`,
    'ops-units': `Every ${ind.unit.one}, with the money on it`,
    'ops-second': 'The operational read behind the revenue',
    'pipeline-home': 'What is coming, and what it is worth weighted',
    'docs-home': 'The paperwork behind the figures',
  }[id] || '';
}

/* A tourism office's attention list comes from its own systems: the soft month
   in the hotels, the channel that costs the most to reach a thousand people,
   group business sitting too long without a decision. */
function tourismFlags(q) {
  const t = q.data.tourism, last = t.monthly.slice(-12), out = [];
  const avg = last.reduce((a, r) => a + r.occupancy, 0) / last.length;
  const low = last.slice().sort((a, b) => a.occupancy - b.occupancy)[0];
  if (low && low.occupancy < avg - 4) out.push({ id: 'occ', go: 'ops-hotels', name: `Hotel occupancy in ${F.monthName(low.m, true)}`, tag: 'Soft month', kind: 'warn',
    why: `<b>${F.pct(low.occupancy, 1)}</b> full against <b>${F.pct(avg, 1)}</b> for the year, a month worth a campaign`, value: (avg - low.occupancy) * 1000 });
  const ms = new Set(last.map(r => r.m)), ch = {};
  for (const c of t.channels || []) if (ms.has(c.m) && c.impressions) { const o = (ch[c.channel] ||= { imp: 0, sp: 0 }); o.imp += c.impressions; o.sp += c.spend; }
  const cpm = Object.entries(ch).map(([n, o]) => ({ n, v: o.sp / o.imp * 1000 })).sort((a, b) => b.v - a.v);
  const mean = cpm.reduce((a, x) => a + x.v, 0) / (cpm.length || 1);
  if (cpm[0] && cpm[0].v > mean * 1.5) out.push({ id: 'cpm', go: 'ops-marketing', name: `${cpm[0].n} costs the most to reach people`, tag: 'Spend', kind: 'warn',
    why: `<b>${F.exact(cpm[0].v, 2)}</b> per thousand impressions against <b>${F.exact(mean, 2)}</b> across channels`, value: cpm[0].v * 100 });
  const stale = (q.data.pipeline.rows || []).filter(r => r.age > 120 && r.weight < 1).sort((a, b) => b.value - a.value)[0];
  if (stale) out.push({ id: 'pipe', go: 'pipeline-home', name: stale.name, tag: 'Stalled lead', kind: 'bad',
    why: `<b>${F.money(stale.value)}</b> of group business at ${esc(stale.stage.toLowerCase())} for <b>${stale.age}</b> days`, value: stale.value });
  return out;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function statusWord(status) {
  return { live: 'Live', built: 'Adapter built', cataloged: 'Available' }[status] || status;
}

/* --------------------------------------------------- marketing & enrollment */

/* Matt, 2026-11-10: *"inside of the education demo, we need to focus in on
   marketing and enrollment"*. A school's pipeline is families, so its page is
   the enrollment funnel: what was spent, what it brought in, what it cost per
   student, and whether next year's seats are filling. Every panel names the
   software its figures are read from, because nothing here is typed in. */
function srcNames(cfg, ids) {
  const all = cfg.connectors.connectors || [];
  return ids.map(id => (all.find(c => c.id === id) || { name: id }).name).join(' · ');
}

function marketing(ctx) {
  const { q, cfg, s } = ctx;
  const mk = q.data.marketing;
  const rows = mk.monthly;
  const months = [...new Set(rows.map(r => r.m))].sort();
  const sum = (k, list = rows) => list.reduce((a, r) => a + r[k], 0);
  const spend = sum('spend'), inq = sum('inquiries'), tours = sum('tours'),
    apps = sum('applications'), enr = sum('enrolled');
  const cpe = enr ? spend / enr : 0;
  const camp = mk.campuses || [];
  const open = camp.reduce((a, c) => a + c.open, 0);
  const accepted = camp.reduce((a, c) => a + c.accepted, 0);
  const fillNext = open ? accepted / open * 100 : 0;
  const S = ids => `Source: ${esc(srcNames(cfg, ids))}`;

  const byCh = mk.channels.map(ch => {
    const mine = rows.filter(r => r.channel === ch);
    const e = sum('enrolled', mine), sp = sum('spend', mine), i = sum('inquiries', mine);
    return { ch, src: mine[0] ? mine[0].source : '', spend: sp, inq: i, enr: e,
      cpe: sp && e ? sp / e : null, conv: i ? e / i * 100 : 0 };
  });
  const best = byCh.filter(x => x.cpe).sort((a, b) => a.cpe - b.cpe)[0];
  const behind = camp.filter(c => c.open && c.accepted / c.open < 0.45);

  const steps = [['Inquiries', inq], ['Tours', tours], ['Applications', apps], ['Enrolled', enr]];
  const widest = Math.max(1, inq);

  /* ⚖️ The calm pass: will the campuses open full, and what does each new
     student cost to find. Six figures became four, the funnel and next year's
     campuses are the two pictures, the channel table sits in its own block. */
  const funnelHtml = `<div class="fun">${steps.map(([name, v], i) => {
    const prev = steps[i - 1];
    const keep = prev && prev[1] ? v / prev[1] * 100 : null;
    return `<div class="fun-row"><span class="fun-name">${esc(name)}</span>
      <span class="fun-track"><i style="width:${Math.max(2, v / widest * 100).toFixed(1)}%"></i></span>
      <span class="fun-val">${F.num(v)}</span>
      <span class="fun-drop">${keep === null ? '<i class="muted">entry</i>' : `<i class="${keep < 40 ? 'down' : ''}">${keep.toFixed(0)}%</i>`}</span></div>`;
  }).join('')}</div>`;
  const figs = M.figures([
    { label: 'Enrolled', value: F.num(enr), sub: `from <b>${F.num(inq)}</b> inquiries, last 12 months` },
    { label: 'Cost per enrollment', value: F.money(cpe), sub: `<b>${F.money(spend)}</b> of paid marketing` },
    { label: 'Next year filled', value: F.pct(fillNext, 0), sub: `of <b>${F.num(open)}</b> open seats have an accepted offer` },
    { label: 'Cheapest channel', value: best ? F.money(best.cpe) : 'n/a', sub: best ? `per student, <b>${esc(best.ch)}</b>` : '' },
  ]);
  const funnel = M.section({
    title: 'Where families drop off', src: srcNames(cfg, ['hubspot', 'powerschool']),
    note: 'Every family from the first inquiry to a signed enrollment, over the last twelve months.',
    body: funnelHtml,
    aside: M.facts([
      { k: 'Inquiries', v: F.num(inq), sub: `${F.money(inq ? spend / inq : 0)} each` },
      { k: 'Toured', v: F.pct(inq ? tours / inq * 100 : 0, 0), sub: 'of inquiries' },
      { k: 'Applied', v: F.pct(tours ? apps / tours * 100 : 0, 0), sub: 'of tours' },
      { k: 'Enrolled', v: F.pct(apps ? enr / apps * 100 : 0, 0), sub: 'of applications', hl: true },
    ]),
    fold: C.bars({ values: months.map(m => sum('inquiries', rows.filter(r => r.m === m))), labels: months.map(m => F.monthName(m)), fmt: v => F.num(v), height: 200 }),
    foldLabel: 'Inquiries by month',
  });
  const U1 = (s.industry.unit && s.industry.unit.one) || 'campus', UN = (s.industry.unit && s.industry.unit.many) || 'campuses',
    UK = (s.industry.unit && s.industry.unit.key) || 'Campus';
  const campuses = M.section({
    title: `Will each ${U1} open full`, src: srcNames(cfg, ['powerschool']),
    note: `Open seats are seats less returning students. Accepted offers against them is how full each ${U1} will open.`,
    body: U.table({ cols: [{ name: UK, w: '24%' }, { name: 'Seats', n: true }, { name: 'Returning', n: true }, { name: 'Open', n: true },
      { name: 'Accepted', n: true }, { name: 'Filled', n: true }, { name: 'Waitlist', n: true }],
      rows: camp.map(c => { const f = c.open ? c.accepted / c.open * 100 : 100;
        return { cells: [`<b>${esc(c.name)}</b>`, F.num(c.seats), F.num(c.returning), F.num(c.open), F.num(c.accepted),
          `<span class="${f >= 60 ? 'delta up' : f < 45 ? 'delta down' : 'delta flat'}">${F.pct(f, 0)}</span>`,
          c.waitlist ? F.num(c.waitlist) : '<span class="muted">none</span>'] }; }) }),
  });
  const channels = M.section({
    title: 'What each channel brings in', src: srcNames(cfg, ['google-ads', 'meta-ads', 'google-analytics']),
    note: 'Free channels carry no cost per student.',
    body: U.table({ cols: [{ name: 'Channel', w: '28%' }, { name: 'Spend', n: true }, { name: 'Inquiries', n: true },
      { name: 'Enrolled', n: true }, { name: 'Inquiry to enrolled', n: true }, { name: 'Cost per student', n: true }],
      rows: byCh.map(x => ({ cells: [`<b>${esc(x.ch)}</b>`, x.spend ? F.money(x.spend) : '<span class="muted">free</span>', F.num(x.inq), F.num(x.enr),
        F.pct(x.conv, 1), x.cpe ? F.money(x.cpe) : '<span class="muted">n/a</span>'] })) }),
  });
  return M.page(M.head({ eyebrow: 'Marketing & enrollment', title: 'Marketing & enrollment',
    line: `<b>${F.pct(fillNext, 0)}</b> of next year's open seats are filled${behind.length ? `, and ${behind.length === 1 ? esc(behind[0].name) + ' is' : behind.length + ' ' + UN + ' are'} behind` : ''}.`,
    stamp: `Spend ties to ${esc(srcNames(cfg, ['sage-intacct']))}` }) + figs + funnel + campuses + channels);
}

/* ---------------------------------------------------------------- pipeline */

export function pipeline(ctx) {
  const { q, s } = ctx;
  if (q.data.marketing) return marketing(ctx);
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
  /* A pipeline measured in something other than the company's own revenue
     (an economic developer's capital investment) books what it won. */
  const inW = new Set(w);
  const booked = p.booked === 'won'
    ? (p.closed || []).filter(c => c.won && inW.has(c.m)).reduce((a, c) => a + c.value, 0)
    : q.sum('rev', w);
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

  const ageRows = p.rows.slice().sort((a, b) => b.age - a.age).slice(0, 5);
  /* a profile may name where its pipeline lives (a tourism office's group
     leads are in its sales CRM, not the first marketing tool in the list) */
  const ps = s.industry.pipelineSource && s.connector(s.industry.pipelineSource);
  const crm = (ps && s.isOn(ps.id) ? ps : s.connectedIn('crm')[0] || {}).name || '';
  const lostRows = (() => {
    const why = {};
    for (const c of closed.filter(c => !c.won)) why[c.why] = (why[c.why] || 0) + c.value;
    return Object.entries(why).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  })();
  const byMonth = {};
  for (const r of p.rows) byMonth[r.close] = (byMonth[r.close] || 0) + r.weighted;
  const landMonths = Object.keys(byMonth).sort();

  /* ⚖️ The calm pass (Matt, 2026-11-16). One question: will the pipeline land
     the plan. The funnel is the picture, coverage sits beside it, and the
     stalled pursuits, the owners and the full list follow, each its own block. */
  const figs = M.figures([
    { label: 'Open opportunity', value: F.money(total), sub: `<b>${p.rows.length}</b> pursuits` },
    { label: 'Weighted', value: F.money(weighted), sub: 'by stage' },
    { label: 'Coverage', value: coverage === null ? 'Covered' : `${coverage.toFixed(1)}×`,
      sub: coverage === null ? 'plan already covered by booked work' : thin ? '<b class="cm-down">thin</b>, under the usual 3×' : 'at or above the usual 3×' },
    { label: 'Win rate', value: winRate === null ? 'n/a' : F.pct(winRate, 0), sub: `<b>${won.length}</b> of ${closed.length} closed` },
  ]);
  const funnel = M.section({
    title: 'Is there enough to land the plan', src: crm,
    note: 'Each stage is its open value. The step down from one to the next is where work is lost.',
    body: `<div class="fun">${byStage.map((st, i) => {
      const prev = byStage[i - 1];
      const drop = prev && prev.value ? (1 - st.value / prev.value) * 100 : null;
      return `<div class="fun-row">
        <span class="fun-name">${esc(st.name)}<i>${Math.round(st.weight * 100)}% weight</i></span>
        <span class="fun-track"><i style="width:${Math.max(2, st.value / widest * 100).toFixed(1)}%"></i></span>
        <span class="fun-val">${F.money(st.value)}<i>${st.n} open${st.stuck ? ` · ${st.stuck} stalled` : ''}</i></span>
        <span class="fun-drop">${drop === null ? '<i class="muted">entry</i>'
          : `<i class="${drop > 55 ? 'down' : ''}">${drop > 0 ? '−' : '+'}${Math.abs(drop).toFixed(0)}%</i>`}</span></div>`;
    }).join('')}</div>`,
    aside: M.facts([
      { k: 'Plan for the year', v: F.money(target) },
      { k: 'Booked so far', v: F.money(booked) },
      { k: 'Gap to plan', v: F.money(gap), hl: true },
      { k: 'Open against the gap', v: coverage === null ? 'Covered' : `${coverage.toFixed(1)}×`, sub: 'a pipeline usually needs 3×' },
    ]),
  });
  const stuck = M.section({
    title: 'What has stopped moving', src: crm,
    note: `${p.rows.filter(r => r.age > 120).length} of ${p.rows.length} pursuits are past 120 days, the oldest first.`,
    body: `<div class="cm-tasks">${ageRows.map(r => `<div class="cm-task is-static">
      ${U.statusTag(`${r.age} days`, r.age > 120 ? 'bad' : r.age > 60 ? 'warn' : '')}
      <span class="t"><b>${esc(r.name)}</b><span>${esc(r.stage)} · ${F.money(r.value)}</span></span>
      <span class="o">${esc(r.owner)}</span><span></span></div>`).join('')}</div>`,
  });
  const owners = M.section({
    title: 'Who is carrying it', src: crm,
    note: 'Open value is what they carry. Win rate is what they have closed.',
    body: U.table({ cols: [{ name: 'Owner', w: '28%' }, { name: 'Open', n: true }, { name: 'Weighted', n: true }, { name: 'Won', n: true }, { name: 'Win rate', n: true }],
      rows: (p.owners || []).map(o => ({ cells: [`<b>${esc(o.name)}</b><div class="sub">${o.open} open · ${o.won + o.lost} closed</div>`,
        F.money(o.openValue), F.money(o.weighted), F.money(o.wonValue),
        `<span class="${o.winRate >= 40 ? 'delta up' : o.winRate < 25 ? 'delta down' : 'delta flat'}">${F.pct(o.winRate, 0)}</span>`] })) }),
    fold: lostRows.length ? C.hbars({ rows: lostRows, fmt: v => F.money(v) }) : '',
    foldLabel: 'Why we lose',
  });
  const lands = M.section({
    title: 'When it lands', src: crm, note: 'Weighted value by the month each pursuit expects to close.',
    body: C.bars({ values: landMonths.map(m => byMonth[m]), labels: landMonths.map(m => F.monthName(m)), fmt: v => F.money(v), height: 200 }),
    fold: U.table({
      cols: [{ name: 'Opportunity' }, { name: 'Stage' }, { name: 'Owner' }, { name: 'Source' }, { name: 'Age', n: true },
        { name: 'Value', n: true }, { name: 'Weighted', n: true }, { name: 'Expected', n: true }],
      rows: p.rows.slice().sort((a, b) => b.weighted - a.weighted).map(r => ({ cells: [`<b>${esc(r.name)}</b>`,
        U.statusTag(r.stage, r.stage === 'Committed' ? 'good' : ''), esc(r.owner), esc(r.source),
        `<span class="${r.age > 120 ? 'delta down' : ''}">${r.age}d</span>`, F.money(r.value), F.money(r.weighted), esc(F.monthName(r.close, true))] })) }),
    foldLabel: `Every pursuit (${p.rows.length})`,
  });
  return M.page(M.head({ eyebrow: 'Pipeline', title: 'Pipeline',
    line: coverage === null ? 'The plan is already covered by booked work, so the pipeline is upside.'
      : `<b>${F.money(total)}</b> open against a <b>${F.money(gap)}</b> gap to plan, ${thin ? '<b class="cm-down">thin</b>' : 'enough'} at <b>${coverage.toFixed(1)}×</b>.`,
    stamp: `As of ${esc(F.monthName(q.view.month, true))}` }) + figs + funnel + stuck + owners + lands);
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

  const store = (s.connectedIn('docs')[0] || {}).name || '';
  const order = `<div class="fold-order" role="group" aria-label="Folder order">
      <button class="${by === 'type' ? 'on' : ''}" data-act="docs-by" data-arg="type">By type</button>
      <button class="${by === 'unit' ? 'on' : ''}" data-act="docs-by" data-arg="unit">By ${esc(ind.unit.one)}</button></div>`;
  const crumbNav = `<nav class="crumbs cm-crumbs">${crumbs.map((c, i) => i === crumbs.length - 1
    ? `<span aria-current="page">${esc(c.label)}</span>`
    : `<button data-act="docs-open" data-arg="${esc(c.to)}">${esc(c.label)}</button>${icon('chevron', 12)}`).join('')}</nav>`;
  const recent = `<span class="cm-eyebrow">Just filed</span><div class="jf">${(d.recent || []).slice(0, 6).map(r => `
      <div class="jf-row" data-r="${esc(r.name)} · ${esc(r.unitName)} › ${esc(r.disc)} · filed ${esc(r.when)} by ${esc(r.by)}">
        ${icon('doc', 15)}<span class="jf-n">${filedName(r.name).line}</span>
        <span class="jf-m">${[filedName(r.name).when, esc(r.disc), esc(r.by)].filter(Boolean).join(' · ')}</span></div>`).join('')}</div>`;
  const browse = M.section({
    title: 'Where is it', src: store, note: heading, right: order,
    body: crumbNav + body, aside: recent,
    fold: `<ol class="steps">
      <li><b>Read, never copy.</b> The index records a pointer and the file stays where it is.</li>
      <li><b>One scheme everywhere.</b> The same ${d.disciplines.length} folders sit on every ${esc(ind.unit.one)}.</li>
      <li><b>Either way round.</b> Look by kind of document, or ${esc(ind.unit.one)} first. It is the same filing underneath.</li>
      <li><b>The page trims itself.</b> Two people see different rows, which is a permission decision, not a filter.</li>
    </ol>`,
    foldLabel: 'How the index works',
  });
  return M.page(M.head({ eyebrow: 'Documents', title: 'Documents',
    line: `<b>${F.num(total)}</b> documents filed under the same <b>${d.disciplines.length}</b> folders on every ${esc(ind.unit.one)}.`,
    stamp: `${d.sizeGb}GB indexed, no copies` }) + browse);
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
  home: start, 'pipeline-home': pipeline, 'docs-home': docs,
};
