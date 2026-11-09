/* ---------------------------------------------------------------- colour

   ⛔ ONE PLACE THAT DECIDES WHETHER TEXT READS, AND BOTH THE APP AND THE
      GATE IMPORT IT.

   The build had no contrast check at all until 2026-11-02, and the first one
   added was arithmetic over the stylesheet tokens. That is exact but it only
   sees what the stylesheet declares, and the publishing session's pixel sweep
   found four failures in precisely the gap it cannot reach:

     .page-eyebrow   dark   1.96 to 3.06:1   the brand colour used as ink
     .pf-bar label   light  1.83 to 2.77:1   --ink inside a saturated fill
     .panel-foot     dark   4.09 to 4.37:1   --ink-faint on --tint
     .agepill        dark   3.67 to 4.26:1   --warn and --bad used as ink

   Every one of them is a colour that does not exist in the stylesheet: it is
   the client's brand, mixed at runtime in `Settings.apply()`. `--tint` is the
   clearest case, declared in CSS and computed in JavaScript, where which one
   wins depends on the route taken into the theme. That is the same shape as an
   exclusion list drifting from the DOM it describes and a dial cap emitted
   inline, and it is why this module exists: the derivation is the only source,
   the runtime calls it, and the gate calls the same functions with the same
   brands so a failure is caught without a browser.

   The rule throughout: A FILL KEEPS THE BRAND COLOUR, INK GETS A DERIVED ONE.
   Lifting `--accent` itself would repaint every bar and button to fix a label. */

const hex = c => {
  const s = String(c).trim().replace(/^#/, '');
  const f = s.length === 3 ? s.split('').map(x => x + x).join('') : s;
  return [0, 2, 4].map(i => parseInt(f.substr(i, 2), 16));
};
const toHex = ([r, g, b]) => '#' + [r, g, b]
  .map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');

export function luminance(c) {
  const v = hex(c).map(x => x / 255)
    .map(x => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

export function contrast(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/* Toward white or toward black, whichever the surface needs, in sRGB steps
   that keep the hue recognisable. A brand teal stays a teal: it only gets
   light enough to read. Returns the original when it already clears, so a
   brand that was designed with contrast in mind is never touched. */
export function readable(ink, surface, need = 4.5) {
  if (contrast(ink, surface) >= need) return String(ink);
  const target = luminance(surface) > 0.18 ? [0, 0, 0] : [255, 255, 255];
  const from = hex(ink);
  let best = toHex(target);
  /* ⚠️ THE STEP SIZE IS WHY AN INK OVERSHOOTS, and it had no stated reason.
     At 0.04 the first step past the bound could land well beyond it: the
     publishing session measured 47 of 84 derived inks overshooting past 5.0
     when they only needed 4.6. Every step away from the brand colour is brand
     fidelity spent, so the step is 0.01, which costs 4x the iterations of a
     loop that runs at most a hundred times per brand per theme and keeps the
     ink closer to the colour the client chose. */
  for (let t = 0.01; t <= 1.0001; t += 0.01) {
    const c = toHex(from.map((v, i) => v + (target[i] - v) * t));
    if (contrast(c, surface) >= need) { best = c; break; }
  }
  return best;
}

/* Text sitting INSIDE a saturated fill has no hue choice to make: it is the
   dark ink or the light one, whichever reads on that fill. `.pf-bar`'s label
   was `--ink` over a red status bar at 1.83:1. */
export function onFill(fill, darkInk = '#16202e', lightInk = '#ffffff') {
  return contrast(darkInk, fill) >= contrast(lightInk, fill) ? darkInk : lightInk;
}

/* Lift an ink until it clears on EVERY surface named, not just the first.
   Walks the surfaces and keeps lifting from the result each time, so the
   answer satisfies all of them rather than the last one checked. */
export function worst(ink, surfaces, need = 4.5) {
  let out = String(ink);
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const s of surfaces) {
      const next = readable(out, s, need);
      if (next !== out) { out = next; changed = true; }
    }
    if (!changed) break;
  }
  return out;
}

/* ⛔ AND A WAY FOR IT TO SAY IT FAILED.

   `worst()` returns its best attempt and cannot report that no colour
   satisfies the surfaces it was given. The publishing session brute-forced the
   grey space and found 255 surface pairs where none exists: for `#383838` with
   `#b8b8b8` it returns a value reading 1.30:1 and 4.54:1, a failure handed
   back with no signal. Every real brand converges today, so the risk is
   bounded rather than live, but a function that can lie silently is one a
   future brand walks into.

   So the postcondition is explicit and `brandVars` records it. A caller that
   wants the guarantee reads `unmet`; the gate asserts it is empty. */
export function unmet(ink, surfaces, need = 4.5) {
  return surfaces.filter(s => contrast(ink, s) + 0.005 < need)
    .map(s => `${ink} on ${s} ${contrast(ink, s).toFixed(2)}:1`);
}

export function mix(a, b, t) {
  const x = hex(a), y = hex(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

/* The surfaces a brand actually paints, per theme. `tint` is the one the
   stylesheet never sees. The others match the tokens in hub.css and are
   repeated here so the derivation is self-contained and testable. */
export const SURFACE = {
  light: { paper: '#ffffff', ground: '#eef2f7', groundDeep: '#e2e9f1' },
  dark: { paper: '#161d27', ground: '#0e141c', groundDeep: '#0a0f15' },
};
export const INK = {
  light: { ink: '#16202e', soft: '#3a4860', faint: '#5b6a7a' },
  dark: { ink: '#e8edf4', soft: '#a8b5c6', faint: '#7d8b9d' },
};

/* The semantic colours, which are the stylesheet's and not the brand's, but
   are used BOTH as a fill and as ink. `.agepill` wears them as ink and read
   3.67 to 4.26:1 in dark. Same rule: the fill keeps the colour, the ink gets
   a derived one. */
export const SEMANTIC = {
  light: { good: '#1a7d4f', warn: '#9a6512', bad: '#ad2f32' },
  dark: { good: '#4cc08a', warn: '#d8a443', bad: '#e2706f' },
};

/* Everything `Settings.apply()` sets that depends on the brand. One function,
   so the gate can assert the same values the page will wear. */
/* ⛔ THE BODY NEVER PAINTS `--ground` AT ALL, SO DERIVE AGAINST WHAT IT DOES.

   Three rounds of getting this wrong, each time less wrong, and the publishing
   session measured the mechanism every time:

   1. Derived against `--ground`, which left two brands at 4.32:1 on the paint.
   2. Added a margin and wrote that the painted ground "moves with the pointer
      light and has no single value to add". It does not move: with the light
      armed and the pointer over the text it reads the same luminance to five
      decimal places.
   3. The comment still said `world.css` "lays a lit ground over `--ground`".
      It does not lay anything over it. `hub.css` sets `body { background:
      var(--ground) }` and `world.css` sets `body { background: var(--sky-2)
      linear-gradient(...) }` on the same selector at the same specificity,
      loading second. ⛔ The body is OVERRIDDEN, not overpainted, and
      `--ground` is never painted on it. The eyebrow sat on neither of the two
      surfaces it was derived against.

   And the claim that the paint has no single value was false twice over,
   because the sky is a pure function of the brand:

     --sky-0  color-mix(--navy 44%, #0a1322)     dark
     --sky-1  color-mix(--navy 28%, #091120)
     --sky-2  color-mix(--navy 16%, #08101c)     light mixes --tint toward #fff
     on a 180deg gradient, stops at 0, 46vh and 100vh

   So the surfaces go in the list and the margin goes away. Every stop is
   derived here, and the closed form matched the real pixels to within one
   channel step on all six brands in both themes, with zero drift after a
   1400px scroll (`background-attachment: fixed` with `background-size: 100%
   100vh` anchors the gradient to the viewport, measured rather than inferred).

   ⚠️ CLEARING ALL THREE STOPS CLEARS EVERY BLEND BETWEEN THEM, BUT ONLY ON A
   CONDITION THIS COMMENT USED TO OMIT: the ink's luminance must lie OUTSIDE
   the interval the stops span. An ink inside that interval would meet a blend
   equal to itself at some offset and read 1:1 while all three stops still
   cleared. Measured: 0 of 84 derived inks lie inside their stop range, and
   sweeping 101 blends per ink across both gradient segments the worst contrast
   anywhere is 4.64. The gate asserts the condition rather than the conclusion.

   ⚠️ A small margin survives for ONE measured reason: targeting exactly 4.5
   lands on the boundary, and 8-bit quantisation plus anti-aliasing then reads
   back 4.49, which the `.drop` body text did. The measured quantisation gap is
   about 0.015.

   Two corrections to what this comment used to claim, both measured by the
   publishing session:

   - It said 4.6 is "the smallest value that clears after rounding". It is not:
     4.55 clears with room (tightest 4.557 against 4.505 at the boundary). 4.6
     is safe and cheap, and chosen for headroom rather than for being minimal.
   - It used to read as a margin whose "entire effect is on the tint loop",
     because at `readable()`'s old 0.04 step the targets 4.50 through 4.58
     produced identical derived inks: the step overshot the bound regardless.

   ⛔ THAT CLAIM WAS TRUE AT 0.04 AND THE SAME COMMIT SHIPPED 0.01, which made
   its own comment false before anyone read it. Measured at the shipped step,
   ROUNDING moves 4 of 14 inks at 4.52 and 7 of 14 at 4.60, so it is a general
   margin after all and the tint loop is merely where its first symptom was
   found. Two changes in one commit, each correct alone, and the comment for
   one described the world before the other. The lesson is not about colour:
   **a comment measured against the code as it was is a comment about a
   different program**, so a claim and the change that invalidates it must not
   travel together unmeasured. */
export const ROUNDING = 4.6;

/* The three gradient stops the body actually paints.

   ⚠️ `tint` is a PARAMETER, not `palette.tint`. The light stops are mixed from
   `var(--tint)` on the page, and `brandVars` may move that value, so reading
   the palette here would be two mechanisms answering one question: they agree
   today only because the tint loop never runs in light (closest margin 0.25).
   ⚠️ And the rule has to be FOLLOWED, not just written: the gate called this
   with no tint while asserting the discipline in this very comment, so it was
   checking stops built from `palette.tint` while the page painted stops built
   from the derived one. They agreed only for the reason named above. A caller
   that has `brandVars`' result reads `stops` from it rather than calling this
   again, which removes the chance to forget. */
export function sky(palette, theme, tint = palette.tint) {
  if (theme === 'dark') {
    return [
      mix(palette.navy, '#0a1322', 0.56),
      mix(palette.navy, '#091120', 0.72),
      mix(palette.navy, '#08101c', 0.84),
    ];
  }
  return [mix(tint, '#ffffff', 0.66), mix(tint, '#ffffff', 0.24), tint];
}

export function brandVars(palette, theme) {
  const s = SURFACE[theme], k = INK[theme], sem = SEMANTIC[theme];
  /* ⛔ The tint has to let the FAINT ink read on it, because the panel foot
     sits there. In dark it is the navy lightened, so it is pushed back toward
     the panel until faint clears rather than being left where it looked nice.

     ⚠️ Settled BEFORE the grounds, because the light sky stops are mixed from
     the final tint and not from the palette's. */
  let tint = theme === 'dark' ? mix(palette.navy, '#ffffff', 0.1) : palette.tint;
  /* ⚠️ ROUNDING, not 4.5: the loop used to exit at the first value its own
     arithmetic called 4.5, and the painted result read back 4.49 on one brand.
     Exiting at a boundary is exiting one step too early. */
  for (let i = 0; i < 24 && contrast(k.faint, tint) < ROUNDING; i++) {
    tint = mix(tint, theme === 'dark' ? '#000000' : '#ffffff', 0.08);
  }
  /* what the body paints, plus the tab column, which is the one ground token
     that really is painted (`--ground-deep`), plus paper for the semantics */
  const grounds = [...sky(palette, theme, tint), s.groundDeep];
  const semSurf = [...grounds, s.paper];
  const want = [
    ['--accent-ink', worst(palette.accent, grounds, ROUNDING), grounds, ROUNDING],
    ['--accent-ink-deep', readable(palette.accent, s.groundDeep, ROUNDING), [s.groundDeep], ROUNDING],
    ['--accent-on-tint', readable(palette.accent, tint, ROUNDING), [tint], ROUNDING],
    /* ⚠️ PAPER IS IN THIS LIST, and it was not. A delta sits on paper more
       often than anywhere else, and `--good-ink` passed there at 5.85:1 by the
       luck of its direction (paper is the lightest light surface and the ink is
       dark) rather than by construction. Passing by luck is the state a surface
       list exists to replace. */
    ['--good-ink', worst(sem.good, [...semSurf, tint], ROUNDING), [...semSurf, tint], ROUNDING],
    ['--warn-ink', worst(sem.warn, [...semSurf, tint], ROUNDING), [...semSurf, tint], ROUNDING],
    ['--bad-ink', worst(sem.bad, [...semSurf, tint], ROUNDING), [...semSurf, tint], ROUNDING],
  ];
  /* the postcondition, carried with the result rather than assumed.

     ⛔ THE TINT IS IN IT NOW, AND WAS NOT. `missed` was built from `want`, the
     six derived inks, while the tint was returned having never been checked.
     It is the surface under every panel foot, drop zone and tag, and it was the
     one value in this function that could fail silently: a hand-authored
     `tint: #050505` in light exhausts the loop at #dddddd with faint reading
     4.08, and `missed` came back empty. That is exactly the argument that put
     `unmet()` on `worst()` two rounds ago, applied to the loop beside it only
     after the publishing session cornered it. */
  const missed = [];
  for (const [name, value, surfaces, need] of want) {
    for (const m of unmet(value, surfaces, need)) missed.push(`${name}: ${m}`);
  }
  for (const m of unmet(k.faint, [tint], ROUNDING)) missed.push(`--tint: ${m}`);
  return {
    '--tint': tint,
    ...Object.fromEntries(want.map(([n, v]) => [n, v])),
    '--on-accent': onFill(palette.accent),
    /* ⛔ `--navy` is a runtime brand token too, and five rules hard-coded
       white on it (#rail, .verdict, .lvl-ord, .cover, #present-bar). Dark for
       every brand in the config, so white passes today, but it is the client's
       colour and nothing checked it. */
    '--on-navy': onFill(palette.navy),
    '--on-bad': onFill(sem.bad),
    '--on-good': onFill(sem.good),
    '--on-warn': onFill(sem.warn),
    /* non-custom-property keys: the gate reads them, setProperty ignores them */
    missed,
    stops: sky(palette, theme, tint),
  };
}
