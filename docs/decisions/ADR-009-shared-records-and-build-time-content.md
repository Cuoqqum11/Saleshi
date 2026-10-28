# ADR-009 — Shared game/offering records with build-time HTML

**Status:** accepted (Milestone 5)

## Context

The shelf, computer, catalogue, game page and store must not disagree about a game or its availability. Duplicating cards and details into each template had already left the game page with outdated commercial copy. Rendering everything only in the browser would also weaken no-JavaScript and search-visible content.

## Decision

Keep creative records in `games.js` and commercial offering records in `offerings.js`. Let the room import those modules directly and use a Vite `transformIndexHtml` plugin to replace explicit page markers with equivalent static HTML in development and production. Add game pages to Vite's multi-page inputs rather than introducing a client router.

## Consequences

- Adding a real game requires its record and assets, not parallel rewrites of each interface.
- Homepage, catalogue, details and store content is present in served HTML without JavaScript.
- Commercial prices and rules have one browser configuration; the MySQL seed/repository is the server-side authority for quotes and orders.
- Header/footer shells remain repeated across routes. That duplication is accepted at this scale; the data-heavy content is not repeated.
- Test fixtures for unavailable media/action branches are injected only through the dev-only panel hook and never become site content.
