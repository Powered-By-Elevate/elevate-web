/* The front door.

   Every world in its own brand, construction and retail first, before a single extract is loaded. It
   reads data/summary.json (about 3 KB) rather than the industry files,
   which are 2.6 MB between them, so the first screen paints immediately.

   This is the first fifteen seconds of every demo, which is why it is a place
   of its own rather than a row of cards at the bottom of a page. */

import * as F from './fmt.js?v=cfc9ac23e4';
import { esc, brandMark, INDUSTRY_ICON, icon } from './icons.js?v=cfc9ac23e4';
import { scene } from './scenes.js?v=cfc9ac23e4';
import { spark } from './chart.js?v=cfc9ac23e4';

let cards = null;

export async function loadCards(base = '') {
  if (cards) return cards;
  const res = await fetch(`${base}data/summary.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`summary.json: ${res.status}`);
  cards = (await res.json()).industries;
  return cards;
}

export function cardsNow() { return cards; }

export function show(cfg, onPick, current = null) {
  if (!cards) return;
  let host = document.getElementById('chooser');
  if (!host) {
    host = document.createElement('div');
    host.id = 'chooser';
    document.body.appendChild(host);
  }
  host.innerHTML = markup(cfg, current);
  host.hidden = false;
  document.body.classList.add('choosing');

  const quiet = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || navigator.webdriver;
  if (!quiet) {
    host.querySelectorAll('.world').forEach((el, i) => {
      el.style.animationDelay = `${60 + i * 55}ms`;
      el.classList.add('enter');
    });
    host.querySelector('.ch-head').classList.add('enter');
  }

  host.addEventListener('click', ev => {
    const pick = ev.target.closest('[data-world]');
    if (pick) { hide(); onPick(pick.dataset.world); return; }
    if (ev.target.closest('[data-ch-close]')) hide();
  });
  const esc0 = ev => {
    if (ev.key === 'Escape' && current) { hide(); document.removeEventListener('keydown', esc0); }
  };
  document.addEventListener('keydown', esc0);
}

export function hide() {
  const host = document.getElementById('chooser');
  if (host) host.hidden = true;
  document.body.classList.remove('choosing');
}

function markup(cfg, current) {
  const brands = cfg.brands.brands;
  return `<div class="ch-ground"></div>
    <div class="ch-inner">
      <header class="ch-head">
        <div class="ch-brand">${esc(cfg.product.product.name)}
          <span>${esc(cfg.product.product.vendor)}</span></div>
        <h1>One build.<br>Any industry.</h1>
        <p>${esc(cfg.product.product.pitch)}</p>
        ${cfg.product.product.lead ? `<p class="ch-lead">${esc(cfg.product.product.lead)}</p>` : ''}
        <div class="ch-acts">
        ${current ? `<button class="ch-close" data-ch-close>${icon('close', 15)}Back to
          ${esc(cards.find(c => c.id === current) ? cards.find(c => c.id === current).company : 'the dashboard')}</button>` : ''}
          <button class="ch-close ch-staff" data-act="console">${icon('shield', 15)}Elevate staff
            <span>Console</span></button>
        </div>
      </header>
      <div class="worlds">
        ${cards.map(c => world(c, brands[c.brand], c.id === current,
          (cfg.product.product.leads || []).includes(c.id))).join('')}
      </div>
      <footer class="ch-foot">
        <span>${esc(cfg.product.demoNotice)}</span>
        <span>${cards.length} industries · one codebase ·
          ${cards.reduce((a, c) => a + c.units, 0)} sample ${'units'}</span>
      </footer>
    </div>`;
}

function world(c, brand, isCurrent, leads) {
  const p = brand.palette;
  return `<button class="world" data-world="${esc(c.id)}" aria-current="${!!isCurrent}"
    style="--w-accent:${p.accent};--w-deep:${p.navy};--w-lift:${p.accentLift};--w-tint:${p.tint}">
    <span class="w-scene">
      ${scene(c.id, p, { height: 150 })}
      ${leads ? '<span class="w-lead">Where we lead</span>' : ''}
      <span class="w-band">
        <span class="w-mark">${brandMark(brand, 38)}</span>
        <span class="w-id">
          <b>${esc(c.company)}</b>
          <span>${esc(c.short)}</span>
        </span>
        <span class="w-ico">${icon(INDUSTRY_ICON[c.id] || 'grid', 20)}</span>
      </span>
    </span>
    <span class="w-body">
      <span class="w-label">${esc(c.label)}</span>
      <span class="w-value">${F.figure(fmtValue(c))}</span>
      <span class="w-tag">${esc(c.tagline)}</span>
      <span class="w-foot">
        <span class="w-unit">${esc(c.units)} ${esc(c.many)}</span>
        ${spark(c.spark, { width: 54, height: 18, color: p.accent })}
      </span>
    </span>
    <span class="w-go">${isCurrent ? 'Open again' : 'Open this demo'} ${icon('arrow', 15)}</span>
  </button>`;
}

export function fmtValue(c) {
  switch (c.fmt) {
    case 'usd': return F.usd(c.value);
    case 'usdExact': return '$' + c.value.toLocaleString('en-US',
      { minimumFractionDigits: c.value < 100 ? 2 : 0, maximumFractionDigits: c.value < 100 ? 2 : 0 });
    case 'pct': return c.value.toFixed(1) + '%';
    case 'num': return c.value.toLocaleString('en-US');
    default: return String(c.value);
  }
}
