# ADR-005 — Dev-only test hooks, and no browser-automation dependency yet

**Status:** accepted (Milestone 1)

## Context

Milestone 1's acceptance criteria are all about behaviour inside a WebGL canvas, which is hard to
observe from outside. The intended tool for that (Playwright) was not installed: adding a
browser-download dependency at this stage would commit disk space and a install step before the
project's own test surface is stable, and the sandbox blocked the browser-discovery step that
would have let an existing Chrome be reused.

The available alternative is the in-app browser's script-evaluation channel, which can read and
drive the DOM but cannot screenshot a page whose surface is hidden.

## Decision

Three hooks exist in development only, all behind `import.meta.env.DEV` so they are dead code
stripped from the production bundle:

| Hook | Purpose |
| --- | --- |
| `WebGLRenderer({ preserveDrawingBuffer: true })` | lets `canvas.toDataURL()` return a real frame instead of a cleared buffer |
| `room.renderFrame()` | measures the stage and advances exactly one frame, so evidence does not depend on `requestAnimationFrame` running |
| `window.__saleshiRoom` | `isRunning() · stats() · render() · snapshot() · start() · stop()` |

`renderFrame()` exists because a backgrounded tab throttles `requestAnimationFrame` to a stop:
without it, `fps` reads 0, the proxy timing buffer stays empty and `toDataURL()` returns a stale
image. Extracting `step()` out of `tick()` is what makes a single deterministic frame possible.

`stats()` is not test-only: draw calls, triangles and geometries are the M2 performance evidence,
so the same numbers are read by hand in a visible tab.

## Consequences

- Milestone 1 was tested through a real browser DOM with measured output, at the cost of three
  dev-only seams that a reader could mistake for production behaviour. They are commented as
  test hooks where they are defined.
- `preserveDrawingBuffer` has a real performance cost when enabled, which is precisely why it is
  dev-only.
- Visual evidence is canvas-only: the DOM overlay (monitor panel, chips) cannot appear in the
  captured PNGs, and full-page screenshots were refused. Recorded as limitation B3.
- Playwright is still the right tool for the next round of testing, specifically for keyboard
  activation with real key events (limitation B1), multi-engine checks and video evidence. It
  should be added when there are tests worth running repeatedly, not before.
