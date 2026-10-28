# Evidence index

Captured on Windows in headless Chromium. Reduced-motion behaviour is evidenced by the measured
checks W11–W12 in `../../tests/test-plan.md`, not by any frame here.

**`m1-*` are canvas-only** captures taken through a dev-only `toDataURL()` hook, because at that
time the browser surface was hidden and page screenshots were refused. The DOM overlay — the
monitor panel, the object chips and the control bar — is therefore *not* visible in them; the
interface state those frames correspond to is recorded as measured data in
`../../tests/test-plan.md` instead.

**`m2-*` are full page captures** taken by the e2e suites (`tests/e2e/gate.mjs`,
`tests/e2e/movement.mjs`) once the browser surface was available, so the DOM overlay *is* visible
in them: the monitor panel, the object chips and the control bar all appear as the user sees them.
They were re-captured at Milestone 4, so each now shows four chips — one cassette, the computer and
the two pinned papers.

| File | What it shows |
| --- | --- |
| `m1-01-shelf-station.png` | First shelf render. Kept as the "before": the room was far too dark and the shelf read as a solid slab with the cassettes inside it. |
| `m1-02-shelf-station.png` | Same station after rebuilding the shelf as a wall plank, back board and two brackets, so the tapes stand on top of it. |
| `m1-03-desk-station.png` | First desk render at that lighting level — the monitor was barely distinguishable from the wall. |
| `m1-04-desk-station.png` | The over-correction: lamp, screen glow, hemisphere and key light all raised too far, blowing the desk out to near-white. |
| `m1-05-shelf-station.png` | Rebalanced lighting, shelf station. Still too dark to read the catalogue. |
| `m1-06-desk-station.png` | Rebalanced lighting, desk station with a game selected. The monitor screen reads as switched on and the paper, keyboard and lamp are all distinguishable. |
| `m1-07-shelf-station.png` | Shelf station after adding the short-range shelf wash light. The tape, its label, the three empty slots and the plank are all legible. |
| `m1-08-desk-station.png` | Final desk station, captured after the wash light was added, to confirm it does not affect the desk. It does not: its range is 2.4 m and the screen is 3.7 m away. |
| `m2-01-desk-integrated.png` | Desk station with a game selected, full page. The room fills the whole first viewport — header bar, full-bleed stage, control bar at the bottom edge — with the letter and game list below the fold. The instruction note is visible on the north wall with its chip on it, the letter chip reports "behind you", the tape chip is clamped to the top-left edge, and the panel is anchored on the monitor showing one live action plus four reasoned unavailable ones. The computer chip is hidden behind that panel here — see D11 in `../../tests/test-plan.md`. |
| `m2-02-shelf-integrated.png` | Shelf station, full page, room-first layout. The tape chip sits on the selected cassette, the computer and both paper chips report "edge of view", and the standby panel is clamped inside the stage at the right because the monitor is out of frame. |
| `m2-03-walk-shelf-selected.png` | Walking freely, facing the shelf with a tape selected. The panel is clamped to the right edge (monitor out of frame) and lists all four unavailable actions; the tape chip is on the shelf. |
| `m2-04-walk-midroom.png` | Walking freely mid-room, nothing selected. The panel is docked with the standby message; the room reads legibly at walking distance. |
| `m2-05-walk-desk-anchored.png` | Walking freely, facing the desk with nothing selected. The standby panel is anchored on the monitor screen; the tape, computer and paper chips report "edge of view". |
| `m4-01-paper-open.png` | The readable view of the studio letter, opened by a real mouse click on the wall paper's chip. A dimmed backdrop holds the room behind it, the cloned sheet keeps the paper styling and the PLACEHOLDER markers, the "skip the room" paragraph is excluded, and the live region states how to get back. |
| `m4-02-wall-notes.png` | Shelf station with a game selected, after Milestone 4. The studio letter is legible as a pale sheet pinned to the west wall at the left edge of frame; both paper chips are clamped to the edges with their "edge of view" suffix, and the panel is docked inside the stage because the monitor is out of frame. |
| `m4-03-phone-room.png` | The room as a 390×844 touch device meets it (E4/E5): running by default, no "Walk freely" control, both station buttons, the hint rewritten to describe the controls that exist, and the docked panel scrollable inside the stage. |
| `raw-index-nojs.html` | The room page exactly as the dev server serves it, with no script executed. Evidence for T08: the studio letter, the game title, the three empty shelf positions and the link to the game page are present in the HTML itself. |

The sequence m1-01 → m1-08 is the lighting iteration, and is the honest record of it: two of these
frames are wrong, and they were corrected by measurement rather than by guessing.
