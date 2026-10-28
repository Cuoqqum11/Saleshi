# ADR-006 — The room is the entry experience; the text page is the fallback

**Status:** accepted (Milestone 3)

## Context

The v0.2 addendum and the 2026-10-26 direction both state that the navigable room is the website's
main interface, not an optional extra bolted onto a conventional homepage. By Milestone 2 the room
already auto-started on capable desktops, but it was presented as a 62 vh section inside a
scrolling homepage with an "Enter the studio" heading above it — visually a widget on a page, which
contradicts the intended experience. At the same time the assignment (Unit 13) and basic access
require that every fact the room presents remains available as ordinary HTML: the studio letter,
the game list, and the no-JS / no-WebGL paths.

## Decision

Entry framing is a layout concern, so it is solved in layout and nothing else:

- When the room is running (`html[data-room="on"]`), `#room` becomes a full-viewport flex column:
  the section heading and status stay in the accessibility tree but leave the visual field, the
  stage takes all remaining height edge-to-edge, and the control bar forms the bottom edge. The
  column height is `100dvh` minus a **measured** `--header-h` (set in `main.js`, refreshed on
  resize), so no magic number breaks when the header wraps on narrow screens.
- The studio letter and the game list stay in the document, unchanged, immediately below the fold.
  They remain the no-JS view, the no-WebGL view, the `?view=list` view, the skip-link target and
  the search-indexable copy. Nothing is hidden from the DOM or from a crawler.
- ~~Narrow screens still start as text (Milestone 1 decision, unchanged): a phone visitor gets the
  list first and can opt into the room.~~ **Superseded in Milestone 4** by ADR-008: a capable phone
  now gets the room by default, and viewport width alone no longer decides anything.
- Because the launcher's how-to text disappears once the room auto-starts, an equivalent
  orientation line lives permanently in the control bar, and the room announces one orientation
  sentence into the existing live region on start.

## Consequences

- "Room first" costs one CSS block, one measured custom property, two HTML lines and one announce
  call. No component was rebuilt; selection, URL state, proxies, reduced motion and the WebGL
  fallback are untouched and their suites still pass (gate 7/7, movement 15/15).
- The fallback is one scroll away rather than one click away. That is deliberate: it keeps the
  text view discoverable and indexable without competing with the room for the first viewport.
  E1 asserts the letter begins exactly at the fold, and E2 asserts `?view=list` still wins when
  asked for.
- Open risk, logged as B6 in `tests/test-plan.md`: the full-viewport column has been measured at
  1280 px and 390 px (E1, E3 — no overflow, control bar inside the viewport) but no human eye has
  looked at the 390 px column, and 700–900 px remains untested.
