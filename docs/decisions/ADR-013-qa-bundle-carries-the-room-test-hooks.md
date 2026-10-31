# ADR-013 — A separate QA bundle carries the room test hooks, the deployable bundle does not

**Status:** accepted (Milestone 6b), amends ADR-005

## Context

ADR-005 put the room's observation seams — `window.__saleshiRoom`, `renderFrame()` and
`preserveDrawingBuffer` — behind `import.meta.env.DEV`, on the reasoning that a production bundle
should not ship a control no visitor needs. That made the room suites depend on a development
origin, which has two costs the milestone only discovered under load. A dev server asks the browser
for several hundred module requests before the room can start, and on this workstation that is
precisely the traffic that fails with `net::ERR_NETWORK_ACCESS_DENIED` when Windows hands the client
a port another listener already holds. It is also not what a visitor receives: unminified, unchunked,
HMR attached.

The alternative — reading renderer internals out of the DOM — would mean weakening the tests to
whatever a hook-free page happens to expose.

## Decision

`src/js/testHooks.js` defines one constant, `TEST_HOOKS = import.meta.env.DEV || import.meta.env.VITE_ROOM_HOOKS === '1'`,
and every seam now keys off it. `npm run build:qa` (`scripts/build-qa.mjs`) produces a production-shaped
single-chunk build in `dist-qa/` with `VITE_ROOM_HOOKS=1`; `server/index.js` serves whatever
`DIST_DIR` names. `npm run build` leaves both constants false, so the deployable `dist/` ships no
hooks at all. `dist-qa/` is ignored.

Where a check can only be made through a hook, the suite reports `SKIP` on a hook-free origin instead
of quietly passing: `B12h` reads 19 passed / 0 failed / 1 skipped on `dist` and 20/20/0 on `dist-qa`.

## Consequences

- Room evidence comes from a minified, chunked, production-shaped bundle, which is closer to what a
  visitor runs than the dev server was, and needs one request instead of hundreds.
- Two build outputs exist, so "the build passed" needs an origin attached. `tests/test-plan.md`
  records which port served which bundle for every run, and the QA log line states that `dist-qa/`
  is not what gets deployed.
- The QA bundle is a real artifact that could in principle be served by mistake. It is separated by
  directory, by `DIST_DIR` and by an explicit `console.log`; the deployable build's hook-free state is
  asserted by the skip it produces, not by trust.
- The hooks are still hooks: they expose renderer internals a user could not reach, and they cost
  memory (`preserveDrawingBuffer`). Keeping them out of `dist/` is the point, so a deployment step
  that picked the wrong directory would be a defect, not a preference.
