/* A drawn world per industry.

   Color alone does not make a dashboard feel built for a company: six
   industries in six palettes still read as one template. These are flat,
   layered scenes drawn from the brand's own palette, so a trucking company
   gets a road and a skyline and a school gets a campus, and both are
   unmistakably in their own colors.

   Everything is geometry, so there are no image files, nothing to load, and a
   scene costs nothing at any size. Each takes the palette and returns an SVG
   that stretches to its box with preserveAspectRatio, which is why the hero
   can be any shape.

   The drawing is decoration and says nothing about the data. Nothing here
   should ever be read as a figure. */

import { esc } from './icons.js?v=5cc1fbd6cf';

let seq = 0;

/* A scene is drawn in a 1200 x 420 box and sliced to whatever it is given. */
export function scene(industryId, palette, { height = 420, opacity = 1 } = {}) {
  const fn = SCENES[industryId] || SCENES.construction;
  const id = 's' + (seq++).toString(36);
  const p = {
    accent: palette.accent,
    deep: palette.accentDeep,
    lift: palette.accentLift,
    navy: palette.navy,
    tint: palette.tint,
  };
  return `<svg class="scene" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMax slice"
    style="height:${height}px;opacity:${opacity}" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.navy}" stop-opacity="0"/>
        <stop offset="1" stop-color="${p.deep}" stop-opacity=".55"/>
      </linearGradient>
      <linearGradient id="${id}far" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.lift}" stop-opacity=".30"/>
        <stop offset="1" stop-color="${p.lift}" stop-opacity=".10"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="420" fill="url(#${id}sky)"/>
    ${fn(p, id)}
  </svg>`;
}

/* ------------------------------------------------------------------ pieces */

const sun = (p, cx = 980, cy = 96, r = 46) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.lift}" opacity=".22"/>
   <circle cx="${cx}" cy="${cy}" r="${r * 0.6}" fill="${p.lift}" opacity=".3"/>`;

const ground = (p, y = 356) =>
  `<rect x="0" y="${y}" width="1200" height="${420 - y}" fill="${p.deep}" opacity=".5"/>
   <rect x="0" y="${y}" width="1200" height="2" fill="${p.lift}" opacity=".45"/>`;

const far = (id, bars) =>
  bars.map(b => `<rect x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${420 - b[1]}"
    fill="url(#${id}far)"/>`).join('');

/* ------------------------------------------------------------------ worlds */

const SCENES = {
  /* a site: crane, frame going up, stacked material */
  construction: (p, id) => `
    ${sun(p)}
    ${far(id, [[60, 210, 70], [150, 250, 50], [1040, 230, 64], [1120, 268, 52]])}
    <g opacity=".85">
      <rect x="250" y="188" width="150" height="168" fill="${p.deep}" opacity=".55"/>
      <rect x="420" y="150" width="190" height="206" fill="${p.accent}" opacity=".45"/>
      <rect x="630" y="214" width="130" height="142" fill="${p.deep}" opacity=".5"/>
      ${grid(440, 170, 150, 170, 5, 6, p.lift, .42)}
      ${grid(266, 206, 118, 134, 4, 5, p.lift, .3)}
    </g>
    <g stroke="${p.lift}" stroke-width="5" fill="none" opacity=".9">
      <path d="M690 356V86"/>
      <path d="M690 102h240"/>
      <path d="M690 102 584 138"/>
      <path d="M926 102v64"/>
      <path d="M584 138v-36"/>
    </g>
    <rect x="904" y="166" width="46" height="34" fill="${p.lift}" opacity=".8"/>
    <g fill="${p.accent}" opacity=".7">
      <rect x="92" y="316" width="104" height="18"/>
      <rect x="104" y="334" width="104" height="18"/>
      <rect x="92" y="298" width="104" height="18"/>
    </g>
    ${ground(p)}`,

  /* a campus: a long building, a clock gable, trees, a flagpole */
  education: (p, id) => `
    ${sun(p, 1020, 88, 40)}
    ${far(id, [[40, 268, 90], [1090, 250, 80]])}
    <g>
      <rect x="300" y="208" width="600" height="148" fill="${p.deep}" opacity=".55"/>
      <path d="M520 208 600 142l80 66Z" fill="${p.accent}" opacity=".65"/>
      <rect x="560" y="212" width="80" height="80" fill="${p.accent}" opacity=".45"/>
      <circle cx="600" cy="252" r="22" fill="${p.lift}" opacity=".75"/>
      <circle cx="600" cy="252" r="3" fill="${p.navy}"/>
      <path d="M600 252v-13M600 252l9 7" stroke="${p.navy}" stroke-width="2.6" fill="none"/>
      ${grid(322, 230, 220, 100, 6, 3, p.lift, .4)}
      ${grid(660, 230, 220, 100, 6, 3, p.lift, .4)}
      <rect x="576" y="312" width="48" height="44" fill="${p.navy}" opacity=".5"/>
    </g>
    ${trees(p, [[210, 356], [262, 356], [940, 356], [992, 356]])}
    <g stroke="${p.lift}" stroke-width="4" opacity=".8">
      <path d="M160 356V196"/>
    </g>
    <path d="M160 200h62l-16 18 16 18h-62Z" fill="${p.accent}" opacity=".8"/>
    ${ground(p)}`,

  /* a clinic: a low building with a lit cross, a covered entrance, a second
     wing behind and a few cars in the lot */
  healthcare: (p, id) => `
    ${sun(p, 160, 90, 38)}
    ${far(id, [[40, 262, 100], [1080, 248, 90]])}
    <g>
      <rect x="640" y="226" width="300" height="130" fill="${p.deep}" opacity=".4"/>
      <rect x="280" y="196" width="420" height="160" fill="${p.deep}" opacity=".58"/>
      ${grid(304, 224, 160, 90, 5, 3, p.lift, .42)}
      ${grid(664, 252, 250, 64, 7, 2, p.lift, .32)}
      <rect x="520" y="150" width="76" height="76" rx="10" fill="${p.lift}" opacity=".85"/>
      <path d="M558 166v44M536 188h44" stroke="${p.navy}" stroke-width="12" stroke-linecap="round"/>
      <path d="M486 296h170v14H486Z" fill="${p.accent}" opacity=".8"/>
      <rect x="520" y="310" width="100" height="46" fill="${p.navy}" opacity=".5"/>
    </g>
    ${trees(p, [[200, 356], [246, 356], [990, 356]])}
    <g fill="${p.accent}" opacity=".6">
      <rect x="740" y="338" width="52" height="18" rx="5"/>
      <rect x="808" y="338" width="52" height="18" rx="5"/>
    </g>
    ${ground(p)}`,

  /* a parade: shopfronts with awnings and a lit window */
  retail: (p, id) => `
    ${sun(p, 150, 92, 38)}
    ${far(id, [[0, 240, 120], [1110, 232, 90]])}
    ${[180, 420, 660, 900].map((x, i) => `
      <g>
        <rect x="${x}" y="${196 + (i % 2) * 14}" width="200" height="${160 - (i % 2) * 14}"
          fill="${i === 1 ? p.accent : p.deep}" opacity="${i === 1 ? '.5' : '.55'}"/>
        <path d="M${x - 10} ${236 + (i % 2) * 14}h220l-18 34H${x + 8}Z"
          fill="${p.lift}" opacity="${i === 1 ? '.85' : '.55'}"/>
        <rect x="${x + 24}" y="${286 + (i % 2) * 14}" width="70" height="70"
          fill="${p.lift}" opacity="${i === 1 ? '.55' : '.28'}"/>
        <rect x="${x + 122}" y="${296 + (i % 2) * 14}" width="54" height="60"
          fill="${p.navy}" opacity=".45"/>
      </g>`).join('')}
    <g fill="${p.lift}" opacity=".5">
      <circle cx="620" cy="330" r="9"/><circle cx="648" cy="334" r="7"/>
      <rect x="600" y="338" width="68" height="18" rx="4"/>
    </g>
    ${ground(p)}`,

  /* a dining room on a corner: arched windows, an awning, string lights over
     a patio, and the kitchen's chimney breathing */
  restaurants: (p, id) => `
    ${sun(p, 1010, 90, 40)}
    ${far(id, [[30, 250, 110], [160, 276, 70], [1070, 240, 100]])}
    <g>
      <rect x="330" y="176" width="420" height="180" fill="${p.deep}" opacity=".58"/>
      <rect x="330" y="166" width="420" height="16" fill="${p.accent}" opacity=".7"/>
      <rect x="690" y="110" width="30" height="62" fill="${p.deep}" opacity=".7"/>
      ${[0, 1, 2].map(i => `<circle cx="${705 + i * 9}" cy="${96 - i * 22}" r="${10 + i * 4}"
        fill="${p.lift}" opacity="${(.3 - i * .08).toFixed(2)}"/>`).join('')}
      ${[370, 470, 570].map((x, i) => `
        <path d="M${x} 326V262a40 40 0 0 1 80 0v64Z" fill="${p.lift}" opacity="${i === 1 ? '.62' : '.36'}"/>
        <path d="M${x + 40} 326V230M${x} 286h80" stroke="${p.navy}" stroke-width="3" opacity=".35"/>`).join('')}
      <rect x="672" y="250" width="54" height="76" fill="${p.navy}" opacity=".5"/>
      <path d="M318 218h444l-20 30H338Z" fill="${p.accent}" opacity=".8"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<path d="M${340 + i * 46} 218l23 30 23-30"
        fill="${p.lift}" opacity=".35"/>`).join('')}
    </g>
    <path d="M760 214q90 26 180 0q90 26 180 0" stroke="${p.lift}" stroke-width="2" fill="none" opacity=".6"/>
    ${[790, 830, 870, 910, 950, 990, 1030, 1070].map((x, i) =>
      `<circle cx="${x}" cy="${218 + Math.round(Math.sin((i + 0.5) / 4 * Math.PI) * 11)}" r="4.5"
        fill="${p.lift}" opacity=".9"/>`).join('')}
    ${[820, 960].map(x => `
      <g>
        <path d="M${x - 44} 286q44-36 88 0Z" fill="${p.accent}" opacity=".75"/>
        <path d="M${x} 286v52" stroke="${p.lift}" stroke-width="3" opacity=".7"/>
        <rect x="${x - 34}" y="322" width="68" height="7" rx="3" fill="${p.lift}" opacity=".7"/>
        <path d="M${x - 26} 329v27M${x + 26} 329v27" stroke="${p.lift}" stroke-width="3" opacity=".5"/>
      </g>`).join('')}
    ${trees(p, [[230, 356], [278, 356]])}
    ${ground(p)}`,

  /* a plant: sawtooth roof, stacks, a conveyor */
  industrial: (p, id) => `
    ${sun(p, 1040, 80, 36)}
    ${far(id, [[30, 236, 80], [1130, 258, 70]])}
    <g>
      <path d="M220 356V212l76-44v44l76-44v44l76-44v44l76-44v188Z"
        fill="${p.deep}" opacity=".6"/>
      ${grid(240, 250, 280, 80, 7, 2, p.lift, .34)}
      <rect x="560" y="186" width="210" height="170" fill="${p.accent}" opacity=".45"/>
      ${grid(582, 212, 166, 90, 5, 3, p.lift, .4)}
      <rect x="806" y="140" width="34" height="216" fill="${p.deep}" opacity=".7"/>
      <rect x="856" y="168" width="34" height="188" fill="${p.deep}" opacity=".6"/>
      <ellipse cx="823" cy="128" rx="30" ry="14" fill="${p.lift}" opacity=".3"/>
      <ellipse cx="866" cy="152" rx="24" ry="11" fill="${p.lift}" opacity=".22"/>
    </g>
    <g opacity=".85">
      <rect x="930" y="300" width="230" height="10" rx="5" fill="${p.lift}" opacity=".7"/>
      ${[950, 1010, 1070, 1130].map(x =>
        `<circle cx="${x}" cy="${316}" r="8" fill="${p.lift}" opacity=".5"/>`).join('')}
      ${[956, 1026, 1096].map(x =>
        `<rect x="${x}" y="272" width="44" height="28" fill="${p.accent}" opacity=".75"/>`).join('')}
    </g>
    ${ground(p)}`,

  /* a lane: a road running to the horizon, a rig, mile markers */
  logistics: (p, id) => `
    ${sun(p, 190, 84, 42)}
    ${far(id, [[0, 268, 140], [980, 250, 100], [1120, 272, 80]])}
    <path d="M0 420 440 292h320L1200 420Z" fill="${p.deep}" opacity=".55"/>
    <path d="M0 420 440 292h320L1200 420Z" fill="none" stroke="${p.lift}"
      stroke-width="2" opacity=".35"/>
    <g stroke="${p.lift}" stroke-width="6" opacity=".55" stroke-linecap="round">
      <path d="M596 300v14"/><path d="M592 330v22"/>
      <path d="M586 368v34"/><path d="M578 414v6"/>
    </g>
    <g>
      <rect x="402" y="252" width="268" height="100" rx="6" fill="${p.accent}" opacity=".65"/>
      ${grid(424, 272, 224, 60, 6, 1, p.lift, .3)}
      <path d="M670 276h70l44 50v26H670Z" fill="${p.deep}" opacity=".85"/>
      <rect x="684" y="286" width="48" height="32" rx="4" fill="${p.lift}" opacity=".6"/>
      <g fill="${p.navy}" opacity=".8">
        <circle cx="472" cy="356" r="21"/><circle cx="536" cy="356" r="21"/>
        <circle cx="730" cy="356" r="21"/>
      </g>
      <g fill="${p.lift}" opacity=".5">
        <circle cx="472" cy="356" r="8"/><circle cx="536" cy="356" r="8"/>
        <circle cx="730" cy="356" r="8"/>
      </g>
    </g>
    ${[300, 380, 450].map((y, i) => `<rect x="${250 - i * 70}" y="${y - 40}" width="7"
      height="34" fill="${p.lift}" opacity=".4"/>`).join('')}
    ${ground(p, 408)}`,

  /* a stack: panels, a graph, a cursor, nodes */
  tech: (p, id) => `
    ${sun(p, 1000, 92, 44)}
    ${far(id, [[70, 258, 70], [1130, 240, 70]])}
    <g>
      <rect x="360" y="130" width="420" height="250" rx="12" fill="${p.deep}" opacity=".6"/>
      <rect x="360" y="130" width="420" height="34" rx="12" fill="${p.accent}" opacity=".55"/>
      <g fill="${p.lift}" opacity=".6">
        <circle cx="386" cy="147" r="5"/><circle cx="404" cy="147" r="5"/><circle cx="422" cy="147" r="5"/>
      </g>
      <polyline points="396,330 460,296 524,310 588,246 652,268 716,196 756,214"
        fill="none" stroke="${p.lift}" stroke-width="5" stroke-linejoin="round" opacity=".9"/>
      ${[[460, 296], [588, 246], [716, 196]].map(([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="7" fill="${p.lift}"/>`).join('')}
      ${grid(396, 186, 360, 40, 8, 1, p.lift, .22)}
    </g>
    <g opacity=".8">
      <rect x="730" y="212" width="150" height="110" rx="10" fill="${p.accent}" opacity=".4"/>
      <rect x="760" y="252" width="150" height="110" rx="10" fill="${p.accent}" opacity=".55"/>
      ${[[800, 180], [900, 236], [860, 150]].map(([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="13" fill="${p.lift}" opacity=".5"/>`).join('')}
      <path d="M800 180 860 150M860 150 900 236" stroke="${p.lift}" stroke-width="3"
        opacity=".4" fill="none"/>
    </g>
    <path d="M1020 250l54 86-26 8-10 34-18-128Z" fill="${p.lift}" opacity=".75"/>
    ${ground(p)}`,
};

/* a block of windows, the one piece every one of these needs */
function grid(x, y, w, h, cols, rows, color, opacity) {
  const gx = w / cols, gy = h / rows;
  let out = '';
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const lit = ((c * 7 + r * 13) % 5) === 0;
      out += `<rect x="${(x + c * gx + gx * 0.18).toFixed(1)}"
        y="${(y + r * gy + gy * 0.18).toFixed(1)}"
        width="${(gx * 0.64).toFixed(1)}" height="${(gy * 0.64).toFixed(1)}"
        fill="${color}" opacity="${(opacity * (lit ? 1.6 : 0.6)).toFixed(2)}"/>`;
    }
  }
  return out;
}

function trees(p, at) {
  return at.map(([x, y], i) => `
    <g opacity=".7">
      <rect x="${x - 3}" y="${y - 30}" width="6" height="30" fill="${p.navy}" opacity=".6"/>
      <circle cx="${x}" cy="${y - 44}" r="${22 + (i % 2) * 5}" fill="${p.accent}" opacity=".55"/>
      <circle cx="${x - 12}" cy="${y - 32}" r="${15 + (i % 2) * 3}" fill="${p.accent}" opacity=".45"/>
      <circle cx="${x + 13}" cy="${y - 34}" r="${14 + (i % 2) * 4}" fill="${p.accent}" opacity=".5"/>
    </g>`).join('');
}

/* A small motif for a page head: the same world, cropped to a badge. */
export function motif(industryId, palette, size = 46) {
  const p = palette;
  const paths = {
    construction: `<path d="M6 34V12M6 14h18M6 14l-8 3" stroke="currentColor" stroke-width="2.4" fill="none"/>
      <rect x="22" y="18" width="14" height="16" fill="currentColor" opacity=".35"/>`,
    education: `<path d="M20 8 4 16l16 8 16-8Z" fill="currentColor" opacity=".45"/>
      <path d="M10 20v10c0 2 4 4 10 4s10-2 10-4V20" stroke="currentColor" stroke-width="2.4" fill="none"/>`,
    retail: `<path d="M6 16h28l-3 18H9Z" fill="currentColor" opacity=".35"/>
      <path d="M14 16a6 6 0 0 1 12 0" stroke="currentColor" stroke-width="2.4" fill="none"/>`,
    restaurants: `<path d="M6 27a14 14 0 0 1 28 0Z" fill="currentColor" opacity=".4"/>
      <path d="M3 30h34M20 9v4" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    industrial: `<path d="M5 34V18l8 5v-5l8 5v-5l8 5V34Z" fill="currentColor" opacity=".4"/>
      <rect x="28" y="8" width="5" height="26" fill="currentColor" opacity=".55"/>`,
    logistics: `<rect x="4" y="14" width="17" height="13" fill="currentColor" opacity=".4"/>
      <path d="M21 18h7l5 6v3H21Z" fill="currentColor" opacity=".55"/>
      <circle cx="11" cy="30" r="3.4" fill="currentColor"/><circle cx="28" cy="30" r="3.4" fill="currentColor"/>`,
    healthcare: `<rect x="5" y="12" width="30" height="22" fill="currentColor" opacity=".35"/>
      <path d="M20 15v12M14 21h12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`,
    tech: `<rect x="5" y="9" width="30" height="20" rx="3" fill="currentColor" opacity=".35"/>
      <path d="M12 24l6-6-6-6M22 24h7" stroke="currentColor" stroke-width="2.4" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>`,
  };
  return `<svg class="motif" viewBox="0 0 40 40" width="${size}" height="${size}"
    style="color:${esc(p.accent)}" aria-hidden="true">${paths[industryId] || paths.construction}</svg>`;
}
