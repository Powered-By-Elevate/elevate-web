/* The HR tab (Matt, 2026-11-04: "i want to build a paycor dupe but one that makes more sense
   for our build in the demo ... the standard HR and then HR tracking and visuals").

   Paycor's core modules at a smaller scale, read from one roster so every page agrees with
   People & labor: the directory, time off, hiring and onboarding, compliance and training,
   reviews and benefits. Payroll itself stays with the payroll provider: tax filing and moving
   money are what a company buys, and this tab reads them rather than replacing them. The
   teardown that shaped it is os-vault/wiki/research/paycor-teardown.md. */
import * as F from '../fmt.js?v=02d4c24167';
import * as C from '../chart.js?v=02d4c24167';
import * as U from '../ui.js?v=02d4c24167';
import { esc } from '../icons.js?v=02d4c24167';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = iso => { const [, m, d] = iso.split('-').map(Number); return `${MON[m - 1]} ${d}`; };
const span = (a, b) => (a === b ? day(a) : `${day(a)} to ${day(b)}`);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const hr = q => q.data.people.hr;
const tenure = (h, r) => daysBetween(r.s, h.asOf) / 365;

function source(s) {
  const on = s.connectedIn('people');
  return U.panel({
    col: 12, title: 'Where this comes from',
    body: `<div class="empty">${on.length
      ? `Employee records arrive from ${esc(on.map(c => c.name).join(', '))}. Requests and approvals made here go back to it, so the payroll system stays the record.`
      : 'Employee records arrive from the payroll or HR system. Until one is connected these are the sample set.'}</div>`,
  });
}

/* ---------------------------------------------------------------- directory */

function directory(ctx) {
  const { q, s } = ctx;
  const h = hr(q), all = h.roster;
  const depts = q.data.people.departments.map(d => d.name);
  const pick = (ctx.subtab || '').startsWith('dir:') ? ctx.subtab.slice(4) : '';
  const rows = pick ? all.filter(r => r.d === pick) : all;
  const ft = all.filter(r => r.ty === 'Full time').length;
  const pt = all.filter(r => r.ty === 'Part time').length;
  const seasonal = all.length - ft - pt;
  const avgTen = all.reduce((a, r) => a + tenure(h, r), 0) / all.length;
  const newQ = all.filter(r => daysBetween(r.s, h.asOf) <= 90).length;
  const leave = all.filter(r => r.st === 'On leave').length;
  const bands = [['Under 1 year', 0, 1], ['1 to 3 years', 1, 3], ['3 to 5 years', 3, 5], ['5 to 10 years', 5, 10], ['10 years or more', 10, 99]];

  return U.pageHead({
    eyebrow: 'HR', title: 'Directory',
    answer: `<b>${F.num(all.length)}</b> people across <b>${depts.length}</b> departments,
      <b>${F.num(ft)}</b> of them full time. The average tenure is <b>${avgTen.toFixed(1)}</b> years,
      and <b>${F.num(newQ)}</b> joined in the last 90 days.`,
  }) + U.strip([
    { label: 'People', value: F.num(all.length), note: `${leave} on leave` },
    { label: 'Full time', value: F.num(ft), note: F.pct(ft / all.length * 100, 0) + ' of the team' },
    { label: 'Part time and seasonal', value: F.num(pt + seasonal), note: `${pt} part time, ${seasonal} seasonal` },
    { label: 'Average tenure', value: `${avgTen.toFixed(1)} yrs`, note: 'from start date' },
    { label: 'New in 90 days', value: F.num(newQ), note: 'still onboarding or just finished' },
  ]) + `<div class="grid">` +
    U.panel({
      col: 6, ico: 'people', title: 'Who works where',
      note: 'Each department split by how people are employed.',
      body: C.hbars({
        rows: depts.map(d => {
          const mine = all.filter(r => r.d === d);
          const f = mine.filter(r => r.ty === 'Full time').length;
          return { name: d, value: mine.length, note: `${f} full time, ${mine.length - f} other` };
        }).sort((a, b) => b.value - a.value), fmt: v => F.num(v),
      }),
    }) +
    U.panel({
      col: 6, ico: 'clock', title: 'How long people stay',
      note: 'Everyone on the team by years since their start date.',
      body: C.bars({
        values: bands.map(([, lo, hi]) => all.filter(r => tenure(h, r) >= lo && tenure(h, r) < hi).length),
        labels: bands.map(b => b[0]), fmt: v => F.num(v), height: 210, negativeOk: false, name: 'People',
      }),
    }) +
    U.panel({
      col: 12, ico: 'list', title: pick ? `${pick}` : 'Everyone', pad: false,
      note: 'Name, role, manager and start date, the record a manager looks up most.',
      right: `<div class="chips">${['', ...depts].map(d =>
        `<button class="btn sm ${d === pick ? 'primary' : 'ghost'}" data-act="settab" data-arg="dir:${esc(d)}">${esc(d || 'All')}</button>`).join('')}</div>`,
      body: U.table({
        maxHeight: '520px',
        cols: [{ name: 'Name', w: '22%' }, { name: 'Role' }, { name: 'Department' }, { name: 'Location' },
          { name: 'Manager' }, { name: 'Type' }, { name: 'Started', n: true }],
        rows: rows.slice().sort((a, b) => a.d.localeCompare(b.d) || (a.mgr ? 1 : 0) - (b.mgr ? 1 : 0) || a.n.localeCompare(b.n)).map(r => ({
          click: `person:${r.id}`, cells: [`<b>${esc(r.n)}</b>${r.st !== 'Active' ? ` <span class="tag warn">${esc(r.st)}</span>` : ''}`,
            esc(r.t), esc(r.d), esc(r.loc), esc(r.mgr || 'Leadership'), esc(r.ty),
            `<span style="white-space:nowrap">${MON[Number(r.s.slice(5, 7)) - 1]} ${r.s.slice(0, 4)}</span>`],
        })),
      }),
      foot: `${F.num(rows.length)} ${rows.length === 1 ? 'person' : 'people'}${pick ? ` in ${esc(pick)}` : ''}.`,
    }) + source(s) + `</div>`;
}

/* ----------------------------------------------------------------- time off */

function timeoff(ctx) {
  const { q, s } = ctx;
  const h = hr(q), t = h.timeoff, marks = ctx.tasks || {};
  const state = p => marks[`${p.id}-${p.from}:pto`];
  const waiting = t.pending.filter(p => !state(p));
  const outToday = t.out.filter(o => o.from <= h.asOf && o.to >= h.asOf);
  const liability = t.balances.reduce((a, b) => a + b.liability, 0);
  const avgBal = t.balances.reduce((a, b) => a + b.avg, 0) / t.balances.length;
  /* the next fourteen days as columns, each person a row, so overlaps in one team are visible */
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(h.asOf); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10);
  });

  return U.pageHead({
    eyebrow: 'HR', title: 'Time off',
    answer: `<b>${waiting.length}</b> ${waiting.length === 1 ? 'request is' : 'requests are'} waiting on a manager,
      <b>${outToday.length}</b> ${outToday.length === 1 ? 'person is' : 'people are'} out today, and unused paid time off
      is carried at <b>${F.money(liability)}</b>.`,
  }) + U.strip([
    { label: 'Waiting on approval', value: F.num(waiting.length), note: `${t.pending.length - waiting.length} decided here` },
    { label: 'Out today', value: F.num(outToday.length), note: `${t.out.length} out in the next two weeks` },
    { label: 'Average balance', value: `${avgBal.toFixed(0)} hrs`, note: 'full-time staff' },
    { label: 'Time off liability', value: F.money(liability), note: 'unused hours at pay rate' },
  ]) + `<div class="grid">` +
    U.panel({
      col: 12, ico: 'check', title: 'Requests to approve', pad: false,
      note: 'Approve or decline here and the decision goes back to the payroll system with the hours.',
      body: U.table({
        cols: [{ name: 'Who', w: '24%' }, { name: 'Department' }, { name: 'Kind' }, { name: 'When' },
          { name: 'Days', n: true }, { name: 'Asked', n: true }, { name: '' }],
        rows: t.pending.map(p => {
          const st = state(p), key = `${p.id}-${p.from}`;
          return {
            cls: st ? 'muted' : '', click: `person:${p.id}`,
            cells: [`<b>${esc(p.n)}</b>`, esc(p.d), esc(p.k), span(p.from, p.to), F.num(p.days),
              p.asked ? `${p.asked}d ago` : 'today',
              st ? `<span class="tag ${st === 'done' ? 'good' : 'bad'}">${st === 'done' ? 'Approved' : 'Declined'}</span>
                 <button class="btn sm ghost" data-act="task" data-arg="${st}:${esc(key)}:pto">Undo</button>`
                : `<button class="btn sm primary" data-act="task" data-arg="done:${esc(key)}:pto">Approve</button>
                 <button class="btn sm ghost" data-act="task" data-arg="snooze:${esc(key)}:pto">Decline</button>`],
          };
        }),
      }),
    }) +
    U.panel({
      col: 12, ico: 'clock', title: 'Who is out, the next two weeks', pad: false,
      note: 'Each row a person, each column a day, so two people out from one team at once stands out.',
      body: `<div class="scroll"><table class="t cal"><thead><tr><th style="width:22%">Who</th>${days.map(d =>
        `<th class="n">${'SMTWTFS'[new Date(d + 'T12:00').getDay()]}<br>${Number(d.slice(8))}</th>`).join('')}</tr></thead><tbody>${t.out.filter(o => o.to >= days[0] && o.from <= days[13]).map(o =>
        `<tr><td><b>${esc(o.n)}</b><div class="sub">${esc(o.d)} · ${esc(o.k)}</div></td>${days.map(d =>
          `<td class="n">${d >= o.from && d <= o.to ? '<i class="cal-on" title="Out"></i>' : ''}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div>`,
    }) +
    U.panel({
      col: 12, ico: 'bars', title: 'Balances by department', pad: false,
      note: 'Average hours banked per full-time person, the share of this year’s accrual used, and what the banked hours are worth.',
      body: U.table({
        cols: [{ name: 'Department' }, { name: 'Avg banked', n: true }, { name: 'Used this year', n: true }, { name: 'Liability', n: true }],
        rows: t.balances.map(b => ({ cells: [`<b>${esc(b.d)}</b>`, `${b.avg} hrs`, F.pct(b.used, 0), F.money(b.liability)] })),
      }),
      foot: `${F.money(liability)} in total. A balance high in one team usually means people there cannot get away.`,
    }) + source(s) + `</div>`;
}

/* ------------------------------------------------------- hiring & onboarding */

function hiring(ctx) {
  const { q, s } = ctx;
  const h = hr(q), g = h.hiring;
  const stages = ['Applied', 'Screened', 'Interviewed', 'Offer'];
  const tot = stages.map((_, i) => g.reqs.reduce((a, r) => a + r.stages[i], 0));
  const offers = tot[3];
  const steps = g.steps.length;
  const behind = g.onboarding.filter(o => o.done < steps && daysBetween(o.s, h.asOf) > 21);

  return U.pageHead({
    eyebrow: 'HR', title: 'Hiring & onboarding',
    answer: `<b>${g.reqs.length}</b> open roles have <b>${F.num(tot[0])}</b> applicants between them and
      <b>${offers}</b> ${offers === 1 ? 'offer' : 'offers'} out. Roles fill in <b>${g.timeToFill}</b> days on average, and
      <b>${g.onboarding.length}</b> new hires are working through onboarding${behind.length ? `, <b>${behind.length}</b> of them behind` : ''}.`,
  }) + U.strip([
    { label: 'Open roles', value: F.num(g.reqs.length), note: 'from People & labor' },
    { label: 'Applicants', value: F.num(tot[0]), note: `${tot[2]} interviewed` },
    { label: 'Days to fill', value: F.num(g.timeToFill), note: 'average, last 12 months' },
    { label: 'Offers accepted', value: F.pct(g.accept, 0), note: 'last 12 months' },
    { label: 'Onboarding', value: F.num(g.onboarding.length), note: `${behind.length} behind schedule` },
  ]) + `<div class="grid">` +
    U.panel({
      col: 6, ico: 'funnel', title: 'The whole funnel',
      note: 'Every open role added together, stage by stage.',
      body: C.hbars({ rows: stages.map((st, i) => ({ name: st, value: tot[i] })), fmt: v => F.num(v) }),
      foot: `${F.pct(tot[1] / Math.max(1, tot[0]) * 100, 0)} of applicants pass the screen and ${F.pct(tot[2] / Math.max(1, tot[1]) * 100, 0)} of those reach an interview.`,
    }) +
    U.panel({
      col: 6, ico: 'people', title: 'Where hires come from',
      note: 'Open roles by the source sending their strongest applicants.',
      body: C.hbars({ rows: [...new Set(g.reqs.map(r => r.src))].map(src => ({ name: src, value: g.reqs.filter(r => r.src === src).length }))
        .sort((a, b) => b.value - a.value), fmt: v => F.num(v) }),
    }) +
    U.panel({
      col: 12, ico: 'list', title: 'Each open role', pad: false,
      note: 'Where every role stands, how long it has been open and where its best applicants came from.',
      body: U.table({
        cols: [{ name: 'Role', w: '30%' }, { name: 'Open', n: true }, ...stages.map(st => ({ name: st, n: true })), { name: 'Source' }],
        rows: g.reqs.map(r => ({
          cells: [`<b>${esc(r.t)}</b><div class="sub">${esc(r.d)}</div>`,
            `<span class="agepill ${r.days > 120 ? 'bad' : r.days > 60 ? 'warn' : ''}">${r.days}d</span>`,
            ...r.stages.map((n, i) => (i === 3 && n ? `<span class="tag good">${n}</span>` : F.num(n))), esc(r.src)],
        })),
      }),
    }) +
    U.panel({
      col: 12, ico: 'check', title: 'New hires, onboarding', pad: false,
      note: `Each new hire against the ${steps} steps everyone completes, from offer to training. A step left open past three weeks is the one HR chases.`,
      body: U.table({
        cols: [{ name: 'New hire', w: '24%' }, { name: 'Started', n: true }, { name: 'Progress', w: '30%' }, { name: 'Next step' }],
        rows: g.onboarding.map(o => {
          const late = o.done < steps && daysBetween(o.s, h.asOf) > 21;
          return {
            click: link(h, o.n), cells: [`<b>${esc(o.n)}</b><div class="sub">${esc(o.t)} · ${esc(o.d)}</div>`, day(o.s),
              `<div class="meter"><i style="width:${(o.done / steps * 100).toFixed(0)}%"></i></div><div class="sub">${o.done} of ${steps}</div>`,
              o.done >= steps ? '<span class="tag good">Complete</span>'
                : `<span class="tag ${late ? 'bad' : 'warn'}">${esc(g.steps[o.done])}</span>`],
          };
        }),
      }),
    }) + source(s) + `</div>`;
}

/* --------------------------------------------------- compliance & training */

function compliance(ctx) {
  const { q, s } = ctx;
  const h = hr(q), c = h.compliance;
  const lapsed = c.expiring.filter(e => e.due < h.asOf);
  const soon = c.expiring.filter(e => e.due >= h.asOf && daysBetween(h.asOf, e.due) <= 30);
  const gaps = c.gaps.reduce((a, g) => a + g.n, 0);
  const low = c.courses.slice().sort((a, b) => a.pct - b.pct)[0];

  return U.pageHead({
    eyebrow: 'HR', title: 'Compliance & training',
    answer: `<b>${lapsed.length}</b> ${lapsed.length === 1 ? 'certification has' : 'certifications have'} lapsed and
      <b>${soon.length}</b> more expire within 30 days. <b>${gaps}</b> records have a paperwork gap, and
      ${esc(low.c)} is the furthest behind at <b>${F.pct(low.pct, 0)}</b> complete.`,
  }) + U.strip([
    { label: 'Lapsed', value: F.num(lapsed.length), note: 'certifications past due' },
    { label: 'Due in 30 days', value: F.num(soon.length), note: `${c.expiring.length} due in 90` },
    { label: 'Paperwork gaps', value: F.num(gaps), note: `${c.gaps.filter(g => g.n).length} kinds` },
    { label: 'Training complete', value: F.pct(c.courses.reduce((a, x) => a + x.pct, 0) / c.courses.length, 0), note: 'average across required courses' },
  ]) + `<div class="grid">` +
    U.panel({
      col: 12, ico: 'shield', title: 'Certifications coming due', pad: false,
      note: 'Every license and certification that has lapsed or lapses within 90 days, soonest first.',
      body: U.table({
        cols: [{ name: 'Who', w: '28%' }, { name: 'Certification' }, { name: 'Due', n: true }, { name: '', n: true }],
        rows: c.expiring.map(e => {
          const d = daysBetween(h.asOf, e.due);
          return {
            click: link(h, e.n), cells: [`<b>${esc(e.n)}</b><div class="sub">${esc(e.d)}</div>`, esc(e.c), day(e.due),
              d < 0 ? `<span class="tag bad">${-d}d over</span>` : `<span class="agepill ${d <= 30 ? 'warn' : ''}">${d}d</span>`],
          };
        }),
      }),
    }) +
    U.panel({
      col: 5, ico: 'doc', title: 'Paperwork gaps',
      note: 'Records missing something the company is required to hold or should.',
      body: C.hbars({ rows: c.gaps.map(g => ({ name: g.k, value: g.n })), fmt: v => F.num(v) }),
    }) +
    U.panel({
      col: 7, ico: 'check', title: 'Required training', pad: false,
      note: 'Each required course by the share of the team that has finished it and when it is due.',
      body: U.table({
        cols: [{ name: 'Course', w: '32%' }, { name: 'Complete', w: '40%' }, { name: '', n: true }, { name: 'Due', n: true }],
        rows: c.courses.map(x => ({
          cells: [`<b>${esc(x.c)}</b>`,
            `<div class="meter${x.pct < 75 ? ' bad' : x.pct < 90 ? ' warn' : ''}"><i style="width:${Math.min(100, x.pct).toFixed(0)}%"></i></div>`,
            F.pct(x.pct, 0), day(x.due)],
        })),
      }),
    }) + source(s) + `</div>`;
}

/* ------------------------------------------------------- reviews & benefits */

function reviews(ctx) {
  const { q, s } = ctx;
  const h = hr(q), r = h.reviews, b = h.benefits;
  const hc = h.roster.length;
  const mgrAvg = r.byDept.reduce((a, d) => a + d.mgr, 0) / r.byDept.length;
  const slow = r.byDept.slice().sort((a, b2) => a.mgr - b2.mgr)[0];
  const toGo = daysBetween(h.asOf, r.due);
  const labels = ['Needs improvement', 'Developing', 'Meets', 'Exceeds', 'Outstanding'];

  return U.pageHead({
    eyebrow: 'HR', title: 'Reviews & benefits',
    answer: `The ${esc(r.cycle)} is due in <b>${toGo}</b> days and managers have finished <b>${F.pct(mgrAvg, 0)}</b> of theirs,
      ${esc(slow.d)} the furthest behind. Open enrollment runs ${span(b.window[0], b.window[1])}, and
      <b>${F.num(b.elected)}</b> of <b>${F.num(b.eligible)}</b> eligible people have made their choices.`,
  }) + U.strip([
    { label: 'Manager reviews done', value: F.pct(mgrAvg, 0), note: `due ${day(r.due)}` },
    { label: 'Goals on track', value: F.pct(r.goals[0] / hc * 100, 0), note: `${F.num(r.goals[2])} off track` },
    { label: 'On medical', value: F.pct(b.medical / b.eligible * 100, 0), note: `of ${F.num(b.eligible)} eligible` },
    { label: 'Saving for retirement', value: F.pct(b.retire / b.eligible * 100, 0), note: 'contributing to the plan' },
    { label: 'Enrollment made', value: `${F.num(b.elected)} of ${F.num(b.eligible)}`, note: `window closes ${day(b.window[1])}` },
  ]) + `<div class="grid">` +
    U.panel({
      col: 7, ico: 'bars', title: 'Review progress by department', pad: false,
      note: 'Self reviews and manager reviews, each as a share of the department.',
      body: U.table({
        cols: [{ name: 'Department', w: '28%' }, { name: 'Self review', w: '30%' }, { name: 'Manager review', w: '30%' }],
        rows: r.byDept.map(d => ({
          cells: [`<b>${esc(d.d)}</b>`,
            `<div class="meter"><i style="width:${d.self}%"></i></div><div class="sub">${d.self}%</div>`,
            `<div class="meter${d.mgr < 40 ? ' bad' : d.mgr < 70 ? ' warn' : ''}"><i style="width:${d.mgr}%"></i></div><div class="sub">${d.mgr}%</div>`],
        })),
      }),
    }) +
    U.panel({
      col: 5, ico: 'shield', title: 'Benefits enrollment',
      note: `Full-time staff on each plan. Open enrollment runs ${span(b.window[0], b.window[1])}.`,
      body: C.hbars({
        rows: [{ name: 'Medical', value: b.medical, note: F.pct(b.medical / b.eligible * 100, 0) },
          { name: 'Dental', value: b.dental, note: F.pct(b.dental / b.eligible * 100, 0) },
          { name: 'Retirement plan', value: b.retire, note: F.pct(b.retire / b.eligible * 100, 0) },
          { name: 'Enrollment made', value: b.elected, note: F.pct(b.elected / b.eligible * 100, 0) }],
        fmt: v => F.num(v), max: b.eligible,
      }),
    }) +
    U.panel({
      col: 6, ico: 'target', title: 'How ratings fall',
      note: 'Last cycle’s ratings across the whole team.',
      body: C.bars({ values: r.ratings, labels: labels.map(l => l.split(' ')[0]), fmt: v => F.num(v), height: 200, negativeOk: false, name: 'People' }),
      foot: `${F.pct((r.ratings[3] + r.ratings[4]) / hc * 100, 0)} rated above expectations, ${F.pct(r.ratings[0] / hc * 100, 0)} on a plan to improve.`,
    }) +
    U.panel({
      col: 6, ico: 'target', title: 'Goals',
      note: 'Every goal set this year by where it stands.',
      body: C.donut({
        parts: [{ name: 'On track', value: r.goals[0], color: 'var(--good)' }, { name: 'At risk', value: r.goals[1], color: 'var(--warn)' },
          { name: 'Off track', value: r.goals[2], color: 'var(--bad)' }],
        fmt: v => F.num(v), center: F.num(r.goals.reduce((a, x) => a + x, 0)), centerLabel: 'goals',
      }) + C.donutLegend([{ name: 'On track', value: r.goals[0], color: 'var(--good)' }, { name: 'At risk', value: r.goals[1], color: 'var(--warn)' },
        { name: 'Off track', value: r.goals[2], color: 'var(--bad)' }], v => F.num(v)),
    }) + source(s) + `</div>`;
}


/* A name on these pages opens the employee record (hrmash.js). */
const byName = (h, n) => h.roster.find(r => r.n === n);
const link = (h, n) => { const r = byName(h, n); return r ? `person:${r.id}` : ''; };

/* HR home, Inbox, the employee record, Timecards and Run payroll moved to hrmash.js, where each
   screen copies the layout of the platform that does that job best (Matt, 2026-11-05). */
export const hrPages = {
  'hr-directory': directory, 'hr-time': timeoff, 'hr-hiring': hiring,
  'hr-compliance': compliance, 'hr-reviews': reviews,
};
