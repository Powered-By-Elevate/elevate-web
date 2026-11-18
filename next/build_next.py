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
     B.BIZ[0][3][:4], ("photo", "team-papers.jpg", "Month-end close, signed off"), ""),
    ("people", "HR, payroll &amp; people", "One home base for every employee.",
     "Payroll, onboarding and personnel records, handled by people who know your team.",
     B.BIZ[3][3], ("photo", "team-laugh.jpg", "One home base for every employee"), ""),
    ("marketing", "Marketing", "Campaigns on the same cadence as the books.",
     "Brand, collateral and campaigns, measured against what they bring in.",
     B.BIZ[4][3] + ["Enrollment marketing for schools"], ("photo", "team-plan.jpg", "Campaigns held to a calendar"), ""),
    ("bi", "Business intelligence", "Every number, live.",
     "One dashboard for every entity, read straight from the systems you already use.",
     B.BIZ[5][3], ("phone", "bi-construction-home.jpg", "The real dashboard, on a sample company"), ""),
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
.nav__links a{text-decoration:none}.nav__links a:not(.btn):hover{color:var(--teal)}
@media(min-width:960px){.nav__links{display:flex}}

/* hero */
.hero{position:relative;min-height:100svh;padding-top:110px;display:grid;align-items:center;overflow:hidden}
.hero__wash{position:absolute;inset:0;background:
 radial-gradient(60% 55% at 85% 30%,rgba(47,157,168,.20),transparent 70%),
 radial-gradient(45% 45% at 70% 85%,rgba(230,192,104,.22),transparent 70%),
 linear-gradient(180deg,#fff 0%,var(--paper) 100%)}
.hero .shell{position:relative;display:grid;gap:48px;width:100%}
@media(min-width:1000px){.hero .shell{grid-template-columns:1.08fr .92fr;align-items:center}}
.hero__copy{display:grid;gap:26px;align-content:center}
.hero__copy .btns{display:flex;gap:12px;flex-wrap:wrap}
.hero__art{position:relative;height:clamp(560px,64vw,720px)}
@media(max-width:999px){.hero{padding-bottom:40px}.hero .tilt{left:4%}}
.hero__photo{position:absolute;inset:6% 0 10% 12%;border-radius:28px;overflow:hidden;box-shadow:0 50px 90px -50px rgba(6,58,71,.45)}
.hero__photo div{position:absolute;inset:-12% 0;background:url(/img/team-table.jpg) center/cover}
.hero__photo::after{content:"";position:absolute;inset:0;background:linear-gradient(200deg,rgba(255,255,255,0) 40%,rgba(6,58,71,.35))}
.hero .tilt{position:absolute;left:0;bottom:0;width:clamp(220px,22vw,290px)}
.chip{position:absolute;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 16px;box-shadow:0 18px 40px -22px rgba(6,58,71,.4);font:500 14px/1.25 var(--sans);white-space:nowrap}
.chip i{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--tint);color:var(--teal);font-style:normal;font-weight:700}
.chip small{display:block;color:var(--ink2);font-size:12px}
.chip--a{right:4%;top:2%}.chip--b{right:-2%;bottom:18%}
@media(max-width:999px){.chip--b{right:2%}}

/* phone */
.phone{aspect-ratio:9/19.3;border-radius:44px;background:#121416;padding:10px;box-shadow:0 60px 80px -40px rgba(6,58,71,.55),inset 0 0 0 1.5px #3a3d40}
.phone__screen{position:relative;width:100%;height:100%;border-radius:34px;overflow:hidden;background:#f4f7f8}
.phone__screen::before{content:"";position:absolute;z-index:3;top:9px;left:50%;translate:-50% 0;width:32%;height:22px;border-radius:99px;background:#121416}
.phone__screen img{position:absolute;left:0;top:0;width:100%;will-change:transform}
.phone__bar{position:absolute;z-index:3;right:3px;top:8%;width:3px;height:16%;border-radius:3px;background:rgba(0,0,0,.28)}
.phone--loop img{animation:scrollshot var(--loop,22s) ease-in-out infinite alternate}
/* the pivoted phone: turned a little for depth, with an edge, a sheen and a long soft shadow */
.tilt{--ry:-20deg;--rx:9deg;--rz:3deg;perspective:1500px}
.tilt--r{--ry:16deg;--rx:7deg;--rz:-2deg}
.tilt .phone{transform:rotateY(var(--ry)) rotateX(var(--rx)) rotateZ(var(--rz));transform-style:preserve-3d;
 box-shadow:-9px 6px 0 -2px #2a2e32,-10px 7px 0 -2px #4a4f54,0 70px 90px -45px rgba(6,58,71,.6),inset 0 0 0 1.5px #3a3d40}
.tilt--r .phone{box-shadow:9px 6px 0 -2px #2a2e32,10px 7px 0 -2px #4a4f54,0 70px 90px -45px rgba(6,58,71,.6),inset 0 0 0 1.5px #3a3d40}
.tilt .phone::after{content:"";position:absolute;inset:0;border-radius:44px;pointer-events:none;z-index:4;
 background:linear-gradient(118deg,rgba(255,255,255,.22) 0%,rgba(255,255,255,.06) 22%,transparent 40%)}
.tilt .phone{position:relative}
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
.story__stage{position:relative}
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
.chips{display:none}
.story__visual{display:none}
.nav__cta{display:inline-flex;padding:11px 18px;font-size:14px}
@media(min-width:960px){.nav__cta{display:none}}
@media(min-width:1000px){
 .story.pinned .story__stage{height:100vh;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:60px}
 .story.pinned .story__beats{position:relative;display:block;padding:0;height:62vh}
 .story.pinned .beat{position:absolute;inset:0;opacity:0;visibility:hidden}
 .story.pinned .beat .beat__vis{display:none}
 .story.pinned .beat.on{opacity:1;visibility:visible}
 .story.pinned .story__visual{display:block;position:relative;width:100%;height:min(66vh,560px)}
 .story.pinned .chips{display:flex;gap:8px;position:absolute;top:calc(76px + 18px);left:0;right:0;flex-wrap:wrap}
}
.chips button{border:1px solid var(--line);background:#fff;border-radius:99px;padding:9px 15px;font:500 13.5px/1 var(--sans);color:var(--ink2);cursor:pointer;transition:all .3s var(--ease)}
.chips button.on{background:var(--teal);border-color:var(--teal);color:#fff}
.vis{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity .7s var(--ease),visibility .7s,transform .9s var(--ease);transform:scale(.97)}
.vis.on{opacity:1;visibility:visible;transform:none}
.vis--photo{border-radius:28px;overflow:hidden;box-shadow:0 50px 90px -55px rgba(6,58,71,.55)}
.vis--photo>div{position:absolute;inset:-8%;background-size:cover;background-position:center;will-change:transform}
.vis--phone{display:grid;place-items:center}
.vis--phone::before{content:"";position:absolute;inset:4% 8%;border-radius:28px;background:radial-gradient(70% 60% at 50% 45%,rgba(47,157,168,.22),transparent 70%),linear-gradient(160deg,var(--tint),#fff)}
.vis--phone .tilt{position:absolute;left:50%;top:2%;translate:-50% 0;height:86%;aspect-ratio:9/19.3}
.vis--phone .tilt .phone{height:100%}
.vis--phone .pill{left:50%;translate:-50% 0;bottom:1%;white-space:nowrap}

/* rhythm */
.rhythm{background:#fff;padding:clamp(90px,10vw,140px) 0;position:relative;overflow:hidden}
.rhythm__head{display:grid;gap:16px;max-width:760px;margin-bottom:64px}
.rhythm__line{position:relative;display:grid;gap:44px}
@media(min-width:900px){.rhythm__line{grid-template-columns:repeat(4,1fr);gap:28px}}
.rhythm svg{position:absolute;left:0;right:0;top:9px;width:100%;height:4px;display:none}
@media(min-width:900px){.rhythm svg{display:block}}
.rhythm path{stroke:var(--gold);stroke-width:3;fill:none}
.step{position:relative;display:grid;gap:10px;padding-top:44px}
.step::before{content:"";position:absolute;top:0;left:0;width:22px;height:22px;border-radius:50%;background:#fff;border:3px solid var(--teal)}
.step small{font:600 12px/1 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--teal2)}
.step h3{font:500 28px/1.1 var(--serif)}.step p{color:var(--ink2);font-size:16px}

/* schools */
.schools{position:relative;padding:clamp(90px,10vw,140px) 0;background:var(--cream);overflow:hidden}
.schools__band{position:relative;height:clamp(300px,42vw,560px);border-radius:28px;overflow:hidden;margin-bottom:56px}
.schools__band div{position:absolute;inset:-15% 0;background:url(/img/school-front.jpg) center/cover}
.schools__band h2{position:absolute;left:clamp(20px,4vw,56px);bottom:clamp(20px,4vw,48px);color:#fff;max-width:760px;text-shadow:0 2px 30px rgba(0,0,0,.35)}
.schools__band h2 em{color:var(--gold)}
.schools__band::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,58,71,.6),transparent 60%)}
.schools__band h2{z-index:1}
.cards{display:grid;gap:22px}
@media(min-width:800px){.cards{grid-template-columns:repeat(3,1fr)}}
.card{background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 30px 60px -45px rgba(6,58,71,.5)}
.card div{aspect-ratio:4/3;background-size:cover;background-position:center}
.card section{padding:20px 22px 24px;display:grid;gap:4px}
.card h3{font:500 24px/1.15 var(--serif)}.card small{color:var(--ink2);font-size:14.5px}

/* dashboard band */
.dash{padding:clamp(90px,10vw,140px) 0;background:linear-gradient(180deg,#fff,var(--tint));overflow:hidden}
.dash .shell{display:grid;gap:50px;align-items:center}
@media(min-width:1000px){.dash .shell{grid-template-columns:.8fr 1.2fr}}
.dash__copy{display:grid;gap:20px}
.laptop{position:relative}
.laptop__lid{border-radius:18px 18px 6px 6px;background:#121416;padding:14px 14px 18px;box-shadow:0 50px 80px -50px rgba(6,58,71,.6)}
.laptop__lid img{border-radius:6px;width:100%;aspect-ratio:1518/1016;object-fit:cover;object-position:top}
.laptop__base{height:16px;margin:0 -6%;border-radius:0 0 18px 18px;background:linear-gradient(#d9dee0,#b9c1c4)}

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
/* looping phones: travel = image height less screen height */
function travel(){document.querySelectorAll('.phone--loop').forEach(function(p){var s=p.querySelector('.phone__screen'),i=s.querySelector('img');
 if(i.complete&&i.naturalWidth){p.style.setProperty('--travel',Math.max(0,i.clientHeight-s.clientHeight)+'px')}else i.addEventListener('load',travel,{once:true})})}
addEventListener('resize',travel);travel();
if(reduce||!window.gsap){document.querySelectorAll('.rv').forEach(function(e){e.style.opacity=1;e.style.transform='none'});return;}
gsap.registerPlugin(ScrollTrigger);
var lenis=new Lenis({lerp:.11});window.__lenis=lenis;lenis.on('scroll',ScrollTrigger.update);
gsap.ticker.add(function(t){lenis.raf(t*1000)});gsap.ticker.lagSmoothing(0);
document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){var t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();lenis.scrollTo(t,{offset:-70})}})});
var EASE='power3.out';
/* hero: lines rise in, the photo drifts slower than the page, the phone lifts */
gsap.from('.hero .rv-in',{y:40,opacity:0,duration:1.1,ease:EASE,stagger:.09,delay:.1});
gsap.from('.hero .tilt',{y:80,opacity:0,duration:1.3,ease:EASE,delay:.35});
gsap.from('.hero .chip',{y:24,opacity:0,duration:1,ease:EASE,stagger:.15,delay:.9});
gsap.to('.hero__photo div',{yPercent:12,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
gsap.to('.hero .tilt',{y:-70,'--ry':'-6deg','--rx':'3deg','--rz':'1deg',ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:.8}});
/* the hero screen: a short scroll of its own on arrival, then it follows the page */
(function(){var s=document.querySelector('.hero .phone__screen'),img=s&&s.querySelector('img');if(!img)return;
 var tr=function(){return Math.max(0,img.clientHeight-s.clientHeight)};var st={p:0};
 var set=function(){gsap.set(img,{y:-tr()*st.p})};
 gsap.to(st,{p:.14,duration:2.4,delay:1.1,ease:'power2.inOut',onUpdate:set});
 ScrollTrigger.create({trigger:'.hero',start:'top top',end:'bottom top',onUpdate:function(self){st.p=.14+.56*self.progress;set()}});})();
/* reveals */
gsap.utils.toArray('.rv').forEach(function(el){gsap.to(el,{opacity:1,y:0,duration:1,ease:EASE,scrollTrigger:{trigger:el,start:'top 86%'}})});
gsap.to('.schools__band div',{yPercent:14,ease:'none',scrollTrigger:{trigger:'.schools__band',start:'top bottom',end:'bottom top',scrub:true}});
/* the rhythm line draws itself */
var path=document.querySelector('.rhythm path');if(path){var L=path.getTotalLength();path.style.strokeDasharray=L;path.style.strokeDashoffset=L;
 gsap.to(path,{strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:'.rhythm__line',start:'top 75%',end:'bottom 55%',scrub:.8}});}
/* the services story: pinned on wide screens only. Scroll picks the beat (a timed crossfade),
   and the screen inside the phone rides the scroll 1:1 within its beat. */
var mm=gsap.matchMedia();
mm.add('(min-width: 1000px)',function(){
 var story=document.querySelector('.story'),beats=[].slice.call(story.querySelectorAll('.beat')),N=beats.length;
 var vis=[].slice.call(story.querySelectorAll('.vis')),chips=[].slice.call(story.querySelectorAll('.chips button'));
 story.classList.add('pinned');var cur=-1;
 function show(i){if(i===cur)return;cur=i;beats.forEach(function(b,j){b.classList.toggle('on',j===i)});vis.forEach(function(v,j){v.classList.toggle('on',j===i)});
  chips.forEach(function(c,j){c.classList.toggle('on',j===i)});
  gsap.fromTo(beats[i].querySelectorAll('.beat__copy > *'),{y:22,opacity:0},{y:0,opacity:1,duration:.6,ease:EASE,stagger:.06,overwrite:true});}
 show(0);
 /* within a beat the scroll drives the visual: a photo drifts and settles, the one phone scrolls its page */
 function scrub(i,local){var v=vis[i];if(v.classList.contains('vis--photo')){gsap.set(v.firstElementChild,{scale:1.1-.1*local,yPercent:3-6*local});}
  else{var s=v.querySelector('.phone__screen'),img=s.querySelector('img');gsap.set(img,{y:-Math.max(0,img.clientHeight-s.clientHeight)*local});
   gsap.set(v.querySelector('.tilt'),{'--ry':(16-10*local)+'deg','--rx':(7-3*local)+'deg'});}}
 var st=ScrollTrigger.create({trigger:story.querySelector('.story__stage'),start:'top top',end:'+='+(N*90)+'%',pin:true,
  onUpdate:function(self){var p=self.progress*N,i=Math.min(N-1,Math.floor(p)),local=Math.min(1,Math.max(0,(p-i-.08)/.84));show(i);scrub(i,local);}});
 chips.forEach(function(c,j){c.addEventListener('click',function(){lenis.scrollTo(st.start+(st.end-st.start)*(j+.15)/N)})});
 return function(){story.classList.remove('pinned');vis.forEach(function(v){gsap.set(v.querySelectorAll('div,img'),{clearProps:'transform'})})};
});
addEventListener('load',function(){travel();ScrollTrigger.refresh()});
})();
</script>"""

def tilt(inner, right=False):
    return f'<div class="tilt{" tilt--r" if right else ""}">{inner}</div>'

def phone(img, loop=False, cls=""):
    return (f'<div class="phone{" phone--loop" if loop else ""} {cls}"><div class="phone__screen">'
            f'<img src="img/{img}" alt="" loading="lazy"><span class="phone__bar"></span></div></div>')

def build():
    beats_html = ""
    vis = ""
    for k, eb, title, line, bullets, (kind, f, label), _ in BEATS:
        li = "".join(f"<li>{b}</li>" for b in bullets)
        pill = f'<span class="pill"><i></i>{label}</span>'
        if kind == "phone":
            small = f'<div class="beat__vis">{tilt(phone(f, loop=True), right=True)}</div>'
            vis += f'<div class="vis vis--phone">{tilt(phone(f), right=True)}{pill}</div>'
        else:
            small = f'<div class="beat__vis beat__photo"><div style="background-image:url(/img/{f})"></div>{pill}</div>'
            vis += f'<div class="vis vis--photo"><div style="background-image:url(/img/{f})"></div>{pill}</div>'
        beats_html += (f'<article class="beat"><div class="beat__copy"><span class="eyebrow">{eb}</span>'
                       f'<h3>{title}</h3><p class="lede">{line}</p><ul>{li}</ul></div>{small}</article>')
    chips = "".join(f'<button type="button">{eb}</button>' for _, eb, *_ in BEATS)
    logos = [("client-tnc.png", "True North Companies"), ("client-trueplaces.png", "True Places"), ("client-tnk12.png", "TNK12"),
             ("client-belton.png", "Belton Preparatory Academy"), ("client-aia.png", "American Innovation Academies")]
    one = "".join(f'<img src="/img/{f}" alt="{a}">' for f, a in logos) + "<span>Upstate Prep Academy</span>"
    marquee = f'<div class="marq__track"><div class="marq__group">{one * 2}</div><div class="marq__group" aria-hidden="true">{one * 2}</div></div>'
    steps = "".join(f'<div class="step rv"><small>{a}</small><h3>{b}</h3><p>{c}</p></div>' for a, b, c in B.HOW)
    schools = "".join(f'<article class="card rv"><div style="background-image:url(/img/{i})"></div><section><h3>{n}</h3><small>{a} &middot; {s}</small></section></article>'
                      for i, n, a, s in B.SCHOOLS)
    team = "".join(f'<article class="person rv"><div class="ph" role="img" aria-label="{n}" style="background-image:url(/img/team-{k}.jpg);{c}"></div><h3>{n}</h3><p>{t}</p></article>'
                   for k, n, t, c in B.TEAM)
    body = f'''<div class="grain" aria-hidden="true"></div>
<nav class="nav" id="nav"><div class="shell"><a class="logo" href="/next/" aria-label="Elevate Managed Services">{mark("n")}<span><b>ELEVATE</b><small>MANAGED SERVICES</small></span></a>
<div class="nav__links"><a href="#services">Services</a><a href="#schools">Education</a><a href="/dashboard">BI Dashboard</a><a href="/portal">Client Portal</a><a class="btn btn--teal" href="/contact">Book a call</a></div><a class="btn btn--teal nav__cta" href="/contact">Book a call</a></div></nav>

<header class="hero"><div class="hero__wash"></div><div class="shell">
<div class="hero__copy"><span class="eyebrow rv-in">Back office for companies and schools</span>
<h1 class="display rv-in">Capacity for <em>today.</em></h1>
<p class="lede rv-in">Finance, payroll, HR, marketing and a live dashboard, run by one team so your leaders can lead.</p>
<div class="btns rv-in"><a class="btn btn--teal" href="/contact">Book a discovery call</a><a class="btn btn--ghost" href="/dashboard">See the dashboard</a></div></div>
<div class="hero__art"><div class="hero__photo"><div></div></div>{tilt(phone("bi-education-home.jpg"))}
<div class="chip chip--a"><i>&#10003;</i><span>Close signed off<small>Every month, on the calendar</small></span></div>
<div class="chip chip--b"><i>&#8599;</i><span>Board package<small>Ready before the meeting</small></span></div></div>
</div></header>

<section class="marq" aria-label="Organizations we serve"><div class="marq__label eyebrow">Trusted by</div>{marquee}</section>

<section class="story" id="services"><div class="shell"><div class="story__intro"><span class="eyebrow rv">What we run</span>
<h2 class="h2 rv">One team behind <em>the whole back office.</em></h2></div>
<div class="story__stage"><div class="chips">{chips}</div><div class="story__beats">{beats_html}</div>
<div class="story__visual">{vis}</div></div>
</div></section>

<section class="rhythm"><div class="shell"><div class="rhythm__head"><span class="eyebrow rv">How we start</span><h2 class="h2 rv">From first call to <em>a monthly rhythm.</em></h2></div>
<div class="rhythm__line"><svg viewBox="0 0 1000 4" preserveAspectRatio="none" aria-hidden="true"><path d="M0 2 H1000"/></svg>{steps}</div></div></section>

<section class="schools" id="schools"><div class="shell"><div class="schools__band rv"><div></div><h2 class="h2">Built for <em>charter schools.</em></h2></div>
<div class="cards">{schools}</div></div></section>

<section class="dash"><div class="shell"><div class="dash__copy"><span class="eyebrow rv">Business intelligence</span><h2 class="h2 rv">Every number, <em>live.</em></h2>
<p class="lede rv">One dashboard for every entity, cut to each person&rsquo;s role. Leaders see the answer, finance sees the detail.</p>
<div class="rv"><a class="btn btn--teal" href="/dashboard">Take the tour</a></div></div>
<div class="laptop rv"><div class="laptop__lid"><img src="/img/dashboard-edu.png" alt="The Elevate BI dashboard on a sample school network" loading="lazy"></div><div class="laptop__base"></div></div></div></section>

<section class="team"><div class="shell"><div class="team__head"><span class="eyebrow rv">The team</span><h2 class="h2 rv">The people <em>behind the numbers.</em></h2></div>
<div class="people">{team}</div></div></section>

<footer class="end"><div class="shell"><div class="end__card">{mark("f").replace("<svg ", '<svg class="mark" ', 1)}
<h2 class="h2">Ready to give your leaders <em>their time back?</em></h2>
<div class="end__row"><a class="btn btn--gold" href="/contact">Book a discovery call</a><a class="btn" style="color:#fff;border:1px solid rgba(255,255,255,.3)" href="mailto:{B.EMAIL}">{B.EMAIL}</a></div>
<div class="end__links"><div><a class="logo" href="/next/">{mark("f2")}<span><b>ELEVATE</b><small>MANAGED SERVICES</small></span></a></div>
<div><h4>Services</h4><a href="/services">Business services</a><a href="/education">Education services</a><a href="/dashboard">BI Dashboard</a></div>
<div><h4>Company</h4><a href="/about">About</a><a href="/about#team">Team</a><a href="/contact">Contact</a></div>
<div><h4>Clients</h4><a href="/portal">Client Portal</a><small style="display:block;margin-top:18px;color:#9fc0c6">&copy; 2026 Elevate Managed Services</small></div></div>
</div></div></footer>'''
    fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
             '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">')
    html = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            f'<title>Elevate Managed Services</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg" type="image/svg+xml">'
            f'{fonts}<style>{CSS}</style></head><body>{body}{JS}</body></html>')
    (HERE / "index.html").write_text(html)
    print("wrote", HERE / "index.html", len(html))

if __name__ == "__main__":
    build()
