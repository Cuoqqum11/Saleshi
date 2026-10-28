# ADR-004 — Multi-page static HTML routes instead of a client-side router

**Status:** accepted (Milestone 1)

## Context

The site needs several distinct destinations: the room, a game page, and later the store,
support and checkout. A single-page app with a client router is the habitual choice, and would
also make the Vue "islands" decision easier to unify. The assignment separately asks for SEO and
performance work (M2), and the brief requires content to remain available when the 3D experience
cannot run.

## Decision

Each route is a real `.html` file built by Vite through `rollupOptions.input`:

```
index.html                      → the room + conventional fallback content
games/placeholder-slug/index.html → the game page
```

No router library exists in the project. Links are ordinary `<a href>` elements. Vue mounts only
inside the room page, and only after the room starts.

## Consequences

- Every page's content is in the served HTML before any script runs. Verified by fetching the
  room page with `curl` and confirming the studio letter, the game title, the three empty shelf
  positions and the link to the game page are all present (T08).
- The game page ships **zero JavaScript** — the built page references only the shared stylesheet.
- Deep links work on any static host without rewrite rules, which narrows the hosting choice.
- Cost: shared markup (header, footer, fallback list) is duplicated between pages rather than
  composed once. With two pages that duplication is cheaper than a templating layer. If the store
  adds four more pages, the duplication should be revisited — a build-time include or a small
  component-rendered-to-HTML step, not a client router.
- State that must survive between pages lives in the URL (`?game=<slug>`, `?view=list`), which is
  also what makes a shared room/game selection linkable.
