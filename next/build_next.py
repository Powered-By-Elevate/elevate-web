"""Elevate site, the immersive redesign (preview at /next/, not linked, noindex).

    python3 next/build_next.py   -> next/index.html

Matt, 2026-11-18: "it feels basic ... i would love to see a mockup that makes you feel
a little more immersed into our services. even down to like a scrolling dashboard on a
phone screen. let's build it on our github first and then move it to live".

Built to the /immersive-web rules: motion is read from scroll and never captures it on a
phone, nothing follows the pointer, the hero is a real photograph, and every fact comes
from build.py (no invented numbers). The phone screens are tall captures of the real BI
demo (next/img/bi-*.jpg) that scroll inside the frame as the page moves.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent))
import build as B  # noqa: E402

def mark(i):
    return B.MARK.format(i=i)

# The five beats of the services story: (key, eyebrow, title, line, bullets, screen, caption)
BEATS = [
    ("finance", "Financial management", "A close you can set a clock by.",
     "The close, the reporting and the forecast, run on a fixed calendar.",
     B.BIZ[0][3][:4], ("photo", "team-overhead.jpg", "Month-end close, signed off"), ""),
    ("people", "HR, payroll &amp; people", "One home base for every employee.",
     "Payroll, onboarding and personnel records, handled by people who know your team.",
     B.BIZ[3][3], ("photo", "team-hall.jpg", "One home base for every employee"), ""),
    ("marketing", "Marketing", "Campaigns on the same cadence as the books.",
     "Brand, collateral and campaigns, measured against what they bring in.",
     B.BIZ[4][3] + ["Enrollment marketing for schools"], ("photo", "team-plan.jpg", "Campaigns held to a calendar"), ""),
    ("bi", "Business intelligence", "Every number, live.",
     "One dashboard for every entity, read straight from the systems you already use.",
     B.BIZ[5][3], ("phone", "bi-phone-kpis.jpg", "The figure cards of the real dashboard, on a sample company"), ""),
    ("schools", "Education", "The complete back office for schools.",
     "Accounting, payroll, compliance and enrollment, from the planning year to every audit after.",
     ["Monthly board financial reports", "Payroll and tax filings", "Grants and compliance", "New school launch"],
     ("photo", "school-chalk.jpg", "From planning year to every audit"), ""),
]

CSS = r"""
:root{--teal:#0c6980;--teal2:#2f9da8;--gold:#e6c068;--gold2:#a9822f;--ink:#2e2e2e;--ink2:#5c6668;--line:#e3e8e9;
--paper:#fbfaf7;--grey:#f1f1f1;--tint:#eaf3f5;--cream:#f7f1e3;--deep:#063a47;
--serif:"Bodoni Moda","Bodoni 72",Didot,Georgia,serif;--sans:"IBM Plex Sans","Segoe UI",Helvetica,Arial,sans-serif;
--ease:cubic-bezier(.22,.8,.2,1);--shell:1240px;color-scheme:light}
*,*::before,*::after{box-sizing:border-box}
html.lenis,html.lenis body{height:auto}.lenis.lenis-smooth{scroll-behavior:auto!important}
body{margin:0;background:var(--paper);color:var(--ink);font:400 17px/1.65 var(--sans);-webkit-font-smoothing:antialiased;overflow-x:clip}
img{max-width:100%;display:block}a{color:inherit}
p{margin:0}h1,h2,h3{margin:0;font-weight:500;text-wrap:balance}
.shell{max-width:var(--shell);margin-inline:auto;padding-inline:16px}
@media(min-width:900px){.shell{padding-inline:40px}}
.serif{font-family:var(--serif)}
.eyebrow{font:600 12.5px/1 var(--sans);letter-spacing:.18em;text-transform:uppercase;color:var(--teal)}
.display{font:500 clamp(46px,7.4vw,108px)/.98 var(--serif);letter-spacing:-.02em}
.display em,.h2 em{font-style:italic;color:var(--teal)}
.h2{font:500 clamp(34px,4.6vw,64px)/1.04 var(--serif);letter-spacing:-.015em}
.lede{font-size:clamp(17px,1.4vw,20px);color:var(--ink2);max-width:560px}
.btn{display:inline-flex;align-items:center;gap:10px;padding:15px 26px;border-radius:99px;font:600 15.5px/1 var(--sans);text-decoration:none;transition:background .25s,color .25s,transform .25s var(--ease)}
.btn:hover{transform:translateY(-2px)}
.btn--teal{background:var(--teal);color:#fff}.btn--teal:hover{background:var(--deep)}
.btn--ghost{border:1px solid rgba(46,46,46,.2);color:var(--ink)}.btn--ghost:hover{border-color:var(--teal);color:var(--teal)}
.btn--gold{background:var(--gold);color:var(--deep)}.btn--gold:hover{background:#fff}
.grain{position:fixed;inset:0;pointer-events:none;z-index:100;opacity:.05;background-image:url(/img/grain-light.png);mix-blend-mode:multiply}

/* nav */
.nav{position:fixed;inset:0 0 auto;z-index:60;transition:background .4s,box-shadow .4s,backdrop-filter .4s}
.nav.solid{background:rgba(251,250,247,.86);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 1px 0 var(--line)}
.nav .shell{display:flex;align-items:center;justify-content:space-between;min-height:76px;gap:20px}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink)}
.logo svg{width:40px;height:31px}
.logo b{display:block;font:500 22px/1 var(--serif);letter-spacing:.14em}.logo small{display:block;font:600 8.5px/1 var(--sans);letter-spacing:.32em;margin-top:5px;color:var(--ink2)}
.nav__links{display:none;gap:28px;align-items:center;font:500 15px/1 var(--sans)}
.nav__links a{text-decoration:none}.nav__links a:not(.btn):hover,.nav__links a[aria-current]{color:var(--teal)}
@media(min-width:960px){.nav__links{display:flex}}

/* hero: the headline, then a wide team photo that opens to full width as you scroll */
.hero{position:relative;padding-top:clamp(120px,14vw,170px);overflow:hidden}
.hero__wash{position:absolute;inset:0 0 40%;background:
 radial-gradient(50% 60% at 88% 10%,rgba(47,157,168,.18),transparent 70%),
 radial-gradient(40% 50% at 8% 30%,rgba(230,192,104,.16),transparent 70%),
 linear-gradient(180deg,#fff 0%,var(--paper) 100%)}
.hero__top{position:relative;display:grid;gap:28px}
@media(min-width:1000px){.hero__top{grid-template-columns:1.25fr .75fr;align-items:end;gap:60px}}
.hero__top .side{display:grid;gap:22px;padding-bottom:14px}
.hero__top .btns{display:flex;gap:12px;flex-wrap:wrap}
.hero__frame{position:relative;margin-top:clamp(40px,5vw,64px);height:clamp(380px,72vh,760px);clip-path:inset(0% 5% 0% 5% round 28px)}
.hero__img{position:absolute;inset:-10% 0 0;background:url(/img/team-meeting.jpg) center 35%/cover;will-change:transform}
.hero__frame::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,58,71,0) 55%,rgba(6,58,71,.35))}
.chip{position:absolute;z-index:2;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 16px;box-shadow:0 18px 40px -22px rgba(6,58,71,.5);font:500 14px/1.25 var(--sans);white-space:nowrap}
.chip i{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--tint);color:var(--teal);font-style:normal;font-weight:700}
.chip small{display:block;color:var(--ink2);font-size:12px}
.chip--a{left:9%;bottom:12%}.chip--b{right:9%;top:12%}
@media(max-width:700px){.chip--b{display:none}.chip--a{left:8%;bottom:8%}}

/* photographic devices (Matt's mockups): the device PNG on top, the live screen mapped into its glass
   with a CSS matrix3d computed from the screen's four corners, clipped to the device outline */
.dev{position:relative;width:100%}
.dev__stage{position:absolute;left:0;top:0;transform-origin:0 0}
.dev__clip{position:absolute;inset:0;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.dev__screen{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden;background:#f4f7f8}
.dev__screen img{position:absolute;left:0;top:0;width:100%;will-change:transform}
.dev__screen img.fill{height:100%;object-fit:cover;object-position:top}
.dev__frame{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.dev__shadow{position:absolute;left:14%;right:10%;bottom:-4%;height:8%;border-radius:50%;background:radial-gradient(closest-side,rgba(6,58,71,.38),rgba(6,58,71,0));filter:blur(8px)}
/* the device: a titanium body with real thickness (stacked layers behind the face), a thin
   bezel, the island, a status bar, a diagonal glare, and a shadow on the ground under it */
.phone{position:relative;aspect-ratio:9/19.5;transform-style:preserve-3d}
.phone__layer{position:absolute;inset:0;border-radius:15%/7%;background:linear-gradient(160deg,#cfd2d6,#7c8086 45%,#b9bcc1 70%,#6e7277)}
.phone__face{position:absolute;inset:0;border-radius:15%/7%;padding:2.2%;background:linear-gradient(140deg,#f5f6f7 0%,#a7aaaf 20%,#eceef0 42%,#8b8f95 64%,#d8dade 84%,#9a9da2 100%);transform:translateZ(0)}
.phone__bezel{height:100%;border-radius:13.6%/6.3%;background:#08090a;padding:3.4%}
.phone__screen{position:relative;width:100%;height:100%;border-radius:11.8%/5.4%;overflow:hidden;background:#f4f7f8}
.phone__screen img{position:absolute;left:0;top:0;width:100%;will-change:transform}
.phone__island{position:absolute;z-index:6;top:1.9%;left:50%;translate:-50% 0;width:31%;height:3.4%;border-radius:99px;background:#000}
.phone__island::after{content:"";position:absolute;right:13%;top:50%;translate:0 -50%;width:18%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 35%,#2b3a55,#05070b 60%)}
.phone__status{position:absolute;z-index:5;inset:0 0 auto;height:6.2%;display:flex;justify-content:space-between;align-items:center;padding:0 9% 0 10%;
 font:600 clamp(10px,1vw,13px)/1 -apple-system,"SF Pro Text","Segoe UI",var(--sans);color:#111;background:linear-gradient(#f4f7f8 72%,rgba(244,247,248,0))}
.phone__status svg{height:1em;width:auto;margin-left:4px}
.phone__glare{position:absolute;inset:0;z-index:7;border-radius:inherit;pointer-events:none;background:linear-gradient(118deg,rgba(255,255,255,.28) 0%,rgba(255,255,255,.07) 34%,rgba(255,255,255,0) 34.2%,rgba(255,255,255,0) 100%)}
.phone__btn{position:absolute;width:1.4%;border-radius:2px;background:linear-gradient(90deg,#6c7075,#d4d6da,#7a7e83)}
.phone__btn.v1{left:-.9%;top:19%;height:4%}.phone__btn.v2{left:-.9%;top:25%;height:7%}.phone__btn.v3{left:-.9%;top:33.5%;height:7%}.phone__btn.p{right:-.9%;top:27%;height:11%}
.phone--loop img{animation:scrollshot var(--loop,22s) ease-in-out infinite alternate}
.ground{position:absolute;left:12%;right:12%;bottom:-7%;height:9%;border-radius:50%;background:radial-gradient(closest-side,rgba(6,58,71,.42),rgba(6,58,71,0));filter:blur(6px)}
/* pivoted: the body turns, so its titanium edge shows */
.tilt{--ry:-24deg;--rx:10deg;--rz:-6deg;position:relative;perspective:1400px}
.tilt--r{--ry:22deg;--rx:9deg;--rz:5deg}
.tilt .phone{transform:rotateY(var(--ry)) rotateX(var(--rx)) rotateZ(var(--rz))}
.tilt--back .phone{--ry:-14deg;--rx:58deg;--rz:-28deg}
.duo{position:relative;width:min(300px,66vw);margin-inline:auto;padding:4% 0 10%}
.duo .tilt--r{position:relative;z-index:2;width:100%}
.duo .tilt--back{position:absolute;z-index:1;width:92%;left:-38%;bottom:-2%;opacity:.96}
.duo .ground{bottom:3%;left:-10%;right:0}
@keyframes scrollshot{0%,8%{transform:translateY(0)}92%,100%{transform:translateY(calc(-1 * var(--travel,0px)))}}

/* marquee */
.marq{padding:46px 0;border-block:1px solid var(--line);overflow:hidden;background:#fff}
.marq__label{text-align:center;margin-bottom:26px}
.marq__track{display:flex;width:max-content;animation:marq 38s linear infinite}
.marq__group{display:flex;align-items:center;gap:80px;padding-right:80px}
.marq img{height:54px;width:auto;filter:grayscale(1);opacity:.7}
.marq span{font:500 22px/1 var(--serif);color:var(--ink2);white-space:nowrap}
@keyframes marq{to{transform:translateX(-50%)}}

/* story */
.story{position:relative;background:var(--paper)}
.story__intro{padding:clamp(90px,10vw,140px) 0 40px;display:grid;gap:18px;max-width:900px}
.story__beats{display:grid;gap:80px;padding-bottom:100px}
.beat{display:grid;gap:30px}
.beat__copy{display:grid;gap:16px;align-content:center}
.beat__copy h3{font:500 clamp(32px,4vw,54px)/1.05 var(--serif);letter-spacing:-.01em}
.beat__copy ul{list-style:none;padding:0;margin:8px 0 0;display:grid;gap:10px}
.beat__copy li{display:flex;gap:12px;align-items:baseline;color:var(--ink)}
.beat__copy li::before{content:"";flex:none;width:18px;height:1.5px;background:var(--gold);translate:0 -4px}
.beat .phone{width:min(260px,68vw);margin-inline:auto}
.beat__photo{position:relative;aspect-ratio:4/3;border-radius:24px;overflow:hidden;box-shadow:0 40px 70px -45px rgba(6,58,71,.5)}
.beat__photo>div{position:absolute;inset:-6%;background-size:cover;background-position:center}
.pill{position:absolute;left:18px;bottom:18px;z-index:2;display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);border-radius:99px;padding:10px 16px;font:500 14px/1 var(--sans);color:var(--ink);box-shadow:0 14px 30px -18px rgba(6,58,71,.6)}
.pill i{width:8px;height:8px;border-radius:50%;background:var(--gold)}
.nav__cta{display:inline-flex;padding:11px 18px;font-size:14px}
@media(min-width:960px){.nav__cta{display:none}}
/* the phone menu: a button beside Book a call opens every page as a sheet under the bar */
.nav__end{display:flex;align-items:center;gap:10px}
.burger{width:46px;height:46px;border-radius:50%;border:1px solid rgba(46,46,46,.16);background:#fff;display:grid;place-items:center;cursor:pointer;padding:0;color:var(--ink)}
.burger span{position:relative;display:block;width:18px;height:1.5px;background:currentColor;transition:background .2s}
.burger span::before,.burger span::after{content:"";position:absolute;left:0;width:18px;height:1.5px;background:currentColor;transition:transform .35s var(--ease)}
.burger span::before{top:-6px}.burger span::after{top:6px}
.menu-open .burger span{background:transparent}.menu-open .burger span::before{transform:translateY(6px) rotate(45deg)}.menu-open .burger span::after{transform:translateY(-6px) rotate(-45deg)}
.sheet{position:fixed;inset:0;z-index:59;background:var(--paper);padding:96px 16px 32px;display:flex;flex-direction:column;opacity:0;visibility:hidden;transform:translateY(-12px);transition:opacity .3s var(--ease),transform .4s var(--ease),visibility 0s .4s;overflow-y:auto}
.menu-open .sheet{opacity:1;visibility:visible;transform:none;transition:opacity .3s var(--ease),transform .4s var(--ease)}
.menu-open .nav{background:var(--paper);box-shadow:0 1px 0 var(--line)}
.sheet a{display:flex;justify-content:space-between;align-items:center;padding:18px 4px;border-bottom:1px solid var(--line);text-decoration:none;font:500 30px/1.1 var(--serif);color:var(--ink)}
.sheet a::after{content:"\2192";font:400 20px/1 var(--sans);color:var(--teal2)}
.sheet a[aria-current]{color:var(--teal)}.sheet a[aria-current]::after{content:"\2022"}
.sheet small{margin-top:auto;padding-top:28px;color:var(--ink2);font-size:14px}.sheet small a{display:inline;padding:0;border:0;font:600 14px/1.4 var(--sans);color:var(--teal)}.sheet small a::after{content:none}
@media(min-width:960px){.burger,.sheet{display:none}}
.logo span,.nav__cta{white-space:nowrap}
@media(max-width:480px){.logo{gap:8px}.logo svg{width:34px;height:26px}.logo b{font-size:19px;letter-spacing:.12em}.logo small{font-size:7.5px;letter-spacing:.26em}.nav__cta{padding:11px 15px;font-size:14px}.burger{width:44px;height:44px}.nav .shell{gap:10px}}
@media(max-width:359px){.nav__cta{display:none}}
@media(min-width:1000px){
 .story__beats{gap:clamp(110px,12vw,170px);padding-bottom:140px}
 .beat{grid-template-columns:1fr 1.05fr;align-items:center;gap:clamp(48px,6vw,96px)}
 .beat:nth-child(even) .beat__copy{order:2}
 .beat .beat__vis.tilt-host{display:grid;place-items:center;min-height:620px;border-radius:28px;background:radial-gradient(70% 60% at 50% 45%,rgba(47,157,168,.2),transparent 70%),linear-gradient(160deg,var(--tint),#fff)}
 .beat .tilt-host .tilt{width:270px}
}
}

/* rhythm: four cards, each with its own small live picture */
.rhythm{position:relative;padding:clamp(90px,10vw,140px) 0;overflow:hidden;background:linear-gradient(180deg,#fff,var(--tint))}
.rhythm::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(12,105,128,.12) 1px,transparent 1.2px);background-size:24px 24px;-webkit-mask-image:linear-gradient(180deg,transparent,#000 30%,#000 70%,transparent);mask-image:linear-gradient(180deg,transparent,#000 30%,#000 70%,transparent);pointer-events:none}
.rhythm .shell{position:relative}
.rhythm__head{display:grid;gap:16px;max-width:760px;margin-bottom:56px}
.rhythm__line{position:relative;display:grid;gap:22px}
@media(min-width:760px){.rhythm__line{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1100px){.rhythm__line{grid-template-columns:repeat(4,1fr)}}
.rhythm svg{position:absolute;left:4%;right:4%;top:-26px;width:92%;height:4px;display:none}
@media(min-width:1100px){.rhythm svg{display:block}}
.rhythm path{stroke:var(--gold);stroke-width:3;fill:none;stroke-linecap:round}
.step{position:relative;background:#fff;border:1px solid var(--line);border-radius:24px;padding:22px 22px 26px;display:grid;gap:10px;align-content:start;box-shadow:0 30px 60px -48px rgba(6,58,71,.55);transition:transform .5s var(--ease),box-shadow .5s var(--ease)}
.step:hover{transform:translateY(-6px);box-shadow:0 40px 70px -45px rgba(6,58,71,.6)}
.step::before{content:"";position:absolute;top:-33px;left:28px;width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid var(--teal);display:none}
@media(min-width:1100px){.step::before{display:block}}
.step__n{font:500 54px/1 var(--serif);color:transparent;-webkit-text-stroke:1px var(--gold2);letter-spacing:-.02em}
.step small{font:600 12px/1 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--teal2)}
.step h3{font:500 27px/1.1 var(--serif)}.step p{color:var(--ink2);font-size:15.5px}
.viz{height:150px;border-radius:16px;background:var(--paper);border:1px solid var(--line);margin-bottom:6px;position:relative;overflow:hidden;padding:16px}
/* 1: a call in progress */
.viz-call{display:grid;grid-template-columns:auto 1fr;gap:14px;align-content:center}
.viz-call .avs{display:flex}.viz-call .av{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font:600 13px/1 var(--sans);color:#fff;background:var(--teal);border:3px solid var(--paper)}
.viz-call .av+.av{margin-left:-10px;background:var(--gold);color:var(--deep)}
.wave{display:flex;align-items:center;gap:3px;height:40px}
.wave i{flex:1;height:30%;border-radius:3px;background:var(--teal2);animation:wave 1.1s ease-in-out infinite;animation-play-state:paused}
.step.in .wave i{animation-play-state:running}
@keyframes wave{50%{height:100%}}
.viz-call .lbl{grid-column:1/-1;display:flex;justify-content:space-between;font:500 13px/1 var(--sans);color:var(--ink2)}
.viz-call .lbl b{color:var(--ink);font-weight:600}.viz-call .rec{display:flex;gap:6px;align-items:center}.viz-call .rec::before{content:"";width:7px;height:7px;border-radius:50%;background:#e0604f;animation:blink 1.4s infinite}
@keyframes blink{50%{opacity:.25}}
/* 2: the proposal, ticked line by line */
.viz-doc b{display:block;font:600 13px/1 var(--sans);margin-bottom:10px}
.viz-doc{padding:14px 16px}
.viz-doc ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.viz-doc li{display:flex;align-items:center;gap:10px;font-size:13px;line-height:1.5;color:var(--ink2)}
.viz-doc li::before{content:"";width:16px;height:16px;border-radius:5px;border:1.5px solid #c9d3d5;flex:none;transition:background .3s,border-color .3s}
.viz-doc li.on{color:var(--ink)}
.step.in .viz-doc li.on::before{background:var(--teal) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 8.5l2.5 2.5L12 5.5' fill='none' stroke='white' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") center/100%;border-color:var(--teal)}
.viz-doc li:nth-child(2)::before{transition-delay:.35s}.viz-doc li:nth-child(3)::before{transition-delay:.7s}.viz-doc li:nth-child(4)::before{transition-delay:1.05s}
/* 3: thirty days filling */
.viz-days{display:grid;align-content:space-between}
.days{display:grid;grid-template-columns:repeat(10,1fr);gap:5px}
.days i{aspect-ratio:1;border-radius:4px;background:#e2e8e9;transition:background .25s}
.days i.f{background:var(--teal2)}.days i.f.last{background:var(--gold)}
.viz-days .lbl{display:flex;justify-content:space-between;font:500 13px/1 var(--sans);color:var(--ink2)}.viz-days .lbl b{color:var(--ink)}
/* 4: the month, with the close signed off */
.viz-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;align-content:start}
.viz-cal span{font:600 9.5px/1 var(--sans);color:var(--ink2);text-align:center;padding-bottom:2px}
.viz-cal i{height:15px;border-radius:4px;background:#eaeeef}
.viz-cal i.close{background:var(--gold)}.viz-cal i.board{background:var(--teal)}
.stamp{position:absolute;right:12px;bottom:12px;display:flex;align-items:center;gap:7px;background:#fff;border:1px solid var(--line);border-radius:99px;padding:7px 12px;font:600 12px/1 var(--sans);box-shadow:0 10px 24px -14px rgba(6,58,71,.6);transform:scale(.6) translateY(10px);opacity:0;transition:transform .5s cubic-bezier(.3,1.6,.5,1) 1s,opacity .3s 1s}
.stamp i{width:16px;height:16px;border-radius:50%;background:#2fb36f;display:grid;place-items:center;color:#fff;font-style:normal;font-size:10px}
.step.in .stamp{transform:none;opacity:1}

/* schools */
.schools{position:relative;padding:clamp(90px,10vw,140px) 0;background:var(--cream);overflow:hidden}
.schools__band{position:relative;aspect-ratio:2000/612;min-height:280px;border-radius:28px;overflow:hidden;margin-bottom:56px}
.schools__band div{position:absolute;inset:-6% 0;background:url(img/school-hephzibah.jpg) center/cover}
.schools__band h2{position:absolute;left:clamp(20px,4vw,56px);bottom:clamp(20px,4vw,48px);color:#fff;max-width:760px;text-shadow:0 2px 30px rgba(0,0,0,.35)}
.schools__band h2 em{color:var(--gold)}
.schools__band::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,58,71,.6),transparent 60%)}
.schools__band h2{z-index:1}
@media(max-width:760px){.schools__band{aspect-ratio:auto;min-height:0;height:clamp(240px,62vw,320px);margin-bottom:36px}.schools__band div{background-position:30% center}.schools__band h2{font-size:clamp(30px,8.4vw,40px);right:20px}}
.cards{display:grid;gap:22px}
@media(min-width:800px){.cards{grid-template-columns:repeat(3,1fr)}}
.card{background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 30px 60px -45px rgba(6,58,71,.5)}
.card div{aspect-ratio:4/3;background-size:cover;background-position:center}
.card section{padding:20px 22px 24px;display:grid;gap:4px}
.card h3{font:500 24px/1.15 var(--serif)}.card small{color:var(--ink2);font-size:14.5px}

/* dashboard: the laptop opens as it arrives, its screen scrolls the real dashboard, figures float in */
.dash{padding:clamp(90px,10vw,140px) 0;background:linear-gradient(180deg,var(--tint),#fff 60%);overflow:hidden}
.dash .shell{display:grid;gap:50px;align-items:center}
@media(min-width:1000px){.dash .shell{grid-template-columns:.75fr 1.25fr}}
.dash__copy{display:grid;gap:20px}
.lap{position:relative;padding:20px 0 40px}
.devwrap--laptop{width:min(560px,92%);margin:0 auto}
.devwrap--phone{width:min(300px,70vw);margin:0 auto;padding:2% 0 6%}
@media(min-width:1000px){.beat .tilt-host .devwrap--phone{width:310px}}
.mac{position:relative;width:86%;margin:0 auto;transform-style:preserve-3d;transform:rotateX(-18deg) rotateY(-16deg) rotateZ(1deg)}
.lap__lid{position:relative;transform-origin:50% 100%;transform:rotateX(var(--open,-10deg));transform-style:preserve-3d;border-radius:3.2%/5%;padding:.5%;
 background:linear-gradient(135deg,#eef0f2,#b7bbc0 40%,#e2e4e7 60%,#a7abb0)}
.lap__bezel{border-radius:2.8%/4.4%;background:#0a0b0c;padding:2% 2% 2.6%}
.lap__screen{position:relative;aspect-ratio:16/10;border-radius:.6%/1%;overflow:hidden;background:#f4f7f8}
.lap__screen img{position:absolute;left:0;top:0;width:100%;will-change:transform}
.lap__notch{position:absolute;z-index:3;top:0;left:50%;translate:-50% 0;width:11%;height:3.6%;border-radius:0 0 8px 8px;background:#0a0b0c}
.lap__notch::after{content:"";position:absolute;left:50%;top:40%;width:7px;height:7px;translate:-50% -50%;border-radius:50%;background:radial-gradient(circle at 35% 35%,#26344c,#030406 60%)}
.lap__screen::after{content:"";position:absolute;inset:0;background:linear-gradient(118deg,rgba(255,255,255,.2) 0%,rgba(255,255,255,.05) 36%,rgba(255,255,255,0) 36.2%);pointer-events:none;z-index:2}
/* the deck lies flat in front of the lid: keyboard well, keys, trackpad */
.lap__deck{position:absolute;left:-1.5%;right:-1.5%;top:100%;aspect-ratio:1.55/1;transform-origin:50% 0;transform:rotateX(90deg);transform-style:preserve-3d;
 border-radius:0 0 4%/0 0 6%;background:linear-gradient(180deg,#d9dce0,#eef0f2 30%,#e4e6e9);box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}
.lap__deck::before{content:"";position:absolute;inset:0;border-radius:inherit;transform:translateZ(-10px);background:#9fa4aa}
.lap__keys{position:absolute;left:11%;right:11%;top:7%;height:42%;border-radius:1.5%;background:#2b2e32;padding:1%;display:grid;grid-template-rows:repeat(6,1fr);gap:3%}
.lap__keys div{display:flex;gap:1%}
.lap__keys i{flex:1;border-radius:2px;background:linear-gradient(#1a1c1f,#111214);box-shadow:inset 0 -1px 0 rgba(255,255,255,.06)}
.lap__keys div:first-child i{opacity:.8}
.lap__pad{position:absolute;left:30%;right:30%;top:55%;bottom:8%;border-radius:3%/5%;background:linear-gradient(180deg,#d3d6da,#dfe2e5);box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
.lap__lip{position:absolute;left:44%;right:44%;bottom:0;height:2%;border-radius:4px 4px 0 0;background:#b9bdc2}
.lap__shadow{position:absolute;left:6%;right:6%;bottom:40px;height:60px;border-radius:50%;background:radial-gradient(closest-side,rgba(6,58,71,.35),rgba(6,58,71,0));filter:blur(10px)}
.stat{position:absolute;z-index:2;background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px 18px;box-shadow:0 24px 50px -28px rgba(6,58,71,.55);display:grid;gap:4px;min-width:150px}
.stat small{font:600 10.5px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--ink2)}
.stat b{font:500 30px/1 var(--serif);color:var(--ink)}
.stat em{font-style:normal;font-size:12.5px;color:var(--teal)}
.stat--a{left:-4%;top:6%}.stat--b{right:-3%;top:34%}.stat--c{left:-4%;bottom:30%}
@media(max-width:700px){.stat{min-width:0;padding:10px 12px}.stat b{font-size:22px}.stat--a{left:0}.stat--b{right:0}}
.dash__note{font-size:13px;color:var(--ink2)}

/* team */
.team{padding:clamp(90px,10vw,140px) 0;background:var(--paper)}
.team__head{display:grid;gap:16px;max-width:760px;margin-bottom:48px}
.people{display:grid;gap:24px;grid-template-columns:repeat(2,1fr)}
@media(min-width:900px){.people{grid-template-columns:repeat(4,1fr)}}
.person .ph{aspect-ratio:4/5;border-radius:20px;background-size:cover;background-position:center 20%;filter:saturate(.9);transition:transform .6s var(--ease)}
.person:hover .ph{transform:translateY(-6px)}
.person h3{font:500 21px/1.2 var(--serif);margin-top:14px}.person p{color:var(--ink2);font-size:14.5px;line-height:1.4}

/* footer card */
.end{padding:0 0 28px;background:var(--paper)}
.end__card{position:relative;border-radius:32px;background:var(--deep);color:#eef4f4;padding:clamp(40px,7vw,96px) clamp(24px,6vw,80px);overflow:hidden}
.end__card .mark{position:absolute;right:-80px;bottom:-60px;width:520px;height:auto;opacity:.16}
.end__card h2{color:#fff;max-width:760px}.end__card h2 em{color:var(--gold)}
.end__row{display:flex;gap:14px;flex-wrap:wrap;margin:30px 0 60px}
.end__links{display:grid;gap:30px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));position:relative;border-top:1px solid rgba(255,255,255,.15);padding-top:30px;font-size:15px}
.end__links h4{margin:0 0 10px;font:600 12px/1 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}
.end__links a{display:block;text-decoration:none;color:#cfe0e3;margin-bottom:6px}.end__links a:hover{color:#fff}
.end__card .logo{color:#fff}.end__card .logo small{color:#9fc0c6}

/* reveal */
.rv{opacity:0;transform:translateY(26px)}
@media(prefers-reduced-motion:reduce){.tilt{--ry:-10deg;--rx:4deg;--rz:1deg}.rv{opacity:1;transform:none}.marq__track,.phone--loop img{animation:none}}
"""

JS = r"""<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"></script>
<script>
(function(){
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var nav=document.getElementById('nav');
function solid(){nav.classList.toggle('solid',scrollY>30)}addEventListener('scroll',solid,{passive:true});solid();
/* the phone menu */
var burger=document.getElementById('burger'),root=document.documentElement;
function menu(open){root.classList.toggle('menu-open',open);burger.setAttribute('aria-expanded',open);burger.setAttribute('aria-label',open?'Close menu':'Open menu');
 document.getElementById('sheet').inert=!open;if(window.__lenis){open?window.__lenis.stop():window.__lenis.start()}document.body.style.overflow=open?'hidden':''}
if(burger){burger.addEventListener('click',function(){menu(!root.classList.contains('menu-open'))});
 document.querySelectorAll('#sheet a').forEach(function(a){a.addEventListener('click',function(){menu(false)})});
 addEventListener('keydown',function(e){if(e.key==='Escape')menu(false)});
 addEventListener('resize',function(){if(innerWidth>=960)menu(false)});document.getElementById('sheet').inert=true;}
/* looping phones: travel = image height less screen height */
function travel(){document.querySelectorAll('.phone--loop').forEach(function(p){var s=p.querySelector('.phone__screen'),i=s.querySelector('img');
 if(i.complete&&i.naturalWidth){p.style.setProperty('--travel',Math.max(0,i.clientHeight-s.clientHeight)+'px')}else i.addEventListener('load',travel,{once:true})})}
addEventListener('resize',travel);travel();
if(reduce||!window.gsap){document.querySelectorAll('.rv').forEach(function(e){e.style.opacity=1;e.style.transform='none'});return;}
gsap.registerPlugin(ScrollTrigger);
var lenis=new Lenis({lerp:.11});window.__lenis=lenis;lenis.on('scroll',ScrollTrigger.update);
gsap.ticker.add(function(t){lenis.raf(t*1000)});gsap.ticker.lagSmoothing(0);
var EASE='power3.out';
/* the device mockups: scale each stage to its box and map the screen into the glass */
function homog(s,d){var A=[],B=[];for(var i=0;i<4;i++){var x=s[i][0],y=s[i][1],u=d[i][0],v=d[i][1];
 A.push([x,y,1,0,0,0,-u*x,-u*y]);B.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);B.push(v);}
 for(var c=0;c<8;c++){var p=c;for(var r=c+1;r<8;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;var t=A[c];A[c]=A[p];A[p]=t;t=B[c];B[c]=B[p];B[p]=t;
  for(r=c+1;r<8;r++){var f=A[r][c]/A[c][c];for(var k=c;k<8;k++)A[r][k]-=f*A[c][k];B[r]-=f*B[c];}}
 var h=new Array(8);for(c=7;c>=0;c--){var s2=B[c];for(k=c+1;k<8;k++)s2-=A[c][k]*h[k];h[c]=s2/A[c][c];}
 return 'matrix3d('+[h[0],h[3],0,h[6],h[1],h[4],0,h[7],0,0,1,0,h[2],h[5],0,1].join(',')+')';}
function fitDevices(){document.querySelectorAll('.dev').forEach(function(d){var W=+d.dataset.w,st=d.querySelector('.dev__stage'),sc=d.querySelector('.dev__screen');
 st.style.transform='scale('+(d.clientWidth/W)+')';
 if(!sc.dataset.m){var sw=+d.dataset.sw,sh=+d.dataset.sh,q=JSON.parse(d.dataset.quad);sc.style.transform=homog([[0,0],[sw,0],[sw,sh],[0,sh]],q);sc.dataset.m=1;}});}
addEventListener('resize',fitDevices);fitDevices();
/* hero: lines rise in, then the photo opens from a framed card to the full width as you scroll */
gsap.from('.hero .rv-in',{y:40,opacity:0,duration:1.1,ease:EASE,stagger:.09,delay:.1});
gsap.from('.hero__frame',{y:60,opacity:0,duration:1.3,ease:EASE,delay:.3});
gsap.from('.hero .chip',{y:24,opacity:0,duration:1,ease:EASE,stagger:.18,delay:1});
gsap.fromTo('.hero__frame',{clipPath:'inset(0% 5% 0% 5% round 28px)'},{clipPath:'inset(0% 0% 0% 0% round 0px)',ease:'none',scrollTrigger:{trigger:'.hero__frame',start:'top 75%',end:'top 10%',scrub:.6}});
gsap.fromTo('.hero__img',{scale:1.12},{scale:1,yPercent:8,ease:'none',scrollTrigger:{trigger:'.hero__frame',start:'top bottom',end:'bottom top',scrub:.6}});
gsap.to('.chip--a',{y:-40,ease:'none',scrollTrigger:{trigger:'.hero__frame',start:'top 60%',end:'bottom top',scrub:.8}});
gsap.to('.chip--b',{y:30,ease:'none',scrollTrigger:{trigger:'.hero__frame',start:'top 60%',end:'bottom top',scrub:.8}});
/* reveals */
gsap.utils.toArray('.rv').forEach(function(el){gsap.to(el,{opacity:1,y:0,duration:1,ease:EASE,scrollTrigger:{trigger:el,start:'top 86%'}})});
gsap.to('.schools__band div',{yPercent:14,ease:'none',scrollTrigger:{trigger:'.schools__band',start:'top bottom',end:'bottom top',scrub:true}});
/* the rhythm: the line draws, each card wakes as it arrives, the thirty days fill with the scroll */
var path=document.querySelector('.rhythm path');if(path){var L=path.getTotalLength();path.style.strokeDasharray=L;path.style.strokeDashoffset=L;
 gsap.to(path,{strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:'.rhythm__line',start:'top 80%',end:'top 30%',scrub:.8}});}
gsap.utils.toArray('.step').forEach(function(s,i){gsap.from(s,{y:50,opacity:0,duration:.9,ease:EASE,delay:i*.12,scrollTrigger:{trigger:'.rhythm__line',start:'top 82%',onEnter:function(){setTimeout(function(){s.classList.add('in')},i*180+300)}}})});
(function(){var days=[].slice.call(document.querySelectorAll('.days i')),lbl=document.querySelector('.viz-days .lbl b');if(!days.length)return;
 ScrollTrigger.create({trigger:'.rhythm',start:'top 60%',end:'bottom 70%',scrub:true,onUpdate:function(self){var n=Math.round(self.progress*30);
  days.forEach(function(d,k){d.classList.toggle('f',k<n);d.classList.toggle('last',k===n-1)});if(lbl)lbl.textContent='Day '+Math.max(1,n)+' of 30';}});})();
/* the services: plain scrolling sections. Each photo drifts a little as it passes; the one
   phone scrolls its screen and straightens while it is on screen. Nothing holds the page. */
gsap.utils.toArray('.beat__photo > div').forEach(function(d){gsap.fromTo(d,{yPercent:-5,scale:1.06},{yPercent:5,scale:1,ease:'none',scrollTrigger:{trigger:d.parentNode,start:'top bottom',end:'bottom top',scrub:.6}})});
gsap.utils.toArray('.beat__copy').forEach(function(c){gsap.from(c.children,{y:26,opacity:0,duration:.9,ease:EASE,stagger:.07,scrollTrigger:{trigger:c,start:'top 82%'}})});
document.querySelectorAll('.tilt-host').forEach(function(h){var tl=h.querySelector('.devwrap'),s=h.querySelector('.dev__screen'),img=s.querySelector('img');
 ScrollTrigger.create({trigger:h,start:'top bottom',end:'bottom top',onUpdate:function(self){var k=self.progress;
  gsap.set(img,{y:-Math.max(0,img.clientHeight-s.clientHeight)*Math.min(1,Math.max(0,(k-.15)/.7))});gsap.set(tl,{y:30-60*k,rotate:-2+3*k});}});});
/* the dashboard: lid opens, the screen scrolls, the figures float up and count */
(function(){var lap=document.querySelector('.devwrap--laptop');if(!lap)return;var scr=lap.querySelector('.dev__screen'),img=scr.querySelector('img');
 gsap.fromTo(lap,{y:80,rotate:-3,opacity:0},{y:0,rotate:0,opacity:1,ease:'none',scrollTrigger:{trigger:'.lap',start:'top 95%',end:'top 50%',scrub:.7}});
 gsap.to(lap,{y:-40,ease:'none',scrollTrigger:{trigger:'.lap',start:'top 50%',end:'bottom top',scrub:.8}});
 ScrollTrigger.create({trigger:'.lap',start:'top 70%',end:'bottom top',onUpdate:function(self){gsap.set(img,{y:-Math.max(0,img.clientHeight-scr.clientHeight)*self.progress})}});
 gsap.utils.toArray('.stat').forEach(function(s,i){gsap.fromTo(s,{y:40,opacity:0},{y:0,opacity:1,duration:.9,ease:EASE,delay:.15+i*.15,immediateRender:false,scrollTrigger:{trigger:'.lap',start:'top 72%',toggleActions:'restart none none reset'}});
  gsap.to(s,{y:[-36,24,-18][i],ease:'none',scrollTrigger:{trigger:'.lap',start:'top bottom',end:'bottom top',scrub:.8}});
  var b=s.querySelector('b'),to=parseFloat(b.dataset.to),dec=+(b.dataset.dec||0),pre=b.dataset.pre||'',suf=b.dataset.suf||'',o={v:0};
  gsap.fromTo(o,{v:0},{v:to,duration:1.6,ease:'power2.out',delay:.35+i*.15,immediateRender:false,scrollTrigger:{trigger:'.lap',start:'top 72%',toggleActions:'restart none none reset'},onUpdate:function(){b.textContent=pre+o.v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec})+suf}});});})();
addEventListener('load',function(){travel();fitDevices();ScrollTrigger.refresh()});
})();
</script>"""

def tilt(inner, right=False, cls=""):
    return f'<div class="tilt{" tilt--r" if right else ""} {cls}">{inner}</div>'

STATUS = ('<div class="phone__status"><span>9:41</span><span>'
          '<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>'
          '<svg viewBox="0 0 16 12"><path d="M8 11.5l2.2-2.6a3.2 3.2 0 00-4.4 0zM3.4 6.3a6.8 6.8 0 019.2 0l1.6-1.9a9.4 9.4 0 00-12.4 0zM0 2.4l1.6 1.9a11.6 11.6 0 0112.8 0L16 2.4a14.2 14.2 0 00-16 0z"/></svg>'
          '<svg viewBox="0 0 27 12"><rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="17" height="8" rx="1.8"/><rect x="24" y="4" width="2" height="4" rx="1" opacity=".45"/></svg>'
          '</span></div>')

DEV = json.loads((HERE / "devices.json").read_text())

def device(kind, shot, screen_w, alt=""):
    """One of Matt's device mockups with a live, scrollable screen."""
    import math
    m = DEV[kind]; q = m["quad"]
    qw = math.dist(q[0], q[1]); qh = math.dist(q[0], q[3])
    sw = screen_w; sh = round(screen_w * qh / qw)
    src = shot if shot.startswith("/") else "img/" + shot
    fill = ' class="fill"' if shot.startswith("/") else ""
    return (f'<div class="dev dev--{kind}" data-w="{m["w"]}" data-h="{m["h"]}" data-sw="{sw}" data-sh="{sh}" data-quad="{json.dumps(q)}" style="aspect-ratio:{m["w"]}/{m["h"]}">'
            f'<span class="dev__shadow"></span><div class="dev__stage" style="width:{m["w"]}px;height:{m["h"]}px">'
            f'<div class="dev__clip" style="-webkit-mask-image:url(img/device-{kind}-mask.png);mask-image:url(img/device-{kind}-mask.png)">'
            f'<div class="dev__screen" style="width:{sw}px;height:{sh}px"><img src="{src}"{fill} alt="{alt}" loading="lazy"></div></div>'
            f'<img class="dev__frame" src="img/device-{kind}.png" alt=""></div></div>')

def phone(img, loop=False, cls="", depth=9):
    layers = "".join(f'<span class="phone__layer" style="transform:translateZ({-k}px)"></span>' for k in range(depth, 0, -1))
    return (f'<div class="phone{" phone--loop" if loop else ""} {cls}">{layers}'
            '<span class="phone__btn v1"></span><span class="phone__btn v2"></span><span class="phone__btn v3"></span><span class="phone__btn p"></span>'
            f'<div class="phone__face"><div class="phone__bezel"><div class="phone__screen">{STATUS}<span class="phone__island"></span>'
            f'<img src="img/{img}" alt="" loading="lazy"><span class="phone__glare"></span></div></div></div></div>')

LINKS = [("services", "Services"), ("education", "Education"), ("dashboard", "BI Dashboard"), ("portal", "Client Portal")]

def nav(cur=""):
    """The one nav for every /next/ page. Links are relative, so the pages work under /next/ and in a preview."""
    cu = ' aria-current="page"'
    ls = "".join(f'<a href="{k}.html"{cu if k == cur else ""}>{t}</a>' for k, t in LINKS)
    pages = [("index", "Home")] + LINKS[:3] + [("about", "About"), ("portal", "Client Portal"), ("contact", "Contact")]
    sheet = "".join(f'<a href="{k}.html"{cu if k == (cur or "index") else ""}>{t}</a>' for k, t in pages)
    return (f'<nav class="nav" id="nav"><div class="shell"><a class="logo" href="index.html" aria-label="Elevate Managed Services">{mark("n")}<span><b>ELEVATE</b><small>MANAGED SERVICES</small></span></a>'
            f'<div class="nav__links">{ls}<a class="btn btn--teal" href="contact.html">Book a call</a></div><div class="nav__end"><a class="btn btn--teal nav__cta" href="contact.html">Book a call</a>'
            '<button class="burger" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="sheet"><span></span></button></div></div></nav>'
            f'<div class="sheet" id="sheet" aria-label="Site pages">{sheet}<small>Questions? <a href="mailto:{B.EMAIL}">{B.EMAIL}</a></small></div>')

def footer(h2="Ready to give your leaders <em>their time back?</em>"):
    return f'''<footer class="end"><div class="shell"><div class="end__card">{mark("f").replace("<svg ", '<svg class="mark" ', 1)}
<h2 class="h2">{h2}</h2>
<div class="end__row"><a class="btn btn--gold" href="contact.html">Book a discovery call</a><a class="btn" style="color:#fff;border:1px solid rgba(255,255,255,.3)" href="mailto:{B.EMAIL}">{B.EMAIL}</a></div>
<div class="end__links"><div><a class="logo" href="index.html">{mark("f2")}<span><b>ELEVATE</b><small>MANAGED SERVICES</small></span></a></div>
<div><h4>Services</h4><a href="services.html">Business services</a><a href="education.html">Education services</a><a href="dashboard.html">BI Dashboard</a></div>
<div><h4>Company</h4><a href="about.html">About</a><a href="about.html#team">Team</a><a href="contact.html">Contact</a></div>
<div><h4>Clients</h4><a href="portal.html">Client Portal</a><small style="display:block;margin-top:18px;color:#9fc0c6">&copy; 2026 Elevate Managed Services</small></div></div>
</div></div></footer>'''

def build():
    beats_html = ""
    for k, eb, title, line, bullets, (kind, f, label), _ in BEATS:
        li = "".join(f"<li>{b}</li>" for b in bullets)
        pill = f'<span class="pill"><i></i>{label}</span>'
        if kind == "phone":
            small = f'<div class="beat__vis tilt-host"><div class="devwrap devwrap--phone">{device("phone", f, 390)}</div></div>'
        else:
            small = f'<div class="beat__vis beat__photo"><div style="background-image:url(/img/{f})"></div>{pill}</div>'
        beats_html += (f'<article class="beat"><div class="beat__copy"><span class="eyebrow">{eb}</span>'
                       f'<h3>{title}</h3><p class="lede">{line}</p><ul>{li}</ul></div>{small}</article>')
    logos = [("client-tnc.png", "True North Companies"), ("client-trueplaces.png", "True Places"), ("client-tnk12.png", "TNK12"),
             ("client-belton.png", "Belton Preparatory Academy"), ("client-aia.png", "American Innovation Academies")]
    one = "".join(f'<img src="/img/{f}" alt="{a}">' for f, a in logos) + "<span>Upstate Prep Academy</span>"
    marquee = f'<div class="marq__track"><div class="marq__group">{one * 2}</div><div class="marq__group" aria-hidden="true">{one * 2}</div></div>'
    vizzes = [
        '<div class="viz viz-call"><div class="avs"><span class="av">E</span><span class="av">You</span></div>'
        '<div class="wave">' + "".join(f'<i style="animation-delay:{(k * 0.07) % 0.9:.2f}s"></i>' for k in range(18)) + '</div>'
        '<div class="lbl"><b>Discovery call</b><span class="rec">45 to 60 min</span></div></div>',
        '<div class="viz viz-doc"><b>Scoped proposal</b><ul><li class="on">Financial management</li><li class="on">Payroll &amp; HR</li>'
        '<li>Marketing</li><li class="on">Business intelligence</li></ul></div>',
        '<div class="viz viz-days"><div class="days">' + "<i></i>" * 30 + '</div><div class="lbl"><span>Onboarding</span><b>Day 1 of 30</b></div></div>',
        '<div class="viz viz-cal">' + "".join(f"<span>{d}</span>" for d in "SMTWTFS")
        + "".join(f'<i class="{"close" if k == 9 else "board" if k == 17 else ""}"></i>' for k in range(28))
        + '<span class="stamp"><i>&#10003;</i>Close signed off</span></div>',
    ]
    steps = "".join(f'<div class="step">{v}<span class="step__n">0{n}</span><small>{a}</small><h3>{b}</h3><p>{c}</p></div>'
                    for n, ((a, b, c), v) in enumerate(zip(B.HOW, vizzes), 1))
    schools = "".join(f'<article class="card rv"><div style="background-image:url(/img/{i})"></div><section><h3>{n}</h3><small>{a} &middot; {s}</small></section></article>'
                      for i, n, a, s in B.SCHOOLS)
    # every frame filled the same way (the old site's per-photo zooms exposed the edge of Vicki's file);
    # her photo is trimmed of the light one-pixel rows its file carries top and bottom
    local = {"provencher": "img/team-provencher.jpg"}
    team = "".join(f'<article class="person rv"><div class="ph" role="img" aria-label="{n}" style="background-image:url({local.get(k, "/img/team-" + k + ".jpg")})"></div><h3>{n}</h3><p>{t}</p></article>'
                   for k, n, t, c in B.TEAM)
    body = f'''<div class="grain" aria-hidden="true"></div>
{nav()}

<header class="hero"><div class="hero__wash"></div><div class="shell hero__top">
<div><span class="eyebrow rv-in">Back office for companies and schools</span>
<h1 class="display rv-in" style="margin-top:22px">Capacity for <em>today.</em></h1></div>
<div class="side"><p class="lede rv-in">Finance, payroll, HR, marketing and a live dashboard, run by one team so your leaders can lead.</p>
<div class="btns rv-in"><a class="btn btn--teal" href="contact.html">Book a discovery call</a><a class="btn btn--ghost" href="dashboard.html">See the dashboard</a></div></div></div>
<div class="hero__frame"><div class="hero__img"></div>
<div class="chip chip--a"><i>&#10003;</i><span>Close signed off<small>Every month, on the calendar</small></span></div>
<div class="chip chip--b"><i>&#8599;</i><span>Board package<small>Ready before the meeting</small></span></div></div></header>

<section class="marq" aria-label="Organizations we serve"><div class="marq__label eyebrow">Trusted by</div>{marquee}</section>

<section class="story" id="services"><div class="shell"><div class="story__intro"><span class="eyebrow rv">What we run</span>
<h2 class="h2 rv">One team behind <em>the whole back office.</em></h2></div>
<div class="story__beats">{beats_html}</div>

</div></section>

<section class="rhythm"><div class="shell"><div class="rhythm__head"><span class="eyebrow rv">How we start</span><h2 class="h2 rv">From first call to <em>a monthly rhythm.</em></h2></div>
<div class="rhythm__line" style="margin-top:40px"><svg viewBox="0 0 1000 4" preserveAspectRatio="none" aria-hidden="true"><path d="M0 2 H1000"/></svg>{steps}</div></div></section>

<section class="schools" id="schools"><div class="shell"><div class="schools__band rv"><div></div><h2 class="h2">Built for <em>charter schools.</em></h2></div>
<div class="cards">{schools}</div></div></section>

<section class="dash"><div class="shell"><div class="dash__copy"><span class="eyebrow rv">Business intelligence</span><h2 class="h2 rv">Leaders see the answer. <em>Finance sees the detail.</em></h2>
<p class="lede rv">One dashboard for every entity, cut to each person&rsquo;s role.</p>
<div class="rv"><a class="btn btn--teal" href="dashboard.html">Take the tour</a></div><p class="dash__note rv">Figures from the sample school network in the demo.</p></div>
<div class="lap"><div class="devwrap devwrap--laptop">{device("laptop", "bi-desk-education-home.jpg", 1280, "The Elevate BI dashboard on a sample school network")}</div>
<div class="stat stat--a"><small>Revenue</small><b data-to="21.9" data-dec="1" data-pre="$" data-suf="M">$21.9M</b><em>Year to date</em></div>
<div class="stat stat--b"><small>Seats filled</small><b data-to="86.6" data-dec="1" data-suf="%">86.6%</b><em>Across six campuses</em></div>
<div class="stat stat--c"><small>Students enrolled</small><b data-to="2582">2,582</b><em>Read from the SIS</em></div></div></div></section>

<section class="team"><div class="shell"><div class="team__head"><span class="eyebrow rv">The team</span><h2 class="h2 rv">The people <em>behind the numbers.</em></h2></div>
<div class="people">{team}</div></div></section>

{footer()}'''
    fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
             '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">')
    html = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            f'<title>Elevate Managed Services</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg" type="image/svg+xml">'
            f'{fonts}<style>{CSS}</style></head><body>{body}{JS}</body></html>')
    (HERE / "index.html").write_text(html)
    print("wrote", HERE / "index.html", len(html))

if __name__ == "__main__":
    build()
