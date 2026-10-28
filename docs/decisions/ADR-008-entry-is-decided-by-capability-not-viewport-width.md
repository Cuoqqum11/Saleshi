# ADR-008 — Entry is decided by capability and usability, not by viewport width

**Status:** accepted (Milestone 4)

## Context

Milestones 1–3 used a single numeric test to decide whether a visitor met the room: a viewport
narrower than the `MOBILE_QUERY` breakpoint got the text page first and had to opt in. That was a
proxy for "this screen is too small to steer a 3D camera on", and it was wrong in both directions —
it hid the room from a modern phone, which is the device most likely to be asked about in a
portfolio review, and it offered the room to any desktop window dragged narrow, where the control
bar and the on-monitor panel genuinely do not fit. The 2026-10-28 direction made the intention
explicit: the room is the default experience on devices that can support it, the conventional game
list is always available as an alternative, and viewport width alone must not force the text view.

## Decision

`roomDecision()` in `src/js/main.js` answers three separate questions, and none of them is "how
wide is the window":

1. **Can it render?** `hasWebGL()` — a real context probe. A missing GPU is a withdrawal, not a
   choice: the launcher is disabled with the reason stated, because offering a control that cannot
   work is the defect ADR-005 exists to prevent.
2. **Should it, given what the device asked for?** `navigator.connection.saveData` — a browser that
   has been told to conserve data is not sent a 620 kB chunk without asking.
3. **Is there enough room to use it?** `innerWidth < 320 || innerHeight < 480` — an absolute
   usability floor, applied to the window rather than to a device class, so a 390 px phone passes
   and a 300 px window does not.

Then two overrides, deliberately asymmetric: `?view=list` always wins (an explicit request is never
argued with), and `?view=room` can override a *usability* choice but never a *capability* one —
forcing the room on a machine without WebGL would only produce a broken canvas.

Input capability is decided separately from display capability. Walking is keyboard-driven, so
`(pointer: coarse)` suppresses the "Walk freely" button and rewrites the hint line to describe the
controls that actually exist on that device; the stations, the chips and the panel remain. The
decision is made once in `main.js` and passed down as `canWalk`, so `startRoom.js` only renders.

## Consequences

- A phone now sees the room by default (E4: 390×844 with `hasTouch`/`isMobile` starts running,
  reports `coarse=true`, has no walk control, keeps both station buttons, and a tap on a cassette
  chip selects — E5). The text list is still one scroll away, still `?view=list`, and still the
  only thing a withdrawn device gets.
- Two failure modes replaced one. The width rule failed silently; these fail out loud, because each
  branch carries its own stated reason into the launcher text, and the reason is what the tests
  assert on.
- The `saveData` branch has never executed in any run: no Chromium context in the suite reported
  `saveData`, so it is recorded as unverified (B7) rather than as passing.
- `hasTouch`/`isMobile` emulation proves layout and media queries, not a thumb. Real-device
  behaviour, especially drag-to-look, stays open (B4) along with every non-Chromium engine (B5).
- Coarse-pointer devices get a room they cannot walk through. That is a deliberate gap, not an
  oversight: on-screen movement is a separate control problem and belongs to the visual pass, and a
  button that cannot work on the device showing it is the one thing this project has refused to
  ship since Milestone 1.
