# ADR-002 — Two camera stations first, constrained free movement second

**Status:** accepted (Milestone 1); free movement delivered in Milestone 2 as a second mode of the
same controller (`cameraController.js` + `collision.js`), not as a separate module — see the note
at the top of `cameraController.js`. Stations remain as shortcuts, the keyboard path and the
reduced-motion alternative.

## Context

The intended final experience is a genuinely navigable room, not a fixed camera. The owner's
instruction was to use stations to prove the camera, selection and interaction architecture
first, to treat that as a milestone rather than the destination, and to explain the cost before
going further — while preserving the architecture so movement can be added without rewriting
selection or accessibility.

## Decision

Milestone 1 ships two camera stations (shelf, desk) with drag-to-look for orientation. The
camera is behind an interface rather than being scattered through the code:

```
travelTo(stationId) · setLookDelta(dx, dy) · update(dt) · getPose() · getMode() · subscribe(fn)
```

`src/js/room/stations.js` documents the shape a future `freeWalk.js` must implement. Selection,
picking, the focus-proxy layer and the monitor panel all consume the camera through
`getPose()`/`subscribe()` and never assume a station exists.

## Implementation cost of free movement, measured against this milestone

| Work | Why it is not free | Estimate |
| --- | --- | --- |
| Position integration + bounds | velocity, damping, and a room-shaped constraint; the current controller tweens between two poses and holds no velocity | small |
| Collision | the room has furniture; without it the camera walks through the desk. Needs either axis-separated AABB tests against a list of blockers, or a navmesh, which is over-scope | medium, and the main risk |
| Mobile control | an on-screen stick plus drag-to-look, and a decision about whether the stick steals touch space from looking | medium |
| Accessibility impact | **none expected** — chips are re-projected every frame and clamped to the viewport edge, so a moving camera cannot strand a keyboard user. This is the reason the architecture was built this way | none |
| Motion sickness / reduced motion | free movement under `prefers-reduced-motion` needs a teleport-style alternative, i.e. the stations stay as a feature rather than being replaced | small |
| Testing | every station-based test above has to be re-expressed for arbitrary poses | medium |

Stations are kept as shortcuts afterwards: they are the keyboard-accessible way to reach an
object and the reduced-motion alternative.

## Consequences

- Milestone 1 is not the final navigation model and is documented as such in the footer and the
  README, rather than being presented as finished.
- The interface constraint is what makes the above cost "add a module" instead of "rework the
  room"; it is also the reason the camera code has one more indirection than two hard-coded
  poses need.
