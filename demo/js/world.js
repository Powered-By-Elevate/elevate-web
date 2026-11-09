/* The world's behavior (world.css carries its look).

   Three things, and each one is written so it cannot move content:

   1. The pointer light. The dot grid behind the page head lights in a circle
      around the pointer. One rAF per move at most, and all it writes is two
      custom properties on one element, so nothing reflows. No light follows the
      pointer across a panel or a card: Matt ruled that off the Launchpad
      (2026-10-06, *"i would remove the hover color on objects. that can be too
      much"*).

   2. The entrance. On a page's first draw the head arrives word by word and the
      figures and panels rise in a stagger. The stagger index is set here rather
      than in every page's markup, so one line reaches every page in the build.
      Never for a robot (navigator.webdriver), so the gate measures the settled
      page and a screenshot is never taken mid-animation.

   3. Sections settle in as they are scrolled to, below the first screen, and
      only after a real scroll. A page opened already scrolled would otherwise
      animate everything at once, which is the opposite of the point. */

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const robot = () => !!navigator.webdriver;

/* ------------------------------------------------------------------ pointer */

let ptr = null, frame = 0;

function light() {
  frame = 0;
  const deco = document.getElementById('deco');
  if (!ptr || !deco || reduced()) return;
  const r = deco.getBoundingClientRect();
  const inside = ptr.clientX >= r.left && ptr.clientX <= r.right
    && ptr.clientY >= r.top && ptr.clientY <= r.bottom;
  deco.classList.toggle('is-lit', inside);
  if (inside) {
    deco.style.setProperty('--mx', `${Math.round(ptr.clientX - r.left)}px`);
    deco.style.setProperty('--my', `${Math.round(ptr.clientY - r.top)}px`);
  }
}

/* ----------------------------------------------------------------- entrance */

/* Each word of the question in its own inline-block, carrying its position so
   the stagger reads left to right.

   ⛔ It walks TEXT NODES and leaves element children alone. The first cut read
   textContent and rebuilt the heading from it, which would have thrown away
   the <b> around every figure a verdict names. An element is kept whole and
   staggered as one unit, so "<b>$47.4M</b>" arrives as a single word rather
   than being taken apart.

   ⛔ And it reaches the VERDICT's heading, not only .page-title. Most pages in
   this build open on a verdict, so a splitter that knew only about .page-title
   did nothing on the pages people actually look at: Claude in Chrome saw no
   word-by-word entrance anywhere on the live site and was right. */
function splitTitle(host) {
  for (const h of host.querySelectorAll('.page-title, .verdict h2')) {
    if (h.dataset.split) continue;
    let n = 0;
    for (const node of [...h.childNodes]) {
      if (node.nodeType === 1) {
        node.classList.add('w');
        node.style.setProperty('--w', String(n++));
        continue;
      }
      if (node.nodeType !== 3) continue;
      const frag = document.createDocumentFragment();
      for (const part of node.nodeValue.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.append(part); continue; }
        const span = document.createElement('span');
        span.className = 'w';
        span.style.setProperty('--w', String(n++));
        span.textContent = part;
        frag.append(span);
      }
      node.replaceWith(frag);
    }
    h.dataset.split = '1';
  }
}

function index(host) {
  for (const set of [host.querySelectorAll('.strip > .strip-item'),
    host.querySelectorAll('.grid > *')]) {
    let n = 0;
    for (const el of set) el.style.setProperty('--i', String(n++));
  }
}

/* ------------------------------------------------------------------- settle */

let scrolled = false, watcher = null;

function watch(host) {
  if (!watcher) return;
  for (const el of host.querySelectorAll('.grid > *')) {
    /* Only what starts below the first screen: a section already on screen has
       nothing to settle into. */
    if (el.getBoundingClientRect().top < window.innerHeight + 120) continue;
    el.classList.add('settle');
    watcher.observe(el);
  }
}

/* --------------------------------------------------------------------- wire */

export function start() {
  addEventListener('pointermove', ev => {
    if (ev.pointerType === 'touch') return;
    ptr = ev;
    if (!frame) frame = requestAnimationFrame(light);
  }, { passive: true });
  document.addEventListener('pointerout', ev => {
    if (!ev.relatedTarget) document.getElementById('deco')?.classList.remove('is-lit');
  });

  addEventListener('scroll', () => {
    scrolled = true;
    document.body.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });

  if ('IntersectionObserver' in window && !reduced() && !robot()) {
    watcher = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting || !scrolled) continue;
        e.target.classList.remove('settle');
        watcher.unobserve(e.target);
      }
    }, { rootMargin: '-10% 0px -8% 0px' });
  }
}

/* Called by render() with the page's host element, after its markup is in. */
export function arm(host) {
  index(host);
  /* Splitting the question into words is STRUCTURE, not motion: it changes no
     geometry, and doing it for a robot too means the gate measures the same
     DOM a person gets. Only the animation is withheld. */
  splitTitle(host);
  if (reduced() || robot()) return;
  host.classList.remove('enter');
  /* Reading a layout property between the two is what makes the browser start
     the animations again on a host that was already drawn once. */
  void host.offsetWidth;
  host.classList.add('enter');
  watch(host);
}
