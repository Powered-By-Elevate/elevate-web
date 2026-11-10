"""Build the Elevate site: five pages from shared parts.

    python3 build.py            -> full pages in this folder (what GitHub Pages serves)
    python3 build.py --preview  -> the same pages in preview/, the home page without its
                                   own doctype, for publishing as a private preview

Copy comes from the Elevate decks (agentic-os os-vault/wiki/projects/assets/elevate-2026-11).
"""
import sys
from pathlib import Path

HERE = Path(__file__).parent
PREVIEW = "--preview" in sys.argv
OUT = HERE / "preview" if PREVIEW else HERE
EMAIL = "hello@elevatemanagedservices.com"

PAGES = [("index.html", "Home"), ("about.html", "About"), ("services.html", "Services"),
         ("education.html", "Education"), ("portal.html", "Client Portal")]

CSS = r"""
/* layout: a sticky light masthead over alternating paper and deep-teal bands, photography in rounded frames */
:root {
  --bg: #f8f6f0; --card: #ffffff; --ink: #2e2e2e; --ink2: #56615f; --line: #dfe5e3;
  --teal: #0c6980; --teal2: #2f9da8; --gold: #e6c068; --gold2: #a9822f;
  --deep: #052a33; --deep2: #0d4a58; --on-deep: #eef4f4; --on-deep2: #a9c2c7;
  --shadow: 0 1px 2px rgba(5,42,51,.06), 0 18px 40px -18px rgba(5,42,51,.28);
  --display: "Bodoni Moda", "Bodoni 72", Didot, Georgia, serif;
  --body: "IBM Plex Sans", "Segoe UI", Helvetica, Arial, sans-serif;
  --shell: 1240px;
  color-scheme: light;
}

*, *::before, *::after { box-sizing: border-box }
body { margin: 0; background: var(--bg); color: var(--ink); font: 400 17px/1.65 var(--body); -webkit-font-smoothing: antialiased }
h1, h2, h3, h4 { margin: 0; text-wrap: balance; font-family: var(--display); font-weight: 500; letter-spacing: -.01em; line-height: 1.08 }
p { margin: 0 }
a { color: var(--teal) }
img { max-width: 100%; height: auto; display: block }
:focus-visible { outline: 2px solid var(--teal2); outline-offset: 3px; border-radius: 4px }
.shell { max-width: var(--shell); margin-inline: auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)) }
@media (min-width: 900px) { .shell { padding-left: max(40px, env(safe-area-inset-left, 0px)); padding-right: max(40px, env(safe-area-inset-right, 0px)) } }
.it { font-style: italic; color: var(--teal) }
.deep .it, .hero .it { color: var(--gold) }
.eyebrow { font: 600 12px/1 var(--body); letter-spacing: .26em; text-transform: uppercase; color: var(--teal); display: flex; align-items: center; gap: 14px; margin-bottom: 20px }
.eyebrow::before { content: ""; width: 34px; height: 1.5px; background: var(--gold) }
.deep .eyebrow { color: var(--teal2) }
.lede { font-size: 19px; color: var(--ink2); max-width: 62ch }
.deep .lede { color: var(--on-deep2) }
.band { padding-block: clamp(64px, 9vw, 112px) }
.band--card { background: var(--card) }
.deep { background: radial-gradient(1200px 500px at 85% -10%, rgba(47,157,168,.22), transparent 60%), linear-gradient(160deg, var(--deep2), var(--deep) 70%); color: var(--on-deep) }
.h2 { font-size: clamp(34px, 4.6vw, 56px) }
.head { display: grid; gap: 18px; margin-bottom: 48px; max-width: 760px }

/* masthead */
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 30; background: var(--card) }
.mast { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 20; background: color-mix(in srgb, var(--card) 92%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line) }
.mast__row { display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 76px }
.lockup { display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--ink) }
.lockup svg { width: 40px; height: 32px; flex: none }
.lockup b { display: block; font: 500 24px/1 var(--display); letter-spacing: .08em }
.lockup small { display: block; font: 600 9.5px/1 var(--body); letter-spacing: .32em; color: var(--ink2); margin-top: 5px }
.nav { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end }
.nav a { font: 500 15px/1 var(--body); color: var(--ink); text-decoration: none; padding: 10px 12px; border-radius: 999px }
.nav a:hover { color: var(--teal) }
.nav a[aria-current="page"] { color: var(--teal); box-shadow: inset 0 -2px 0 var(--gold); border-radius: 0 }
.nav a.portal { background: var(--deep); color: #fff; padding: 11px 18px; margin-left: 6px; border-radius: 999px; box-shadow: none }
.nav a.portal[aria-current="page"] { background: var(--teal) }
.menu { display: none }
@media (max-width: 860px) {
  .menu { display: inline-flex; background: none; border: 1px solid var(--line); border-radius: 999px; padding: 9px 14px; font: 500 14px var(--body); color: var(--ink) }
  .nav { display: none; position: absolute; left: 0; right: 0; top: 100%; background: var(--card); border-bottom: 1px solid var(--line); flex-direction: column; align-items: stretch; padding: 10px max(16px, env(safe-area-inset-right, 0px)) 18px max(16px, env(safe-area-inset-left, 0px)) }
  .nav.open { display: flex }
  .nav a { padding: 14px 6px } .nav a.portal { margin: 8px 0 0; text-align: center }
}

/* buttons */
.btns { display: flex; flex-wrap: wrap; gap: 12px }
.btn { display: inline-flex; align-items: center; gap: 10px; padding: 15px 24px; border-radius: 999px; font: 600 15px/1 var(--body); text-decoration: none; transition: transform .2s ease, box-shadow .2s ease }
.btn:hover { transform: translateY(-1px) }
.btn--gold { background: var(--gold); color: #1d1a12; box-shadow: 0 12px 24px -12px rgba(230,192,104,.8) }
.btn--teal { background: var(--teal); color: #fff }
.btn--line { border: 1.5px solid currentColor; color: inherit }
@media (prefers-reduced-motion: reduce) { .btn { transition: none } .btn:hover { transform: none } }

/* hero */
.hero { position: relative; overflow: hidden; background: var(--deep); color: var(--on-deep) }
.hero__photo { position: absolute; inset: 0 0 0 42%; background-size: cover; background-position: center }
.hero__photo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, var(--deep) 0%, rgba(5,42,51,.55) 26%, rgba(5,42,51,.05) 70%) }
.hero__in { position: relative; padding-block: clamp(72px, 10vw, 132px); max-width: 640px; display: grid; gap: 26px }
.hero h1 { font-size: clamp(46px, 7vw, 92px); color: #fff; line-height: 1.0 }
.hero .lede { color: var(--on-deep2) }
@media (max-width: 760px) { .hero__photo { inset: 0; opacity: .35 } .hero__photo::after { background: var(--deep); opacity: .6 } }
.page-hero .hero__in { padding-block: clamp(56px, 8vw, 104px) }
.page-hero h1 { font-size: clamp(42px, 6vw, 76px) }

/* grids and cards */
.grid { display: grid; gap: 24px }
.g2 { grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)) }
.g3 { grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)) }
.g4 { grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)) }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 22px; padding: 30px; box-shadow: var(--shadow); min-width: 0 }
.deep .card { background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.12); box-shadow: none }
.tile { position: relative; display: flex; flex-direction: column; justify-content: flex-end; min-height: 380px; border-radius: 22px; overflow: hidden; color: #fff; text-decoration: none; background: var(--deep) center/cover; box-shadow: var(--shadow) }
.tile::before { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 35%, rgba(5,42,51,.94)) }
.tile > div { position: relative; padding: 28px; display: grid; gap: 10px }
.tile h3 { font-size: 32px; color: #fff }
.tile p { color: #d7e4e6; font-size: 15.5px }
.tile .go { font: 600 13px/1 var(--body); letter-spacing: .14em; text-transform: uppercase; color: var(--gold) }
.tile:hover .go { text-decoration: underline }
.icon { width: 50px; height: 50px; border-radius: 14px; display: grid; place-items: center; background: linear-gradient(160deg, var(--teal2), var(--teal)); color: #fff; flex: none }
.icon.goldi { background: linear-gradient(160deg, #f0d083, #c9a24a); color: #1d1a12 }
.icon svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round }
.svc { display: grid; gap: 14px; align-content: start }
.svc h3 { font-size: 27px }
.svc p { color: var(--ink2); font-size: 16px }
.svc ul { margin: 4px 0 0; padding: 0; list-style: none; display: grid; gap: 8px }
.svc li { position: relative; padding-left: 20px; font-size: 15.5px; color: var(--ink) }
.svc li::before { content: ""; position: absolute; left: 0; top: .62em; width: 8px; height: 8px; border-radius: 50%; background: var(--gold) }

/* stats */
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 0 }
.stat { padding: 34px 26px; border-left: 1px solid rgba(255,255,255,.14) }
.stat:first-child { border-left: 0 }
/* client cards */
.client { border-radius: 28px; overflow: hidden; display: flex; flex-direction: column; background: var(--deep); box-shadow: 0 40px 80px -36px rgba(5,42,51,.6), 0 0 0 1px rgba(255,255,255,.35) }
.client__logo { height: 260px; display: grid; place-items: center; padding: 34px; background: radial-gradient(120% 90% at 50% 0%, #fff, #f1f5f6) }
.client__logo img { display: block; max-width: 100%; max-height: 190px; object-fit: contain }
.client__logo--wide img { width: 82% }
.client__logo--tall img { height: 190px; width: auto }
.client__word { font: 500 clamp(30px, 2.6vw, 40px)/1.12 var(--display); color: var(--deep2); text-align: center; letter-spacing: .01em }
.client__body { flex: 1; padding: 26px 30px 30px; color: #fff; background: radial-gradient(600px 240px at 90% -20%, rgba(47,157,168,.25), transparent 60%), linear-gradient(160deg, var(--deep2), var(--deep) 75%) }
.client__body b { display: block; font: 500 clamp(40px, 3.6vw, 54px)/1 var(--display); color: var(--gold) }
.client__body small { display: block; margin-bottom: 10px; font: 600 12px/1 var(--body); letter-spacing: .2em; text-transform: uppercase; color: var(--teal2) }
.client__body h3 { margin-top: 14px; font-size: 24px; color: #fff }
.client__body p { margin-top: 8px; font: 400 15px/1.55 var(--body); color: var(--on-deep2) }
.stat em { display: block; margin-top: 8px; font: 400 15px/1.5 var(--body); font-style: normal; color: var(--on-deep2) }
.stat b { display: block; font: 500 clamp(48px, 6vw, 72px)/1 var(--display); color: var(--gold) }
.stat span { display: block; margin-top: 12px; font: 600 12.5px/1.45 var(--body); letter-spacing: .16em; text-transform: uppercase; color: var(--on-deep2) }
@media (max-width: 700px) { .stat { border-left: 0; border-top: 1px solid rgba(255,255,255,.14) } .stat:first-child { border-top: 0 } }

/* steps */
.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); gap: 24px; counter-reset: s }
.step { display: grid; gap: 10px; padding-top: 22px; border-top: 2px solid var(--gold) }
.step small { font: 600 12px/1 var(--body); letter-spacing: .2em; text-transform: uppercase; color: var(--teal) }
.step h3 { font-size: 28px }
.step p { color: var(--ink2); font-size: 16px }
.deep .step p { color: var(--on-deep2) }
.deep .step small { color: var(--teal2) }

/* split feature */
.split { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: clamp(32px, 6vw, 80px); align-items: center }
.frame { border-radius: 24px; overflow: hidden; box-shadow: var(--shadow); aspect-ratio: 4 / 3; background: var(--deep) center/cover; max-width: 100% }
.chips { display: flex; flex-wrap: wrap; gap: 10px }
.chip { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; font: 500 14.5px/1.2 var(--body); border: 1px solid var(--line); background: var(--card) }
.chip::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--gold) }
.deep .chip { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.16); color: var(--on-deep) }

/* compare table */
.cmp { width: 100%; border-collapse: collapse; min-width: 640px }
.cmp th, .cmp td { text-align: left; padding: 18px 20px; border-bottom: 1px solid var(--line); vertical-align: top; font-size: 16px }
.cmp th { font: 600 12px/1 var(--body); letter-spacing: .2em; text-transform: uppercase; color: var(--ink2) }
.cmp td:first-child { font-family: var(--display); font-size: 20px; width: 18% }
.cmp td:last-child { color: var(--teal); font-weight: 500 }
.scroll { overflow-x: auto; border-radius: 22px; background: var(--card); border: 1px solid var(--line); box-shadow: var(--shadow) }

/* people */
.people { display: flex; flex-wrap: wrap; justify-content: center; gap: 36px 24px; max-width: 1000px; margin-inline: auto }
.people .person { width: 220px; max-width: 100% }
.person { display: grid; justify-items: center; text-align: center; gap: 8px }
.person .ph { width: 156px; height: 156px; border-radius: 50%; background: var(--deep) center/cover; box-shadow: 0 0 0 4px var(--card), 0 0 0 5.5px var(--gold), var(--shadow); margin-bottom: 10px }
.person h3 { font-size: 22px }
.person p { font: 600 11.5px/1.45 var(--body); letter-spacing: .14em; text-transform: uppercase; color: var(--gold2) }

/* proof cards */
.proof { position: relative; min-height: 420px; border-radius: 22px; overflow: hidden; display: flex; align-items: flex-end; background: var(--deep) center/cover; box-shadow: var(--shadow) }
.proof::before { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(5,42,51,.94)) }
.proof > div { position: relative; padding: 26px 28px; color: #fff; display: grid; gap: 8px }
.proof h3 { font-size: 28px; color: #fff }
.proof small { font: 600 12px/1.5 var(--body); letter-spacing: .18em; text-transform: uppercase; color: var(--gold) }

/* portal */
.portal-hero { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 28px; align-items: stretch }
.featured { display: grid; gap: 22px; align-content: start; border-radius: 26px; padding: clamp(28px, 4vw, 44px); color: var(--on-deep); text-decoration: none;
  background: radial-gradient(700px 300px at 90% 0%, rgba(230,192,104,.18), transparent 60%), linear-gradient(160deg, var(--deep2), var(--deep)); box-shadow: var(--shadow) }
.featured h2 { color: #fff; font-size: clamp(32px, 4vw, 46px) }
.featured p { color: var(--on-deep2) }
.featured img { border-radius: 14px; margin-top: 6px }
.tool { display: grid; grid-template-columns: auto 1fr auto; gap: 18px; align-items: center; text-decoration: none; color: var(--ink); padding: 24px 26px }
.tool h3 { font-size: 24px }
.tool p { color: var(--ink2); font-size: 15px; margin-top: 4px }
.tool .arrow { font: 600 22px/1 var(--body); color: var(--teal); transition: transform .2s ease }
.tool:hover .arrow { transform: translateX(4px) }
.tools { display: grid; gap: 16px; align-content: start }
.note { font-size: 15px; color: var(--ink2) }
.copy { display: inline-flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--card); font: 500 15px var(--body); color: var(--ink); user-select: all }

/* portal systems */
.sysgrp { display: grid; grid-template-columns: auto 1fr; gap: 10px 18px; align-items: center; padding: 24px 26px }
.sysgrp h3 { font-size: 24px }
.sysgrp .chips { grid-column: 1 / -1; gap: 8px; align-self: start }
.sysgrp .chip { font-size: 13.5px; padding: 7px 13px }
.sysintro { display: grid; gap: 10px; padding: 24px 26px }
.sysintro .eyebrow { margin: 0 }
.sysintro h3 { font-size: 24px }
.sysintro p { color: var(--ink2); font-size: 15.5px }
.sysintro .copy { justify-self: start }

/* sign-in */
.signin { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 28px; align-items: stretch }
.signin__card { display: grid; gap: 18px; align-content: start; padding: clamp(28px, 4vw, 48px) }
.signin__card h1 { font-size: clamp(38px, 4.6vw, 58px) }
.signin__card .eyebrow { margin: 0 }
.signin form { display: grid; gap: 10px; margin-top: 6px }
.signin label { font: 600 13px/1 var(--body); letter-spacing: .12em; text-transform: uppercase; color: var(--ink2) }
.signin input { font: 400 17px/1.3 var(--body); padding: 16px 18px; border-radius: 14px; border: 1.5px solid var(--line); background: var(--bg); color: var(--ink); width: 100% }
.signin input:focus { outline: none; border-color: var(--teal2); box-shadow: 0 0 0 4px color-mix(in srgb, var(--teal2) 22%, transparent) }
.signin button { justify-self: start; border: 0; cursor: pointer; margin-top: 6px }
.msg { font-size: 15.5px; color: var(--ink2); min-height: 1.5em }
.msg.bad { color: #b3261e }
.msg.ok { color: var(--teal) }
.msg .copy { padding: 4px 8px; font-size: 14px }
.demo-card { position: relative; overflow: hidden; isolation: isolate; display: grid; gap: 18px; align-content: center; border-radius: 26px; padding: clamp(28px, 4vw, 48px); text-decoration: none; color: var(--on-deep); box-shadow: var(--shadow) }
.demo-card::before { content: ""; position: absolute; inset: 0; background: url(img/grain-dark.png); opacity: .5; z-index: -1 }
.demo-card h2 { color: #fff; font-size: clamp(32px, 4vw, 46px) }
.demo-card p { color: var(--on-deep2) }
.demo-card .eyebrow { color: var(--gold); margin: 0 }
.demo-card .chips { gap: 8px }
.demo-card .chip { font-size: 13.5px; padding: 7px 13px; text-decoration: none; transition: background .2s ease, border-color .2s ease }
.demo-card .chip:hover { background: rgba(230,192,104,.16); border-color: var(--gold) }
.featured .btns .btn--line { color: #fff }

/* contact panel */
.contact { width: min(560px, calc(100% - 32px)); border: 0; border-radius: 26px; padding: clamp(26px, 4vw, 40px); background: var(--card); color: var(--ink); box-shadow: 0 40px 90px -30px rgba(5,42,51,.6) }
.contact::backdrop { background: rgba(5,42,51,.55); backdrop-filter: blur(3px) }
.contact[open] { display: grid; gap: 16px }
.contact h2 { font-size: clamp(32px, 4vw, 44px) }
.contact p { color: var(--ink2) }
.contact .eyebrow { margin: 0 }
.contact__x { position: absolute; top: 14px; right: 14px; margin: 0 }
.contact__x button { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--line); background: var(--bg); color: var(--ink); font-size: 22px; line-height: 1; cursor: pointer }
.contact__mail { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 16px; background: var(--bg); border: 1px solid var(--line); font: 500 17px var(--body); word-break: break-all }
.contact__mail span { flex: 1; min-width: 0; user-select: all }
.contact__mail .btn { padding: 10px 16px; font-size: 14px; cursor: pointer; background: transparent; color: var(--teal) }
.contact__open { display: flex; flex-wrap: wrap; gap: 10px }
.contact__open .btn--line { color: var(--teal) }

/* contact page */
.contact-wrap { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: clamp(32px, 5vw, 64px); align-items: start }
.contact-intro { display: grid; gap: 20px; min-width: 0 }
.contact-intro .note { color: var(--ink2) }
.contact-card { padding: clamp(26px, 4vw, 42px) }
.fgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 16px }
.field { display: grid; gap: 8px; min-width: 0 }
.field.full { grid-column: 1 / -1 }
.field label { font: 600 12.5px/1 var(--body); letter-spacing: .12em; text-transform: uppercase; color: var(--ink2) }
.field small { font-weight: 400; letter-spacing: 0; text-transform: none }
.field input, .field select, .field textarea { font: 400 16.5px/1.4 var(--body); padding: 14px 16px; border-radius: 14px; border: 1.5px solid var(--line); background: var(--bg); color: var(--ink); width: 100% }
.field textarea { resize: vertical }
.field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--teal2); box-shadow: 0 0 0 4px color-mix(in srgb, var(--teal2) 22%, transparent) }
.contact-card button[type=submit] { margin-top: 20px; border: 0; cursor: pointer }
.contact-card button[disabled] { opacity: .6; cursor: default }
.hp { position: absolute; left: -9999px; width: 1px; height: 1px }
.done { display: grid; gap: 12px }
.done h2 { font-size: clamp(30px, 3.6vw, 42px) }
.done p { color: var(--ink2) }

[hidden] { display: none !important }
.mast__end { display: flex; align-items: center; gap: 10px }
@media (max-width: 860px) { .mast__end { flex-direction: row-reverse } }
/* back to top */
.to-top { position: fixed; right: calc(20px + env(safe-area-inset-right, 0px)); bottom: calc(20px + env(safe-area-inset-bottom, 0px)); z-index: 25; display: inline-flex; align-items: center; gap: 8px; padding: 12px 18px; border: 0; border-radius: 999px; background: var(--deep); color: #fff; font: 600 14px/1 var(--body); cursor: pointer; box-shadow: 0 14px 30px -12px rgba(5,42,51,.6); opacity: 0; transform: translateY(12px); pointer-events: none; transition: opacity .25s ease, transform .25s ease }
.to-top.is-on { opacity: 1; transform: none; pointer-events: auto }
.to-top svg { width: 16px; height: 16px; fill: none; stroke: var(--gold); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round }
@media (max-width: 600px) { .to-top span { display: none } .to-top { padding: 13px } }
@media (prefers-reduced-motion: reduce) { .to-top { transition: none } }
/* closing band and footer */
.close { text-align: left }
.close h2 { font-size: clamp(36px, 5vw, 60px); color: #fff; max-width: 18ch }
.close .lede { margin-block: 18px 30px }
.foot { padding-block: 40px; border-top: 1px solid var(--line); background: var(--card) }
.foot__row { display: flex; flex-wrap: wrap; gap: 24px; align-items: center; justify-content: space-between }
.foot nav { display: flex; flex-wrap: wrap; gap: 6px 18px }
.foot nav a { color: var(--ink2); text-decoration: none; font-size: 14.5px }
.foot nav a:hover { color: var(--teal) }
.foot small { display: block; margin-top: 18px; color: var(--ink2); font-size: 13.5px }


/* about page story */
.story { display: grid; gap: 20px; min-width: 0 }
.story p { color: var(--ink2); font-size: 18px; max-width: 60ch }
.story .lead-p { font: 400 clamp(21px, 2.2vw, 25px)/1.5 var(--display); color: var(--ink); font-variation-settings: "opsz" 14 }
.frame.tall { aspect-ratio: 4 / 5 }
.pull { font: italic 400 clamp(32px, 4.4vw, 58px)/1.18 var(--display); color: #fff; max-width: 22ch; font-variation-settings: "opsz" 48 }
.pull .it { color: var(--gold) }
.beliefs { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 36px }
.belief { display: grid; gap: 12px; align-content: start; padding-top: 24px; border-top: 2px solid var(--gold) }
.belief h3 { font-size: 30px }
.belief p { color: var(--ink2); font-size: 17px }

/* ---------- depth layer, carried over from the decks ---------- */
h1, h2 { font-variation-settings: "opsz" 48 }
h3, h4 { font-variation-settings: "opsz" 14; font-optical-sizing: none }
.eyebrow { font-size: 12.5px; letter-spacing: .32em; gap: 16px }
.eyebrow::before { width: 48px; height: 2px }
.h2 { font-size: clamp(40px, 5.4vw, 72px); line-height: 1.02 }
.band, .hero, .stats-band { position: relative; isolation: isolate }
.band > .shell, .hero > .shell, .stats-band > .shell { position: relative; z-index: 2 }
/* paper bands: soft teal and gold light with a faint dot grid */
.band:not(.deep):not(.band--card)::before { content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(900px 520px at 100% 0%, rgba(47,157,168,.12), transparent 62%), radial-gradient(760px 520px at 0% 100%, rgba(230,192,104,.13), transparent 62%) }
.band:not(.deep)::after { content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background-image: radial-gradient(rgba(12,105,128,.16) 1px, transparent 1.5px); background-size: 28px 28px;
  -webkit-mask-image: radial-gradient(70% 60% at 85% 10%, #000, transparent 70%); mask-image: radial-gradient(70% 60% at 85% 10%, #000, transparent 70%) }
.band--card::after { -webkit-mask-image: radial-gradient(60% 60% at 10% 90%, #000, transparent 70%); mask-image: radial-gradient(60% 60% at 10% 90%, #000, transparent 70%) }
/* deep bands: film grain, a teal glow and the gold swoosh */
.deep::before, .hero::before { content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: url(img/grain-dark.png); opacity: .55 }
.deep { background: radial-gradient(900px 460px at 88% -8%, rgba(47,157,168,.30), transparent 62%), radial-gradient(700px 420px at 0% 110%, rgba(230,192,104,.10), transparent 60%), linear-gradient(160deg, var(--deep2), var(--deep) 72%) }
.swoosh { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 70%; z-index: 1; pointer-events: none }
.hero h1 { font-size: clamp(50px, 7.6vw, 108px) }
.hero .eyebrow { color: var(--gold) }
.hero__photo::after { background: linear-gradient(90deg, var(--deep) 0%, rgba(5,42,51,.72) 24%, rgba(5,42,51,.08) 68%), linear-gradient(0deg, rgba(5,42,51,.55), transparent 40%) }
/* cards as lifted paper */
.card { border-radius: 26px; border: 1px solid color-mix(in srgb, var(--card) 70%, var(--line)); box-shadow: 0 1px 0 rgba(255,255,255,.6) inset, 0 30px 60px -32px rgba(5,42,51,.38), 0 6px 14px -8px rgba(5,42,51,.12); transition: transform .25s ease, box-shadow .25s ease }
.card:hover { transform: translateY(-3px); box-shadow: 0 1px 0 rgba(255,255,255,.6) inset, 0 40px 70px -32px rgba(5,42,51,.45), 0 8px 16px -8px rgba(5,42,51,.14) }
.deep .card { background: linear-gradient(160deg, rgba(255,255,255,.10), rgba(255,255,255,.035)); border-color: rgba(255,255,255,.14); box-shadow: 0 1px 0 rgba(255,255,255,.16) inset, 0 24px 40px -24px rgba(0,0,0,.5) }
.icon { width: 58px; height: 58px; border-radius: 17px; background: linear-gradient(145deg, #0e7b95, #0a5466); box-shadow: 0 10px 22px -8px rgba(12,105,128,.6), inset 0 1px 0 rgba(255,255,255,.25) }
.icon svg { width: 28px; height: 28px }
.icon.goldi { background: linear-gradient(145deg, #f0d083, #c9a24a); color: #3a2e0e; box-shadow: 0 10px 22px -8px rgba(201,162,74,.7), inset 0 1px 0 rgba(255,255,255,.4) }
.svc h3 { font-size: 29px }
.tile, .proof, .frame { border-radius: 28px; box-shadow: 0 40px 80px -36px rgba(5,42,51,.6), 0 0 0 1px rgba(255,255,255,.35) }
.tile { min-height: 440px; transition: transform .3s ease }
.tile::after { content: ""; position: absolute; inset: 0; background: inherit; background-size: inherit; z-index: -1 }
.tile:hover { transform: translateY(-4px) }
.tile h3 { font-size: 36px }
.stat b { font-size: clamp(56px, 7vw, 96px) }
.chip { padding: 10px 18px; background: rgba(12,105,128,.07); border-color: rgba(12,105,128,.18); color: var(--teal) }
.featured { position: relative; overflow: hidden; isolation: isolate }
.featured::before { content: ""; position: absolute; inset: 0; background: url(img/grain-dark.png); opacity: .5; z-index: -1 }
.featured .eyebrow { color: var(--gold) }
.featured .it { color: var(--gold) }
.person .ph { width: 168px; height: 168px }
.close h2 { font-size: clamp(42px, 6vw, 84px) }
@media (prefers-reduced-motion: reduce) { .card, .tile { transition: none } .card:hover, .tile:hover { transform: none } }
"""

MARK = '''<svg viewBox="0 0 70 54" aria-hidden="true"><defs><linearGradient id="m{i}" x1="0" y1="1" x2="1" y2="0">
<stop offset="0%" stop-color="#0C6980"/><stop offset="55%" stop-color="#2F9DA8"/><stop offset="100%" stop-color="#E6C068"/></linearGradient></defs>
<path d="M6 26 L 22 44 L 52 15" fill="none" stroke="url(#m{i})" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M60 7 L 56.3 20.3 L 46.5 10.3 Z" fill="#E6C068"/></svg>'''

IC = {
    "chart": '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    "doc": '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    "gear": '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    "people": '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.6 3-6 7-6s7 2.4 7 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.8 0 5 1.8 5 4.5"/>',
    "mega": '<path d="M3 11v2l11 5V6z"/><path d="M14 8a4 4 0 0 1 0 8M6 14l1.5 5h3L9 15"/>',
    "trend": '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    "ledger": '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    "pay": '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/>',
    "hire": '<circle cx="10" cy="8" r="3.5"/><path d="M3 20c0-3.6 3-6 7-6s7 2.4 7 6"/><path d="M19 8v6M16 11h6"/>',
    "shield": '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    "grant": '<path d="M12 3l9 5-9 5-9-5z"/><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"/>',
    "school": '<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5"/>',
    "folder": '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
}

def icon(name, gold=False):
    return f'<div class="icon{" goldi" if gold else ""}"><svg viewBox="0 0 24 24">{IC[name]}</svg></div>'

_n = [0]
def lockup():
    _n[0] += 1
    return f'<a class="lockup" href="/" aria-label="Elevate Managed Services, home">{MARK.format(i=_n[0])}<span><b>ELEVATE</b><small>MANAGED SERVICES</small></span></a>'

def swoosh(op=0.5):
    _n[0] += 1
    i = _n[0]
    return (f'<svg class="swoosh" viewBox="0 0 1440 500" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sw{i}" x1="0" x2="1">'
            f'<stop offset="0" stop-color="#2F9DA8" stop-opacity="0"/><stop offset=".55" stop-color="#2F9DA8" stop-opacity="{op}"/><stop offset="1" stop-color="#E6C068" stop-opacity="{op + .25}"/></linearGradient></defs>'
            f'<path d="M-40 470 C 400 430, 860 300, 1480 70" fill="none" stroke="url(#sw{i})" stroke-width="2.4" vector-effect="non-scaling-stroke"/>'
            f'<path d="M-40 500 C 430 466, 900 340, 1480 120" fill="none" stroke="url(#sw{i})" stroke-width="1.3" opacity=".7" vector-effect="non-scaling-stroke"/></svg>')

def url(f):
    """Clean addresses: GitHub Pages serves about.html at /about."""
    return "/" if f == "index.html" else "/" + f[:-5]

def nav(current):
    CUR = ' aria-current="page"'
    links = "".join(f'<a href="{url(f)}"{CUR if f == current else ""}>{t}</a>' for f, t in PAGES)
    return f'''<header class="mast"><div class="shell mast__row">{lockup()}
<button class="menu" type="button" aria-expanded="false" aria-controls="nav" id="menuBtn">Menu</button>
<div class="mast__end"><nav class="nav" id="nav" aria-label="Main">{links}</nav></div></div></header>'''

def close_band():
    return f'''<section class="band deep close">{swoosh(.6)}<div class="shell">
<div class="eyebrow">Ready to partner?</div>
<h2>Let's start a <span class="it">conversation.</span></h2>
<p class="lede">Bring the part of the operation that keeps slipping. We will tell you what it would take to run it properly, and what that costs, before you commit to anything.</p>
<div class="btns"><a class="btn btn--gold" href="/contact?topic=Discovery%20call%20request">Book a discovery call</a>
<span class="copy" aria-label="Email address">{EMAIL}</span></div></div></section>'''

def footer():
    links = "".join(f'<a href="{url(f)}">{t}</a>' for f, t in PAGES)
    return f'''<footer class="foot"><div class="shell"><div class="foot__row">{lockup()}<nav aria-label="Footer">{links}</nav></div>
<small>&copy; 2026 Elevate Managed Services. Thoughtful solutions. Brighter tomorrows.</small></div></footer>'''



TOTOP = '<button class="to-top" id="toTop" type="button" aria-label="Back to top"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg><span>Back to top</span></button>'

SCRIPT = """<script>
(function(){try{history.scrollRestoration='manual';}catch(e){}
function top(){if(!location.hash){window.scrollTo(0,0);var se=document.scrollingElement||document.documentElement;se.scrollTop=0;document.body.scrollTop=0;}}
top();window.addEventListener('load',top);window.addEventListener('pageshow',top);
})();
(function(){var t=document.getElementById('toTop');if(!t)return;var q=false;
function u(){var se=document.scrollingElement||document.documentElement;var m=se.scrollHeight-se.clientHeight;t.classList.toggle('is-on',m>0&&(window.scrollY||se.scrollTop)/m>0.35);q=false;}
addEventListener('scroll',function(){if(!q){q=true;requestAnimationFrame(u);}},{passive:true});addEventListener('resize',u,{passive:true});u();
t.addEventListener('click',function(){window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});})();
(function(){var b=document.getElementById('menuBtn'),n=document.getElementById('nav');
if(b&&n){b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');});}})();
</script>"""

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=IBM+Plex+Sans:wght@400;500;600&display=swap">')

def page(fname, title, desc, body):
    head = (f'<title>{title}</title><meta name="description" content="{desc}">'
            '<meta name="claude:viewport-fit-sides" content="cover">' + FONTS + f'<style>{CSS}</style>')
    inner = f'{nav(fname)}<main>{body}{close_band() if fname not in ("portal.html", "contact.html") else ""}</main>{footer()}{TOTOP}{SCRIPT}'
    bare = PREVIEW and fname == "index.html"
    if bare:
        return head + inner
    fav = '<link rel="icon" href="favicon.svg" type="image/svg+xml">'
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">{fav}{head}</head>'
            f'<body>{inner}</body></html>')

def hero(eyebrow, h1, lede, photo, btns="", pos="center", cls=""):
    return f'''<section class="hero {cls}">{swoosh(.55)}<div class="hero__photo" style="background-image:url(img/{photo});background-position:{pos}"></div>
<div class="shell"><div class="hero__in"><div class="eyebrow">{eyebrow}</div><h1>{h1}</h1><p class="lede">{lede}</p>{btns}</div></div></section>'''

def svc_cards(items, gold=False):
    out = ""
    for ic, t, d, bullets in items:
        li = "".join(f"<li>{b}</li>" for b in bullets)
        out += f'<article class="card svc">{icon(ic, gold)}<h3>{t}</h3><p>{d}</p><ul>{li}</ul></article>'
    return out

# ------------------------------------------------------------------ content
BIZ = [
    ("chart", "Financial Management", "The close, the reporting and the forecast, run on a fixed calendar.",
     ["Month-end close and reconciliations", "Management reporting packages", "Budgets and rolling forecasts", "Cash planning", "Lender and investor packages"]),
    ("doc", "Compliance", "A compliance calendar for every entity, so nothing arrives as a surprise.",
     ["Filings and licences", "Policy reviews", "Audit readiness all year", "One owner for every deadline"]),
    ("gear", "Operations & Execution", "What is decided in a room gets done that week.",
     ["Meeting cadence across entities", "Decision logs", "Action tracking with clear owners", "Escalation when something stalls"]),
    ("people", "HR, Payroll & People", "One home base for every employee.",
     ["Payroll coordination", "Onboarding and offboarding", "Personnel documents", "Manager tools"]),
    ("mega", "Marketing", "Brand and campaigns held to the same cadence as the books.",
     ["Brand standards", "Collateral and web", "Campaign execution"]),
    ("trend", "Business Intelligence", "One live financial dashboard for every entity, cut to each role.",
     ["Entity scorecards", "Live financial dashboards", "Reporting for leaders and lenders", "Pipeline, HR and document add-ons"]),
]
EDU = [
    ("ledger", "Accounting & Financial Reporting", "Books your board can read and your auditor can trust.",
     ["Monthly close and reconciliations", "Budget development and tracking", "Monthly board financial reports", "A live dashboard for the board"]),
    ("pay", "Payroll & Accounts Payable", "Every paycheck and every vendor paid right and on time.",
     ["Payroll processing and tax filings", "Direct deposit, time and attendance", "W-2 and ACA reporting", "Invoice processing and vendor payments", "Audit-ready payment records"]),
    ("hire", "Human Resources", "The people side of a school, organized.",
     ["Hiring workflow", "Onboarding and offboarding", "Personnel records and certifications", "Benefits coordination", "Handbook review"]),
    ("shield", "Audit & Board Readiness", "Audit-ready all year, not just in the fall.",
     ["Year-round audit readiness", "Auditor coordination through fieldwork", "Fiscal training for board members"]),
    ("grant", "Grants & Compliance", "Every dollar of grant money tracked from application to report.",
     ["Title I, II and IV", "IDEA", "Expenditure tracking and monitoring", "Charter, state and federal deadlines on one calendar"]),
    ("school", "New School Launch", "From charter approval to opening day.",
     ["Planning-year financial setup", "Compliance documentation", "Facilities readiness", "Opening-day operations"]),
]
TEAM = [("fawole", "Joseph Fawole", "President", "background-size:140%;background-position:50% 14%"),
        ("knowles", "Matthew Knowles", "Financial Analyst", ""),
        ("tucker", "Amanda C. Tucker", "Director of Education &amp; Workforce Development", "background-size:142%;background-position:52% 82%"),
        ("davis", "Marc Davis", "Chief Financial Officer", ""),
        ("russell", "Anita Russell", "Vice President of Finance", ""),
        ("provencher", "Vicki Provencher", "Controller", "background-size:118%;background-position:50% 18%"),
        ("mcdonald", "Will McDonald", "Education Facilities Director", "background-size:150%;background-position:50% 12%"),
        ("ltucker", "Lynette Tucker", "Director of Enrollment &amp; Partnerships", "background-size:135%;background-position:50% 14%")]

def people():
    return '<div class="people">' + "".join(
        f'<article class="person"><div class="ph" role="img" aria-label="{n}" style="background-image:url(img/team-{k}.jpg);{c}"></div><h3>{n}</h3><p>{t}</p></article>'
        for k, n, t, c in TEAM) + "</div>"

def proof_cards(items):
    return "".join(f'<div class="proof" style="background-image:url(img/{img})"><div><h3>{t}</h3><small>{a}<br>{b}</small></div></div>' for img, t, a, b in items)

SCHOOLS = [("q3-017.jpg", "Cogito Academy", "Lancaster, SC", "1,000 students"), ("q3-010.jpg", "Libertas Academy", "Woodruff, SC", "1,000 students"),
           ("q3-020.jpg", "Libertas Academy", "Colleton, SC", "510 students")]
BUILDS = [("tnc-nova.jpg", "Nova River District", "Rome, GA", "250 homes &middot; completed 2025"), ("tnc-gs.jpg", "Student housing at Georgia Southern", "Statesboro, GA", "82 residences &middot; completed 2026"),
          ("tnc-gt.jpg", "Student housing at Georgia Tech", "Atlanta, GA", "55 residences &middot; underway")]

OUR_CLIENTS = [("client-tnc.png", "True North Companies logo", "tall", "3 years", "True North Companies", "Development, construction and real estate"),
               ("client-tnk12.png", "TNK12 shield", "tall", "2 years", "TNK12", "School development across South Carolina"),
               ("client-belton.png", "Belton Preparatory Academy seal", "tall", "Since 2026", "Belton Preparatory Academy", "Public charter school, Belton, SC")]

SCHOOL_CLIENTS = [("client-belton.png", "Belton Preparatory Academy seal", "tall", "Client since|2026", "Belton Preparatory Academy", "Public charter school, Belton, SC"),
                  (None, "Upstate Prep Academy", "text", "Opening|Fall 2027", "Upstate Prep Academy", "Charter school, Greenville, SC"),
                  ("client-aia.png", "American Innovation Academies logo", "wide", "Opening|Fall 2028", "AIA Woodruff", "Grades 9 to 12 charter school, Woodruff, SC")]

def client_card(img, alt, shape, yrs, name, desc):
    logo = (f'<span class="client__word">{alt}</span>' if img is None else f'<img src="img/{img}" alt="{alt}" loading="lazy">')
    return f'''<article class="client"><div class="client__logo client__logo--{shape}">{logo}</div>
<div class="client__body">{(f'<small>{yrs.split("|")[0]}</small>' if "|" in yrs else "")}<b>{yrs.split("|")[-1]}</b><h3>{name}</h3><p>{desc}</p></div></article>'''

def clients_band(items=None, eyebrow="Who we serve", h2='Partners who stay. <span class="it">Year after year.</span>',
                 lede="The organizations that trust Elevate with their books, payroll and reporting."):
    cards = "".join(client_card(*c) for c in (items or OUR_CLIENTS))
    return f'''<section class="band clients"><div class="shell"><div class="head"><div class="eyebrow">{eyebrow}</div>
<h2 class="h2">{h2}</h2>
<p class="lede">{lede}</p></div>
<div class="grid g3">{cards}</div></div></section>'''

def steps(items):
    return '<div class="steps">' + "".join(f'<div class="step"><small>{a}</small><h3>{b}</h3><p>{c}</p></div>' for a, b, c in items) + "</div>"

HOW = [("Step one", "Discovery", "A 45 to 60 minute conversation about your entities, campuses and what is not closing today."),
       ("Step two", "Scoped proposal", "Within a week, a proposal built around your stage and capacity, from one service to the whole back office."),
       ("Step three", "30-day onboarding", "We connect your books, map your calendar of filings and reports, and take over the work in an orderly handoff."),
       ("Step four", "Monthly rhythm", "A close you can set a clock by, a board package on time, and a signed reconciliation review every month.")]

# ------------------------------------------------------------------ pages
def home():
    tiles = [("/services", "bo-desk.jpg", "Business Services", "Take the whole back office, or take the part that is breaking.", "center"),
             ("/education", "q3-017.jpg", "Education Services", "The complete back office for charter and private schools.", "center"),
             ("/services#bi", "dashboard.png", "Business Intelligence", "One live financial dashboard for every entity, cut to each role.", "60% 30%;background-size:150%")]
    t = "".join(f'<a class="tile" href="{h}" style="background-image:url(img/{i});background-position:{p}"><div><h3>{a}</h3><p>{b}</p><span class="go">Learn more</span></div></a>' for h, i, a, b, p in tiles)
    return page("index.html", "Elevate Managed Services",
        "Back-office and education services for growing companies and schools across the Southeast.",
        hero("Capacity for today. A stronger tomorrow.", 'A Bolder <span class="it">Solution.</span>',
             "Back-office and education services that take the weight off growing organizations and schools, so leaders can lead.",
             "bo-team.jpg", f'<div class="btns"><a class="btn btn--gold" href="/contact?topic=Discovery%20call%20request">Book a discovery call</a><a class="btn btn--line" href="/portal">Client portal</a></div>', "72% center") +
        f'''<section class="band"><div class="shell"><div class="head"><div class="eyebrow">What we do</div>
<h2 class="h2">Two practices. <span class="it">One standard.</span></h2>
<p class="lede">Elevate is the managed services arm of a family of multi-million dollar companies spanning two states in the Southeast. We partner with organizations and schools at any level to simplify operations, strengthen outcomes and build thriving communities.</p></div>
<div class="grid g3">{t}</div></div></section>
{clients_band()}
<section class="band"><div class="shell"><div class="head"><div class="eyebrow">Proof from our family of companies</div>
<h2 class="h2">Schools and communities, <span class="it">built.</span></h2>
<p class="lede">Our partner companies build and open schools and communities. Elevate keeps the books, the payroll and the reporting behind that work.</p></div>
<div class="grid g3">{proof_cards([SCHOOLS[0], BUILDS[0], BUILDS[1]])}</div></div></section>
''')

def about():
    beliefs = [("Relationships before reports", "We learn your people, your calendar and what keeps you up at night before we touch a spreadsheet. The numbers mean more when we know the story behind them."),
               ("The same people, every month", "You will not be handed off to a rotating bookkeeper. The team you meet at the start is the team that closes your books, runs your payroll and sits with you at the board meeting."),
               ("Give leaders their time back", "A principal should be in classrooms. A founder should be with customers. Every process we build is measured by the hours it hands back to you.")]
    bl = "".join(f'<div class="belief"><h3>{a}</h3><p>{b}</p></div>' for a, b in beliefs)
    return page("about.html", "About Elevate", "The story and the people behind Elevate Managed Services.",
        hero("About Elevate", 'Real people. <span class="it">Real partnership.</span>',
             "We are a small team of finance, people and education professionals who would rather know you by name than by account number.",
             "bo-desk.jpg", "", "right center", "page-hero") +
        f'''<section class="band"><div class="shell split"><div class="story">
<div class="eyebrow">Our story</div>
<h2 class="h2">We started by taking care of <span class="it">our own.</span></h2>
<p class="lead-p">Elevate did not begin as a consulting firm. It began as the people keeping the lights on for our own family of companies, which build and run schools, communities and businesses across the Southeast.</p>
<p>Some weeks that meant closing the books for a construction company on a Friday and running payroll for a brand new charter school on Monday. Other weeks it meant helping a first-year school leader get ready for a board meeting, or making sure a growing company had a clear set of numbers to take to the bank.</p>
<p>Doing that work up close taught us what leaders actually need: someone who picks up, knows the history and gets it right the first time. Today we bring that same team and that same care to companies and schools outside our family.</p></div>
<div class="frame tall" style="background-image:url(img/bo-review.jpg)" role="img" aria-label="An Elevate team member reviewing financial binders with a school leader"></div></div></section>
<section class="band deep">{swoosh(.45)}<div class="shell"><p class="pull">Leaders should spend their time teaching, leading and growing. <span class="it">We will take care of the rest.</span></p></div></section>
<section class="band band--card"><div class="shell"><div class="head"><div class="eyebrow">What we believe</div>
<h2 class="h2">How we show up <span class="it">for you.</span></h2></div>
<div class="beliefs">{bl}</div></div></section>
{clients_band()}
<section class="band"><div class="shell"><div class="head"><div class="eyebrow">Meet the team</div>
<h2 class="h2">The people you will <span class="it">actually talk to.</span></h2>
<p class="lede">When you call Elevate, you get one of us. Joseph Fawole leads Elevate and our business services. Amanda C. Tucker leads our work with schools.</p></div>{people()}</div></section>''')

def services():
    inds = ["Construction", "Retail", "Food &amp; beverage", "Industrial", "Freight", "Software", "Schools"]
    return page("services.html", "Business Services", "Financial management, compliance, operations, people, marketing and business intelligence.",
        hero("Business services", 'Take the whole back office. <span class="it">Or the part that is breaking.</span>',
             "Every service runs on the same execution layer, so a client who starts with one can add another without rebuilding their reporting.",
             "bo-papers.jpg", f'<div class="btns"><a class="btn btn--gold" href="/contact?topic=Business%20services">Talk to us</a></div>', "center 30%", "page-hero") +
        f'''<section class="band"><div class="shell"><div class="head"><div class="eyebrow">What we run</div>
<h2 class="h2">Six services. <span class="it">One team accountable.</span></h2></div>
<div class="grid g3">{svc_cards(BIZ)}</div></div></section>
<section class="band deep" id="bi">{swoosh(.45)}<div class="shell split"><div style="display:grid;gap:22px;min-width:0">
<div class="eyebrow">Featured: Business Intelligence</div><h2 class="h2">Every number, <span class="it">live.</span></h2>
<p class="lede">One financial dashboard for every entity, read straight from the accounting system and cut to each person's role. Leaders see the answer, finance sees the detail, lenders get their package in one click. Clients sign in through the client portal.</p>
<div class="chips">{"".join(f'<span class="chip">{i}</span>' for i in inds)}</div>
<div class="btns"><a class="btn btn--gold" href="/portal">Sign in to your dashboard</a><a class="btn btn--line" href="{DEMO}" >View the demo</a></div></div>
<img src="img/dashboard.png" alt="The Elevate BI Dashboard showing a sample construction company" width="1400" height="945" loading="lazy"></div></section>{systems_band()}
''')

def education():
    grants = [("Title programs", "Title I, II and IV funds from application through expenditure tracking, monitoring and reporting."),
              ("IDEA", "Special education funding tracked and documented to the same calendar as the rest of the books."),
              ("Federal and state compliance", "Charter, state and federal deadlines on one calendar, with documentation ready for monitoring visits.")]
    gc = "".join(f'<div class="card svc">{icon("grant", True)}<h3>{a}</h3><p>{b}</p></div>' for a, b in grants)
    launch = [("Planning year", "Set up the books", "Chart of accounts, banking, payroll and policies in place before the first hire."),
              ("Six months out", "Staff and systems", "Hiring workflow, onboarding, benefits and vendor contracts ready to go."),
              ("Ninety days out", "Facility ready", "Facility readiness, insurance, procurement and the opening budget locked."),
              ("Opening day", "Doors open", "Payroll runs, the board sees its first report, and the school is audit-ready from day one.")]
    beyond = ["Enrollment &amp; Marketing", "Leadership &amp; Academics", "Community &amp; Workforce Partnerships"]
    return page("education.html", "Elevate Education", "The complete back office for charter and private schools.",
        hero("Education services", 'Built around <span class="it">your school.</span>',
             "The complete back office for charter and private schools, built around each school's stage, priorities and staff, from the first planning year to every audit after.",
             "q3-017.jpg", f'<div class="btns"><a class="btn btn--gold" href="/contact?topic=Education%20services">Talk to our education team</a><a class="btn btn--line" href="#launch">Starting a new school?</a></div>', "center", "page-hero") +
        f'''<section class="band"><div class="shell"><div class="head"><div class="eyebrow">What we run for schools</div>
<h2 class="h2">The money, <span class="it">handled.</span> Every review, <span class="it">ready.</span></h2>
<p class="lede">School leaders should spend their time teaching, leading and growing their schools. We run the back office so they can.</p></div>
<div class="grid g3">{svc_cards(EDU, gold=True)}</div></div></section>
<section class="band band--card"><div class="shell"><div class="head"><div class="eyebrow">Grant support</div>
<h2 class="h2">Every grant dollar, <span class="it">accounted for.</span></h2>
<p class="lede">From application to expenditure tracking to the final report, we work alongside school leadership so grant funds are documented and audit-ready all year.</p></div>
<div class="grid g3">{gc}</div></div></section>
<section class="band deep" id="launch">{swoosh(.45)}<div class="shell split"><div style="display:grid;gap:20px;min-width:0"><div class="eyebrow">Starting a new school?</div>
<h2 class="h2">From charter to <span class="it">opening day.</span></h2>
<p class="lede">Our family of companies has built and opened schools. We set up the books, payroll, policies and opening budget during the planning year, so founders can focus on students.</p>
<div class="btns"><a class="btn btn--gold" href="/contact?topic=New%20school%20launch">Plan your launch with us</a></div></div>
<div class="frame" style="background-image:url(img/q3-020.jpg)" role="img" aria-label="Aerial view of a newly built charter school campus"></div></div></section>
{clients_band(SCHOOL_CLIENTS, "Schools we serve", 'Open today. <span class="it">Opening next.</span>', "The schools that run on Elevate's books, payroll and reporting, and the ones we are getting ready to open.")}
<section class="band"><div class="shell"><div class="head"><div class="eyebrow">Proof from our family of companies</div>
<h2 class="h2">Three schools. <span class="it">Opened on time.</span></h2>
<p class="lede">Our partner companies delivered three new schools in 2026 for 2,510 students. Elevate runs the finance and operations behind the teams that built them.</p></div>
<div class="grid g3">{proof_cards(SCHOOLS)}</div></div></section>''')

SYSTEMS = [("ledger", "Accounting", ["QuickBooks Online", "Sage Intacct", "Xero", "NetSuite", "Sage 100", "Others on request"]),
           ("pay", "Payroll and HR", ["ADP", "QuickBooks Payroll", "Rippling", "Gusto", "Paychex", "Paylocity"]),
           ("folder", "Operations", ["Procore", "Bill.com", "Microsoft 365", "Google Workspace", "Monday.com", "Spreadsheets"])]

def systems_band():
    def chips(names):
        return "".join(f'<span class="chip">{n}</span>' for n in names)
    gl = "".join(f'<div class="card sysgrp">{icon(i)}<h3>{t}</h3><div class="chips">{chips(names)}</div></div>' for i, t, names in SYSTEMS)
    return f'''<section class="band band--card"><div class="shell"><div class="head"><div class="eyebrow">Works with your systems</div>
<h2 class="h2">Keep the software <span class="it">you already use.</span></h2>
<p class="lede">Your dashboard connects to your accounting, payroll and project systems, whichever ones you run. Nothing changes for your team.</p></div>
<div class="grid g3">{gl}</div></div></section>'''

# Client dashboards by email domain. Add one line per client when their dashboard goes live,
# e.g. "acmebuilders.com": "https://dashboards.elevatemanagedservices.com/acme/".
# This only routes people to the right page. The dashboard itself does the real sign-in.
CLIENTS = {}
DEMO = "/demo/#/choose"
INDUSTRY_DEMOS = [("Construction", "construction"), ("Schools", "education"), ("Retail", "retail"), ("Food &amp; beverage", "restaurants"),
                  ("Manufacturing", "industrial"), ("Freight", "logistics"), ("Software", "tech")]

def portal():
    import json
    js = """<script>
(function(){var C=%s;var f=document.getElementById('signinForm'),e=document.getElementById('email'),m=document.getElementById('msg');
if(!f)return;f.addEventListener('submit',function(ev){ev.preventDefault();var v=(e.value||'').trim().toLowerCase();
if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(v)){m.className='msg bad';m.textContent='Enter the email address you use for work, like name@company.com.';e.focus();return;}
var d=v.split('@')[1];var url=C[d];
if(url){m.className='msg ok';m.textContent='Taking you to your dashboard\\u2026';window.location.href=url;}
else{m.className='msg';m.innerHTML='We could not find a dashboard for <b>'+d.replace(/[<>&]/g,'')+'</b> yet. If you are an Elevate client, email <span class="copy">%s</span> and we will get you set up. In the meantime you can explore the demo.';}
});})();
</script>""" % (json.dumps(CLIENTS), EMAIL)
    ind_chips = "".join(f'<a class="chip" href="/demo/#/demo/{i}">{n}</a>' for n, i in INDUSTRY_DEMOS)
    body = f'''<section class="band signin-band"><div class="shell"><div class="signin">
<div class="signin__card card">
<div class="eyebrow">Client sign-in</div>
<h1>Sign in to your <span class="it">dashboard.</span></h1>
<p class="lede">Enter your work email and we will take you to your company's BI Dashboard.</p>
<form id="signinForm" novalidate>
<label for="email">Work email</label>
<input id="email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="name@company.com" required>
<button class="btn btn--teal" type="submit">Continue &rarr;</button>
</form>
<p id="msg" class="msg" role="status" aria-live="polite"></p>
</div>
<div class="demo-card deep">
<div class="eyebrow">Not a client yet?</div>
<h2>See it with <span class="it">a sample company.</span></h2>
<p>Pick an industry and a sample company, and explore a live dashboard built the way that business is measured.</p>
<div class="chips">{ind_chips}</div>
<a class="btn btn--gold" style="justify-self:start" href="{DEMO}" >View the demo &rarr;</a></div>
</div></div></section>{js}'''
    return page("portal.html", "Elevate Client Portal", "Sign in to your Elevate BI Dashboard, or explore the demo.", body)


# Form delivery: FormSubmit (formsubmit.co) emails each submission to EMAIL. The first
# submission sends a one-time activation email to that inbox; once its link is clicked,
# every later submission arrives as a normal email with the visitor as reply-to.
FORM_TO = "mknowles@true-north-companies.com"   # receives the activation email; swap for the FormSubmit alias once activated
FORM_CC = EMAIL
FORM_URL = "https://formsubmit.co/ajax/" + FORM_TO

def contact():
    import json
    topics = ["Discovery call request", "Business services", "Education services", "New school launch", "Business Intelligence dashboard", "Something else"]
    opts = "".join(f'<option>{t}</option>' for t in topics)
    js = """<script>
(function(){var URL=%s,CC=%s,E=%s,f=document.getElementById('contactForm'),st=document.getElementById('formStatus');
var q=new URLSearchParams(location.search).get('topic');if(q){var sel=document.getElementById('topic');for(var i=0;i<sel.options.length;i++){if(sel.options[i].text===q){sel.selectedIndex=i;}}}
f.addEventListener('submit',function(ev){ev.preventDefault();
var d={};new FormData(f).forEach(function(v,k){d[k]=String(v).trim();});
if(d.botcheck){return;}
var miss=[];if(!d.name)miss.push('your name');if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(d.email||''))miss.push('a valid email');if(!d.message)miss.push('a short message');
if(miss.length){st.className='msg bad';st.textContent='Please add '+miss.join(', ')+'.';return;}
var subj=d.topic+' from '+d.name+(d.organization?' ('+d.organization+')':'');
var btn=f.querySelector('button[type=submit]');
btn.disabled=true;btn.textContent='Sending\\u2026';
fetch(URL,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
body:JSON.stringify({_cc:CC,_subject:'Website inquiry: '+subj,_template:'table',_captcha:'false',_replyto:d.email,name:d.name,email:d.email,phone:d.phone||'',organization:d.organization||'',topic:d.topic,message:d.message})})
.then(function(r){return r.json();}).then(function(j){if(!(j.success===true||j.success==='true'))throw 0;f.hidden=true;document.getElementById('formDone').hidden=false;})
.catch(function(){st.className='msg bad';st.textContent='Something went wrong sending your message. Please try again in a moment.';btn.disabled=false;btn.textContent='Send message';});
});})();
</script>""" % (json.dumps(FORM_URL), json.dumps(FORM_CC), json.dumps(EMAIL))
    body = f'''<section class="band"><div class="shell contact-wrap">
<div class="contact-intro"><div class="eyebrow">Contact</div>
<h1 class="h2">Let's start a <span class="it">conversation.</span></h1>
<p class="lede">Tell us a little about your organization and what you need. We reply within one business day to set up a 45 to 60 minute discovery call.</p>
<p class="note">Prefer email? Write to <span class="copy">{EMAIL}</span></p></div>
<div class="card contact-card">
<form id="contactForm" novalidate>
<div class="fgrid">
<div class="field"><label for="name">Name</label><input id="name" name="name" autocomplete="name" required></div>
<div class="field"><label for="email">Work email</label><input id="email" name="email" type="email" autocomplete="email" required></div>
<div class="field"><label for="phone">Phone <small>optional</small></label><input id="phone" name="phone" type="tel" autocomplete="tel"></div>
<div class="field"><label for="organization">Company or school</label><input id="organization" name="organization" autocomplete="organization"></div>
<div class="field full"><label for="topic">What can we help with?</label><select id="topic" name="topic">{opts}</select></div>
<div class="field full"><label for="message">Message</label><textarea id="message" name="message" rows="5" placeholder="A few lines about your entities or campuses and what is not closing today." required></textarea></div>
<input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
</div>
<button class="btn btn--gold" type="submit">Send message</button>
<p id="formStatus" class="msg" role="status" aria-live="polite"></p>
</form>
<div id="formDone" class="done" hidden><div class="eyebrow">Thank you</div><h2>Your inquiry <span class="it">is in.</span></h2><p>Your message has been sent to the Elevate team. We will be in touch within one business day.</p></div>
</div></div></section>{js}'''
    return page("contact.html", "Contact Elevate", "Book a discovery call with Elevate Managed Services.", body)

def build():
    OUT.mkdir(exist_ok=True)
    for fn, html in [("index.html", home()), ("about.html", about()), ("services.html", services()),
                     ("education.html", education()), ("portal.html", portal()), ("contact.html", contact())]:
        (OUT / fn).write_text(html)
        print("wrote", OUT / fn, len(html))
    # the sign-in page now lives at portal.html; keep old links working
    (OUT / "signin.html").write_text('<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/portal">'
                                     '<link rel="canonical" href="/portal"><title>Client Portal</title><a href="/portal">Client Portal</a>')

if __name__ == "__main__":
    build()
