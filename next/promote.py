"""Put the immersive design live: next/<page>.html becomes the site's root <page>.html.

    python3 next/build_next.py && python3 next/build_pages.py && python3 next/promote.py

Matt, 2026-11-18: "publish it live". From here the root pages come from next/, and
redesign.py no longer writes them (its build refuses), so the two cannot drift.
The /next/ copy stays as the working preview.
"""
import re
import shutil
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent
PAGES = ["index", "services", "education", "about", "contact", "portal", "dashboard"]

for name in PAGES:
    html = (HERE / f"{name}.html").read_text()
    html = html.replace('<meta name="robots" content="noindex">', "")
    for img in set(re.findall(r'(?<![/\w])img/([\w.-]+\.(?:jpg|png|webp|svg))', html)):
        src = HERE / "img" / img
        if src.exists():
            shutil.copy(src, ROOT / "img" / img)
    html = re.sub(r'(["(])img/', r'\1/img/', html)
    # clean addresses on the live site, as the old site had them (Matt, 2026-11-18: the ".html parts
    # are starting to show"): index.html is /, services.html is /services, anchors kept
    html = re.sub(r'href="index\.html(#[\w-]*)?"', lambda m: f'href="/{m.group(1) or ""}"', html)
    html = re.sub(r'href="(' + "|".join(PAGES) + r')\.html(#[\w-]*)?"', lambda m: f'href="/{m.group(1)}{m.group(2) or ""}"', html)
    (ROOT / f"{name}.html").write_text(html)
    print("live", name, len(html))
