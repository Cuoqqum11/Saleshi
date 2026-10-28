# Test plan and results

Living record of what was actually exercised, per milestone. Scope and environment are stated
with each milestone. M5 adds the store, back end and a simulated order workflow; M6 verifies real
MySQL persistence and expands quality assurance. Real payments remain out of scope unless
separately approved. Earlier results are historical, not claims about the current test count.

The early room tests used Chromium (headless where noted) against `npm run dev` on
`http://localhost:5173`, Windows, with `prefers-reduced-motion: reduce` active at the operating
system level unless a row says otherwise. M5 explicitly used the memory adapter; M6 environments
are listed below. Results marked *measured* came from the running page, not inference. From
Milestone 2 onward Playwright supplied **real trusted key and pointer events**, closing B1/B3.

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

## Milestone 6 — persistence, integration, quality assurance and assignment readiness

Executed **28 October 2026** after preserving M5 in commit `adae819`. Existing suites were extended,
not replaced. No M6 commit, payment integration, invented product content or paid infrastructure
was required for these results.

### Environment and retained results

Windows x64, Node **v24.19.0**, Playwright Chromium **156.0.8078.4**, headless with SwiftShader for
room tests. The database was actual **MySQL Community Server 8.0.46**, loopback port `3307`, fresh
InnoDB schema and shared-record seed. Docker could not run because WSL was absent, so the official
portable MySQL distribution was used without changing Windows features. This was not a database
substitution. Runtime credentials are restricted; administrator credentials were used only for
setup and explicit database tests. Both local environment files are ignored and excluded from evidence.

- Production MySQL application: `http://127.0.0.1:5196`, serving `dist/` and the API.
- Explicit memory comparison application: `http://127.0.0.1:5198`.
- Instrumented room: standalone Vite at `http://127.0.0.1:5190`; this instance has no sales API.
- Route metadata/link audit: production `5196`; room hooks and synthetic panel fixture: development `5190`.
- All browser customers/orders are synthetic. All orders are simulated; no payment was taken.

Logs and JSON below are in `../docs/evidence/`.

| Instrument | Result | Retained evidence |
| --- | --- | --- |
| MySQL repository/integration, administrator-enabled constraint checks | **14 passed, 0 failed** | `m6-mysql-tests.txt` |
| Explicit memory repository | **11 passed, 0 failed, 3 MySQL-only skips** | `m6-memory-tests.txt` |
| Production commerce, restricted MySQL application account | **30 passed, 0 failed** | `m6-mysql-commerce.txt` |
| Production commerce, explicit memory adapter | **30 passed, 0 failed** | `m6-memory-commerce.txt` |
| Routes, responsive layout, trusted emulated touch, metadata and local links | **27 passed, 0 failed** | `m6-routes-tests.txt` |
| Room entry, keyboard activation and panel/chip separation | **11 passed, 0 failed** | `m6-gate-tests.txt` |
| Papers, keyboard/dialog focus, movement freeze and direct raycast | **8 passed, 0 failed** | `m6-papers-tests.txt` |
| Movement, collision, station controls and reduced motion | **15 passed, 0 failed, 2 visual notes** | `m6-movement-tests.txt`; notes are not automated passes |
| Production build | **Passed**, seven HTML routes; large lazy chunk warning remains | `m6-build.txt` |
| `npm audit --omit=dev --json` | **0 known production-dependency vulnerabilities** at execution time | `m6-dependency-audit.json`; not a complete security assessment |

### Persistence, authority and failure handling

| Check | Exercised result and boundary |
| --- | --- |
| Valid order and direct SQL inspection | One £12.50 simulated order and one `studio-support` line at £12.50 exist in real MySQL; `m6-database-verification.json` records the selected columns without customer details. Screenshots alone are not database evidence. |
| Application restart | Test spawns a production application, creates an order, terminates that exact child, awaits process exit, asserts the old port no longer answers, then starts a different PID and retrieves an identical public order. The reference and PIDs are in `m6-mysql-tests.txt`. |
| Invalid and manipulated input | Empty/duplicate carts, unknown/unavailable offerings, out-of-range values, fractional precision and injection-like amount strings rejected. Fixed prices come from a server fixture; forged currency/totals for a valid support amount are ignored and GBP 5 is recomputed. The fixture is not an invented shop product. |
| Customer validation | Trimmed name and normalised email validated server-side. Browser errors identify and focus the invalid field; client checks are not the authority. |
| Idempotency | Same UUID and validated details return the original order; conflicting details return 409; missing/malformed UUID rejected. Twelve concurrent retries of an existing interaction complete without duplicate references or pool exhaustion. |
| Lost-response retry | C19 commits the first request through the real API, then a browser route fixture replaces its response with 503. Cart/input state survives, submit is restored, error summary receives focus, and retry uses the same key/reference. This is response-loss simulation, not a physical network outage. |
| Malformed success responses | C25/C26 replace a committed HTTP 201 response with truncated JSON or an object without an order reference. Both retain the cart, focus the error and retry the same key to retrieve the original order. |
| Canonical offering identifiers | The pre-fix MySQL query accepted `studio-support` plus `STUDIO-SUPPORT` as two identical resolved lines (£10). Deduplication now uses the server-resolved identifier; actual MySQL repository checks and C27 reject the pair. The memory run rejects its unknown uppercase alias; a canonicalising repository fixture separately covers the same-code path. |
| Transaction rollback | A second line deliberately references a missing offering. MySQL raises its FK error; neither the order nor its first line remains. |
| Constraints and history | Negative order/pricing/line updates fail enforced CHECKs. Deleting a referenced offering fails its FK. Temporarily changing its title/availability does not alter historical line snapshots. Administrative mutations are inside a transaction that is always rolled back. |
| Real database outage and recovery | MySQL was actually shut down: health and order calls returned generic 500 JSON with no SQL/connection details and `no-store`. Starting a new application against the stopped database exited 1 without announcing readiness. After database restart, health is 200/MySQL and the previously inspected order/line remains retrievable. See `m6-database-verification.json`. |
| Runtime privileges | App account has SELECT on offerings and SELECT/INSERT on orders/lines, not DDL, UPDATE or DELETE. Grant evidence is retained without credentials. Full constraint tests require the separate administrator connection. |
| Safe errors and confirmation | Malformed JSON returns 400, JSON above 20 KB returns 413, unknown/malformed references return 404, and unexpected failures return generic 500. Public confirmation omits customer fields and internal keys/hashes. API responses use `Cache-Control: no-store`. |

The fresh schema is verified, not an upgrade from populated M5 tables. Database CHECKs do not
independently enforce aggregate order totals; server computation does. Startup ping verifies
connectivity, not migration completeness. Idempotency covers retries within a checkout interaction;
reloading creates a new key and can create another order after a lost committed response, while
offering changes may cause revalidation to reject a retry. These limits are documented in
`../docs/commerce.md` rather than hidden behind a production-ready claim.

### Browser journeys, accessibility and fallbacks

| Checks | Measured result |
| --- | --- |
| C24, C1–C10, C15 | Actual room cassette → computer details link → game page → store → cart → checkout → confirmation; cart reload/update/remove, server total, confirmation reload and successful cart clearing all pass. |
| C18 at 390, 768, 900 and 1280 px | Real Tab/type/Enter cart-to-order journeys; invalid email focus/error association, correction and confirmation pass without horizontal overflow. Viewport sizes are emulation, not physical-device evidence. |
| C16, C23 | No-JS store retains terms/pricing and hides dead add controls; checkout form is hidden without a successful quote; order heading remains even without JavaScript or a reference. |
| C20 | Injected quote failure hides checkout controls and presents a working Return to cart link. No false success is displayed. |
| R1–R8 | Direct selection URLs, normal history, panel fixture, tablet/phone grid separation, no-WebGL and reduced-data fallbacks and useful no-JS homepage pass. Unavailable game actions remain explanatory text. |
| R9a–R9c | CDP touch events reach the canvas as trusted `pointerType=touch`; actual yaw changes +0.252 radians and pitch −0.1512, with no selection, travel, paper opening, URL change or page scroll. Physical touch remains untested. |
| R10 | At 844×390, room viewport is 476×192.5625; panel stays separate, no horizontal/panel overflow, controls end at 390.4375 px (within the explicit 1 px rounding tolerance). |
| R11–R12 | Seven real routes have page-specific title/description, `lang=en`, UTF-8, viewport metadata and one H1. All 47 local-link occurrences and 16 fragment targets resolve; synthetic fixture links are excluded. This is not search-engine indexing or ranking evidence. |
| Gate, papers, movement | Enter/Space activation, focus proxies, paper close/Escape focus restoration, direct mesh picking, collision, stations and reduced-motion cuts/no-coasting remain verified. |
| C17 and P7 | No uncaught page errors in the complete commerce or paper/render-loop runs. Expected error-response fixtures are distinguished from uncaught JavaScript errors. |

An additional Qoder in-app browser smoke check followed store → cart → checkout, submitted an
empty form and confirmed invalid-name focus, then completed a £5 MySQL-backed simulated order.
The cart cleared and the browser recorded no console errors/warnings. This manual check is not
included in the automated counts and is not physical-device or cross-browser coverage.

### Final-build local performance measurements

`m6-performance.json` identifies the final built HTML/CSS/JS by SHA-256. Three cold browser contexts
per route at 1280×800 were observed from navigation until 1,200 ms after network idle; no network or
CPU throttling. These are local headless observations, not real-device, field or deployment scores.

| Route | Transferred bytes including response headers | Requests | Document LCP range | Cumulative layout shift | Longest observed task |
| --- | --- | --- | --- | --- | --- |
| `/?view=list` | 26,349 | 5 | 100–112 ms | 0 | 53 ms |
| `/` room-first | 653,288 | 7 | 88–104 ms | 0.0301513–0.1511128 | 186 ms |
| `/store/` | 16,516 | 7 | 64–68 ms | 0 | No task above the 50 ms observer threshold |

Only room-first navigation fetched `startRoom-CG7IOWHB.js`: **623.51 kB**, build-estimated gzip
**167.95 kB**. The entry is 5.16 kB (2.26 kB estimated gzip). Local script encoded/decoded sizes
match: the server did **not** deliver these scripts gzip-compressed. Build gzip estimates are not
actual transfer sizes. The room's longer tasks and extra transfer remain a cost; the text/store
routes demonstrably avoid that chunk. Document LCP does not measure when the 3D canvas is usable.
No real-GPU fps, Lighthouse result, public-network speed or search ranking is claimed.

### Defects and test-environment problems found during M6

| # | Finding | Resolution and verification |
| --- | --- | --- |
| D15 | Duplicate-key recovery could request a second connection while all pool connections were still held by retries | Release the transaction connection before duplicate lookup; 12 simultaneous retries now pass. |
| D16 | Original/retried timestamps could differ because MySQL stores whole seconds | Round creation time to the column precision; identical-order deep comparisons pass. |
| D17 | Express 5 listen callback could log readiness even when binding failed | Handle the callback error before readiness output; use the actual bound port for restart tests. |
| D18 | 844×390 landscape controls extended to 420.31 px | Reduce short-landscape control spacing; measured bottom is now 390.4375 px. No width-only entry gate was introduced. |
| D19 | Order empty/error rendering removed its only H1 | Keep a static heading outside the replaced content; seven-route metadata and no-JS checks pass. |
| D20 | No-JS or failed-quote checkout exposed an unusable submit form | Hide it initially and reveal only after a successful quote; no-JS and quote-failure checks pass. |
| D21 | Unreadable success JSON became an empty object and checkout cleared the cart before finding its missing reference | Propagate unreadable-response errors and validate the reference before clearing; C25/C26 verify cart retention and same-key recovery of the committed order. |
| D22 | Submitted-ID deduplication did not account for case-insensitive MySQL aliases | Reproduced two resolved `studio-support` lines; deduplicate the server-resolved ID and verify rejection in repository tests and C27. |
| Environment | Old M5 server and conflicting Vite HMR port produced misleading failures | Use labelled, clean production ports for commerce and a separate Vite port for instrumentation. Do not count stale-server results as current regressions. |
| Test method | Stopping a shell task did not prove its application child had stopped | Automated PID/exit/old-port/new-process checks replace an unverified manual restart claim. |

**M6 local result:** no outstanding failures in the executed suites. Memory-only skips and visual
notes are not passes. Remaining checks and assessment dependencies are listed below; neither the
successful build nor the local MySQL tests establish production readiness.

## Still not verified — open limitations

| # | Gap | Current status |
| --- | --- | --- |
| B2 | Frame rate in a visible tab on real hardware | Open — headless SwiftShader gives no honest hardware fps figure. |
| B4 | Drag-to-look with touch | Closed for trusted emulated touch by R9a–R9c; physical handset input remains open. |
| B5 | Cross-browser behaviour | Open — Chromium only; Firefox and Safari have not run. |
| B6 | Intermediate layouts and phone panel | Closed in Chromium emulation — 390/768/900/1280 px journeys and 844×390 landscape pass. Physical handsets remain open. |
| B7 | Reduced-data entry | Closed by R7 using an explicit `saveData` browser fixture. |
| B8 | Screen-reader session | Open — semantic markup, labels, focus and live regions are asserted, but no assistive-technology session has run. |
| B9 | Direct 3D paper selection | Closed by P8 — a projected point on the actual sheet hit `CANVAS` and opened the instruction dialog through raycasting. |
| B10 | Phone panel occlusion | Closed structurally by R5 — the drawer is below the viewport, not over it, and occupies 26.5% of the measured stage. |
| B11 | MySQL integration | Closed locally in M6 with actual 8.0.46, direct rows, rollback, enforced constraints, restricted runtime account, restart and outage/recovery. Not a hosted-database claim. |
| B12 | Deployed operation | Open — DNS, HTTPS, public hosting, compression/cache policy, backups/restore and operational security have not been configured or verified. |
| B13 | Durable data location and schema upgrades | Open — portable data lives in a temporary directory; no backup-restore drill or populated-M5 upgrade migration was run. Do not reinitialise or drop existing data. |
| B14 | Assessment acceptance and content | Tutor approval of category, voluntary support as a sale, simulated checkout and local demonstration remains open. Part 2, real game content and the student's final report are still required. |

## Re-running these tests

Configure MySQL using `../docs/commerce.md` first. Use separate terminals for long-running servers
and tests. Run constraint tests only against an isolated test database: they need administrator
rights, temporarily change catalogue rows inside a rolled-back transaction, and create synthetic
orders. The process-restart test needs the production build.

```bash
npm run build
DB_DRIVER=memory npm run test:commerce
TEST_MYSQL_CONSTRAINTS=1 node --env-file=.env.mysql-admin.local --test tests/commerce.test.mjs
npm start  # configured restricted MySQL app; this workstation uses PORT=5196
```

In another terminal, while that application runs:

```bash
BASE_URL=http://127.0.0.1:5196 node tests/e2e/commerce.mjs
```

Run an explicit memory comparison on a different port, if needed:

```bash
DB_DRIVER=memory PORT=5198 npm start
# In another terminal:
BASE_URL=http://127.0.0.1:5198 node tests/e2e/commerce.mjs
```

Room instrumentation is development-only, so start a separate front-end-only server:

```bash
npm run dev:vite -- --host 127.0.0.1 --port 5190 --strictPort
# In another terminal:
BASE_URL=http://127.0.0.1:5190 node tests/e2e/gate.mjs
BASE_URL=http://127.0.0.1:5190 node tests/e2e/papers.mjs
BASE_URL=http://127.0.0.1:5190 node tests/e2e/movement.mjs
BASE_URL=http://127.0.0.1:5190 ROUTES_BASE_URL=http://127.0.0.1:5196 node tests/e2e/routes.mjs
npm audit --omit=dev --json
```

Always specify `BASE_URL`; some suites retain historical default ports. A bare repository-test
command loads `.env`, so explicitly set `DB_DRIVER=memory` when that is the intended adapter.
Screenshots use fixed M6 filenames: repeat MySQL commerce last to retain MySQL provenance, and
retain driver-labelled logs. Earlier milestone images are not overwritten.

Useful handles while developing: `?view=list` forces the text view, `?view=room` requests the room,
`?game=<slug>` preselects a cassette, and in dev mode `window.__saleshiRoom` exposes
`isRunning()`, `stats()`, `render()`, `snapshot()`, `start()`, `stop()`,
`projectInteractable()` and the test-only `previewPanelGame()` fixture boundary.
