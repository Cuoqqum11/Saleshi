# Deployment options

No domain has been purchased, no server rented and no paid account created. This is a decision
record of the options, written so the choice can be made later without re-deriving it.

## What the site needs to run

Two different things, which is why one host may not be enough:

1. **Static front end** — `npm run build` produces plain HTML/CSS/JS in `dist/`. The room page and
   the game page both work with no server logic at all (verified: the game page loads zero
   JavaScript).
2. **Back end** — the pay-what-you-want / support flow needs a server that recomputes prices and
   writes orders to a database. That is planned as Express + MySQL and does not exist yet.

## Options

| Option | Front end | Back end | Cost | Fit for the assignment | Notes |
| --- | --- | --- | --- | --- | --- |
| **A. Static host only** (e.g. GitHub Pages) | hosted | none | free | covers P1, P2 only partially, M2 | Honest but incomplete: no server-side evidence, so M1/M3 stay unproven |
| **B. Static host + separate small VPS** | hosted | self-managed | monthly fee | strongest | Also the clearest P1 story: DNS A record → server IP, and the student configures nginx/Apache, TLS and the database themselves |
| **C. One PaaS** (Render, Railway, Fly.io) | hosted | hosted | free tier then monthly | good | Fastest to a live URL; weaker evidence for P1/P2 because the platform owns the server configuration and DNS |
| **D. Shared PHP host with WordPress** | hosted | hosted | low | good for P4 | Useful only as the *comparison* site for P4 (CMS vs custom-built), not as the project's own host |
| **E. Local / LAN demonstration** | none | none | free | fallback | Acceptable only if the tutor confirms it; needs a documented URL and network setup |

## Recommendation, and why

**Option B** if a live public URL is required, otherwise **Option A now and B when the back end
exists**.

Reasoning, in the order that matters for this assignment:

- P1 asks for DNS and hosting to be *explained*. A domain plus an A record pointing at a server
  the student configured produces directly referenceable evidence (record screenshots, vhost
  config, certificate). A PaaS makes that story thin.
- M1/M3 need a real back end and a database the student actually administers; a self-managed
  server forces that to exist rather than abstracting it away.
- Cost is the binding constraint, so nothing should be bought before the tutor confirms whether a
  public URL is assessed at all.
- The build output is already host-agnostic: `base: '/'` in `vite.config.js`, absolute routes, and
  no server-side rendering to port.

## What would change the recommendation

- Tutor says a local demonstration is enough → stay on Option A/E and spend the time on the back
  end instead.
- The site must be public *and* the assessment window is short → Option C, accepting the weaker
  P1 narrative and documenting the trade-off rather than pretending it does not exist.

## Pre-flight checklist for whichever host is chosen

- [ ] `npm run build` output served from the web root; deep links to `/games/<slug>/` return the
      HTML page rather than a 404 (needs a rewrite rule or the directory structure Vite emits).
- [ ] HTTPS certificate installed and HTTP→HTTPS redirect enabled.
- [ ] Database credentials moved into environment variables; `.env` never committed (already
      ignored by `.gitignore`).
- [ ] Prices, totals and availability validated on the server; nothing trusted from the browser.
- [ ] No card data collected on the site at any point.
- [ ] Crawlable HTML confirmed on the live host, plus the M2 measurements re-taken there.
