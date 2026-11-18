"""The rest of the Elevate site in the immersive /next/ design.

    python3 next/build_pages.py   -> next/{services,education,about,contact,portal,dashboard}.html

Matt, 2026-11-18: "we also need to move into the other tabs of the website, because it seems
like right now all you have is the splash page".

Every page shares the home page's nav, footer, styles and motion (build_next.py). The words
and facts are the live site's (build.py, redesign.py), so nothing here is invented, and no
photo appears twice across the site (Matt, 2026-11-10: "dont reuse images").
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import build as B  # noqa: E402
import build_next as N  # noqa: E402
import redesign as R  # noqa: E402

PAGE_CSS = r"""
[hidden]{display:none!important}
/* page heroes: the home hero, a size down, with the page's own photo */
.hero--page .display{font-size:clamp(42px,6.2vw,92px)}
.hero--page .hero__frame{height:clamp(300px,62vh,640px)}
.hero--short{padding-bottom:clamp(30px,4vw,56px)}
.hero--short .hero__wash{inset:0}
.sec{padding:clamp(80px,9vw,130px) 0;position:relative}
.sec--tint{background:linear-gradient(180deg,#fff,var(--tint))}.sec--cream{background:var(--cream)}.sec--white{background:#fff}
.head{display:grid;gap:16px;max-width:780px;margin-bottom:clamp(36px,4vw,56px)}
.head--c{margin-inline:auto;text-align:center;justify-items:center}
.hl{font-style:italic;color:var(--teal)}
.beat__vis.tilt-host .devwrap--laptop{width:min(560px,100%)}
@media(min-width:1000px){.beat .tilt-host .devwrap--laptop{width:92%}}
/* numbered notes: the why, the grants */
.notes{display:grid;gap:20px}
@media(min-width:760px){.notes{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1100px){.notes{grid-template-columns:repeat(4,1fr)}}
.note{background:#fff;border:1px solid var(--line);border-radius:24px;padding:26px 24px 28px;display:grid;gap:10px;align-content:start;box-shadow:0 30px 60px -48px rgba(6,58,71,.55);transition:transform .5s var(--ease),box-shadow .5s var(--ease)}
.note:hover{transform:translateY(-6px);box-shadow:0 40px 70px -45px rgba(6,58,71,.6)}
.note b{font:500 46px/1 var(--serif);color:transparent;-webkit-text-stroke:1px var(--gold2)}
.note h3{font:500 25px/1.12 var(--serif)}.note p{color:var(--ink2);font-size:15.5px}
/* the systems, as a moving line of names */
.sys{display:grid;gap:14px}
.sys__row{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.sys__track{display:flex;width:max-content;animation:marq 46s linear infinite}
.sys__row:nth-child(2) .sys__track{animation-direction:reverse;animation-duration:52s}
.sys__track span{flex:none;margin-right:14px;background:#fff;border:1px solid var(--line);border-radius:99px;padding:13px 22px;font:500 16px/1 var(--sans);white-space:nowrap;box-shadow:0 10px 24px -20px rgba(6,58,71,.6)}
.sys__track span small{color:var(--teal2);font:600 11px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;margin-right:10px}
/* clients: one card per organization, the logo on paper */
.logos{display:grid;gap:22px}
@media(min-width:700px){.logos{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1100px){.logos.n4{grid-template-columns:repeat(4,1fr)}.logos.n3{grid-template-columns:repeat(3,1fr)}}
.logo-card{background:#fff;border-radius:22px;padding:22px;display:grid;gap:14px;align-content:start;box-shadow:0 30px 60px -45px rgba(6,58,71,.5);transition:transform .5s var(--ease)}
.logo-card:hover{transform:translateY(-6px)}
.logo-card .plate{height:150px;border-radius:14px;background:var(--paper);display:grid;place-items:center;padding:22px}
.logo-card .plate img{max-height:106px;max-width:80%;width:auto;height:auto;object-fit:contain}
.logo-card .plate span{font:500 26px/1.1 var(--serif);text-align:center;color:var(--deep)}
.logo-card h3{font:500 23px/1.15 var(--serif)}.logo-card p{color:var(--ink2);font-size:14.5px}
.logo-card em{justify-self:start;font-style:normal;font:600 11.5px/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--teal);background:var(--tint);border-radius:99px;padding:8px 12px}
/* split: copy beside a photo that drifts */
.split2{display:grid;gap:40px;align-items:center}
@media(min-width:1000px){.split2{grid-template-columns:1fr 1fr;gap:80px}.split2--rev .split2__ph{order:-1}}
.split2__copy{display:grid;gap:18px}.split2__copy p{color:var(--ink2)}
.split2__ph{position:relative;aspect-ratio:4/5;border-radius:28px;overflow:hidden;box-shadow:0 40px 70px -45px rgba(6,58,71,.5)}
.split2__ph>div{position:absolute;inset:-7%;background-size:cover;background-position:center}
/* the launch: each step carries its photo */
.viz-ph{padding:0;background-size:cover;background-position:left top}
/* forms */
.form{display:grid;gap:16px}
.form label{display:grid;gap:7px;font:600 14px/1.2 var(--sans)}
.form input,.form textarea,.form select{font:400 16px/1.4 var(--sans);padding:14px 16px;border:1px solid #d3dcde;border-radius:14px;background:#fff;width:100%;color:var(--ink);transition:border-color .2s,box-shadow .2s}
.form input:focus,.form textarea:focus,.form select:focus{outline:0;border-color:var(--teal2);box-shadow:0 0 0 4px rgba(47,157,168,.15)}
.form .row{display:grid;gap:16px}@media(min-width:700px){.form .row{grid-template-columns:1fr 1fr}}
.form button{border:0;cursor:pointer}
.hp{position:absolute;left:-9999px}
.msg{font-size:15px}.msg.bad{color:#b3261e}.msg.ok{color:var(--teal)}
.panel{background:#fff;border:1px solid var(--line);border-radius:28px;padding:clamp(24px,4vw,48px);box-shadow:0 40px 80px -55px rgba(6,58,71,.55)}
.done{display:grid;gap:14px}
.reach{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.reach a{font-weight:600;color:var(--teal);text-decoration:none}.reach span{color:var(--ink2);font-size:15px}
.contact-grid{display:grid;gap:40px}
@media(min-width:1000px){.contact-grid{grid-template-columns:1.1fr .9fr;align-items:stretch}}
.contact-ph{position:relative;min-height:420px;border-radius:28px;overflow:hidden}
.contact-ph>.bg{position:absolute;inset:-7%;background-size:cover;background-position:60% center}
.contact-ph .chip{left:20px;bottom:20px}
.faq{display:grid;gap:0 56px}@media(min-width:900px){.faq{grid-template-columns:1fr 1fr}}
.faq details{border-bottom:1px solid var(--line);padding:22px 0}
.faq summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:20px;font:500 21px/1.3 var(--serif)}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";font:300 28px/1 var(--sans);color:var(--teal);transition:transform .3s var(--ease)}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq p{margin-top:12px;color:var(--ink2)}
/* portal */
.portal-grid{display:grid;gap:24px}
@media(min-width:1000px){.portal-grid{grid-template-columns:.9fr 1.1fr;align-items:stretch}}
.portal-demo{position:relative;border-radius:28px;background:var(--deep);color:#eef4f4;padding:clamp(28px,4vw,48px);display:grid;gap:18px;align-content:start;overflow:hidden}
.portal-demo h2 em{color:var(--gold)}.portal-demo p{color:#cfe0e3}
.portal-demo .devwrap--laptop{width:min(520px,100%);margin:10px auto 0}
.portal-demo .dev__shadow{display:none}
.small-note{font-size:14px;color:var(--ink2)}.small-note a{color:var(--teal)}
/* the dashboard tour sits on the page's paper */
.tour{background:linear-gradient(180deg,var(--tint) 0%,#fff 78%)}
.quote{background:var(--cream)}
.how{display:grid;gap:22px}@media(min-width:900px){.how{grid-template-columns:repeat(4,1fr)}}
"""

PAGE_JS = r"""<script>
(function(){if(!window.gsap||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
gsap.utils.toArray('.split2__ph > div, .contact-ph > .bg').forEach(function(d){gsap.fromTo(d,{yPercent:-5,scale:1.06},{yPercent:5,scale:1,ease:'none',scrollTrigger:{trigger:d.parentNode,start:'top bottom',end:'bottom top',scrub:.6}})});
gsap.utils.toArray('.notes,.logos,.people').forEach(function(g){gsap.from(g.children,{y:40,opacity:0,duration:.9,ease:'power3.out',stagger:.1,scrollTrigger:{trigger:g,start:'top 84%'}})});
})();
</script>"""


def phero(eyebrow, h1, lede, photo=None, pos="center 40%", btns="", chips=""):
    frame = (f'<div class="hero__frame"><div class="hero__img" style="background-image:url(/img/{photo});background-position:{pos}"></div>{chips}</div>'
             if photo else "")
    side = f'<div class="side"><p class="lede rv-in">{lede}</p>' + (f'<div class="btns rv-in">{btns}</div>' if btns else "") + "</div>"
    return (f'<header class="hero hero--page{"" if photo else " hero--short"}"><div class="hero__wash"></div><div class="shell hero__top">'
            f'<div><span class="eyebrow rv-in">{eyebrow}</span><h1 class="display rv-in" style="margin-top:22px">{h1}</h1></div>{side}</div>{frame}</header>')


def chip(cls, icon, a, b):
    return f'<div class="chip chip--{cls}"><i>{icon}</i><span>{a}<small>{b}</small></span></div>'


def beats(rows):
    """rows: (eyebrow, title, line, bullets, kind, file, pill). kind is photo or laptop."""
    out = ""
    for eb, title, line, bullets, kind, f, pill in rows:
        li = "".join(f"<li>{b}</li>" for b in bullets)
        if kind == "laptop":
            vis = f'<div class="beat__vis tilt-host"><div class="devwrap devwrap--laptop">{N.device("laptop", f if f.startswith("bi-desk") else "/img/" + f, 1280, pill)}</div></div>'
        else:
            vis = f'<div class="beat__vis beat__photo"><div style="background-image:url(/img/{f})"></div><span class="pill"><i></i>{pill}</span></div>'
        lede = f'<p class="lede">{line}</p>' if line else ""
        ul = f"<ul>{li}</ul>" if li else ""
        out += (f'<article class="beat"><div class="beat__copy"><span class="eyebrow">{eb}</span><h3>{title}</h3>'
                f'{lede}{ul}</div>{vis}</article>')
    return f'<div class="story__beats">{out}</div>'


def notes(items):
    return '<div class="notes">' + "".join(f'<div class="note"><b>0{i}</b><h3>{a}</h3><p>{b}</p></div>' for i, (a, b) in enumerate(items, 1)) + "</div>"


def logo_cards(items, n):
    cards = ""
    for img, alt, shape, yrs, name, desc in items:
        plate = f'<img src="/img/{img}" alt="{alt}">' if img else f"<span>{name}</span>"
        cards += f'<article class="logo-card"><div class="plate">{plate}</div><em>{yrs.replace("|", " ")}</em><h3>{name}</h3><p>{desc}</p></article>'
    return f'<div class="logos n{n}">{cards}</div>'


def page(name, title, body, desc, extra_css="", extra_js=""):
    html = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            f'<title>{title} | Elevate Managed Services</title><meta name="description" content="{desc}"><meta name="robots" content="noindex">'
            f'<link rel="icon" href="/favicon.svg" type="image/svg+xml">'
            '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">'
            f'<style>{N.CSS}{PAGE_CSS}{extra_css}</style></head><body><div class="grain" aria-hidden="true"></div>{N.nav(name)}{body}{N.footer()}{N.JS}{PAGE_JS}{extra_js}</body></html>')
    (HERE / f"{name}.html").write_text(html)
    print("wrote", HERE / f"{name}.html", len(html))
    return html


# ------------------------------------------------------------------ services
SVC = {"Financial Management": ("team-table.jpg", "photo", "Month-end, on the calendar"),
       "Compliance": ("team-compliance.jpg", "photo", "One owner for every deadline"),
       "Operations & Execution": ("team-hands.jpg", "photo", "Decided this week, done this week"),
       "HR, Payroll & People": ("team-review-desk.jpg", "photo", "Every employee, one home base"),
       "Marketing": ("team-talk.jpg", "photo", "Campaigns held to a calendar"),
       "Business Intelligence": ("bi-desk-construction-pl.jpg", "laptop", "The real dashboard on a sample company")}


def services():
    rows = [(t.replace("&", "&amp;"), d, "", bl, *SVC[t][1::-1], SVC[t][2]) for _, t, d, bl in B.BIZ]
    why = [("One team accountable", "Every service runs on the same execution layer and the same people, so nothing falls between vendors."),
           ("A calendar you can set a clock by", "The close, the board package and the filings land on fixed dates every month."),
           ("Every number, live", "One financial dashboard for every entity, read straight from the books and cut to each role."),
           ("Start small, add later", "Begin with the part that is breaking. Add services without rebuilding your reporting.")]
    names = [(t, n) for _, t, items in B.SYSTEMS for n in items if n != "Others on request"]
    half = (len(names) + 1) // 2
    def row(items):
        one = "".join(f"<span><small>{t}</small>{n}</span>" for t, n in items)
        return f'<div class="sys__row"><div class="sys__track">{one}{one}</div></div>'
    body = f'''{phero("Business services", "The whole back office, <em>or the part that is breaking.</em>",
                     "Every service runs on the same team and the same calendar, from the monthly close to a live dashboard.",
                     "team-whiteboard.jpg", "center 35%", '<a class="btn btn--teal" href="contact.html">Book a discovery call</a><a class="btn btn--ghost" href="#six">See the six services</a>',
                     chip("a", "&#10003;", "Six services", "One team accountable"))}
<section class="story" id="six"><div class="shell"><div class="story__intro"><span class="eyebrow rv">What we run</span>
<h2 class="h2 rv">Six services, <em>one team accountable.</em></h2>
<p class="lede rv">Most growing companies do not need another software subscription. They need someone to run the work: close the books, pay the people, file on time and say what the numbers mean.</p></div>
{beats(rows)}</div></section>
<section class="sec sec--tint"><div class="shell"><div class="head"><span class="eyebrow rv">Why it works</span><h2 class="h2 rv">The right work, <em>done on time.</em></h2>
<p class="lede rv">Success is not more tools. It is the right work done on time by people who know your business.</p></div>{notes(why)}</div></section>
<section class="sec sec--white"><div class="shell"><div class="head head--c"><span class="eyebrow rv">Works with your systems</span><h2 class="h2 rv">Nothing to <em>rebuild.</em></h2>
<p class="lede rv">We work in the software you already use.</p></div></div><div class="sys">{row(names[:half])}{row(names[half:])}</div></section>'''
    return page("services", "Business Services", body, R.DESC.get("services", ""))


# ------------------------------------------------------------------ education
EDU_PH = [("team-vicki-screen.jpg", "Board reports, every month"), ("team-monitor.jpg", "Every paycheck, on time"),
          ("bi-desk-education-hiring.jpg", "Hiring in the sample school network"), ("team-papers.jpg", "Audit-ready all year"),
          ("bi-desk-education-budget.jpg", "Budget against actual, sample school network"), ("bi-desk-education-docs.jpg", "Every document a launch needs")]


def education():
    rows = [(t.replace("&", "&amp;"), d, "", bl, "laptop" if EDU_PH[i][0].startswith("bi-desk") else "photo", EDU_PH[i][0], EDU_PH[i][1]) for i, (_, t, d, bl) in enumerate(B.EDU)]
    grants = [("Title programs", "Title I, II and IV funds from application through expenditure tracking, monitoring and reporting."),
              ("IDEA", "Special education funding tracked and documented to the same calendar as the rest of the books."),
              ("Federal and state compliance", "Charter, state and federal deadlines on one calendar, with documentation ready for monitoring visits."),
              ("Board-ready reporting", "Grant spending shown in the monthly board package, so nothing surprises the board at audit time.")]
    launch = [("Planning year", "Set up the books", "Chart of accounts, banking, payroll and policies in place before the first hire.", "hub-edu-close.jpg"),
              ("Six months out", "Staff and systems", "Hiring workflow, onboarding, benefits and vendor contracts ready to go.", "hub-edu-onboarding.jpg"),
              ("Ninety days out", "Facility ready", "Facility readiness, insurance, procurement and the opening budget locked.", "hub-edu-docs.jpg"),
              ("Opening day", "Doors open", "Payroll runs, the board sees its first report, and the school is audit-ready from day one.", "hub-edu-payroll.jpg")]
    steps = "".join(f'<div class="step"><div class="viz viz-ph" style="background-image:url(/img/{ph})"></div><span class="step__n">0{n}</span><small>{a}</small><h3>{b}</h3><p>{c}</p></div>'
                    for n, (a, b, c, ph) in enumerate(launch, 1))
    body = f'''{phero("Education services", "The complete back office <em>for schools.</em>",
                     "Built around each school's stage, priorities and staff, from the first planning year to every audit after.",
                     "team-joseph-hall.jpg", "center 30%", '<a class="btn btn--teal" href="contact.html">Talk to our education team</a><a class="btn btn--ghost" href="#launch">Starting a new school?</a>',
                     chip("a", "&#10003;", "Audit-ready", "From day one") + chip("b", "&#8599;", "Board package", "Every month"))}
<section class="story"><div class="shell"><div class="story__intro"><span class="eyebrow rv">What we run for schools</span>
<h2 class="h2 rv">The money, handled. <em>Every review, ready.</em></h2>
<p class="lede rv">School leaders should spend their time teaching, leading and growing their schools. We run the back office so they can.</p></div>
{beats(rows)}</div></section>
<section class="dash"><div class="shell"><div class="dash__copy"><span class="eyebrow rv">For the board</span><h2 class="h2 rv">The board sees it <em>before the meeting.</em></h2>
<p class="lede rv">Statements, budget against actual and enrollment, read live from the school's own systems.</p><div class="rv"><a class="btn btn--teal" href="dashboard.html">Take the tour</a></div>
<p class="dash__note rv">A sample school network in the demo.</p></div>
<div class="lap"><div class="devwrap devwrap--laptop">{N.device("laptop", "bi-desk-education-statements.jpg", 1280, "Board statements in the Elevate BI dashboard, sample school")}</div></div></div></section>
<section class="sec sec--cream" id="serve"><div class="shell"><div class="head"><span class="eyebrow rv">Schools we serve</span><h2 class="h2 rv">Open today. <em>Opening next.</em></h2></div>{logo_cards(B.SCHOOL_CLIENTS, 3)}</div></section>
<section class="sec sec--white"><div class="shell"><div class="head"><span class="eyebrow rv">Grants and compliance</span><h2 class="h2 rv">Every grant dollar, <em>accounted for.</em></h2>
<p class="lede rv">From application to expenditure tracking to the final report, documented and audit-ready all year.</p></div>{notes(grants)}</div></section>
<section class="rhythm" id="launch"><div class="shell"><div class="rhythm__top"><div class="rhythm__head"><span class="eyebrow rv">Starting a new school?</span><h2 class="h2 rv">From charter <em>to opening day.</em></h2></div>
<a class="btn btn--teal rv" href="contact.html">Plan your launch with us</a></div>
<div class="rhythm__line" style="margin-top:40px"><svg viewBox="0 0 1000 4" preserveAspectRatio="none" aria-hidden="true"><path d="M0 2 H1000"/></svg>{steps}</div>
</div></section>'''
    return page("education", "Education Services", body, R.DESC.get("education", ""))


# ------------------------------------------------------------------ about
def about():
    vals = [("Relationships before reports", "We learn your people, your calendar and what keeps you up at night before we touch a spreadsheet. The numbers mean more when we know the story behind them.", "team-laptop.jpg", "We learn the story first"),
            ("The same people, every month", "You will not be handed off to a rotating bookkeeper. The team you meet at the start is the team that closes your books, runs your payroll and sits with you at the board meeting.", "team-desk-vicki.jpg", "The team you meet stays"),
            ("Give leaders their time back", "A principal should be in classrooms. A founder should be with customers. Every process we build is measured by the hours it hands back to you.", "tnc-lobby.jpg", "Hours handed back")]
    vb = beats([(f"Value 0{i}", a, b, [], "photo", f, p) for i, (a, b, f, p) in enumerate(vals, 1)])
    local = {"provencher": "img/team-provencher.jpg"}
    team = "".join(f'<article class="person"><div class="ph" role="img" aria-label="{n}" style="background-image:url({local.get(k, "/img/team-" + k + ".jpg")})"></div><h3>{n}</h3><p>{t}</p></article>'
                   for k, n, t, c in B.TEAM)
    body = f'''{phero("About us", "Taking care of our own, <em>then yours.</em>",
                     "Elevate began as the people keeping the lights on for a family of companies that build and run schools, communities and businesses across the Southeast. Today we bring that same team and that same care to companies and schools outside our family.",
                     "team-laugh.jpg", "center 40%")}
<section class="sec sec--white" id="story"><div class="shell split2"><div class="split2__copy"><span class="eyebrow rv">Our story</span>
<h2 class="h2 rv">We started by taking care <em>of our own.</em></h2>
<p class="rv">Some weeks that meant closing the books for a construction company on a Friday and running payroll for a brand new charter school on Monday. Other weeks it meant helping a first-year school leader get ready for a board meeting, or making sure a growing company had a clear set of numbers to take to the bank.</p>
<p class="rv">Doing that work up close taught us what leaders actually need: someone who picks up, knows the history and gets it right the first time.</p></div>
<div class="split2__ph"><div style="background-image:url(/img/tnc-nova.jpg)"></div></div></div></section>
<section class="story" id="values"><div class="shell"><div class="story__intro"><span class="eyebrow rv">Our values</span><h2 class="h2 rv">How we <em>show up for you.</em></h2></div>{vb}</div></section>
<section class="sec sec--cream" id="clients"><div class="shell"><div class="head"><span class="eyebrow rv">Who we serve</span><h2 class="h2 rv">Our partners, <em>built on trust.</em></h2></div>{logo_cards(B.OUR_CLIENTS, 4)}</div></section>
<section class="team" id="team"><div class="shell"><div class="team__head"><span class="eyebrow rv">The team</span><h2 class="h2 rv">The people <em>behind the numbers.</em></h2></div><div class="people">{team}</div></div></section>'''
    return page("about", "About", body, R.DESC.get("about", ""))


# ------------------------------------------------------------------ contact
def contact():
    src = B.contact()
    i = src.find("getElementById('contactForm')")
    js = src[src.rfind("<script", 0, i):src.find("</script>", i) + 9] if i > 0 else ""
    opts = "".join(f"<option>{o}</option>" for o in ["Discovery call request", "Business services", "Education services", "BI Dashboard", "New school launch", "Something else"])
    faq = "".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in R.FAQ)
    body = f'''{phero("Contact us", "Let&rsquo;s start <em>a conversation.</em>", "Tell us what is not closing today and what you want off your plate. We reply within one business day.")}
<section class="sec" style="padding-top:0"><div class="shell contact-grid"><div class="panel">
<div class="reach"><a href="mailto:{B.EMAIL}">{B.EMAIL}</a><span>We reply within one business day.</span></div>
<form class="form" id="contactForm" novalidate>
<div class="row"><label>Name*<input name="name" autocomplete="name" required></label><label>Email*<input name="email" type="email" autocomplete="email" required></label></div>
<div class="row"><label>Phone number<input name="phone" type="tel" autocomplete="tel"></label><label>Company or school<input name="organization" autocomplete="organization"></label></div>
<label>Type of inquiry<select name="topic" id="topic">{opts}</select></label>
<label>Message*<textarea name="message" rows="5" required></textarea></label>
<input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
<div><button class="btn btn--teal" type="submit">Send</button></div><p id="formStatus" class="msg" role="status" aria-live="polite"></p></form>
<div id="formDone" class="done" hidden><span class="eyebrow">Thank you</span><h2 class="h2">Your inquiry <em>is in.</em></h2><p class="lede">Your message has been sent to the Elevate team. We will be in touch within one business day.</p></div></div>
<div class="contact-ph"><div class="bg" style="background-image:url(/img/team-joseph.jpg)"></div>{chip("a", "&#10003;", "A 45 to 60 minute call", "Then a scoped proposal within a week")}</div></div></section>
<section class="sec sec--tint"><div class="shell"><div class="head"><span class="eyebrow rv">Questions</span><h2 class="h2 rv">Frequently <em>asked.</em></h2></div><div class="faq">{faq}</div></div></section>'''
    return page("contact", "Contact", body, R.DESC.get("contact", ""), extra_js=js)


# ------------------------------------------------------------------ portal
def portal():
    src = B.portal()
    i = src.find("getElementById('signinForm')")
    js = src[src.rfind("<script", 0, i):src.find("</script>", i) + 9] if i > 0 else ""
    body = f'''{phero("Client portal", "Sign in to <em>your dashboard.</em>", "Enter your work email and we will take you to your company&rsquo;s dashboard.")}
<section class="sec" style="padding-top:0"><div class="shell portal-grid"><div class="panel" style="display:grid;gap:20px;align-content:start">
<span class="eyebrow">Client sign-in</span><h2 class="h2">Welcome <em>back.</em></h2>
<form id="signinForm" class="form" novalidate><label for="email">Work email<input id="email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="name@company.com" required></label>
<div><button class="btn btn--teal" type="submit">Continue &rarr;</button></div></form>
<p id="msg" class="msg" role="status" aria-live="polite"></p>
<p class="small-note">Trouble signing in? Email <a href="mailto:{B.EMAIL}">{B.EMAIL}</a>.</p></div>
<div class="portal-demo"><span class="eyebrow" style="color:var(--gold)">Not a client yet?</span><h2 class="h2">See the <em>dashboard.</em></h2>
<p>A tour of the real dashboard on a sample company, for every industry we serve.</p><div><a class="btn btn--gold" href="dashboard.html">See the BI Dashboard &rarr;</a></div>
<div class="devwrap devwrap--laptop">{N.device("laptop", "bi-desk-construction-home.jpg", 1280, "The Elevate BI sign-in, sample company")}</div></div></div></section>'''
    return page("portal", "Client Portal", body, R.DESC.get("portal", ""), extra_js=js)


# ------------------------------------------------------------------ BI dashboard
def dashboard():
    live = R.dashboard()
    a = live.index('<section class="tour"')
    b = live.index("</main>") if "</main>" in live else live.index("<footer")
    inner = live[a:b]
    # the live page's headings carry its Title Case; the /next/ voice is sentence case with an italic turn
    inner = inner.replace('<span class="hl">', "<em>").replace("</span></h2>", "</em></h2>")
    for old, new in [("The Dashboard, <em>Highlight by Highlight</em>", "The dashboard, <em>highlight by highlight.</em>"),
                     ("Tell Us What You <em>Run On</em>", "Tell us what you <em>run on.</em>"),
                     ("We Have Your <em>List</em>", "We have <em>your list.</em>"),
                     ("Set Up Once, <em>Live Every Day</em>", "Set up once, <em>live every day.</em>")]:
        assert old in inner, old
        inner = inner.replace(old, new)
    inner = inner.replace('<section class="sec">', '<section class="sec sec--white">', 1)
    tour_css = R.TOUR_CSS if hasattr(R, "TOUR_CSS") else ""
    body = f'''{phero("BI Dashboard", "Every number, <em>live.</em>", "One dashboard for every entity, read straight from the systems you already use.",
                     None, btns='<a class="btn btn--teal" href="#tour">Take the tour</a><a class="btn btn--ghost" href="#quote">Get a quote</a>')}
{inner.replace('<section class="quote">', '<section class="quote" id="quote">', 1)}'''
    return page("dashboard", "BI Dashboard", body, R.DESC.get("dashboard", ""), extra_css=tour_css)


# Photos Matt has ruled off the site. The Libertas Academy flag is never used (Matt, 2026-11-18:
# "it was a specific rule to not use this flag"), and its file is deleted from img/.
BANNED = {"libertas-flag.jpg", "libertas-campus.jpg", "school-front.jpg", "q3-002.jpg", "q3-010.jpg", "q3-016.jpg", "q3-020.jpg",
          "site-block.jpg", "site-dusk.jpg", "site-trailer.jpg", "tnc-truck.jpg", "school-chalk.jpg"}
# Libertas Academy is never shown (Matt, 2026-11-18: "again, try not to use Libertas"), and no
# construction sites ("a construction site is a shit idea"). school-chalk is out because it may be Libertas.


def check_images():
    """No photo twice across the /next/ site (logos and headshots aside), and no banned photo."""
    for f in ["index", "services", "education", "about", "contact", "portal", "dashboard"]:
        hit = [b for b in BANNED if b in (HERE / f"{f}.html").read_text()]
        if hit:
            raise SystemExit(f"{f}.html uses a banned photo: {hit}")
    team = {k for k, *_ in B.TEAM}
    seen = {}
    for f in ["index", "services", "education", "about", "contact", "portal", "dashboard"]:
        html = (HERE / f"{f}.html").read_text()
        html = re.sub(r"<script.*?</script>", "", html, flags=re.S)
        if f != "index":  # the shared stylesheet carries the home page's own photos
            html = re.sub(r"<style>.*?</style>", "", html, flags=re.S)
        for img in re.findall(r"[\w./-]*?/?((?:img/)?[\w-]+\.(?:jpg|png))", html):
            name = img.split("/")[-1]
            if name.startswith(("client-", "device-", "grain")) or (name.startswith("team-") and name[5:-4] in team):
                continue
            seen.setdefault(name, []).append(f)
    dup = {k: v for k, v in seen.items() if len(v) > 1}
    if dup:
        raise SystemExit("an image is used more than once: " + json.dumps(dup))
    print("images: each used once,", len(seen), "photos")


if __name__ == "__main__":
    for fn in (services, education, about, contact, portal, dashboard):
        fn()
    check_images()
