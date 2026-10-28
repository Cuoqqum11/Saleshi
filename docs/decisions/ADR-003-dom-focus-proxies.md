# ADR-003 — Real DOM buttons projected onto 3D objects

**Status:** accepted (Milestone 1)

## Context

The room's interactive objects are geometry. Geometry has no tab order, no focus ring, no
`aria-label` and no reliable hit target for a motor-impaired user. Rendering text and controls as
3D objects would make the site's central interaction impossible to operate without a mouse, and
impossible to test.

## Decision

Every interactive object gets a real `<button>` in an overlay layer (`#room-proxy-layer`). Each
frame, the object's world position is projected to screen coordinates and the button is moved
with a `transform`. The buttons are the only way the pointer and keyboard reach the room's
objects for selection purposes — the raycaster path additionally provides hover feedback.

Two rules make this work with a moving camera:

1. **An off-screen object keeps its button.** It is clamped to the nearest edge of the stage,
   marked `is-clamped` and given a `data-edge-hint` of "behind you" or "edge of view". Removing
   it from the DOM would remove it from the tab order, so turning the camera away could strand a
   keyboard user with nothing to focus.
2. **Clamped chips are laid out as a column.** A point behind the camera projects to a mirrored,
   meaningless position, so every turned-away object lands on nearly the same pixel. Without
   distribution they overlap and only the topmost is clickable — which is exactly the defect
   found while testing this milestone (D1 in `tests/test-plan.md`).
3. **Containment accounts for the chip's own box, and for the state it is about to enter.** A
   chip is centred on its position, so clamping the centre lets half of it fall off the stage; and
   the "edge of view" suffix is added *after* placement, making the chip 76 px wider than the
   measurement that positioned it (D2, D6).

Chip sizes are read in one pass before any transform is written, so the browser lays the layer
out once per frame rather than once per object.

## Consequences

- Keyboard focus, visible focus rings, `aria-current` on the selected tape and an accessible name
  for each object come for free from the platform rather than being simulated.
- Measured cost: 0.09 ms average, 0.5 ms worst over 60 samples for three chips — about 0.5 % of a
  60 fps frame budget.
- Chips are labels, not decorations: they are deliberately readable, which is a visual
  compromise in an immersive scene. If that becomes unacceptable the answer is a hover-only
  treatment plus a persistent control bar, not removing the buttons.
- The overlay cannot be captured by a canvas screenshot, which is why the evidence PNGs show the
  room without its interface.
