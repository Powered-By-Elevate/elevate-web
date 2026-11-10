/* Presentation mode: one panel per screen, arrow keys to advance.

   This is how a finance lead walks a board through the dashboard, so it is a
   feature rather than demo polish. It does NOT re-render the page: it marks
   the sections already on screen and lets CSS show one at a time, which means
   charts keep their state, nothing is rebuilt between slides, and advancing
   costs nothing.

   Every page works, because every page is already built from the same
   furniture: a verdict or a page head, then panels. */

import { esc, icon, brandMark } from './icons.js?v=02d4c24167';

const state = { on: false, at: 0, slides: [], ctx: null };

export function isOn() { return state.on; }
export function index() { return state.at; }
export function count() { return state.slides.length; }

export function enter(ctx) {
  state.ctx = ctx;
  collect();
  if (!state.slides.length) return false;
  state.on = true;
  state.at = 0;
  document.body.classList.add('presenting');
  paint();
  return true;
}

export function exit() {
  if (!state.on) return;
  state.on = false;
  document.body.classList.remove('presenting');
  for (const el of state.slides) {
    el.removeAttribute('data-slide');
    el.removeAttribute('data-current');
  }
  state.slides = [];
  const bar = document.getElementById('present-bar');
  if (bar) bar.remove();
}

/* Re-read the page's sections. Called on entry and after any re-render, so
   changing company or month mid-presentation keeps working. */
export function collect() {
  const page = document.getElementById('page');
  if (!page) { state.slides = []; return; }
  const found = [...page.querySelectorAll(':scope > .verdict, :scope > .page-head, :scope > .strip, :scope > .grid > .panel, :scope > .panel')];
  state.slides = found;
  found.forEach((el, i) => el.setAttribute('data-slide', String(i)));
  if (state.at >= found.length) state.at = Math.max(0, found.length - 1);
}

export function go(n) {
  if (!state.on || !state.slides.length) return;
  state.at = Math.max(0, Math.min(state.slides.length - 1, n));
  paint();
}

export function next() { go(state.at + 1); }
export function prev() { go(state.at - 1); }

function paint() {
  state.slides.forEach((el, i) => {
    if (i === state.at) el.setAttribute('data-current', 'true');
    else el.removeAttribute('data-current');
  });
  chrome();
  const cur = state.slides[state.at];
  if (cur) cur.scrollTop = 0;
  window.scrollTo({ top: 0 });
}

function chrome() {
  const { s } = state.ctx;
  let bar = document.getElementById('present-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'present-bar';
    document.body.appendChild(bar);
  }
  const page = s.pages().find(p => p.id === state.ctx.pageId()) || { name: '' };
  bar.innerHTML = `
    <span class="pb-mark">${s.data.brand.logo
      ? `<img src="${esc(s.data.brand.logo)}" alt="">` : brandMark(s.data.brand, 26)}</span>
    <span class="pb-who"><b>${esc(s.data.company)}</b><span>${esc(page.name)}</span></span>
    <span class="pb-gap"></span>
    <button class="pb-btn" data-act="present-prev" ${state.at === 0 ? 'disabled' : ''}
      aria-label="Previous">${icon('arrow', 16, 'flip')}</button>
    <span class="pb-count">${state.at + 1} <i>/</i> ${state.slides.length}</span>
    <button class="pb-btn" data-act="present-next"
      ${state.at === state.slides.length - 1 ? 'disabled' : ''}
      aria-label="Next">${icon('arrow', 16)}</button>
    <button class="pb-btn pb-exit" data-act="present-exit">${icon('close', 15)}Exit</button>`;
}

/* The keys a presenter actually uses, including the ones a clicker sends. */
export function key(ev) {
  if (!state.on) return false;
  const k = ev.key;
  if (k === 'Escape') { exit(); return true; }
  if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Enter') { next(); return true; }
  if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { prev(); return true; }
  if (k === 'Home') { go(0); return true; }
  if (k === 'End') { go(state.slides.length - 1); return true; }
  return false;
}
