"""Elevate site, redesign preview on the True North K-12 template layout.

    python3 redesign.py   -> pages in redesign/ (served at /redesign/, not linked, noindex)

Layout follows the TNK12 site (Infomedia template): a transparent header over a
moving hero that turns solid on scroll, a logo marquee, paired photos beside copy,
split tint-and-photo sections, a tab list whose rows swap the image, a boxed brand
card, a CTA band and a light footer. Colours and faces stay Elevate's: teal and
gold, IBM Plex Sans for headlines and copy, Bodoni Moda for labels, buttons and
list rows (the template's serif role). Copy, team and clients come from build.py.
"""
import re
from pathlib import Path
import build as B

HERE = Path(__file__).parent
OUT = HERE / "redesign"
R = "/redesign"
IMG = "/img"
EMAIL = B.EMAIL

CSS = r"""
:root{--teal:#0C6980;--teal-d:#08505f;--teal2:#2F9DA8;--gold:#E6C068;--gold2:#a9822f;--ink:#1f2a2c;--ink2:#5f6b6d;
--grey:#F6F6F6;--tint:#EAF3F5;--line:#dfe6e7;--white:#fff;--deep:#052a33;
--display:var(--serif);--body:var(--sans);--deep2:#0d4a58;--on-deep:#eef4f4;--on-deep2:#a9c2c7;--teal2b:#2F9DA8;--sans:"IBM Plex Sans","Segoe UI",Helvetica,Arial,sans-serif;--serif:"Bodoni Moda","Bodoni 72",Didot,Georgia,serif;--shell:1240px;color-scheme:light}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--white);color:var(--ink);font:400 17px/1.7 var(--sans);-webkit-font-smoothing:antialiased}
h1,h2,h3{margin:0;font-family:var(--sans);font-weight:600;letter-spacing:-.015em;line-height:1.12;text-wrap:balance}
p{margin:0}a{color:var(--teal)}img{max-width:100%;display:block}
:focus-visible{outline:2px solid var(--teal2);outline-offset:3px}
.shell{max-width:var(--shell);margin-inline:auto;padding-inline:16px}
@media(min-width:900px){.shell{padding-inline:40px}}
.hl{color:var(--teal)}
.on-teal .hl{color:var(--gold)}
.eyebrow{font:500 italic 18px/1 var(--serif);color:var(--teal);margin-bottom:14px;display:block}
.on-teal .eyebrow{color:#cfe6ea}
.h1{font-size:clamp(36px,5vw,60px)}
.h2{font-size:clamp(30px,3.6vw,46px)}
.sec{padding-block:clamp(64px,8vw,104px)}
.grey{background:var(--grey)}
.tint{background:var(--tint)}
.copy{display:grid;gap:20px;align-content:center}
.copy p{color:var(--ink2)}
.btn{display:inline-flex;align-items:center;gap:10px;padding:14px 26px;border-radius:2px;font:600 17px/1 var(--serif);text-decoration:none;border:0;cursor:pointer;transition:background .2s,color .2s,transform .2s}
.btn--teal{background:var(--teal);color:#fff}.btn--teal:hover{background:var(--teal2)}
.btn--white{background:#fff;color:var(--teal)}.btn--white:hover{background:var(--gold);color:var(--deep)}
.link{font:600 italic 18px/1.3 var(--serif);color:var(--teal);text-decoration:underline;text-underline-offset:5px;text-decoration-thickness:1px;display:inline-flex;gap:8px;align-items:center}
.link:hover{color:var(--teal2)}

/* header */
.hdr{position:sticky;top:0;z-index:50;background:var(--teal);transition:background .3s,box-shadow .3s}
.home .hdr{position:fixed;inset:0 0 auto;background:transparent}
.home .hdr:has(.nav.open){background:var(--teal)}
.home .hdr.solid{background:var(--teal);box-shadow:0 10px 30px -18px rgba(0,0,0,.5)}
.hdr__row{display:flex;align-items:center;justify-content:space-between;min-height:84px;gap:24px}
.logo{display:flex;align-items:center;gap:12px;color:#fff;text-decoration:none}
.logo svg{width:44px;height:34px}
.logo b{display:block;font:500 25px/1 var(--serif);letter-spacing:.12em}
.logo small{display:block;font:600 9.5px/1 var(--sans);letter-spacing:.32em;margin-top:6px;opacity:.85}
.nav{display:flex;align-items:center;gap:30px}
.nav>a,.dd>button{color:#fff;font:500 15.5px/1 var(--sans);text-decoration:none;background:none;border:0;cursor:pointer;padding:30px 0;position:relative;display:flex;gap:6px;align-items:center}
.nav>a[aria-current]::after,.dd.cur>button::after{content:"";position:absolute;left:0;right:0;bottom:22px;height:3px;background:var(--gold)}
.dd{position:relative}
.dd>button svg{width:10px;height:10px}
.dd__panel{position:absolute;top:100%;left:-20px;min-width:250px;background:var(--teal-d);padding:12px 0;display:none;box-shadow:0 20px 40px -20px rgba(0,0,0,.5)}
.dd:hover .dd__panel,.dd:focus-within .dd__panel{display:block}
.dd__panel a{display:block;padding:10px 22px;color:#fff;text-decoration:none;font:400 14.5px/1.3 var(--sans)}
.dd__panel a:hover{background:rgba(255,255,255,.1)}
.nav .btn{padding:12px 20px;font-size:16px}
.burger{display:none;background:none;border:0;color:#fff;cursor:pointer;width:44px;height:44px}
.burger svg{width:28px;height:28px}
@media(max-width:1119px){.burger{display:grid;place-items:center}
.nav{display:none;position:absolute;left:0;right:0;top:100%;background:#fff;flex-direction:column;align-items:stretch;gap:0;padding:8px 16px 18px;box-shadow:0 20px 40px -20px rgba(0,0,0,.4)}
.nav.open{display:flex}
.nav>a,.dd>button{color:var(--ink);padding:16px 0;border-bottom:1px solid var(--line);width:100%;justify-content:space-between}
.nav>a[aria-current]::after,.dd.cur>button::after{display:none}
.dd__panel{position:static;display:none;background:none;box-shadow:none;padding:0 0 8px 12px}
.dd.open .dd__panel{display:block}.dd:hover .dd__panel{display:none}.dd.open:hover .dd__panel{display:block}
.dd__panel a{color:var(--teal);padding:10px 0}
.nav .btn{margin-top:16px;justify-content:center;background:var(--teal);color:#fff}}

/* home hero */
.hero{position:relative;min-height:min(92vh,760px);display:grid;place-items:center;text-align:center;color:#fff;overflow:hidden;background:var(--deep)}
.hero__slides{position:absolute;inset:0}
.hero__slides div{position:absolute;inset:0;background:center/cover;opacity:0;animation:fade 18s infinite;transform:scale(1.04)}
.hero__slides div:nth-child(2){animation-delay:6s}.hero__slides div:nth-child(3){animation-delay:12s}
@keyframes fade{0%{opacity:0;transform:scale(1.04)}5%{opacity:1}33%{opacity:1}38%{opacity:0;transform:scale(1.1)}100%{opacity:0}}
@media(prefers-reduced-motion:reduce){.hero__slides div{animation:none}.hero__slides div:first-child{opacity:1}}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,42,51,.72),rgba(5,42,51,.55) 45%,rgba(5,42,51,.78))}
.hero__in{position:relative;z-index:2;max-width:900px;padding:140px 16px 90px;display:grid;gap:24px;justify-items:center}
.hero__in p{font-size:19px;color:#e3eef0;max-width:780px}
.hero .btns{display:flex;gap:22px;flex-wrap:wrap;justify-content:center;align-items:center}
.play{color:#fff;font:600 17px/1 var(--serif);text-decoration:none;display:inline-flex;gap:10px;align-items:center}
.play span{width:38px;height:38px;border-radius:50%;border:1.5px solid #fff;display:grid;place-items:center}
.play svg{width:12px;height:12px;fill:#fff;margin-left:2px}

/* page hero (interior) */
.phero{background:var(--teal);color:#fff;text-align:center;padding:clamp(70px,9vw,120px) 0 clamp(64px,8vw,100px)}
.phero .shell{max-width:980px;display:grid;gap:18px;justify-items:center}
.phero p{color:#d8ebee;font-size:18.5px;max-width:820px}
.bleed{height:clamp(320px,42vw,600px);background:center/cover;position:relative}
.bleed::after{content:"";position:absolute;inset:0;background:rgba(5,42,51,.28)}

/* marquee */
.marq{padding:38px 0;border-bottom:1px solid var(--line);overflow:hidden}
.marq__track{display:flex;gap:90px;width:max-content;animation:marq 34s linear infinite;align-items:center}
.marq img{height:64px;width:auto;max-width:220px;object-fit:contain;filter:grayscale(1);opacity:.7;transition:filter .3s,opacity .3s}
.marq img:hover{filter:none;opacity:1}
.marq .word{font:500 26px/1 var(--serif);color:#8a9597;white-space:nowrap}
@keyframes marq{to{transform:translateX(-50%)}}
@media(prefers-reduced-motion:reduce){.marq__track{animation:none;flex-wrap:wrap;justify-content:center;width:auto}}

/* layouts */
.two{display:grid;gap:clamp(36px,5vw,72px);align-items:center}
.two>*,.tiles>*,.tabs>*,.split>*{min-width:0}
main{overflow-x:clip}
@media(min-width:900px){.two{grid-template-columns:1fr 1fr}}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.pair div{aspect-ratio:3/4.4;background:center/cover;border-radius:2px}
.pair div:nth-child(2){margin-top:48px}
.split{display:grid}
.split__copy{padding:64px 16px;display:grid;gap:22px;align-content:center}
@media(min-width:900px){.split{grid-template-columns:1fr 1fr}.split__copy{padding:clamp(64px,8vw,110px) clamp(40px,6vw,96px) clamp(64px,8vw,110px) max(40px,calc((100vw - var(--shell))/2 + 40px))}.split__img+.split__copy{padding:clamp(64px,8vw,110px) max(40px,calc((100vw - var(--shell))/2 + 40px)) clamp(64px,8vw,110px) clamp(40px,6vw,96px)}}
.split__img{min-height:420px;background:center/cover}
.dots{list-style:none;padding:0;margin:0;display:grid;gap:14px}
.dots li{position:relative;padding-left:24px;color:var(--ink2)}
.dots li::before{content:"";position:absolute;left:0;top:.6em;width:9px;height:9px;border-radius:50%;background:var(--teal)}
.dots b{color:var(--ink)}

/* cards like the template's project tiles */
.tiles{display:grid;gap:22px}
@media(min-width:700px){.tiles{grid-template-columns:1fr 1fr}}
.tiles.t3{grid-template-columns:1fr}@media(min-width:900px){.tiles.t3{grid-template-columns:repeat(3,1fr)}}
.tile{position:relative;aspect-ratio:3/3.6;background:center/cover;color:#fff;text-decoration:none;overflow:hidden;display:block}
.tile::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,42,51,.85),transparent 55%);transition:opacity .3s}
.tile div{position:absolute;left:26px;top:24px;right:26px;display:grid;gap:4px}
.tile h3{font-size:24px;color:#fff}.tile small{font-size:14px;color:#d8ebee}
.tile i{position:absolute;right:22px;bottom:14px;font:300 54px/1 var(--sans);font-style:normal;color:#fff;transition:transform .3s}
.tile:hover i{transform:rotate(90deg)}

/* tab list (values, services) */
.tabs{display:grid;gap:clamp(36px,5vw,72px)}
@media(min-width:900px){.tabs{grid-template-columns:1fr 1fr;align-items:start}}
.tabs__list{border-top:1px solid var(--line)}
.tabs__list button{display:flex;justify-content:space-between;align-items:center;width:100%;background:none;border:0;border-bottom:1px solid var(--line);padding:20px 0;cursor:pointer;font:500 clamp(22px,2.4vw,30px)/1.2 var(--serif);color:#9aa5a7;text-align:left;transition:color .2s}
.tabs__list button[aria-selected=true],.tabs__list button:hover{color:var(--teal)}
.tabs__list button span{opacity:0;transition:opacity .2s}
.tabs__list button[aria-selected=true] span{opacity:1}
.tabs__panel{display:grid;gap:20px}
.tabs__panel .ph{aspect-ratio:4/3;background:center/cover}
.tabs__panel p{color:var(--ink2);font-size:18px}
.tabs__panel ul{margin:0;padding-left:20px;color:var(--ink2)}

/* why cards */
.why{display:grid;gap:22px}@media(min-width:800px){.why{grid-template-columns:1fr 1fr}}
.why div{background:var(--tint);padding:36px 34px;text-align:center;display:grid;gap:12px}
.why h3{font:500 26px/1.2 var(--serif);color:var(--teal)}
.why p{color:var(--ink2)}

/* brand card (in place of testimonials) */
.card-teal{background:var(--teal);color:#fff;padding:clamp(48px,7vw,90px) clamp(24px,6vw,90px);position:relative;overflow:hidden;text-align:center}
.card-teal svg.mark{position:absolute;right:-60px;top:50%;transform:translateY(-50%);width:520px;height:auto;opacity:.12}
.card-teal blockquote{margin:0;position:relative;font:600 clamp(24px,2.8vw,36px)/1.35 var(--sans);max-width:900px;margin-inline:auto}
.card-teal cite{display:block;margin-top:22px;font:500 italic 19px/1 var(--serif);color:#cfe6ea}

/* team */
.team{display:grid;gap:34px 26px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
.team article{text-align:center;display:grid;gap:6px}
.team .ph{aspect-ratio:1;background-color:#dfe8ea;background-repeat:no-repeat;margin-bottom:10px}
.team h3{font-size:19px}.team p{font-size:14.5px;color:var(--teal)}

/* lists in tinted box (partners style) */
.box{background:var(--tint);padding:36px;display:grid;gap:14px;text-align:center;font:500 22px/1.3 var(--serif);color:var(--teal)}

/* faq */
.faq{display:grid;gap:0 48px}@media(min-width:900px){.faq{grid-template-columns:1fr 1fr}}
.faq details{border-bottom:1px solid var(--line);padding:20px 0}
.faq summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:20px;font:600 18px/1.4 var(--sans)}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";font:300 28px/1 var(--sans);color:var(--teal)}
.faq details[open] summary::after{content:"\2212"}
.faq p{margin-top:12px;color:var(--ink2)}

/* form */
.form{display:grid;gap:16px}
.form label{display:grid;gap:6px;font:600 14px/1 var(--sans)}
.form input,.form textarea,.form select{font:400 16px/1.4 var(--sans);padding:14px;border:1px solid #cfd8da;border-radius:2px;background:#fff;width:100%}
.form .row{display:grid;gap:16px}@media(min-width:700px){.form .row{grid-template-columns:1fr 1fr}}
.form .checks{display:flex;flex-wrap:wrap;gap:10px 20px;font-weight:400}
.form .checks label{display:flex;gap:8px;align-items:center;font:400 15px/1 var(--sans)}
.form .checks input{width:auto}
.hp{position:absolute;left:-9999px}
.msg{font-size:15px}.msg.bad{color:#b3261e}
.done{display:grid;gap:12px}
[hidden]{display:none!important}

/* cta band + footer */
.cta{border-top:8px solid var(--teal2);background:var(--teal);color:#fff}
.cta .shell{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;padding-block:48px}
.cta h2{font-size:clamp(26px,3vw,38px)}
.foot{background:#fbfcfc;border-top:1px solid var(--line);padding:56px 0}
.foot .shell{display:grid;gap:40px}
@media(min-width:800px){.foot .shell{grid-template-columns:1.4fr 1fr 1fr}}
.foot .logo{color:var(--teal)}
.foot h4{margin:0 0 12px;font:500 italic 19px/1 var(--serif);color:var(--teal)}
.foot p,.foot a{font-size:15px;color:var(--ink2);text-decoration:none;display:block;line-height:1.9}
.foot a:hover{color:var(--teal)}
.foot small{display:block;margin-top:14px;font-size:13px;color:#8a9597}
.pv{position:fixed;left:12px;bottom:12px;z-index:60;background:var(--gold);color:var(--deep);font:600 12px/1 var(--sans);padding:8px 12px;border-radius:99px;letter-spacing:.06em}
"""

CHEV = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'
ARROW = "&#8599;"

def logo():
    return f'<a class="logo" href="{R}/" aria-label="Elevate Managed Services, home">{B.MARK.format(i="r" + str(id(object())))}<span><b>ELEVATE</b><small>MANAGED SERVICES</small></span></a>'

MENU = [("About", "about", [("Our story", "about#story"), ("Our values", "about#values"), ("Who we serve", "about#clients"), ("Our team", "about#team")]),
        ("Services", "services", [("Financial management", "services#services"), ("BI Dashboard", "services#bi"), ("HR, payroll and people", "services#services"), ("Marketing", "services#services"), ("Systems we work with", "services#systems")]),
        ("Education", "education", [("Back office for schools", "education#schools"), ("Schools we serve", "education#serve"), ("Grant support", "education#grants"), ("New school launch", "education#launch")])]

def header(cur):
    items = ""
    for label, page, subs in MENU:
        sub = "".join(f'<a href="{R}/{h}">{t}</a>' for t, h in subs)
        items += f'<div class="dd{" cur" if cur == page else ""}"><button type="button" aria-expanded="false">{label} {CHEV}</button><div class="dd__panel"><a href="{R}/{page}">{label} overview</a>{sub}</div></div>'
    items += f'<a href="/portal"{" aria-current=page" if cur == "portal" else ""}>Client Portal</a><a class="btn btn--white" href="{R}/contact">Contact Us</a>'
    burger = '<button class="burger" type="button" aria-label="Menu" aria-expanded="false" id="burger"><svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2"/></svg></button>'
    return f'<header class="hdr" id="hdr"><div class="shell hdr__row">{logo()}{burger}<nav class="nav" id="nav" aria-label="Main">{items}</nav></div></header>'

def footer():
    return f'''<section class="cta"><div class="shell"><h2>Ready to give your leaders their time back?</h2><a class="btn btn--white" href="{R}/contact">Let's Connect</a></div></section>
<footer class="foot"><div class="shell"><div>{logo()}<p style="margin-top:18px;max-width:340px">Back-office, education and business intelligence services for growing companies and schools across the Southeast.</p></div>
<div><h4>Contact</h4><a href="mailto:{EMAIL}">{EMAIL}</a><a href="{R}/contact">Book a discovery call</a><a href="/portal">Client Portal</a></div>
<div><h4>Explore</h4><a href="{R}/about">About</a><a href="{R}/services">Business services</a><a href="{R}/education">Education services</a><a href="/demo/#/choose">View the demo</a>
<small>&copy; 2026 Elevate Managed Services</small></div></div></footer>'''

JS = """<script>
(function(){var h=document.getElementById('hdr');if(document.body.classList.contains('home')){var f=function(){h.classList.toggle('solid',scrollY>40)};addEventListener('scroll',f,{passive:true});f();}
var b=document.getElementById('burger'),n=document.getElementById('nav');b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o)});
document.querySelectorAll('.dd>button').forEach(function(x){x.addEventListener('click',function(){if(innerWidth<1120){var o=x.parentNode.classList.toggle('open');x.setAttribute('aria-expanded',o)}else{location.href=x.parentNode.querySelector('.dd__panel a').href}})});
document.querySelectorAll('[data-tabs]').forEach(function(t){var bs=t.querySelectorAll('[role=tab]'),ps=t.querySelectorAll('[role=tabpanel]');
bs.forEach(function(b,i){b.addEventListener('click',function(){bs.forEach(function(x,j){x.setAttribute('aria-selected',i===j);ps[j].hidden=i!==j})})})});
})();
</script>"""

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">')

def page(name, title, cur, body, home=False):
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            f'<meta name="robots" content="noindex,nofollow"><title>{title} · Elevate (redesign preview)</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">{FONTS}<style>{CSS}</style></head>'
            f'<body class="{"home" if home else ""}">{header(cur)}<main>{body}</main>{footer()}<span class="pv">REDESIGN PREVIEW</span>{JS}</body></html>')

def phero(eyebrow, h1, p=""):
    return f'<section class="phero"><div class="shell"><span class="eyebrow">{eyebrow}</span><h1 class="h1">{h1}</h1>{f"<p>{p}</p>" if p else ""}</div></section>'

def bleed(img, pos="center"):
    return f'<div class="bleed" style="background-image:url({IMG}/{img});background-position:{pos}" role="img" aria-label=""></div>'

def tabs(rows, sel_img=True):
    """rows: (title, img, text, bullets)"""
    btns = "".join(f'<button role="tab" aria-selected="{"true" if i == 0 else "false"}">{t}<span>{ARROW}</span></button>' for i, (t, *_ ) in enumerate(rows))
    panels = ""
    for i, (t, img, txt, bl) in enumerate(rows):
        li = "".join(f"<li>{b}</li>" for b in bl) if bl else ""
        panels += f'<div class="tabs__panel" role="tabpanel"{"" if i == 0 else " hidden"}>{f"<div class=ph style=background-image:url({IMG}/{img})></div>" if img else ""}<p>{txt}</p>{f"<ul>{li}</ul>" if li else ""}</div>'
    return f'<div class="tabs__list" role="tablist">{btns}</div><div>{panels}</div>'

def marquee():
    logos = [("client-tnc.png", "True North Companies"), ("client-tnk12.png", "TNK12"), ("client-belton.png", "Belton Preparatory Academy"), ("client-aia.png", "American Innovation Academies")]
    one = "".join(f'<img src="{IMG}/{f}" alt="{a}">' for f, a in logos) + '<span class="word">Upstate Prep Academy</span>'
    return f'<div class="marq" aria-label="Organizations we serve"><div class="marq__track">{one}{one}</div></div>'

def tile(img, title, sub, href):
    return f'<a class="tile" href="{href}" style="background-image:url({IMG}/{img})"><div><h3>{title}</h3><small>{sub}</small></div><i>+</i></a>'

QUOTE = f'''<section class="sec"><div class="shell"><div class="card-teal on-teal">{B.MARK.format(i="q").replace('<svg ', '<svg class="mark" ', 1)}
<blockquote>Leaders should spend their time teaching, leading and growing. We will take care of the rest.</blockquote><cite>The Elevate promise</cite></div></div></section>'''

# ------------------------------------------------------------------ pages
def home():
    slides = "".join(f'<div style="background-image:url({IMG}/{i})"></div>' for i in ("bo-team.jpg", "bo-desk.jpg", "q3-017.jpg"))
    body = f'''<section class="hero"><div class="hero__slides">{slides}</div><div class="hero__in">
<h1 class="h1">Capacity for Today: Back-Office Solutions for Companies and Schools</h1>
<p>Elevate partners with growing organizations and charter schools to take the weight off their leaders. From the monthly close and payroll to compliance, HR and a live financial dashboard, we run the back office so you can lead.</p>
<div class="btns"><a class="btn btn--teal" href="{R}/contact">Book a discovery call</a><a class="play" href="/demo/#/choose"><span><svg viewBox="0 0 10 12"><path d="M0 0l10 6-10 6z"/></svg></span>View the demo</a></div></div></section>
{marquee()}
<section class="sec grey"><div class="shell two"><div class="pair"><div style="background-image:url({IMG}/bo-review.jpg)"></div><div style="background-image:url({IMG}/bo-papers.jpg)"></div></div>
<div class="copy"><h2 class="h2">Your Partner in Running an Organization That <span class="hl">Thrives</span></h2>
<p>Growing a company or opening a school stretches every leader thin. Elevate began as the team keeping the lights on for our own family of companies, so we know what it takes: books that close on time, payroll that is right, and reporting a board or a bank can trust.</p>
<p>We bring the same team every month, and we measure every process by the hours it hands back to you.</p>
<a class="link" href="{R}/about">Get to know Elevate {ARROW}</a></div></div></section>
<section class="split"><div class="split__copy tint"><h2 class="h2">Comprehensive Support for <span class="hl">Every Stage of Growth</span></h2>
<p style="color:var(--ink2)">Elevate takes the whole back office, or the part that is breaking. We provide:</p>
<ul class="dots"><li><b>Financial Management:</b> the close, the reporting and the forecast, run on a fixed calendar.</li>
<li><b>HR, Payroll and People:</b> one home base for every employee, and every paycheck right.</li>
<li><b>Business Intelligence:</b> one live financial dashboard for every entity, cut to each role.</li></ul>
<p style="color:var(--ink2)">Working with us, you gain a steady rhythm, expert hands and the confidence to focus on what matters most: <b style="color:var(--ink)">your people and your mission.</b></p>
<a class="link" href="{R}/services">Explore our services {ARROW}</a></div>
<div class="split__img" style="background-image:url({IMG}/bo-desk.jpg)"></div></section>
<section class="sec"><div class="shell two"><div class="copy"><h2 class="h2">We Help Schools <span class="hl">Run Smoothly</span></h2>
<p>From the first planning year to every audit after, Elevate runs the money side of charter and private schools: accounting, payroll, grants and board reporting, so school leaders can stay in classrooms.</p>
<div><a class="btn btn--teal" href="{R}/education">See our education services</a></div></div>
<div class="tiles">{tile("q3-020.jpg", "Belton Preparatory Academy", "Belton, SC · client since 2026", R + "/education#serve")}{tile("q3-010.jpg", "Schools opening next", "Upstate Prep 2027 · AIA Woodruff 2028", R + "/education#serve")}</div></div></section>
{QUOTE}'''
    return page("index", "Home", "home", body, home=True)

def about():
    vals = [("Relationships before reports", "bo-team.jpg", "We learn your people, your calendar and what keeps you up at night before we touch a spreadsheet. The numbers mean more when we know the story behind them.", None),
            ("The same people, every month", "bo-review.jpg", "You will not be handed off to a rotating bookkeeper. The team you meet at the start is the team that closes your books, runs your payroll and sits with you at the board meeting.", None),
            ("Give leaders their time back", "q3-017.jpg", "A principal should be in classrooms. A founder should be with customers. Every process we build is measured by the hours it hands back to you.", None)]
    team = "".join(f'<article><div class="ph" role="img" aria-label="{n}" style="background-image:url({IMG}/team-{k}.jpg);{c or "background-size:cover;background-position:center"}"></div><h3>{n}</h3><p>{t}</p></article>' for k, n, t, c in B.TEAM)
    clients = "".join(B.client_card(*c).replace('src="img/', f'src="{IMG}/').replace(' loading="lazy"', '') for c in B.OUR_CLIENTS)
    body = f'''{phero("About Us", "Our Story: Taking Care of Our Own, Then Yours", "Elevate began as the people keeping the lights on for a family of companies that build and run schools, communities and businesses across the Southeast. Today we bring that same team and that same care to companies and schools outside our family.")}
<section class="split grey" id="story"><div class="split__copy"><span class="eyebrow">Our story</span><h2 class="h2">We Started by Taking Care of <span class="hl">Our Own</span></h2>
<p style="color:var(--ink2)">Some weeks that meant closing the books for a construction company on a Friday and running payroll for a brand new charter school on Monday. Other weeks it meant helping a first-year school leader get ready for a board meeting, or making sure a growing company had a clear set of numbers to take to the bank.</p>
<p style="color:var(--ink2)">Doing that work up close taught us what leaders actually need: someone who picks up, knows the history and gets it right the first time.</p></div>
<div class="split__img" style="background-image:url({IMG}/bo-review.jpg)"></div></section>
<section class="sec grey" id="values" style="padding-top:0"><div class="shell"><h2 class="h2" style="margin-bottom:36px"><span class="hl">Our Values:</span> How We Show Up for You</h2><div class="tabs" data-tabs>{tabs(vals)}</div></div></section>
<section class="sec" id="clients"><div class="shell"><div style="max-width:760px;margin-bottom:40px;display:grid;gap:16px"><span class="eyebrow">Who we serve</span><h2 class="h2">Partners Who Stay, <span class="hl">Year After Year</span></h2></div>
<style>{B.CSS[B.CSS.index("/* client cards */"):B.CSS.index(".stat em")]}</style><div class="tiles t3" style="gap:24px">{clients}</div></div></section>
<section class="sec grey" id="team"><div class="shell"><h2 class="h2" style="text-align:center;margin-bottom:44px">The People You Will <span class="hl">Actually Talk To</span></h2><div class="team">{team}</div></div></section>'''
    return page("about", "About", "about", body)

SVC_IMG = {"Financial Management": "bo-papers.jpg", "Compliance": "bo-review.jpg", "Operations & Execution": "bo-team.jpg",
           "HR, Payroll & People": "bo-desk.jpg", "Marketing": "bo-team.jpg", "Business Intelligence": "dashboard.png"}

def services():
    rows = [(t, SVC_IMG.get(t, "bo-desk.jpg"), d, bl) for _, t, d, bl in B.BIZ]
    why = [("One Team Accountable", "Every service runs on the same execution layer and the same people, so nothing falls between vendors."),
           ("A Calendar You Can Set a Clock By", "The close, the board package and the filings land on fixed dates every month."),
           ("Every Number, Live", "One financial dashboard for every entity, read straight from the books and cut to each role."),
           ("Start Small, Add Later", "Begin with the part that is breaking. Add services without rebuilding your reporting.")]
    w = "".join(f"<div><h3>{a}</h3><p>{b}</p></div>" for a, b in why)
    sysb = "".join(f'<div><h3>{t}</h3><p>{", ".join(items)}</p></div>' for _, t, items in B.SYSTEMS)
    body = f'''{phero("Our Services", "Comprehensive Support for Every Stage of Your Company's Growth", "Take the whole back office, or the part that is breaking. Every service runs on the same team and the same calendar.")}
{bleed("bo-papers.jpg", "center 35%")}
<section class="sec grey"><div class="shell two"><div class="pair"><div style="background-image:url({IMG}/bo-team.jpg)"></div><div style="background-image:url({IMG}/bo-review.jpg)"></div></div>
<div class="copy"><h2 class="h2">Your Partner in Building a Company That <span class="hl">Thrives</span></h2><p>Most growing companies do not need another software subscription. They need someone to run the work: close the books, pay the people, file on time and tell the leadership team what the numbers mean.</p><a class="link" href="{R}/contact">Get the guidance you need {ARROW}</a></div></div></section>
<section class="sec grey" id="services" style="padding-top:0"><div class="shell"><div style="max-width:760px;margin-bottom:36px;display:grid;gap:14px"><h2 class="h2"><span class="hl">Six Services,</span> One Team Accountable</h2><p style="color:var(--ink2)">Pick a service to see what it covers.</p></div><div class="tabs" data-tabs>{tabs(rows)}</div></div></section>
<section class="sec"><div class="shell"><div style="text-align:center;max-width:760px;margin:0 auto 40px;display:grid;gap:14px"><h2 class="h2">Why This Approach <span class="hl">Works</span></h2><p style="color:var(--ink2)">Success is not more tools. It is the right work done on time by people who know your business.</p></div><div class="why">{w}</div></div></section>
<section class="split" id="bi"><div class="split__img" style="background-image:url({IMG}/dashboard.png);background-size:contain;background-repeat:no-repeat;background-color:#e9f1f3"></div>
<div class="split__copy on-teal" style="background:var(--teal);color:#fff"><span class="eyebrow">Business Intelligence</span><h2 class="h2">Every Number, <span class="hl">Live</span></h2><p style="color:#d8ebee">One financial dashboard for every entity, read straight from the accounting system and cut to each person's role. Leaders see the answer, finance sees the detail, lenders get their package in one click.</p><div style="display:flex;gap:14px;flex-wrap:wrap"><a class="btn btn--white" href="/demo/#/choose">View the demo</a><a class="btn btn--white" href="/portal">Client sign in</a></div></div></section>
<section class="sec" id="systems"><div class="shell"><div style="text-align:center;max-width:760px;margin:0 auto 40px;display:grid;gap:14px"><h2 class="h2">Works With <span class="hl">Your Systems</span></h2><p style="color:var(--ink2)">We work in the software you already use, so nothing has to be rebuilt.</p></div><div class="why">{sysb}</div></div></section>
{QUOTE}'''
    return page("services", "Business Services", "services", body)

EDU_IMG = ["bo-papers.jpg", "bo-desk.jpg", "bo-team.jpg", "bo-review.jpg", "q3-016.jpg", "q3-002.jpg"]

def education():
    rows = [(t, EDU_IMG[i % len(EDU_IMG)], d, bl) for i, (_, t, d, bl) in enumerate(B.EDU)]
    schools = "".join(B.client_card(*c).replace('src="img/', f'src="{IMG}/').replace(' loading="lazy"', '') for c in B.SCHOOL_CLIENTS)
    grants = [("Title Programs", "Title I, II and IV funds from application through expenditure tracking, monitoring and reporting."),
              ("IDEA", "Special education funding tracked and documented to the same calendar as the rest of the books."),
              ("Federal and State Compliance", "Charter, state and federal deadlines on one calendar, with documentation ready for monitoring visits."),
              ("Board-Ready Reporting", "Grant spending shown in the monthly board package, so nothing surprises the board at audit time.")]
    g = "".join(f"<div><h3>{a}</h3><p>{b}</p></div>" for a, b in grants)
    launch = [("Planning year: set up the books", "q3-016.jpg", "Chart of accounts, banking, payroll and policies in place before the first hire.", None),
              ("Six months out: staff and systems", "bo-team.jpg", "Hiring workflow, onboarding, benefits and vendor contracts ready to go.", None),
              ("Ninety days out: facility ready", "q3-020.jpg", "Facility readiness, insurance, procurement and the opening budget locked.", None),
              ("Opening day: doors open", "q3-017.jpg", "Payroll runs, the board sees its first report, and the school is audit-ready from day one.", None)]
    builds = "".join(tile(i, t, a, R + "/education#serve") for i, t, a, _ in B.SCHOOLS)
    body = f'''{phero("Education Services", "The Complete Back Office for Charter and Private Schools", "Built around each school's stage, priorities and staff, from the first planning year to every audit after.")}
{bleed("q3-017.jpg")}
<section class="sec grey" id="schools"><div class="shell"><div style="max-width:760px;margin-bottom:36px;display:grid;gap:14px"><h2 class="h2">The Money, Handled. <span class="hl">Every Review, Ready.</span></h2><p style="color:var(--ink2)">School leaders should spend their time teaching, leading and growing their schools. We run the back office so they can.</p></div><div class="tabs" data-tabs>{tabs(rows)}</div></div></section>
<section class="sec" id="serve"><div class="shell"><div style="max-width:760px;margin-bottom:40px;display:grid;gap:14px"><span class="eyebrow">Schools we serve</span><h2 class="h2">Open Today. <span class="hl">Opening Next.</span></h2></div>
<style>{B.CSS[B.CSS.index("/* client cards */"):B.CSS.index(".stat em")]}</style><div class="tiles t3" style="gap:24px">{schools}</div></div></section>
<section class="sec grey" id="grants"><div class="shell"><div style="text-align:center;max-width:760px;margin:0 auto 40px;display:grid;gap:14px"><h2 class="h2">Every Grant Dollar, <span class="hl">Accounted For</span></h2><p style="color:var(--ink2)">From application to expenditure tracking to the final report, documented and audit-ready all year.</p></div><div class="why">{g.replace("<div>", '<div style="background:#fff">')}</div></div></section>
<section class="sec" id="launch"><div class="shell"><div style="max-width:760px;margin-bottom:36px;display:grid;gap:14px"><span class="eyebrow">Starting a new school?</span><h2 class="h2">From Charter to <span class="hl">Opening Day</span></h2></div><div class="tabs" data-tabs>{tabs(launch)}</div>
<div style="margin-top:36px"><a class="btn btn--teal" href="{R}/contact">Plan your launch with us</a></div></div></section>
<section class="sec grey"><div class="shell"><div style="max-width:760px;margin-bottom:40px;display:grid;gap:14px"><span class="eyebrow">Proof from our family of companies</span><h2 class="h2">Three Schools. <span class="hl">Opened on Time.</span></h2><p style="color:var(--ink2)">Our partner companies delivered three new schools in 2026 for 2,510 students. Elevate runs the finance and operations behind the teams that built them.</p></div><div class="tiles t3">{builds}</div></div></section>'''
    return page("education", "Education Services", "education", body)

FAQ = [("What is the first step to working with Elevate?", "Book a discovery call. In 45 to 60 minutes we learn your entities or campuses, what is not closing today and what you want off your plate, then send a scoped proposal within a week."),
       ("How quickly can you take over the work?", "Most clients are fully handed over within 30 days. We connect your books, map your calendar of filings and reports, and take over the work in an orderly handoff."),
       ("Do we have to change our software?", "No. We work in QuickBooks Online, Sage Intacct, Xero, NetSuite, ADP, Paylocity and the other systems you already use."),
       ("Can we start with just one service?", "Yes. Many clients start with the part that is breaking, often the monthly close or payroll, and add services later without rebuilding their reporting."),
       ("Do you work with charter and private schools?", "Yes. Our education team runs accounting, payroll, HR, grants and board reporting for schools, and sets up the back office for new schools during the planning year."),
       ("How does the BI Dashboard work?", "We connect it to your accounting system and set it up for every entity and role. Clients sign in through the client portal, and anyone can try the demo first.")]

def contact():
    src = B.contact()
    i = src.find("getElementById('contactForm')")
    js = src[src.rfind("<script", 0, i):src.find("</script>", i) + 9] if i > 0 else ""
    opts = "".join(f"<option>{o}</option>" for o in ["Discovery call request", "Business services", "Education services", "BI Dashboard", "New school launch", "Something else"])
    faq = "".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in FAQ)
    body = f'''{phero("Contact Us", "Let's Start a Conversation")}
<section class="sec"><div class="shell two" style="align-items:start"><div style="display:grid;gap:22px">
<p><a href="mailto:{EMAIL}" style="font-weight:600">{EMAIL}</a><br><span style="color:var(--ink2)">We reply within one business day.</span></p>
<form class="form" id="contactForm" novalidate>
<div class="row"><label>Name*<input name="name" autocomplete="name" required></label><label>Email*<input name="email" type="email" autocomplete="email" required></label></div>
<div class="row"><label>Phone number<input name="phone" type="tel" autocomplete="tel"></label><label>Company or school<input name="organization" autocomplete="organization"></label></div>
<label>Type of inquiry<select name="topic">{opts}</select></label>
<label>Message*<textarea name="message" rows="5" required></textarea></label>
<input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
<div><button class="btn btn--teal" type="submit">Submit</button></div><p id="formStatus" class="msg" role="status" aria-live="polite"></p></form>
<div id="formDone" class="done" hidden><span class="eyebrow">Thank you</span><h2 class="h2">Your inquiry <span class="hl">is in.</span></h2><p>Your message has been sent to the Elevate team. We will be in touch within one business day.</p></div></div>
<div class="split__img" style="min-height:560px;background-image:url({IMG}/bo-team.jpg)"></div></div></section>
<section class="sec grey"><div class="shell"><h2 class="h2" style="margin-bottom:28px">Frequently Asked <span class="hl">Questions</span></h2><div class="faq">{faq}</div></div></section>{js}'''
    return page("contact", "Contact", "contact", body)

def build():
    OUT.mkdir(exist_ok=True)
    for fn, html in [("index.html", home()), ("about.html", about()), ("services.html", services()),
                     ("education.html", education()), ("contact.html", contact())]:
        (OUT / fn).write_text(html)
        print("wrote", OUT / fn, len(html))

if __name__ == "__main__":
    build()
