# elevate-web

Static site for **Elevate Managed Services** (elevatemanagedservices.com).

`index.html` is fully self-contained: inline CSS, inline SVG logo, and a data-URI
favicon. The only external request is Google Fonts (Bodoni Moda, IBM Plex Sans,
IBM Plex Mono). No raster images anywhere, so nothing blurs at any density.

`elevate-mark.svg` and `favicon.svg` are the check-mark device as standalone
vectors, for use outside this page.

## Deploy

Served by GitHub Pages from the `gh-pages` branch. Keep `main` and `gh-pages`
identical to avoid drift.

    git push origin main
    git push origin main:gh-pages

## Custom domain

Not yet pointed. To go live on elevatemanagedservices.com:

1. Repo Settings, Pages, set the custom domain (this writes a `CNAME` file).
2. At GoDaddy DNS, four `@` A records to 185.199.108.153, 185.199.109.153,
   185.199.110.153, 185.199.111.153, and a `www` CNAME to
   powered-by-elevate.github.io.
3. Remove the records currently pointing the domain at Websites + Marketing.

GitHub provisions HTTPS automatically once DNS resolves.
