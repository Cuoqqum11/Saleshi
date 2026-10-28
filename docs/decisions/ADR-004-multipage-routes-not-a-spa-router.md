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
index.html                       → the room + conventional fallback content
games/index.html                 → catalogue
games/placeholder-slug/index.html → the game page
store/index.html                 → offerings
cart/index.html                  → persistent cart
checkout/index.html              → simulated checkout
order/index.html                 → confirmation
```

No router library exists in the project. Links are ordinary `<a href>` elements. Vue mounts only
inside the room page, and only after the room starts. M5 adds a Vite static-content transform so
data-heavy cards and details are generated from shared records in both development and production.

## Consequences

- Catalogue, game and store information is in served HTML before scripts run, verified by R8 and
  C12 with JavaScript disabled. Interactive cart/checkout/order pages explain their JS requirement.
- The game page loads only the small shared cart-badge controller; its substantive content does
  not depend on that script.
- Deep links work on static directory hosts; sales routes additionally require the Express API.
- Cost: shared header/footer markup is duplicated between pages. Data-heavy content is generated
  by the build-time plugin rather than copied, and normal browser history is preserved.
- State that must survive between pages lives in the URL (`?game=<slug>`, `?view=list`), which is
  also what makes a shared room/game selection linkable.
