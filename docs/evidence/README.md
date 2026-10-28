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

## M6 — local MySQL integration and quality assurance, 28 October 2026

All `m6-*.png` captures are **full-page screenshots**, including the DOM controls; none is a
canvas-only capture. They supplement, rather than replace, the earlier milestone evidence.
Screenshots cannot prove database persistence, rollback or safe error handling: use the labelled
logs and direct database JSON for those claims.

Provenance:

- `m6-01`, `m6-02`, `m6-08` and the `m6-gate-*`, `m6-papers-*`, `m6-movement-*` images come from
  instrumented Vite on `127.0.0.1:5190`. They show room/DOM behavior, not sales API persistence.
- `m6-03`…`m6-07`, `m6-09` and `m6-10` come from the last production commerce run on
  `127.0.0.1:5196`, using actual MySQL 8.0.46 with the restricted application account. The explicit
  memory comparison ran first; the MySQL run wrote these shared screenshot filenames last.
- All browser tests use headless Chromium; phone/tablet sizes and touch are emulated. These are
  not physical-device, screen-reader or real-GPU frame-rate evidence.
- All customers/orders are synthetic and all contributions are simulated. No card details,
  passwords or administrator environment files are included here.

### Full-page captures

| File | What it shows |
| --- | --- |
| `m6-01-computer-catalogue.png` | Direct game-selection URL restores the room computer's catalogue state, with the viewport and HTML panel in separate regions. |
| `m6-02-phone-panel.png` | 390 px touch-device emulation, selected cassette and bounded scrollable drawer beneath the room viewport; conventional content remains below. |
| `m6-03-catalogue.png` | One shared placeholder game in the conventional catalogue; no invented extra products. |
| `m6-04-store.png` | Voluntary support terms, explicit simulated checkout and successful add-to-cart feedback. |
| `m6-05-cart.png` | £12.50 contribution after editing, with server-checked total and no quantity control. |
| `m6-06-checkout.png` | Server-reviewed £12.50 order and name/email fields only, before submission. |
| `m6-07-order-confirmation.png` | Real MySQL-backed £12.50 simulated order confirmation, high-entropy reference and no-payment statement. |
| `m6-08-phone-landscape.png` | 844×390 room layout after short-landscape spacing correction; R10 separately measures control bounds and panel separation. |
| `m6-09-phone-order.png` | 390 px £8 confirmation after the keyboard validation/correction journey; long reference wraps without horizontal overflow. |
| `m6-10-checkout-retry.png` | Error state after the real API committed an order but a test route substituted a 503 delivery-error response. Inputs/cart remain, submit is enabled; C19 verifies the same-key retry. Not an actual database-outage screenshot. |
| `m6-gate-phone-room.png` | Capable emulated phone enters the room, retains station controls and hides keyboard-only walking. |
| `m6-gate-desk-integrated.png` | Desk selection with all DOM chips and the separate computer panel. |
| `m6-gate-shelf-integrated.png` | Shelf station with chips contained in the room viewport. |
| `m6-papers-paper-open.png` | Readable studio-letter dialog with room backdrop and clearly marked placeholder content. |
| `m6-papers-wall-notes.png` | Selected cassette and physically pinned papers in the grey-box room. |
| `m6-movement-walk-desk-anchored.png` | Walk view at the desk. Filename retains the old test name; the panel is now a separate grid region, not an anchored overlay. |
| `m6-movement-walk-shelf-selected.png` | Cassette selected while walking near the shelf; selection does not teleport the walker. |
| `m6-movement-walk-midroom.png` | Mid-room walking view. This and the desk image remain visual notes, not additional automated assertions. |

### Logs and measured data

| File | Evidence and limitation |
| --- | --- |
| `m6-mysql-tests.txt` | Real MySQL repository tests: validation, UUID/fingerprint behavior, identical/conflicting/concurrent retries, actual line-failure rollback, CHECK/FK enforcement and historical snapshots. Includes verified old-process exit/port closure/new PID and persisted-order retrieval. Constraint tests use the isolated administrator connection. |
| `m6-memory-tests.txt` | Explicit memory-adapter comparison. The three MySQL-only checks are skipped and do not count as database evidence. |
| `m6-mysql-commerce.txt` | Driver-labelled restricted-account production journey and API checks, four keyboard viewport journeys, malformed responses, retry recovery and duplicate-alias rejection. |
| `m6-memory-commerce.txt` | Same browser checks with explicit memory storage; does not demonstrate restart persistence. |
| `m6-routes-tests.txt` | Direct selection/history, tablet and phone layout, trusted emulated touch with measured yaw/pitch, landscape bounds, no-WebGL/no-JS/reduced-data fallbacks, seven-route metadata and local-link/fragment audit. Synthetic panel fixtures are explicitly test-only. |
| `m6-gate-tests.txt` | Room entry, Enter/Space, chip containment and panel separation. |
| `m6-papers-tests.txt` | Native dialog close/Escape focus restoration, paused/resumed movement, direct canvas raycast selection and no uncaught render errors. |
| `m6-movement-tests.txt` | Collision, preserved selection, station shortcuts and measured reduced-motion behavior; 15 assertions and two visual notes. |
| `m6-database-verification.json` | Actual server version, direct SQL order/line projection, duplicate-key group count and restricted grants; actual database shutdown, safe API errors, failed startup with no DB and successful recovery of the same order. The reference is from a separate test run and need not match the final confirmation screenshot. No credentials/customer fields are retained. |
| `m6-build.txt` | Seven final HTML pages and actual emitted asset sizes; the >500 kB lazy-room warning is retained. Gzip sizes are build estimates, not network measurements. |
| `m6-performance.json` | Nine fresh-context local production measurements, browser/Node/environment/method and SHA-256 hashes of the measured build. Transfer bytes, document LCP, layout shifts and long tasks are not hardware fps or deployment results; document LCP does not measure 3D readiness. |
| `m6-dependency-audit.json` | `npm audit --omit=dev --json` output at execution time; zero known production-dependency vulnerabilities is not a full security review. |

Exact counts, defects, re-run commands and remaining gaps are in [the test plan](../../tests/test-plan.md).
The database is a portable local instance in a temporary directory, not a backed-up service.
Fresh-schema integration is verified; populated-schema migration, backup restoration, public
hosting/DNS/HTTPS, other browsers, physical devices and assistive technology remain unverified.
