/* Shared page furniture: the verdict a page opens on, the figure strip, panels,
   tables. Pages compose these rather than writing markup, so every page in
   every industry carries the same material. */

import { esc, icon } from './icons.js?v=02d4c24167';
import { spark } from './chart.js?v=02d4c24167';
import * as F from './fmt.js?v=02d4c24167';

export function verdict({ title, body, figs = [] }) {
  return `<section class="verdict">
    <h2>${title}</h2>
    ${body ? `<p>${body}</p>` : ''}
    ${figs.length ? `<div class="vstrip">${figs.map(f => `
      <div class="vfig"><div class="vlabel">${esc(f.label)}</div>
      <div class="vvalue">${F.figure(f.value)}</div></div>`).join('')}</div>` : ''}
  </section>`;
}

/* A figure in the strip can be SWAPPED by the client: pass `slot` and the
   figure wears a quiet control that opens the picker for that position. The
   control is only drawn where a slot is given, so a strip inside a page that
   is not the client's to configure stays plain. */
/* ⚖️ Matt, 2026-11-02, on the settings tab built an hour earlier: *"that just
   seems like a really roundabout way to do it and it's out of the way. is
   there a tasteful way to have the KPI picker function integrated into the KPI
   strip itself? more seamless and real time?"* He is right, so the figure
   itself is the control.

   The LABEL is the button, because that is the word naming what the figure is
   and so the thing a person reaches for when they want it to be something
   else. No gear, no second affordance: a card with a tool on it is a card
   wearing its own plumbing.

   Every option carries its real value in the markup, so moving through the
   list swaps the figure in place with no fetch and no repaint: you read the
   actual number before you choose it. That is what makes it real time rather
   than a list of names you pick blind and then go and look at. */
export function strip(items, opts = {}) {
  /* ⛔ `pairs` lays the cards two across instead of letting them wrap.
     `flex: 1 1 158px` fits three in a half-width panel and drops the fourth
     onto a row of its own, which is the ragged last row this build removed
     from every other grid. Four facts belong in a 2x2, not a 3+1. */
  return `<div class="strip${opts.pairs ? ' pairs' : ''}">${items.map(i => {
    const pick = Number.isInteger(i.slot) && i.options && i.options.length > 1;
    return `<div class="strip-item${pick ? ' pickable' : ''}" ${pick ? `data-slot="${i.slot}"` : ''}>
      <div class="strip-label">${pick
      ? `<button class="fig-open" aria-haspopup="listbox" aria-expanded="false">
           <span>${esc(i.label)}</span>${icon('caret', 11)}</button>`
      : esc(i.label)}</div>
      <div class="strip-value">${F.figure(i.value)}</div>
      ${i.note ? `<div class="strip-note" data-own="${esc(i.note)}">${i.note}</div>`
      : `<div class="strip-note" data-own=""></div>`}
      ${i.spark ? spark(i.spark) : ''}
      ${pick ? `<div class="fig-menu" role="listbox" hidden>${i.options.map(o =>
        `<button role="option" class="fig-opt" data-id="${esc(o.id)}"
           data-fig="${esc(F.figure(o.value))}" data-note="${esc(o.note || '')}"
           aria-selected="${o.id === i.id}">
           <span class="fo-n">${esc(o.label)}</span>
           <span class="fo-v">${F.figure(o.value)}</span>
         </button>`).join('')}</div>` : ''}
    </div>`;
  }).join('')}</div>`;
}

/* The strip's own behavior: open on the label, preview on hover or arrow,
   commit on click, restore on Escape or a click away. It writes nothing and
   reads nothing beyond the markup above, so the preview cannot disagree with
   what a commit will produce. */
export function wireStrip(host, commit) {
  const own = new WeakMap();
  const close = (item, restore = true) => {
    const menu = item.querySelector('.fig-menu');
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    item.classList.remove('open');
    item.querySelector('.fig-open')?.setAttribute('aria-expanded', 'false');
    if (restore) show(item, null);
  };
  const show = (item, opt) => {
    const v = item.querySelector('.strip-value');
    const n = item.querySelector('.strip-note');
    const mine = own.get(item);
    if (v) v.innerHTML = opt ? opt.dataset.fig : mine.value;
    if (n) n.innerHTML = opt ? esc(opt.dataset.note) : mine.note;
    item.classList.toggle('previewing', !!opt);
  };

  for (const item of host.querySelectorAll('.strip-item.pickable')) {
    own.set(item, {
      value: item.querySelector('.strip-value')?.innerHTML || '',
      note: item.querySelector('.strip-note')?.innerHTML || '',
    });
    const open = item.querySelector('.fig-open');
    const menu = item.querySelector('.fig-menu');
    open.addEventListener('click', ev => {
      ev.stopPropagation();
      const wasOpen = !menu.hidden;
      for (const other of host.querySelectorAll('.strip-item.pickable')) close(other);
      if (wasOpen) return;
      menu.hidden = false;
      item.classList.add('open');
      open.setAttribute('aria-expanded', 'true');
      (menu.querySelector('[aria-selected="true"]') || menu.firstElementChild)?.focus();
    });
    menu.addEventListener('pointerover', ev => {
      const opt = ev.target.closest('.fig-opt');
      if (opt) show(item, opt);
    });
    menu.addEventListener('focusin', ev => {
      const opt = ev.target.closest('.fig-opt');
      if (opt) show(item, opt);
    });
    menu.addEventListener('pointerleave', () => show(item, null));
    menu.addEventListener('click', ev => {
      const opt = ev.target.closest('.fig-opt');
      if (!opt) return;
      ev.stopPropagation();
      close(item, false);
      commit(Number(item.dataset.slot), opt.dataset.id);
    });
    menu.addEventListener('keydown', ev => {
      const opts = [...menu.querySelectorAll('.fig-opt')];
      const at = opts.indexOf(document.activeElement);
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        const next = opts[(at + (ev.key === 'ArrowDown' ? 1 : opts.length - 1)) % opts.length];
        next?.focus();
      } else if (ev.key === 'Escape') {
        ev.preventDefault(); close(item); open.focus();
      }
    });
  }
  /* one document listener per paint, removed with the markup it belongs to */
  const away = ev => {
    if (!host.isConnected) { document.removeEventListener('click', away); return; }
    for (const item of host.querySelectorAll('.strip-item.pickable')) {
      if (!item.contains(ev.target)) close(item);
    }
  };
  document.addEventListener('click', away);
}

/* A panel head wears a tile with its icon, as Core BI's sys-tile does. The
   icon is DERIVED from the title where a caller does not name one, so every
   panel in the build gets one without eighty call sites being edited, and a
   caller can always override with `ico`. The fallback is deliberately neutral:
   a wrong icon is worse than a plain one, so anything unmatched gets the
   generic mark rather than a guess. */
const TILE_WORDS = [
  [/budget|plan|forecast|target|go.get/i, 'target'],
  [/cash|working capital|receivab|payab|aging|billing|billed|invoic/i, 'wallet'],
  [/balance|position|equity|asset|liabilit/i, 'scale'],
  [/margin|profit|gross|ebitda|cascade/i, 'wedge'],
  [/revenue|sales|income|earned|turnover/i, 'bars'],
  [/cost|expense|overhead|payroll|labor|labor|spend/i, 'ledger'],
  [/month|year|quarter|season|pattern|trend|cumulative|history/i, 'clock'],
  [/rule|threshold|flag|needs you|watch|exception|control|close|sign.off/i, 'flag'],
  [/people|manager|principal|supervisor|driver|staff|headcount|who carries/i, 'people'],
  [/pipeline|pursuit|opportunit|weighted/i, 'funnel'],
  [/document|paperwork|file|pack|statement|report/i, 'doc'],
  [/connect|integration|software|reading|source|feed/i, 'link'],
  [/level|role|permission|access|view/i, 'lock'],
  [/brand|logo|color|color|typeface|look/i, 'sun'],
  [/grid|portfolio|every |all |list|table/i, 'grid'],
  [/map|state|region|territor|lane|route/i, 'compass'],
];

export function tileFor(title, ico) {
  if (ico) return ico;
  for (const [re, name] of TILE_WORDS) if (re.test(title)) return name;
  return 'pulse';
}

export function panel({ title, note, right = '', body, foot = '', col = 12, pad = true, ico = '' }) {
  return `<section class="panel col-${col}">
    ${title ? `<div class="panel-head">
      <span class="p-tile">${icon(tileFor(title, ico), 17)}</span>
      <div><h3>${esc(title)}</h3>
      ${note ? `<p>${note}</p>` : ''}</div>${right ? `<div class="right">${right}</div>` : ''}</div>` : ''}
    <div class="panel-body" ${pad ? '' : 'style="padding:0"'}>${body}</div>
    ${foot ? `<div class="panel-foot">${foot}</div>` : ''}
  </section>`;
}

export function table({ cols, rows, foot = '', maxHeight = null }) {
  const head = `<tr>${cols.map(c =>
    `<th ${c.n ? 'class="n"' : ''} ${c.w ? `style="width:${c.w}"` : ''}>${esc(c.name)}</th>`).join('')}</tr>`;
  const body = rows.map(r => {
    const attrs = r.click ? ` data-click="${esc(r.click)}" tabindex="0"` : '';
    const cls = r.cls ? ` class="${r.cls}"` : '';
    return `<tr${attrs}${cls}>${r.cells.map((cell, i) =>
      `<td ${cols[i] && cols[i].n ? 'class="n"' : ''}>${cell}</td>`).join('')}</tr>`;
  }).join('');
  const t = `<table class="t"><thead>${head}</thead><tbody>${body}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}</table>`;
  return maxHeight ? `<div class="scroll" style="max-height:${maxHeight}">${t}</div>` : `<div class="scroll">${t}</div>`;
}

export function pageHead({ eyebrow, title, answer, motif = '' }) {
  const body = `<div>
    ${eyebrow ? `<div class="page-eyebrow">${esc(eyebrow)}</div>` : ''}
    <h1 class="page-title">${esc(title)}</h1>
    ${answer ? `<p class="page-answer">${answer}</p>` : ''}
  </div>`;
  return motif
    ? `<header class="page-head with-motif"><span class="head-motif">${motif}</span>${body}</header>`
    : `<header class="page-head">${body}</header>`;
}

export function fresh(q, s) {
  const month = q.view.month;
  const tentative = month > q.closed;
  return `<div class="fresh ${tentative ? 'stale' : ''}">
    <i class="dot"></i>
    <span>${!q.closed ? '<b>No month is signed off yet.</b> Every figure here is tentative.' : tentative
      ? `<b>${F.monthName(month, true)} is tentative.</b> ${F.monthName(q.closed, true)} is the last month signed off by both finance and the chief executive.`
      : `Signed off through ${F.monthName(q.closed, true)}.`}</span>
    <span class="muted">· ${s.connectedIn('finance').length
      ? `reading ${esc(s.connectedIn('finance')[0].name)}` : 'no ledger connected'}</span>
  </div>`;
}

export function lockedPanel(role, what, col = 12) {
  return `<section class="panel col-${col}"><div class="locked">
    <span class="tag"><i class="dot"></i>Not at this level</span>
    <p class="muted" style="max-width:48ch;margin:0 auto">${esc(what)} is above
    <b>${esc(role.name)}</b>. The level, and what it reaches, is set in Settings &rsaquo; View levels.</p>
  </div></section>`;
}

export function kpiStrip(q, s, ids) {
  return strip(ids.map(id => {
    const k = q.kpi(id);
    return {
      label: k.label,
      value: display(k),
      note: noteOf(k),
      spark: k.spark,
    };
  }));
}

export function display(k) {
  switch (k.display) {
    case 'usd': return F.money(k.value);
    case 'usdExact': return F.money(k.value, {}) === F.HIDDEN_MARK
      ? F.HIDDEN_MARK : F.exact(k.value, k.value < 100 ? 2 : 0);
    case 'pct': return F.pct(k.value, 1);
    case 'num': return F.num(k.value);
    case 'days': return F.num(k.value, 0) + ' days';
    case 'months': return F.num(k.value, 1) + ' mo';
    case 'ratio': return F.ratio(k.value);
    case 'ratio1': return F.num(k.value, 1);
    case 'profitable': return 'None';
    default: return F.num(k.value);
  }
}

function noteOf(k) {
  const bits = [];
  if (Number.isFinite(k.delta)) {
    bits.push(F.deltaTag(k.delta, { invert: !!k.invert, unit: k.deltaUnit || '%' })
      + ` <span class="muted">on prior period</span>`);
  }
  if (k.note) bits.push(`<span class="muted">${esc(k.note)}</span>`);
  return bits.join('<br>');
}

export function statusTag(text, kind = '') {
  return `<span class="tag ${kind}"><i class="dot"></i>${esc(text)}</span>`;
}

export function btn(label, { act = '', arg = '', kind = '', ico = '', sm = false } = {}) {
  return `<button class="btn ${kind} ${sm ? 'sm' : ''}" ${act ? `data-act="${esc(act)}"` : ''}
    ${arg ? `data-arg="${esc(arg)}"` : ''}>${ico ? icon(ico, 15) : ''}${esc(label)}</button>`;
}

export function sentence(parts) {
  return parts.filter(Boolean).join(' ');
}
