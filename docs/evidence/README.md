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
- The suites write fixed filenames, so a later milestone's run overwrites these images. After the M6b
  re-verification the current captures were copied to `m6b-05`…`m6b-10` and the `m6-*` files were
  restored from Git, so this section still shows the placeholder-content site that M6 tested. M7
  changed this structurally: the suites now stamp their captures with `EVIDENCE_PREFIX` (default `m6`),
  so the M7 run wrote `m7-*` and these files were left as M6 reported them. Re-running a suite
  without that variable still overwrites them.

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
The database was then a portable local instance in a temporary directory, not a backed-up service;
it was moved to `D:\saleshi-mysql` and a restore drill run afterwards, recorded in
`m6b-database-relocation.txt` below.
Fresh-schema integration is verified; populated-schema migration, scheduled/off-machine backups,
public hosting/DNS/HTTPS, other browsers, physical devices and assistive technology remain
unverified.

## M6b — real game builds, catalogue projection and production-bundle re-verification, 28 October 2026

The studio's Godot 4.7 exports replaced the placeholder game: a 38.8 MB browser demo that plays
inside the site and a 35.1 MB Windows archive behind a download link. Every number quoted in these
images comes from `src/js/data/builds.js`, which `npm run game:stage` generates by measuring the
export folder; `npm run game:check` re-hashes it.

Provenance:

- The four `m6b-01`…`m6b-04` captures were written by the **last** `tests/e2e/game-builds.mjs` run, which
  was against the **deployable** `dist/` build served with real MySQL at `http://127.0.0.1:5310`.
  They therefore show exactly what a visitor receives, with no test hooks in the bundle.
- `m6b-game-builds-tests.txt` (20/20), `m6b-routes-tests.txt` (29/29) and `m6b-room-tests.txt`
  (gate/papers/movement) come from the **QA bundle** (`dist-qa/`, one chunk, room test hooks compiled
  in) at `http://127.0.0.1:5314`, because those suites read renderer internals. The room and route
  captures that run wrote under `m6-*` filenames were promoted to `m6b-05`…`m6b-07` and the `m6-*`
  files restored from Git, so the M6 section above still shows the placeholder site it tested.
- `m6b-05`…`m6b-10` are the same checks as their `m6-*` counterparts, re-captured against the real game:
  the computer's catalogue state, the 390 px panel and the 844×390 landscape stage from the routes run
  above, then the store page, the desktop order confirmation and the phone order from the commerce run
  at `http://127.0.0.1:5310`. They exist because the suites reuse filenames.
- The cover and three in-game frames the site publishes (`public/game/screenshots/`) were captured
  from the browser build at 1280×800 while the demo was being integrated, by a throwaway Playwright
  driver that is not in the repository. They are real frames of the real build — the evidence for that
  is `B3` in the game-builds logs, which loads each one and asserts it decodes at 1280 px — but they
  are not reproducible from a clone the way the binaries are, and the studio has not supplied its own
  artwork. They are the one part of `public/` that belongs in Git, because the site cannot render
  without them.
- `m6b-game-builds-deployable-tests.txt` (19 passed, 0 failed, **1 skipped**),
  `m6b-commerce-tests.txt`, `m6b-mysql-tests.txt`, `m6b-builds-tests.txt`,
  `m6b-database-seed-tests.txt` and `m6b-build.txt` come from the deployable `dist/` build at
  `http://127.0.0.1:5310` plus MySQL 8.0.46 on `127.0.0.1:3307` with the restricted runtime account.
  The skip is the one hook-only room check, reported as a skip rather than a pass because
  `npm run build` compiles those hooks away.
- `m6b-memory-commerce-tests.txt` comes from the same deployable build served at
  `http://127.0.0.1:5313` with `DB_DRIVER=memory` selected explicitly; `/api/health` on that origin
  reports `databaseDriver: memory`. It is an adapter comparison, not database evidence.
- `m6b-database-relocation.txt` is not a screenshot of the site. It records why the portable MySQL
  instance was moved out of `%TEMP%` (Windows cleaned it mid-run and took `mysqld` with it), the
  `mysqldump --single-transaction` → scratch-schema → compare → drop drill, and the two suites
  re-run against the relocated server. The digests prove the restored rows match the live rows on
  this machine only; it is one manual dump on one workstation, not a backup strategy.
- Headless Chromium with SwiftShader; phone/tablet sizes and touch are emulated. All customers and
  orders are synthetic and all contributions are simulated. No credentials or environment files are
  included here.

### Full-page captures

| File | What it shows |
| --- | --- |
| `m6b-01-game-details.png` | The real game page: description, feature list, cover and three screenshots, then play/download actions with the measured sizes, the archive's file-by-file contents and font licence entries, and the itch.io route rendered as an unavailable statement rather than a dead link. |
| `m6b-02-play-demo.png` | The play page **after** the visitor clicked load: the pre-load cost statement is still visible above, the status line reports the frame has loaded and how to give it keyboard focus, the Stop control is present, and the Godot canvas is rendering its opening text inside the site frame. |
| `m6b-03-catalogue.png` | Conventional catalogue with the one real game, its playable/demo badges and both acquisition routes; the empty-shelf statement stays, because no additional titles were invented. |
| `m6b-04-room-computer.png` | The room's computer panel for the same game — cover, media count, three live actions and the unavailable itch.io note — with the no-JavaScript fallback card below the room. This is the frame that exposed defects D24 and D25. |
| `m6b-05-computer-catalogue.png` | R1 on the QA bundle: a direct game-selection URL restores the computer's catalogue state, viewport and readable HTML panel in separate regions, with the real record selected. |
| `m6b-06-phone-panel.png` | R5 at 390 px: room viewport, then the selected-game panel below it rather than over it, then the conventional card — no overlay and no horizontal overflow. |
| `m6b-07-phone-landscape.png` | R10 at 844×390 landscape: room viewport and selected-game panel side by side above the controls, the conventional content below, and the address-restored status line visible. |
| `m6b-08-store.png` | The store page naming the real game as the offering's associated title, with the pay-what-you-want range, the no-exclusive-content statement and the simulated-order notice intact. |
| `m6b-09-order-confirmation.png` | A simulated order written to MySQL on the real catalogue: high-entropy reference, £12.50 voluntary support line, and the statement that no payment was taken and no delivery promised. |
| `m6b-10-phone-order.png` | The same confirmation at 390 px, inside the viewport with no horizontal overflow. |

### Logs and measured data

| File | Evidence and limitation |
| --- | --- |
| `m6b-builds-tests.txt` | 6 unit checks: staged web files hash-match the record, the served archive unpacks to the recorded members unchanged, the font licence files are present, and the page quotes the measured record rather than retyped numbers. |
| `m6b-database-seed-tests.txt` | 4 checks against real MySQL: exact catalogue projection, stale-game pruning with an idempotent re-run, FK-safe retirement of an offering that history still references, and untouched order history. Uses the ignored administrator file; the runtime account is denied these statements by design. |
| `m6b-mysql-tests.txt` | The M6 repository/integration suite re-run against the real catalogue: 14/14 including constraint enforcement, rollback, concurrent retries and a verified process restart (`SAL-51EFBD3F…`, terminated PID 28900, retrieved via PID 26396). |
| `m6b-game-builds-tests.txt` | 20 browser checks on the QA origin: sizes and hashes as published, `HEAD` 200 and range 206 on the archive, **0** export requests before the click, the engine and data files fetched after it, a rendered 1150×718 canvas, stop and reload, the room panel's real actions, and no uncaught browser errors. |
| `m6b-game-builds-deployable-tests.txt` | The same suite on the deployable bundle: 19 passed, 0 failed, 1 skipped. The skip is the hook-only room check and is reported as a skip rather than a pass. |
| `m6b-routes-tests.txt` | 29 route, metadata, local-link, fallback, emulated-touch and landscape checks, including the R2 panel contract rewritten for the real media count and the R7 reduced-data path that never loads the room module. |
| `m6b-room-tests.txt` | Entry/keyboard gate (11), papers and focus restoration (8) and movement/collision/reduced motion (15) re-run against a production-shaped bundle instead of a dev server. |
| `m6b-commerce-tests.txt` | 30 production browser commerce checks on `dist` + MySQL with the restricted account, unchanged from M6 apart from running against the new build. |
| `m6b-memory-commerce-tests.txt` | The same 30 checks on `dist` with the explicitly selected memory adapter (`/api/health` reports `databaseDriver: memory`). A storage-adapter comparison, not database evidence. |
| `m6b-build.txt` | Build output with emitted sizes, the retained >500 kB room-chunk warning, and `dist/` totals: 78,324,197 bytes overall, 40,742,601 in `game/web`, 36,761,734 in `downloads`. |

The game binaries behind these frames are **not** in Git (`public/game/web/`, `public/downloads/`),
so `m6b-02-play-demo.png` cannot be reproduced from a bare clone until `npm run game:stage` has run
against the studio's export folder. The demo reached its first rendered frame inside the site; nobody
has played it through, the web export reports itself as a debug build, and the Windows `.exe` has
never been launched from this site. Those limits, and the intermittent Windows loopback denials that
shaped how these suites are run, are recorded in `../../tests/test-plan.md`.

## M7 — visual art direction, 3D environment and asset refinement, 31 October 2026

The grey-box room became a deliberately designed one: real wall/floor/wood/plaster surfaces instead
of flat colours, a reworked light rig (5 lights → 7) with static shadows and ACES exposure, a shelf
carcass holding physical game cases in place of floating boxes, a rebuilt chair, desk props and
cables, and papers that read as pinned documents. No route, collision boundary, camera contract or
DOM interface was redesigned, and the readable interface content stayed in HTML.
[docs/art-direction.md](../art-direction.md) holds the decisions, the measured table and the
departures; this section indexes the images that back it.

Provenance:

- `m7-before-*` and `m7-after-*` are written by `tests/e2e/visual.mjs`, run twice against the **QA
  bundle** (`dist-qa/`) at `http://127.0.0.1:5314` with `PREFIX=m7-before` and `PREFIX=m7-after`.
  Same browser (headless Chromium + SwiftShader), same 1280×800 viewport, same database, same ten
  fixed viewpoints: the station viewpoints drive the real control bar, and the close-ups park the eye
  with `__saleshiRoom.aim()` so a frame is repeatable rather than walked to.
- `before` is the room as M6b left it (commit `3e4c20d`); `after` is the final M7 build. The two
  `*-room-stats.json` files record draw calls, triangles, meshes, textures, programs, lights, shadow
  state, tone mapping and the exact pose per viewpoint, plus boot time and a two-second frame count —
  the pairs are comparable because the recorded poses match to the decimal place.
- These are **canvas-only** captures taken from the WebGL buffer, except the two `-page` variants,
  which are full-page screenshots of the shelf and desk states including the DOM controls and panel.
  SwiftShader is a software rasteriser: every number here is a relative comparison in one
  environment, **not** a GPU frame rate, and no real-device or other-browser measurement was taken.
- `m7-01`…`m7-10`, `m7-gate-*`, `m7-papers-*` and `m7-movement-*` are the Stage G regression run
  re-captured on the final build with `EVIDENCE_PREFIX=m7`. They are the same assertions the M6 and
  M6b tables describe, photographed after the visual work — they exist so the M6 milestone evidence
  stayed exactly as that milestone reported it instead of being overwritten.
- The case artwork uses the screenshot the studio supplied with the build. Nothing in these frames is
  invented imagery: no fabricated gameplay screenshots, no additional game names on the shelf. The
  shelf holds the one real title; the empty slots are deliberately empty.

### Room viewpoints, before and after

| Files | What to compare |
| --- | --- |
| `m7-before-01-entry.png` / `m7-after-01-entry.png` | The pose the room opens on with no input. Before: unshaded grey boxes. After: plaster and floor texture, warm key light and the shelf readable on the left. **This is the same pose as `02-shelf`** — the room opens facing the shelf, so the entry viewpoint *is* the shelf station; both are recorded because the suite does. |
| `m7-before-02-shelf.png` / `m7-after-02-shelf.png` | Cassette shelf station. Before: boxes standing on a plank. After: shelf carcass with back board, and cases with front cover, spine, 26 mm thickness and a cut-out window. |
| `m7-before-03-desk.png` / `m7-after-03-desk.png` | Desk station with *The Last Witness* selected. The monitor bezel, keyboard, props and screen lighting changed; the readable interface itself is DOM, not texture. |
| `m7-before-02-shelf-page.png` / `m7-after-02-shelf-page.png` | Full-page versions of the shelf state — room viewport, control chips and the panel outside it, so chip containment and layout can be checked in the same frame as the art. |
| `m7-before-03-desk-page.png` / `m7-after-03-desk-page.png` | Full-page versions of the desk state, including the D11 re-check: the computer stays clickable at the desk with the panel open. |
| `m7-before-04-door.png` / `m7-after-04-door.png` | From the door, the whole composition at once — the widest view and the most expensive one (96 draw calls, 12,752 triangles after). |
| `m7-before-05-walk-central.png` / `m7-after-05-walk-central.png` | Standing at eye height in the middle of the floor, facing the shelf — the view most visitors walk through. |
| `m7-before-06-case-close-up.png` / `m7-after-06-case-close-up.png` | The real game case at arm's length: cover artwork, legible title, spine, seam and packaging material, judged as packaging rather than as a coloured block. |
| `m7-before-07-monitor-close-up.png` / `m7-after-07-monitor-close-up.png` | The monitor from the chair position — screen as a lit object, with the DOM panel still rendered separately above it. |
| `m7-before-08-letter-close-up.png` / `m7-after-08-letter-close-up.png` | The studio letter pinned to the west wall. It reads as a document; the type is intentionally **not** legible at this size, because the readable version is the HTML dialog, not a baked texture. |
| `m7-before-09-desk-corner.png` / `m7-after-09-desk-corner.png` | Low raking angle across the desk, specifically to judge contact points — where objects meet the surface and where shadows land. |
| `m7-before-10-shelf-wall-joint.png` / `m7-after-10-shelf-wall-joint.png` | Raking view of the shelf carcass, back board and wall junction — the frame that shows whether the furniture is attached to the room or floating in it. |
| `m7-after-11-production-bundle-smoke.png` | The same desk view rendered by the shipped `dist/` build served at `http://127.0.0.1:5315 --production`. That bundle has no test hooks (`grep -c __saleshiRoom dist/assets/*.js` = 0), so this is a screenshot, not an assertion: it proves what a visitor actually receives renders. |

### Regression re-captures on the final build

| Files | Suite and what it re-proves |
| --- | --- |
| `m7-gate-desk-integrated.png`, `m7-gate-phone-room.png`, `m7-gate-shelf-integrated.png` | `gate.mjs` 12/12 — entry, keyboard activation, chip containment, the new shared-token check between the 3D screen and the panel CSS, and the D11 re-test. |
| `m7-papers-paper-open.png`, `m7-papers-wall-notes.png` | `papers.mjs` 8/8 — the letter and instruction note open as readable HTML, focus returns to the chip, and a direct raycast click on the 3D sheet works (P8, which regressed and was fixed during M7). |
| `m7-movement-walk-desk-anchored.png`, `m7-movement-walk-midroom.png`, `m7-movement-walk-shelf-selected.png` | `movement.mjs` 15 passed, 0 failed, 2 noted — every collision boundary is the M6 one; the two "noted" frames are human-review captures, not assertions. |
| `m7-01-computer-catalogue.png`, `m7-02-phone-panel.png`, `m7-08-phone-landscape.png` | `routes.mjs` (29/0) — URL-restored computer state, the 390 px panel as its own region, and the 844×390 landscape stage on the new geometry. |
| `m7-03-catalogue.png`, `m7-04-store.png`, `m7-05-cart.png`, `m7-06-checkout.png`, `m7-07-order-confirmation.png`, `m7-09-phone-order.png`, `m7-10-checkout-retry.png` | `commerce.mjs` (30/0) against real MySQL — the sales journey is unchanged by the visual work, and no commercial feature was added during M7. |
| `m7-01-game-details.png`, `m7-02-play-demo.png`, `m7-03-catalogue.png`, `m7-04-room-computer.png` | `game-builds.mjs` (20/0) — the real build's page, the running demo, and the room computer with its live actions. `m7-03-catalogue.png` is written by both suites under the same name and shows the same page. |

### Logs and measured data

| File | Evidence and limitation |
| --- | --- |
| `m7-before-room-stats.json` | Per-viewpoint renderer internals and exact camera poses for the pre-M7 room, plus environment boot time (1,793 ms) and a two-second frame count (25). Boot time is one sample, so it is not comparable as a trend. |
| `m7-after-room-stats.json` | The same block on the final build, plus `walkMetresInTwoSeconds` (3.35), `reportedFpsDuringWalk` (18) and `walkModeConfirmed`. The walk figure is identical at 18 and 19 fps because movement now runs on a fixed 1/60 s step — the measurement that exposed the earlier bug, not a performance claim. |
| `m7-regression.txt` | The Stage G matrix in one file: the QA origin and UTC timestamp, the Node suites run on the same build and database (`test:commerce` 13/1 skip, `test:database` 4/4 on real MySQL, `test:builds` 6/6, `game:check` OK, `npm run build` OK with hooks absent from `dist/`), then every browser assertion with its measured values — gate 12/12, papers 8/8, movement 15/0 + 2 noted, routes 29/0, game-builds 20/0, commerce 30/0. |

## Milestone 8 — game content, studio identity and metadata, 4 November 2026

M8 changed what the site *says* rather than what it looks like, so most of its evidence is textual: the
matrix logs, the measured accessibility record and the six-sample performance comparison. The images
below were all produced on the final M8 build — the one that includes D27, the boot-frame camera fix —
with `EVIDENCE_PREFIX=m8`, so no earlier milestone's file was overwritten. Two origins are cited and
they are not interchangeable: `http://127.0.0.1:5314` served `dist-qa` (room test hooks compiled in) and
`http://127.0.0.1:5310` served the deployable `dist/` (hooks absent); both used real MySQL 8.0.46 on
`127.0.0.1:3307`. `http://127.0.0.1:5313` served the deployable bundle with `DB_DRIVER=memory` and is
**never** MySQL evidence.

### Full-page captures

| File | Suite and origin | What it shows |
| --- | --- | --- |
| `m8-01-computer-catalogue.png` | `routes.mjs`, QA origin | The monitor panel listing the catalogue from the record, with the provisional-cover label rendered as DOM text (R1c). |
| `m8-02-phone-panel.png` | `routes.mjs`, QA origin | The 390 px panel as its own bounded region, not an overlay on the room (R5). |
| `m8-08-phone-landscape.png` | `routes.mjs`, QA origin | 844×390 landscape: room, panel and controls all inside the first viewport with zero overflow (R10). |
| `m8-01-game-details.png` | `game-builds.mjs`, deployable origin | The game page in the section order M8 §8 specifies — Overview through "Not supplied yet" — with the measured size figures. |
| `m8-02-play-demo.png` | `game-builds.mjs`, deployable origin | The real Godot 4.7 WebAssembly build running inside the site frame, canvas 1150×718 (B7). |
| `m8-03-catalogue.png` | `game-builds.mjs`, deployable origin | The catalogue with one filled card and the shelf's unfilled positions presented as empty, not as products (R14a, C1). |
| `m8-04-room-computer.png` | `game-builds.mjs`, deployable origin | The room's computer panel offering the real demo and download actions with the same title, status and sizes as the page (R17). |
| `m8-04-store.png`, `m8-05-cart.png`, `m8-06-checkout.png`, `m8-07-order-confirmation.png`, `m8-09-phone-order.png`, `m8-10-checkout-retry.png` | `commerce.mjs`, deployable origin + MySQL | The sales journey on the shipped bundle: offerings, cart, simulated checkout, confirmation and the retry path with focus moved to the error. No card details, no payment, no invented price. |
| `m8-gate-desk-integrated.png`, `m8-gate-shelf-integrated.png`, `m8-gate-phone-room.png` | `gate.mjs`, QA origin | Keyboard activation and the focus chips over the M8 shelf. G3 and P1 both list the chips as `The Last Witness, Computer, Letter, Note` — the title chip that replaced the "Tape 1" label (D31) — and G1c shows the panel's four live actions. |
| `m8-papers-wall-notes.png`, `m8-papers-paper-open.png` | `papers.mjs`, QA origin | The studio letter and instruction note pinned in the room, and the readable HTML view opened from a direct raycast click. |
| `m8-movement-walk-midroom.png`, `m8-movement-walk-desk-anchored.png`, `m8-movement-walk-shelf-selected.png` | `movement.mjs`, QA origin | Walking against the same collision boundaries as M6/M7; 15 passed, 0 failed, 2 noted — the notes are human-review frames, not assertions. |

### Room viewpoints on the final build

`m8-visual-01-entry.png` … `m8-visual-10-shelf-wall-joint.png`, captured by `tests/e2e/visual.mjs` on
the QA origin at 1280×800 after the D27 fix, with `m8-visual-02-shelf-page.png` and
`m8-visual-03-desk-page.png` showing the DOM panel beside the same two poses. `m8-visual-01-entry.png`
is the pose the room opens on with no input at all — the frame D27 was about. The M7 before/after set is
untouched in this directory and remains the comparison for anything visual; M8 added no geometry, so
the per-viewpoint deltas are in `m8-performance.txt` rather than in new photographs.

### Logs and measured data

| File | Evidence and limitation |
| --- | --- |
| `m8-baseline.txt` | The WP0 record, taken **before any file was changed**: the commit under test, the build output and bundle totals, the first-run test numbers, the entire photographic inventory of the site, and the nineteen places where the documentation contradicted the code. Items 1–19 are the audit M8 was written against; several became the defects in the test plan's M8 table. |
| `m8-build.txt` | `npm run build`, `npm run build:qa`, `game:check`, `assets:check` and `npm audit --omit=dev` in one UTC-stamped file: 8 HTML routes, room chunk 668.81 kB (182.02 kB gzip), 9 web files and 5 archive entries matching the committed record, 3 PNGs 121.6 → 81.7 KiB, 0 production vulnerabilities. The >500 kB chunk warning is retained in the log, not silenced. |
| `m8-metadata-tests.txt` | `npm run test:metadata` 12/12 — every derived title, description, Open Graph tag and JSON-LD block against the records, including the properties deliberately withheld. |
| `m8-assets-tests.txt` | `npm run test:assets` 8/8 — the palette pass and the published-size claims. |
| `m8-builds-tests.txt` | `npm run test:builds` 6/6 — staged binaries, archive contents, hashes, licence files. |
| `m8-mysql-tests.txt` | `tests/commerce.test.mjs` under the administrator credential file with `TEST_MYSQL_CONSTRAINTS=1`: 14/14 on real MySQL, including the constraint cases the restricted runtime account cannot create. |
| `m8-database-seed-tests.txt` | `npm run test:database` 4/4 — S1 projection equality, S2 pruning a superseded row, S3 retiring an offering that left the records, S4 order history untouched by seeding. |
| `m8-memory-tests.txt` | `DB_DRIVER=memory npm run test:commerce` — 11 passed, 3 skipped. The skips are the MySQL-only cases; this file exists to show the adapter boundary, not to claim persistence. |
| `m8-room-tests.txt` | gate 12/12, papers 8/8, movement 15/0 with 2 visual notes, on the QA origin with MySQL. |
| `m8-routes-tests.txt` | The routes suite **47/47** on the QA origin, with every line retained. This file is how D27 was found: the failing check id and its `{"pose":"2.6535 m"}` detail survived because the whole log was captured instead of a tail. The 47th line is R25, added when `docs/branding.md` §5 turned out to cite a guardrail no check enforced; the suite was re-run against the same `dist-qa` build, so its screenshots and every other M8 log describe one build. |
| `m8-game-builds-tests.txt` | 21/21 on the QA origin — includes the two room-hook checks that the deployable bundle cannot make. |
| `m8-game-builds-deployable-tests.txt` | 20 passed, 1 skipped on the shipped `dist/` + MySQL. The skip is the hook-only check, reported as a skip rather than as a pass. |
| `m8-commerce-tests.txt` | 30/30 on the shipped `dist/` + real MySQL — the sales journey on the deployable bundle. |
| `m8-memory-commerce-tests.txt` | 30/30 with `DB_DRIVER=memory`. Adapter comparison only; see `m8-memory-origin.log` immediately below, which is the proof of what that origin actually ran. |
| `m8-memory-origin.log` | The two lines the 5313 server printed at boot: `Database driver: memory; checkout: simulated`. Kept so no reader can mistake the memory-driver run for MySQL evidence. |
| `m8-accessibility.txt` | R20/R21/R22's measured before-and-after: the `#b5583c` text that failed SC 1.4.3 at 3.97:1 and the `#a04a30` variant that passes at 5.00:1; the target sizes before and after the padding fixes (nav 21→32 px, panel link 15→26 px) with the arithmetic; and what was recorded rather than changed, including the canvas-drawn room text that no DOM measurement can reach. |
| `m8-performance.txt` | The §17 comparison, six boot samples **per milestone** rather than one each, with the M7 build re-created from commit `d9b62e0` in a temporary worktree so both origins were idle-machine samples of the same measurement. It retracts the single-sample "40% slower boot" reading, shows the fast floors are 214 ms vs 216 ms, and states the byte cost of putting the words in the HTML. |

These images cannot prove anything about performance on a real GPU, on another browser, on a physical
phone, or with a screen reader; those remain unverified and are listed as limitations in
`../art-direction.md` §11 and §14 and in [the test plan](../../tests/test-plan.md). Accepted visual compromises
are recorded there too — the shelf interior is dim, the ceiling strip is still the brightest pixel in
the wide shots, and the dark ceiling is deliberate but unlit by any measured source — and §14 states
what M8's re-examination changed for each of the four and what it left standing.
