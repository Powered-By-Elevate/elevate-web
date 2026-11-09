/* The fact layer.

   Pages never touch the raw arrays. They ask questions of this object, which
   indexes the extract once and answers from the index, and which applies the
   current view level to every answer. That is the whole reason role scoping
   can be trusted: there is one place a scope is applied, not thirty.

   The basis (Month, YTD, TTM, FY) is a window over months. A page that cannot
   honestly change under a basis says so rather than offering a dead button. */

export class Q {
  constructor(data, industry) {
    this.data = data;
    this.ind = industry;
    this.months = data.meta.months;
    /* '' when nothing is signed off yet, so every month reads tentative */
    this.closed = data.meta.closedThrough || '';
    this.entities = data.entities;
    this.allUnits = data.units;

    this.pl = index3(data.pl);
    this.bud = index3(data.budget);
    this.bs = index3(data.bs);
    this.uf = indexUF(data.unitFacts);

    this.view = { role: null, entity: null, basis: 'ytd', month: this.months[this.months.length - 1] };
  }

  /* ---------------------------------------------------------------- view */

  setView(v) { Object.assign(this.view, v); return this; }

  get scopeEntities() {
    const role = this.view.role;
    if (!role || role.scope === 'all') {
      return this.view.entity === '*' || !this.view.entity
        ? this.entities.map(e => e.id)
        : [this.view.entity];
    }
    /* company, units and own all sit inside one company */
    const ent = this.view.entity && this.view.entity !== '*'
      ? this.view.entity : this.entities[0].id;
    return [ent];
  }

  /* The units a person may see. For a unit-scoped role the demo assigns a
     deterministic slice, which is what makes the role switch visibly real. */
  get units() {
    const inScope = this.allUnits.filter(u => this.scopeEntities.includes(u.entity));
    const role = this.view.role;
    if (!role || (role.scope !== 'units' && role.scope !== 'own')) return inScope;
    const n = role.scope === 'own' ? 1 : Math.max(1, Math.round(inScope.length / 4));
    return inScope.slice(0, n);
  }

  get unitScoped() {
    const role = this.view.role;
    return !!role && (role.scope === 'units' || role.scope === 'own');
  }

  /* ------------------------------------------------------------- windows */

  window(basis = this.view.basis, month = this.view.month) {
    const i = this.months.indexOf(month);
    const end = i < 0 ? this.months.length - 1 : i;
    const m = Number(month.slice(5));
    switch (basis) {
      case 'month': return [this.months[end]];
      case 'ttm': return this.months.slice(Math.max(0, end - 11), end + 1);
      case 'fy': {
        const year = month.slice(0, 4);
        return this.months.filter(x => x.slice(0, 4) === year);
      }
      case 'ytd':
      default: return this.months.slice(Math.max(0, end - m + 1), end + 1);
    }
  }

  /* the window of the same length immediately before this one */
  priorWindow(basis = this.view.basis, month = this.view.month) {
    const w = this.window(basis, month);
    const start = this.months.indexOf(w[0]);
    const n = w.length;
    if (start - n < 0) return this.months.slice(0, Math.max(0, start));
    return this.months.slice(start - n, start);
  }

  /* the same window one year earlier */
  yearAgoWindow(basis = this.view.basis, month = this.view.month) {
    const w = this.window(basis, month);
    return w.map(m => {
      const [y, mm] = m.split('-');
      return `${Number(y) - 1}-${mm}`;
    }).filter(m => this.months.includes(m));
  }

  basisMoves(page) {
    /* a position or a schedule is as-of its month and never moves */
    const fixed = ['fin-balance', 'fin-close', 'docs-home', 'settings', 'pipeline-home'];
    return !fixed.includes(page);
  }

  /* --------------------------------------------------------------- sums */

  sum(line, months = this.window(), ents = this.scopeEntities, src = 'pl') {
    const idx = src === 'bud' ? this.bud : src === 'bs' ? this.bs : this.pl;
    let t = 0;
    for (const m of months) {
      const bym = idx[m];
      if (!bym) continue;
      for (const e of ents) {
        const v = bym[e] && bym[e][line];
        if (v !== undefined) t += v;
      }
    }
    return round2(t);
  }

  /* a balance is a position: only the last month of the window counts */
  bal(line, month = this.view.month, ents = this.scopeEntities) {
    let t = 0;
    const bym = this.bs[month];
    if (!bym) return 0;
    for (const e of ents) {
      const v = bym[e] && bym[e][line];
      if (v !== undefined) t += v;
    }
    return round2(t);
  }

  series(line, months = this.months, ents = this.scopeEntities, src = 'pl') {
    return months.map(m => this.sum(line, [m], ents, src));
  }

  balSeries(line, months = this.months, ents = this.scopeEntities) {
    return months.map(m => this.bal(line, m, ents));
  }

  /* ---------------------------------------------------------- unit facts */

  fact(unitId, key, month = this.view.month) {
    const bym = this.uf[month];
    return bym && bym[unitId] ? bym[unitId][key] : undefined;
  }

  factSum(key, months = this.window(), units = this.units) {
    let t = 0;
    for (const m of months) {
      const bym = this.uf[m];
      if (!bym) continue;
      for (const u of units) {
        const v = bym[u.id] && bym[u.id][key];
        if (v !== undefined) t += v;
      }
    }
    return round2(t);
  }

  /* a position-like measure: last month only, summed across units */
  factAt(key, month = this.view.month, units = this.units) {
    return this.factSum(key, [month], units);
  }

  factAvg(key, month = this.view.month, units = this.units, weightKey = null) {
    let num = 0, den = 0;
    for (const u of units) {
      const v = this.fact(u.id, key, month);
      if (v === undefined) continue;
      const w = weightKey ? (this.fact(u.id, weightKey, month) || 0) : 1;
      num += v * w; den += w;
    }
    return den ? round2(num / den) : 0;
  }

  unitRows(month = this.view.month, units = this.units) {
    return units.map(u => {
      const row = { ...u };
      const f = (this.uf[month] || {})[u.id] || {};
      row.f = f;
      return row;
    });
  }

  /* ------------------------------------------------------------ revenue */

  /* When a role is unit-scoped the statement lines are not theirs, so revenue
     is read from their own units instead of the ledger. The two agree at full
     scope, which the test suite asserts. */
  revenue(months = this.window()) {
    if (this.unitScoped) return this.factSum('rev', months);
    return this.sum('rev', months);
  }

  cost(months = this.window()) {
    if (this.unitScoped) {
      const rev = this.revenue(months);
      return round2(rev * (1 - this.ind.model.gm));
    }
    return this.sum('cor', months);
  }

  /* --------------------------------------------------------------- KPIs */

  /* Every metric this industry resolves: its own, plus the ones every company
     has. A picker offers exactly this and nothing else, so a client cannot
     choose a figure that would render as a dash. */
  kpiIds() {
    const universal = ['revenue', 'grossMargin', 'cashDays'];
    return [...new Set([...(this.ind.kpis || []), ...universal])].filter(id => {
      try { const k = this.kpi(id); return k && Number.isFinite(k.value); }
      catch (err) { return false; }
    });
  }

  kpi(id, basis = this.view.basis, month = this.view.month) {
    const w = this.window(basis, month);
    const p = this.priorWindow(basis, month);
    const annual = 12 / Math.max(1, w.length);
    const K = (label, value, display, extra = {}) =>
      ({ id, label, value, display, ...extra });

    switch (id) {
      case 'revenue': {
        const v = this.revenue(w), pv = this.revenue(p);
        return K('Revenue', v, 'usd', { delta: pct(v, pv), spark: this.series('rev', this.months.slice(-12)) });
      }
      case 'grossMargin': {
        const r = this.revenue(w), c = this.cost(w);
        const pr = this.revenue(p), pc = this.cost(p);
        const v = r ? (r - c) / r * 100 : 0;
        const pvv = pr ? (pr - pc) / pr * 100 : 0;
        return K('Gross margin', v, 'pct', { delta: v - pvv, deltaUnit: 'pp' });
      }
      case 'cashDays': {
        const cash = this.bal('cash', month);
        const spend = (this.sum('cor', w) + this.sum('oh', w)) / Math.max(1, w.length) / 30.4;
        return K('Days of cash', spend ? cash / spend : 0, 'days',
          { note: 'Cash divided by what a day costs to run' });
      }
      case 'backlog': {
        const open = this.units.filter(u => u.status !== 'Complete');
        let t = 0;
        for (const u of open) {
          t += (this.fact(u.id, 'contract', month) || 0) - (this.fact(u.id, 'earned', month) || 0);
        }
        return K('Backlog remaining', round2(t), 'usd',
          { note: `${open.length} open ${this.ind.unit.many}` });
      }
      case 'overUnder': {
        const billed = this.factAt('billed', month), earned = this.factAt('earned', month);
        return K('Billed ahead of work', round2(billed - earned), 'usd',
          { good: billed - earned >= 0, note: 'Positive is billed ahead, negative is work not yet invoiced' });
      }
      case 'costAtCompletion': {
        let variance = 0;
        for (const u of this.units) {
          const pctc = (this.fact(u.id, 'pct', month) || 0) / 100;
          const cost = this.fact(u.id, 'cost', month) || 0;
          const est = this.fact(u.id, 'estCost', month) || 0;
          if (pctc > 0.05) variance += (cost / pctc) - est;
        }
        return K('Cost at completion', round2(variance), 'usd',
          { invert: true, note: 'Projected final cost against the estimate. Positive is an overrun.' });
      }
      case 'enrolled':
        return K('Students enrolled', this.factAt('enrolled', month), 'num');
      case 'fillRate': {
        const e = this.factAt('enrolled', month), c = this.factAt('capacity', month);
        return K('Seats filled', c ? e / c * 100 : 0, 'pct', { note: `${fmtInt(c - e)} seats open` });
      }
      case 'perStudent': {
        const e = this.factAt('enrolled', month);
        const r = this.revenue(w) * annual;
        return K('Revenue per student', e ? r / e : 0, 'usdExact');
      }
      case 'staffRatio': {
        const e = this.factAt('enrolled', month), s = this.factAt('staff', month);
        return K('Students per staff member', s ? e / s : 0, 'ratio1');
      }
      case 'salesPerSqft': {
        const sq = this.factAt('sqft', month);
        const r = this.revenue(w) * annual;
        return K('Sales per sq ft', sq ? r / sq : 0, 'usdExact', { note: 'Annualised, selling area only' });
      }
      case 'basket': {
        const sales = this.factSum('sales', w);
        let tx = 0;
        for (const m of w) {
          for (const u of this.units) {
            const t = this.fact(u.id, 'traffic', m) || 0;
            const c = (this.fact(u.id, 'conv', m) || 0) / 100;
            tx += t * c;
          }
        }
        return K('Average basket', tx ? sales / tx : 0, 'usdExact');
      }
      case 'stockTurn': {
        const inv = this.bal('inv', month);
        const cogs = this.sum('cor', w) * annual;
        return K('Stock turn', inv ? cogs / inv : 0, 'ratio', { note: 'Annualised cost of sales over inventory' });
      }
      /* Restaurants. Food and labor are read off the locations, which the
         generator ties to the ledger's cost of sales and labor lines, so the
         group's prime cost and the statement agree at full scope and a
         unit-scoped role reads its own locations. */
      case 'primeCost': {
        const s = this.factSum('sales', w);
        const pv = this.factSum('sales', p);
        const v = s ? (this.factSum('foodUsd', w) + this.factSum('laborUsd', w)) / s * 100 : 0;
        const was = pv ? (this.factSum('foodUsd', p) + this.factSum('laborUsd', p)) / pv * 100 : NaN;
        return K('Prime cost', v, 'pct', { invert: true, delta: v - was, deltaUnit: 'pp',
          note: 'Food and labor as a share of sales' });
      }
      case 'foodCost': {
        const s = this.factSum('sales', w);
        return K('Food cost', s ? this.factSum('foodUsd', w) / s * 100 : 0, 'pct', { invert: true });
      }
      case 'laborCost': {
        const s = this.factSum('sales', w);
        return K('Labor cost', s ? this.factSum('laborUsd', w) / s * 100 : 0, 'pct', { invert: true });
      }
      case 'sameStore': {
        /* every location traded in both windows, so the comparable set is the whole group */
        const back = m => `${Number(m.slice(0, 4)) - 1}${m.slice(4)}`;
        const paired = w.filter(m => this.months.includes(back(m)));   /* like for like, month for month */
        const now = this.factSum('sales', paired);
        const ya = this.factSum('sales', paired.map(back));
        return K('Same-store sales', ya ? (now - ya) / ya * 100 : 0, 'pct',
          { note: 'Against the same months a year before' });
      }
      case 'avgCheck': {
        const c = this.factSum('covers', w);
        return K('Average check', c ? this.factSum('sales', w) / c : 0, 'usdExact');
      }
      case 'tableTurns': {
        /* dining rooms only: the catering kitchen has covers and no seats */
        let covers = 0, seatDays = 0;
        for (const u of this.units) {
          const seats = this.fact(u.id, 'seats', month) || 0;
          if (!seats) continue;
          for (const m of w) covers += this.fact(u.id, 'covers', m) || 0;
          seatDays += seats * 30.4 * w.length;
        }
        return K('Table turns a day', seatDays ? covers / seatDays : 0, 'ratio1',
          { note: 'Covers over seats, dining rooms only' });
      }
      case 'splh': {
        const h = this.factSum('hours', w);
        return K('Sales per labor hour', h ? this.factSum('sales', w) / h : 0, 'usdExact');
      }
      case 'oee':
        return K('OEE', this.factAvg('oee', month, this.units, 'hoursAvl'), 'pct');
      case 'costPerUnit': {
        const made = this.factSum('produced', w) - this.factSum('scrap', w);
        return K('Cost per unit', made ? this.cost(w) / made : 0, 'usdExact');
      }
      case 'scrapRate': {
        const made = this.factSum('produced', w), scrap = this.factSum('scrap', w);
        return K('Scrap rate', made ? scrap / made * 100 : 0, 'pct', { invert: true });
      }
      case 'revPerMile': {
        const miles = this.factSum('miles', w);
        return K('Revenue per mile', miles ? this.revenue(w) / miles : 0, 'usdExact');
      }
      case 'costPerMile': {
        const miles = this.factSum('miles', w);
        const total = this.unitScoped
          ? this.factSum('fuel', w) + this.factSum('maint', w)
          : this.sum('cor', w) + this.sum('oh', w);
        return K('Cost per mile', miles ? total / miles : 0, 'usdExact', { invert: true });
      }
      case 'deadhead':
        return K('Deadhead miles', this.factAvg('deadhead', month, this.units, 'miles'), 'pct', { invert: true });
      case 'onTime':
        return K('On time', this.factAvg('onTime', month, this.units, 'loads'), 'pct');
      case 'arr':
        return K('ARR', this.factAt('arr', month), 'usd',
          { delta: pct(this.factAt('arr', month), this.factAt('arr', yearBefore(month, this.months))) });
      case 'nrr': {
        const prev = this.factAt('arr', yearBefore(month, this.months)) || 0;
        let churn = 0, expansion = 0;
        const yw = this.months.slice(Math.max(0, this.months.indexOf(month) - 11), this.months.indexOf(month) + 1);
        for (const m of yw) {
          churn += this.factSum('churn', [m]);
          expansion += this.factSum('newArr', [m]) * 0.35;
        }
        return K('Net revenue retention', prev ? (prev - churn + expansion) / prev * 100 : 0, 'pct',
          { note: 'Expansion taken as 35% of new ARR, a stated sample assumption' });
      }
      case 'cacPayback': {
        const seats = this.factAt('seats', month);
        const arr = this.factAt('arr', month);
        const cac = this.factAvg('cac', month, this.units, 'seats');
        const gm = this.ind.model.gm;
        const arpaMonth = seats ? arr / seats / 12 : 0;
        return K('CAC payback', arpaMonth ? cac / (arpaMonth * gm) : 0, 'months', { invert: true });
      }
      case 'burnMultiple': {
        const ni = this.sum('ni', w);
        const netNew = this.factSum('newArr', w) - this.factSum('churn', w);
        if (ni >= 0) return K('Burn multiple', 0, 'profitable', { note: 'Profitable over this window, so nothing is being burned' });
        return K('Burn multiple', netNew ? -ni / netNew : 0, 'ratio', { invert: true });
      }
      case 'ruleOf40': {
        const r = this.revenue(w), ya = this.revenue(this.yearAgoWindow(basis, month));
        const growth = ya ? (r - ya) / ya * 100 : 0;
        const margin = r ? this.sum('ebitda', w) / r * 100 : 0;
        return K('Rule of 40', growth + margin, 'pct',
          { note: `${growth.toFixed(0)}% growth plus ${margin.toFixed(0)}% EBITDA margin` });
      }
      default:
        return K(id, 0, 'num', { note: 'Not defined for this industry' });
    }
  }
}

/* -------------------------------------------------------------- indexing */

function index3(rows) {
  const out = {};
  for (const r of rows || []) {
    const m = (out[r.m] ||= {});
    const e = (m[r.e] ||= {});
    e[r.l] = (e[r.l] || 0) + r.v;
  }
  return out;
}

function indexUF(rows) {
  const out = {};
  for (const r of rows || []) {
    const m = (out[r.m] ||= {});
    const u = (m[r.u] ||= {});
    u[r.k] = r.v;
  }
  return out;
}

function round2(x) { return Math.round(x * 100) / 100; }
function pct(a, b) { return b ? (a - b) / Math.abs(b) * 100 : NaN; }
function fmtInt(v) { return Math.round(v).toLocaleString('en-US'); }

function yearBefore(month, months) {
  const [y, m] = month.split('-');
  const want = `${Number(y) - 1}-${m}`;
  return months.includes(want) ? want : months[0];
}

export async function loadData(industryId, base = '') {
  const res = await fetch(`${base}data/${industryId}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`could not load ${industryId}: ${res.status}`);
  return res.json();
}
