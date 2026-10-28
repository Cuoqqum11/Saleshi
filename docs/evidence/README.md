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
They were re-captured at Milestone 5, so each shows four chips and the current separate
viewport/panel layout rather than the obsolete anchored panel.

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
| `m2-01-desk-integrated.png` | Desk station with a game selected, full page. Re-captured at M5 with the computer beside the viewport, all chips clickable, live details/cart actions and reasoned unavailable actions. |
| `m2-02-shelf-integrated.png` | Shelf station, full page, room-first layout. Re-captured at M5 with the standby computer in its own side region and every chip inside the viewport. |
| `m2-03-walk-shelf-selected.png` | Walking freely, facing the shelf with a tape selected; the M5 side panel does not cover the room. |
| `m2-04-walk-midroom.png` | Walking freely mid-room, nothing selected; the standby panel and room remain in separate regions. |
| `m2-05-walk-desk-anchored.png` | Historical filename retained for test continuity. Current image shows walking at the desk with the M5 side panel, not the old anchored overlay. |
| `m4-01-paper-open.png` | The readable view of the studio letter, opened by a real mouse click on the wall paper's chip. A dimmed backdrop holds the room behind it, the cloned sheet keeps the paper styling and the PLACEHOLDER markers, the "skip the room" paragraph is excluded, and the live region states how to get back. |
| `m4-02-wall-notes.png` | Shelf station with a game selected, after Milestone 4. The studio letter is legible as a pale sheet pinned to the west wall at the left edge of frame; both paper chips are clamped to the edges with their "edge of view" suffix, and the panel is docked inside the stage because the monitor is out of frame. |
| `m4-03-phone-room.png` | The room as a 390×844 touch device meets it (E4/E5): running by default, no "Walk freely" control, both station buttons, the hint rewritten to describe the controls that exist, and the docked panel scrollable inside the stage. |
| `m5-01-computer-catalogue.png` | Full HTML-overlay homepage at the desk with restored selection. The room viewport and computer are separate regions; game status, unavailable actions, support form, object chips and conventional content are visible. |
| `m5-02-phone-panel.png` | Full 390 px touch-device page after cassette selection. The computer is a bounded drawer below the interactive viewport, not an overlay; station controls and text alternatives remain present. |
| `m5-03-catalogue.png` | Conventional catalogue rendered from the shared game record. |
| `m5-04-store.png` | Store offering, GBP contribution rules, explicit simulated terms and successful add-to-cart feedback. |
| `m5-05-cart.png` | Persisted cart after updating to £12.50, with server-checked total and no support quantity. |
| `m5-06-checkout.png` | Server-reviewed simulated checkout with name/email only and no card fields. |
| `m5-07-order-confirmation.png` | High-entropy reference, correct simulated total and explicit statement that no payment occurred. |
| `raw-index-nojs.html` | Homepage exactly as served after M5, with shared game content generated into the HTML. R8 separately executes a JavaScript-disabled browser check. |

The sequence m1-01 → m1-08 is the lighting iteration, and is the honest record of it: two of these
frames are wrong, and they were corrected by measurement rather than by guessing.
