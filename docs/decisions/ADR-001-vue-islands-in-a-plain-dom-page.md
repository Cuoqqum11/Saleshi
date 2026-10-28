# ADR-001 — Vue 3 as islands inside a plain DOM page, Three.js unmanaged

**Status:** accepted (Milestone 1)

## Context

The assignment asks for two front-end frameworks to be demonstrated (M1), while the project
brief says not to introduce a framework without a reason and to keep the room itself in plain
Three.js. The monitor screen is the site's main game interface and is text-and-link heavy, which
is exactly what HTML renders well and 3D renders badly.

## Decision

- The page shell is hand-written HTML/CSS. Vue is **not** the page framework and there is no
  client-side router.
- Vue 3 is mounted as an *island* into an existing element: `createApp({ render: () =>
  h(MonitorPanel, { game }) })` inside `#monitor-screen`, with the selected game held in a
  `shallowRef`.
- The room is plain Three.js. Vue does not manage the scene graph, and Three.js is not wrapped by
  a Vue renderer.
- Cart and checkout will use the same island pattern when they exist.

## Consequences

- Two front-end technologies are genuinely used rather than nominally present, which is what M1
  asks for; the second (Express) is a later milestone.
- The reactive selection store is framework-free (`src/js/ui/selection.js`), so the 3D side can
  select a game without knowing Vue exists. That keeps the room usable if the panel fails to
  mount.
- Cost: a second rendering paradigm in one page, and a small amount of glue code where Vue meets
  the DOM. Accepted because the alternative — rendering readable buttons and paragraphs as 3D
  text — is worse for accessibility, responsiveness and maintenance.
- `shallowRef` is deliberate: deep reactivity over a game record with nested availability objects
  buys nothing and would make the panel re-render on unrelated mutations.
