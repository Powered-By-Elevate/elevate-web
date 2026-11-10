/* Charts, hand-drawn in SVG.

   No chart library. Everything here draws into a viewBox and scales with the
   panel, every mark carries a <title> so a hover always says what it is, and
   line charts additionally take a cursor guideline wired by wire().

   Series colors come from the validated dataviz palette on :root, never from
   a brand accent, because a brand color has no contrast guarantee. */

import { esc, hash } from './icons.js?v=5cc1fbd6cf';
import { mix } from './color.js?v=5cc1fbd6cf';

const W = 720;
let uid = 0;

export function seriesColour(i) {
  const css = getComputedStyle(document.documentElement);
  const v = css.getPropertyValue(`--s${i % 6}`).trim();
  return v || ['#2B7CC4', '#B87D0C', '#0093A1', '#8B5CD6', '#C2408B', '#A2551F'][i % 6];
}

/* ⛔ A STACK OF PARTS IS ONE MATERIAL IN STEPS, NOT A RAINBOW.

   `seriesColour()` cycles six unrelated hues, which is right for six unrelated
   series and wrong for the parts of one thing. The balance sheet drew its two
   columns in orange, blue, magenta, purple and teal: five hues saying nothing
   about which side is which, and the only colours in the build that come from
   no brand. Measured on three panels across Finance, Operations and Pipeline.

   A ramp keeps one hue per group and steps it toward the page, so the eye
   reads "these belong together, and this is the biggest" without a legend. */
/* ⛔ AN SVG `fill` ATTRIBUTE IS NOT CSS: it resolves no `var()` and no
   `color-mix()`, and an unresolvable value falls back to BLACK with no error.
   The first cut returned `color-mix(in srgb, var(--accent) 54%, var(--panel))`
   and every bubble on every scatter in the build painted solid black, which
   the rainbow check then passed, because black has no hue to count. A detector
   cannot see a fault that makes its subject invisible to it.

   So the colour is resolved here, the way `seriesColour()` already does it,
   and what reaches the attribute is a plain rgb. */
export function ramp(base, n, i) {
  const css = getComputedStyle(document.documentElement);
  const one = v => {
    const m = /var\(\s*(--[\w-]+)\s*\)/.exec(v || '');
    const raw = m ? css.getPropertyValue(m[1]).trim() : v;
    return raw || '#2B7CC4';
  };
  const col = one(base);
  if (n <= 1 || i <= 0) return col;
  const t = Math.min(0.46, (i / (n - 1)) * 0.46);
  return mix(col, one('var(--panel)') || '#ffffff', t);
}

export function niceMax(v) {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  /* ⛔ The ladder used to jump 5 -> 10, so a series peaking at 5.5M was drawn
     against a 10M axis and the bars filled barely half the panel. That is the
     "small puzzle piece in a big empty space" Matt named on Start here
     (2026-11-02), and it was in EVERY bar and line chart in the build, not
     just that one. The rungs between keep the axis a round number while
     letting the data fill the plot. */
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(x => n <= x) || 10;
  return step * mag;
}

/* ⛔ TICKS ON ROUND NUMBERS, NOT ON FRACTIONS OF THE MAXIMUM.

   This interpolated between the extremes, so an axis topping out at a round
   $250K still printed $188K, $125K and $63K up the side: nobody chooses those
   numbers, and they appeared on every chart in the build. A nice maximum is
   not enough on its own, because the STEP has to be round too. */
/* ⚠️ `count` IS A TARGET, AND THE ROOM AVAILABLE IS THE LIMIT. The round-step
   ladder puts more ticks on an axis than the old interpolation did, and on a
   short plot that printed two labels 8px apart on education's headcount chart.
   A caller that knows its plot height passes `room`, and the target is capped
   so no two labels land closer than 26px. */
/* ⛔ A STEP HAS TO SURVIVE THE FORMATTER.

   Found by the publishing session on education's headcount chart, which the
   niceScale fix improved and then spoiled in a smaller way: the range 410 to
   425 takes a step of 2.5, so the real ticks are 410, 412.5, 415, 417.5 and
   the formatter, which prints whole people, renders them 410, 413, 415, 418.
   Evenly spaced gridlines then read 3, 2, 3, 2 up the side. Nothing printed is
   false (412.5 does round to 413) and 2.5 of a person is not a quantity.

   So a candidate step is rejected when the labels it produces do not read as
   evenly spaced. The test is on the RENDERED text, because the defect only
   exists in the rendering: the same 2.5 step on a dollar axis prints $2.5M and
   reads perfectly, so a blanket ban on half-steps would be wrong. */
function labelValue(str) {
  const t = String(str).trim();
  if (!t) return null;
  const mul = /[kK]$/.test(t) ? 1e3 : /[mM]$/.test(t) ? 1e6 : /[bB]$/.test(t) ? 1e9 : 1;
  const n = parseFloat(t.replace(/[^0-9.+-]/g, ''));
  if (!Number.isFinite(n)) return null;
  /* a leading bracket is the accountant's minus */
  const neg = /^[-−(]/.test(t);
  return (neg && n > 0 ? -n : n) * mul;
}

/* Can this formatter tell these two values apart? A zoom that the labels
   cannot express is a zoom that removes the axis. */
function fmtSplits(fmt, lo, hi) {
  if (typeof fmt !== 'function') return true;
  const a = String(fmt(lo)), b = String(fmt(hi)), m = String(fmt((lo + hi) / 2));
  return a !== b && (a !== m || b !== m);
}

function readsEvenly(list, fmt) {
  if (typeof fmt !== 'function' || list.length < 3) return true;
  const vals = list.map(v => labelValue(fmt(v)));
  /* a label this cannot read is not a label this may judge */
  if (vals.some(v => v === null)) return true;
  const d = [];
  for (let i = 1; i < vals.length; i++) d.push(vals[i] - vals[i - 1]);
  const big = Math.max(...d.map(Math.abs));
  /* ⚠️ An axis whose labels all read the same is not an UNEVEN axis, and
     answering false here sent `niceScale` hunting a step that could never fix
     it: the fallback multiplied until the tick loop asked for an array of
     impossible length and every page carrying a scatter died with "That page
     could not be drawn." The degenerate axis is real, but it is made upstream
     by zooming into a band the formatter cannot resolve, so it is prevented
     there (see `fmtSplits`) rather than chased here. */
  if (!(big > 0)) return true;
  return d.every(x => Math.abs(Math.abs(x) - big) <= big * 0.001);
}

function ticks(min, max, count = 4, room = null, fmt = null) {
  /* ⚠️ THE LIMIT BINDS ON THE TICKS PRODUCED, NOT ON THE TARGET.

     Capping `count` alone does nothing, because the step comes from a ladder:
     a headcount series spanning 8 people picks a step of 2 and emits five
     ticks whatever the target was, which printed 412 and 420 nine pixels
     apart on education's team chart. So the room becomes a maximum the chosen
     step has to satisfy. */
  const most = room ? Math.max(2, Math.floor(room / 26)) : 99;
  const span = max - min;
  if (!(span > 0)) return [min];
  /* ⚠️ Pick the step by the TICK COUNT IT PRODUCES, not by magnitude alone.
     Taking the first ladder rung at or above span/count chose 100K for a 250K
     axis, because 62.5K rounds up past the 50K rung, and the axis printed
     $250K, $200K, $100K, $0 with one gap twice the others. Scoring every
     candidate by how close its interval count lands to the target picks 50K
     and gives six evenly spaced round numbers. */
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = mag, bestScore = Infinity;
  for (const m of [mag / 10, mag, mag * 10]) {
    for (const x of [1, 2, 2.5, 5]) {
      const cand = x * m;
      const n = span / cand;
      if (n < 2 || n > Math.min(9, most)) continue;
      const trial = [];
      for (let v = Math.ceil(min / cand) * cand; v <= max + cand * 1e-6; v += cand) {
        trial.push(Math.abs(v) < cand * 1e-6 ? 0 : v);
      }
      if (!readsEvenly(trial, fmt)) continue;
      const score = Math.abs(n - count);
      if (score < bestScore) { bestScore = score; step = cand; }
    }
  }
  /* no rung satisfies the room, so take the coarsest that does */
  if (span / step > most) step = span / most;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) {
    out.push(Math.abs(v) < step * 1e-6 ? 0 : v);
  }
  /* ⛔ THE DATA'S EXTREMES ARE NOT AXIS LABELS.

     This appended `min` and `max` so the range was always written down, and
     on education's team chart the minimum was 412 against a first round tick
     of 420: eight people apart, nine pixels apart, one label printed on the
     other. A threshold in data units cannot see that, because how many pixels
     eight people buy depends on the plot's height.

     An axis exists to let a reader put a value to a position, which round
     gridlines do. The exact minimum and maximum are the series' business and
     the readout already gives them on hover. So nothing is appended, and the
     only guard left is against an axis with nothing on it at all. */
  if (out.length < 2) return [min, max];
  return out;
}

/* ⛔ THE SCALE AND THE TICKS MUST AGREE BY CONSTRUCTION, NOT BY COINCIDENCE.

   The round-step rewrite left the plot's top edge and its top gridline free to
   disagree, because they were chosen by different code with no knowledge of
   each other: the plot top is `niceMax(hi)` and `ticks()` picks its step from
   the span. Where the top is not a multiple of the step, the last tick falls
   BELOW the top of the plot, and the data between them has no gridline above
   it at all.

   Worked example, from the publishing session: lo=-200K, hi=500K gives a span
   of 700K and a step of 200K, so the ticks run -200K, 0, 200K, 400K and 600K
   is dropped for exceeding hi. Top gridline 400K, plot top 500K. Measured on
   five charts across both themes, with marks sitting 11 to 25px above the top
   gridline: on `Net income, 24 months` the final point climbs past the $400K
   line with nothing above it, so a reader cannot tell $450K from $900K.

   ⚠️ That is a worse defect than the ugly axis it came from, and it was mine:
   the fix for one number introduced it. So the range is settled FROM the step
   rather than beside it. One function returns both and they cannot drift. */
export function niceScale(lo, hi, count = 4, room = null, fmt = null) {
  if (!(hi > lo)) { hi = (hi || 0) + 1; lo = Math.min(0, lo); }
  /* a first pass to learn the step the span wants */
  const probe = ticks(lo, hi, count, room, fmt);
  const step = probe.length > 1 ? Math.abs(probe[1] - probe[0]) : (hi - lo) / count;
  /* then snap the RANGE outward to whole steps, so the extremes are ticks.

     ⛔ THE EPSILON LEANS TOWARD THE VALUE, NEVER AWAY FROM IT, and the first
     cut of this had both signs inverted (`floor(lo / step - 1e-9)`,
     `ceil(hi / step + 1e-9)`). An epsilon here exists to let a quotient that
     is 2.9999999996 count as 3. Pushed the other way it does the opposite: on
     an EXACT quotient it adds a whole step. `Math.floor(0 - 1e-9)` is -1, and
     `bars()` passes lo=0 for any non-negative series while `stack()` always
     does, so a chart that never goes below zero was given a full step of empty
     plot underneath it and a negative gridline label to go with it.

     Measured on the built pages, both the defect and the fix: of 107 value
     axes, 49 carried a negative label on data that never went negative, with
     the zero line floating 22 to 70px above the bottom of the plot, in all six
     industries, and "The year so far" on every home page among them. Zero
     after. The bracket this function exists to fix still holds: lo=-200K,
     hi=480K still gives -200K to 600K. */
  /* ⚠️ AND THE FORMATTER HAS TO SURVIVE THE SNAP TOO.

     `ticks()` rejects a step whose labels do not read evenly, but it judges
     the range it was GIVEN, and this function then widens that range and
     regenerates the ticks, which can add a tick the probe never contained.
     Industrial's "Overhead by kind" is the case: the step is a clean $250K,
     the snap adds a top tick at $1.25M, and the money formatter prints one
     decimal of a million, so the axis reads $0, $250K, $500K, $750K, $1.0M,
     $1.3M and the last gap reads 300 where every other reads 250. Measured
     after the first cut of this rule had already fixed the other four. So the
     test is applied again to the FINAL list, and a failure asks for fewer
     ticks until the labels agree. */
  const build = st => {
    const sLo = Math.floor(lo / st + 1e-9) * st;
    const sHi = Math.ceil(hi / st - 1e-9) * st;
    const list = [];
    for (let v = sLo; v <= sHi + st * 1e-6; v += st) {
      list.push(Math.abs(v) < st * 1e-6 ? 0 : v);
    }
    return { lo: sLo, hi: sHi, ticks: list.length > 1 ? list : [sLo, sHi] };
  };
  let r = build(step);
  if (!readsEvenly(r.ticks, fmt)) {
    for (let c = count - 1; c >= 2; c--) {
      const alt = ticks(lo, hi, c, room, fmt);
      if (alt.length < 2) continue;
      const cand = build(Math.abs(alt[1] - alt[0]));
      if (readsEvenly(cand.ticks, fmt)) { r = cand; break; }
    }
  }
  /* ⚠️ AND WHEN EVERY STEP THE LADDER OFFERS STILL COLLAPSES, GO COARSER THAN
     THE LADDER WILL. `ticks()` will not return fewer than two intervals, so a
     narrow axis measured in whole units has no legal step at all: construction's
     "Completion spread" runs 0 to about 1.4 contracts, every candidate step is
     a fraction of a contract, and a whole-number formatter printed eight
     gridlines reading 1, 1, 1, 1, 0, 0, 0, 0. An axis of 0, 1, 2 with three
     ticks is right there and the ladder's own floor was what hid it. So the
     last resort multiplies the step until the labels agree, accepting as few
     as two ticks, which is what a count that spans one unit deserves. */
  if (!readsEvenly(r.ticks, fmt)) {
    for (const m of [2, 2.5, 4, 5, 10, 20, 50, 100]) {
      const cand = build(step * m);
      if (cand.ticks.length >= 2 && readsEvenly(cand.ticks, fmt)) { r = cand; break; }
    }
  }
  return r;
}

/* ------------------------------------------------------------------- line */

export function line(opts) {
  const {
    series = [], labels = [], height = 230, fmt = v => v, area = true,
    zeroBase = true, legend = true, markers = [],
    /* ⛔ A SINGLE LINE OVER MONTHS ANSWERS "WHAT HAPPENED" AND NOT "IS THAT
       GOOD". Five charts in the build were one bare series with nothing to
       read them against: net income over 24 months, cash over 18, the month by
       month picture, the team, and each contract on one scale. The figure is
       there and the shape is there, and a reader still cannot tell an ordinary
       month from a bad one. `rule` draws that line across the plot and names
       it, which is the same job the scatter's house-margin line already did. */
    rule = null, ruleLabel = '',
  } = opts;
  const id = 'c' + (++uid);
  const padL = 56, padR = 14, padT = 14, padB = 26;
  const iw = W - padL - padR, ih = height - padT - padB;
  const all = series.flatMap(s => s.values.filter(v => Number.isFinite(v)));
  if (!all.length) return `<div class="empty">Nothing to draw yet.</div>`;
  let lo = Math.min(...all), hi = Math.max(...all);
  if (zeroBase && lo > 0) lo = 0;
  if (lo === hi) { hi = hi || 1; lo = Math.min(0, lo); }

  /* ⛔ A ZERO BASELINE THAT HIDES THE MOVEMENT IS NOT HONESTY, IT IS A FLAT
     LINE. Cash ran $12.4M to $13.5M on an axis to $15M, so the whole series
     drew inside 14% of its own plot and eighteen months of movement read as a
     straight line with a large blue block under it. Measured at 14%, 28% and
     33% on three charts.

     The area fill is what makes zero mandatory: a filled shape says "this much
     of something", so its base has to be nothing. A bare line says only where
     the value went, and can start the axis where the data lives. So a series
     occupying less than two fifths of a zero-based plot drops the fill and
     brackets its own range, and the bottom gridline then prints a real figure
     rather than $0, which is the reader's signal that the axis moved. Nothing
     is hidden and nothing is implied that is not there. */
  let zoomed = false;
  /* ⚠️ Measured against the axis as it will settle, not the raw maximum. The
     round top can sit well above the data: restaurant cash cleared the test
     against its raw maximum and then drew in 38% of the plot it settled on,
     so the chart was flat and nothing zoomed (2026-11-04). */
  if (zeroBase && lo === 0 && hi > 0
    && (hi - Math.min(...all)) / (niceScale(0, hi, 4, ih, fmt).hi || hi) < 0.4) {
    const dLo = Math.min(...all), band = hi - dLo;
    lo = Math.max(0, dLo - band * 0.45);
    zoomed = lo > 0;
  }
  /* ⛔ A ROUND AXIS, NOT max x 0.75, AND THE SAME SOURCE AS THE GRIDLINES.
     The ticks were interpolated between the raw extremes, so a series peaking
     at $255K printed $255K, $191K, $128K and $64K up the side. `niceScale`
     settles the range and its ticks together, so the top gridline is always
     the top of the plot and no mark can sit above every line. */
  const drawArea = area && !zoomed;
  const sc = niceScale(lo, hi, 4, ih, fmt);
  lo = sc.lo; hi = sc.hi;
  const axisTicks = sc.ticks;
  const x = i => padL + (labels.length < 2 ? iw / 2 : iw * i / (labels.length - 1));
  const y = v => padT + ih - (v - lo) / (hi - lo) * ih;

  /* What the cursor needs: the plot box and one formatted value per series per
     point. Written as data rather than recomputed on every pointermove, so the
     readout cannot disagree with the line it is describing. */
  const hover = JSON.stringify({
    padL, iw, step: 'point', labels,
    series: series.map((sr, si) => ({
      name: sr.name, color: sr.color || seriesColour(si),
      values: sr.values.map(v => Number.isFinite(v) ? fmt(v) : null),
    })),
  });
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${height}" style="width:100%;height:auto"
    data-chart="line" data-id="${id}" role="img" data-hover="${esc(hover)}">`;
  svg += `<g class="axis">`;
  for (const t of axisTicks) {
    svg += `<line x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>`;
    svg += `<text x="${padL - 8}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end">${esc(fmt(t))}</text>`;
  }
  svg += `</g>`;
  if (lo < 0) svg += `<line class="zero" x1="${padL}" x2="${W - padR}" y1="${y(0)}" y2="${y(0)}"/>`;

  /* By width, not by count: see tickStep. A line chart in a narrow panel was
     drawing "Sep 26" on top of "Oct 26" for the same reason bars was. */
  const step = tickStep(labels, labels.length > 1 ? iw / (labels.length - 1) : iw);
  labels.forEach((l, i) => {
    if (i % step) return;
    svg += `<text x="${x(i).toFixed(1)}" y="${height - 7}" text-anchor="middle">${esc(l)}</text>`;
  });

  if (Number.isFinite(rule) && rule >= lo && rule <= hi) {
    const ry = y(rule);
    svg += `<line class="sc-rule" x1="${padL}" x2="${W - padR}"
      y1="${ry.toFixed(1)}" y2="${ry.toFixed(1)}"/>`;
    svg += `<text class="sc-rule-t" x="${W - padR - 4}" y="${(ry - 6).toFixed(1)}"
      text-anchor="end">${esc(ruleLabel || fmt(rule))}</text>`;
  }

  for (const m of markers) {
    const mx = x(m.at);
    svg += `<line x1="${mx}" x2="${mx}" y1="${padT}" y2="${padT + ih}"
      stroke="var(--ink-faint)" stroke-dasharray="4 3" opacity=".6"/>`;
    if (m.label) svg += `<text x="${mx + 4}" y="${padT + 10}" fill="var(--ink-faint)">${esc(m.label)}</text>`;
  }

  series.forEach((s, si) => {
    const c = s.color || seriesColour(si);
    const pts = s.values.map((v, i) => Number.isFinite(v) ? `${x(i).toFixed(1)},${y(v).toFixed(1)}` : null)
      .filter(Boolean);
    if (!pts.length) return;
    if (drawArea && series.length <= 2 && s.area !== false) {
      const base = y(Math.max(lo, 0)).toFixed(1);
      svg += `<path d="M${pts[0].split(',')[0]},${base} L${pts.join(' L')} L${pts[pts.length - 1].split(',')[0]},${base} Z"
        fill="${c}" opacity=".1"/>`;
    }
    svg += `<polyline points="${pts.join(' ')}" fill="none" stroke="${c}"
      stroke-width="${s.dash ? 1.8 : 2.4}" stroke-linejoin="round" stroke-linecap="round"
      ${s.dash ? 'stroke-dasharray="5 4"' : ''}/>`;
    s.values.forEach((v, i) => {
      if (!Number.isFinite(v)) return;
      /* `.pt` and its index: the readout lifts the dot at the month under the
         cursor so the eye lands on the right one. No title, because the
         position readout covers every series at once and a per-dot tooltip
         would answer a narrower question a second later. */
      svg += `<circle class="pt" data-i="${i}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}"
        r="${labels.length > 18 ? 2 : 3}" fill="${c}"/>`;
    });
  });

  svg += `<g class="cursor" style="display:none"><line class="hover-line" y1="${padT}" y2="${padT + ih}"/></g>`;
  svg += `<rect x="${padL}" y="${padT}" width="${iw}" height="${ih}" fill="transparent" class="hit"/>`;
  svg += `</svg>`;
  if (legend && series.length > 1) svg += legendOf(series);
  return svg;
}

function legendOf(series) {
  return `<div class="chart-legend">` + series.map((s, i) =>
    `<span><i style="background:${s.color || seriesColour(i)}${s.dash ? ';opacity:.6' : ''}"></i>${esc(s.name)}</span>`
  ).join('') + `</div>`;
}

/* ------------------------------------------------------------------- bars */

export function bars(opts) {
  const {
    values = [], labels = [], height = 220, fmt = v => v, color = null,
    target = null, overlay = null, overlayName = 'Budget', name = 'Actual',
    negativeOk = true, negColor = 'var(--bad)', ghost = false,
  } = opts;
  if (!values.length) return `<div class="empty">Nothing to draw yet.</div>`;
  const padL = 56, padR = 14, padT = 14, padB = 26;
  const iw = W - padL - padR, ih = height - padT - padB;
  const all = values.concat(overlay || []).concat(target ? [target] : []).filter(Number.isFinite);
  /* the range and the gridlines from one source, so the top gridline is the
     top of the plot: see niceScale() */
  const bsc = niceScale(negativeOk ? Math.min(0, Math.min(...all)) : 0,
    Math.max(...all, 0), 4, ih, fmt);
  let hi = bsc.hi, lo = bsc.lo;
  if (hi === lo) hi = lo + 1;
  const barTicks = bsc.ticks;
  const bw = iw / values.length;
  const y = v => padT + ih - (v - lo) / (hi - lo) * ih;
  const c = color || seriesColour(0);

  /* A bar sits in a BAND, not on a point, so the index is the band under the
     cursor. The readout carries the bar, the overlay line where there is one
     and the target where there is one, because all three are at that month. */
  const hover = JSON.stringify({
    padL, iw, step: 'band', labels,
    series: [{ name, color: c, values: values.map(v => Number.isFinite(v) ? fmt(v) : null) }]
      .concat(overlay ? [{
        name: overlayName, color: 'var(--ink)',
        values: overlay.map(v => Number.isFinite(v) ? fmt(v) : null),
      }] : [])
      .concat(Number.isFinite(target) ? [{
        name: 'Target', color: 'var(--warn)', values: values.map(() => fmt(target)),
      }] : []),
  });
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${height}" style="width:100%;height:auto"
    role="img" data-hover="${esc(hover)}">`;
  svg += `<g class="cursor" style="display:none"><line class="hover-line" y1="${padT}" y2="${padT + ih}"/></g>`;
  svg += `<g class="axis">`;
  for (const t of barTicks) {
    svg += `<line x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>`;
    svg += `<text x="${padL - 8}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end">${esc(fmt(t))}</text>`;
  }
  svg += `</g>`;
  if (lo < 0) svg += `<line class="zero" x1="${padL}" x2="${W - padR}" y1="${y(0)}" y2="${y(0)}"/>`;

  /* ⛔ THIN THE AXIS BY WIDTH, NOT BY COUNT.

     `ceil(n/12)` keeps twelve labels however little room each one has, so a
     twelve-month axis in a narrow panel printed "Sep 26" touching "Oct 26".
     What decides whether two labels collide is the space per bar against the
     width of the text, so that is what the step is computed from. The last
     label is dropped rather than drawn on top of its neighbour: a label that
     overlaps another is worse than a label that is not there, because the
     reader cannot tell which value it belongs to. */
  const step = tickStep(labels, bw);
  values.forEach((v, i) => {
    const bx = padL + bw * i + bw * 0.18;
    const w = bw * 0.64;
    const top = Math.min(y(v), y(0)), h = Math.max(1.5, Math.abs(y(v) - y(0)));
    /* ⛔ GHOST: THE PLAN AS A BAR BEHIND, NOT A TICK ABOVE.

       A 2px line floating over each bar makes the reader measure twelve gaps
       by eye to see a variance. Drawn as a pale bar behind the actual one, the
       shortfall is simply the part left uncovered, and an overshoot is the
       actual bar standing above it. Behind, so it can never hide the figure
       it is being compared with. */
    if (ghost && overlay && Number.isFinite(overlay[i])) {
      const gt = Math.min(y(overlay[i]), y(0)), gh = Math.max(1.5, Math.abs(y(overlay[i]) - y(0)));
      svg += `<rect x="${(bx - w * 0.09).toFixed(1)}" y="${gt.toFixed(1)}"
        width="${(w * 1.18).toFixed(1)}" height="${gh.toFixed(1)}"
        fill="var(--ink-faint)" opacity=".34" rx="2"/>`;
    }
    svg += `<rect x="${bx.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"
      fill="${v < 0 ? negColor : c}" rx="2"/>`;
    if (overlay && !ghost && Number.isFinite(overlay[i])) {
      svg += `<line x1="${(bx - w * 0.1).toFixed(1)}" x2="${(bx + w * 1.1).toFixed(1)}"
        y1="${y(overlay[i]).toFixed(1)}" y2="${y(overlay[i]).toFixed(1)}"
        stroke="var(--ink)" stroke-width="2" opacity=".75"/>`;
    }
    /* the plan's own edge stays visible on a ghost bar, so the comparison has
       a line to read against rather than only a change of tone */
    if (ghost && overlay && Number.isFinite(overlay[i])) {
      svg += `<line x1="${(bx - w * 0.09).toFixed(1)}" x2="${(bx + w * 1.09).toFixed(1)}"
        y1="${y(overlay[i]).toFixed(1)}" y2="${y(overlay[i]).toFixed(1)}"
        stroke="var(--ink-faint)" stroke-width="1.5"/>`;
    }
    if (i % step === 0) {
      svg += `<text x="${(padL + bw * i + bw / 2).toFixed(1)}" y="${height - 7}" text-anchor="middle">${esc(labels[i] || '')}</text>`;
    }
  });
  if (target !== null && Number.isFinite(target)) {
    svg += `<line x1="${padL}" x2="${W - padR}" y1="${y(target).toFixed(1)}" y2="${y(target).toFixed(1)}"
      stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="6 4"><title>Target ${esc(fmt(target))}</title></line>`;
  }
  svg += `</svg>`;
  if (overlay) {
    svg += `<div class="chart-legend"><span><i style="background:${c}"></i>${esc(name)}</span>
      <span><i style="${ghost
        ? 'background:var(--ink-faint);opacity:.45'
        : 'background:var(--ink);height:3px;border-radius:2px'}"></i>${esc(overlayName)}</span></div>`;
  }
  return svg;
}

/* ------------------------------------------------------------ stacked bars */

export function stack(opts) {
  const { rows = [], keys = [], labels = [], height = 240, fmt = v => v, names = {} } = opts;
  if (!rows.length) return `<div class="empty">Nothing to draw yet.</div>`;
  const padL = 56, padR = 14, padT = 14, padB = 26;
  const iw = W - padL - padR, ih = height - padT - padB;
  const totals = rows.map(r => keys.reduce((a, k) => a + Math.max(0, r[k] || 0), 0));
  const ssc = niceScale(0, Math.max(...totals, 1), 4, ih, fmt);
  const hi = ssc.hi;
  const bw = iw / rows.length;
  const y = v => padT + ih - v / hi * ih;

  /* Every band of the stack at the month under the cursor, so a reader sees
     what made up that column instead of hunting one segment at a time. */
  const hover = JSON.stringify({
    padL, iw, step: 'band', labels,
    series: keys.map((k, ki) => ({
      name: names[k] || k, color: seriesColour(ki),
      values: rows.map(r => Number.isFinite(r[k]) ? fmt(r[k]) : null),
    })),
  });
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${height}" style="width:100%;height:auto"
    role="img" data-hover="${esc(hover)}">`;
  svg += `<g class="cursor" style="display:none"><line class="hover-line" y1="${padT}" y2="${padT + ih}"/></g>`;
  svg += `<g class="axis">`;
  for (const t of ssc.ticks) {
    svg += `<line x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>`;
    svg += `<text x="${padL - 8}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end">${esc(fmt(t))}</text>`;
  }
  svg += `</g>`;
  /* By width, not by count: see tickStep. */
  const step = tickStep(labels, bw);
  rows.forEach((r, i) => {
    let acc = 0;
    const bx = padL + bw * i + bw * 0.18, w = bw * 0.64;
    keys.forEach((k, ki) => {
      const v = Math.max(0, r[k] || 0);
      if (v <= 0) return;
      const top = y(acc + v), h = Math.max(0.8, y(acc) - y(acc + v));
      svg += `<rect x="${bx.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"
        fill="${seriesColour(ki)}" rx="1.5"/>`;
      acc += v;
    });
    if (i % step === 0) {
      svg += `<text x="${(padL + bw * i + bw / 2).toFixed(1)}" y="${height - 7}" text-anchor="middle">${esc(labels[i] || '')}</text>`;
    }
  });
  svg += `</svg>`;
  svg += `<div class="chart-legend">` + keys.map((k, ki) =>
    `<span><i style="background:${seriesColour(ki)}"></i>${esc(names[k] || k)}</span>`).join('') + `</div>`;
  return svg;
}

/* ------------------------------------------------------------------ donut */

export function donut(opts) {
  const { parts = [], size = 190, fmt = v => v, center = null, centerLabel = '' } = opts;
  const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0);
  if (total <= 0) return `<div class="empty">Nothing to draw yet.</div>`;
  const r = size / 2 - 10, ir = r * 0.62, cx = size / 2, cy = size / 2;
  let a0 = -Math.PI / 2;
  let svg = `<svg class="chart donut" viewBox="0 0 ${size} ${size}"
    style="width:100%;max-width:${size}px;height:auto" role="img">`;
  parts.forEach((p, i) => {
    const frac = Math.max(0, p.value) / total;
    const a1 = a0 + frac * Math.PI * 2;
    const big = frac > 0.5 ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const xi1 = cx + ir * Math.cos(a1), yi1 = cy + ir * Math.sin(a1);
    const xi0 = cx + ir * Math.cos(a0), yi0 = cy + ir * Math.sin(a0);
    svg += `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${big} 1 ${x1.toFixed(1)},${y1.toFixed(1)}
      L${xi1.toFixed(1)},${yi1.toFixed(1)} A${ir},${ir} 0 ${big} 0 ${xi0.toFixed(1)},${yi0.toFixed(1)} Z"
      fill="${p.color || seriesColour(i)}"><title>${esc(p.name)}: ${esc(fmt(p.value))} (${(frac * 100).toFixed(1)}%)</title></path>`;
    a0 = a1;
  });
  if (center !== null) {
    svg += `<text x="${cx}" y="${cy - 2}" text-anchor="middle" class="readout" style="font-size:17px">${esc(center)}</text>`;
    /* 18 below the figure, not 14. A 17px figure's box measures 24px tall, not
       the ~20 its font size suggests, so 14 left one pixel of overlap on the
       word under it. Measured, not reasoned: "9.6%" bottom 836.7 against
       "kept" top 835.7. */
    svg += `<text x="${cx}" y="${cy + 18}" text-anchor="middle" style="font-size:10px">${esc(centerLabel)}</text>`;
  }
  svg += `</svg>`;
  return svg;
}

export function donutLegend(parts, fmt = v => v) {
  const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0) || 1;
  return `<div class="rows">` + parts.map((p, i) => `
    <div class="row-item" style="padding:7px 10px">
      <i class="dot" style="background:${p.color || seriesColour(i)};width:9px;height:9px;flex:0 0 9px"></i>
      <span class="grow">${esc(p.name)}</span>
      <b class="nowrap">${esc(fmt(p.value))}</b>
      <span class="muted nowrap" style="min-width:46px;text-align:right">${(p.value / total * 100).toFixed(1)}%</span>
    </div>`).join('') + `</div>`;
}

/* -------------------------------------------------------------- waterfall */

export function waterfall(opts) {
  const { items = [], height = 250, fmt = v => v } = opts;
  if (!items.length) return `<div class="empty">Nothing to draw yet.</div>`;
  const padL = 56, padR = 14, padT = 18, padB = 44;
  const iw = W - padL - padR, ih = height - padT - padB;
  let acc = 0; const tops = [];
  for (const it of items) {
    if (it.total) { tops.push({ from: 0, to: it.value }); acc = it.value; }
    else { tops.push({ from: acc, to: acc + it.value }); acc += it.value; }
  }
  const all = tops.flatMap(t => [t.from, t.to]);
  const wsc = niceScale(Math.min(0, ...all), Math.max(...all, 0), 4, ih, fmt);
  const hi = wsc.hi, lo = wsc.lo;
  const bw = iw / items.length;
  const y = v => padT + ih - (v - lo) / (hi - lo) * ih;

  let svg = `<svg class="chart" viewBox="0 0 ${W} ${height}" style="width:100%;height:auto" role="img">`;
  svg += `<g class="axis">`;
  for (const t of wsc.ticks) {
    svg += `<line x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>`;
    svg += `<text x="${padL - 8}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end">${esc(fmt(t))}</text>`;
  }
  svg += `</g>`;
  items.forEach((it, i) => {
    const t = tops[i];
    const bx = padL + bw * i + bw * 0.16, w = bw * 0.68;
    const top = Math.min(y(t.from), y(t.to)), h = Math.max(1.5, Math.abs(y(t.to) - y(t.from)));
    const fill = it.total ? 'var(--navy)' : (it.value >= 0 ? 'var(--good)' : 'var(--bad)');
    svg += `<rect x="${bx.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"
      fill="${fill}" rx="2"><title>${esc(it.name)}: ${esc(fmt(it.value))}</title></rect>`;
    if (i < items.length - 1 && !items[i + 1].total) {
      svg += `<line x1="${(bx + w).toFixed(1)}" x2="${(padL + bw * (i + 1) + bw * 0.16).toFixed(1)}"
        y1="${y(t.to).toFixed(1)}" y2="${y(t.to).toFixed(1)}" stroke="var(--rule)" stroke-dasharray="2 2"/>`;
    }
    const words = String(it.name).split(' ');
    const mid = (padL + bw * i + bw / 2).toFixed(1);
    /* A wrapped label's two lines were 11 units apart for text about 12 tall,
       so "Cost of" sat on "revenue" by a pixel on every dashboard. */
    const two = words.length > 2;
    /* 17 viewBox units between the lines, not 11. The chart scales down in a
       narrow panel, so a gap that clears the text at full width does not
       clear it at three quarters: measured at 9.9px of gap for 11px of text
       on education's dashboard, which is one pixel of overlap and still
       reads as broken. */
    svg += `<text x="${mid}" y="${height - (two ? 31 : 22)}" text-anchor="middle">${esc(words.slice(0, 2).join(' '))}</text>`;
    if (two) svg += `<text x="${mid}" y="${height - 14}" text-anchor="middle">${esc(words.slice(2).join(' '))}</text>`;
    svg += `<text x="${mid}" y="${(top - 5).toFixed(1)}" text-anchor="middle" class="readout"
      style="font-size:10.5px">${esc(fmt(it.value))}</text>`;
  });
  svg += `</svg>`;
  return svg;
}

/* --------------------------------------------------------------- cascade

   ⛔ A WATERFALL CANNOT DRAW A THIN-MARGIN P&L, AND THIS BUILD IS FULL OF THEM.

   `waterfall()` floats its bars correctly. That was never the defect. The
   defect is arithmetic: on a 3%-margin business, revenue sets a $50M axis and
   everything after cost of revenue lives in the bottom 7% of it. Measured on
   the construction dashboard, five of the seven steps drew under 8px, and one
   of those five was NET INCOME, which is the number the chart exists to
   deliver. A reader sees two bars and five lines on an axis.

   Raising a minimum bar height would fix the picture by making the bars lie,
   which is the one thing this chart must not do.

   So the BAR CARRIES THE RUNNING TOTAL, not the step. It shrinks from 100% of
   revenue to whatever net income is, so every row has a visible bar no matter
   how thin the margin, and the part removed at each line is drawn as the
   piece taken off the end of the previous row. The step's own value is a
   number in an aligned column, which is where a small number belongs and how
   a statement reads anyway: top to bottom, each line taking something off the
   one above. */
export function cascade(opts) {
  const { items = [], fmt = v => v } = opts;
  if (!items.length) return `<div class="empty">Nothing to draw yet.</div>`;
  const base = Math.abs(items[0].value) || 1;
  let acc = 0;
  const rows = items.map(it => {
    const from = it.total ? 0 : acc;
    const to = it.total ? it.value : acc + it.value;
    acc = to;
    return { ...it, from, to };
  });
  const pc = v => Math.max(0, Math.min(100, Math.abs(v) / base * 100));

  return `<div class="casc">` + rows.map((r, i) => {
    const last = i === rows.length - 1;
    const kept = pc(r.to);
    /* the slice removed (or added) at this line, drawn where it left the bar */
    const delta = Math.abs(pc(r.from) - pc(r.to));
    const down = r.value < 0;
    const lead = i === 0 || last;
    return `<div class="casc-row${lead ? ' lead' : ''}${last ? ' end' : ''}">
      <span class="casc-n">${esc(r.name)}</span>
      <span class="casc-track" aria-hidden="true">
        <i class="casc-keep" style="width:${kept.toFixed(2)}%"></i>
        ${!lead && delta > 0 ? `<i class="casc-cut${down ? '' : ' up'}"
          style="--at:${kept.toFixed(2)}%;width:${delta.toFixed(2)}%"></i>` : ''}
      </span>
      <b class="casc-v${down ? ' down' : ''}"
        data-r="${esc(r.name)}: ${esc(fmt(r.value))}">${esc(fmt(r.value))}</b>
      <span class="casc-run">${lead ? '' : esc(fmt(r.to))}</span>
    </div>`;
  }).join('') + `</div>`;
}

/* ----------------------------------------------------------- ranked h-bars */

export function hbars(opts) {
  const { rows = [], fmt = v => v, max = null, showNeg = true, height = 18, gap = 7,
    stacked = null } = opts;
  if (!rows.length) return `<div class="empty">Nothing to draw yet.</div>`;
  const hi = max !== null ? max : Math.max(...rows.map(r => Math.abs(r.value)), 1);

  /* ⛔ A NAME, A BAR, A VALUE AND A NOTE DO NOT FIT ON ONE LINE IN A QUARTER
     PANEL. The single-line form caps the name at 40% and ellipsises it, and
     in a col-4 panel the value and note columns claim 136px of about 280, so
     "Cost of revenue" rendered as "C" and "Payroll & benefits" as "P.". Seven
     rows of single letters is worse than the chart it replaced.

     Stacked puts the name and value on one line with the bar beneath, which
     needs no horizontal budget for the label at all. */
  /* ⛔ THE FORM FOLLOWS THE NAMES, AND IT DECIDES FOR ITSELF.

     The single-line row caps its name at 40% of the width, so the same chart
     reads fine at full width and cuts names to "Birmingham to Jackso",
     "Core Platform" and "Stonebridge Logistic" in a half panel. Three more
     panels were fixed one caller at a time before it was obvious that the
     chart already knows the names and should choose: anything long enough to
     be at risk gets the stacked form, which needs no horizontal budget for a
     label at all. A caller can still force either with true or false. */
  /* ⚠️ 18 WAS A CONSTANT FITTED TO THE THREE PANELS MEASURED FIRST, and the
     fourth was "Core Platform" at thirteen, clipped in a narrow panel because
     the cap is a share of a width this function never sees. So the length only
     decides which form READS better, and the cut is prevented structurally:
     the single-line name wraps instead of ellipsising (`.hb-n`), so no name is
     ever broken mid-word whatever the panel does. */
  const longest = Math.max(...rows.map(r => String(r.name || '').length));
  const stack = stacked === null ? longest > 18 : stacked;

  /* ⛔ ONE DOMINANT ROW FLATTENS EVERY OTHER BAR, AND A RANKING IS NOT A CHART.

     "Where the money goes" is seven categories of which cost of revenue is
     86%, so the other six render under 4% of their track and the reader gets
     the order from the sort rather than from the bars. That was the reason the
     donut was replaced, and the replacement inherited it: a sliver is a sliver
     whether it is a wedge or a bar. Measured across the build, 7 bar lists in
     this state, including two on the financial dashboard.

     So where MOST rows would be invisible, the tail is given its own scale and
     the chart SAYS SO on the divider. Every row keeps its real figure and its
     share, nothing is redrawn to a size it is not, and the alternative is six
     bars that carry no information at all. A long tail alone is left as it is:
     this only fires when the majority has stopped being drawn. */
  let tailHi = 0, tailAt = -1;
  if (rows.length >= 5) {
    const mags = rows.map(r => Math.abs(r.value));
    if (mags.filter(v => v / hi < 0.04).length / mags.length > 0.5) {
      /* ⚠️ THE TAIL IS A CONTIGUOUS GROUP, NOT A TEST APPLIED ROW BY ROW.
         Picking rows individually put "Kept" (5.9% of the largest, so above
         the threshold) BELOW a divider reading "the rest, scaled against each
         other" while it was still drawn on the main scale: it rendered as a
         stub beside tail bars at full width, which is the divider telling the
         reader something untrue about the row under it. The group runs from
         the first small row to the end and is scaled to its own largest
         member, so the label describes every row beneath it. */
      /* ⚠️ The split is "the dominant row, then everything else", not "the
         rows under 4%". Starting the tail at the first sliver left Payroll on
         the main scale at 5% of it, directly above a tail row of nearly the
         same value drawn at 100%: two bars whose sizes invert their figures,
         one line apart. The main scale keeps only rows that are legible ON it,
         so the tail begins at the first row under a quarter of the largest. */
      tailAt = rows.findIndex(r => Math.abs(r.value) / hi < 0.25);
      tailHi = Math.max(...rows.slice(tailAt).map(r => Math.abs(r.value))) || 0;
    }
  }
  const scaleFor = (r, i) => (tailAt >= 0 && i >= tailAt) ? tailHi : hi;
  const tailHead = (r, i) => (tailAt >= 0 && i === tailAt)
    ? `the rest, scaled against each other` : null;
  if (stack) {
    return `<div class="hb-stack" style="gap:${gap + 3}px">` + rows.map((r, ri) => {
      /* ⚠️ the index comes from map, never `indexOf`: two rows of equal value
         resolve to the same index and would take the wrong scale */
      const w = Math.abs(r.value) / scaleFor(r, ri) * 100;
      const neg = r.value < 0 && showNeg;
      /* ⛔ THE STACKED FORM CARRIES THE MARK TOO. It did not, and the panel
         that most needed stacking is the one whose note reads "The mark is the
         average, so a bar short of it is carrying less than its share": making
         it stacked to stop the names clipping would have deleted the thing the
         sentence points at and left the sentence behind. A form that drops
         what the prose promises is worse than the clipping it fixes.

         `head` starts a named group, which is how one list draws two sides. */
      const head = r.head || tailHead(r, ri);
      return (head ? `<div class="hb-s-head">${esc(head)}</div>` : '') + `<div class="hb-s">
        <div class="hb-s-top">
          <span class="hb-s-n">${esc(r.name)}</span>
          <b class="hb-s-v">${esc(fmt(r.value))}</b>
          ${r.note ? `<span class="hb-s-note">${r.note}</span>` : ''}
        </div>
        <span class="bar-cell" style="height:${height}px">
          <i style="width:${w.toFixed(1)}%;background:${neg ? 'var(--bad)' : (r.color || seriesColour(r.band ?? 0))}"></i>
          ${r.mark !== undefined ? `<u style="left:${(Math.abs(r.mark) / hi * 100).toFixed(1)}%"></u>` : ''}
        </span>
      </div>`;
    }).join('') + `</div>`;
  }
  return `<div class="rows" style="gap:${gap}px">` + rows.map((r, i) => {
    const w = Math.abs(r.value) / scaleFor(r, i) * 100;
    const neg = r.value < 0 && showNeg;
    /* ⚠️ A GROUP HEAD BELONGS TO BOTH FORMS. It was built only into the
       stacked one, so a panel that needed headings had to stack to get them,
       and stacking doubles a list's height: "The two sides" grew tall enough
       at col-4 to trip `go-wide`, went full width, and left the cash chart
       alone on its row with a third of it empty. The heading was the thing
       that panel needed; the height was a side effect of the only route to
       it. */
    const head = r.head || tailHead(r, i);
    return (head ? `<div class="hb-s-head">${esc(head)}</div>` : '')
      + `<div class="row-item" style="padding:6px 10px;gap:10px">
      <span class="grow hb-n" title="${esc(r.name)}">${esc(r.name)}</span>
      <span class="bar-cell" style="flex:1;height:${height}px">
        <i style="width:${w.toFixed(1)}%;background:${neg ? 'var(--bad)' : (r.color || seriesColour(r.band ?? 0))}"></i>
        ${r.mark !== undefined ? `<u style="left:${(Math.abs(r.mark) / hi * 100).toFixed(1)}%"></u>` : ''}
      </span>
      <b class="nowrap" style="min-width:74px;text-align:right">${esc(fmt(r.value))}</b>
      ${r.note ? `<span class="muted small nowrap" style="min-width:62px;text-align:right">${r.note}</span>` : ''}
    </div>`;
  }).join('') + `</div>`;
}

/* ----------------------------------------------------------------- bullet */

export function bullet(opts) {
  const { value, target, fmt = v => v, label = '', height = 44 } = opts;
  const hi = niceMax(Math.max(value, target) * 1.12);
  const w = W, padL = 2, iw = w - 4;
  const x = v => padL + Math.max(0, v) / hi * iw;
  return `<svg class="chart" viewBox="0 0 ${w} ${height}" style="width:100%;height:auto" role="img">
    <rect x="${padL}" y="${height / 2 - 11}" width="${iw}" height="22" fill="var(--rule-soft)" rx="4"/>
    <rect x="${padL}" y="${height / 2 - 11}" width="${(x(value) - padL).toFixed(1)}" height="22"
      fill="var(--accent)" rx="4"><title>${esc(label)}: ${esc(fmt(value))}</title></rect>
    <line x1="${x(target).toFixed(1)}" x2="${x(target).toFixed(1)}" y1="${height / 2 - 16}" y2="${height / 2 + 16}"
      stroke="var(--ink)" stroke-width="2.6"><title>Target ${esc(fmt(target))}</title></line>
    <text x="${padL + 8}" y="${height / 2 + 5}" fill="#fff" style="font-size:11.5px;font-weight:600">${esc(fmt(value))}</text>
    <text x="${(x(target) + 7).toFixed(1)}" y="${height / 2 - 20}" style="font-size:10.5px">${esc(fmt(target))}</text>
  </svg>`;
}

/* ------------------------------------------------------------------ spark */

export function spark(values, { width = 62, height = 20, color = null } = {}) {
  const v = values.filter(Number.isFinite);
  if (v.length < 2) return '';
  const lo = Math.min(...v), hi = Math.max(...v);
  const span = hi - lo || 1;
  const pts = v.map((d, i) => `${(i / (v.length - 1) * width).toFixed(1)},${(height - (d - lo) / span * height).toFixed(1)}`);
  const up = v[v.length - 1] >= v[0];
  const c = color || (up ? 'var(--good)' : 'var(--bad)');
  return `<svg class="strip-spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">
    <polyline points="${pts.join(' ')}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"/>
  </svg>`;
}

/* ---------------------------------------------------------------- scatter */

export function scatter(opts) {
  const { points = [], height = 260, xFmt = v => v, yFmt = v => v, xLabel = '', yLabel = '',
    /* `rule` draws a reference line across the plot: the house margin, a
       target, a break-even. Without it a reader has to hold the comparison
       figure in their head while scanning the dots, which is the whole job the
       chart was supposed to do for them. */
    rule = null, ruleLabel = '' } = opts;
  if (!points.length) return `<div class="empty">Nothing to draw yet.</div>`;
  /* ⚠️ A BUBBLE IS A DISC AROUND ITS VALUE, so the plot has to hold the glyph
     and not just the number. Tech's "Revenue against margin" sizes its bubbles
     by revenue and the biggest is r=16: its value sat correctly on the top
     gridline and 14px of the disc hung above it into the panel, reading as a
     circle escaping the chart. Measured, both themes. So every side reserves
     the largest radius drawn, which for the ordinary r=5 or 6 case changes
     nothing. */
  const maxR = Math.max(6, ...points.map(p => Number(p.r) || 0));
  const padL = Math.max(60, maxR + 8), padR = Math.max(18, maxR + 4);
  const padT = Math.max(16, maxR + 3), padB = Math.max(40, maxR + 26);
  const iw = W - padL - padR, ih = height - padT - padB;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  /* ⚠️ niceScale on BOTH axes, same reason as every other chart: the plot's
     edge and its last gridline were chosen separately, so a point could sit
     above the top line with nothing above it. Measured at +47px on
     construction's "Load against margin", the worst case anywhere in the
     build. */
  /* ⛔ THE SAME THIN-BAND RULE AS `line()`. A scatter forced through zero put
     "Revenue against margin" inside 11% of its own plot: every point in one
     stripe with nine tenths of the panel empty below it, which is a chart that
     has drawn nothing a reader can use. A scatter has no area fill to imply a
     base, so it may simply bracket its own data, and the axis labels say so. */
  const yDataLo = Math.min(...ys), yDataHi = Math.max(...ys);
  /* The chart says so itself when its series is flat because the DATA is
     flat and not because the axis wasted the plot, so a sweep can tell the
     two apart without a threshold fitted to one of them. */
  let flatByData = false;
  let yMin = Math.min(0, yDataLo);
  const yMax = Math.max(...ys);
  /* ⚠️ The band is judged against the range an anchored axis WOULD draw, not
     against the top alone: a margin series that dips negative anchors at its
     own minimum, not at zero, and the first cut of this tested `yMin === 0`
     and so skipped every chart with one negative point. */
  if ((yDataHi - yDataLo) / ((yMax - yMin) || 1) < 0.4) {
    const pad = (yDataHi - yDataLo) * 0.45 || Math.abs(yDataHi) * 0.1 || 1;
    const want = yDataLo >= 0 ? Math.max(0, yDataLo - pad) : yDataLo - pad;
    /* ⛔ ONLY ZOOM INTO A BAND THE FORMATTER CAN STILL TELL APART. Education's
       margins all sit near 21% and print at whole percents, so bracketing them
       gave four gridlines reading 21%, 21%, 21%, 21%: an axis that has stopped
       answering the only question an axis answers. Where the labels collapse,
       the anchored range stays and the series is simply flat, which is what
       the data is. */
    if (fmtSplits(yFmt, want, yMax)) yMin = want;
  }
  let ysc = niceScale(yMin, yMax, 4, ih, yFmt);
  /* ⛔ PADDING CANNOT FIX A DISC ON THE TOP GRIDLINE, because padding moves the
     gridline and the dot down together. The first attempt reserved maxR in
     padT and the overflow stayed at 14px, unchanged to the pixel. The room has
     to come from the SCALE: the top gridline is pushed up until the largest
     bubble's rim clears it. Two passes settle it, because extending the range
     can change the step. */
  /* ⚠️ AND THE BOTTOM NEEDS IT TOO, ONCE THE AXIS STOPS AT A REAL FIGURE.
     While every scatter sat on zero the lowest bubble had the whole plot
     beneath it, so only the top could overflow. Bracketing the data put the
     bottom gridline right under the lowest point and six charts then hung
     20px below it. A rule written for one end of an axis is a rule that has
     only been tested at one end, which is the third time that has cost
     something on this chart. */
  /* ⛔ EACH BUBBLE'S OWN RADIUS, NOT THE EXTREME POINT'S. The loop asked
     whether the HIGHEST value cleared the top gridline using the LARGEST
     radius drawn anywhere, which is two different bubbles: a big disc on a
     middling value overflows while a small dot at the maximum reports clear.
     Six charts stayed 20px out through a fix that looked right. */
  const rOf = p => Math.max(6, Number(p.r) || 0);
  for (let i = 0; i < 5; i++) {
    const span = ysc.hi - ysc.lo || 1;
    let needHi = -Infinity, needLo = Infinity;
    for (const p of points) {
      const room = rOf(p) / ih * span;
      needHi = Math.max(needHi, p.y + room);
      needLo = Math.min(needLo, p.y - room);
    }
    const overTop = needHi > ysc.hi;
    const underBot = ysc.lo > 0 && needLo < ysc.lo;
    if (!overTop && !underBot) break;
    ysc = niceScale(underBot ? Math.max(0, needLo) : ysc.lo,
      overTop ? needHi : ysc.hi, 4, ih, yFmt);
  }
  /* ⛔ WHETHER THE PLOT IS WASTED IS SETTLED BY THE AXIS THAT WAS DRAWN, not
     by whether the formatter could tell two numbers apart. Tech's margins all
     sit between 70% and 71%, and `fmtSplits` happily separates 70.5 from 80,
     so the zoom ran. But whole-percent labels cannot carry a grid finer than
     2%, so `niceScale` widened the range back to 70-80 and the points still
     filled 11% of it. The chart could not have done better: that is the data.
     Reading the mark off the settled scale says so for every such case at
     once, instead of naming them one at a time. */
  if ((yDataHi - yDataLo) / ((ysc.hi - ysc.lo) || 1) < 0.4) flatByData = true;

  const xsc = niceScale(Math.min(0, ...xs), Math.max(...xs), 4, iw / 2, xFmt);
  const xhi = xsc.hi, yhi = ysc.hi;
  const xlo = xsc.lo, ylo = ysc.lo;
  const X = v => padL + (v - xlo) / (xhi - xlo || 1) * iw;
  const Y = v => padT + ih - (v - ylo) / (yhi - ylo || 1) * ih;
  /* Every label already drawn, so a later one can avoid it. Declared with
     the rest of the geometry because the rule's caption is placed before the
     points and must share the list. */
  const placedLabels = [];

  let svg = `<svg class="chart"${flatByData ? ' data-flat="data"' : ''}
    viewBox="0 0 ${W} ${height}" style="width:100%;height:auto" role="img">`;
  svg += `<g class="axis">`;
  for (const t of ysc.ticks) {
    svg += `<line x1="${padL}" x2="${W - padR}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/>`;
    svg += `<text x="${padL - 8}" y="${(Y(t) + 3.5).toFixed(1)}" text-anchor="end">${esc(yFmt(t))}</text>`;
    /* ⛔ An axis tick is a label and a point label can land on one. The first
       collision pass only compared point labels with each other, and a point
       near the left edge put a name straight through "15%". */
    const tick = String(yFmt(t));
    placedLabels.push({ x: padL - 8 - tick.length * 2.7, y: Y(t) + 3.5,
      half: tick.length * 2.7 + 4 });
  }
  for (const t of xsc.ticks) {
    svg += `<text x="${X(t).toFixed(1)}" y="${height - 22}" text-anchor="middle">${esc(xFmt(t))}</text>`;
  }
  svg += `</g>`;
  if (Number.isFinite(rule) && rule >= ylo && rule <= yhi) {
    svg += `<line class="sc-rule" x1="${padL}" x2="${W - padR}"
      y1="${Y(rule).toFixed(1)}" y2="${Y(rule).toFixed(1)}"/>`;
    svg += `<text class="sc-rule-t" x="${W - padR - 4}" y="${(Y(rule) - 6).toFixed(1)}"
      text-anchor="end">${esc(ruleLabel || yFmt(rule))}</text>`;
    /* the rule's caption competes for space with the point labels, so it is
       placed first and they avoid it rather than landing on it */
    const cap = String(ruleLabel || yFmt(rule));
    placedLabels.push({ x: W - padR - 4 - cap.length * 2.9, y: Y(rule) - 6, half: cap.length * 2.9 + 4 });
  }
  /* ⛔ WHICH POINTS GET A LABEL.

     Labelling every point is right for six project managers and catastrophic
     for forty-eight trucks: Matt's screenshot of logistics Margin & drivers is
     a solid band of overlapping text with no figure readable in it. *"this is
     bad. i literally cannot read any of it"*.

     So a small set is labelled whole, and a large one is labelled only where a
     label earns its place: the extremes, which are the points a reader is
     looking for anyway. Everything else keeps its hover title, so nothing is
     lost, and the band in the middle stays a band instead of becoming mush.

     Colour follows the same reasoning. With six points the series colours tell
     one from another; with forty-eight they cycle and say nothing, so a large
     set is drawn in one colour and the chart stops implying a grouping it does
     not have. */
  const LABEL_ALL = 9;
  let labelled;
  if (points.length <= LABEL_ALL) {
    labelled = new Set(points.map((_, i) => i));
  } else {
    const byY = points.map((p, i) => i).sort((a, b) => points[b].y - points[a].y);
    const byX = points.map((p, i) => i).sort((a, b) => points[b].x - points[a].x);
    labelled = new Set([byY[0], byY[1], byY[byY.length - 1], byY[byY.length - 2],
      byX[0], byX[byX.length - 1]].filter(i => i !== undefined));
  }
  const many = points.length > LABEL_ALL;
  /* ⛔ COLOUR HERE CARRIES NOTHING THE POSITION DOES NOT ALREADY SAY, so six
     unrelated hues were five more than the chart needed and the only rainbow
     left in the build. One hue stepped by rank keeps the dots distinguishable
     and stops the panel competing with the brand. */
  const rank = new Map(points.map((p, i) => [i, p])
    .sort((a, b) => b[1].y - a[1].y).map(([i], r) => [i, r]));
  points.forEach((p, i) => {
    const who = p.name || p.label || '';
    svg += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${p.r || (many ? 5 : 6)}"
      fill="${p.color || (many ? 'var(--accent)' : ramp('var(--accent)', points.length, rank.get(i) || 0))}"
      opacity="${many ? '.6' : '.78'}" stroke="var(--paper)" stroke-width="1.4">
      <title>${esc(who)} · ${esc(xLabel)} ${esc(xFmt(p.x))} · ${esc(yLabel)} ${esc(yFmt(p.y))}</title></circle>`;
    if (who && labelled.has(i)) {
      /* Even the extremes can land on each other. A label that would overlap
         one already drawn is dropped rather than stacked: the dot and its
         hover title still carry the point, and two names written over each
         other carry neither. */
      const tx = X(p.x), ty = Y(p.y) - 11;
      const half = who.length * 2.9 + 4;
      const clash = placedLabels.some(q =>
        Math.abs(q.y - ty) < 12 && Math.abs(q.x - tx) < half + q.half);
      if (!clash) {
        placedLabels.push({ x: tx, y: ty, half });
        svg += `<text class="sc-pt" x="${tx.toFixed(1)}" y="${ty.toFixed(1)}"
          text-anchor="middle">${esc(who)}</text>`;
      }
    }
  });
  svg += `<text x="${W / 2}" y="${height - 5}" text-anchor="middle">${esc(xLabel)}</text>`;
  svg += `<text x="12" y="${padT + ih / 2}" text-anchor="middle" transform="rotate(-90 12 ${padT + ih / 2})">${esc(yLabel)}</text>`;
  svg += `</svg>`;
  return svg;
}

/* ------------------------------------------------------------------- wire */

/* Give every line chart a cursor guideline. Called once after a page renders.
   Pointer only: a page that never gets a pointer is unaffected, and nothing
   here waits on visible time, because a headless browser has none. */
/* ===========================================================================
   HOVER: every chart answers the cursor.

   Matt, 2026-11-02: *"all items should be interactive. when i hover over an
   item, it needs to show data on each line or dot or whatever"*.

   Before this, a line chart moved a bare guideline with no figures on it, and
   everything else relied on the browser's own `<title>` tooltip: a grey box
   that waits a second, cannot be styled, shows one mark at a time, and on a
   two-line chart never tells you what the OTHER line was doing at the same
   month, which is the whole question that chart exists to answer.

   One mechanism, two shapes, because charts come in two kinds:

   1. An X-INDEXED chart (line, bars, stack) answers for a POSITION: the month
      under the cursor, with every series' value at that month, so the reader
      compares rather than guesses. It carries its figures as `data-hover`.
   2. A MARK chart (donut, scatter, heatmap, waterfall, slope, bars within a
      row list) answers for the THING under the cursor. Any element carrying
      `data-r` reports it, in SVG or in plain HTML, so the schedule's rows and
      the churn strip work the same way without knowing about this file.

   ⛔ The native `<title>` tooltip is REMOVED at wire time rather than left to
   appear a second later underneath the real readout. Its text becomes the
   mark's `data-r` and its `aria-label`, so what a screen reader gets is
   unchanged and what a pointer gets is ours.

   The handler is delegated from the page root, so it survives a re-render
   without rewiring, and it reads geometry only on the frames it has to. */

let tip = null;

function tipEl() {
  if (tip && tip.isConnected) return tip;
  tip = document.createElement('div');
  /* ⛔ `hoverout`, NOT `readout`. `.readout` already means "a value drawn
     inside a chart" (the donut's centre figure, the waterfall's bar labels),
     and giving the tooltip the same name made one selector mean two things
     again, hours after `.delta` taught exactly that lesson. It cost an hour:
     every test that asked the document for `.readout` found a waterfall's SVG
     text first and reported the feature broken on the pages that have one. */
  tip.className = 'hoverout';
  tip.setAttribute('role', 'status');
  tip.setAttribute('aria-live', 'polite');
  tip.hidden = true;
  document.body.append(tip);
  return tip;
}

function showTip(html, ev) {
  const el = tipEl();
  el.innerHTML = html;
  el.hidden = false;
  /* Measured, then placed: the box has to exist before its width is known, and
     it flips rather than running off the edge of a narrow window. */
  const b = el.getBoundingClientRect();
  const pad = 14;
  let left = ev.clientX + pad;
  let top = ev.clientY + pad;
  if (left + b.width > window.innerWidth - 8) left = ev.clientX - b.width - pad;
  if (top + b.height > window.innerHeight - 8) top = ev.clientY - b.height - pad;
  el.style.left = `${Math.max(8, left)}px`;
  el.style.top = `${Math.max(8, top)}px`;
}

function hideTip() {
  if (tip) { tip.hidden = true; }
}

/* `<title>` becomes `data-r`, once, so the native tooltip never fires. */
function liftTitles(root) {
  for (const t of root.querySelectorAll('svg title')) {
    const owner = t.parentElement;
    const text = (t.textContent || '').trim();
    t.remove();
    if (!owner || !text) continue;
    if (!owner.dataset.r) owner.dataset.r = text;
    if (!owner.getAttribute('aria-label')) owner.setAttribute('aria-label', text);
  }
  /* The same for plain HTML marks, whose native tooltip is a `title=`. */
  for (const el of root.querySelectorAll('[title]:not([data-keep-title])')) {
    const text = el.getAttribute('title');
    if (!text) continue;
    el.removeAttribute('title');
    if (!el.dataset.r) el.dataset.r = text;
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', text);
  }
}

/* A readout for one mark: whatever the chart wrote, split on the separator it
   already used so the name reads as a heading and the figures as rows. */
function markHTML(text) {
  const bits = String(text).split(' · ');
  const head = bits.shift();
  return `<b>${esc(head)}</b>${bits.length
    ? `<div class="ro-rows">${bits.map(x => `<div>${esc(x)}</div>`).join('')}</div>` : ''}`;
}

/* A readout for a position: the label, then one row per series, each with the
   series' own colour so a reader matches it to the line without counting. */
function indexHTML(data, i) {
  return `<b>${esc(data.labels[i] || '')}</b>
    <div class="ro-rows">${data.series.map(sr => `
      <div class="ro-row">
        <i style="background:${esc(sr.color || 'var(--accent)')}"></i>
        <span>${esc(sr.name)}</span>
        <em>${esc(sr.values[i] === undefined || sr.values[i] === null ? '—' : sr.values[i])}</em>
      </div>`).join('')}</div>`;
}

export function wire(root) {
  liftTitles(root);
  if (root.dataset.hoverWired) return;
  root.dataset.hoverWired = '1';

  const move = ev => {
    const mark = ev.target.closest ? ev.target.closest('[data-r]') : null;
    if (mark) { showTip(markHTML(mark.dataset.r), ev); return; }

    const svg = ev.target.closest ? ev.target.closest('svg[data-hover]') : null;
    if (!svg) { hideTip(); clearCursor(root); return; }

    let data;
    try { data = JSON.parse(svg.dataset.hover); } catch { hideTip(); return; }
    const box = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const scale = vb.width / box.width;
    const px = (ev.clientX - box.left) * scale;
    const n = data.labels.length;
    if (!n) { hideTip(); return; }
    /* Nearest index by the chart's own plot geometry, which it wrote down, so
       this never has to know how a particular chart lays its points out. */
    const t = (px - data.padL) / Math.max(1, data.iw);
    const i = Math.max(0, Math.min(n - 1,
      Math.round(data.step === 'band' ? t * n - 0.5 : t * (n - 1))));
    showTip(indexHTML(data, i), ev);

    const cursor = svg.querySelector('g.cursor');
    if (cursor) {
      const cx = data.padL + (data.step === 'band'
        ? data.iw * (i + 0.5) / n : (n < 2 ? data.iw / 2 : data.iw * i / (n - 1)));
      cursor.style.display = '';
      for (const ln of cursor.querySelectorAll('line')) {
        ln.setAttribute('x1', cx); ln.setAttribute('x2', cx);
      }
    }
    for (const dot of svg.querySelectorAll('.pt')) {
      dot.classList.toggle('on', Number(dot.dataset.i) === i);
    }
  };

  root.addEventListener('pointermove', move, { passive: true });
  root.addEventListener('pointerleave', () => { hideTip(); clearCursor(root); });
  /* A touch is a tap, not a hover: show the readout and let the next tap
     elsewhere clear it, rather than leaving a box stranded on screen. */
  root.addEventListener('pointerdown', ev => {
    if (ev.pointerType === 'touch') move(ev);
  }, { passive: true });
  addEventListener('scroll', hideTip, { passive: true });
}

function clearCursor(root) {
  for (const c of root.querySelectorAll('svg g.cursor')) c.style.display = 'none';
  for (const d of root.querySelectorAll('svg .pt.on')) d.classList.remove('on');
}

/* ---------------------------------------------------------------- heatmap */

/* rows x months, one cell per reading. The shape a person scans for "which
   one, and since when", which no line chart with twenty series can answer. */
export function heatmap(opts) {
  const {
    rows = [], cols = [], fmt = v => v, height = null,
    label = '', good = 'high', rowWidth = 150,
  } = opts;
  if (!rows.length || !cols.length) return `<div class="empty">Nothing to draw yet.</div>`;

  const all = rows.flatMap(r => r.values.filter(Number.isFinite));
  if (!all.length) return `<div class="empty">Nothing to draw yet.</div>`;
  const lo = Math.min(...all), hi = Math.max(...all);
  const span = hi - lo || 1;

  const cell = 28, gap = 3;
  const w = rowWidth + cols.length * (cell + gap) + 10;
  const h = (height || (rows.length * (cell + gap) + 34));
  const step = Math.max(1, Math.ceil(cols.length / 12));

  let svg = `<svg class="chart" viewBox="0 0 ${w} ${h}" style="width:100%;height:auto" role="img">`;
  cols.forEach((c, i) => {
    if (i % step && i !== cols.length - 1) return;
    svg += `<text x="${rowWidth + i * (cell + gap) + cell / 2}" y="20" text-anchor="middle"
      style="font-size:10px">${esc(c)}</text>`;
  });
  rows.forEach((r, ri) => {
    const y = 30 + ri * (cell + gap);
    svg += `<text x="${rowWidth - 10}" y="${y + cell * 0.68}" text-anchor="end"
      style="font-size:11.5px">${esc(trim(r.name, 22))}</text>`;
    r.values.forEach((v, ci) => {
      const x = rowWidth + ci * (cell + gap);
      if (!Number.isFinite(v)) {
        svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3"
          fill="var(--rule-soft)" opacity=".5"/>`;
        return;
      }
      const t = (v - lo) / span;                      /* 0 worst .. 1 best */
      const score = good === 'high' ? t : 1 - t;
      svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3"
        fill="var(--accent)" opacity="${band(score)}"><title>${esc(r.name)} · ${esc(cols[ci])}: ${esc(fmt(v))}</title></rect>`;
    });
  });
  svg += `</svg>`;
  /* The key. Matt, 2026-11-02, on this exact grid: *"job progress build makes
     absolutely no sense and it needs some kind of key to explain what you are
     trying to state"*. The old key read "percent complete to the left, higher
     to the right", which describes the swatches and explains nothing about the
     grid. A key has to say what one cell IS, what the shade means, and what it
     deliberately does not mean. */
  return svg + `<div class="hm-key">
    <div class="hm-ramp">
      <span>${esc(fmt(lo))}</span>
      ${[0.04, 0.3, 0.5, 0.75, 0.96].map(t =>
        `<i style="opacity:${band(t)}"></i>`).join('')}
      <span>${esc(fmt(hi))}</span>
    </div>
    <p>One square is one month's ${esc(label || 'reading')} for that row. The paler the
      square the lower the reading, the more solid the higher.
      ${good === 'high' ? '' : 'Lower is the better end here. '}Shade says
      <b>more or less</b>, never better or worse: this measure carries no target,
      and a red-to-green grid would claim one.</p>
  </div>`;
}

/* A five-step ramp in the brand's own color, not a red-to-green one.

   A heatmap of a LEVEL says more or less, not good or bad: a contract that is
   20% complete is not failing, and coloring it red says it is. Red and green
   are for a measure with a target, which these grids do not carry. Five steps
   rather than a smooth gradient, so a reader can name the step a cell is in. */
function band(score) {
  const steps = [0.16, 0.34, 0.54, 0.76, 1];
  const i = Math.min(steps.length - 1, Math.max(0, Math.floor(score * steps.length)));
  return steps[i];
}

/* Trim from the MIDDLE, not the end.

   ⛔ "Stonebridge Logistics Park" and "Stonebridge Logistics Center" both cut
   to "Stonebridge Logistics…" and the grid showed two different contracts
   under one label, which is worse than useless: a reader picks the wrong row.
   The distinguishing part of a name is usually its tail, so both ends survive. */
/* How many labels an axis can show without them touching.

   `slot` is the viewBox width each label gets. A character of the axis font is
   about 5.4 viewBox units wide, and labels need a gap between them, so the step
   is how many slots the widest label needs. Measured rather than assumed: a
   twelve-month axis in a narrow panel was drawing "Sep 26" on top of "Oct 26"
   because the old step counted labels and never looked at the room. */
function tickStep(labels, slot) {
  const widest = labels.reduce((m, l) => Math.max(m, String(l || '').length), 0);
  const need = widest * 5.4 + 10;
  return Math.max(1, Math.ceil(need / Math.max(1, slot)));
}

function trim(s, n) {
  s = String(s);
  if (s.length <= n) return s;
  const tail = Math.max(4, Math.floor((n - 1) * 0.38));
  const head = n - 1 - tail;
  return s.slice(0, head) + '…' + s.slice(s.length - tail);
}

/* --------------------------------------------------------- small multiples */

/* One tiny chart per unit, all on the same scale, so the shapes are
   comparable at a glance. Twenty of these beat one chart with twenty lines. */
export function multiples(opts) {
  const { rows = [], fmt = v => v, labels = [], shared = true } = opts;
  if (!rows.length) return `<div class="empty">Nothing to draw yet.</div>`;
  const all = rows.flatMap(r => r.values.filter(Number.isFinite));
  const gLo = Math.min(...all, 0), gHi = Math.max(...all, 1);

  return `<div class="multiples">` + rows.map((r, i) => {
    const vals = r.values.filter(Number.isFinite);
    const lo = shared ? gLo : Math.min(...vals, 0);
    const hi = shared ? gHi : Math.max(...vals, 1);
    const span = (hi - lo) || 1;
    const W = 150, H = 44;
    const pts = r.values.map((v, j) => Number.isFinite(v)
      ? `${(j / Math.max(1, r.values.length - 1) * W).toFixed(1)},${(H - (v - lo) / span * H).toFixed(1)}`
      : null).filter(Boolean);
    const show = r.fmt || fmt;
    const last = vals[vals.length - 1];
    const first = vals[0];
    const up = last >= first;
    /* A small multiple is a chart in its own right, so it answers like one:
       what it is, where it started, where it is now, and which way it went. */
    const first0 = vals[0], last0 = vals[vals.length - 1];
    const dir = !Number.isFinite(first0) || !Number.isFinite(last0) ? ''
      : last0 > first0 ? ' · rising' : last0 < first0 ? ' · falling' : ' · flat';
    const rd = `${r.name} · ${Number.isFinite(first0) ? show(first0) : '—'} to ${Number.isFinite(last0) ? show(last0) : '—'}${dir}`;
    return `<div class="mult" data-r="${esc(rd)}" ${r.click ? `data-click="${esc(r.click)}" tabindex="0"` : ''}>
      <div class="mult-head"><b>${esc(trim(r.name, 20))}</b>
        <span class="lastval ${up ? 'up' : 'down'}">${esc(show(last))}</span></div>
      <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"
        style="width:100%;height:44px">
        <polyline points="${pts.join(' ')}" fill="none" stroke="${seriesColour(i % 6)}"
          stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      </svg>
      ${r.note ? `<div class="mult-note">${r.note}</div>` : ''}
    </div>`;
  }).join('') + `</div>`;
}

/* --------------------------------------------------------------- two sided */

/* Two stacked columns on one scale. For a balance sheet this says in a glance
   what a table of thirty rows says slowly: what the money is in, what it is
   owed to, and that the two sides are the same height. */
export function twoSided(opts) {
  /* `tints` names one base colour per side, so each column is one hue in
     steps. Without it the two columns shared a six-hue cycle and the sides
     were indistinguishable: see ramp(). */
  const { left = {}, right = {}, fmt = v => v, height = 340,
    tints = ['var(--accent)', 'var(--navy)'] } = opts;
  const lTotal = left.parts.reduce((a, p) => a + Math.max(0, p.value), 0);
  const rTotal = right.parts.reduce((a, p) => a + Math.max(0, p.value), 0);
  const hi = Math.max(lTotal, rTotal) || 1;
  if (!hi) return `<div class="empty">Nothing to draw yet.</div>`;

  /* Labels sit OUTSIDE the bars. Inside, white on a mid-tone fill measures
     about 3:1, and a value a reader has to squint at is worse than no value. */
  const W = 860, padT = 36, padB = 34;
  const ih = height - padT - padB;
  const colW = 170, lx = 215, rx = W - 215 - colW;

  const column = (side, x, total, offset, labelsOn) => {
    let acc = 0, out = '';
    side.parts.forEach((p, idx) => {
      const i = idx + offset;
      const v = Math.max(0, p.value);
      if (v <= 0) return;
      const h = v / hi * ih;
      const y = padT + ih - (acc + v) / hi * ih;
      out += `<rect x="${x}" y="${y.toFixed(1)}" width="${colW}" height="${Math.max(1, h).toFixed(1)}"
        fill="${ramp(side.tint || tints[offset ? 1 : 0], side.parts.length, idx)}" rx="2"
        ><title>${esc(p.name)}: ${esc(fmt(v))} (${(v / total * 100).toFixed(1)}%)</title></rect>`;
      if (h > 26) {
        const tx = labelsOn === 'left' ? x - 14 : x + colW + 14;
        const anchor = labelsOn === 'left' ? 'end' : 'start';
        const cy = y + h / 2;
        out += `<text x="${tx}" y="${(cy - 3).toFixed(1)}" text-anchor="${anchor}"
          style="font-size:11.5px;fill:var(--ink-faint)">${esc(p.name)}</text>`;
        out += `<text x="${tx}" y="${(cy + 16).toFixed(1)}" text-anchor="${anchor}"
          style="font-size:14px;font-weight:700;fill:var(--ink)"
          >${esc(fmt(v))}</text>`;
        out += `<line x1="${labelsOn === 'left' ? x - 9 : x + colW + 9}" x2="${labelsOn === 'left' ? x : x + colW}"
          y1="${cy.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="var(--rule)"/>`;
      }
      acc += v;
    });
    out += `<text x="${x + colW / 2}" y="${padT - 16}" text-anchor="middle"
      style="font-size:12.5px;font-weight:600;fill:var(--ink)">${esc(side.name)}</text>`;
    out += `<text x="${x + colW / 2}" y="${height - 12}" text-anchor="middle"
      style="font-size:14px;font-weight:700;fill:var(--ink)">${esc(fmt(total))}</text>`;
    return out;
  };

  const tie = Math.abs(lTotal - rTotal);
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${height}" style="width:100%;height:auto" role="img">`;
  svg += `<line x1="24" x2="${W - 24}" y1="${padT + ih}" y2="${padT + ih}" stroke="var(--rule)"/>`;
  svg += column(left, lx, lTotal, 0, 'left');
  svg += column(right, rx, rTotal, left.parts.length, 'right');
  svg += `<path d="M${lx + colW + 10} ${padT + ih / 2}h${rx - lx - colW - 20}"
    stroke="var(--rule)" stroke-dasharray="4 4"/>`;
  svg += `<text x="${(lx + colW + rx) / 2}" y="${padT + ih / 2 - 9}" text-anchor="middle"
    style="font-size:11.5px;fill:var(--ink-faint)">${tie < 1 ? 'balances' : 'out by ' + esc(fmt(tie))}</text>`;
  svg += `</svg>`;
  return svg;
}

/* -------------------------------------------------------------------- dial */

/* One ratio, its band, and where it sits. A number in a box says 1.84; this
   says 1.84 and whether that is comfortable. */
export function dial(opts) {
  const {
    value, min = 0, max = 3, bands = [], fmt = v => v.toFixed(2),
    label = '', note = '', size = 190,
  } = opts;
  if (!Number.isFinite(value)) return `<div class="empty">Not available.</div>`;
  const r = size / 2 - 16, cx = size / 2, cy = size / 2 + 6;
  const a0 = Math.PI * 0.86, a1 = Math.PI * 2.14;          /* open at the bottom */
  const at = v => a0 + (Math.max(min, Math.min(max, v)) - min) / (max - min) * (a1 - a0);
  const pt = (a, rad) => `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
  const arc = (from, to, rad, w, color, op = 1) => {
    const big = (to - from) > Math.PI ? 1 : 0;
    return `<path d="M${pt(from, rad)} A${rad},${rad} 0 ${big} 1 ${pt(to, rad)}"
      fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  };

  /* ⛔ The cap goes through a custom property so the container can govern it.
     This emitted a bare `max-width:${size}px`, and an inline style beats a
     stylesheet rule, so `.dials svg.dial { max-width: ... }` was a dead
     declaration: the property fed the grid track and nothing else, while the
     comment beside it claimed it fed both. The fallback keeps a dial used
     outside a `.dials` grid drawing at its own size. */
  /* An explicit `size` becomes `--dial-size`, which the stylesheet prefers over
     the container's `--dial-cap`, so a caller that asks for 120 gets 120 even
     inside a `.dials` grid. A default caller sets nothing and the container
     governs, which is the way round a default should work. */
  /* ⛔ THE FALLBACK CHAIN GOES IN THE INLINE DECLARATION, BECAUSE INLINE WINS.

     The first fix set `--dial-size` inline and put the rule that consults it
     in the stylesheet, where it could never apply: the property was set and
     read by nothing, and inside a `.dials` grid a caller's 120 was still
     overridden by 190, exactly as before. That is the same inline-beats-
     stylesheet precedence this fix existed to correct, reintroduced by the
     fix itself. Measured by the publishing session, not reasoned.

     One declaration, one chain, in the place that wins: the caller's size if
     it asked, else the container's cap, else the component's own default. */
  const sized = opts.size !== undefined ? `--dial-size:${size}px;` : '';
  let svg = `<svg class="chart dial" viewBox="0 0 ${size} ${size}"
    style="${sized}width:100%;max-width:var(--dial-size, var(--dial-cap, ${size}px));height:auto" role="img">`;
  svg += arc(a0, a1, r, 13, 'var(--rule-soft)');
  for (const b of bands) {
    svg += arc(at(b.from), at(b.to), r, 13, b.color || 'var(--rule)', .9);
  }
  svg += arc(a0, at(value), r, 13, 'var(--accent)');
  const tip = at(value);
  svg += `<circle cx="${cx + r * Math.cos(tip)}" cy="${cy + r * Math.sin(tip)}" r="7"
    fill="var(--paper)" stroke="var(--accent)" stroke-width="3"/>`;
  svg += `<text x="${cx}" y="${cy + 2}" text-anchor="middle"
    style="font-size:24px;font-weight:700;fill:var(--ink)"
    font-family="var(--font-display)">${esc(fmt(value))}</text>`;
  svg += `<text x="${cx}" y="${cy + 22}" text-anchor="middle"
    style="font-size:10.5px;fill:var(--ink-faint)">${esc(label)}</text>`;
  svg += `</svg>`;
  return svg + (note ? `<p class="small muted" style="text-align:center;margin:8px 0 0">${note}</p>` : '');
}

/* ------------------------------------------------------------------- slope */

/* Two periods, one line per item. A reader follows the line rather than
   comparing two bars that sit apart, which is what a year-on-year read is. */
export function slope(opts) {
  const { rows = [], fmt = v => v, from = 'Then', to = 'Now', height = 320 } = opts;
  if (!rows.length) return `<div class="empty">Nothing to draw yet.</div>`;
  const all = rows.flatMap(r => [r.from, r.to]).filter(Number.isFinite);
  const lo = Math.min(...all, 0), hi = Math.max(...all);
  const span = (hi - lo) || 1;
  const W = 720, padT = 34, padB = 26, padL = 150, padR = 150;
  const ih = height - padT - padB;
  const y = v => padT + ih - (v - lo) / span * ih;
  const x0 = padL, x1 = W - padR;

  /* LABELS DO NOT SIT ON TOP OF EACH OTHER.

     Two statement lines a few thousand dollars apart land on the same pixel
     row, and the chart printed "Net income" over "EBITDA" and "$1.4M" over
     "$1.3M" on Matt's screen: *"overlapping text on the graph"*. A chart whose
     labels collide is worse than a table, because it looks like data and reads
     like damage.

     Each side is laid out on its own: sort by the position each label wants,
     walk down pushing any that would touch its neighbour, then walk back up if
     the pushing ran past the bottom. The DOT stays on the real value and only
     the text moves, with a hairline joining the two wherever they separated,
     so nothing is misreported. */
  const place = (wanted) => {
    /* 17 units, not 14. A text box is about 1.2x its font size, so an 11.5
       font needs ~14 just to touch: measured, 14 still collided. */
    const MIN = 17;
    const order = wanted.map((v, i) => ({ i, want: v, at: v }))
      .sort((a, b) => a.want - b.want);
    for (let k = 1; k < order.length; k++) {
      if (order[k].at - order[k - 1].at < MIN) order[k].at = order[k - 1].at + MIN;
    }
    const over = order.length ? order[order.length - 1].at - (padT + ih) : 0;
    if (over > 0) {
      for (const o of order) o.at -= over;
      for (let k = order.length - 2; k >= 0; k--) {
        if (order[k + 1].at - order[k].at < MIN) order[k].at = order[k + 1].at - MIN;
      }
    }
    /* ⛔ And not into the column heading above the plot. The first pass pushed
       labels DOWN and then, when they ran off the bottom, lifted the whole
       stack: the topmost one climbed into "October 2026" and collided with it
       instead of with another value. A ceiling is as necessary as a floor. */
    const under = order.length ? padT + 2 - order[0].at : 0;
    if (under > 0) for (const o of order) o.at += under;
    const out = [];
    for (const o of order) out[o.i] = o.at;
    return out;
  };

  const live = rows.filter(r => Number.isFinite(r.from) && Number.isFinite(r.to));
  const leftAt = place(live.map(r => y(r.from)));
  const rightAt = place(live.map(r => y(r.to)));

  let svg = `<svg class="chart" viewBox="0 0 ${W} ${height}" style="width:100%;height:auto" role="img">`;
  svg += `<line x1="${x0}" x2="${x0}" y1="${padT}" y2="${padT + ih}" stroke="var(--rule)"/>`;
  svg += `<line x1="${x1}" x2="${x1}" y1="${padT}" y2="${padT + ih}" stroke="var(--rule)"/>`;
  svg += `<text x="${x0}" y="${padT - 14}" text-anchor="middle"
    style="font-size:12px;font-weight:600;fill:var(--ink-faint)">${esc(from)}</text>`;
  svg += `<text x="${x1}" y="${padT - 14}" text-anchor="middle"
    style="font-size:12px;font-weight:600;fill:var(--ink-faint)">${esc(to)}</text>`;

  live.forEach((r, i) => {
    const up = r.to >= r.from;
    const c = r.color || (up ? 'var(--good)' : 'var(--bad)');
    const ly = y(r.from), ry = y(r.to);
    svg += `<line x1="${x0}" y1="${ly.toFixed(1)}" x2="${x1}" y2="${ry.toFixed(1)}"
      stroke="${c}" stroke-width="2.2" opacity=".85"
      ><title>${esc(r.name)}: ${esc(fmt(r.from))} to ${esc(fmt(r.to))}</title></line>`;
    svg += `<circle cx="${x0}" cy="${ly.toFixed(1)}" r="4" fill="${c}"/>`;
    svg += `<circle cx="${x1}" cy="${ry.toFixed(1)}" r="4" fill="${c}"/>`;
    if (Math.abs(leftAt[i] - ly) > 1.5) {
      svg += `<line x1="${x0 - 7}" y1="${ly.toFixed(1)}" x2="${x0 - 7}" y2="${leftAt[i].toFixed(1)}"
        stroke="${c}" stroke-width="1" opacity=".4"/>`;
    }
    if (Math.abs(rightAt[i] - ry) > 1.5) {
      svg += `<line x1="${x1 + 7}" y1="${ry.toFixed(1)}" x2="${x1 + 7}" y2="${rightAt[i].toFixed(1)}"
        stroke="${c}" stroke-width="1" opacity=".4"/>`;
    }
    svg += `<text x="${x0 - 12}" y="${(leftAt[i] + 4).toFixed(1)}" text-anchor="end"
      style="font-size:11.5px">${esc(r.name)}</text>`;
    svg += `<text x="${x1 + 12}" y="${(rightAt[i] + 4).toFixed(1)}"
      style="font-size:11.5px">${esc(fmt(r.to))}</text>`;
  });
  svg += `</svg>`;
  return svg;
}

/* Joiners and leavers under a headcount line.

   ⛔ It is drawn in the LINE CHART'S OWN GEOMETRY and not as a row of flex
   divs. The first cut was a flex row, so its columns sat at (i+0.5)/n while
   the line's points sit at i/(n-1) with a 56-unit left gutter: every bar was
   a little way from the month it belonged to, and the reader would have read
   the wrong month's churn against the line above it. Two charts that share an
   axis have to share the arithmetic that draws the axis. */
export function churn({ labels = [], up = [], down = [], height = 54 }) {
  const padL = 56, padR = 14;
  const iw = W - padL - padR;
  const peak = Math.max(1, ...up, ...down);
  const half = (height - 10) / 2;
  const x = i => padL + (labels.length < 2 ? iw / 2 : iw * i / (labels.length - 1));
  const bw = Math.max(4, Math.min(18, iw / Math.max(1, labels.length) * 0.52));
  const mid = height / 2;
  const bars = labels.map((lab, i) => {
    const hUp = (up[i] || 0) / peak * half;
    const hDn = (down[i] || 0) / peak * half;
    const cx = x(i) - bw / 2;
    return `<g><title>${lab}: ${up[i] || 0} joined, ${down[i] || 0} left</title>
      <rect x="${cx.toFixed(1)}" y="${(mid - hUp).toFixed(1)}" width="${bw.toFixed(1)}"
        height="${Math.max(1, hUp).toFixed(1)}" rx="2" class="ch-up"/>
      <rect x="${cx.toFixed(1)}" y="${mid.toFixed(1)}" width="${bw.toFixed(1)}"
        height="${Math.max(1, hDn).toFixed(1)}" rx="2" class="ch-dn"/></g>`;
  }).join('');
  return `<svg class="chart churn-svg" viewBox="0 0 ${W} ${height}" preserveAspectRatio="none"
    role="img" aria-label="People who joined and left each month">
    ${bars}<line x1="${padL}" x2="${W - padR}" y1="${mid}" y2="${mid}" class="ch-axis"/></svg>`;
}
