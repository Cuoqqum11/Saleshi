# Test plan and results

Living record of what was actually exercised, per milestone. Scope of each milestone is stated
with it. M5 adds the store, back end and a simulated order workflow; real payment processing remains
out of scope unless separately approved.

Environment for every row: Chromium (headless where noted) against `npm run dev` on
`http://localhost:5173`, Windows 10, `prefers-reduced-motion: reduce` active at the operating
system level unless a row says otherwise. Results marked *measured* were read out of the running
page, not inferred. From Milestone 2 onward the instrument is Playwright with **real trusted key
and pointer events**, which also closed gaps B1 and B3 from Milestone 1.

## Milestone 1 — grey-box room, selection, keyboard path, fallback

Scope: the grey-box room, camera interaction, one selectable cassette, the computer panel,
keyboard accessibility and the WebGL fallback.

### Passed

| # | Test | How it was exercised | Result |
| --- | --- | --- | --- |
| T01 | Room starts and mounts a canvas | `?view=room`, then DOM inspection | Pass — 1 canvas, stage 750×487 desktop / 343×416 at 390 px |
| T02 | Camera travels between stations | clicked `#station-list` buttons, read `getStats()` | Pass — `station` changes, pose matches `stations.js` |
| T03 | Selecting a cassette drives the computer | trusted pointer click on the cassette chip | Pass — `?view=room&game=placeholder-slug`, `aria-current="true"`, status announces the selection, panel travels to the desk and renders title + status + summary with **1 of 5 actions live** and a stated reason for each of the other four |
| T04 | Keyboard can reach every interactive object | real `Tab` presses from the skip link | Pass — 4 presses land exactly on the cassette chip, matching the predicted DOM order (skip → brand → nav → object chips → station controls → leave → text content) |
| T05 | Selection survives a reload | reloaded `?game=placeholder-slug` | Pass — selection restored and announced |
| T06 | WebGL unavailable → text experience | `initScript` overriding `HTMLCanvasElement.prototype.getContext` to return `null` for webgl | Pass — 0 canvases, `html[data-room="off"]`, stage and controls hidden, explanatory status, launcher withdrawn (see D3) |
| T07 | Narrow viewport starts as text, room still reachable | same-origin 390×844 iframe, `/` then `/?view=room` | Pass — text view first with a working "Enter the 3D room" button; forced room lays out correctly with all three chips inside the stage and no horizontal overflow (`scrollWidth` 375 ≤ 390) |
| T08 | Content exists without JavaScript | `curl` of the served HTML, no script execution | Pass — letter text, game title, three empty shelf positions, link to `/games/placeholder-slug/` and a `<noscript>` explanation all present |
| T09 | Room libraries are not loaded until needed | `npm run build`, then inspect chunks | Pass — entry chunk 4.64 kB (2.05 kB gzip) contains no Three.js and no Vue; the lazy room chunk is 601 kB (165 kB gzip) |
| T10 | Game page is script-free | built output inspection | Pass — only `base.css` referenced |
| T11 | Reduced motion honoured | `getStats().reducedMotion`, observed travel and hover state changes | Pass — camera travel is an instant cut, cassette hover/selection state still changes |
| T12 | Render cost is small enough to reason about | `renderer.info` + proxy timing over 60 samples | Measured — 17 draw calls, 166 triangles, 17 geometries, 1 texture, 1 program, `pixelRatio` 1; focus-proxy update average 0.09 ms, worst 0.5 ms per frame |
| T13 | No control pretends to work | inspected every rendered action | Pass — unavailable actions are rendered as text with a reason, never as a button or link |
| T14 | Every object chip stays inside the stage and none overlaps | 1185 px and 343 px stages, both stations, hit-tested with `elementFromPoint` | Pass — `allInside: true`, `overlap: 0` in all four combinations; each chip's own centre point hit-tests to itself |

### Defects found while testing, and fixed

| # | Defect | Symptom | Fix |
| --- | --- | --- | --- |
| D1 | Out-of-view chips stacked on one point | at the shelf station the computer and letter chips shared a position, so only the topmost was hit-testable; the click tool refused with "Element is covered by another element" | `focusProxy.js` now collects clamped chips, sorts them by projected height and lays them out as a non-overlapping column |
| D2 | Chips could hang outside the stage | a clamped chip's centre was clamped instead of its box, so half of it fell off the edge; also the "edge of view" suffix widens a chip *after* it is placed | containment now accounts for the chip's own width plus a reserved suffix width (`CLAMPED_SUFFIX_WIDTH`) |
| D3 | Launcher offered an impossible action | with WebGL blocked the page still showed an enabled "Enter the 3D room" button | `main.js` withdraws the launcher in that case and states why |
| D4 | Text shelf list out of sync with the 3D shelf | `shelf.capacity` is 4 but the HTML listed only positions 2 and 3 | `index.html` now lists all three empty positions |
| D5 | Shelf wall unreadable | the shelf is on the far side of the room from the desk lamp; the cassettes were near-black in the captured frame | added a short-range `shelfWash` light that cannot reach the desk; `docs/evidence/m1-07-shelf-station.png` is the result |
| D6 | A clamped chip could still hang off a wide stage | marking a chip clamped appends CSS `::after` text, which measured **76 px** wider, so the containment check used the pre-growth width. First fix reserved 34 px, which was still short | the reserve is now 84 px and is applied only on the frame a chip changes state, so a chip that has already grown is not pushed needlessly far from the edge. Re-tested at 1185 px and 343 px (T14) |

D1, D2 and D6 were only visible because the test tab is backgrounded: with `requestAnimationFrame`
throttled, a chip's rendered position lags the position written to it, which exposed both the
stacking and the width-growth assumptions. They are real defects, but they would have presented as
a one-frame flicker in a normal tab rather than a persistent overlap.

## Milestone 2 — constrained free movement

Scope: walk mode with collision against walls and furniture, station shortcuts retained,
selection and proxies untouched, reduced-motion alternative. Instrument: `tests/e2e/movement.mjs`
(Playwright, trusted keys, poses read from the dev hook). Re-run with `node tests/e2e/movement.mjs`.

| # | Test | Result |
| --- | --- | --- |
| W1 | The walk toggle enters walk mode at standing eye height | Pass — `mode=walk y=1.50 station=null` |
| W1b | The toggle reports its state | Pass — `aria-pressed=true`, label "Stop walking" |
| W2 | Walking forward stops at the desk instead of passing through it | Pass — stopped at z=−1.84 against the desk face limit −1.85 |
| W3 | Strafing west is stopped by the chair instead of passing through it | Pass — stopped at x=1.035 against the chair face 1.025 |
| W3b | Backing off the chair then strafing west reaches the west wall | Pass — x=−3.25 exactly at the wall limit |
| W4 | Walking the clear corridor stops at the north wall | Pass — z=−2.75 exactly at the wall limit |
| W5 | Turning 180° and walking reaches the south wall | Pass — z=2.75 |
| W6 | Walking east stops at the east wall | Pass — x=3.25 |
| W7 | Selecting a cassette while walking keeps the walker in place | Pass — drift 0.000, selection recorded, mode stays `walk` |
| W8 | A station button leaves walk mode and travels | Pass — `mode=station station=desk` |
| W9 | Stopping walk returns to the nearest station | Pass — nearest station chosen |
| W11 | Reduced motion: walking moves but stops on release with no coasting | Pass — moved 0.85 m, coasted 0.000 m |
| W12 | Reduced motion: station travel is an instant cut | Pass — pose equals the shelf station in the same tick as the click |
| W2c, W10 | Walk-mode views at the desk and mid-room | Noted, not asserted — `m2-05`, `m2-04`; judged by eye |

Two of the first run's failures were **wrong test premises, not code defects**: the original W3
assumed a clear westward slide at desk-front depth and W4 assumed the walker stood in the corridor,
but the chair (x 0.325–0.775) blocks that line. The measured stop at x=1.03 matched the chair's
collision face exactly, so the checks were rewritten to assert the chair collision and then the
corridor. Collision stopping distance carries up to one frame of step granularity (≈2.5 cm at
60 fps); no penetration was observed in any run.

Defect found by eye in the M2 evidence and fixed before sign-off:

| # | Defect | Symptom | Fix |
| --- | --- | --- | --- |
| D7 | Monitor panel clipped by the stage edge | at the shelf in walk mode the content-sized panel hung off the bottom of the stage, cutting the fourth action | `createScreenAnchor` clamps the panel centre inside the stage and the stylesheet caps its height with an internal scroll; docking is now reserved for behind-camera, too-small or too-wide cases |

## Milestone 3 — the room as the default entry experience

Scope: layout and entry framing only. No geometry, selection, URL-state, proxy, reduced-motion or
fallback changes. Instrument: `tests/e2e/gate.mjs` (E1–E2 new, G1–G3 re-run). Re-run with
`node tests/e2e/gate.mjs`.

| # | Test | Result |
| --- | --- | --- |
| E1 | A plain load (no query string, no click) starts the room and gives it the first viewport | Pass — running on load; stage top 62 (header height), control bar bottom 800 = viewport height, studio letter top 800 = exactly below the fold; orientation line announced |
| E2 | `?view=list` keeps the room off and the text view first | Pass — room not running, launcher visible and enabled, letter top 510 (above the fold) |
| E3 | A narrow screen (390 px) that explicitly enters the room lays out without overflow | Pass — `scrollWidth` 390, stage 446 px tall, control bar bottom exactly at the viewport bottom |
| G1a | Tab reaches the cassette button with real key events | Pass |
| G1b | Enter selects the focused cassette | Pass — `selected=placeholder-slug`, URL `?view=room&game=placeholder-slug` |
| G1c | Computer panel visible with live and unavailable actions | Pass at M3 with three chips (Tape 1 / Computer / Letter); re-run at M4 with four (the two pinned papers) — see the Milestone 4 table |
| G2 | Space selects the focused cassette | Pass — same selection and URL state |
| G3 | Shelf station renders with every chip inside the stage | Pass at M3 with three chips; re-run at M4 with all four inside |

M1 gaps closed by the Playwright instrument: **B1** (real Enter/Space activation — G1b/G2) and
**B3** (full-page screenshots showing the DOM overlay — `m2-01`…`m2-05`).

## Milestone 4 — pinned papers, the readable view and capability-based entry

Scope: two papers physically pinned to the walls, a larger readable HTML view for each, and an
entry rule that asks what the device can do instead of how wide its window is. Geometry stayed
grey-box; no textures, lighting or modelling work. Instruments: `tests/e2e/papers.mjs` (new),
`tests/e2e/gate.mjs` (E4–E5 new, E1–E3 and G1–G3 re-run), `tests/e2e/movement.mjs` (re-run).
Re-run with `node tests/e2e/papers.mjs && node tests/e2e/gate.mjs && node tests/e2e/movement.mjs`.

| # | Test | Result |
| --- | --- | --- |
| P1 | Both pinned papers appear as focus-proxy chips alongside the cassette and the computer | Pass — chips `Tape 1`, `Computer`, `Letter`, `Note` |
| P2 | A real mouse click on the letter chip opens a readable HTML view | Pass — dialog open, title "A note from the studio", body carries the PLACEHOLDER markers, the "skip the room" paragraph excluded from the clone |
| P3 | The close button returns focus to the chip and leaves the room untouched | Pass — focus back on the letter chip, station `shelf`, pose drift 0.0000 |
| P4 | Tab + Enter opens the instruction note and Escape closes it | Pass — reached by Tab from the letter chip, body "You are standing inside the studio…", closed by Escape |
| P5 | A note opened mid-walk freezes movement and the selection survives | Pass — drift while open < 0.01 m, 0.578 m after closing, mode still `walk`, `selected=placeholder-slug` |
| P6 | The scene still renders with the papers added | Pass — 4 chips, 14 draw calls |
| P7 | No uncaught error escapes the render loop | Pass — collected with `page.on('pageerror')` for the whole run |
| E4 | A capable phone (390×844, `hasTouch`, `isMobile`) enters the room by default and hides the keyboard-only walk control | Pass — room running, `coarse=true`, no `#walk-toggle`, 2 station buttons, hint text without "Walk freely" |
| E5 | A touch tap on a cassette chip selects the game | Pass — `selected=placeholder-slug` |
| E1–E3 | M3 entry checks re-run | Pass — E3 stage height is now 425 px (was 446) because the controls gained the movement-hint line; still no overflow (`scrollWidth` 390, control bar bottom exactly at the viewport) |
| G1a–G3 | M1 keyboard gate re-run | Pass — 10/10 with the two new chips included, all four chips inside the stage |
| W1–W12 | M2 movement and reduced-motion suite re-run | Pass — 15 passed, 0 failed, 2 screenshot notes |

Defects found while building M4 and fixed before sign-off:

| # | Defect | Symptom | Fix |
| --- | --- | --- | --- |
| D8 | The close button in the paper view did nothing | the modal stayed open after the click, so Tab was trapped inside it and P3/P4 failed; it only looked functional because Escape still worked | the button is now a real `<form method="dialog">` submit, which is the native close path |
| D9 | A broken render loop was invisible to the tests | `scene is not defined` threw every frame after the scene refactor; `isRunning()` still reported true, so the first symptom was an unexplained click timeout on a chip that existed | `createScene`'s `scene` is destructured again, and P2's entry wait now also requires `stats().drawCalls > 0` — a started loop is not proof of a rendering one |
| D10 | Closing a note left focus on a hidden control | Chromium keeps focus on the close button of a closed `<dialog>`, so the keyboard user's next Tab started from inside an invisible subtree | `createPaperView` records the triggering element and returns focus to it on `close` |

Two test premises were wrong before they were right, and are recorded because the code was not the
problem: P5 first measured drift while the camera was still coasting from the previous key release
(so "frozen" could never be true), and it walked from the desk station, whose forward line is 0.7 m
of floor ending in the desk collider (so "resumed" could never exceed the threshold). The check now
settles between presses and walks the ~2 m of clear floor north of the shelf station.

One issue was measured and deliberately **not** fixed, because the fix belongs to the panel work
that comes next:

| # | Issue | Measurement | Status |
| --- | --- | --- | --- |
| D11 | At the desk station the anchored panel covers the computer chip, so that one control cannot be reached with the mouse while standing at the desk | chip centre (640, 366) hit-tests to a `p` inside `#monitor-screen` with `docked=false`; `Tab` still reaches the chip and Enter still activates it, and any camera move uncovers it | Open — M5 reworks what the panel shows, so the collision between panel and chip is fixed there rather than with a second offset rule now |

## Milestone 5 — discovery, catalogue, cart and simulated sales workflow

Scope: separate game/offering records, richer computer states, static catalogue/details/store HTML,
persistent cart, Express API, MySQL schema/repository, simulated orders, direct routes, responsive
fallbacks and integrated evidence. Instruments: `tests/commerce.test.mjs`,
`tests/e2e/commerce.mjs`, `tests/e2e/routes.mjs`, plus all earlier suites. The development server
and production build were both exercised with **explicit `DB_DRIVER=memory`**. No MySQL result is
claimed.

| # | Test | Result |
| --- | --- | --- |
| Server unit tests | Quote recomputation, invalid/unknown/duplicate lines, amount bounds and decimal precision, fixed-price authority, customer validation, random references, one order + line | Pass — 6/6 |
| C1–C2 | Shared catalogue and reusable details route | Pass — one real placeholder record, no invented games |
| C3–C6 | Store add, cart navigation/reload recovery, amount update, remove and empty state | Pass — no quantity control for voluntary support |
| C7–C8 | Customer validation and tampered amount/forged total rejection | Pass — client error shown; server returned 400 |
| C9–C11 | Simulated order, safe confirmation, reload retrieval, customer-field omission and cart clearing | Pass — correct £12.50 total and one line |
| C12 | Store without JavaScript | Pass — terms and price readable, nonfunctional form hidden |
| C13 | Uncaught browser errors through the commerce flow | Pass — none |
| Production commerce | C1–C13 against `npm start` serving `dist/` and the API | Pass — 13/13 with the memory adapter |
| R1 | Direct `?game=` URL restores selection and computer state | Pass — primary link text/background also measured as different colours |
| R2 | Synthetic test-only panel fixture | Pass — cover, two screenshots, demo/download/itch links render; fixture never enters site data |
| R3 | Browser back/forward across catalogue and details | Pass |
| R4 | Intermediate 768 px and 900 px room layouts | Pass — no overflow; panel separate from viewport |
| R5 | 390 px touch layout with selected panel | Pass — drawer separate, 26.5% of stage height, no overflow |
| R6 | No WebGL | Pass — useful catalogue remains and impossible launcher is disabled |
| R7 | Reduced-data preference | Pass — text first with an optional working launcher |
| R8 | Homepage without JavaScript | Pass — shared game content and store navigation remain; dead launcher/status hidden |
| D11 regression | Panel/chip separation at desk, shelf and walking positions | Pass — G4, W2b and W7b; resolved by grid regions rather than offsets |
| Earlier suites | Room entry/keyboard, papers including direct mesh raycast, movement/collision/reduced motion | Pass — gate 11/11, papers 8/8, movement 15 passed / 0 failed / 2 visual notes |
| Build | All seven HTML routes and lazy room chunk | Pass — entry 5.16 kB (2.26 kB gzip); room 623.51 kB (167.95 kB gzip), size warning retained |

Defects found and fixed during M5:

| # | Defect | Fix |
| --- | --- | --- |
| D11 | Anchored computer panel could cover its chip | Replaced anchoring with separate viewport/panel grid regions and a bounded mobile drawer; tested at desk, shelf and arbitrary walking positions |
| D12 | Store offering form did not render | The static marker had extra attributes and did not match the exact transform marker; wrapped an exact marker inside the offering container, then C3–C12 passed |
| D13 | No-JS launcher still looked functional | Added a no-script rule with sufficient specificity to hide launcher and checking status; R8 passes |
| D14 | Primary computer link text matched its background | Corrected the ID-selector override and added a computed-colour assertion to R1 |

## Still not verified — open limitations

| # | Gap | Current status |
| --- | --- | --- |
| B2 | Frame rate in a visible tab on real hardware | Open — headless SwiftShader gives no honest hardware fps figure. |
| B4 | Drag-to-look with touch | Open — E5 taps a chip, but no physical or emulated touch drag has turned the camera. |
| B5 | Cross-browser behaviour | Open — Chromium only; Firefox and Safari have not run. |
| B6 | Intermediate layouts and phone panel | Closed in Chromium — R4 covers 768/900 px; R5 and `m5-02-phone-panel.png` cover the bounded 390 px drawer. Physical handsets and landscape remain open. |
| B7 | Reduced-data entry | Closed by R7 using an explicit `saveData` browser fixture. |
| B8 | Screen-reader session | Open — semantic markup, labels and live regions are asserted, but no assistive-technology session has run. |
| B9 | Direct 3D paper selection | Closed by P8 — a projected point on the actual sheet hit `CANVAS` and opened the instruction dialog through raycasting. |
| B10 | Phone panel occlusion | Closed structurally by R5 — the drawer is below the viewport, not over it, and occupied 26.5% of the stage in the measured run. |
| B11 | MySQL integration | Open — schema, shared-record seed and parameterised transactional repository exist, but `mysql` was not installed and no server was configured. All executed API/order tests explicitly used memory storage. |
| B12 | Deployed operation | Open — production build/API passed locally; DNS, HTTPS, public hosting, backups and live MySQL remain unverified. |

## Re-running these tests

```
DB_DRIVER=memory npm run dev # explicit test adapter; otherwise configure MySQL
npm run test:commerce        # six server-side unit tests
node tests/e2e/gate.mjs      # entry + keyboard + panel/chip separation
node tests/e2e/papers.mjs    # chip, keyboard and direct raycast paper paths
node tests/e2e/movement.mjs  # movement, collision, reduced motion and layout
node tests/e2e/commerce.mjs  # catalogue → store → cart → checkout → confirmation
node tests/e2e/routes.mjs    # direct URLs, history, responsive and fallback paths
npm run build
DB_DRIVER=memory npm start   # optionally repeat commerce against production
```

Useful handles while developing: `?view=list` forces the text view, `?view=room` forces the room,
`?game=<slug>` preselects a cassette, and in dev mode `window.__saleshiRoom` exposes
`isRunning()`, `stats()`, `render()`, `snapshot()`, `start()`, `stop()`,
`projectInteractable()` and the test-only `previewPanelGame()` fixture boundary.
