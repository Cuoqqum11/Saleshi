# Test plan and results

Living record of what was actually exercised, per milestone. Scope and environment are stated
with each milestone. M5 adds the store, back end and a simulated order workflow; M6 verifies real
MySQL persistence and expands quality assurance; M6b replaces the placeholder game with the studio's
real Godot builds — a browser-playable demo and a Windows archive — and verifies that the MySQL
catalogue is a projection of the shared records. Real payments remain out of scope unless
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

## Milestone 6b — real game builds, catalogue projection into MySQL, full-matrix re-verification

Executed **28 October 2026** on top of M6 (`3e4c20d`). Scope: integrate the two build folders the
studio supplied — a Godot 4.7 web export and a Godot 4.7 Windows desktop export — replace the
placeholder game record with the real one, prove the MySQL catalogue is a projection of the shared
records, and re-run every existing suite against **production bundles** rather than only a
development server. No payment integration, no paid infrastructure and no invented content.

### What was integrated, and how each published claim is checked

| Item | Measured fact | How the site keeps it honest |
| --- | --- | --- |
| Browser demo | Godot 4.7, `gl_compatibility`, `thread_support=false`, 38.8 MB across 9 files, entry `The Last Witness.html` plus a byte-identical `index.html` copy so the folder has a directory index | `npm run game:stage` copies the export **unmodified** into `public/game/web/` and writes `src/js/data/builds.js`; `npm run game:check` and `tests/game-builds.test.mjs` re-hash every file |
| Desktop build | 64-bit Windows executable 98.3 MB + 2.4 MB `.pck`, packaged as a 35.1 MB deflate archive of 5 entries | Same generated record; the test unpacks the served archive and compares each member's SHA-256 with the studio's export folder |
| Font licences | Two licence files must travel with any build that bundles the fonts | Both are written into `LICENSE/` inside the archive and asserted by a test, so the archive fails if they are dropped |
| Game content | Real title, description, feature list, cover and three screenshots from the project; `itch.io` still has no address | The unavailable route is rendered as explanatory text with its reason, never as a dead link (B11/B12) |
| Honest limits | The demo is a **debug export**, has never had a first-time-player test, needs WebGL 2 + a secure context, and its UI is a dense 1280×800 text terminal | Stated on the play page before the 38.8 MB download is offered, and in `docs/open-requirements.md` |

The ~75 MB of binaries are deliberately **not** in Git: `public/game/web/` and
`public/downloads/` are ignored, while the committed `builds.js` carries the sizes and SHA-256
digests the site publishes. A published number is therefore machine-checkable without a
repository that cannot shrink.

### Environments

Windows x64, Node **v24.19.0**, Playwright **1.64.1** Chromium (headless, `--enable-unsafe-swiftshader`
for room capture), MySQL **8.0.46** on `127.0.0.1:3307` — the same portable instance and restricted
runtime account as M6.

| Origin | What it served | Used for |
| --- | --- | --- |
| `http://127.0.0.1:5310` | deployable `dist/` + MySQL (restricted account) | commerce e2e, hook-free build verification |
| `http://127.0.0.1:5313` | deployable `dist/` + explicit `DB_DRIVER=memory` | adapter comparison, never reported as MySQL evidence |
| `http://127.0.0.1:5314` | **QA build** `dist-qa/` + MySQL | room/DOM suites that need `window.__saleshiRoom` |
| `http://127.0.0.1:5174` | `npm run dev` (Vite) | development iteration only |

`npm run build:qa` exists because the room suites read renderer internals that the deployable build
compiles away. It is a single-chunk production build with `VITE_ROOM_HOOKS=1`; `dist-qa/` is ignored
and is **not** what gets deployed. The deployable run therefore reports the one hook-only check as
`SKIP` instead of pretending it passed.

### Results

| Instrument | Result | Retained evidence |
| --- | --- | --- |
| `tests/game-builds.test.mjs` — staged binaries, archive contents, hashes, licence files, published copy | **6 passed, 0 failed** | `m6b-builds-tests.txt` |
| `tests/database-seed.test.mjs` — S1–S4 seed projection, pruning, retirement, order history | **4 passed, 0 failed** | `m6b-database-seed-tests.txt` |
| `tests/commerce.test.mjs` — MySQL repository/integration with administrator constraint checks | **14 passed, 0 failed** | `m6b-mysql-tests.txt` (includes `SAL-51EFBD3F…`, terminated PID 28900, retrieved via PID 26396) |
| `tests/e2e/game-builds.mjs` on `dist-qa` + MySQL | **20 passed, 0 failed, 0 skipped** | `m6b-game-builds-tests.txt` |
| `tests/e2e/game-builds.mjs` on deployable `dist` + MySQL | **19 passed, 0 failed, 1 skipped** | `m6b-game-builds-deployable-tests.txt` — the skip is the hook-only room check |
| `tests/e2e/routes.mjs` on `dist-qa` + MySQL | **29 passed, 0 failed** | `m6b-routes-tests.txt` |
| `tests/e2e/commerce.mjs` on deployable `dist` + MySQL | **30 passed, 0 failed** | `m6b-commerce-tests.txt` |
| `tests/e2e/commerce.mjs` on deployable `dist` + explicit `DB_DRIVER=memory` | **30 passed, 0 failed** | `m6b-memory-commerce-tests.txt` — adapter comparison only, never MySQL evidence |
| `tests/e2e/{gate,papers,movement}.mjs` on `dist-qa` + MySQL | **11 / 8 / 15 passed, 0 failed**, 2 visual notes | `m6b-room-tests.txt` |
| `npm run game:check`, `npm run build` | staged files match the record; 8 site HTML routes; room chunk 626.67 kB (169.34 kB estimated gzip); `dist/` 78,324,197 bytes | `m6b-build.txt` — the >500 kB warning is retained, not silenced |

### New checks worth naming

| # | Check | Measured result |
| --- | --- | --- |
| B4 | The download responds to `HEAD` and to a byte range | `status=200 bytes=36761734 range=206` — a 35 MB archive is resumable rather than all-or-nothing |
| B6 | Nothing is downloaded before the visitor asks | **0** requests under `/game/web/` before the click on the play page |
| B7 | The real Godot build starts inside the site frame | canvas 1150×718 with a matching rendered frame; 1.8–2.9 s to first frame on loopback |
| B9 | Stopping releases the frame and a reload is offered | status confirms the data stays in the browser cache |
| B12/B13 | The room computer panel offers the real demo and download actions and they resolve | 3 actions, download `HTTP 200` |
| B17 | The hashes the site publishes are the measured ones | compared against the studio export folder, not against themselves |
| S1 | `seed.js` projects the shared records exactly | one game, one offering, no orphan offerings |
| S2 | A superseded game row is pruned and a re-run is a no-op | planted `m6b-superseded` removed; second run reports `removed 0` |
| S3 | An offering that leaves the records is retired, not deleted | `available = 0`, its game survives because `order_lines` reference it `ON DELETE RESTRICT`, and the server-side repository reports it unavailable |
| S4 | Seeding never touches order history | order/line counts unchanged across two seeds; the earliest order still retrieves as `simulated` |

### Defects found while building M6b and fixed before sign-off

| # | Defect | Symptom | Fix |
| --- | --- | --- | --- |
| D23 | The demo's "Load" button stayed on screen while the demo was running | `.button { display: inline-block }` outranks the `hidden` attribute, so stopping appeared impossible | global `[hidden] { display: none !important; }` in `base.css`; found by reviewing the evidence screenshot, not by an assertion |
| D24 | Horizontal overflow at 768/900 px on the room page | the new `width="1280" height="800"` cover attributes gave the image a standing intrinsic size, and the room page loads `base.css` but not `pages.css`, so nothing capped it | `img, video { max-width: 100%; height: auto; }` in `base.css`; R4/R5/R10 and B16 measure `overflow=0px` at 390/768/844/900/1280 |
| D25 | The room page's fallback game card rendered its badges as one run of words | same root cause as D24: `.media-badge`, `.game-cover`, `.media-placeholder` and `.empty-state` are part of the shared card markup but lived in `pages.css` | moved those four component rules into `base.css`, where anything every page needs belongs; re-captured `m6b-04-room-computer.png` |
| D26 | The game page claimed a **21**-step guided investigation | the studio's `scripts/ev044_data.gd` holds 22 steps (`GUIDE_STEPS`: 4 + 5 + 5 + 4 + 4 across the five stages, each with exactly 3 hints), and the running build shows "STEP 1 OF 4" in stage 1 — the figure had been taken from the project's own notes rather than recounted | corrected to 22 in `src/js/data/games.js`, both bundles rebuilt and the page re-verified; found while re-checking every published number against the source, not by any assertion, because no test knew what the right number was |
| Test method | A failing `B10` reported only `Failed to load resource: net::ERR_NETWORK_ACCESS_DENIED`, which cannot be triaged | a console error names no file, so a machine fault and a missing asset look identical | the suite now records the failing request's URL alongside the message; the next occurrence identified `/assets/base-n2XXw_bE.css`, a file that loads on every other run |

### Environment problem, stated rather than hidden

This machine intermittently refuses loopback connections: Chromium reports
`net::ERR_NETWORK_ACCESS_DENIED` and Node reports `connect EACCES 127.0.0.1`, because the
operating system assigns a client port that another listener already holds. It affects any
many-request origin and is not caused by the site. Two mitigations are in the repository, both
narrow:

- `tests/e2e/netRetry.mjs` retries **only** transport signatures (`ERR_NETWORK_ACCESS_DENIED`,
  `EACCES`, `ERR_CONNECTION_REFUSED`, a navigation the browser aborts and reports as "interrupted by
  another navigation") and never a 404, a 500 or a failed assertion. Assertions still run exactly once.
- `npm run build:qa` removes the several-hundred-module dev origin from the room suites' critical
  path, which is where the denials concentrated.

One deployable-bundle run failed `B10` on the CSS file named in the defect table above; the retained
`m6b-game-builds-deployable-tests.txt` is the passing re-run, and the failing line is quoted there in
the defect table rather than kept as a second log. A green suite on this machine means "no
application fault observed", not "the network layer was perfect".

**M6b local result:** no outstanding test failures. The brief's outstanding item — MySQL persistence
verified with the real adapter rather than the in-memory one — is closed by the 14/14 repository run,
the 30/30 production-commerce run on `dist` + MySQL, the 4/4 seed-projection run and the retained
restart evidence. After D26 the bundles were rebuilt and the seed, build-record, game-builds (both
origins) and routes suites were re-run — 6, 4, 19/0/1-skip, 20 and 29 with no failures — and the
retained logs are those re-runs; the commerce and room suites were not repeated, because the changed
string appears in no assertion they make. The two database suites were run again after the database
was relocated off the temporary directory (see B13): `npm run test:commerce` 13 pass + 1 privileged
skip, that skip re-run separately under administrator credentials to make it 14/14, and
`npm run test:database` 4/4 — against the same MySQL 8.0.46 on `127.0.0.1:3307`, with nothing but its
base directory changed. What remains unverified is listed below; neither these
results nor a successful build establishes production readiness.

## Milestone 8 — game content, studio identity and metadata

M8 replaced invented-or-placeholder content with what the project actually knows: a studio identity held
in one token module with its omissions labelled, the game record split so the game page can answer
"which section is this sentence in", the three captured frames labelled as captures, machine-readable
metadata derived from those records, and a re-examination of the four visual compromises M7 accepted.
Nothing was added that the studio has not supplied, and every published number is measured from a file
or a running build rather than typed.

The milestone brief's §16 acceptance list is not reproduced here verbatim: the text of that list was
quoted in the incoming brief and is not recoverable from this repository or from any retained session
state. Rather than reconstruct it from memory — which would be inventing an acceptance criterion — the
substance of each lettered group is verified through the named checks below, and the check ids are the
citation. Where a check does not exist for something the brief asked for, that is stated in
`docs/open-requirements.md` rather than claimed.

### What was integrated, and how each published claim is checked

| Claim the site now makes | Where the fact lives | Check |
| --- | --- | --- |
| "studio name not final" is a state, not a hand-written string | `studio.nameIsFinal` + `nameMarker`, `src/js/data/studio.js:28` | **R25** (all 8 served pages carry the name with exactly one derived marker), `npm run test:metadata`, R11 titles |
| The one-line description is what the page contains, not a keyword list | `studio.summary`, `metadata.js` | `test:metadata`, R11 per-route descriptions |
| A blank is labelled, never left looking like finished prose or bracketed scaffolding | `studioLetter.paragraphs[].gap`, `content.js:37`/`:44` | R25 (both labels render; no `\bPLACEHOLDER\b` copy on any route) |
| The cover is a captured frame, not supplied artwork | `games.js:95` `cover.provisional`/`provenance`, `mediaProvenance` | R14a, R14b, R1c, `test:assets` |
| Image sizes are the file's own | `cover.width/height`, `screenshots[].width/height` | `test:metadata` reads each PNG header |
| The game page's sections appear in the brief's order | `games.js` `prose{overview, gameplay, experience}` | R16a |
| Splitting the prose moved no sentence | same | R16b (`3 sentences; absent=0; duplicated=0; status stated 1×`) |
| Title, status, summary and both size figures agree on every surface | the record, rendered by four pages and the panel | R17, R17b |
| Structured data states only what is confirmed | `metadata.js`, ADR-015 | R18, R19 (28 distinct properties, no origin) |
| Every local link and fragment resolves | the eight routes | R12-1…R12-8, R15 |
| New text is WCAG 2.2 AA legible and tappable | `base.css`, `room.css`, `tokens.css` | R20, R21, R22 |
| A cassette's shelf chip names the game, not the packaging | `startRoom.js:112` | gate G-series, R9a–R9c, R24 |
| The room's first frame is already the room | `startRoom.js` initial-state block | R24 (new, see D27) |

### Environments

Windows x64, Node **v24.19.0**, Playwright Chromium (headless, `--enable-unsafe-swiftshader`), MySQL
**8.0.46** on `127.0.0.1:3307` — the portable instance and restricted runtime account established in
M6b. UTC stamp of the retained capture: `2026-11-03T23:01:45Z` (`docs/evidence/m8-build.txt`).

| Origin | What it served | Used for |
| --- | --- | --- |
| `http://127.0.0.1:5310` | deployable `dist/` + MySQL (restricted account) | commerce e2e, game-builds e2e, hook-free verification |
| `http://127.0.0.1:5313` | deployable `dist/` + explicit `DB_DRIVER=memory` | adapter comparison only — none of its results are MySQL evidence |
| `http://127.0.0.1:5314` | **QA build** `dist-qa/` + MySQL | routes, game-builds and the room suites that read `window.__saleshiRoom` |
| `http://127.0.0.1:5173` | `npm run dev` (Vite) | development iteration only, never cited |

### Results

| Instrument | Result | Retained evidence |
| --- | --- | --- |
| `npm run build`, `npm run build:qa`, `npm run game:check`, `npm run assets:check`, `npm audit --omit=dev` | 8 site HTML routes; room chunk 668.81 kB (182.02 kB gzip); 9 web files and 5 archive entries match the record; 3 PNGs 121.6 → 81.7 KiB (−32.8%); **0 vulnerabilities** | `m8-build.txt` — the >500 kB warning is retained, not silenced |
| `tests/metadata.test.mjs` | **12 passed, 0 failed** | `m8-metadata-tests.txt` |
| `tests/asset-pipeline.test.mjs` | **8 passed, 0 failed** | `m8-assets-tests.txt` |
| `tests/game-builds.test.mjs` | **6 passed, 0 failed** | `m8-builds-tests.txt` |
| `tests/commerce.test.mjs` — MySQL repository/integration, administrator constraint run | **14 passed, 0 failed** | `m8-mysql-tests.txt` |
| `tests/database-seed.test.mjs` — S1–S4 seed projection, pruning, retirement, order history | **4 passed, 0 failed** | `m8-database-seed-tests.txt` |
| `DB_DRIVER=memory npm run test:commerce` | 11 passed, 0 failed, **3 skipped** | `m8-memory-tests.txt` — the skips are the MySQL-only cases |
| `tests/e2e/{gate,papers,movement}.mjs` on `dist-qa` + MySQL | **12 / 8 / 15 passed, 0 failed**, 2 visual notes | `m8-room-tests.txt` |
| `tests/e2e/routes.mjs` on `dist-qa` + MySQL | **47 passed, 0 failed** (29 → 47 checks, 18 additions, nothing removed) | `m8-routes-tests.txt` — re-run after R25 was added, on the same `dist-qa` build the rest of the matrix measured |
| `tests/e2e/game-builds.mjs` on `dist-qa` + MySQL | **21 passed, 0 failed, 0 skipped** | `m8-game-builds-tests.txt` |
| `tests/e2e/game-builds.mjs` on deployable `dist` + MySQL | **20 passed, 0 failed, 1 skipped** | `m8-game-builds-deployable-tests.txt` — the skip is the hook-only room check |
| `tests/e2e/commerce.mjs` on deployable `dist` + MySQL | **30 passed, 0 failed** | `m8-commerce-tests.txt` |
| `tests/e2e/commerce.mjs` on deployable `dist` + explicit `DB_DRIVER=memory` | **30 passed, 0 failed** | `m8-memory-commerce-tests.txt` — adapter comparison, never MySQL evidence |

### New checks worth naming

| # | Check | Measured result |
| --- | --- | --- |
| R1c | The computer panel labels the provisional cover with the record's own sentence | the exact `cover.provenance` string, read off the panel, not a paraphrase |
| R2b | A record with no artwork and nothing available says both instead of offering controls | `{"images":0,"links":[]}` |
| R2c | Switching selection leaves no stale text, link or artwork | cover swapped to the fixture's own file |
| R2d | An address naming an absent record leaves the screen on standby and names the parameter | `param=not-a-real-record`, standby heading present |
| R14a/R14b | The catalogue and the game page label the provisional cover and the captured frames, and present no unfilled shelf slot as a product | labels present, `no unfilled slot` |
| R15 | No page links to an origin this suite cannot verify | **0** off-origin `http(s)` links across 8 pages |
| R16a | The game page's sections appear in the §8 order | Overview > Gameplay > Experience > Features > Availability > Status > Not supplied yet > Store and creator support |
| R16b | Every prose sentence from the record appears on the page exactly once | 3 sentences, absent 0, duplicated 0, status stated 1× |
| R17 / R17b | Title, status, summary and both measured sizes agree across four pages, the download, the demo, the archive and the room panel | 4 pages plus three figures |
| R18 | Each route emits exactly the structured data and sharing tags its records support | 8 pages: JSON-LD parses and matches the modules, `og:` tags are read back out of each page's own head, no canonical link |
| R19 | The built site states no origin and no unconfirmed property | 28 distinct properties, none withheld-by-accident |
| R20 | Every published route **and the room's DOM panel** pass WCAG 2.2 AA text contrast | 9 surfaces × 2 widths, 38 text nodes each; smallest text 9.9 px; tightest sample 4.76:1 (the 11.5 px "Playable demo" badge) |
| R21 | Every non-inline interactive target is at least 24×24 CSS px | 11 sub-24 px controls, all mid-sentence and exempted by SC 2.5.8's Inline exception (6 distinct links named in the detail); nothing else under size |
| R22 | No audited surface overflows horizontally | 9 surfaces × 390/1280 px, none wider than the viewport |
| R24 | The room's first reported frame already holds the entry pose | first frame sits 2.653 m from the origin at station `shelf`; the camera moved **0.0000 m** between that frame and rest |
| R25 | The published identity is one record-driven name plus a provisional marker — never scaffolding | 8 pages carry `Saleshi` with exactly one `studio name not final` flag each, the letter's 2 labelled blanks (`biography not supplied`, `name not final`) render, and no route contains unedited placeholder copy. The expectations are read from `studio.js`/`content.js`, so setting `nameIsFinal: true` flips the check rather than leaving it asserting a stale sentence. |
| C1 (changed, not new) | Catalogue cards equal the records **and** the empty shelf positions are counted as empty | `cards === games.length && empty === shelf.capacity - games.length`; unfilled positions render as cards without a link, so they were no longer excludable by an `h3 a` selector alone |

### Performance against the M7 baseline (§17)

M7's own note said its boot figure was one sample and not a trend, so M8 measured six samples per
milestone instead of comparing two numbers. The M7 build was produced by checking `d9b62e0` out into a
temporary git worktree, copying the same untracked game assets in, building the same `dist-qa` target
and serving it with the same MySQL account on a second port — so both origins were idle-machine
samples of the same measurement, taken back to back. Full log: `docs/evidence/m8-performance.txt`.

| Measure | M7 (`d9b62e0`) | M8 (this build) | Reading |
| --- | --- | --- | --- |
| Boot to first rendered frame, 6 samples | 214, 215, 219, 224, 1201, 2317 ms | 216, 225, 228, 1013, 1016, 1199 ms | bimodal on **both** builds; the fast floors differ by 2 ms. No boot regression is demonstrated — and M7's largest slow sample (2,317 ms) exceeded M8's. The single-sample pair (1,557 vs 2,183) that first looked like a 40% regression is retracted as a comparison. |
| Frames drawn per fixed 2 s | 25, 26, 26, 27, 27, 29 | 29, 30, 30, 30, 30, 30 | M8 never drew fewer frames, with 6.9% fewer pixels to fill (912×566 vs 912×608 — the identity header takes stage height at this viewport) |
| Walk distance per 2 s | 3.35 m | 3.35 m | identical by design: the 1/60 s fixed step M7 introduced makes distance independent of frame rate |
| Draw calls / triangles, worst viewpoint | 96 / 12,752 (door) | 100 / 12,982 (door) | +4 calls, +1.8% triangles at the busiest angle; 6 of 10 viewpoints unchanged |
| Meshes, nodes, programs | 110 / 135 / 8 | 110 / 135 / 8 | M8 changed materials, textures and the printed J-card, and added no geometry |
| Room route HTML | 8,351 B | 12,319 B | +47.5% — the deliberate cost of §11.5: the words are in the document instead of only in the canvas (4.37 kB gzip as served) |
| Room chunk | 667,108 B | 668,812 B | +0.26% |
| Published PNGs | 121.6 KiB repo | 81.7 KiB bundle | −32.8%, measured by `npm run assets:check` on every build |

Headless SwiftShader, loopback, cold HTTP cache per sample, no real GPU and no second browser — these
are comparisons between two builds on one machine, not performance claims about deployed behaviour.

### Defects found while building M8 and fixed before sign-off

| # | Defect | Symptom | Fix |
| --- | --- | --- | --- |
| D27 | The room could paint its very first frame from the camera origin instead of the entry station | `controller.update()` is only reached through the fixed 1/60 s accumulator, so a first tick arriving inside one step drew without ever positioning the camera. Headless frame timing made it intermittent: seven routes runs reported 45/45, one reported **44 passed, 1 failed**, and the failing id — captured only because the matrix this time teed the full log to `docs/evidence/` instead of reading `tail` — was R9c, "touch drag does not accidentally select, travel, open a note", `pose 2.6535 m`. That figure is exactly `hypot(2.2, 1.28, 0.75)`: the drag itself was innocent, the before-state had been read from an un-positioned camera. R9b was passing for the wrong reason too — its "yaw delta" was mostly the boot move. | `controller.update(0)` once in `startRoom.js`'s initial-state block, so the camera is placed before the loop can draw; and R24 added as a permanent check that the first reported frame is the resting frame, which now passes deterministically (0.0000 m). The intermittent failure is not recorded as a flake: it had a cause, and it is closed. |
| D28 | Rust text on cream failed WCAG 2.2 SC 1.4.3 | `.paper .placeholder-flag` measured **3.97:1** at 9.93 px against the 4.5:1 floor — found by the new R20, on the very first run | a measured text variant `--rust-deep: #a04a30` (**5.00:1** on `--paper`) added to `tokens.css` for anything that carries words; `--rust` stays for markers and borders, where SC 1.4.11's 3:1 is the requirement. R20 now passes with the tightest sample anywhere at 4.76:1. |
| D29 | Bare text links were below the SC 2.5.8 target floor | header, card, paper and panel links measured 15–21 px tall at both widths | `padding-block: 0.35rem` on `.site-nav a`, `.game-card a`, `.paper a`, `.link-pair a` and the panel's non-chip link — vertical padding grows the link's own box without moving the words. Arithmetic cross-check in `docs/evidence/m8-accessibility.txt`. |
| D30 | A two-link paragraph claimed the Inline exemption it does not deserve | the first probe's heuristic ("a sibling node exists") would have waved through the homepage's *Open the full catalogue · View creator support* pair at 21 px | the exemption is now computed — ≥20 non-link characters in the nearest block plus `display: inline` — and the pair got a real fix (`.link-pair`) instead of an exemption |
| D31 | The shelf's focus chip labelled a cassette "Tape 1" | describes the packaging, not the work inside it, and was the last place the room invented a label | the chip carries the record's title (`startRoom.js:112`); the J-card on the physical case carries title + status only, per ADR-014 |
| Test method | `tests/e2e/game-builds.mjs` timed out at B0 after the §8 restructure | three selectors still pointed at `#get-the-game`, which the section rename removed | retargeted to `#availability`; the suite then reported 21/21 on `dist-qa` and 20/21 + 1 skip on `dist` |
| Test method | Running `node tests/e2e/visual.mjs` with no prefix **overwrote thirteen committed M7 baseline screenshots** — the same class of accident as the earlier `EVIDENCE_PREFIX` incident, and this time it destroyed the "before" the milestone comparison depends on | the suite's default filename stem was a previous milestone's, and it wrote unconditionally | all thirteen restored with `git restore`, then the suite hardened: the prefix now follows `EVIDENCE_PREFIX`, and every write goes through `target()`, which refuses an existing file unless `OVERWRITE=1` is passed. A regression run can no longer damage an earlier milestone's evidence by omission. |
| Test method | R20/R21/R22 counts drifted between runs (10 vs 11 exempt links) | the accessibility probe sampled before the Vue island and the room selection hook had finished | explicit settle waits added (150 ms for islands, 200 ms after the selection hook); the audit is now reproducible run to run |
| Documentation | `docs/branding.md` §5 and this plan claimed the provisional-identity marker was "enforced by tests" (citing R8, R11, R1c) | none of those checks reads the marker: R8 counts catalogue cards on a no-JS page, R11 compares a title against a string typed into the suite, R1c reads the cover label. The claim was directionally true of the *code* and false of the *evidence*, which is the failure mode a doc-only audit does not catch | **R25** added so the guardrail is real rather than asserted — it reads `studio.nameIsFinal`, `studio.nameMarker` and `studioLetter`'s gap labels out of the records and checks all eight served pages plus the letter. The routes suite re-ran on the unchanged `dist-qa` build: 47/47. |
| Documentation | Nineteen places where the docs contradicted the code, found by auditing before changing (full list in `docs/evidence/m8-baseline.txt`) | e.g. README "Status: M6b" and "grey-box room"; `deployment-options.md` quoting a 626.67 kB room chunk and a 78,324,197-byte bundle; a feature bullet that opened "Five-stage audit:" and then named six stages; a `studio` object exported from `games.js` that no module imported while the identity was duplicated as literals in eight files | corrected against the files named, then the identity moved to `src/js/data/studio.js` and the renderer's hard-coded filename/badges removed so a second record could be published without editing display logic |

### Environment problem, stated rather than hidden

The loopback fault recorded under M6b is still this machine's behaviour: Chromium reports
`net::ERR_NETWORK_ACCESS_DENIED` and Node reports `connect EACCES 127.0.0.1` when the OS hands a client
port an existing listener holds. The `tests/e2e/netRetry.mjs` and `dist-qa` mitigations are unchanged
and this milestone's retained matrix ran without encountering it. One caveat specific to M8: an earlier
routes run in this milestone reported 44/45 and was reported here as an unreproduced transient. It was
not a transient — it was D27, and the only reason it took eight runs to name is that the failing line
had been discarded by reading `tail -5`. That is now a method change rather than a lesson: every suite
in the matrix is retained in full to `docs/evidence/`, and the failing id is read from the file.

**M8 local result:** no outstanding test failures. 47 routes + 21/20 game-builds + 30/30 commerce +
12/8/15 room + 12/8/6/14/4 unit and database checks pass on the build described above, and the
memory-driver runs are labelled as adapter comparisons rather than as MySQL evidence. What M8 does not
establish is unchanged by these numbers: no screen reader has run, no second browser has run, no
physical handset has been touched, no real GPU frame rate has been measured, the desktop build has not
been executed, nobody has finished the demo, and nothing is deployed — see the open limitations below
and the pending decisions in `docs/branding.md` §6.

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
| B11 | MySQL integration | Closed locally in M6 with actual 8.0.46, direct rows, rollback, enforced constraints, restricted runtime account, restart and outage/recovery. Closed further in M6b: the catalogue tables are now a verified projection of the shared records (S1–S4). Not a hosted-database claim. |
| B12 | Deployed operation | Open — DNS, HTTPS, public hosting, compression/cache policy and operational security have not been configured or verified. Backup **policy** (schedule, off-machine storage, retention, production-sized restore) is still open; one local manual dump-and-restore drill is closed in B13 and is not a hosted backup. |
| B13 | Durable data location and schema upgrades | **Location and restoration closed in M6b.** The portable instance was moved from a temporary directory (which Windows had cleaned, causing the `1073807364` server exit) to `D:\saleshi-mysql`, and a `mysqldump --single-transaction` was restored into a scratch schema and compared row for row: identical counts, £845.50 totals on both tables, identical content digests, three foreign keys and ten index rows, then dropped. Transcript: `evidence/m6b-database-relocation.txt`. **Still open** — scheduled/off-machine backups, and a reviewed upgrade from an older M5 schema. Never reinitialise or drop existing data. |
| B14 | Assessment acceptance and content | Open — tutor approval of the category, voluntary support as a sale, simulated checkout and local demonstration. The **game** content is now real, and so is the studio's working identity: `studio.js` holds one name plus `nameIsFinal: false`, so the name shows as a name labelled "studio name not final" rather than as bracketed scaffolding, and the letter marks its two missing paragraphs with labelled `gap` markers instead of placeholder prose — all of it checked by R25 on the served pages. Still unsupplied: a final name, a biography, contact details, an itch.io address and a release date — the full list is `docs/branding.md` §6. The student's 1,500–2,000-word report is still required. |
| B15 | Desktop build actually runs | Open — the archive is verified file by file against the studio's export and its HTTP behaviour is measured (HEAD, byte range), but the `.exe` has never been launched on a Windows machine from this site, and it is unsigned, so SmartScreen will warn. |
| B16 | Demo is playable end to end | Open — B7 proves the export starts, renders and takes focus inside the site frame. Nobody has completed the demo, and the developer's own build record states no unassisted first-time player has finished it. |
| B17 | Browser export licence obligations | Open — the desktop archive carries the two font licence files the licences require. The web export is served byte-for-byte unmodified and its `.pck` is not inspected file by file, so whether the same fonts travel inside it — and therefore whether it needs the same licence text — has not been confirmed with the studio. |
| B18 | Debug versus release export | Open — the web export reports itself as a debug export. A release-mode export, with the smaller payload that implies, has not been produced or measured. |
| B19 | Real-connection download cost | Open — 38.8 MB for the browser demo and 35.1 MB for the archive are measured sizes; transfer time on a throttled or mobile connection, and any CDN caching behaviour, are unmeasured. |
| B20 | Loopback transport stability on this workstation | Open — see the M6b environment note. Retried only at the transport layer; the one failing `B10` line is quoted in the M6b defect table, and the retained log is the passing re-run that overwrote it. |

## Re-running these tests

Configure MySQL using `../docs/commerce.md` first, and stage the game binaries with
`npm run game:stage` (they are not in Git; `npm run game:check` verifies what is already staged).
Use separate terminals for long-running servers and tests. Run constraint tests only against an
isolated test database: they need administrator rights, temporarily change catalogue rows inside a
rolled-back transaction, and create synthetic orders. The process-restart test needs the production
build.

```bash
npm run game:stage   # copy the studio export into public/ and rewrite src/js/data/builds.js
npm run build
npm run assets:check   # the palette pass on the three captured frames, plus the published sizes
npm run test:metadata  # every derived title/description/OG/JSON-LD against the records
npm run test:assets
DB_DRIVER=memory npm run test:commerce
npm run test:builds
TEST_MYSQL_CONSTRAINTS=1 node --env-file=.env.mysql-admin.local --test tests/commerce.test.mjs
npm run test:database   # seed projection; needs the administrator file, prunes/retires rows only
npm start  # configured restricted MySQL app; this workstation used PORT=5310
```

In another terminal, while that application runs:

```bash
BASE_URL=http://127.0.0.1:5310 node tests/e2e/commerce.mjs
BASE_URL=http://127.0.0.1:5310 node tests/e2e/game-builds.mjs   # reports the hook-only check as SKIP
```

The room suites need `window.__saleshiRoom`, which `npm run build` compiles away. Serve the QA
bundle instead — one chunk, hooks on, and **not** what gets deployed:

```bash
npm run build:qa
DIST_DIR=dist-qa PORT=5314 npm start
# In another terminal:
BASE_URL=http://127.0.0.1:5314 node tests/e2e/gate.mjs
BASE_URL=http://127.0.0.1:5314 node tests/e2e/papers.mjs
BASE_URL=http://127.0.0.1:5314 node tests/e2e/movement.mjs
BASE_URL=http://127.0.0.1:5314 node tests/e2e/routes.mjs
BASE_URL=http://127.0.0.1:5314 node tests/e2e/game-builds.mjs
npm audit --omit=dev --json
```

A development origin also works (`npm run dev:vite -- --host 127.0.0.1 --port 5174 --strictPort`)
but asks the browser for several hundred module requests, which is where this workstation's loopback
denials concentrate; `tests/e2e/netRetry.mjs` retries only the transport signatures.

Screenshot filenames are milestone-stamped. Every suite writes through `tests/e2e/evidence.mjs`, whose
default stamp is `m6`; **set `EVIDENCE_PREFIX` to the current milestone on every browser run** or a
re-run overwrites the images an earlier milestone's report cites. M8's retained captures were produced
with `EVIDENCE_PREFIX=m8`, so `routes.mjs` writes `m8-01`, `m8-02` and `m8-08`, `commerce.mjs` writes
`m8-03`…`m8-07`, `m8-09`, `m8-10`, `game-builds.mjs` writes `m8-01`…`m8-04` on whichever origin ran
last, and the room suites write `m8-gate-*`, `m8-papers-*` and `m8-movement-*`. The deployable
game-builds run is issued last for the same reason — `m8-01`…`m8-04` are attributed to that origin in
the evidence index.

`tests/e2e/visual.mjs` is the one suite that writes a *set* of images plus a stats file, and during M8
it destroyed the committed M7 "before" captures by being run without a prefix. It is now guarded twice:
its filename stem follows `EVIDENCE_PREFIX`, and every write goes through `target()`, which refuses to
replace an existing capture unless `OVERWRITE=1` is passed deliberately.

Run an explicit memory comparison on a different port, if needed:

```bash
DB_DRIVER=memory PORT=5313 npm start
# In another terminal:
BASE_URL=http://127.0.0.1:5313 node tests/e2e/commerce.mjs
```

Always specify `BASE_URL`; some suites retain historical default ports. A bare repository-test
command loads `.env`, so explicitly set `DB_DRIVER=memory` when that is the intended adapter.
Suites write fixed filenames into `docs/evidence/`, so note which origin and driver each run used
and re-run the driver you want to keep evidence for last. Earlier milestone images are not
overwritten.

Useful handles while developing: `?view=list` forces the text view, `?view=room` requests the room,
`?game=<slug>` preselects a cassette, and `window.__saleshiRoom` exposes `isRunning()`, `stats()`,
`render()`, `snapshot()`, `start()`, `stop()`, `projectInteractable()`, `aim()` (the arbitrary
look-at pose `tests/e2e/visual.mjs` uses to photograph the ten viewpoints) and the test-only
`previewPanelGame()` fixture boundary. Those hooks exist in a dev server and in `dist-qa/` only; the
deployable `dist/` ships without them (`src/js/testHooks.js`).
