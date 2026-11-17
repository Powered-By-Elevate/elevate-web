/* The calm page (Matt, 2026-11-16, holding up his photography books page:
   *"it is just a throw-up of data and the information is all in your face at
   once ... All items that are important on each page, laid out well, not
   overwhelming, you know exactly where everything is and what to find it and
   how to read it"*, then *"this goes for the entire thing"*).

   The rules every page built from these follows:
   1. One header: the page's name, one plain line on where it stands, a stamp.
   2. At most four figures, each said once on the whole page.
   3. Each section answers ONE question: one picture, and the facts beside it.
   4. Detail waits behind a fold (+), never on the face of the page.
   5. Hairlines, not boxes. One accent for "done", one second tone for "ahead",
      grey for the plan. The same meaning on every page. */

import { esc } from './icons.js?v=a2aa80d688';
import * as F from './fmt.js?v=a2aa80d688';
import { spark } from './chart.js?v=a2aa80d688';

export function head({ eyebrow, title, line = '', stamp = '', mark = '' }) {
  return `<header class="cm-head">${mark ? `<span class="cm-mark">${mark}</span>` : ''}
    <div class="cm-titles">
      ${eyebrow ? `<span class="cm-eyebrow">${esc(eyebrow)}</span>` : ''}
      <h1 class="cm-h1">${esc(title)}</h1>
      ${line ? `<p class="cm-line">${line}</p>` : ''}
      <!--src-->
    </div>
    ${stamp ? `<div class="cm-stamp">${stamp}</div>` : ''}
  </header>`;
}

/* figs: [{ label, value, sub }], four at most */
export function figures(figs) {
  const list = figs.filter(Boolean).slice(0, 4);
  return `<div class="cm-figs n${list.length}">${list.map(f => `
    <div class="cm-fig"><span class="cm-eyebrow">${esc(f.label)}</span>
      <span class="cm-v">${F.figure(f.value)}</span>
      ${f.sub ? `<span class="cm-sub">${f.sub}</span>` : ''}
      ${f.spark && f.spark.filter(Number.isFinite).length > 1 ? `<span class="cm-spark">${spark(f.spark, { width: 132, height: 26 })}</span>` : ''}
      ${f.go ? `<button class="cm-fig-go" data-act="go" data-arg="${esc(f.go)}" aria-label="Open ${esc(f.label)}"></button>` : ''}</div>`).join('')}</div>`;
}

/* One question. `aside` sits beside the picture (usually facts()), `fold`
   holds the detail behind a +. */
export function section({ title, note = '', body = '', aside = '', fold = '', foldLabel = 'Show the detail', right = '', id = '', src = '' }) {
  return `<section class="cm-card"${id ? ` id="${esc(id)}"` : ''}>
    <div class="cm-sec-head"><h2 class="cm-h2">${esc(title)}</h2>${src ? `<span class="cm-from">${esc(src)}</span>` : ''}
      ${note ? `<p class="cm-note">${note}</p>` : ''}${right ? `<div class="cm-right">${right}</div>` : ''}</div>
    ${aside ? `<div class="cm-split"><div class="cm-main">${body}</div><div class="cm-aside">${aside}</div></div>` : body}
    ${fold ? details(foldLabel, fold) : ''}
  </section>`;
}

export function details(label, html) {
  return `<details class="cm-fold"><summary>${esc(label)}</summary><div class="cm-fold-b">${html}</div></details>`;
}

/* rows: [{ k, v, sub, hl }] */
export function facts(rows) {
  return `<div class="cm-facts">${rows.filter(Boolean).map(r => `
    <div class="cm-fact${r.hl ? ' hl' : ''}"><span class="k">${esc(r.k)}${r.sub ? `<small>${r.sub}</small>` : ''}</span>
      <span class="v">${r.v}</span></div>`).join('')}</div>`;
}

/* A bridge from a starting total to an ending total, each line's bar hanging
   from where the running total stood, with an optional fold under any line. */
export function bridge(items, fmt) {
  const top = Math.max(1, ...items.map(i => Math.abs(i.total ? i.value : 0)), Math.abs(items[0].value));
  const W = v => Math.max(0.4, Math.abs(v) / top * 100);
  let level = 0;
  return `<div class="cm-bridge">${items.map(i => {
    let bar;
    if (i.total) { level = i.value; bar = `<i class="b pos" style="left:0;width:${W(i.value)}%"></i>`; }
    else {
      const from = level, to = level + i.value;
      const lo = Math.min(from, to);
      bar = `<i class="b ${i.value < 0 ? 'cost' : 'pos'}" style="left:${Math.max(0, lo / top * 100)}%;width:${W(i.value)}%"></i>`;
      level = to;
    }
    return `<div class="cm-brow${i.total ? ' total' : ''}${i.grand ? ' grand' : ''}">
      <span class="lab">${esc(i.name)}</span><div class="track">${bar}</div>
      <span class="amt">${fmt(i.value)}</span>
      ${i.fold ? `<div class="cm-brow-fold">${details(i.foldLabel || 'What is in it', i.fold)}</div>` : ''}</div>`;
  }).join('')}</div>`;
}

export function legend(items) {
  return `<div class="cm-legend">${items.map(([cls, t]) => `<span><i class="sw ${cls}"></i>${esc(t)}</span>`).join('')}</div>`;
}

export function page(html) { return `<div class="cm">${html}</div>`; }

export function list(rows) {
  return `<ul class="cm-list">${rows.map(r => `<li><span>${r[0]}</span><span class="n">${r[1]}</span></li>`).join('')}</ul>`;
}
